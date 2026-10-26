import { describe, expect, it } from 'vitest'
import { LIMITS } from '../config/limits'
import {
  approve,
  employeeView,
  reject,
  release,
  releaseAllApproved,
  returnToDraft,
  type Ticket,
} from './ticket'

const NOW = '2026-10-23T10:00:00.000Z'

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 't1',
    createdAt: '2026-10-23T08:00:00.000Z',
    question: 'How many vacation days do I get?',
    redactions: [],
    status: 'draft',
    risk: { level: 'normal', reasons: [] },
    sources: [],
    draft: 'You get 15 days.',
    ...overrides,
  }
}

describe('approve', () => {
  it('lets a reviewer approve a draft with a final answer', () => {
    const r = approve(ticket(), { role: 'reviewer', finalAnswer: 'You get 15 days.', now: NOW })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.ticket.status).toBe('approved')
      expect(r.ticket.finalAnswer).toBe('You get 15 days.')
      expect(r.ticket.approvedAt).toBe(NOW)
    }
  })

  it('refuses an employee', () => {
    const r = approve(ticket(), { role: 'employee', finalAnswer: 'x'.repeat(20), now: NOW })
    expect(r).toEqual({ ok: false, error: 'Only an HR reviewer can do this.' })
  })

  it('refuses a ticket that is not a draft', () => {
    const r = approve(ticket({ status: 'released' }), {
      role: 'reviewer',
      finalAnswer: 'ok answer',
      now: NOW,
    })
    expect(r.ok).toBe(false)
  })

  it('refuses an empty answer but accepts a one-character answer', () => {
    expect(approve(ticket(), { role: 'reviewer', finalAnswer: '   ', now: NOW }).ok).toBe(false)
    expect(approve(ticket(), { role: 'reviewer', finalAnswer: 'Y', now: NOW }).ok).toBe(true)
  })

  it('refuses an answer over the limit but accepts one exactly at it', () => {
    const at = 'a'.repeat(LIMITS.MAX_DRAFT_CHARS)
    expect(approve(ticket(), { role: 'reviewer', finalAnswer: at, now: NOW }).ok).toBe(true)
    expect(approve(ticket(), { role: 'reviewer', finalAnswer: at + 'a', now: NOW }).ok).toBe(false)
  })

  it('requires explicit confirmation for a high-risk ticket', () => {
    const risky = ticket({ risk: { level: 'high', reasons: ['Termination or layoff'] } })
    const without = approve(risky, { role: 'reviewer', finalAnswer: 'Answer', now: NOW })
    expect(without).toEqual({
      ok: false,
      error: 'This is a high-risk topic. Confirm you checked the answer against current law.',
    })
    const withIt = approve(risky, {
      role: 'reviewer',
      finalAnswer: 'Answer',
      highRiskConfirmed: true,
      now: NOW,
    })
    expect(withIt.ok).toBe(true)
  })

  it('records where the draft came from, defaulting to the built-in drafter', () => {
    const plain = approve(ticket(), { role: 'reviewer', finalAnswer: 'A', now: NOW })
    expect(plain.ok && plain.ticket.draftedBy).toBe('built-in')
    const ai = approve(ticket(), {
      role: 'reviewer',
      finalAnswer: 'A',
      draftedBy: 'gemini',
      now: NOW,
    })
    expect(ai.ok && ai.ticket.draftedBy).toBe('gemini')
  })

  it('does not mutate the input ticket', () => {
    const t = ticket()
    approve(t, { role: 'reviewer', finalAnswer: 'Answer', now: NOW })
    expect(t.status).toBe('draft')
  })
})

describe('reject', () => {
  it('lets a reviewer reject a draft with a note', () => {
    const r = reject(ticket(), { role: 'reviewer', note: 'Needs a call', now: NOW })
    expect(r.ok && r.ticket.status).toBe('rejected')
    expect(r.ok && r.ticket.reviewerNote).toBe('Needs a call')
  })

  it('requires a note, within the limit', () => {
    expect(reject(ticket(), { role: 'reviewer', note: ' ', now: NOW }).ok).toBe(false)
    const long = 'n'.repeat(LIMITS.MAX_REVIEW_NOTE_CHARS + 1)
    expect(reject(ticket(), { role: 'reviewer', note: long, now: NOW }).ok).toBe(false)
  })

  it('refuses an employee and a released ticket', () => {
    expect(reject(ticket(), { role: 'employee', note: 'x', now: NOW }).ok).toBe(false)
    const released = ticket({ status: 'released' })
    expect(reject(released, { role: 'reviewer', note: 'x', now: NOW }).ok).toBe(false)
  })

  it('can reject an approved ticket before release', () => {
    const approved = ticket({ status: 'approved', finalAnswer: 'a' })
    expect(reject(approved, { role: 'reviewer', note: 'x', now: NOW }).ok).toBe(true)
  })
})

