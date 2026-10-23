// Masks personal identifiers before a question is stored. This is a safety net, not a
// guarantee: patterns catch common US formats only, so the UI also warns people not to
// type personal details.
export type RedactionKind = 'email' | 'ssn' | 'phone' | 'long-number'

// Order matters: SSNs (9 digits) before phones (10) before generic long numbers.
const RULES: { kind: RedactionKind; pattern: RegExp; label: string }[] = [
  { kind: 'email', pattern: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, label: '[email removed]' },
  { kind: 'ssn', pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g, label: '[SSN removed]' },
  {
    kind: 'phone',
    pattern: /(?:\+1[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    label: '[phone removed]',
  },
  { kind: 'long-number', pattern: /\b\d{8,}\b/g, label: '[number removed]' },
]

export function redact(input: string): { text: string; kinds: RedactionKind[] } {
  let text = input
  const kinds: RedactionKind[] = []
  for (const rule of RULES) {
    const next = text.replace(rule.pattern, rule.label)
    if (next !== text) kinds.push(rule.kind)
    text = next
  }
  return { text, kinds }
}
