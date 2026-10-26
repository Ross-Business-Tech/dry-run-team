import { describe, expect, it, vi } from 'vitest'
import { LIMITS } from '../config/limits'
import type { Source } from '../domain/ticket'
import { draftWithGemini } from './geminiClient'

const sources: Source[] = [
  {
    policyId: 'pto',
    policyTitle: 'Paid Time Off',
    heading: 'Vacation accrual',
    passage: '15 days.',
    score: 5,
  },
]

const reply = (body: string, init: { status?: number; type?: string } = {}) =>
  new Response(body, {
    status: init.status ?? 200,
    headers: { 'content-type': init.type ?? 'application/json' },
  })

const good = JSON.stringify({
  candidates: [{ content: { parts: [{ text: 'Hi, you get 15 days.' }] } }],
})

describe('draftWithGemini', () => {
  it('posts to the same-origin proxy route and returns the draft', async () => {
    const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => reply(good))
    const r = await draftWithGemini('How many vacation days?', sources, { fetchFn })
    expect(r).toEqual({ ok: true, text: 'Hi, you get 15 days.', truncated: false })
    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe('/api/gemini')
    expect(init?.method).toBe('POST')
    // The browser never sends a key: here.now adds it on the server.
    expect(JSON.stringify(init?.headers)).not.toMatch(/key|authorization/i)
  })

  it('explains that Gemini is not connected when the route is missing (404)', async () => {
    const r = await draftWithGemini('q', sources, {
      fetchFn: async () => reply('Not found', { status: 404, type: 'text/plain' }),
    })
    expect(r).toEqual({
      ok: false,
      error:
        'Gemini is not connected on this copy of the site. It works on the team dev site once the instructor adds the key.',
    })
  })

  it('treats an HTML page (SPA fallback on a site without proxy routes) as not connected', async () => {
    const r = await draftWithGemini('q', sources, {
      fetchFn: async () => reply('<!doctype html>', { type: 'text/html' }),
    })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).toMatch(/not connected/)
  })

  it('reports rate limiting', async () => {
    const r = await draftWithGemini('q', sources, {
      fetchFn: async () => reply('{}', { status: 429 }),
    })
    expect(r).toEqual({
      ok: false,
      error: 'Too many Gemini requests. Wait a minute and try again.',
    })
  })

  it('reports a bad key or upstream error without leaking the body', async () => {
    const r = await draftWithGemini('q', sources, {
      fetchFn: async () =>
        reply('{"error":{"message":"API key not valid. key=AIzaSECRET"}}', { status: 400 }),
    })
    expect(r).toEqual({
      ok: false,
      error: 'Gemini returned an error (400). Ask your instructor to check the key.',
    })
  })

  it('refuses an oversized response but accepts one at the limit', async () => {
    const pad = (n: number) => {
      const base = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }], p: '' })
      return base.replace('"p":""', `"p":"${'x'.repeat(n - base.length)}"`)
    }
    const atLimit = await draftWithGemini('q', sources, {
      fetchFn: async () => reply(pad(LIMITS.GEMINI_MAX_RESPONSE_BYTES)),
    })
    expect(atLimit.ok).toBe(true)
    const over = await draftWithGemini('q', sources, {
      fetchFn: async () => reply(pad(LIMITS.GEMINI_MAX_RESPONSE_BYTES + 1)),
    })
    expect(over).toEqual({ ok: false, error: 'Gemini sent back too much text.' })
  })

  it('reports invalid JSON', async () => {
    const r = await draftWithGemini('q', sources, { fetchFn: async () => reply('{not json') })
    expect(r).toEqual({ ok: false, error: 'Gemini sent back something unexpected.' })
  })

  it('times out a hung request', async () => {
    const fetchFn = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_res, rej) => {
        init?.signal?.addEventListener('abort', () =>
          rej(new DOMException('aborted', 'AbortError')),
        )
      })
    const r = await draftWithGemini('q', sources, { fetchFn, timeoutMs: 10 })
    expect(r).toEqual({ ok: false, error: 'Gemini took too long to answer. Try again.' })
  })

  it('reports a network failure', async () => {
    const r = await draftWithGemini('q', sources, {
      fetchFn: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    expect(r).toEqual({
      ok: false,
      error: 'Could not reach Gemini. Check your connection and try again.',
    })
  })

  it('does not call Gemini when there are no policy sources', async () => {
    const fetchFn = vi.fn(async () => reply(good))
    const r = await draftWithGemini('Can I bring my dog?', [], { fetchFn })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(r).toEqual({
      ok: false,
      error: 'No matching policy, so there is nothing for Gemini to draft from.',
    })
  })
})
