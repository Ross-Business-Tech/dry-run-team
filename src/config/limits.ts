// Every resource limit in one place. Each comment names the failure the limit prevents.
export const LIMITS = {
  /** A huge paste freezing retrieval or filling storage. */
  MAX_QUESTION_CHARS: 1000,
  /** Empty or one-word tickets cluttering the review queue. */
  MIN_QUESTION_CHARS: 10,
  /** A runaway draft or reviewer edit exceeding the storage budget. */
  MAX_DRAFT_CHARS: 5000,
  /** Same, for the note a reviewer leaves when rejecting. */
  MAX_REVIEW_NOTE_CHARS: 1000,
  /** Storage exhaustion. Oldest released/rejected tickets are pruned first; pending never. */
  MAX_TICKETS: 300,
  /** Hitting the browser's ~5 MB localStorage quota and losing everything. */
  MAX_STORAGE_BYTES: 2_000_000,
  /** Queue flooding from one browser (client-side only; production enforces on the server). */
  SUBMIT_COOLDOWN_MS: 5000,
  /** Drafts padded with weak matches. */
  TOP_K_PASSAGES: 3,
  /** A hung Gemini call leaving the reviewer staring at a spinner. */
  GEMINI_TIMEOUT_MS: 30_000,
  /** Runaway output cost; leaves headroom for models that spend tokens on reasoning. */
  GEMINI_MAX_OUTPUT_TOKENS: 2048,
  /** A reviewer hammering Regenerate (here.now also caps the route at 100 calls/hour/IP). */
  GEMINI_COOLDOWN_MS: 3000,
  /** A huge or hostile response body exhausting browser memory. */
  GEMINI_MAX_RESPONSE_BYTES: 200_000,
} as const

/** Same-origin path of the here.now proxy route declared in public/.herenow/proxy.json. */
export const GEMINI_ROUTE = '/api/gemini'

/** Times of day (24h, local) HR releases approved answers; shown to employees. */
export const RELEASE_WINDOWS = ['10:00', '16:00'] as const
