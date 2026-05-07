/**
 * Extract a single JSON value from LLM output that may include markdown fences
 * (e.g. ```json ... ```), preamble text, or trailing prose.
 */
export function parseJsonFromLlmText(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/i)
  const payload = fenced ? fenced[1].trim() : trimmed

  let firstErr: unknown
  try {
    return JSON.parse(payload)
  } catch (e) {
    firstErr = e
  }
  const extracted =
    extractBalancedJsonValue(payload, '{') ?? extractBalancedJsonValue(payload, '[')
  if (extracted) {
    try {
      return JSON.parse(extracted)
    } catch (e) {
      firstErr = e
    }
  }
  if (firstErr instanceof Error) throw firstErr
  throw new SyntaxError('Could not parse JSON from model output')
}

function extractBalancedJsonValue(s: string, openChar: '{' | '['): string | null {
  const start = s.indexOf(openChar)
  if (start < 0) return null

  const closeChar = openChar === '{' ? '}' : ']'
  const stack: string[] = [closeChar]
  let inString = false
  let escape = false

  for (let i = start + 1; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (c === '\\') {
        escape = true
      } else if (c === '"') {
        inString = false
      }
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') {
      stack.push('}')
      continue
    }
    if (c === '[') {
      stack.push(']')
      continue
    }
    if (c === '}' || c === ']') {
      const expected = stack.pop()
      if (!expected || c !== expected) return null
      if (stack.length === 0) {
        return s.slice(start, i + 1)
      }
    }
  }
  return null
}
