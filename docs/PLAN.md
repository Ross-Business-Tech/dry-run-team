# Plan: HR Helpdesk prototype (static UI on here.now)

Status: **draft, awaiting approval.** No application code has been written yet.

Audience of this document: you (the project owner) and later the client's evaluators.

## 1. Context

**Problem.** Employees of a real estate company raise HR tickets. Most of these tickets are questions about written policy. HR spends its time answering the same questions again and again.

**Goal of this prototype.** Show the client the full workflow in a browser, end to end:

1. An employee asks a question in a chat window.
2. The system finds the relevant passages in the policy library.
3. It drafts a written answer that cites those passages.
4. The draft is held in a review queue. It is never sent automatically.
5. An HR reviewer reads it, edits it if needed, and approves it.
6. In one or two batches a day, HR releases the approved answers, and the employee sees them.

**Audience.**

| Deliverable           | Reader                                           | Voice                                   |
| --------------------- | ------------------------------------------------ | --------------------------------------- |
| The app               | Client evaluators, clicking on a phone or laptop | Product copy, plain English             |
| README + API docs     | Client evaluators and future developers          | First person (yours), a decision record |
| Code and comments     | Future maintainers                               | Comments explain _why_                  |
| `notes/` (gitignored) | You, to explain and defend every part            | Second person, deep dives               |
| `docs/PROGRESS.md`    | Any new session resuming the work                | Terse log                               |

**Constraints for this track.**

- The app is a static site on here.now: HTML, CSS and JavaScript only. It cannot run a server, a database, Docker or a GPU.
- The repository is public, so the policy library is a **fictional** handbook for a made-up company ("Northgate Realty").
- The production stack (Next.js + FastAPI + Supabase + Docker + a local model on an RTX 3050 Ti) is **documented, not built**, in this track.

## 2. Decisions table

| #   | Decision           | Chosen                                                                                                                                                             | Rejected and why                                                                                                                                                                                    | Status                         |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| D1  | Track              | Static UI prototype; production architecture documented                                                                                                            | Full stack now: can't be hosted on here.now or tested in this cloud session                                                                                                                         | Decided by you                 |
| D2  | Policy data        | Fictional handbook of about 12 policies (time off, expenses, remote work, conduct, benefits, leave, etc.)                                                          | Real client policies: the repo is public                                                                                                                                                            | Decided by you                 |
| D3  | Git                | Claude runs git in the session. Conventional commits, no AI attribution lines                                                                                      | You running git: no terminal on this container                                                                                                                                                      | Decided by you                 |
| D4  | Frontend framework | Keep the repo's **Vite + React**, add **Tailwind v4** (verified latest: `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`)                                            | Next.js static export: adds a second build system and an output folder the team's publish and smoke scripts don't expect. Next.js stays the production choice, and the React components carry over. | **Your call (Q1)**             |
| D5  | Language           | **TypeScript**                                                                                                                                                     | Plain JS: your protocol requires a type check, and the production Next.js app will be TypeScript                                                                                                    | **Your call (Q2)**             |
| D6  | Answer drafting    | **Built-in drafting engine**: it picks the best-matching policy passages and assembles a cited draft. Same interface the LLM will use later.                       | Gemini through a here.now proxy: needs your instructor to add a key, doesn't work on 24-hour preview links, and is hard to test reliably                                                            | **Your call (Q3)**             |
| D7  | Retrieval          | BM25 keyword ranking (a standard search-ranking formula) in plain TypeScript, with a minimum-relevance threshold so weak matches go to HR instead of being guessed | Embeddings / vector search: needs a model or an API, overkill for about 12 documents in a prototype                                                                                                 | Default                        |
| D8  | Storage            | **This browser only** (localStorage), seeded with demo tickets, plus a "Reset demo" button                                                                         | here.now Site Data: shared between visitors, but on a public site anyone could read HR questions                                                                                                    | **Your call (Q4)**             |
| D9  | Roles              | An "Employee / HR reviewer" switch at the top, clearly labelled as a demo switch                                                                                   | Real login: impossible without a server. Production uses company SSO (single sign-on).                                                                                                              | Default, stated as a known gap |
| D10 | Tests              | Vitest for logic; Playwright end-to-end tests (Playwright + Chromium already installed by the environment)                                                         | —                                                                                                                                                                                                   | Default                        |
| D11 | Lint / format      | oxlint (already in the repo) and Prettier                                                                                                                          | —                                                                                                                                                                                                   | Default                        |

