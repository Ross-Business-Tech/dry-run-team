import { describe, expect, it } from 'vitest'
import { HANDBOOK } from '../data/handbook'
import { createTicket } from './createTicket'
import { buildIndex, search } from './retrieval'

const index = buildIndex(HANDBOOK)

describe('search', () => {
  it.each([
    ['How many vacation days do I get?', 'pto', 'Vacation accrual'],
    ['Can I carry over unused vacation?', 'pto', 'Carryover'],
    ['What is the mileage reimbursement rate?', 'expenses', 'Mileage'],
    ['Can I work from home?', 'remote', 'Eligibility'],
    ['When is open enrollment?', 'benefits', 'Eligibility and enrollment'],
    ['Who pays for my license renewal?', 'learning', 'Real estate license renewal'],
    ['When do I get my commission after closing?', 'payroll', 'Commission payments'],
    ['Can I accept a gift card from a client?', 'conduct', 'Gifts from clients and vendors'],
    ['How do I change my direct deposit?', 'payroll', 'Direct deposit changes'],
    ['Is Juneteenth a holiday?', 'holidays', 'Observed holidays'],
  ])('finds the right section for %s', (q, policyId, heading) => {
    expect(search(index, q)[0]).toMatchObject({ policyId, heading })
  })

  it.each([
    'Can I bring my dog to the office?',
    'What is the weather tomorrow?',
    'How do I reset my laptop password?',
  ])('returns no match rather than a weak guess for %s', (q) => {
    expect(search(index, q)).toEqual([])
  })
})

describe('createTicket', () => {
  it('drafts from the retrieved policy and stores only redacted text', () => {
    const t = createTicket('How many vacation days do I get? My cell is 555-123-4567', {
      id: 'x',
      now: '2026-10-23T10:00:00Z',
    })
    expect(t.status).toBe('draft')
    expect(t.question).not.toContain('555-123-4567')
    expect(t.redactions).toEqual(['phone'])
    expect(t.draft).toContain('15 days per year')
    expect(t.draft).toContain('(Paid Time Off – Vacation accrual)')
  })

  it('leaves the draft empty for HR when nothing matches', () => {
    const t = createTicket('Can I bring my dog to the office?', {
      id: 'x',
      now: '2026-10-23T10:00:00Z',
    })
    expect(t.sources).toEqual([])
    expect(t.draft).toBe('')
  })
})
