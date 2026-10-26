// Saves tickets in this browser's localStorage. Anything read back is treated as untrusted:
// it is validated field by field, and unreadable data falls back to the demo seed.
import { LIMITS } from '../config/limits'
import type { Status, Ticket } from '../domain/ticket'

export const STORAGE_KEY = 'northgate-hr-helpdesk'
export const SCHEMA_VERSION = 1

export interface Saved {
  version: number
  tickets: Ticket[]
  lastSubmitAt: number | null
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STATUSES: readonly Status[] = ['draft', 'approved', 'rejected', 'released']
const isStr = (v: unknown): v is string => typeof v === 'string'
const isOptStr = (v: unknown) => v === undefined || isStr(v)

export function isTicket(v: unknown): v is Ticket {
  if (typeof v !== 'object' || v === null) return false
  const t = v as Record<string, unknown>
  const risk = t.risk as Record<string, unknown> | undefined
  return (
    isStr(t.id) &&
    isStr(t.createdAt) &&
    isStr(t.question) &&
    t.question.length <= LIMITS.MAX_QUESTION_CHARS &&
    Array.isArray(t.redactions) &&
    STATUSES.includes(t.status as Status) &&
    typeof risk === 'object' &&
    risk !== null &&
    (risk.level === 'normal' || risk.level === 'high') &&
    Array.isArray(risk.reasons) &&
    risk.reasons.every(isStr) &&
    Array.isArray(t.sources) &&
    t.sources.every(
      (s: Record<string, unknown>) =>
        isStr(s.policyId) && isStr(s.policyTitle) && isStr(s.heading) && isStr(s.passage),
    ) &&
    isStr(t.draft) &&
    t.draft.length <= LIMITS.MAX_DRAFT_CHARS &&
    isOptStr(t.finalAnswer) &&
    (t.draftedBy === undefined || t.draftedBy === 'built-in' || t.draftedBy === 'gemini') &&
    isOptStr(t.reviewerNote) &&
    isOptStr(t.approvedAt) &&
    isOptStr(t.releasedAt)
  )
}

export type LoadResult = { saved: Saved; problem: 'none' | 'empty' | 'corrupt' }

export function load(store: KeyValueStore): LoadResult {
  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return { saved: blank(), problem: 'empty' }
  }
  if (raw === null) return { saved: blank(), problem: 'empty' }
  try {
    const parsed = JSON.parse(raw) as Partial<Saved>
    if (parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.tickets)) {
      return { saved: blank(), problem: 'corrupt' }
    }
    const tickets = parsed.tickets.filter(isTicket)
    const lastSubmitAt = typeof parsed.lastSubmitAt === 'number' ? parsed.lastSubmitAt : null
    const problem = tickets.length === parsed.tickets.length ? 'none' : 'corrupt'
    return { saved: { version: SCHEMA_VERSION, tickets, lastSubmitAt }, problem }
  } catch {
    return { saved: blank(), problem: 'corrupt' }
  }
}

/** Keeps every pending ticket; drops the oldest finished ones once over the caps. */
export function prune(tickets: readonly Ticket[]): Ticket[] {
  const finished = (t: Ticket) => t.status === 'released' || t.status === 'rejected'
  let list = [...tickets]
  const tooBig = () =>
    list.length > LIMITS.MAX_TICKETS || JSON.stringify(list).length > LIMITS.MAX_STORAGE_BYTES
  while (tooBig()) {
    let oldest = -1
    list.forEach((t, i) => {
      if (finished(t) && (oldest < 0 || t.createdAt < list[oldest]!.createdAt)) oldest = i
    })
    if (oldest < 0) break
    list.splice(oldest, 1)
  }
  return list
}

/** Returns false when the browser refuses to save (private mode, quota). */
export function save(store: KeyValueStore, saved: Saved): boolean {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ ...saved, tickets: prune(saved.tickets) }))
    return true
  } catch {
    return false
  }
}

function blank(): Saved {
  return { version: SCHEMA_VERSION, tickets: [], lastSubmitAt: null }
}
