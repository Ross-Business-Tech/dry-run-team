import { LIMITS } from '../config/limits'

export type Validation = { ok: true; question: string } | { ok: false; error: string }

/** Checks a question before it becomes a ticket. `lastSubmitAt` and `now` are epoch ms. */
export function validateQuestion(
  raw: string,
  lastSubmitAt: number | null,
  now: number,
): Validation {
  const question = raw.trim()
  if (question.length < LIMITS.MIN_QUESTION_CHARS) {
    return { ok: false, error: 'Please describe your question in a little more detail.' }
  }
  if (question.length > LIMITS.MAX_QUESTION_CHARS) {
    return {
      ok: false,
      error: `Please keep questions under ${LIMITS.MAX_QUESTION_CHARS} characters.`,
    }
  }
  if (lastSubmitAt !== null && now - lastSubmitAt < LIMITS.SUBMIT_COOLDOWN_MS) {
    return { ok: false, error: 'Please wait a few seconds before sending another question.' }
  }
  return { ok: true, question }
}
