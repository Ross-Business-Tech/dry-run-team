// Writes the first draft a reviewer starts from. The interface is what a language model
// (Gemini, or the in-house model in production) would implement later; this built-in
// version only quotes the retrieved policy text, so it cannot invent an answer.
import { COMPANY } from '../data/handbook'
import type { Source } from './ticket'

export interface Drafter {
  draft(question: string, sources: readonly Source[]): string
}

export const extractiveDrafter: Drafter = {
  draft(_question, sources) {
    if (sources.length === 0) return ''
    const [best, ...rest] = sources
    const parts = [
      'Hi,',
      'Thanks for reaching out. Here is what our policy says:',
      `${best!.passage}\n(${best!.policyTitle} – ${best!.heading})`,
    ]
    const extra = rest.find((s) => s.score >= best!.score * 0.6)
    if (extra)
      parts.push(`Also relevant:\n${extra.passage}\n(${extra.policyTitle} – ${extra.heading})`)
    parts.push(
      'If your situation is different from what is described here, reply to this ticket and HR will follow up with you directly.',
      `${COMPANY} HR`,
    )
    return parts.join('\n\n')
  },
}
