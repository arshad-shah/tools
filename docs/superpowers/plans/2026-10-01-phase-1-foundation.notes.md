# Phase 1 foundation: verification and handoff notes

## Verification (branch `feat/pdf-suite-foundation`)

- Deleted-files check: 5 "No such file" lines; 0 references to `PdfMergerTypes|PdfSplitterTypes|TOOL_IDS`.
- `pnpm lint`: 0 errors, 38 warnings (pre-existing, in untouched tools).
- `pnpm typecheck`: clean.
- `pnpm test` (vitest): 30 files, 178 tests passed.
- `pnpm build`: succeeds (only the usual chunk-size warning).
- `pnpm test:e2e` (Playwright): 14 tests passed. Stable across 3 consecutive runs after the warm-up fix below.

### E2E flake

An earlier run showed 4-6 failures in the merger, organize and splitter specs
that passed on rerun. Reproduced reliably on a cold Vite dependency cache:
parallel workers hit on-demand dependency optimisation and the first pdf.js
worker boot together, the dev server reloads mid-test, and the 5s assertions
time out. Fix: `test/e2e/global-setup.ts` now warms the server (visits every
route, loads a fixture once). Verified on a cold cache (4 failed before, 14
passed after). No retries or sleeps were added.

### Scripted browser pass (one-off, not committed)

- `/`, `/pdf-merger`, `/pdf-splitter`, `/pdf-organize` load with no console errors and no page errors.
- Known warning: pdf.js "Setting up fake worker" (logged twice).
- Dashboard shows "Organize PDF Pages" with a NEW badge.
- Encrypt-marked fixture (`makeEncryptMarkedPdf`): the merger shows the ENCRYPTED message. The splitter and organize show the INVALID_FILE message ("This file could not be read as a PDF. It may be damaged.") instead.
  Cause: the fixture only adds an `/Encrypt` dict with no `/O`, `/U` or `/ID`. pdf-lib flags it as encrypted, but pdf.js throws `UnknownErrorException` ("Invalid argument for stringToBytes"), not `PasswordException`. The pdf.js-first tools therefore map it to INVALID_FILE. A genuinely encrypted PDF should raise `PasswordException` and show ENCRYPTED, but this is unverified; a real encrypted fixture (e.g. from qpdf) should be added in a later phase.

## Deviations and findings

- pdf.js worker: `useWorkerFetch: true` is required. The display-side fetcher (`false`) reads `document.baseURI`, which does not exist in a worker, and fails silently. The core-side fetcher is a plain `fetch()` and runs in the same worker.
- store-kit key format is `kit:store:<name>`.
- Decision log (rulings R1-R18): see PR description.

## Temporary shims still present (Phase 4 removes them)

- `src/components/ui/index.ts`
- `src/hooks/useClipboard.tsx`
- `src/types/ToolTypes.ts`

## Upstream issues opened

- arshad-shah/detent#74, arshad-shah/detent#75
- arshad-shah/Kit#94
- arshad-shah/qpdf-wasm#2

Suggestion for `@arshad-shah/detent-react`: offer an option to revert the DOM move in `onSort`, so React consumers don't need `restoreDomOrder`.
