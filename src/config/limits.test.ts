import { describe, expect, it } from 'vitest'
import { LIMITS } from './limits'

describe('LIMITS', () => {
  it('keeps the question bounds ordered', () => {
    expect(LIMITS.MIN_QUESTION_CHARS).toBeLessThan(LIMITS.MAX_QUESTION_CHARS)
  })
})
