// Calls Gemini through the here.now proxy route. The browser sends no key: here.now adds
// it server-side from an account variable, so nothing secret ships in the website.
import { GEMINI_ROUTE, LIMITS } from '../config/limits'
import { buildGeminiRequest, parseGeminiResponse, type DraftResult } from '../domain/geminiPrompt'
import type { Source } from '../domain/ticket'

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

const NOT_CONNECTED =
  'Gemini is not connected on this copy of the site. It works on the team dev site once the instructor adds the key.'

export async function draftWithGemini(
  question: string,
  sources: readonly Source[],
  opts: { fetchFn?: FetchFn; timeoutMs?: number } = {},
): Promise<DraftResult> {
  if (sources.length === 0) {
    return { ok: false, error: 'No matching policy, so there is nothing for Gemini to draft from.' }
  }
  const fetchFn = opts.fetchFn ?? ((u, i) => fetch(u, i))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? LIMITS.GEMINI_TIMEOUT_MS)
  try {
    const res = await fetchFn(GEMINI_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiRequest(question, sources)),
      signal: controller.signal,
    })
    // Without the proxy route (anonymous previews, local preview) the request 404s or the
    // single-page-app fallback answers with index.html.
    if (res.status === 404 || res.status === 405) return { ok: false, error: NOT_CONNECTED }
    if (res.status === 429) {
      return { ok: false, error: 'Too many Gemini requests. Wait a minute and try again.' }
    }
    if (!res.ok) {
      // The body is deliberately not shown: upstream errors can echo request details.
      return {
        ok: false,
        error: `Gemini returned an error (${res.status}). Ask your instructor to check the key.`,
      }
    }
    if (!(res.headers.get('content-type') ?? '').includes('json')) {
      return { ok: false, error: NOT_CONNECTED }
    }
    const body = await res.text()
    if (body.length > LIMITS.GEMINI_MAX_RESPONSE_BYTES) {
      return { ok: false, error: 'Gemini sent back too much text.' }
    }
    let json: unknown
    try {
      json = JSON.parse(body)
    } catch {
      return { ok: false, error: 'Gemini sent back something unexpected.' }
    }
    return parseGeminiResponse(json)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, error: 'Gemini took too long to answer. Try again.' }
    }
    return { ok: false, error: 'Could not reach Gemini. Check your connection and try again.' }
  } finally {
    clearTimeout(timer)
  }
}
