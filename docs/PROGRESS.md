# Progress log

## Decisions (approved 2026-10-23)

All plan recommendations approved: Vite + React + Tailwind v4, TypeScript, built-in extractive drafter, browser-only storage with demo seed, role switch (not auth). PR targets `main` (the repo has no `development` branch); the owner merges.

## Phase status

| Phase      | Status |
| ---------- | ------ |
| P0 Tooling | done   |

## Verified facts

- `tailwindcss` / `@tailwindcss/vite` 4.3.3, `vitest` 5.0.5, `@playwright/test` 1.64.1: checked with `npm view` on 2026-10-23.
- TypeScript pinned to 5.9.3. 7.0.2 (native port) is the current latest; 5.9 was chosen for ecosystem compatibility.
- The Vitest 5 config accepts `coverage.thresholds` and `coverage.include`: checked in `node_modules/vitest/dist/node.d.ts`.
- `@playwright/test` 1.64.1 looks for `chromium_headless_shell-1248`, but the sandbox ships build 1243 at `/opt/pw-browsers/chromium`. The Playwright config uses that path when it exists.

## Lessons / bugs

- Tests missed this; guard-removal caught it: the "never release a draft" test used a draft with no answer, so deleting the status check left it green. Approve, then send back to draft, keeps the answer, which would have allowed releasing a draft. Added a test for that exact path, and for releasing twice.
- The team smoke script (`scripts/smoke-test.cjs`, staff-owned) reports SKIPPED here: it needs Chromium headless shell build 1248, but the sandbox has 1243. The Playwright suite runs the same checks (console errors, phone + desktop screenshots) against the build instead.
- Desktop queue tabs overflowed and cut off the last tab; found in a screenshot. Fixed by letting the tabs wrap.

- oxlint ignored `react/no-danger` until the `react` plugin was listed in `plugins`; it exited 0 on a file using `dangerouslySetInnerHTML`. Found by writing a deliberately bad file. Fixed by enabling the plugin and re-checking that the rule fails the same file.
- Prettier reformatted the team's staff-owned docs (`START-HERE.md`, `PROMPTS.md`). Reverted them and added them to `.prettierignore`.