## 3. Resource and abuse budget

All of these are named constants in `src/config/limits.ts`.

| Constant                | Value                 | Failure it prevents                                                                                   |
| ----------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| `MAX_QUESTION_CHARS`    | 1,000                 | A huge paste freezing retrieval or filling up storage                                                 |
| `MIN_QUESTION_CHARS`    | 10                    | Empty or one-word tickets cluttering the queue                                                        |
| `MAX_DRAFT_CHARS`       | 5,000                 | A runaway draft or edit exceeding the storage budget                                                  |
| `MAX_REVIEW_NOTE_CHARS` | 1,000                 | Same, for reviewer notes                                                                              |
| `MAX_TICKETS`           | 300                   | Storage exhaustion. The oldest _released_ tickets are pruned first; pending tickets are never pruned. |
| `MAX_STORAGE_BYTES`     | 2,000,000             | Hitting the browser's roughly 5 MB limit and losing all saved data                                    |
| `SUBMIT_COOLDOWN_MS`    | 5,000                 | Someone flooding the queue (client-side only, see the threat model)                                   |
| `TOP_K_PASSAGES`        | 3                     | Drafts padded with weak matches                                                                       |
| `MIN_RELEVANCE_SCORE`   | tuned on the test set | The system confidently answering with an irrelevant policy                                            |
| `RELEASE_WINDOWS`       | 10:00 and 16:00       | Shows employees when to expect an answer                                                              |

## 4. Threat model

| Threat                                                                                                  | What it could do                                         | Control                                                                                                                                                                      | Tested by                                                                  |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Hostile question text (HTML/script)                                                                     | Run code in the HR reviewer's browser (XSS)              | React escapes all text; a lint rule bans `dangerouslySetInnerHTML`; no other way of writing raw HTML is used                                                                 | Unit + e2e test that submits `<img onerror>` and checks it renders as text |
| Personal info typed into a question                                                                     | Social Security numbers or phone numbers kept in storage | A redaction pass masks SSN, phone, email and long digit strings before saving; a banner warns users                                                                          | Unit tests, each with a positive twin                                      |
| Legally risky topic (termination, harassment, discrimination, medical/leave, immigration, pay disputes) | A wrong answer creating legal exposure                   | The draft is flagged **High risk**; releasing it needs an explicit "I checked this against current law" confirmation                                                         | Unit + e2e                                                                 |
| Auto-release / skipped review                                                                           | An unreviewed AI answer reaches an employee              | A pure state machine: `draft → approved → released` (or `rejected`). Only a reviewer can approve; release requires approval; there is no direct path from draft to released. | State-machine tests; each guard removed in turn must turn a test red       |
| No relevant policy found                                                                                | A made-up answer                                         | Below `MIN_RELEVANCE_SCORE` the draft says "No matching policy, HR to answer manually", with no guessed content                                                              | Retrieval tests                                                            |
| Queue flooding                                                                                          | Hundreds of junk tickets                                 | Cooldown + length limits + `MAX_TICKETS`. **Honest limit:** client-side only; production enforces this on the server.                                                        | Unit                                                                       |
| Corrupt or tampered storage                                                                             | App crash on load                                        | A schema-version check and validation on read; invalid data falls back to the demo seed, with a notice                                                                       | Unit                                                                       |
| Role spoofing                                                                                           | Anyone can click "HR reviewer"                           | **Not a security control in the prototype**, and labelled as such in the UI and README. Production: SSO + server-side authorization.                                         | Documented gap                                                             |
| Prompt injection (future LLM)                                                                           | A question like "ignore your rules and…"                 | N/A for the built-in engine. For the LLM: retrieved text and questions are passed as data, output still goes through human review.                                           | Documented for production                                                  |