describe('returnToDraft', () => {
  it('moves an approved ticket back to draft and clears approval', () => {
    const r = returnToDraft(ticket({ status: 'approved', finalAnswer: 'a', approvedAt: NOW }), {
      role: 'reviewer',
    })
    expect(r.ok && r.ticket.status).toBe('draft')
    expect(r.ok && r.ticket.approvedAt).toBeUndefined()
  })

  it('refuses a draft and an employee', () => {
    expect(returnToDraft(ticket(), { role: 'reviewer' }).ok).toBe(false)
    expect(
      returnToDraft(ticket({ status: 'approved', finalAnswer: 'a' }), { role: 'employee' }).ok,
    ).toBe(false)
  })
})

describe('release', () => {
  it('releases an approved ticket', () => {
    const r = release(ticket({ status: 'approved', finalAnswer: 'a' }), {
      role: 'reviewer',
      now: NOW,
    })
    expect(r.ok && r.ticket.status).toBe('released')
    expect(r.ok && r.ticket.releasedAt).toBe(NOW)
  })

  it('never releases a draft (no auto-release path)', () => {
    expect(release(ticket(), { role: 'reviewer', now: NOW }).ok).toBe(false)
  })

  it('never releases a draft that still carries an answer from a withdrawn approval', () => {
    // approve -> returnToDraft keeps the reviewer's edited answer; that draft must not release.
    const approved = approve(ticket(), { role: 'reviewer', finalAnswer: 'Edited', now: NOW })
    if (!approved.ok) throw new Error(approved.error)
    const back = returnToDraft(approved.ticket, { role: 'reviewer' })
    if (!back.ok) throw new Error(back.error)
    expect(back.ticket.finalAnswer).toBe('Edited')
    expect(release(back.ticket, { role: 'reviewer', now: NOW }).ok).toBe(false)
  })

  it('does not release a ticket twice', () => {
    const released = ticket({ status: 'released', finalAnswer: 'a', releasedAt: NOW })
    expect(release(released, { role: 'reviewer', now: NOW }).ok).toBe(false)
  })

  it('refuses an employee', () => {
    const approved = ticket({ status: 'approved', finalAnswer: 'a' })
    expect(release(approved, { role: 'employee', now: NOW }).ok).toBe(false)
  })

  it('refuses an approved ticket with no final answer (corrupt state)', () => {
    expect(release(ticket({ status: 'approved' }), { role: 'reviewer', now: NOW }).ok).toBe(false)
  })
})

describe('releaseAllApproved', () => {
  it('releases only approved tickets and reports the count', () => {
    const list = [
      ticket({ id: 'a', status: 'approved', finalAnswer: 'a' }),
      ticket({ id: 'b' }),
      ticket({ id: 'c', status: 'approved', finalAnswer: 'c' }),
    ]
    const r = releaseAllApproved(list, { role: 'reviewer', now: NOW })
    expect(r.ok && r.released).toBe(2)
    expect(r.ok && r.tickets.map((t) => t.status)).toEqual(['released', 'draft', 'released'])
  })

  it('refuses an employee and changes nothing', () => {
    const list = [ticket({ status: 'approved', finalAnswer: 'a' })]
    const r = releaseAllApproved(list, { role: 'employee', now: NOW })
    expect(r.ok).toBe(false)
    expect(list[0]?.status).toBe('approved')
  })
})

describe('employeeView', () => {
  it('shows the final answer only once released', () => {
    const released = ticket({ status: 'released', finalAnswer: 'Final', releasedAt: NOW })
    expect(employeeView(released)).toEqual({ state: 'answered', answer: 'Final', at: NOW })
  })

  it('never exposes the draft or an approved-but-unreleased answer', () => {
    const v1 = employeeView(ticket())
    const v2 = employeeView(ticket({ status: 'approved', finalAnswer: 'Secret' }))
    expect(v1).toEqual({ state: 'with-hr' })
    expect(v2).toEqual({ state: 'with-hr' })
    expect(JSON.stringify([v1, v2])).not.toContain('Secret')
    expect(JSON.stringify(v1)).not.toContain('15 days')
  })

  it('tells the employee HR will follow up on a rejected ticket', () => {
    expect(employeeView(ticket({ status: 'rejected', reviewerNote: 'internal' }))).toEqual({
      state: 'follow-up',
    })
  })
})
