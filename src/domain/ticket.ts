// The review gate. Every status change goes through these pure functions, so the rule
// "nothing reaches an employee without an HR reviewer approving and then releasing it"
// lives in one tested place rather than in UI event handlers.
import { LIMITS } from '../config/limits'
import type { RedactionKind } from './redact'
import type { RiskAssessment } from './risk'

export type Role = 'employee' | 'reviewer'
export type Status = 'draft' | 'approved' | 'rejected' | 'released'

export interface Source {
  policyId: string
  policyTitle: string
  heading: string
  passage: string
  score: number
}

export interface Ticket {
  id: string
  createdAt: string
  /** Already redacted: raw personal info is never stored. */
  question: string
  redactions: RedactionKind[]
  status: Status
  risk: RiskAssessment
  sources: Source[]
  /** The machine-written draft, kept unchanged for audit. */
  draft: string
  /** What the reviewer approved; the only text an employee can ever see. */
  finalAnswer?: string
  reviewerNote?: string
  approvedAt?: string
  releasedAt?: string
}

export type Result = { ok: true; ticket: Ticket } | { ok: false; error: string }

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const NOT_REVIEWER = 'Only an HR reviewer can do this.'

export function approve(
  t: Ticket,
  opts: { role: Role; finalAnswer: string; highRiskConfirmed?: boolean; now: string },
): Result {
  if (opts.role !== 'reviewer') return fail(NOT_REVIEWER)
  if (t.status !== 'draft') return fail('Only a draft can be approved.')
  const answer = opts.finalAnswer.trim()
  if (answer.length === 0) return fail('The answer is empty.')
  if (answer.length > LIMITS.MAX_DRAFT_CHARS) {
    return fail(`The answer is longer than ${LIMITS.MAX_DRAFT_CHARS} characters.`)
  }
  if (t.risk.level === 'high' && opts.highRiskConfirmed !== true) {
    return fail('This is a high-risk topic. Confirm you checked the answer against current law.')
  }
  return {
    ok: true,
    ticket: { ...t, status: 'approved', finalAnswer: answer, approvedAt: opts.now },
  }
}

export function reject(t: Ticket, opts: { role: Role; note: string; now: string }): Result {
  if (opts.role !== 'reviewer') return fail(NOT_REVIEWER)
  if (t.status !== 'draft' && t.status !== 'approved') {
    return fail('Only a draft or an unreleased approval can be rejected.')
  }
  const note = opts.note.trim()
  if (note.length === 0) return fail('Add a note saying how HR will follow up.')
  if (note.length > LIMITS.MAX_REVIEW_NOTE_CHARS) {
    return fail(`The note is longer than ${LIMITS.MAX_REVIEW_NOTE_CHARS} characters.`)
  }
  const { approvedAt: _a, finalAnswer: _f, ...rest } = t
  return { ok: true, ticket: { ...rest, status: 'rejected', reviewerNote: note } }
}

export function returnToDraft(t: Ticket, opts: { role: Role }): Result {
  if (opts.role !== 'reviewer') return fail(NOT_REVIEWER)
  if (t.status !== 'approved') return fail('Only an approved answer can be sent back to draft.')
  const { approvedAt: _a, ...rest } = t
  return { ok: true, ticket: { ...rest, status: 'draft' } }
}

export function release(t: Ticket, opts: { role: Role; now: string }): Result {
  if (opts.role !== 'reviewer') return fail(NOT_REVIEWER)
  if (t.status !== 'approved') return fail('Only an approved answer can be released.')
  if (!t.finalAnswer) return fail('This ticket has no approved answer.')
  return { ok: true, ticket: { ...t, status: 'released', releasedAt: opts.now } }
}

export function releaseAllApproved(
  tickets: readonly Ticket[],
  opts: { role: Role; now: string },
): { ok: true; tickets: Ticket[]; released: number } | { ok: false; error: string } {
  if (opts.role !== 'reviewer') return fail(NOT_REVIEWER)
  let released = 0
  const next = tickets.map((t) => {
    if (t.status !== 'approved') return t
    const r = release(t, opts)
    if (!r.ok) return t
    released++
    return r.ticket
  })
  return { ok: true, tickets: next, released }
}

export type EmployeeView =
  { state: 'with-hr' } | { state: 'follow-up' } | { state: 'answered'; answer: string; at: string }

/** What the employee is allowed to see. Drafts and unreleased approvals never leak. */
export function employeeView(t: Ticket): EmployeeView {
  if (t.status === 'released' && t.finalAnswer && t.releasedAt) {
    return { state: 'answered', answer: t.finalAnswer, at: t.releasedAt }
  }
  if (t.status === 'rejected') return { state: 'follow-up' }
  return { state: 'with-hr' }
}
