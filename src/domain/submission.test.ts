import { describe, expect, it } from 'vitest'
import { LIMITS } from '../config/limits'
import { validateQuestion } from './submission'

const NOW = 1_000_000

describe('validateQuestion', () => {
  it('accepts and trims a normal question', () => {
    expect(validateQuestion('  How much PTO do I get?  ', null, NOW)).toEqual({
      ok: true,
      question: 'How much PTO do I get?',
    })
  })

  it('rejects text below the minimum and accepts exactly the minimum', () => {
    const min = 'q'.repeat(LIMITS.MIN_QUESTION_CHARS)
    expect(validateQuestion(min.slice(1), null, NOW).ok).toBe(false)
    expect(validateQuestion(min, null, NOW).ok).toBe(true)
  })

  it('rejects text above the maximum and accepts exactly the maximum', () => {
    const max = 'q'.repeat(LIMITS.MAX_QUESTION_CHARS)
    expect(validateQuestion(max, null, NOW).ok).toBe(true)
    expect(validateQuestion(max + 'q', null, NOW).ok).toBe(false)
  })

  it('enforces the cooldown between submissions', () => {
    const q = 'How much PTO do I get?'
    const justBefore = NOW - LIMITS.SUBMIT_COOLDOWN_MS + 1
    const r = validateQuestion(q, justBefore, NOW)
    expect(r).toEqual({
      ok: false,
      error: 'Please wait a few seconds before sending another question.',
    })
    expect(validateQuestion(q, NOW - LIMITS.SUBMIT_COOLDOWN_MS, NOW).ok).toBe(true)
  })
})
