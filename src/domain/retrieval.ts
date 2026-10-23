// BM25 keyword ranking over handbook sections. Small enough to run in the browser and
// deterministic, so the same question always retrieves the same passages.
import { LIMITS } from '../config/limits'
import type { Policy } from '../data/handbook'
import type { Source } from './ticket'

/** Below this score a match is too weak to show as a source; tuned on the sample questions. */
export const MIN_RELEVANCE_SCORE = 3.5

const STOPWORDS = new Set(
  'a an and are as at be been but by can could did do does for from get got had has have how i if in is it its me my of on or our should so that the their them then there this to was we were what when where which who will with would you your am any about after before much many'.split(
    ' ',
  ),
)

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOPWORDS.has(w)).map(stem)
}

// Crude suffix stripping: enough to match "days"/"day" and "reimbursed"/"reimbursement".
function stem(w: string): string {
  if (w.length <= 4) return w
  for (const suffix of ['ments', 'ment', 'ing', 'ed', 'es', 's']) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 4) return w.slice(0, -suffix.length)
  }
  return w
}

interface Doc {
  policyId: string
  policyTitle: string
  heading: string
  passage: string
  terms: string[]
}

export interface Index {
  docs: Doc[]
  df: Map<string, number>
  avgLen: number
}

export function buildIndex(policies: readonly Policy[]): Index {
  const docs: Doc[] = policies.flatMap((p) =>
    p.sections.map((s) => ({
      policyId: p.id,
      policyTitle: p.title,
      heading: s.heading,
      passage: s.text,
      // Titles and headings are repeated to weight them above body text.
      terms: tokenize(`${p.title} ${s.heading} ${s.heading} ${s.text}`),
    })),
  )
  const df = new Map<string, number>()
  for (const d of docs) for (const t of new Set(d.terms)) df.set(t, (df.get(t) ?? 0) + 1)
  const avgLen = docs.reduce((n, d) => n + d.terms.length, 0) / Math.max(docs.length, 1)
  return { docs, df, avgLen }
}

const K1 = 1.2
const B = 0.75

export function search(index: Index, query: string, k: number = LIMITS.TOP_K_PASSAGES): Source[] {
  const q = [...new Set(tokenize(query))]
  const n = index.docs.length
  return index.docs
    .map((d) => {
      let score = 0
      for (const term of q) {
        const tf = d.terms.filter((t) => t === term).length
        if (tf === 0) continue
        const df = index.df.get(term) ?? 0
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5))
        score += idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * d.terms.length) / index.avgLen)))
      }
      return {
        policyId: d.policyId,
        policyTitle: d.policyTitle,
        heading: d.heading,
        passage: d.passage,
        score,
      }
    })
    .filter((s) => s.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
