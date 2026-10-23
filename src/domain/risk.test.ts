import { describe, expect, it } from 'vitest'
import { assessRisk } from './risk'

describe('assessRisk', () => {
  it.each([
    ['I think I am about to be fired, what severance do I get?', 'Termination or layoff'],
    ['My manager keeps harassing me', 'Harassment'],
    ['Is it discrimination if they skip me because of my religion?', 'Discrimination'],
    ['How do I apply for FMLA leave?', 'Medical or protected leave'],
    ['I am pregnant, how does maternity leave work?', 'Medical or protected leave'],
    ['Will the company sponsor my H-1B visa?', 'Immigration or work authorization'],
    ['My paycheck is missing overtime hours', 'Pay dispute'],
    [
      'I reported fraud and now I am being punished. Is that retaliation?',
      'Retaliation or whistleblowing',
    ],
    ['Should I talk to a lawyer about this?', 'Legal action'],
  ])('flags %s as high risk', (question, reason) => {
    const r = assessRisk(question)
    expect(r.level).toBe('high')
    expect(r.reasons).toContain(reason)
  })

  // Positive twins: routine questions stay normal.
  it.each([
    'How many vacation days do I get?',
    'What is the mileage reimbursement rate?',
    'Can I work remotely on Fridays?',
    'When is open enrollment for benefits?',
    'What is the dress code for property showings?',
    'How do I submit an expense report?',
  ])('keeps %s normal', (question) => {
    expect(assessRisk(question)).toEqual({ level: 'normal', reasons: [] })
  })

  it('collects several reasons without duplicates', () => {
    const r = assessRisk('I was fired after reporting harassment, can I sue? They fired me fast.')
    expect(r.reasons).toEqual(['Termination or layoff', 'Harassment', 'Legal action'])
  })

  it('is case-insensitive', () => {
    expect(assessRisk('FMLA question').level).toBe('high')
  })
})
