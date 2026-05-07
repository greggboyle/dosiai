import { parseJsonFromLlmText } from '@/lib/ai/parse-model-json'

export type WebSource = {
  url: string
  domain: string
  title: string
  snippet: string
  provider: 'openai-web-search' | 'none'
  query: string
  publishedAt?: string
}

export type SweepRetrievalInput = {
  purpose: string
  queries: string[]
  maxResults?: number
}

export type RetrievalQueryDiagnostic = {
  query: string
  attempted: boolean
  sourceCount: number
  error?: string
}

export type SweepRetrievalDiagnostics = {
  enabled: boolean
  enabledForPurpose: boolean
  provider: 'openai-web-search'
  model: string
  queryDiagnostics: RetrievalQueryDiagnostic[]
}

export async function retrieveWebSourcesForSweepPass(input: SweepRetrievalInput): Promise<WebSource[]> {
  const out = await retrieveWebSourcesForSweepPassDetailed(input)
  return out.sources
}

export async function retrieveWebSourcesForSweepPassDetailed(input: SweepRetrievalInput): Promise<{
  sources: WebSource[]
  diagnostics: SweepRetrievalDiagnostics
}> {
  const model = process.env.OPENAI_WEB_SEARCH_MODEL ?? 'gpt-4.1-mini'
  const enabled = process.env.WEB_GROUNDED_SWEEPS === '1'
  const enabledForPurpose = shouldRunRetrievalForPurpose(input.purpose)
  const diagnostics: SweepRetrievalDiagnostics = {
    enabled,
    enabledForPurpose,
    provider: 'openai-web-search',
    model,
    queryDiagnostics: [],
  }
  if (!enabledForPurpose) {
    return { sources: [], diagnostics }
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    for (const query of input.queries.map((q) => q.trim()).filter(Boolean)) {
      diagnostics.queryDiagnostics.push({
        query,
        attempted: false,
        sourceCount: 0,
        error: 'OPENAI_API_KEY not configured',
      })
    }
    return { sources: [], diagnostics }
  }

  const maxResults = Math.max(1, Math.min(50, input.maxResults ?? 20))
  const out: WebSource[] = []
  for (const query of input.queries.map((q) => q.trim()).filter(Boolean)) {
    try {
      const batch = await searchOpenAiWeb(query, maxResults, apiKey)
      out.push(...batch)
      diagnostics.queryDiagnostics.push({
        query,
        attempted: true,
        sourceCount: batch.length,
      })
    } catch (error) {
      const msg = extractErrorMessage(error)
      diagnostics.queryDiagnostics.push({
        query,
        attempted: true,
        sourceCount: 0,
        error: msg,
      })
      // Retrieval failures should not crash sweeps during rollout.
      continue
    }
  }
  return { sources: dedupeSourcesByUrl(out).slice(0, maxResults), diagnostics }
}

export function dedupeSourcesByUrl(sources: WebSource[]): WebSource[] {
  const out: WebSource[] = []
  const seen = new Set<string>()
  for (const s of sources) {
    const key = canonicalizeUrl(s.url)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

export function formatSourcesBlock(sources: WebSource[]): string {
  if (!sources.length) return '(none)'
  return sources
    .map((s, i) => `### Source ${i + 1}\n- title: ${s.title}\n- domain: ${s.domain}\n- url: ${s.url}\n- snippet: ${s.snippet}`)
    .join('\n\n')
}

function canonicalizeUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/+$/, '')
    return `${u.protocol}//${u.host}${path}${u.search}`
  } catch {
    return null
  }
}

function shouldRunRetrievalForPurpose(purpose: string): boolean {
  if (process.env.WEB_GROUNDED_SWEEPS !== '1') return false
  const csv = (process.env.WEB_GROUNDED_SWEEPS_PURPOSES ?? 'sweep_topic')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  return csv.includes(purpose)
}

async function searchOpenAiWeb(query: string, maxResults: number, apiKey: string): Promise<WebSource[]> {
  const model = process.env.OPENAI_WEB_SEARCH_MODEL ?? 'gpt-4.1-mini'
  const body = {
    model,
    tools: [{ type: 'web_search_preview' }],
    input: [
      {
        role: 'user',
        content: `Search the web and return only valid JSON.
Shape: {"sources":[{"url":"https://...","title":"...","domain":"...","snippet":"...","publishedAt":"optional iso"}]}
Rules:
- Use real public URLs only.
- No placeholders or fake domains.
- Return at most ${maxResults} sources.
Query: ${query}`,
      },
    ],
  }

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return []
  const payload = (await res.json()) as Record<string, unknown>
  const cited = extractSourcesFromCitations(payload, query)
  if (cited.length > 0) return dedupeSourcesByUrl(cited).slice(0, maxResults)

  const text = extractResponseText(payload)
  if (!text) return []
  const parsed = parseJsonFromLlmText(text) as { sources?: Array<Record<string, unknown>> }
  const rawSources = Array.isArray(parsed?.sources) ? parsed.sources : []
  const out: WebSource[] = []
  for (const row of rawSources) {
    const url = typeof row.url === 'string' ? row.url : ''
    const title = typeof row.title === 'string' ? row.title : ''
    const domain = typeof row.domain === 'string' ? row.domain : safeDomainFromUrl(url)
    const snippet = typeof row.snippet === 'string' ? row.snippet : ''
    const publishedAt = typeof row.publishedAt === 'string' ? row.publishedAt : undefined
    if (!url || !title || !domain) continue
    out.push({
      url,
      title,
      domain,
      snippet,
      publishedAt,
      provider: 'openai-web-search',
      query,
    })
  }
  return out
}

function extractSourcesFromCitations(payload: Record<string, unknown>, query: string): WebSource[] {
  const output = payload.output
  if (!Array.isArray(output)) return []
  const out: WebSource[] = []

  for (const o of output) {
    if (!o || typeof o !== 'object') continue
    const content = (o as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const c of content) {
      if (!c || typeof c !== 'object') continue
      const annotations = (c as { annotations?: unknown }).annotations
      if (!Array.isArray(annotations)) continue
      for (const a of annotations) {
        if (!a || typeof a !== 'object') continue
        const type = (a as { type?: unknown }).type
        if (type !== 'url_citation') continue
        const url = typeof (a as { url?: unknown }).url === 'string' ? (a as { url: string }).url : ''
        const title = typeof (a as { title?: unknown }).title === 'string' ? (a as { title: string }).title : ''
        if (!url) continue
        const domain = safeDomainFromUrl(url)
        if (!domain) continue
        out.push({
          url,
          title: title || domain,
          domain,
          snippet: '',
          provider: 'openai-web-search',
          query,
        })
      }
    }
  }
  return out
}

function extractResponseText(payload: Record<string, unknown>): string {
  const outputText = payload.output_text
  if (typeof outputText === 'string' && outputText.trim()) return outputText

  const output = payload.output
  if (!Array.isArray(output)) return ''
  const chunks: string[] = []
  for (const o of output) {
    if (!o || typeof o !== 'object') continue
    const content = (o as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const c of content) {
      if (!c || typeof c !== 'object') continue
      const text = (c as { text?: unknown }).text
      if (typeof text === 'string' && text.trim()) chunks.push(text)
    }
  }
  return chunks.join('\n').trim()
}

function safeDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
