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
} as const

/** Times of day (24h, local) HR releases approved answers; shown to employees. */
export const RELEASE_WINDOWS = ['10:00', '16:00'] as const
