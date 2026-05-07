import { inngest } from '@/inngest/client'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { embedText } from '@/lib/mis/score'
import { formatVectorLiteral } from '@/lib/intelligence/map-row'
import type { WorkspacePlan } from '@/lib/types/dosi'
import { inflateRawSync } from 'node:zlib'

type UploadedEvent = {
  workspaceId: string
  uploadedBy: string
  bucket: string
  path: string
  fileName: string
  contentType: string | null
  sizeBytes: number
}

function approxTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

function splitIntoChunks(text: string, maxChars = 2000, overlapChars = 250): string[] {
  const normalized = text.trim()
  if (!normalized) return []
  const chunks: string[] = []
  let start = 0
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + maxChars)
    chunks.push(normalized.slice(start, end))
    if (end >= normalized.length) break
    start = Math.max(0, end - overlapChars)
  }
  return chunks
}

function decodeXmlText(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

type ZipEntry = { name: string; compression: number; compressedSize: number; localHeaderOffset: number }

function listZipEntries(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const EOCD_SIG = 0x06054b50
  const CEN_SIG = 0x02014b50
  let eocdOffset = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset < 0) throw new Error('Invalid ZIP archive')
  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const centralDirOffset = view.getUint32(eocdOffset + 16, true)

  const entries: ZipEntry[] = []
  let cursor = centralDirOffset
  for (let i = 0; i < totalEntries; i += 1) {
    if (view.getUint32(cursor, true) !== CEN_SIG) break
    const compression = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const fileNameLen = view.getUint16(cursor + 28, true)
    const extraLen = view.getUint16(cursor + 30, true)
    const commentLen = view.getUint16(cursor + 32, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const nameBytes = bytes.slice(cursor + 46, cursor + 46 + fileNameLen)
    const name = new TextDecoder().decode(nameBytes)
    entries.push({ name, compression, compressedSize, localHeaderOffset })
    cursor += 46 + fileNameLen + extraLen + commentLen
  }
  return entries
}

function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const LOC_SIG = 0x04034b50
  const offset = entry.localHeaderOffset
  if (view.getUint32(offset, true) !== LOC_SIG) throw new Error('Invalid ZIP local header')
  const fileNameLen = view.getUint16(offset + 26, true)
  const extraLen = view.getUint16(offset + 28, true)
  const dataStart = offset + 30 + fileNameLen + extraLen
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize)
  if (entry.compression === 0) return compressed
  if (entry.compression === 8) return inflateRawSync(Buffer.from(compressed))
  throw new Error(`Unsupported ZIP compression method: ${entry.compression}`)
}

function extractDocxText(bytes: Uint8Array): string {
  const entries = listZipEntries(bytes)
  const targets = entries
    .filter((e) => /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  const decoded = targets.map((entry) => {
    const raw = readZipEntry(bytes, entry)
    const xml = new TextDecoder().decode(raw)
    return decodeXmlText(xml)
  })
  return decoded.filter(Boolean).join('\n\n')
}

function extractPptxText(bytes: Uint8Array): string {
  const entries = listZipEntries(bytes)
  const targets = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  const decoded = targets.map((entry) => {
    const raw = readZipEntry(bytes, entry)
    const xml = new TextDecoder().decode(raw)
    return decodeXmlText(xml)
  })
  return decoded.filter(Boolean).join('\n\n')
}

function extractPdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString('latin1')
  const textRuns: string[] = []
  const re = /\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    const value = match[1]
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
    textRuns.push(value)
  }
  return textRuns.join('\n').replace(/\s+\n/g, '\n').trim()
}

function extractTextFromBlob(fileData: Blob, mimeType: string | null, filePath: string): Promise<string> {
  const lowerPath = filePath.toLowerCase()
  const lowerMime = (mimeType ?? '').toLowerCase()
  return fileData.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer)
    if (
      lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerPath.endsWith('.docx')
    ) {
      return extractDocxText(bytes)
    }
    if (
      lowerMime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      lowerPath.endsWith('.pptx')
    ) {
      return extractPptxText(bytes)
    }
    if (lowerMime === 'application/pdf' || lowerPath.endsWith('.pdf')) {
      return extractPdfText(bytes)
    }
    if (lowerMime.startsWith('text/') || lowerMime === 'application/json' || lowerPath.endsWith('.md')) {
      return new TextDecoder().decode(bytes)
    }
    throw new Error(`Unsupported file type for extraction (${mimeType ?? 'unknown'})`)
  })
}

async function setDocumentStatus(
  documentId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  await supabase
    .from('resource_document' as any)
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', documentId)
}