## 5. Honest risks

- **Not multi-user.** Data lives in one browser, so an employee on one phone and a reviewer on another won't see each other's tickets. _Mitigation:_ the demo seed data and the role switch let one person demo the whole flow. Shared storage is in the production design.
- **The built-in engine is not an LLM.** Its drafts read like policy excerpts, not like natural replies. _Mitigation:_ say so up front in the README; keep the same interface so Gemini or the local model plugs in later.
- **Retrieval quality on a toy corpus is not proof at scale.** _Mitigation:_ publish the evaluation set and recall numbers; list a real-corpus evaluation in the roadmap.
- **Merging into `main`** publishes to the team's public workspace address. The workflow file says only staff can push to `main` and that `development` is normally the integration branch, but this repo has no `development` branch. _Mitigation:_ the pull request targets `main` as you asked, and you merge it.

## 6. Architecture and data model

```
src/
  config/limits.ts        named constants (section 3)
  domain/                 pure logic, no React, no storage
    ticket.ts             types + state machine (transition rules)
    redact.ts             personal-info masking
    risk.ts               legal-risk topic flagging
    retrieval.ts          tokenizer + BM25 + threshold
    drafter.ts            Drafter interface + built-in extractive drafter
  data/handbook.ts        fictional Northgate Realty policies, split into passages
  data/seed.ts            demo tickets in various states
  storage/ticketStore.ts  localStorage adapter: versioning, validation, caps
  ui/                     React components: EmployeeChat, ReviewQueue, TicketDetail, RoleSwitch
docs/
  PLAN.md, PROGRESS.md
  API.md                  module API (prototype) + proposed REST API (production)
  openapi.yaml            OpenAPI 3.1 contract for the future FastAPI service
notes/                    gitignored study notes
```

**Ticket**: `{ id, createdAt, question (redacted), redactionsApplied, status: draft|approved|rejected|released, risk: normal|high, riskReasons[], sources: [{policyId, title, passage, score}], draft, finalAnswer?, reviewerNote?, approvedAt?, releasedAt?, schemaVersion }`

## 7. Phases (one commit each)

| Phase | Content                                                                                                                                 | Proof                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P0    | Tooling: TypeScript, Tailwind, Vitest with a coverage gate, Prettier, the `npm run check` gate, `.gitignore` for `notes/`, PROGRESS log | Gate runs green on an empty app; build + smoke pass                                            |
| P1    | **Security-critical first, test-first:** state machine, redaction, risk flagging, limits                                                | Tests written red, then green; each guard removed in turn fails a test                         |
| P2    | Fictional handbook + BM25 retrieval + threshold                                                                                         | Evaluation set of about 30 questions: recall@3 reported; off-topic questions return "no match" |
| P3    | Drafter + storage adapter                                                                                                               | Unit tests, including corrupt-storage and cap tests                                            |
| P4    | Employee chat UI                                                                                                                        | Playwright: ask → "with HR" status; released answer appears; XSS renders as text               |
| P5    | HR review queue: sources side by side, editable draft, approve/reject, high-risk confirmation, "Release approved" batch                 | Playwright: full flow; release disabled without approval                                       |
| P6    | Docs: README decision record, API.md, openapi.yaml, study notes                                                                         | Every command and count in the docs re-run and verified                                        |

After each phase: build, smoke test at phone and desktop sizes (screenshots checked), preview link, a report to you, and a commit. At the end: one pull request into `main`.

## 8. Verification (quality gate, `npm run check`)

Type check (`tsc --noEmit`), oxlint, Prettier check, Vitest with a coverage gate (90% lines on `src/domain` and `src/storage`), `npm audit --audit-level=high`, a storage-schema drift test (the seed data must validate against the current schema), Playwright end-to-end tests, and the team's `npm run smoke`.
