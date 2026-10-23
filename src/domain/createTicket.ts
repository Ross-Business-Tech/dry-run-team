// The intake pipeline: redact, assess risk, retrieve, draft. Everything lands as a draft.
import { HANDBOOK } from '../data/handbook'
import { extractiveDrafter, type Drafter } from './drafter'
import { redact } from './redact'
import { buildIndex, search, type Index } from './retrieval'
import { assessRisk } from './risk'
import type { Ticket } from './ticket'

const defaultIndex = buildIndex(HANDBOOK)

export function createTicket(
  question: string,
  opts: { id: string; now: string; index?: Index; drafter?: Drafter },
): Ticket {
  const { text, kinds } = redact(question)
  const sources = search(opts.index ?? defaultIndex, text)
  return {
    id: opts.id,
    createdAt: opts.now,
    question: text,
    redactions: kinds,
    status: 'draft',
    risk: assessRisk(question),
    sources,
    draft: (opts.drafter ?? extractiveDrafter).draft(text, sources),
  }
}
