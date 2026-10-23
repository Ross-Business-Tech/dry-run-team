// Demo tickets so a single person can walk through the whole workflow on one device.
// Built through the real intake pipeline so drafts look exactly like live ones.
import { createTicket } from '../domain/createTicket'
import { approve, reject, release, type Ticket } from '../domain/ticket'

const SAMPLES: { q: string; hoursAgo: number; outcome?: 'approve' | 'release' | 'reject' }[] = [
  { q: 'How many vacation days do I get after 4 years with the company?', hoursAgo: 1 },
  { q: 'Can I work from home on Fridays? I am in the corporate office.', hoursAgo: 2 },
  { q: 'I am pregnant. How much parental leave will I get?', hoursAgo: 3 },
  {
    q: 'Is there a reimbursement for my real estate license renewal?',
    hoursAgo: 5,
    outcome: 'approve',
  },
  { q: 'Can I bring my dog to the office?', hoursAgo: 20, outcome: 'reject' },
  {
    q: 'What is the mileage reimbursement for driving to showings?',
    hoursAgo: 26,
    outcome: 'release',
  },
]

export function demoTickets(now: Date): Ticket[] {
  const at = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString()
  return SAMPLES.map(({ q, hoursAgo, outcome }, i) => {
    let t = createTicket(q, { id: `demo-${i + 1}`, now: at(hoursAgo) })
    const by = { role: 'reviewer' as const, now: at(hoursAgo - 0.5) }
    if (outcome === 'approve' || outcome === 'release') {
      const r = approve(t, { ...by, finalAnswer: t.draft })
      if (r.ok) t = r.ticket
    }
    if (outcome === 'release') {
      const r = release(t, by)
      if (r.ok) t = r.ticket
    }
    if (outcome === 'reject') {
      const r = reject(t, { ...by, note: 'No pet policy yet. Facilities will reply directly.' })
      if (r.ok) t = r.ticket
    }
    return t
  })
}
