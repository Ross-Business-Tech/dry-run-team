import { describe, expect, it } from 'vitest'
import { redact } from './redact'

describe('redact', () => {
  it.each([
    ['My SSN is 123-45-6789', 'My SSN is [SSN removed]', 'ssn'],
    ['ssn 123456789 please', 'ssn [SSN removed] please', 'ssn'],
    ['email me at jo.doe@example.com', 'email me at [email removed]', 'email'],
    ['call (555) 123-4567', 'call [phone removed]', 'phone'],
    ['call +1 555.123.4567 now', 'call [phone removed] now', 'phone'],
    ['account 0012345678901', 'account [number removed]', 'long-number'],
  ])('masks %s', (input, expected, kind) => {
    const r = redact(input)
    expect(r.text).toBe(expected)
    expect(r.kinds).toContain(kind)
  })

  // Positive twins: ordinary policy questions must pass through untouched.
  it.each([
    'How many vacation days do I get after 3 years?',
    'Does the 401(k) match start on 2026-10-23?',
    'Is the $1,500 tuition benefit per year?',
    'Can I work from home 2 days a week?',
    'My employee ID is E-1042',
  ])('leaves %s unchanged', (input) => {
    expect(redact(input)).toEqual({ text: input, kinds: [] })
  })

  it('reports each kind once even with several matches', () => {
    const r = redact('a@b.co and c@d.co')
    expect(r.kinds).toEqual(['email'])
    expect(r.text).toBe('[email removed] and [email removed]')
  })
})
