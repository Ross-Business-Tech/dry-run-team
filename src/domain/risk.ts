// Flags questions on topics where a wrong answer creates legal exposure. A keyword list
// will miss some phrasings, which is acceptable only because every answer is reviewed by a
// human anyway; the flag adds a second, explicit confirmation on top of that review.
export interface RiskAssessment {
  level: 'normal' | 'high'
  reasons: string[]
}

const TOPICS: { reason: string; pattern: RegExp }[] = [
  {
    reason: 'Termination or layoff',
    pattern: /\b(fired|firing|terminat\w*|laid off|lay ?offs?|severance|let go|dismiss\w*)\b/i,
  },
  { reason: 'Harassment', pattern: /\b(harass\w*|hostile work|bully\w*|sexual\w*)\b/i },
  {
    reason: 'Discrimination',
    pattern: /\b(discriminat\w*|racis\w*|religio\w*|gender identity|ageis\w*|national origin)\b/i,
  },
  {
    reason: 'Medical or protected leave',
    pattern:
      /\b(fmla|ada|medical leave|disabilit\w*|pregnan\w*|maternity|paternity|parental leave|accommodation)\b/i,
  },
  {
    reason: 'Immigration or work authorization',
    pattern: /\b(visa|h-?1b|immigration|i-9|work permit|green card|sponsor\w*)\b/i,
  },
  {
    reason: 'Pay dispute',
    pattern: /\b(overtime|unpaid|back pay|wage\w*|paycheck|underpaid|minimum wage)\b/i,
  },
  {
    reason: 'Retaliation or whistleblowing',
    pattern: /\b(retaliat\w*|whistle-?blow\w*|reported (?:fraud|my manager|a violation))\b/i,
  },
  { reason: 'Legal action', pattern: /\b(lawyer|attorney|sue|suing|lawsuit|eeoc|legal action)\b/i },
]

export function assessRisk(question: string): RiskAssessment {
  const reasons = TOPICS.filter((t) => t.pattern.test(question)).map((t) => t.reason)
  return { level: reasons.length > 0 ? 'high' : 'normal', reasons }
}