export const indexUploadedResource = inngest.createFunction(
  { id: 'index-uploaded-resource', retries: 2 },
  { event: 'resources/uploaded' },
  async ({ event }) => {
    const data = event.data as UploadedEvent
    const supabase = createSupabaseAdminClient()

    const { data: row, error } = await supabase
      .from('resource_document' as any)
      .upsert(
        {
          workspace_id: data.workspaceId,
          uploaded_by: data.uploadedBy,
          storage_bucket: data.bucket,
          storage_path: data.path,
          file_name: data.fileName,
          mime_type: data.contentType,
          size_bytes: data.sizeBytes,
          status: 'queued',
        } as any,
        { onConflict: 'workspace_id,storage_path' }
      )
      .select('id')
      .single()
    if (error || !row?.id) throw error ?? new Error('Failed to create resource document row')

    await inngest.send({
      name: 'resources/extract.requested',
      data: {
        resourceDocumentId: row.id as string,
        workspaceId: data.workspaceId,
      },
    })

    return { ok: true, resourceDocumentId: row.id }
  }
)

export const extractResourceText = inngest.createFunction(
  { id: 'extract-resource-text', retries: 1 },
  { event: 'resources/extract.requested' },
  async ({ event }) => {
    const { resourceDocumentId, workspaceId } = event.data as {
      resourceDocumentId: string
      workspaceId: string
    }
    const supabase = createSupabaseAdminClient()

    const { data: doc, error } = await supabase
      .from('resource_document' as any)
      .select('id,storage_bucket,storage_path,mime_type')
      .eq('id', resourceDocumentId)
      .single()
    if (error || !doc) throw error ?? new Error('Resource document not found')

    await setDocumentStatus(resourceDocumentId, { status: 'processing', last_error: null })

    const { data: fileData, error: dlErr } = await supabase.storage
      .from(String(doc.storage_bucket))
      .download(String(doc.storage_path))
    if (dlErr || !fileData) {
      await setDocumentStatus(resourceDocumentId, { status: 'failed', last_error: 'Failed to download file' })
      throw dlErr ?? new Error('Failed to download file')
    }

    let raw = ''
    try {
      raw = await extractTextFromBlob(fileData, doc.mime_type as string | null, String(doc.storage_path))
    } catch (extractErr) {
      const message = extractErr instanceof Error ? extractErr.message : 'Extraction failed'
      await setDocumentStatus(resourceDocumentId, {
        status: 'failed',
        last_error: message,
      })
      return { ok: false, reason: 'extract_failed', error: message }
    }
    const chunks = splitIntoChunks(raw)

    await supabase.from('resource_document_chunk' as any).delete().eq('resource_document_id', resourceDocumentId)
    if (chunks.length > 0) {
      const rows = chunks.map((content, idx) => ({
        workspace_id: workspaceId,
        resource_document_id: resourceDocumentId,
        chunk_index: idx,
        content,
        token_estimate: approxTokenCount(content),
      }))
      const { error: insErr } = await supabase.from('resource_document_chunk' as any).insert(rows as any)
      if (insErr) throw insErr
    }

    await setDocumentStatus(resourceDocumentId, {
      extracted_char_count: raw.length,
      chunk_count: chunks.length,
    })

    await inngest.send({
      name: 'resources/embed.requested',
      data: { resourceDocumentId, workspaceId },
    })

    return { ok: true, chunks: chunks.length }
  }
)

export const embedResourceChunks = inngest.createFunction(
  { id: 'embed-resource-chunks', retries: 1 },
  { event: 'resources/embed.requested' },
  async ({ event }) => {
    const { resourceDocumentId, workspaceId } = event.data as {
      resourceDocumentId: string
      workspaceId: string
    }
    const supabase = createSupabaseAdminClient()

    const { data: workspace, error: wsErr } = await supabase
      .from('workspace')
      .select('plan')
      .eq('id', workspaceId)
      .single()
    if (wsErr || !workspace) throw wsErr ?? new Error('Workspace not found')
    const plan = workspace.plan as WorkspacePlan

    const { data: chunks, error } = await supabase
      .from('resource_document_chunk' as any)
      .select('id,content')
      .eq('resource_document_id', resourceDocumentId)
      .is('embedding', null)
      .order('chunk_index', { ascending: true })
    if (error) throw error

    for (const chunk of chunks ?? []) {
      const embedding = await embedText(workspaceId, plan, String(chunk.content))
      if (!embedding) continue
      await supabase
        .from('resource_document_chunk' as any)
        .update({ embedding: formatVectorLiteral(embedding) as any } as any)
        .eq('id', chunk.id)
    }

    await setDocumentStatus(resourceDocumentId, {
      status: 'ready',
      processed_at: new Date().toISOString(),
      last_error: null,
    })

    return { ok: true, embeddedChunks: (chunks ?? []).length }
  }
)
