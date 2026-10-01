# Phase 5 — PDF Workspace & Refined Terminal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. One executor per Part (PR) per controller ruling R22; each Part runs in its own git worktree.

**Goal:** Ship the phase-5 redesign as nine PR-sized Parts:

- **P5-A1** design-system enforcement (lint rules, glyph scan, icon module, tokens, restyled kit, shell primitives),
- **P5-A2** clean-break information architecture (category routes, Home, hubs, Mod+K, handoff) and kit adapters with rule (b),
- **P5-B** the PDF document workspace core with Organize mode,
- **P5-C** Fill & Sign with flat-form detection,
- **P5-H** Signing+ (ink pen, typed gallery, photo capture, initials/blocks, smart placement, PAdES-B-B signing and verification),
- **P5-D** Annotate and Edit,
- **P5-E** content-stream engine, Redact, Protect, Optimize, Convert and quick-task handoff,
- **P5-F** OCR,
- **P5-G** polish and the success-criteria sweep.

**Architecture:**

- `eslint-rules/` is a local ESLint plugin (`local/*`) enforcing spec §1A at `error`; `scripts/vite-glyph-report.ts` + `test/dist-glyphs.test.ts` scan the build.
- `src/shared/ui` is the only home of raw elements, inline styles and icons (`src/shared/ui/icons`). Third-party visual libraries are reached through `src/shared/ui/adapters`.
- `src/theme/tokens.css` replaces `theme/terminal.css`: CSS variables per `data-theme`, exposed to Tailwind v4 with `@theme inline`.
- `src/pdf/doc` (no React) holds the document model: op log + cursor, page map, view fold, op registry, checkpoints, change summary, autosave. `src/pdf/edit/edit.worker.ts` hosts pdf-lib materialisation; checkpoints are orchestrated on the main thread through service clients (edit, render, qpdf, compress, ocr).
- `src/pdf/workspace` is the React workspace (`WorkspaceShell`, `DocumentCanvas`, `ModeHost`, `ExportDialog`); `src/pdf/workspace/modes/<mode-id>/` holds thin mode UI only. Op logic lives in `src/pdf/doc/ops` (view side) and `src/pdf/doc/materialize` (worker side).
- `src/pdf/detect`, `src/pdf/redact`, `src/pdf/ocr`, `src/pdf/sign` are pure domain modules with unit tests on generated fixtures.

**Tech Stack:**

- Existing: React 19, Vite 8, TypeScript 6, Tailwind v4, pdf-lib 1.17, pdfjs-dist 6.3, @pdf-lib/fontkit, @arshad-shah/qpdf-wasm 0.1, @arshad-shah/store-kit + zustand 5, @arshad-shah/detent(-react) 0.3, lucide-react 1.17, sonner 2, fflate, Vitest 5 + Testing Library, Playwright 1.63.
- Added (all permissive): `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` (OFL, A1); `@axe-core/playwright` (MPL-2.0, dev, A1); `fake-indexeddb` (Apache-2.0, dev, B); `@fontsource/noto-sans` (OFL, B, Unicode fallback font for drawing); `tesseract.js`, `tesseract.js-core`, `@tesseract.js-data/{eng,fra,deu,spa,ita,por,nld,gle,pol,swe}` (Apache-2.0, F); `perfect-freehand` (MIT, H); `pkijs` + `asn1js` (BSD-3-Clause, H); `@fontsource/{sacramento,allura,alex-brush,parisienne,pinyon-script,mr-dafoe,kristi}` (OFL, H). Each Part's first task re-checks the license file of every package it adds and reports it.

**Spec:** `docs/superpowers/specs/2026-10-01-pdf-workspace-and-redesign-design.md` (authority). Sections referenced per task as §n. Owner addition "Signing+" (P5-H) is binding and recorded in this plan's Part H header.

**Controller log:** `.superpowers/sdd/2026-10-01-phase-1-foundation/progress.md`. Rulings R1–R24 apply. In particular: R1 (tests import `test/fixtures/*` relatively), R2 (`typecheck` = `tsc -b`), R13 (keyboard model: detent `keyboard: false`, Alt+Arrow reorder, own live region), R22 (one executor per PR, worktrees, one whole-PR review + fix round), R24 (P4-D then P4-E before P5-A2; P5-A1 may run in parallel with P4-E; glyph checkbox fixtures under `test/` only; new codes STORAGE_FULL, VERIFICATION_FAILED, NETWORK).

## Global Constraints

**Owner rules (binding; restate in every task report)**

1. **SVG icons only, from `src/shared/ui/icons`.** Lucide icons are re-exported through `fromLucide`; anything lucide lacks is a custom TSX SVG component on lucide's 24px grid. The wordmark is the SVG `Logo` component. No other module imports `lucide-react` (rule (c)).
2. **No hand-rolled UI.** Tools, modes, `src/app`, `src/pdf/components` and `src/pdf/workspace` compose kit components only. A missing capability means: add a kit component first (with tests and a gallery entry), then use it. No raw `button/input/select/textarea/svg/img/canvas/video/audio/iframe`, no `style` prop outside `src/shared/ui` (rule (b), from P5-A2 on).
3. **No glyphs.** No emoji, pictographic, dingbat, arrow, geometric-shape, box-drawing or technical-symbol glyph in any product string, JSX text, test name in `src`, op label, toast, fixture meant for display, or built asset (rule (a) + dist scan). Use icons, `Kbd`, `MetaList`, `Breadcrumb`, `StatusDot`, or plain words ("to", "and", "Copyright"). Code that must recognise such characters in third-party PDFs uses numeric code points (`0x2610`), never literals or `\u` escapes.
4. **Enforced in CI.** All `local/*` rules at `error`, no inline disables of them (rule `local/no-disable-enforced` + `test/no-inline-disable.test.ts`), `pnpm lint` runs with `--max-warnings 0 --report-unused-disable-directives`.
5. **Modularity.** Tools and modes stay thin. Domain logic in `src/pdf/*` (pure, unit-tested), UI from the kit, workers via `worker-rpc`, settings via `createToolStore`, async work via `useJob`.
6. **ToolError model.** Nothing faked, no silent failures, no silent fallbacks: every fallback (rasterise, kept original, skipped page, detection skipped) is reported in the UI. New codes only as listed: `STORAGE_FULL`, `VERIFICATION_FAILED`, `NETWORK` (P5-B), `CERTIFICATE_INVALID`, `SIGNATURE_INVALID` (P5-H).
7. **Clean-break routes.** `/<category>/<slug>`, `/pdf/edit/:mode?`. No redirects, no compatibility routes, no shims.
8. **Light and dark themes, WCAG 2.2 AA, reduced motion** for every new surface (tokens only; no colour literals outside `tokens.css` and the validated-hex paths of `ShapeLayer`/`Swatch`).

**Platform**

- Fully client-side. Document bytes never leave the browser. Network exceptions, all user-initiated and labelled: the API Request tool (by design), OCR language data (same-origin, consented, P5-F), the optional RFC 3161 timestamp request (opt-in, P5-H).
- MIT-compatible only. Never add `mupdf`, Ghostscript, Comlink, `@dnd-kit`, `cynosure-*`, GPL code or ports of GPL code (potrace is GPL: P5-H implements tracing from published algorithms, not from potrace sources).
- Prefer `@arshad-shah/*` packages.

**Code conventions**

- `@/` imports. Relative imports never climb out of their module folder (R1 exception for tests).
- Tool folders kebab-case = tool id; entry `Tool.tsx`. Mode folders `src/pdf/workspace/modes/<mode-id>/` with `index.ts` (manifest) and `Mode.tsx` (default-export `ModeModule`).
- Non-JSX files use `.ts`. Files stay under 400 lines (phase 4 PR E rule); split when a task would exceed it.
- Ids from `newId()`. Downloads via `saveBlob`/`saveZip`/`deriveFilename`. Toasts via `notify`. Files via `loadFile`/`readBytes`.
- Test ids: kebab-case `data-testid` only where no accessible role/name exists (canvas overlays, page slots). Tests prefer `getByRole` + accessible name. Every test id named in this plan is part of the component contract.

**Concurrency note (read at every task start)**

- Phase 4 PR D (`cn` at `@/shared/lib/cn`, inline styles to Tailwind, CSS modules deleted, `AnimatedBackground` deleted, idempotent pdf.js assets) and PR E (files split under 400 lines, lint at 0 warnings with `--max-warnings 0`) land before P5-A2. Signatures in this plan were written against `master` at `d7c64bb` plus the `feat/phase4-styling` branch.
- **Step 0 of every task:** open every module the task consumes and confirm the signature named under **Interfaces / Consumes**. If it differs, adapt the call sites to the real signature and note it in the task report. Do not change a shared module except where the task lists it under **Files / Modify**.
- File paths in Part A2 onwards assume PR E's splits; re-locate code by the quoted identifiers if a file moved.

**Windows / git**

- Case-only renames go through a temporary name (`git mv a a-tmp && git mv a-tmp A`).
- Package manager `pnpm` 10.11.0, never npm.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `--no-verify`.
- No long-running processes left behind: stop dev servers you start.

**Merge gate (every Part)**

Run in this order; all must be green:

1. `pnpm lint` (0 errors, 0 warnings; the script carries `--max-warnings 0 --report-unused-disable-directives`)
2. `pnpm typecheck`
3. `pnpm build` (the dist glyph scan needs `dist/`)
4. `pnpm test` (includes `test/dist-glyphs.test.ts`, rule tests, `test/no-inline-disable.test.ts`)
5. `pnpm test:e2e` three consecutive green runs (investigate any flake; never add retries or sleeps, note N3)
6. `pnpm test:visual` where the Part's boundary says so (both themes; desktop 1280x800 and, where listed, phone 390x844; reduced motion forced; threshold 0.2%; axe 0 serious/critical)

## Parallelisation map

| Part  | Branch                       | Cut from `master` after                            | Can run in parallel with (separate worktrees) | File-overlap risks and mitigation                                                                                                                                                                                                                                                                      |
| ----- | ---------------------------- | -------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P5-A1 | `feat/p5-a1-design-system`   | P4-D                                               | P4-E (R24)                                    | P4-E splits tool files that A1-5 edits for lucide imports and glyphs. Mitigation: A1 rebases on P4-E before its gate if P4-E merged first; A1-5 edits imports and literals only (no restructuring), so conflicts are import-line conflicts.                                                            |
| P5-A2 | `feat/p5-a2-ia-kit-adapters` | P4-E and P5-A1                                     | none                                          | Touches every tool's manifest and frame; must be alone.                                                                                                                                                                                                                                                |
| P5-B  | `feat/p5-b-workspace-core`   | P5-A2                                              | none                                          | Creates the registries every later Part appends to (see "Append-only registries" below).                                                                                                                                                                                                               |
| P5-C  | `feat/p5-c-fill-sign`        | P5-B                                               | P5-D, P5-E, P5-F (F-1..F-5)                   | Shares with D/E: `render/handlers/index.ts`, `doc/ops/index.ts`, `doc/materialize/index.ts`, `workspace/modes/registry.ts`, icon group barrel, kit barrel, `test/e2e/global-setup.ts` (one line each).                                                                                                 |
| P5-H  | `feat/p5-h-signing-plus`     | P5-C                                               | P5-D, P5-E (after C merged)                   | Edits C's `workspace/modes/fill-sign/*` (C must be merged), `pdf/sign/*` (H only), `doc/export-stages.ts` (one line), `shared/lib/errors.ts` (two codes), `ExportDialog` option sections (registry line). E also registers export stages and option sections: conflicts are one-line registry entries. |
| P5-D  | `feat/p5-d-annotate-edit`    | P5-B                                               | P5-C, P5-E, P5-H, P5-F (F-1..F-5)             | Extends `pdf/edit/draw.ts` (created in P5-B with a fixed API; D adds new exports only). Annotate needs the text layer adapter (D only).                                                                                                                                                                |
| P5-E  | `feat/p5-e-redact-protect`   | P5-B (E-1, E-2 may start then)                     | P5-C, P5-D, P5-H, P5-F (F-1..F-5)             | `pdf/edit/content/*` is new and independent (spec §17). E-13 edits quick-task tools and `pdf/components/ResultFiles.tsx`; nobody else touches them after A2.                                                                                                                                           |
| P5-F  | `feat/p5-f-ocr`              | P5-B (F-1..F-5); rebase on C, D, E before F-6..F-8 | P5-C, P5-D, P5-E, P5-H for F-1..F-5           | F-6 raster rulings feed P5-C's cell builder (needs C merged). F-7 adds "Run OCR" actions into Annotate (D), Redact (E) and the hub card (C): needs C, D, E merged.                                                                                                                                     |
| P5-G  | `feat/p5-g-polish`           | all of the above                                   | none                                          | Sweeps everything.                                                                                                                                                                                                                                                                                     |

One line: `A1 (parallel with P4-E) -> A2 -> B -> { C -> H, D, E, F[1-5] } in parallel worktrees -> F[6-8] after C+D+E -> G`.

**Append-only registries (created in P5-B so later Parts never edit each other's code):**

- `src/shared/ui/icons/index.ts`: one `export * from './custom/<group>';` line per icon group.
- `src/shared/ui/index.ts`: one export line per kit module.
- `src/pdf/render/handlers/index.ts`: spreads handler modules into the render worker.
- `src/pdf/edit/worker/handlers.ts`: spreads handler modules into the edit worker.
- `src/pdf/doc/ops/index.ts` (view-side op definitions) and `src/pdf/doc/materialize/index.ts` (worker-side materialisers and checkpoint runners).
- `src/pdf/doc/export-stages.ts`: ordered export stages (`removeUnreferenced` from B, `linearize`/`encrypt` from E, `sign` from H).
- `src/pdf/workspace/export-options.ts`: Export dialog option sections.
- `src/pdf/workspace/modes/registry.ts`: one manifest import per implemented mode (no stub modes).

## Review Focus

1. **Glyph and icon enforcement can't be bypassed.** Rule (a) flags cooked string values (escapes included) in every literal kind; blanket and named inline disables fail `test/no-inline-disable.test.ts`; the dist scan attributes hits to modules. Covered by A1-1, A1-2, A1-6.
2. **Undo/redo across checkpoints and reload.** Undo of a checkpoint restores the previous base without recomputation; a new op after undo drops later checkpoints and their blobs; reload restores log, cursor, mode and viewport; schema mismatch is listed, not migrated. Covered by B-3, B-7, B-18.
3. **Flat-form detection quality and honesty.** Precision and recall at or above 0.90 on generated fixtures; negative report not flagged; pages over 20 000 path ops report "no detection: page too complex". Covered by C-3..C-9.
4. **Redaction never half-applies.** Verification failure rasterises and re-verifies, then refuses with `VERIFICATION_FAILED` and discards the checkpoint; raw bytes after qpdf decompression contain no search term in latin1 or UTF-16BE. Covered by E-6..E-8.
5. **Digital signatures are real and honest.** Output verifies with `openssl cms -verify` on the ByteRange content; one changed byte breaks it; trust labels never claim trust without an imported root; timestamps only on explicit opt-in. Covered by H-9..H-15.
6. **No third-party network.** Playwright request logs on workspace and OCR flows assert same-origin only. Covered by F-8, H-15.
7. **Kit-only UI.** Rule (b) at error with zero violations and the kit gallery covering every new primitive in both themes. Covered by A2-8..A2-12, G-1.

## Decisions taken where the spec was silent (also listed in the hand-off reply)

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Rule (b) skips `**/*.test.{ts,tsx}` (test harnesses do not ship); rule (a) still applies to tests in `src`.                                                                                                                                                                                                                                                                        |
| G2  | Rule (a) checks cooked values, so the literal `'\u2192'` (backslash-u escape) is a violation; runtime `String.fromCodePoint(0x2192)` is allowed (spec 1A.1).                                                                                                                                                                                                                       |
| G3  | U+00A9 is `Extended_Pictographic`: the footer says "Copyright 2026 ...".                                                                                                                                                                                                                                                                                                           |
| G4  | Op definitions are split: view-side `defineOperation` (main thread and worker), worker-only `defineMaterializer`, and main-thread `defineCheckpointRunner` orchestrators, so pdf-lib never enters the main bundle. A registry test pairs them. Each `Operation` also stores its `label`, computed at dispatch time, so undo text and summaries stay stable after later page moves. |
| G5  | Checkpoints run in a main-thread orchestrator with service clients (edit, render, qpdf, compress, ocr): redaction rasterise and verification need pdf.js, which the edit worker does not host. Heavy work still runs in workers.                                                                                                                                                   |
| G6  | Overlay ops address pages by stable page id (`PageRef.id`), not index, so they survive reorder and duplicate.                                                                                                                                                                                                                                                                      |
| G7  | A mode is registered only when its Part ships it; shortcuts 1-9 follow the fixed spec order regardless of which modes exist.                                                                                                                                                                                                                                                       |
| G8  | Visual baselines are per platform (`{platform}` in the snapshot path). Local `win32` baselines gate PRs; the Linux CI visual job runs in the pinned Playwright container and a `workflow_dispatch` job produces Linux baselines.                                                                                                                                                   |
| G9  | Dist scan attributes app code through a Vite plugin (`transform`, `enforce: 'post'`) that writes `node_modules/.tmp/glyph-report.json`; nothing extra is deployed.                                                                                                                                                                                                                 |
| G10 | Theme bootstrap is an external same-origin `public/theme-init.js` loaded render-blocking in `<head>` (no inline script).                                                                                                                                                                                                                                                           |
| G11 | CSP (P5-F) restricts scripts, workers, objects and frames; `connect-src` stays open because the API Request tool and the opt-in TSA are user-initiated by design. The workspace's no-third-party rule is enforced by request-log tests and a same-origin guard in the OCR loader.                                                                                                  |
| G12 | Saved signatures are out of scope (owner), overriding spec §8.1's "saved signatures kept in profile store".                                                                                                                                                                                                                                                                        |
| G13 | Legacy PKCS#12 files (3DES/RC2 PBE) are refused with `CERTIFICATE_INVALID` and re-export instructions; WebCrypto only supports PBES2 (PBKDF2 + AES-CBC).                                                                                                                                                                                                                           |
| G14 | Password protection and a digital signature cannot both be applied in one export (`INVALID_INPUT` with a plain explanation).                                                                                                                                                                                                                                                       |
| G15 | The signing certificate page is added before signing and shows the SHA-256 of the document as it was before the page and the signature were added.                                                                                                                                                                                                                                 |
| G16 | A default TSA ships only if a free HTTPS TSA answers CORS preflight from the app origin (verified in H-11); otherwise the URL field starts empty.                                                                                                                                                                                                                                  |
| G17 | A document that already carries signatures: an export with other changes warns that those signatures will no longer verify; a sign-only export appends an incremental update to the original bytes.                                                                                                                                                                                |
| G18 | The kit gallery is a dev-only route `/__kit` (absent from production builds).                                                                                                                                                                                                                                                                                                      |
| G19 | Until their Parts fold them, the six to-be-folded PDF tools get interim slugs (`/pdf/organize`, `/pdf/sign`, `/pdf/fill-form`, `/pdf/watermark`, `/pdf/page-numbers`, `/pdf/metadata`); each is deleted with its Part.                                                                                                                                                             |
| G20 | Legacy token aliases (`surface-subtle`, `surface-strong`, `accent-hover`, `accent-dim`, `danger-dim`, `success`, `fg-faint`) and Button variant aliases (`solid`, `soft`, `outline`) live through A1 and are removed in A2-12.                                                                                                                                                     |
| G21 | `pdf/edit/draw.ts` (content drawing primitives) is created in P5-B with a fixed API so C, D and H only add to it.                                                                                                                                                                                                                                                                  |
| G22 | Trusted roots imported for verification are stored in IndexedDB `profile` under `trusted-roots` (local, clearable from settings).                                                                                                                                                                                                                                                  |
| G23 | Ink and traced signatures are emitted as vector PDF paths; typed signatures embed a subset of the chosen font through pdf-lib + fontkit (owner) and apply slant with a skewed text matrix.                                                                                                                                                                                         |
| G24 | Spec criterion 6's "30 non-PDF tools" means the 30 tools outside the workspace: 22 non-PDF tools plus the 8 PDF quick tasks.                                                                                                                                                                                                                                                       |
| G25 | `protect.set` (spec §7.2) stores only the on/off choice and permissions; passwords are typed in the Export dialog and never enter the op log, autosave or settings. Private keys and certificate passwords follow the same rule.                                                                                                                                                   |
| G26 | Generic `object.move`/`object.remove` ops and the `fmt` number formatter live in P5-B so C, D, F and H share them without cross-Part edits; overlay ops without a writer declare `noOutput`.                                                                                                                                                                                       |

---

## File Structure (phase 5 end state; "new" and "mod" mark changes)

```
eslint-rules/                                new  local ESLint plugin (ESM .js, JSDoc-typed)
  index.js                                        plugin { rules }
  banned-glyphs.js                                BANNED_RANGES, findBanned(text), EMOJI_ONLY_RE (shared with dist scan)
  no-pictographic-text.js  (+ .test.js)
  no-raw-ui-outside-kit.js (+ .test.js)           (P5-A2)
  no-lucide-outside-icons.js (+ .test.js)
  no-disable-enforced.js   (+ .test.js)
scripts/
  vite-glyph-report.ts                       new  Vite plugin: per-module glyph + lucide-importer report
  gen-logo.ts                                new  JetBrains Mono outlines -> src/shared/ui/icons/brand/logo-paths.ts
  gen-favicon.tsx                            new  LogoMark -> public/favicon.svg
  visual-docker.mjs                          new  runs the visual suite in mcr.microsoft.com/playwright:v1.63.0-noble
  copy-ocr-assets.mjs                        new  (P5-F) public/ocr/* + public/ocr/ocr-manifest.json
  csp.ts                                     new  (P5-F) CSP string shared by public/_headers and vite preview
  gen-fixtures.ts                            mod  new fixtures per Part
public/
  theme-init.js                              new  resolves data-theme before first paint
  favicon.svg                                new  generated
  _headers                                   new  (P5-F) CSP
src/
  theme/tokens.css                           new  replaces theme/terminal.css (deleted in A2)
  app/
    App.tsx                                  mod  routes: /, /:category, /:category/:slug, /pdf/edit/:mode?, /__kit (dev), *
    categories.ts                            new  CATEGORIES table
    routes.ts                                new  toolPath(), RESERVED_SLUGS
    registry.ts  tool.ts                     mod  slug, kind, keywords, accepts, alsoIn; IconComponent
    pages/Home.tsx Hub.tsx PdfHub.tsx NotFound.tsx ToolPage.tsx       new
    pages/home/RecentDocuments.tsx  pages/pdf-hub/DetectedDocumentCard.tsx   new
    commands/app-commands.ts                 new  route/tool/favourite command sources
    gallery/KitGallery.tsx (+ sections/*)    new  dev-only
    favorites.ts                             new  favourites store (localStorage key favoriteTools kept)
    Dashboard.tsx ToolLayout.tsx AnimatedBackground.tsx    deleted (A2; AnimatedBackground may already be gone after P4-D)
  shared/
    ui/
      icons/  index.ts  icon.tsx (IconProps, IconComponent, fromLucide, defineIcon)  lucide.ts
              custom/<group>.tsx (brand, keys, layout, modes, organize, edit, annotate, fill-sign, redact, ocr, optimize, signing)
              brand/Logo.tsx  brand/logo-paths.ts
      adapters/  Chart.tsx FlowCanvas.tsx RivePlayer.tsx QrCode.tsx CodeEditor.tsx PdfTextLayerHost.tsx
      app-shell.tsx top-bar.tsx breadcrumb.tsx command-palette.tsx popover.tsx drop-zone.tsx
      hub-layout.tsx tool-card.tsx category-card.tsx toaster.tsx states.tsx
      kbd.tsx shortcut-hint.tsx meta-list.tsx segmented-control.tsx status-dot.tsx swatch.tsx
      color-swatch-picker.tsx progress-overlay.tsx side-panel.tsx inspector.tsx
      mode-tabs.tsx floating-dock.tsx toolbar.tsx floating-palette.tsx
      page-rail.tsx document-viewport.tsx positioned.tsx shape-layer.tsx
      selection-frame.tsx hit-area.tsx field-box.tsx signature-pad.tsx bitmap-canvas.tsx image.tsx
      auto-grid.tsx color-input.tsx date-input.tsx camera-capture.tsx choice-grid.tsx
      (existing primitives restyled)
    lib/
      theme.ts hotkeys.ts commands.ts fuzzy.ts handoff.ts storage.ts platform.ts     new
      errors.ts                                                                      mod (+5 codes)
    state/  (unchanged API)
  pdf/
    render/
      handlers/ index.ts open.ts render.ts text.ts geometry.ts(C) annotations.ts(D) ocr.ts(F)   new layout
      render.worker.ts                       mod  exposeRpc(handlers)
      priority.ts                            new  render queue priorities canvas > rail > detection
      bitmap-cache.ts                        mod  pixel-budget LRU
    edit/
      draw.ts pages.ts                       new  (B) drawing primitives; setBoxes, setPageLabels, insertBlank
      annot/ common.ts appearance.ts markup.ts note.ts freetext.ts ink.ts shapes.ts stamp.ts edit.ts   new (D)
      content/ lexer.ts serialize.ts interpreter.ts font-metrics.ts                                    new (E)
      sanitize.ts size-breakdown.ts          new  (E)
      forms.ts                               mod  (C) createFields, listFormWidgets, initialValues, changedValues
      worker/ handlers.ts                    new  (B)
      edit.worker.ts                         new  (B)
    doc/                                     new  (B) types.ts registry.ts page-map.ts view.ts model.ts summary.ts
                                                  serialize.ts autosave.ts recent.ts budget.ts export.ts export-stages.ts
                                                  services.ts ops/* materialize/*
    detect/                                  new  (C) geometry.ts segments.ts cells.ts candidates.ts classify.ts
                                                  confidence.ts reading-order.ts autofill.ts index.ts raster.ts(F) sign-targets.ts(H)
    redact/                                  new  (E) search.ts text.ts paths.ts images.ts xobjects.ts apply.ts rasterise.ts verify.ts scrub.ts
    ocr/                                     new  (F) pool.ts pages.ts text-layer.ts assets.ts
    sign/                                    new  (C) stroke.ts pixels.ts placement.ts fonts.ts signature.ts
                                                  (H) ink.ts typed-fonts.ts photo/* trace/* initials.ts block.ts pades/*
    convert/markdown.ts                      new  (E)
    components/                              mod  PageThumb uses BitmapCanvas; ResultFiles gains "Open result in workspace"
    workspace/                               new  (B) WorkspaceShell.tsx DocumentCanvas.tsx ModeHost.tsx ExportDialog.tsx
                                                  OpenDocument.tsx useDocument.ts settings.ts shortcuts.ts export-options.ts live-region.ts
      modes/ types.ts registry.ts organize/ fill-sign/ annotate/ edit/ redact/ convert/ protect/ optimize/ ocr/
  tools/
    pdf-edit/                                new  (B) workspace entry at /pdf/edit/:mode?
    pdf-organize pdf-sign pdf-fill-form pdf-watermark pdf-page-numbers pdf-metadata   deleted (B, C, C, D, D, E)
    <30 non-PDF tools + 8 quick tasks>       mod  manifests (slug, kind, keywords, accepts), kit-only UI
test/
  dist-glyphs.test.ts no-inline-disable.test.ts tokens.contrast.test.ts      new (A1)
  fixtures/builders.ts                       mod
  fixtures/flat-form.ts redact.ts signing.ts test-tsa.ts scan.ts            new
  visual/*.visual.ts                         new  (playwright.visual.config.ts)
  e2e/*.spec.ts                              mod  new routes; workspace specs
playwright.visual.config.ts                  new
```

---

# Part P5-A1 — Design-system enforcement, icons, tokens, kit (PR: `feat/p5-a1-design-system`)

**Scope (spec §1A, §4, §17 row A1):** lint rules (a), (c), no-disable at `error`; dist scan (d); icon module with `Logo`/`LogoMark`, key, layout and brand icons; fix every (a)/(c) hit repo-wide; tokens (light/dark), theme bootstrap, self-hosted fonts; restyle the existing kit; new primitives not tied to the workspace (AppShell, TopBar/Breadcrumb, CommandPalette, Popover, DropZone variants, HubLayout, CategoryCard/ToolCard, Toast theme, Empty/Error/LoadingState, Kbd/ShortcutHint, MetaList, SegmentedControl, StatusDot, Swatch); dev-only kit gallery with visual baselines in both themes.

Starts from `master` once P4-D merged. May run beside P4-E (R24); rebase on P4-E before the gate if it merged first.

### Task A1-1: Local ESLint plugin and `local/no-pictographic-text`

**Files:**

- Create: `eslint-rules/banned-glyphs.js`, `eslint-rules/no-pictographic-text.js`, `eslint-rules/no-pictographic-text.test.js`, `eslint-rules/index.js`
- Modify: `vitest.config.ts` (include `eslint-rules/**/*.test.js`), `eslint.config.js` (ignore nothing new yet; wiring happens in A1-5)

**Interfaces:**

- Produces: `findBanned(text: string): { index: number; codePoint: number } | null`, `BANNED_DESCRIPTION: string`, `EMOJI_ONLY_RE: RegExp` (spec 1A.2 vendor subset), plugin default export `{ meta: { name: 'local' }, rules: { 'no-pictographic-text': Rule } }`.
- Consumes: ESLint 10 `RuleTester` (`import { RuleTester } from 'eslint'`), `typescript-eslint` parser.

- [ ] **Step 1: Write the banned set** (`eslint-rules/banned-glyphs.js`). Ranges come straight from spec 1A.1; there is no allow-list.

```js
// @ts-check
/** Code-point ranges banned in product text (spec 1A.1, rule (a)). Inclusive. */
export const BANNED_RANGES = /** @type {const} */ ([
  [0x20e3, 0x20e3], // combining enclosing keycap
  [0xfe0f, 0xfe0f], // emoji presentation selector
  [0x1f1e6, 0x1f1ff], // regional indicators
  [0x2190, 0x21ff], // Arrows
  [0x2300, 0x23ff], // Misc Technical
  [0x2500, 0x257f], // Box Drawing
  [0x2580, 0x259f], // Block Elements
  [0x25a0, 0x25ff], // Geometric Shapes
  [0x2600, 0x26ff], // Misc Symbols
  [0x2700, 0x27bf], // Dingbats
  [0x27f0, 0x27ff], // Supplemental Arrows-A
  [0x2900, 0x297f], // Supplemental Arrows-B
  [0x2b00, 0x2bff], // Misc Symbols and Arrows
  [0x2022, 0x2023], // bullet, triangular bullet
  [0x2043, 0x2043], // hyphen bullet
  [0x2039, 0x203a], // single angle quotation marks
]);

const PICTO = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;

/** First banned code point in `text`, or null. */
export function findBanned(text) {
  let index = 0;
  for (const ch of text) {
    const cp = /** @type {number} */ (ch.codePointAt(0));
    if (
      PICTO.test(ch) ||
      BANNED_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)
    ) {
      return { index, codePoint: cp };
    }
    index += ch.length;
  }
  return null;
}

/** Spec 1A.2: the subset checked in every built chunk, vendor included. */
export const EMOJI_ONLY_RE =
  /[\p{Emoji_Presentation}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

export const hex = (cp) =>
  `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
```

Note: ASCII digits, `#` and `*` are `Emoji` but not `Emoji_Presentation` nor `Extended_Pictographic`, so plain text is unaffected. U+00A9 and U+00AE are `Extended_Pictographic` (decision G3).

- [ ] **Step 2: Write the failing rule tests** (`eslint-rules/no-pictographic-text.test.js`). Banned characters are built with `String.fromCodePoint` so this file itself never contains them.

```js
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';
import rule from './no-pictographic-text.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ARROW = String.fromCodePoint(0x2192);
const STAR = String.fromCodePoint(0x2605);
const SMILE = String.fromCodePoint(0x1f642);
const BULLET = String.fromCodePoint(0x2022);
const CHECK = String.fromCodePoint(0x2713);
const COPY = String.fromCodePoint(0xa9);
const FLAG = String.fromCodePoint(0x1f1ee, 0x1f1ea);

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const err = (cp) => ({ messageId: 'banned', data: { cp } });

tester.run('no-pictographic-text', rule, {
  valid: [
    { code: `const a = 'Next page';` },
    { code: `const a = \`Page \${n} of \${total}\`;` },
    { code: `const a = <p>Saved, 3 files</p>;` },
    { code: `const a = String.fromCodePoint(0x2610);` },
    { code: `const a = 0x2192;` },
    { code: `// comment with ${ARROW} is not checked\nconst a = 1;` },
    { code: `/* ${STAR} */ const a = 1;` },
    { code: `const a = 'caf\u00e9 \u2026 \u2014 \u00b0';` }, // e-acute, ellipsis, em dash, degree: allowed
    { code: `const a = /\\p{Extended_Pictographic}/u;` }, // property escape, no code point
  ],
  invalid: [
    { code: `const a = 'Next ${ARROW}';`, errors: [err('U+2192')] },
    { code: `const a = <p>${STAR} Favourite</p>;`, errors: [err('U+2605')] },
    {
      code: `const a = <Button label="${CHECK} Copied" />;`,
      errors: [err('U+2713')],
    },
    { code: `const a = \`Done \${x} ${SMILE}\`;`, errors: [err('U+1F642')] },
    { code: `const a = <li>{'${BULLET}'} item</li>;`, errors: [err('U+2022')] },
    { code: `const a = <p>{year} ${COPY}</p>;`, errors: [err('U+00A9')] },
    { code: `const a = '${FLAG}';`, errors: [err('U+1F1EE')] },
    { code: `const a = '\\u2192';`, errors: [err('U+2192')] }, // cooked value (G2)
    { code: `const a = <p>&rarr; next</p>;`, errors: [err('U+2192')] }, // JSX entity
    { code: `const a = /[${ARROW}]/;`, errors: [err('U+2192')] },
    { code: `const a = /[\\u2190-\\u21ff]/u;`, errors: [err('U+2190')] }, // escapes in regex
    { code: `it('moves 1 ${ARROW} 2', () => {});`, errors: [err('U+2192')] },
  ],
});
```

Run: `pnpm vitest run eslint-rules` -> Expected: FAIL (module not found).

- [ ] **Step 3: Implement the rule** (`eslint-rules/no-pictographic-text.js`).

```js
// @ts-check
import { findBanned, hex } from './banned-glyphs.js';

/** Decodes \uXXXX and \u{X...} escapes in a regex pattern (other escapes kept). */
function cookRegex(pattern) {
  return pattern
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ban emoji, pictographic, arrow, shape and box-drawing glyphs in product text (spec 1A R3)',
    },
    messages: {
      banned:
        'Banned glyph {{cp}}. Use an icon from @/shared/ui/icons, Kbd, MetaList, StatusDot or plain words; recognise third-party glyphs with numeric code points.',
    },
    schema: [],
  },
  create(context) {
    const check = (node, text) => {
      if (typeof text !== 'string') return;
      const hit = findBanned(text);
      if (hit)
        context.report({
          node,
          messageId: 'banned',
          data: { cp: hex(hit.codePoint) },
        });
    };
    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
        // @ts-expect-error regex literal shape
        if (node.regex) check(node, cookRegex(node.regex.pattern));
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
      JSXText(node) {
        // @ts-expect-error JSX nodes are not in estree typings
        check(node, node.value);
      },
    };
  },
};
export default rule;
```

JSX attribute strings are `Literal` nodes under `JSXAttribute`, so they are covered by `Literal`. `JSXText.value` is entity-decoded by the parser, which is why `&rarr;` is caught.

- [ ] **Step 4: Plugin entry** (`eslint-rules/index.js`):

```js
// @ts-check
import noPictographicText from './no-pictographic-text.js';

export default {
  meta: { name: 'local', version: '1.0.0' },
  rules: { 'no-pictographic-text': noPictographicText },
};
```

- [ ] **Step 5: Include the rule tests in Vitest.** In `vitest.config.ts` set `include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.ts', 'eslint-rules/**/*.test.js']`.

Run: `pnpm vitest run eslint-rules` -> Expected: PASS (21 cases).

- [ ] **Step 6: Commit**

```bash
git add eslint-rules vitest.config.ts
git commit -m "feat(lint): local plugin with no-pictographic-text and its RuleTester suite

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A1-2: `local/no-lucide-outside-icons`, `local/no-disable-enforced`, inline-disable guard

**Files:**

- Create: `eslint-rules/no-lucide-outside-icons.js` (+ `.test.js`), `eslint-rules/no-disable-enforced.js` (+ `.test.js`), `test/no-inline-disable.test.ts`
- Modify: `eslint-rules/index.js`

**Interfaces:**

- Produces: rules `no-lucide-outside-icons`, `no-disable-enforced`; constant `ENFORCED_RULES = ['local/no-pictographic-text', 'local/no-raw-ui-outside-kit', 'local/no-lucide-outside-icons', 'local/no-disable-enforced']` exported from `eslint-rules/index.js`.

- [ ] **Step 1: Failing tests for (c)** (`eslint-rules/no-lucide-outside-icons.test.js`), same RuleTester setup as A1-1:

```js
tester.run('no-lucide-outside-icons', rule, {
  valid: [
    { code: `import { IconStar } from '@/shared/ui/icons';` },
    { code: `import x from 'lucide';` },
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'src/shared/ui/icons/lucide.ts',
    },
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'C:\\repo\\src\\shared\\ui\\icons\\lucide.ts',
    },
  ],
  invalid: [
    {
      code: `import { Star } from 'lucide-react';`,
      filename: 'src/tools/x/Tool.tsx',
      errors: [{ messageId: 'lucide' }],
    },
    {
      code: `import Icon from 'lucide-react/dist/esm/icons/x';`,
      filename: 'src/app/App.tsx',
      errors: [{ messageId: 'lucide' }],
    },
    {
      code: `export { Star } from 'lucide-react';`,
      filename: 'src/app/a.ts',
      errors: [{ messageId: 'lucide' }],
    },
    {
      code: `export * from 'lucide-react';`,
      filename: 'src/app/a.ts',
      errors: [{ messageId: 'lucide' }],
    },
    {
      code: `const m = import('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: [{ messageId: 'lucide' }],
    },
    {
      code: `const m = require('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: [{ messageId: 'lucide' }],
    },
    {
      code: `type T = typeof import('lucide-react');`,
      filename: 'src/app/a.ts',
      errors: [{ messageId: 'lucide' }],
    },
  ],
});
```

- [ ] **Step 2: Implement (c)**:

```js
// @ts-check
const isLucide = (s) =>
  typeof s === 'string' &&
  (s === 'lucide-react' || s.startsWith('lucide-react/'));
const inIconModule = (filename) =>
  /[\\/]src[\\/]shared[\\/]ui[\\/]icons[\\/]/.test(filename) ||
  /^src[\\/]shared[\\/]ui[\\/]icons[\\/]/.test(filename);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    messages: {
      lucide:
        'Import icons from @/shared/ui/icons; lucide-react is reachable only from src/shared/ui/icons (spec 1A R1).',
    },
    schema: [],
  },
  create(context) {
    if (inIconModule(context.filename)) return {};
    const report = (node) => context.report({ node, messageId: 'lucide' });
    return {
      ImportDeclaration: (n) => isLucide(n.source.value) && report(n),
      ExportNamedDeclaration: (n) =>
        n.source && isLucide(n.source.value) && report(n),
      ExportAllDeclaration: (n) => isLucide(n.source.value) && report(n),
      ImportExpression: (n) =>
        n.source.type === 'Literal' && isLucide(n.source.value) && report(n),
      CallExpression: (n) =>
        n.callee.type === 'Identifier' &&
        n.callee.name === 'require' &&
        n.arguments[0]?.type === 'Literal' &&
        isLucide(n.arguments[0].value) &&
        report(n),
      // TS `typeof import('lucide-react')`
      TSImportType: (n) => {
        // @ts-expect-error TS node
        const arg = n.argument?.literal ?? n.argument;
        if (arg && isLucide(arg.value)) report(n);
      },
    };
  },
};
```

- [ ] **Step 3: Failing tests for no-disable** (`eslint-rules/no-disable-enforced.test.js`):

```js
tester.run('no-disable-enforced', rule, {
  valid: [
    {
      code: `// eslint-disable-next-line @typescript-eslint/no-explicit-any\nconst a: any = 1;`,
    },
    { code: `/* eslint-disable react-hooks/exhaustive-deps */` },
  ],
  invalid: [
    {
      code: `// eslint-disable-next-line local/no-pictographic-text\nconst a = 1;`,
      errors: [{ messageId: 'named' }],
    },
    {
      code: `/* eslint-disable local/no-lucide-outside-icons */`,
      errors: [{ messageId: 'named' }],
    },
    {
      code: `const a = 1; // eslint-disable-line local/no-raw-ui-outside-kit`,
      errors: [{ messageId: 'named' }],
    },
    {
      code: `/* eslint local/no-pictographic-text: off */`,
      errors: [{ messageId: 'named' }],
    },
    { code: `/* eslint-disable */`, errors: [{ messageId: 'blanket' }] },
    {
      code: `// eslint-disable-next-line\nconst a = 1;`,
      errors: [{ messageId: 'blanket' }],
    },
  ],
});
```

- [ ] **Step 4: Implement no-disable**:

```js
// @ts-check
const ENFORCED =
  /local\/(no-pictographic-text|no-raw-ui-outside-kit|no-lucide-outside-icons|no-disable-enforced)\b/;
const DIRECTIVE =
  /^\s*(eslint-disable(?:-next-line|-line)?|eslint-enable|eslint)(?:\s+([^]*?))?\s*(?:--[^]*)?$/;

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    messages: {
      named:
        'Enforced design-system rules cannot be disabled inline (spec 1A R4).',
      blanket:
        'Blanket eslint-disable comments are not allowed: they would silence enforced rules (spec 1A R4). Name the rule.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const c of context.sourceCode.getAllComments()) {
          const m = DIRECTIVE.exec(c.value);
          if (!m) continue;
          const [, kind, rest] = m;
          if (rest && ENFORCED.test(rest))
            context.report({ loc: c.loc, messageId: 'named' });
          else if (kind.startsWith('eslint-disable') && !rest?.trim())
            context.report({ loc: c.loc, messageId: 'blanket' });
        }
      },
    };
  },
};
```

- [ ] **Step 5: Suppression-proof guard** (`test/no-inline-disable.test.ts`). A blanket `/* eslint-disable */` would also silence `no-disable-enforced`, so this test greps sources directly:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const ENFORCED =
  /local\/(no-pictographic-text|no-raw-ui-outside-kit|no-lucide-outside-icons|no-disable-enforced)/;
const COMMENT = /\/\*([\s\S]*?)\*\/|\/\/([^\n]*)/g;

describe('no inline disables of enforced rules', () => {
  it('src has none, named or blanket', () => {
    const offenders: string[] = [];
    for (const file of walk('src').filter((f) => /\.(ts|tsx)$/.test(f))) {
      for (const m of readFileSync(file, 'utf8').matchAll(COMMENT)) {
        const body = (m[1] ?? m[2] ?? '').trim();
        if (!/^eslint(-disable|-enable)?\b/.test(body)) continue;
        const names = body
          .replace(/^eslint(-disable(-next-line|-line)?|-enable)?/, '')
          .split('--')[0]
          .trim();
        if (
          ENFORCED.test(body) ||
          (/^eslint-disable/.test(body) && names === '')
        )
          offenders.push(`${file}: ${body}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

Run: `pnpm vitest run eslint-rules test/no-inline-disable.test.ts` -> Expected: PASS. The guard test may fail on existing blanket comments (none known at `d7c64bb`: every existing directive names a rule); fix any by naming the rule.

- [ ] **Step 6: Register both rules** in `eslint-rules/index.js` and export `ENFORCED_RULES`. Commit:

```bash
git add eslint-rules test/no-inline-disable.test.ts
git commit -m "feat(lint): no-lucide-outside-icons, no-disable-enforced and a suppression-proof guard test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A1-3: Icon module core (`IconProps`, `fromLucide`, `defineIcon`, lucide re-exports)

**Files:**

- Create: `src/shared/ui/icons/icon.tsx`, `src/shared/ui/icons/lucide.ts`, `src/shared/ui/icons/index.ts`, `src/shared/ui/icons/icons.test.tsx`, `src/shared/ui/icons/__snapshots__/` (generated)

**Interfaces:**

- Produces (spec §4.7):

```ts
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export const ICON_PX: Record<IconSize, number>; // { xs: 12, sm: 14, md: 18, lg: 20, xl: 24 }
export interface IconProps {
  size?: IconSize; // default 'md'
  strokeWidth?: 1.5 | 1.75 | 2; // default 1.75
  label?: string; // absent: aria-hidden="true"; present: role="img" + aria-label
  className?: string;
}
export type IconComponent = ((props: IconProps) => React.JSX.Element) & {
  displayName: string;
};
export function fromLucide(name: string, icon: LucideIcon): IconComponent;
export function defineIcon(
  name: string,
  children: React.ReactNode,
  opts?: { fill?: boolean },
): IconComponent;
```

- Produces: `Icon<Name>` named exports from `@/shared/ui/icons` for every lucide icon the repo uses today plus the spec §4.7 lucide list (undo, redo, search, star, chevrons, arrows, close, menu, highlighter, underline, strikethrough, sticky note, pen, shapes, lock, unlock, download, upload, sun, moon, monitor, check, alert, info).

- [ ] **Step 1: Write `icon.tsx`**

```tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export const ICON_PX: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 20,
  xl: 24,
};

export interface IconProps {
  size?: IconSize;
  strokeWidth?: 1.5 | 1.75 | 2;
  label?: string;
  className?: string;
}
export type IconComponent = ((props: IconProps) => React.JSX.Element) & {
  displayName: string;
};

const a11y = (label?: string) =>
  label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true, focusable: false } as const);

/** Wraps a lucide icon with the kit defaults (size, stroke, currentColor, label handling). */
export function fromLucide(name: string, Lucide: LucideIcon): IconComponent {
  const C = ({
    size = 'md',
    strokeWidth = 1.75,
    label,
    className,
  }: IconProps) => (
    <Lucide
      size={ICON_PX[size]}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth={false}
      className={cn('shrink-0', className)}
      {...a11y(label)}
    />
  );
  C.displayName = name;
  return C as IconComponent;
}

/**
 * Custom icon drawn on lucide's 24px grid: stroke currentColor, round caps
 * and joins, no fill unless `fill` (then fill currentColor, no stroke).
 */
export function defineIcon(
  name: string,
  children: React.ReactNode,
  opts: { fill?: boolean } = {},
): IconComponent {
  const C = ({
    size = 'md',
    strokeWidth = 1.75,
    label,
    className,
  }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={ICON_PX[size]}
      height={ICON_PX[size]}
      viewBox="0 0 24 24"
      fill={opts.fill ? 'currentColor' : 'none'}
      stroke={opts.fill ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      {...a11y(label)}
    >
      {label ? <title>{label}</title> : null}
      {children}
    </svg>
  );
  C.displayName = name;
  return C as IconComponent;
}
```

- [ ] **Step 2: `lucide.ts` (the only `lucide-react` importer besides `icon.tsx`).** Generate the list from the codebase: `git grep -h "from 'lucide-react'" src` lists today's names (about 160 distinct). Add the spec §4.7 names. One line per icon, alphabetical:

```ts
import * as L from 'lucide-react';
import { fromLucide } from './icon';

export const IconAlertCircle = fromLucide('IconAlertCircle', L.AlertCircle);
export const IconArrowRight = fromLucide('IconArrowRight', L.ArrowRight);
export const IconCheck = fromLucide('IconCheck', L.Check);
export const IconChevronDown = fromLucide('IconChevronDown', L.ChevronDown);
export const IconChevronRight = fromLucide('IconChevronRight', L.ChevronRight);
export const IconDownload = fromLucide('IconDownload', L.Download);
export const IconFileText = fromLucide('IconFileText', L.FileText);
export const IconHighlighter = fromLucide('IconHighlighter', L.Highlighter);
export const IconInfo = fromLucide('IconInfo', L.Info);
export const IconLock = fromLucide('IconLock', L.Lock);
export const IconMenu = fromLucide('IconMenu', L.Menu);
export const IconMonitor = fromLucide('IconMonitor', L.Monitor);
export const IconMoon = fromLucide('IconMoon', L.Moon);
export const IconPen = fromLucide('IconPen', L.Pen);
export const IconRedo = fromLucide('IconRedo', L.Redo2);
export const IconSearch = fromLucide('IconSearch', L.Search);
export const IconShapes = fromLucide('IconShapes', L.Shapes);
export const IconStar = fromLucide('IconStar', L.Star);
export const IconStickyNote = fromLucide('IconStickyNote', L.StickyNote);
export const IconStrikethrough = fromLucide(
  'IconStrikethrough',
  L.Strikethrough,
);
export const IconSun = fromLucide('IconSun', L.Sun);
export const IconUnderline = fromLucide('IconUnderline', L.Underline);
export const IconUndo = fromLucide('IconUndo', L.Undo2);
export const IconUnlock = fromLucide('IconUnlock', L.LockOpen);
export const IconUpload = fromLucide('IconUpload', L.Upload);
export const IconX = fromLucide('IconX', L.X);
// ... one line per name found by the grep (named Icon + lucide name; aliases resolved to the canonical lucide export)
```

`import * as L` is tree-shaken by Rolldown because only named members are read. A1-6's report confirms no other module reaches lucide. Filled star: `IconStarFilled = defineIcon('IconStarFilled', <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />, { fill: true })` in `custom/brand.tsx` (A1-4) — lucide has no filled variant.

- [ ] **Step 3: Barrel `index.ts`**

```ts
export {
  ICON_PX,
  defineIcon,
  fromLucide,
  type IconComponent,
  type IconProps,
  type IconSize,
} from './icon';
export * from './lucide';
export * from './custom/brand';
export * from './custom/keys';
export * from './custom/layout';
// later Parts append one line per group: modes, organize, edit, annotate, fill-sign, redact, ocr, optimize, signing
```

(`custom/*` files land in A1-4; create empty modules now if splitting commits.)

- [ ] **Step 4: Failing component test** (`icons.test.tsx`, jsdom):

```tsx
/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as Icons from './index';

const entries = Object.entries(Icons).filter(
  ([k, v]) => /^(Icon|Key|Logo)/.test(k) && typeof v === 'function',
) as [string, Icons.IconComponent][];

describe('icon module', () => {
  it('every icon renders an svg, aria-hidden without a label', () => {
    for (const [name, Icon] of entries) {
      const { container, unmount } = render(<Icon />);
      const svg = container.querySelector('svg');
      expect(svg, name).not.toBeNull();
      expect(svg!.getAttribute('aria-hidden'), name).toBe('true');
      expect(svg!.getAttribute('role'), name).toBeNull();
      unmount();
    }
  });
  it('with a label: role=img and an accessible name', () => {
    for (const [name, Icon] of entries) {
      const { getByRole, unmount } = render(<Icon label={`L ${name}`} />);
      expect(getByRole('img', { name: `L ${name}` })).toBeTruthy();
      unmount();
    }
  });
  it('honours size and stroke width', () => {
    const { container } = render(<Icons.IconStar size="xl" strokeWidth={2} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('stroke-width')).toBe('2');
  });
  it('the icon name list changes only deliberately', () => {
    expect(entries.map(([n]) => n).sort()).toMatchSnapshot();
  });
  it('displayName equals the export name', () => {
    for (const [name, Icon] of entries) expect(Icon.displayName).toBe(name);
  });
});
```

Run: `pnpm vitest run src/shared/ui/icons` -> Expected: PASS after Steps 1-3 (snapshot written on first run; commit it).

- [ ] **Step 5: Commit** — `feat(icons): icon module with fromLucide/defineIcon wrappers and lucide re-exports`.

### Task A1-4: Custom brand, key and layout icons; `Logo`, `LogoMark`; favicon

**Files:**

- Create: `src/shared/ui/icons/custom/brand.tsx`, `custom/keys.tsx`, `custom/layout.tsx`, `src/shared/ui/icons/brand/Logo.tsx`, `src/shared/ui/icons/brand/logo-paths.ts` (generated), `scripts/gen-logo.ts`, `scripts/gen-favicon.tsx`, `public/favicon.svg` (generated), `src/shared/ui/icons/brand/logo.test.tsx`
- Modify: `index.html` (favicon link), `package.json` (`"icons:gen": "tsx scripts/gen-logo.ts && tsx scripts/gen-favicon.tsx"`)

**Interfaces:**

- Produces: `Logo({ variant?: 'full' | 'mono'; animateCaret?: boolean; className?: string; label?: string })` (default label "tools home"), `LogoMark({ size?: IconSize; className?: string; label?: string })`, `KeyCommand, KeyShift, KeyOption, KeyControl, KeyEnter, KeyBackspace, KeyTab, KeyEscape, KeyArrowUp, KeyArrowDown, KeyArrowLeft, KeyArrowRight`, `IconLayoutStandard, IconLayoutFocus, IconDock, IconRailToggle, IconInspectorToggle, IconZoomFitWidth, IconZoomFitPage`, `IconStarFilled`, optionally `IconCategoryEncoding`, `IconCategoryWebDev`.

- [ ] **Step 1: `scripts/gen-logo.ts`** converts `~/tools` into outlines with fontkit, so the wordmark is SVG paths, never text:

```ts
import { readFile, writeFile } from 'node:fs/promises';
import fontkit from '@pdf-lib/fontkit';

// JetBrains Mono (OFL) from the self-hosted package; fontkit reads WOFF2.
const file =
  'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2';
const font = fontkit.create(new Uint8Array(await readFile(file)));
const text = '~/tools';
const run = font.layout(text);
const upm = font.unitsPerEm;
const SIZE = 24; // px at viewBox scale
const s = SIZE / upm;
let x = 0;
const paths: string[] = [];
for (let i = 0; i < run.glyphs.length; i++) {
  const g = run.glyphs[i];
  // Flip y: font units are y-up, SVG is y-down; baseline at y = ascent.
  const path = g.path.scale(s, -s).translate(x, font.ascent * s);
  paths.push(path.toSVG());
  x += run.positions[i].xAdvance * s;
}
const width = Math.ceil(x);
const height = Math.ceil((font.ascent - font.descent) * s);
const caretX = width + 2;
await writeFile(
  'src/shared/ui/icons/brand/logo-paths.ts',
  `// Generated by scripts/gen-logo.ts from JetBrains Mono (OFL). Do not edit.
export const LOGO_GLYPHS = ${JSON.stringify(paths.join(' '))};
export const LOGO_WIDTH = ${width};
export const LOGO_HEIGHT = ${height};
export const CARET = { x: ${caretX}, y: ${Math.round(font.ascent * s * 0.22)}, width: ${Math.round(SIZE * 0.42)}, height: ${Math.round(font.ascent * s * 0.8)} };
`,
);
```

Executor: confirm the exact WOFF2 file name under `node_modules/@fontsource-variable/jetbrains-mono/files/` (A1-7 installs the package; do A1-7 Step 1 first if needed). fontkit applies the variable font's default instance (wght 400); pass `font.getVariation({ wght: 450 })` to match the spec's mono weight 450.

- [ ] **Step 2: `Logo.tsx`**

```tsx
import { cn } from '@/shared/lib/cn';
import { ICON_PX, type IconSize } from '../icon';
import { CARET, LOGO_GLYPHS, LOGO_HEIGHT, LOGO_WIDTH } from './logo-paths';

interface LogoProps {
  variant?: 'full' | 'mono';
  /** Blink the caret three times (only when motion is allowed). */
  animateCaret?: boolean;
  label?: string;
  className?: string;
}

/** The ~/tools wordmark as outlines with a mint block caret (spec §4.3). */
export function Logo({
  variant = 'full',
  animateCaret = true,
  label = 'tools home',
  className,
}: LogoProps) {
  const vbWidth = CARET.x + CARET.width;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vbWidth} ${LOGO_HEIGHT}`}
      className={cn('h-5 w-auto', className)}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path d={LOGO_GLYPHS} fill="currentColor" />
      <rect
        x={CARET.x}
        y={CARET.y}
        width={CARET.width}
        height={CARET.height}
        rx={1}
        className={cn(
          variant === 'mono' ? 'fill-current' : 'fill-accent',
          animateCaret && 'motion-safe:animate-caret-3',
        )}
      />
    </svg>
  );
}
Logo.displayName = 'Logo';

/** Caret tile for favicon, app icon and OG image. */
export function LogoMark({
  size = 'xl',
  label,
  className,
}: {
  size?: IconSize;
  label?: string;
  className?: string;
}) {
  const px = ICON_PX[size];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={className}
      {...(label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true })}
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        className="fill-[var(--logo-tile,#0c0e12)]"
      />
      <rect x="13" y="6" width="5" height="12" rx="1" className="fill-accent" />
      <path
        d="M6 9l3 3-3 3"
        fill="none"
        stroke="#e8ebf0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
LogoMark.displayName = 'LogoMark';
```

`animate-caret-3` is defined in `tokens.css` (A1-7): `--animate-caret-3: caret-blink 1.1s step-end 3;`. `motion-safe:` keeps it static under reduced motion.

- [ ] **Step 3: Keys** (`custom/keys.tsx`). Each is a `defineIcon` on the 24 grid:

```tsx
import { defineIcon } from '../icon';

export const KeyCommand = defineIcon(
  'KeyCommand',
  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />,
);
export const KeyShift = defineIcon(
  'KeyShift',
  <path d="M9 18v-6H5l7-7 7 7h-4v6z" />,
);
export const KeyOption = defineIcon(
  'KeyOption',
  <path d="M3 6h5l7 12h6M15 6h6" />,
);
export const KeyControl = defineIcon('KeyControl', <path d="M6 13l6-6 6 6" />);
export const KeyEnter = defineIcon(
  'KeyEnter',
  <>
    <path d="M20 5v7a3 3 0 0 1-3 3H5" />
    <path d="M9 11l-4 4 4 4" />
  </>,
);
export const KeyBackspace = defineIcon(
  'KeyBackspace',
  <>
    <path d="M21 5H9l-6 7 6 7h12z" />
    <path d="M17 9l-6 6M11 9l6 6" />
  </>,
);
export const KeyTab = defineIcon(
  'KeyTab',
  <>
    <path d="M3 12h14" />
    <path d="M13 8l4 4-4 4" />
    <path d="M21 6v12" />
  </>,
);
export const KeyEscape = defineIcon(
  'KeyEscape',
  <>
    <path d="M9 4H4v5" />
    <path d="M4 4l7 7" />
    <path d="M14 5a7 7 0 1 1-9 9" />
  </>,
);
export const KeyArrowUp = defineIcon(
  'KeyArrowUp',
  <path d="M12 19V5M6 11l6-6 6 6" />,
);
export const KeyArrowDown = defineIcon(
  'KeyArrowDown',
  <path d="M12 5v14M6 13l6 6 6-6" />,
);
export const KeyArrowLeft = defineIcon(
  'KeyArrowLeft',
  <path d="M19 12H5M11 6l-6 6 6 6" />,
);
export const KeyArrowRight = defineIcon(
  'KeyArrowRight',
  <path d="M5 12h14M13 6l6 6-6 6" />,
);
```

- [ ] **Step 4: Layout icons** (`custom/layout.tsx`):

```tsx
export const IconLayoutStandard = defineIcon(
  'IconLayoutStandard',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 9v11M17 9v11" />
  </>,
);
export const IconLayoutFocus = defineIcon(
  'IconLayoutFocus',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <rect x="8" y="16" width="8" height="2" rx="1" />
    <path d="M5 8v4" />
  </>,
);
export const IconDock = defineIcon(
  'IconDock',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <rect x="6" y="15" width="12" height="3" rx="1.5" />
  </>,
);
export const IconRailToggle = defineIcon(
  'IconRailToggle',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
    <path d="M5.5 8h1.5M5.5 11h1.5M5.5 14h1.5" />
  </>,
);
export const IconInspectorToggle = defineIcon(
  'IconInspectorToggle',
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M15 4v16" />
    <path d="M17 8h2M17 11h2" />
  </>,
);
export const IconZoomFitWidth = defineIcon(
  'IconZoomFitWidth',
  <>
    <rect x="6" y="3" width="12" height="18" rx="1.5" />
    <path d="M2 12h4M18 12h4M4 10l-2 2 2 2M20 10l2 2-2 2" />
  </>,
);
export const IconZoomFitPage = defineIcon(
  'IconZoomFitPage',
  <>
    <rect x="7" y="5" width="10" height="14" rx="1.5" />
    <path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4" />
  </>,
);
```

`custom/brand.tsx` exports `Logo`, `LogoMark` (re-exported from `../brand/Logo`) and `IconStarFilled` (A1-3 Step 2). Category icons are lucide-backed (`IconBinary` for encoding, `IconGlobe` for web) unless A2-1's review finds them ambiguous; then add `IconCategoryEncoding`/`IconCategoryWebDev` here with the same pattern.

- [ ] **Step 5: Favicon generation** (`scripts/gen-favicon.tsx`):

```tsx
import { writeFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoMark } from '../src/shared/ui/icons/brand/Logo';

// Static file: replace token classes with literal values (no CSS available).
const svg = renderToStaticMarkup(<LogoMark size="xl" />)
  .replace('class="fill-[var(--logo-tile,#0c0e12)]"', 'fill="#0c0e12"')
  .replace('class="fill-accent"', 'fill="#3ddc97"');
await writeFile('public/favicon.svg', svg);
```

`index.html`: `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`; delete `public/vite2.webp` if nothing else references it (`git grep vite2`).

- [ ] **Step 6: Tests** (`logo.test.tsx`, jsdom): `Logo` renders `role="img"` named "tools home"; it contains no `<text>` element (`container.querySelector('text')` is null); `LogoMark` without label is `aria-hidden`; `public/favicon.svg` equals a fresh render (run the same transform in the test and compare to `readFileSync('public/favicon.svg', 'utf8')`). The icon-module test from A1-3 now also covers keys/layout/brand.

Run: `pnpm icons:gen && pnpm vitest run src/shared/ui/icons` -> Expected: PASS; update the icon-name snapshot deliberately (`-u`) and review the diff lists only the new names.

- [ ] **Step 7: Commit** — `feat(icons): Logo and LogoMark as outlines, key and layout icons, generated favicon`.

### Task A1-5: Migrate every lucide import and glyph literal; enable rules (a), (c), no-disable

**Files:**

- Modify: every file under `src/` that imports `lucide-react` (105 files at `d7c64bb`; `git grep -l "lucide-react" src`), `src/app/tool.ts` (`icon: IconComponent`), every glyph hit (list below), `eslint.config.js`, `package.json` (`"lint": "eslint . --max-warnings 0 --report-unused-disable-directives"`)

**Interfaces:**

- Consumes: `@/shared/ui/icons` names from A1-3/A1-4.
- Produces: `ToolDefinition.icon: IconComponent` (from `@/shared/ui/icons`), all manifests typed against it.

- [ ] **Step 1: Mechanical import rewrite.** For each file: replace `import { A, B as C } from 'lucide-react'` with `import { IconA, IconB } from '@/shared/ui/icons'` and rename JSX usages `<A ... />` to `<IconA ... />`. Map lucide `size={16}` to `size="sm"` (12->xs, 14->sm, 16->sm, 18->md, 20->lg, 24->xl; any other number goes to the nearest step and is reported), drop `strokeWidth` values not in {1.5, 1.75, 2} (use 1.75), keep `className`. Where an icon was passed as a component prop (`icon={FileText}`), pass `IconFileText`. If a lucide name is missing from `lucide.ts`, add it there (alphabetical) in this step.
- [ ] **Step 2: Types.** `src/app/tool.ts`: `import type { IconComponent } from '@/shared/ui/icons'`; `icon: IconComponent`. Run `pnpm typecheck` and fix props (`size`, `color` is not supported: use a text colour class).
- [ ] **Step 3: Glyph literals (fix, never exempt).** Known hits at `d7c64bb` and their fixes:

| File                                                                                                                     | Hit                        | Fix                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/app/Footer.tsx`                                                                                                     | copyright sign             | text "Copyright {year} {AUTHOR}" (G3)                                                                                         |
| `src/shared/ui/list.tsx`                                                                                                 | angle marker in `ListItem` | `<StatusDot tone="accent" decorative />` (A1-10) or `<IconChevronRight size="xs" />`; use the icon now, StatusDot after A1-10 |
| `src/tools/csv-viewer` sort indicator                                                                                    | up/down arrows             | `IconArrowUp`/`IconArrowDown` with `label` "Sorted ascending"/"Sorted descending"                                             |
| `src/tools/log-parser` "Filters" bullet                                                                                  | bullet                     | `<StatusDot tone="accent" label="Filters active" />` (A1-10) or `<Badge>Active</Badge>` now                                   |
| `src/tools/password-generator` masked password                                                                           | bullet repeat              | mask with `'*'.repeat(n)` and `aria-label="Password hidden"`; ASCII asterisk is not banned                                    |
| `src/tools/pdf-compressor` size change                                                                                   | arrow between sizes        | "{before} to {after}"                                                                                                         |
| `src/tools/qr-code-generator` tips lists                                                                                 | bullets                    | kit `List`/`ListItem` (marker is a kit element)                                                                               |
| `src/tools/unit-converter` swap arrow                                                                                    | arrow                      | `IconArrowRight` with `label="converts to"`                                                                                   |
| tests in `src` (`useSortableList.test.ts`, `inventory.test.ts`, `download.test.ts`, `format.test.ts`, `session.test.ts`) | arrows in test names       | the word "to"                                                                                                                 |
| `src/pdf/edit/fonts.test.ts`, `src/tools/pdf-to-text/lib/output.test.ts`                                                 | emoji literals             | `String.fromCodePoint(0x1f642)` / `String.fromCodePoint(0x1f600)`                                                             |

Then run `pnpm exec eslint src` after Step 4 to find any remaining hit (P4-E may have moved code).

- [ ] **Step 4: Wire the plugin** in `eslint.config.js`:

```js
import local from './eslint-rules/index.js';
// ...
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { local },
    rules: {
      'local/no-pictographic-text': 'error',
      'local/no-lucide-outside-icons': 'error',
      'local/no-disable-enforced': 'error',
    },
  },
  {
    files: ['eslint-rules/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
```

`linterOptions: { reportUnusedDisableDirectives: 'error' }` in the first config object. `package.json` lint script as listed in Files.

- [ ] **Step 5: Verify.** `pnpm lint` -> 0 problems. `pnpm typecheck` -> 0. `pnpm test` -> all pass. `pnpm build` -> success.
- [ ] **Step 6: Commit** — `refactor(icons): every icon from @/shared/ui/icons; glyph literals replaced; rules (a), (c) at error`.

### Task A1-6: Built-asset glyph scan and lucide import-graph check

**Files:**

- Create: `scripts/vite-glyph-report.ts`, `test/dist-glyphs.test.ts`
- Modify: `vite.config.ts` (add plugin), `.github/workflows/ci.yml` (Build before Unit tests is already the order; keep it)

**Interfaces:**

- Produces: `glyphReport(): Plugin` writing `node_modules/.tmp/glyph-report.json`:

```ts
interface GlyphReport {
  root: string;
  appHits: { module: string; offset: number; codePoint: string }[];
  lucideImporters: string[]; // module ids (relative) that import lucide-react directly
  builtAt: string;
}
```

- [ ] **Step 1: Plugin**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { Plugin } from 'vite';
import { findBanned, hex } from '../eslint-rules/banned-glyphs.js';

/**
 * Records banned glyphs in app-owned module output (after every transform,
 * so JSX and TS are compiled) and which modules import lucide-react. The
 * report lives outside dist, so nothing extra is deployed (decision G9).
 */
export function glyphReport(): Plugin {
  let root = '';
  const appHits: { module: string; offset: number; codePoint: string }[] = [];
  const lucideImporters = new Set<string>();
  const isApp = (id: string) =>
    id.replace(/\\/g, '/').includes('/src/') && !id.includes('node_modules');
  return {
    name: 'glyph-report',
    enforce: 'post',
    apply: 'build',
    configResolved(c) {
      root = c.root;
    },
    transform(code, id) {
      if (!isApp(id) || id.includes('?')) return null;
      // Strip comments cheaply: they are not product text (spec 1A.1).
      const stripped = code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      let rest = stripped;
      let base = 0;
      for (let hit = findBanned(rest); hit; hit = findBanned(rest)) {
        appHits.push({
          module: relative(root, id),
          offset: base + hit.index,
          codePoint: hex(hit.codePoint),
        });
        base += hit.index + 1;
        rest = stripped.slice(base);
      }
      return null;
    },
    moduleParsed(info) {
      if (
        info.importedIds.some((d) =>
          /node_modules[\\/]lucide-react[\\/]/.test(d),
        )
      )
        lucideImporters.add(relative(root, info.id).replace(/\\/g, '/'));
    },
    closeBundle() {
      mkdirSync(`${root}/node_modules/.tmp`, { recursive: true });
      writeFileSync(
        `${root}/node_modules/.tmp/glyph-report.json`,
        JSON.stringify(
          {
            root,
            appHits,
            lucideImporters: [...lucideImporters].sort(),
            builtAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    },
  };
}
```

`vite.config.ts`: `plugins: [react(), tailwindcss(), cloudflare(), glyphReport()]`. Executor: confirm Vite 8 (Rolldown) calls `moduleParsed` with `importedIds`; if it does not, record importers in `resolveId(source, importer)` when `source` starts with `lucide-react`.

- [ ] **Step 2: Test** (`test/dist-glyphs.test.ts`):

```ts
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EMOJI_ONLY_RE,
  findBanned,
  hex,
} from '../eslint-rules/banned-glyphs.js';

const DIST = 'dist';
const REPORT = 'node_modules/.tmp/glyph-report.json';
const built =
  existsSync(join(DIST, 'index.html')) ||
  existsSync(join(DIST, 'client', 'index.html'));
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) =>
    statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
  );

describe.skipIf(!built && !process.env.CI)('built assets (spec 1A.2)', () => {
  it('a build exists in CI', () => expect(built).toBe(true));

  const files = built
    ? walk(DIST).filter((f) => /\.(js|css|html|json|svg)$/.test(f))
    : [];

  it('no emoji, FE0F or regional indicators in any chunk (vendor included)', () => {
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      const m = EMOJI_ONLY_RE.exec(text);
      if (m)
        hits.push(
          `${f} @${m.index} ${hex(m[0].codePointAt(0)!)} ${JSON.stringify(text.slice(Math.max(0, m.index - 40), m.index + 40))}`,
        );
    }
    expect(hits).toEqual([]);
  });

  it('no rule-(a) glyph in CSS or HTML (app-owned)', () => {
    const hits: string[] = [];
    for (const f of files.filter((x) => /\.(css|html|svg)$/.test(x))) {
      const hit = findBanned(readFileSync(f, 'utf8'));
      if (hit) hits.push(`${f} @${hit.index} ${hex(hit.codePoint)}`);
    }
    expect(hits).toEqual([]);
  });

  it('no rule-(a) glyph in app module output (Vite report)', () => {
    const report = JSON.parse(readFileSync(REPORT, 'utf8'));
    expect(report.appHits).toEqual([]);
  });

  it('lucide-react is reached only from src/shared/ui/icons', () => {
    const report = JSON.parse(readFileSync(REPORT, 'utf8'));
    expect(
      report.lucideImporters.filter(
        (m: string) => !m.startsWith('src/shared/ui/icons/'),
      ),
    ).toEqual([]);
    expect(report.lucideImporters.length).toBeGreaterThan(0);
  });
});
```

CSS `content:` values and fontsource `unicode-range` text are plain ASCII (`U+2190-21FF`), so they do not match. A vendor hit is fixed by replacing or wrapping the dependency (spec 1A.2), never by an exemption; report any to the controller.

- [ ] **Step 3: Negative path.** Extract the comment-stripping + scanning loop into `export function scanModuleText(code: string): { offset: number; codePoint: string }[]` in the plugin file and unit-test it in `test/vite-glyph-report.test.ts`: a code string built as `` `const a = "${String.fromCodePoint(0x2192)}";` `` yields one hit `U+2192`; the same character inside `/* ... */` or after `//` yields none. Also assert in `dist-glyphs.test.ts` that no built file contains the string `__kit` (A1-15 dev-only gallery).
- [ ] **Step 4: Run** `pnpm build && pnpm vitest run test/dist-glyphs.test.ts test/vite-glyph-report.test.ts` -> Expected: PASS.
- [ ] **Step 5: Commit** — `test(build): dist glyph scan and lucide import-graph check over the production build`.

### Task A1-7: Design tokens, theme bootstrap, fonts, contrast test

**Files:**

- Create: `src/theme/tokens.css`, `public/theme-init.js`, `src/shared/lib/theme.ts`, `src/shared/lib/theme.test.ts`, `test/tokens.contrast.test.ts`, `src/shared/lib/platform.ts`
- Modify: `src/main.tsx` (import `./theme/tokens.css` instead of `./theme/terminal.css`), `index.html`, `package.json` (add `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`)
- Keep: `src/theme/terminal.css` file content moved: its `bg-terminal-grid` utility (P4-D) is re-expressed in tokens (below); `terminal.css` is deleted in A2-4 with its last importer

**Interfaces:**

- Produces CSS variables (spec §4.2-4.4) on `:root[data-theme=light|dark]` and Tailwind utilities `bg-canvas bg-surface bg-surface-2 bg-surface-3 bg-backdrop border-line border-line-strong text-fg text-fg-muted text-fg-subtle bg-accent text-accent-ink text-accent-fg bg-accent-soft ring-focus text-danger bg-danger-soft text-warning bg-warning-soft text-info bg-info-soft border-redact`, radii `rounded-sm/md/lg/xl`, shadows `shadow-e1/e2/e3/page`, z-index utilities `z-rail z-toolbar z-dock z-popover z-dialog z-toast z-palette`, durations `duration-fast/base/slow`, `ease-out-soft`, breakpoints `sm md lg xl` (640/900/1200/1600), fonts `font-sans font-mono`, type scale `text-xs..text-3xl`.
- Produces `theme.ts`:

```ts
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export const THEME_KEY = 'tools:theme';
export function readThemePreference(): ThemePreference;
export function writeThemePreference(p: ThemePreference): void; // persists, applies, notifies
export function resolveTheme(
  p: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme;
export function applyTheme(t: ResolvedTheme): void; // sets documentElement.dataset.theme and color-scheme
export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference(p: ThemePreference): void;
};
```

- Produces `platform.ts`: `export const isMac: () => boolean` (`navigator.userAgentData?.platform ?? navigator.platform` matches /mac/i), `export const prefersReducedMotion: () => boolean`.

- [ ] **Step 1: Install fonts** — `pnpm add @fontsource-variable/inter @fontsource-variable/jetbrains-mono`. Report both OFL licenses.
- [ ] **Step 2: `tokens.css`** (full file):

```css
@import 'tailwindcss';
@import '@fontsource-variable/inter';
@import '@fontsource-variable/jetbrains-mono';

@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

/* Spec §4.2. Light is the default before the bootstrap script runs. */
:root,
:root[data-theme='light'] {
  color-scheme: light;
  --canvas: #f6f7f9;
  --surface: #ffffff;
  --surface-2: #f1f3f6;
  --surface-3: #e7eaef;
  --backdrop: #e4e7ec;
  --line: #e0e4ea;
  --line-strong: #cbd2dc;
  --fg: #0f1419;
  --fg-muted: #4a5363;
  --fg-subtle: #687182;
  --accent: #3ddc97;
  --accent-ink: #04140c;
  --accent-fg: #0b7f53;
  --accent-soft: #3ddc9726;
  --focus: #0b7f53;
  --danger: #c62828;
  --danger-soft: #c628281a;
  --warning: #a15c00;
  --warning-soft: #a15c001a;
  --info: #1d5fc4;
  --info-soft: #1d5fc41a;
  --redact: #dc2626;
  --shadow-e1: 0 0 0 1px var(--line), 0 1px 2px #0f14190f;
  --shadow-e2: 0 4px 12px #0f14191a, 0 0 0 1px var(--line);
  --shadow-e3: 0 12px 32px #0f141924, 0 0 0 1px var(--line);
  --shadow-page: 0 1px 3px #0f14191f, 0 0 0 1px #0f14190d;
}

:root[data-theme='dark'] {
  color-scheme: dark;
  --canvas: #0c0e12;
  --surface: #12151b;
  --surface-2: #171b22;
  --surface-3: #1e232c;
  --backdrop: #08090c;
  --line: #232934;
  --line-strong: #2f3643;
  --fg: #e8ebf0;
  --fg-muted: #a3abba;
  --fg-subtle: #7f8898;
  --accent: #3ddc97;
  --accent-ink: #04140c;
  --accent-fg: #3ddc97;
  --accent-soft: #3ddc971f;
  --focus: #3ddc97;
  --danger: #f87171;
  --danger-soft: #f871711f;
  --warning: #fbbf24;
  --warning-soft: #fbbf241f;
  --info: #60a5fa;
  --info-soft: #60a5fa1f;
  --redact: #ef4444;
  --shadow-e1: 0 0 0 1px var(--line), 0 1px 2px #00000040;
  --shadow-e2: 0 4px 12px #00000059, 0 0 0 1px var(--line);
  --shadow-e3: 0 12px 32px #00000073, 0 0 0 1px var(--line);
  --shadow-page: 0 1px 3px #00000080, 0 0 0 1px var(--line);
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-backdrop: var(--backdrop);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-accent: var(--accent);
  --color-accent-ink: var(--accent-ink);
  --color-accent-fg: var(--accent-fg);
  --color-accent-soft: var(--accent-soft);
  --color-focus: var(--focus);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-redact: var(--redact);
  /* Legacy aliases (decision G20): removed in A2-12 after the codemod. */
  --color-surface-subtle: var(--surface-2);
  --color-surface-strong: var(--surface-3);
  --color-accent-hover: var(--accent);
  --color-accent-dim: var(--accent-soft);
  --color-danger-dim: var(--danger-soft);
  --color-success: var(--accent-fg);
  --color-fg-faint: var(--fg-subtle);

  --shadow-e1: var(--shadow-e1);
  --shadow-e2: var(--shadow-e2);
  --shadow-e3: var(--shadow-e3);
  --shadow-page: var(--shadow-page);
}

@theme {
  --font-sans:
    'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
    Roboto, sans-serif;
  --font-mono:
    'JetBrains Mono Variable', ui-monospace, 'SF Mono', Menlo, Consolas,
    monospace;

  --text-xs: 12px;
  --text-xs--line-height: 16px;
  --text-sm: 13px;
  --text-sm--line-height: 18px;
  --text-base: 14px;
  --text-base--line-height: 20px;
  --text-md: 16px;
  --text-md--line-height: 24px;
  --text-lg: 18px;
  --text-lg--line-height: 26px;
  --text-xl: 22px;
  --text-xl--line-height: 28px;
  --text-2xl: 28px;
  --text-2xl--line-height: 34px;
  --text-3xl: 36px;
  --text-3xl--line-height: 42px;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-xl: 14px;

  --breakpoint-sm: 640px;
  --breakpoint-md: 900px;
  --breakpoint-lg: 1200px;
  --breakpoint-xl: 1600px;

  --ease-out-soft: cubic-bezier(0.2, 0.8, 0.2, 1);
  --animate-caret-3: caret-blink 1.1s step-end 3;
}

@utility duration-fast {
  transition-duration: 120ms;
}
@utility duration-base {
  transition-duration: 180ms;
}
@utility duration-slow {
  transition-duration: 260ms;
}
@utility z-rail {
  z-index: 10;
}
@utility z-toolbar {
  z-index: 20;
}
@utility z-dock {
  z-index: 30;
}
@utility z-popover {
  z-index: 40;
}
@utility z-dialog {
  z-index: 50;
}
@utility z-toast {
  z-index: 60;
}
@utility z-palette {
  z-index: 70;
}
@utility font-mono-meta {
  font-family: var(--font-mono);
  font-variation-settings: 'wght' 450;
}

@keyframes caret-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@layer base {
  html,
  body {
    background-color: var(--canvas);
    color: var(--fg);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 20px;
    -webkit-font-smoothing: antialiased;
  }
  ::selection {
    background: var(--accent);
    color: var(--accent-ink);
  }
  :focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  @media (forced-colors: active) {
    :focus-visible {
      outline-color: Highlight;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 80ms !important;
      transition-property:
        opacity, color, background-color, border-color !important;
      scroll-behavior: auto !important;
    }
  }
}

/* P4-D's backdrop utility, re-expressed on the new tokens. */
@utility bg-terminal-grid {
  background-color: var(--canvas);
  background-image:
    radial-gradient(
      60% 100% at 50% 0%,
      color-mix(in oklab, var(--accent) 8%, transparent),
      transparent 70%
    ),
    linear-gradient(
      to right,
      color-mix(in oklab, var(--fg) 4%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in oklab, var(--fg) 4%, transparent) 1px,
      transparent 1px
    );
  background-size:
    100% 20rem,
    32px 32px,
    32px 32px;
  background-repeat: no-repeat, repeat, repeat;
}
```

Executor: Tailwind v4 accepts `--text-*--line-height`; confirm the generated `text-sm` emits 13px/18px (inspect `dist/assets/*.css`).

- [ ] **Step 3: `public/theme-init.js`** (decision G10), loaded in `<head>` before the module script: `<script src="/theme-init.js"></script>`:

```js
(function () {
  var pref = 'system';
  try {
    var raw = localStorage.getItem('tools:theme');
    if (raw === 'light' || raw === 'dark' || raw === 'system') pref = raw;
  } catch (e) {}
  var dark =
    pref === 'dark' ||
    (pref === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
```

- [ ] **Step 4: `theme.ts`** implements the interface above with a module-level listener set; `useTheme` uses `useSyncExternalStore(subscribe, getSnapshot)` where the snapshot is `${preference}:${resolved}` and subscribes to `matchMedia('(prefers-color-scheme: dark)')` change events when preference is `system`. Storage failures (private mode) keep the in-memory preference and never throw.
- [ ] **Step 5: Tests.** `theme.test.ts` (jsdom): `resolveTheme` table (3 prefs x 2 media states); `writeThemePreference('dark')` sets `data-theme="dark"` and `localStorage['tools:theme'] === 'dark'`; a throwing `localStorage` (stub `Storage.prototype.setItem` to throw) still applies the theme. `test/tokens.contrast.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/theme/tokens.css', 'utf8');
function block(selector: RegExp): Record<string, string> {
  const m = selector.exec(css);
  if (!m) throw new Error(`no block ${selector}`);
  const body = css.slice(m.index + m[0].length, css.indexOf('}', m.index));
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)].map((x) => [
      x[1],
      x[2],
    ]),
  );
}
const lin = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) =>
    lin(parseInt(hex.slice(i, i + 2), 16) / 255),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const themes = {
  light: block(/:root,\s*:root\[data-theme='light'\]\s*\{/),
  dark: block(/:root\[data-theme='dark'\]\s*\{/),
};
// [foreground, background, minimum] — every pair used for text (spec §4.2).
const PAIRS: [string, string, number][] = [
  ['fg', 'canvas', 7],
  ['fg', 'surface', 7],
  ['fg', 'surface-2', 7],
  ['fg', 'surface-3', 7],
  ['fg-muted', 'surface', 7],
  ['fg-muted', 'canvas', 4.5],
  ['fg-muted', 'surface-2', 4.5],
  ['fg-subtle', 'surface', 4.5],
  ['fg-subtle', 'canvas', 4.5],
  ['accent-ink', 'accent', 10],
  ['accent-fg', 'surface', 4.5],
  ['accent-fg', 'canvas', 4.5],
  ['accent-fg', 'surface-2', 4.5],
  ['danger', 'surface', 4.5],
  ['warning', 'surface', 4.5],
  ['info', 'surface', 4.5],
];
describe.each(Object.entries(themes))('%s theme contrast', (_name, t) => {
  it.each(PAIRS)('%s on %s >= %d', (fg, bg, min) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });
});
```

If a spec pair fails (light `accent-fg` on `surface-2` is close to 4.5), stop and report to the controller with the measured ratio and the minimal darker value that passes; do not lower the threshold.

- [ ] **Step 6: Switch the app.** `src/main.tsx` imports `./theme/tokens.css` (drop `terminal.css` import; leave the file for A2-4 to delete). The Toaster in `App.tsx` stays until A1-13. Run `pnpm dev` briefly, check `/` renders in both themes by toggling `localStorage['tools:theme']`, stop the server.
- [ ] **Step 7: Commit** — `feat(theme): Refined terminal tokens for light and dark, theme bootstrap, self-hosted Inter and JetBrains Mono, contrast tests`.

### Task A1-8: Restyle existing kit primitives; Button variants; Tooltip shortcut

**Files:**

- Modify: every file in `src/shared/ui/*.tsx` listed in spec §4.5 (Button, IconButton, Card, Badge, Alert, Input, Select, Tabs, Dialog, Drawer, DropdownMenu, Tooltip, Switch/Checkbox/Slider, Table, FileUpload, EmptyState, typography, layout, list, spinner, accordion, search-input, textarea, stat, button-group, controls), `src/shared/ui/button-variants.ts` (from P4-D)
- Create: `src/shared/ui/button.test.tsx`, `src/shared/ui/tooltip.test.tsx`

**Interfaces:**

- Produces: `ButtonProps.variant: 'primary' | 'secondary' | 'ghost' | 'danger'` plus deprecated aliases `'solid'` (= primary), `'soft'` and `'outline'` (= secondary) until A2-12 (G20); `size: 'sm' | 'md' | 'lg'` plus alias `'xs'` (= sm) until A2-12; `TooltipProps.shortcut?: string` (hotkey string, rendered with `ShortcutHint` from A1-9).
- Rule for this task: classes use only the A1-7 token utilities; no hex, no `zinc-*`/`gray-*` palette classes.

- [ ] **Step 1: Button variants** (`button-variants.ts`):

```ts
import { cva } from 'class-variance-authority';

const primary =
  'bg-accent text-accent-ink hover:brightness-95 active:brightness-90';
const secondary =
  'border border-line-strong bg-surface text-fg hover:bg-surface-2 active:bg-surface-3';
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[background-color,border-color,color,filter] duration-fast ease-out-soft disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
  {
    variants: {
      variant: {
        primary,
        secondary,
        ghost:
          'text-fg-muted hover:bg-surface-2 hover:text-fg active:bg-surface-3',
        danger:
          'border border-danger/40 bg-danger-soft text-danger hover:border-danger/70',
        solid: primary,
        soft: secondary,
        outline: secondary,
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-base',
        lg: 'h-11 px-5 text-md',
        xs: 'h-8 px-3 text-sm',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'secondary', size: 'md', fullWidth: false },
  },
);
```

`IconButton` keeps its API (`aria-label` required, `icon: IconComponent | ReactNode`) with `size` mapping sm 32px, md 36px, lg 44px (touch target).

- [ ] **Step 2: Restyle each primitive** with this mapping (old -> new): `bg-surface-subtle` -> `bg-surface-2`; `bg-surface-strong` -> `bg-surface-3`; `border-line-strong` stays; `text-success` -> `text-accent-fg`; `bg-danger-dim` -> `bg-danger-soft`; `shadow-lg/2xl` -> `shadow-e2/e3`; `rounded` on cards -> `rounded-lg`, dialogs -> `rounded-xl`; dialog `z-[100]` -> `z-dialog`; tooltip `z-50` -> `z-popover`. `Dialog` overlay `bg-canvas/80` stays (token-based). Card: `bg-surface shadow-e1 rounded-lg`. Badge: `rounded-sm font-mono-meta text-xs`. Inputs: `h-9 rounded-md border-line-strong bg-surface-2 focus-visible:outline-focus`. Tabs active indicator `bg-accent` 2px bar animated with `duration-base`. All `lucide-react` imports in the kit already moved in A1-5.
- [ ] **Step 3: Tooltip `shortcut`.** `<Tooltip content="Undo" shortcut="Mod+Z">` renders `content` then `<ShortcutHint keys="Mod+Z" />` inside the bubble. `ShortcutHint` comes from A1-9: execute A1-9 before A1-8 (the task order is A1-7, A1-9, A1-8, A1-10).
- [ ] **Step 4: Tests.** `button.test.tsx`: each variant renders and `primary` carries `bg-accent`; `solid` produces the same class string as `primary`; disabled + loading disables. `tooltip.test.tsx`: tooltip with `shortcut="Mod+K"` on a non-Mac platform (stub `navigator.platform = 'Win32'`) contains text "Ctrl" and "K"; on Mac contains an svg `KeyCommand` (query `[aria-hidden="true"] svg` count >= 1) and the accessible description text "Command K".
- [ ] **Step 5: Verify** `pnpm lint && pnpm typecheck && pnpm test`. Commit — `style(kit): restyle primitives to Refined terminal tokens; Button primary/secondary/ghost/danger; Tooltip shortcut`.

### Task A1-9: `Kbd`, `ShortcutHint`, hotkeys registry

**Files:**

- Create: `src/shared/lib/hotkeys.ts`, `src/shared/lib/hotkeys.test.ts`, `src/shared/ui/kbd.tsx`, `src/shared/ui/shortcut-hint.tsx`, `src/shared/ui/kbd.test.tsx`
- Modify: `src/shared/ui/typography.tsx` (remove old `Kbd`; re-export the new one from `index.ts`), `src/shared/ui/index.ts`

**Interfaces:**

```ts
// hotkeys.ts — spec §13.1; "Mod" = Meta on macOS, Control elsewhere.
export type KeyName =
  | 'Mod'
  | 'Shift'
  | 'Alt'
  | 'Ctrl'
  | 'Enter'
  | 'Backspace'
  | 'Delete'
  | 'Tab'
  | 'Escape'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Space'
  | 'PageUp'
  | 'PageDown'
  | 'Home'
  | 'End'
  | string;
export interface Hotkey {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  key: string;
} // key lower-cased
export function parseHotkey(combo: string): Hotkey; // 'Mod+Shift+Z' | '?' | 'p' | 'Alt+ArrowUp'
export function matchesHotkey(
  e: KeyboardEvent | React.KeyboardEvent,
  combo: string,
  mac?: boolean,
): boolean;
export function hotkeyParts(combo: string, mac?: boolean): KeyName[]; // display order: Ctrl, Alt, Shift, Mod, key
export function hotkeyLabel(combo: string, mac?: boolean): string; // plain words: "Command Shift Z" / "Ctrl Shift Z"
export function isTypingTarget(target: EventTarget | null): boolean; // input, textarea, select, contenteditable
export interface ShortcutDef {
  id: string;
  combo: string;
  description: string;
  group: string;
  when?: () => boolean;
  run: (e: KeyboardEvent) => void;
}
export function registerShortcuts(defs: ShortcutDef[]): () => void; // global registry; one keydown listener
export function listShortcuts(): ShortcutDef[]; // for the shortcut sheet (P5-G)
export function useShortcuts(defs: ShortcutDef[], deps: unknown[]): void;
```

```tsx
// kbd.tsx
export interface KbdProps {
  keys: string;
  className?: string;
  size?: 'sm' | 'md';
} // keys = hotkey combo
export function Kbd(props: KbdProps): JSX.Element; // one key chip per part; modifiers/arrows/enter/backspace/tab/escape as Key* icons, letters as mono text
// shortcut-hint.tsx
export function ShortcutHint({
  keys,
  className,
}: {
  keys: string;
  className?: string;
}): JSX.Element;
// renders <span className="sr-only">{hotkeyLabel(keys)}</span> + <Kbd aria-hidden keys={keys} />
```

- [ ] **Step 1: Failing tests** (`hotkeys.test.ts`): `parseHotkey('Mod+Shift+Z')` -> `{mod:true, shift:true, alt:false, ctrl:false, key:'z'}`; `matchesHotkey` with `{metaKey:true, key:'z'}` on mac true, on win false; with `{ctrlKey:true, key:'z'}` on win true; `'?'` matches `{key:'?', shiftKey:true}` (shift implied by the character); `hotkeyLabel('Mod+K', true)` === 'Command K', `(..., false)` === 'Ctrl K'; `hotkeyParts('Alt+ArrowUp', true)` === `['Alt','ArrowUp']`; single-letter shortcuts do not fire when `isTypingTarget` (registry test: dispatch keydown on an `<input>` -> handler not called; on `document.body` -> called once); `registerShortcuts` returns a disposer that removes them; two definitions with the same combo: the later-registered whose `when()` is true wins (stack order).
- [ ] **Step 2: Implement `hotkeys.ts`.** Key normalisation: `e.key.length === 1 ? e.key.toLowerCase() : e.key`; for printable characters other than letters, ignore `shiftKey` when matching (so `?` works on all layouts). One `keydown` listener on `window` installed lazily on first registration; iterate definitions from most recent; call `e.preventDefault()` when a definition runs.
- [ ] **Step 3: `Kbd`** (kit, owns raw `<kbd>`):

```tsx
import { cn } from '@/shared/lib/cn';
import { hotkeyParts } from '@/shared/lib/hotkeys';
import { isMac } from '@/shared/lib/platform';
import {
  KeyArrowDown,
  KeyArrowLeft,
  KeyArrowRight,
  KeyArrowUp,
  KeyBackspace,
  KeyCommand,
  KeyControl,
  KeyEnter,
  KeyEscape,
  KeyOption,
  KeyShift,
  KeyTab,
} from './icons';

const ICON: Record<string, typeof KeyCommand> = {
  Mod: KeyCommand,
  Shift: KeyShift,
  Alt: KeyOption,
  Ctrl: KeyControl,
  Enter: KeyEnter,
  Backspace: KeyBackspace,
  Tab: KeyTab,
  Escape: KeyEscape,
  ArrowUp: KeyArrowUp,
  ArrowDown: KeyArrowDown,
  ArrowLeft: KeyArrowLeft,
  ArrowRight: KeyArrowRight,
};
const WORD: Record<string, string> = {
  Mod: 'Ctrl',
  Alt: 'Alt',
  Ctrl: 'Ctrl',
  Shift: 'Shift',
  Space: 'Space',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Delete: 'Del',
  Home: 'Home',
  End: 'End',
};

export function Kbd({
  keys,
  className,
  size = 'sm',
}: {
  keys: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const mac = isMac();
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      aria-hidden="true"
    >
      {hotkeyParts(keys, mac).map((k, i) => {
        // On Windows/Linux, Mod/Alt/Ctrl/Shift read better as words; arrows/enter/etc. stay icons.
        const useIcon =
          ICON[k] && (mac || !['Mod', 'Alt', 'Ctrl', 'Shift'].includes(k));
        const Icon = ICON[k];
        return (
          <kbd
            key={i}
            className={cn(
              'inline-flex min-w-5 items-center justify-center rounded-sm border border-line-strong bg-surface-2 px-1 font-mono-meta text-fg-muted',
              size === 'sm' ? 'h-5 text-xs' : 'h-6 text-sm',
            )}
          >
            {useIcon ? <Icon size="xs" /> : (WORD[k] ?? k.toUpperCase())}
          </kbd>
        );
      })}
    </span>
  );
}
```

- [ ] **Step 4: Component tests** (`kbd.test.tsx`): Mac (stub platform) `Mod+Shift+Z` renders 3 `kbd` elements, the first two containing an `svg`, the last text "Z"; Windows renders "Ctrl", "Shift", "Z" as text; `ArrowUp` renders an svg on both; `ShortcutHint keys="Mod+K"` exposes `"Command K"` (Mac) through `.sr-only` text and hides the chips (`aria-hidden="true"`); no rendered text node contains a banned glyph (run `findBanned` from `eslint-rules/banned-glyphs.js` over `container.textContent`).
- [ ] **Step 5: Commit** — `feat(kit): Kbd with SVG key icons, ShortcutHint and a global hotkey registry`.

### Task A1-10: `Popover`, `SegmentedControl`, `MetaList`, `StatusDot`, `Swatch`

**Files:**

- Create: `src/shared/ui/popover.tsx` (+ `.test.tsx`), `segmented-control.tsx` (+ test), `meta-list.tsx`, `status-dot.tsx`, `swatch.tsx`, `src/shared/ui/position.ts` (+ `.test.ts`)
- Modify: `src/shared/ui/index.ts`, `src/shared/ui/list.tsx` (marker becomes `StatusDot`)

**Interfaces:**

```ts
// position.ts — pure collision handling, unit-tested
export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function placeFloating(
  anchor: Rect,
  floating: { width: number; height: number },
  viewport: Rect,
  opts: { side: Side; align: Align; offset: number; padding: number },
): { x: number; y: number; side: Side };
// flips to the opposite side when the preferred side overflows and the opposite fits better; then shifts along the cross axis within padding.
```

```tsx
export interface PopoverProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  anchor:
    | React.RefObject<HTMLElement | null>
    | { getBoundingClientRect(): DOMRect }; // element or virtual (selection rect)
  side?: Side;
  align?: Align;
  offset?: number; // defaults 'bottom', 'start', 8
  label: string; // aria-label of the dialog surface
  modal?: boolean; // false: role="dialog" non-modal, focus moves in, Tab leaves closes; true: focus trap
  initialFocus?: React.RefObject<HTMLElement | null>;
  className?: string;
  children: React.ReactNode;
}
// Behaviour: portal to body, z-popover, rounded-xl shadow-e2 bg-surface; Esc closes and returns focus to the anchor;
// click outside closes; repositions on scroll/resize (ResizeObserver + scroll capture); data-side attribute for styling.
// Owns its style={{ left, top }} (kit is the sanctioned home of data-driven style).

export interface SegmentedControlProps<V extends string> {
  label: string;
  value: V;
  onChange(v: V): void;
  options: {
    value: V;
    label: string;
    icon?: IconComponent;
    disabled?: boolean;
  }[]; // 2..5
  size?: 'sm' | 'md';
}
// role="radiogroup" aria-label={label}; each option role="radio" aria-checked; roving tabindex; arrows move and select.

export function MetaList({
  items,
  className,
}: {
  items: React.ReactNode[];
  className?: string;
}): JSX.Element;
// <ul> of inline <li>; between items a decorative separator element (4px round dot span, bg-fg-subtle, aria-hidden). Never a character.

export function StatusDot(props: {
  tone: 'accent' | 'danger' | 'warning' | 'info' | 'muted';
  label?: string;
  decorative?: boolean;
  pulse?: boolean;
}): JSX.Element;
// 8px circle; with label: role="img" aria-label; decorative: aria-hidden. pulse only under motion-safe.

export function Swatch(props: {
  color: string;
  label: string;
  size?: 'sm' | 'md';
  selected?: boolean;
}): JSX.Element;
// colour chip; `color` is a token name ('accent', 'danger', ...) or a validated #rrggbb (regex /^#[0-9a-f]{6}$/i else throws INVALID_INPUT in dev). Inline style only here.
```

- [ ] **Step 1: Failing `position.test.ts`**: bottom placement inside viewport; flips to top when the bottom overflows by 50px and the top has room; shifts left when overflowing the right edge, never past `padding`; `align: 'end'` aligns right edges; left/right sides symmetric cases.
- [ ] **Step 2: Implement `placeFloating`** (pure arithmetic: main-axis coordinate per side; overflow = amount beyond `viewport` minus padding; flip if overflow > 0 and the opposite side's overflow is smaller; clamp the cross axis to `[viewport.x + padding, viewport.x + viewport.width - padding - floating.width]`).
- [ ] **Step 3: Implement components** per the interface. `Popover` measures the floating element in a layout effect after mount, then sets position; until measured it renders `visibility: hidden` to avoid a flash.
- [ ] **Step 4: Component tests** (jsdom; stub `getBoundingClientRect`): Popover opens with focus inside, Esc closes and focuses the anchor, outside pointerdown closes, `role="dialog"` with the given label; SegmentedControl ArrowRight moves selection and calls `onChange`, Home/End jump, disabled options are skipped; MetaList renders N items and N-1 separators that are `aria-hidden` and contain no text; StatusDot with label is `role="img"`; Swatch rejects `'red'` (not a token, not hex).
- [ ] **Step 5: `ListItem`** uses `<StatusDot tone="accent" decorative />` as its marker. Commit — `feat(kit): Popover with collision handling, SegmentedControl, MetaList, StatusDot, Swatch`.

### Task A1-11: `AppShell`, `TopBar`, `Breadcrumb`

**Files:**

- Create: `src/shared/ui/app-shell.tsx`, `top-bar.tsx`, `breadcrumb.tsx`, `app-shell.test.tsx`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**

```tsx
export interface AppShellProps {
  topBar: React.ReactNode;
  children: React.ReactNode; // main content
  aside?: React.ReactNode; // optional complementary region (left)
  asideEnd?: React.ReactNode; // optional complementary region (right)
  layout?: 'standard' | 'focus'; // exposed through LayoutContext
  mainId?: string; // default 'main'; skip link target
  skipLinks?: { href: string; label: string }[]; // default [{ href: '#main', label: 'Skip to content' }]
}
export const LayoutContext: React.Context<{
  layout: 'standard' | 'focus';
  setLayout(l: 'standard' | 'focus'): void;
}>;
// Renders: skip links (sr-only until focused), <header role="banner"> (topBar), optional <aside aria-label="...">, <main id tabIndex={-1}>.

export interface TopBarProps {
  breadcrumb?: React.ReactNode; // usually <Breadcrumb/>
  center?: React.ReactNode; // e.g. filename field in the workspace
  actions?: React.ReactNode; // right side slot
  compact?: boolean; // 48px vs 56px height
}
// Renders <Logo/> wrapped in a router Link to "/" (prop `homeHref`, default '/'), then breadcrumb, center, actions.
// Router-agnostic: accepts `renderLink?: (props: { href: string; className?: string; children: React.ReactNode; 'aria-label'?: string }) => React.ReactNode` (default renders an <a>).

export interface BreadcrumbProps {
  segments: { label: string; href?: string }[]; // path parts after the logo, e.g. [{label:'pdf', href:'/pdf'}, {label:'edit'}]
  renderLink?: TopBarProps['renderLink'];
}
// <nav aria-label="Breadcrumb"><ol> items in font-mono-meta; separators are <IconChevronRight size="xs" aria-hidden/> between items;
// last item aria-current="page".
```

- [ ] **Step 1: Tests first** (`app-shell.test.tsx`): one `banner`, one `main` (with `id="main"`), skip link "Skip to content" is the first focusable element and targets `#main`; `aside` renders `complementary` only when provided; Breadcrumb: `navigation` named "Breadcrumb", segments `pdf`, `edit` render as list items, the last has `aria-current="page"`, separators are svgs with `aria-hidden`, and `textContent` contains no banned glyph; TopBar renders the Logo link named "tools home".
- [ ] **Step 2: Implement.** `AppShell` grid: `grid h-dvh grid-rows-[auto_1fr]`; regions get `bg-canvas`; skip links `sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-palette`.
- [ ] **Step 3: Commit** — `feat(kit): AppShell with landmarks and skip links, TopBar with Logo, Breadcrumb with icon separators`.

### Task A1-12: `CommandPalette` and the command registry

**Files:**

- Create: `src/shared/lib/fuzzy.ts` (+ test), `src/shared/lib/commands.ts` (+ test), `src/shared/ui/command-palette.tsx` (+ `.test.tsx`)
- Modify: `src/shared/ui/index.ts`

**Interfaces:**

```ts
// fuzzy.ts
export function fuzzyScore(query: string, text: string): number | null;
// null = no match; higher = better. Case-insensitive subsequence match; bonuses: +8 start of text, +5 start of word,
// +3 consecutive, -1 per gap char; exact prefix wins. Pure.
export function rankCommands<T extends { label: string; keywords?: string[] }>(
  query: string,
  items: T[],
  limit?: number,
): T[];

// commands.ts
export interface Command {
  id: string;
  label: string; // plain words, no glyphs
  group: string; // 'Tools' | 'Pages' | 'Modes' | 'Actions' | 'Recent documents' | ...
  keywords?: string[];
  shortcut?: string; // hotkey combo shown via ShortcutHint
  icon?: IconComponent;
  disabled?: boolean | string; // string = reason shown
  run(): void | Promise<void>;
}
export interface CommandSource {
  id: string;
  commands(query: string): Command[];
} // query lets sources answer "p 12"
export function registerCommandSource(source: CommandSource): () => void;
export function useCommands(source: CommandSource, deps: unknown[]): void; // registers while mounted
export function queryCommands(
  query: string,
): { group: string; commands: Command[] }[]; // ranked, grouped, recent first when query empty
export function noteCommandRun(id: string): void; // recent list (in memory + localStorage 'tools:recent-commands', max 8)
```

```tsx
export interface CommandPaletteProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  placeholder?: string;
}
// Dialog (z-palette, rounded-xl, shadow-e3) with a combobox input (role="combobox" aria-expanded aria-controls)
// and a listbox (role="listbox") of options (role="option" aria-selected) grouped with role="group" aria-label={group}.
// ArrowUp/Down move, Enter runs (closes first, then run), Esc closes, Home/End, PageUp/Down by 5.
// Each option: icon, label, group-specific meta, ShortcutHint for shortcut, disabled reason as meta text.
// Empty: "No commands match" with the query. Focus trap; returns focus on close.
export function useCommandPaletteHotkey(setOpen: (o: boolean) => void): void; // registers Mod+K globally
```

- [ ] **Step 1: Failing tests.** `fuzzy.test.ts`: "mrg" matches "Merge PDFs" above "Image optimizer"; "pdf edit" (space = AND across words) matches "Edit PDF"; no match returns null; prefix beats middle. `commands.test.ts`: two sources merge and group; disposer removes a source; empty query lists recent ids first (after `noteCommandRun`); a source answering `p 12` with "Go to page 12" appears first.
- [ ] **Step 2: Implement** fuzzy + registry (module-level `Set<CommandSource>` and a `version` counter; `useSyncExternalStore` in the palette so sources updating re-render).
- [ ] **Step 3: Palette component tests** (jsdom): opens via Mod+K (`useCommandPaletteHotkey`), input focused, typing filters, ArrowDown + Enter runs the second command and closes, disabled command does not run and announces its reason via `aria-disabled` + description, Esc closes and restores focus, `role="combobox"` has `aria-activedescendant` pointing at the highlighted option id.
- [ ] **Step 4: Commit** — `feat(kit): CommandPalette with fuzzy ranking, grouped sources and recent commands`.

### Task A1-13: `DropZone`, kit `Toaster`, `EmptyState`/`ErrorState`/`LoadingState`

**Files:**

- Create: `src/shared/ui/drop-zone.tsx` (+ test), `src/shared/ui/toaster.tsx`, `src/shared/ui/states.tsx` (+ test)
- Modify: `src/shared/lib/notify.ts` (action support), `src/app/App.tsx` (use kit `Toaster`), `src/shared/ui/empty-state.tsx` (kept API, restyled, re-exported from `states.tsx`), `src/shared/ui/index.ts`

**Interfaces:**

```tsx
export interface DropZoneProps {
  variant: 'hero' | 'inline' | 'fullscreen';
  onFiles(files: File[]): void;
  accept?: string; // input accept attribute
  multiple?: boolean;
  disabled?: boolean;
  title?: React.ReactNode; // default 'Drop files here'
  hint?: React.ReactNode;
  chooseLabel?: string; // default 'Choose files' (keyboard path; a real kit Button)
  icon?: IconComponent; // default IconUpload
  active?: boolean; // fullscreen: controlled visibility (window-level dragenter handled by useWindowFileDrag)
}
export function useWindowFileDrag(
  onFiles: (files: File[]) => void,
  opts?: { enabled?: boolean },
): { dragging: boolean };
// fullscreen variant: fixed inset-0 z-dialog overlay shown while dragging files over the window; Esc/dragleave hides.
// Owns the hidden <input type="file">. Kind sniffing is the caller's job (detectKind on bytes), never the extension.

// notify.ts additions
export interface NotifyAction {
  label: string;
  onClick(): void;
}
export const notify: {
  success(message: string, opts?: { action?: NotifyAction }): void;
  info(message: string, opts?: { action?: NotifyAction }): void;
  error(error: string | ToolError, opts?: { action?: NotifyAction }): void;
};
// Toaster: sonner <Toaster> themed from useTheme().resolved, position bottom-right, classNames mapped to tokens,
// success icon IconCheck, error IconAlertCircle, info IconInfo (sonner `icons` prop) so sonner's own glyph icons never render.

export function EmptyState(props: {
  icon?: IconComponent;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}): JSX.Element;
export function ErrorState(props: {
  error: ToolError;
  title?: string;
  actions?: {
    label: string;
    onClick(): void;
    variant?: 'primary' | 'secondary';
  }[];
}): JSX.Element;
// role="alert"; title default by code: INVALID_FILE 'This file could not be opened', ENCRYPTED 'Password needed', TOO_LARGE 'File too large',
// WORKER_CRASHED 'Something stopped working', STORAGE_FULL 'Storage is full', VERIFICATION_FAILED 'Verification failed', NETWORK 'Download failed', else 'Something went wrong';
// body = error.message.
export function LoadingState(props: {
  label: string;
  progress?: { done: number; total: number };
}): JSX.Element;
// role="status" aria-live="polite"; Spinner or Progress bar when progress given.
```

- [ ] **Step 1: Tests.** DropZone: "Choose files" button opens the file input (spy `HTMLInputElement.prototype.click`), drop event with two files calls `onFiles` with both, `disabled` ignores drops; fullscreen overlay appears on window `dragenter` with `dataTransfer.types` including 'Files' and hides on `drop`/`dragleave` to outside; ErrorState renders `role="alert"` with title by code and message; LoadingState progress renders `progressbar` with `aria-valuenow`.
- [ ] **Step 2: Implement**; replace `App.tsx`'s sonner `<Toaster theme="dark" ...>` with kit `<Toaster />`.
- [ ] **Step 3: Commit** — `feat(kit): DropZone variants, themed Toaster with actions, unified Empty/Error/Loading states`.

### Task A1-14: `HubLayout`, `CategoryCard`, `ToolCard`

**Files:**

- Create: `src/shared/ui/hub-layout.tsx`, `category-card.tsx`, `tool-card.tsx`, `auto-grid.tsx`, `cards.test.tsx`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**

```tsx
export function AutoGrid(props: {
  min: number;
  gap?: Gap;
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'ul';
}): JSX.Element;
// CSS grid repeat(auto-fill, minmax(min px, 1fr)); owns the data-driven style.

export interface HubLayoutProps {
  icon: IconComponent;
  title: string;
  blurb: string;
  dropZone?: React.ReactNode; // DropZone variant="hero"
  groups: { id: string; label?: string; children: React.ReactNode }[];
  headerActions?: React.ReactNode;
}
// <h1> title; each group <section aria-labelledby> with <h2> when labelled; children are cards in AutoGrid min 240.

export interface ToolCardProps {
  href: string; // rendered through renderLink (router-agnostic like TopBar)
  renderLink?: TopBarProps['renderLink'];
  icon: IconComponent;
  title: string;
  description: string;
  tag?: string; // cross-list tag, e.g. 'pdf' (font-mono-meta Badge)
  isNew?: boolean;
  favourite?: { active: boolean; onToggle(): void }; // separate button, not inside the link
}
// Whole card is one link (title is the accessible name); favourite button outside the anchor element, absolutely
// positioned top-right, aria-pressed, label "Add {title} to favourites" / "Remove {title} from favourites",
// icon IconStar / IconStarFilled.

export interface CategoryCardProps {
  href: string;
  renderLink?: TopBarProps['renderLink'];
  icon: IconComponent;
  label: string;
  count: number;
  topTools: string[]; // up to 3 names
}
// Link card: label, "{count} tools" (font-mono-meta), MetaList of topTools.
```

- [ ] **Step 1: Tests**: ToolCard link has name equal to title; favourite button is a sibling of the link (not a descendant), toggles `aria-pressed`; CategoryCard shows "12 tools" and a MetaList of 3; HubLayout renders `h1` and one `h2` per labelled group; AutoGrid applies `grid-template-columns` with the `min`.
- [ ] **Step 2: Implement.** Card visuals: `rounded-lg bg-surface shadow-e1 hover:bg-surface-2 transition-colors duration-fast`, focus ring on the link via `focus-visible:outline-focus` on the card wrapper (`:has(a:focus-visible)`).
- [ ] **Step 3: Commit** — `feat(kit): HubLayout, ToolCard with separate favourite toggle, CategoryCard, AutoGrid`.

### Task A1-15: Dev-only kit gallery and the visual-regression harness

**Files:**

- Create: `src/app/gallery/KitGallery.tsx`, `src/app/gallery/sections/*.tsx` (one per kit area: icons, buttons, inputs, overlays, navigation, cards, states, keys), `playwright.visual.config.ts`, `test/visual/kit-gallery.visual.ts`, `test/visual/helpers.ts`, `scripts/visual-docker.mjs`
- Modify: `src/app/App.tsx` (dev-only `/__kit` route), `package.json` (`"test:visual": "playwright test -c playwright.visual.config.ts"`, `"test:visual:docker": "node scripts/visual-docker.mjs"`, add dev dep `@axe-core/playwright`), `.github/workflows/ci.yml` (visual job), `.gitignore` (none: baselines are committed)

**Interfaces:**

- Produces: route `/__kit` only when `import.meta.env.DEV` (G18): `const KitGallery = import.meta.env.DEV ? lazy(() => import('./gallery/KitGallery')) : null;` and the route is omitted otherwise; A1-6's test asserts no built file contains `__kit`.
- Produces visual helpers:

```ts
// test/visual/helpers.ts
export type Theme = 'light' | 'dark';
export async function setTheme(page: Page, theme: Theme): Promise<void>; // localStorage + reload-free apply via evaluate
export async function stabilise(page: Page): Promise<void>; // waits fonts (document.fonts.ready), disables caret animation, masks [data-dynamic]
export async function expectAxeClean(page: Page): Promise<void>; // @axe-core/playwright; fails on serious/critical
export const VIEWPORTS: {
  desktop: { width: 1280; height: 800 };
  phone: { width: 390; height: 844 };
};
```

- [ ] **Step 1: `playwright.visual.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 5175);
export default defineConfig({
  testDir: 'test/visual',
  testMatch: /.*\.visual\.ts$/,
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Per-platform baselines (decision G8).
  snapshotPathTemplate:
    '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: {
    baseURL: `http://localhost:${port}`,
    reducedMotion: 'reduce',
    colorScheme: 'light',
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 2: Gallery.** Sections render every kit primitive in its states (default, hover via `data-state` forced classes is not possible: render a "focus" example by `autoFocus` only in one isolated section; show disabled, loading, error, selected variants explicitly). The icons section renders every export of `@/shared/ui/icons` at every size (`xs..xl`) in a labelled grid (name as caption). A theme `SegmentedControl` at the top switches theme live. No glyphs anywhere (the gallery is product-authored).
- [ ] **Step 3: Visual test** (`kit-gallery.visual.ts`):

```ts
import { expect, test } from '@playwright/test';
import { expectAxeClean, setTheme, stabilise } from './helpers';

for (const theme of ['light', 'dark'] as const) {
  test.describe(`kit gallery ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/__kit');
      await setTheme(page, theme);
      await stabilise(page);
    });
    for (const section of [
      'icons',
      'buttons',
      'inputs',
      'overlays',
      'navigation',
      'cards',
      'states',
      'keys',
    ]) {
      test(section, async ({ page }) => {
        const el = page.getByTestId(`kit-section-${section}`);
        await expect(el).toHaveScreenshot(`${section}-${theme}.png`);
      });
    }
    test('axe', async ({ page }) => expectAxeClean(page));
  });
}
```

Each section root carries `data-testid="kit-section-<name>"`.

- [ ] **Step 4: Docker runner** (`scripts/visual-docker.mjs`) for Linux baselines: spawns `docker run --rm -v <repo>:/work -w /work -e CI=1 mcr.microsoft.com/playwright:v1.63.0-noble bash -lc "corepack enable && pnpm install --frozen-lockfile && pnpm test:visual ${args}"`; exits with Docker's code; prints a clear error when `docker` is not on PATH. CI: add job `visual` with `container: mcr.microsoft.com/playwright:v1.63.0-noble`, `continue-on-error: true` until Linux baselines exist, and a `workflow_dispatch` input `update` that runs `--update-snapshots` and uploads `test/visual/__screenshots__/linux` as an artifact (decision G8).
- [ ] **Step 5: Baselines.** Run `pnpm test:visual --update-snapshots` locally (win32), inspect every PNG (no text-rendered symbol, both themes legible), commit them. Run `pnpm test:visual` again -> PASS.
- [ ] **Step 6: Commit** — `test(visual): dev-only kit gallery with per-platform baselines in both themes and axe`.

### Task A1-16: P5-A1 verification

- [ ] **Step 1:** `git grep -n "lucide-react" src` lists only `src/shared/ui/icons/icon.tsx` and `src/shared/ui/icons/lucide.ts`.
- [ ] **Step 2:** Merge gate 1-6 (visual: kit gallery both themes). Investigate every e2e failure: label changes from A1-5 (e.g. "converts to" icon label) may break selectors; update the spec selectors, never the product text back to glyphs.
- [ ] **Step 3:** PR description lists: rules on, glyph fixes table, token aliases (G20), Button aliases, new kit primitives, gallery route.

## PR boundary A1 — Design system

| Check                                         | Evidence                                            |
| --------------------------------------------- | --------------------------------------------------- |
| Rules (a), (c), no-disable at `error`; lint 0 | `pnpm lint` output                                  |
| Rule tests                                    | `eslint-rules/*.test.js` green                      |
| Dist scan (d) + lucide graph                  | `test/dist-glyphs.test.ts` green after `pnpm build` |
| Icon module tests + name snapshot             | `src/shared/ui/icons/icons.test.tsx`                |
| Token contrast                                | `test/tokens.contrast.test.ts`                      |
| Kit gallery baselines both themes + axe       | `pnpm test:visual`                                  |
| e2e x3                                        | three green runs                                    |

---

# Part P5-A2 — Clean-break IA, Home, hubs, Mod+K, handoff, kit adapters, rule (b) (PR: `feat/p5-a2-ia-kit-adapters`)

**Scope (spec §3, §5.1-5.3, §16, §17 row A2):** manifest fields + `categories.ts`; routes `/<category>/<slug>`; Home, hubs, PDF hub (without the detected-document card; workspace modes grid arrives in B); NotFound with search; global Mod+K sources; file handoff; delete Dashboard/ToolLayout/AnimatedBackground/terminal.css; every tool inside the new `ToolPage` frame; kit adapters (Chart, FlowCanvas, RivePlayer, QrCode, CodeEditor) + `BitmapCanvas`/`Image` + the extra primitives the legacy tools need; rule (b) at `error` with zero violations; token and variant aliases removed.

Cut from `master` after P4-E and P5-A1 merged. Note on counts: spec §1 criterion 6 says "30 non-PDF tools"; the registry holds 22 non-PDF tools plus 8 PDF quick tasks = 30 tools outside the workspace. This plan treats criterion 6 as those 30 (decision G24).

### Task A2-1: Manifest fields, registry validation, `categories.ts`, route helpers

**Files:**

- Modify: `src/app/tool.ts`, `src/app/registry.ts`, `src/app/registry.test.ts`, all 36 `src/tools/*/index.ts`, `test/e2e/tool-routes.ts`
- Create: `src/app/categories.ts`, `src/app/routes.ts`, `src/app/routes.test.ts`

**Interfaces:**

```ts
// tool.ts
export type ToolKind = 'tool' | 'quick-task' | 'workspace';
export type AcceptKind =
  | 'pdf'
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'gif'
  | 'csv'
  | 'tsv'
  | 'text'
  | 'json'
  | 'xml'
  | 'log'
  | 'riv'
  | 'any';
export interface AcceptRule {
  kinds: AcceptKind[];
  multiple?: boolean;
  min?: number;
  max?: number;
}
export interface ToolDefinition {
  id: string;
  slug: string;
  category: ToolCategory;
  kind: ToolKind;
  name: string;
  description: string;
  icon: IconComponent;
  keywords: string[];
  accepts?: AcceptRule[];
  alsoIn?: ToolCategory[];
  enabled: boolean;
  version?: string;
  isNew?: boolean;
}
// categories.ts
export interface CategoryDef {
  id: ToolCategory;
  label: string;
  icon: IconComponent;
  blurb: string;
  order: number;
  fileBased: boolean;
  groups?: { id: string; label: string; toolIds: string[] }[];
}
export const CATEGORIES: readonly CategoryDef[];
export function getCategory(id: string): CategoryDef | undefined;
// routes.ts
export const RESERVED_SLUGS: Record<ToolCategory, readonly string[]>; // { pdf: ['edit'], others: [] }
export function toolPath(t: Pick<ToolDefinition, 'category' | 'slug'>): string; // `/${category}/${slug}`
export function categoryPath(c: ToolCategory): string; // `/${c}`
```

Registry validation additions (`buildRegistry` throws with the manifest path): `slug` kebab-case `/^[a-z0-9]+(-[a-z0-9]+)*$/`; `(category, slug)` unique; slug not in `RESERVED_SLUGS[category]`; `kind` valid; `keywords` array of non-empty strings; `alsoIn` categories exist and differ from `category`; `accepts[].kinds` non-empty; `category` exists in `CATEGORIES`.

- [ ] **Step 1: Failing tests** (`registry.test.ts` additions): duplicate `(pdf, merge)` throws naming both paths; slug `Merge` throws "kebab-case"; slug `edit` under `pdf` throws "reserved"; unknown category throws; `alsoIn: ['pdf']` on a pdf tool throws; valid manifest passes. `routes.test.ts`: `toolPath({category:'text', slug:'regex'})` === '/text/regex'.
- [ ] **Step 2: `categories.ts`**

```ts
export const CATEGORIES = [
  {
    id: 'pdf',
    label: 'PDF',
    icon: IconFileText,
    blurb: 'Edit, sign, organise and convert PDFs in your browser.',
    order: 1,
    fileBased: true,
  },
  {
    id: 'text',
    label: 'Text',
    icon: IconType,
    blurb: 'Patterns, differences and logs.',
    order: 2,
    fileBased: true,
  },
  {
    id: 'data',
    label: 'Data',
    icon: IconTable,
    blurb: 'View and generate structured data.',
    order: 3,
    fileBased: true,
  },
  {
    id: 'encoding',
    label: 'Encoding',
    icon: IconBinary,
    blurb: 'Encode, decode and inspect tokens.',
    order: 4,
    fileBased: false,
  },
  {
    id: 'web',
    label: 'Web & dev',
    icon: IconGlobe,
    blurb: 'Requests, URLs and QR codes.',
    order: 5,
    fileBased: false,
  },
  {
    id: 'media',
    label: 'Media',
    icon: IconImage,
    blurb: 'Images, colours and animations.',
    order: 6,
    fileBased: true,
  },
  {
    id: 'security',
    label: 'Security',
    icon: IconShield,
    blurb: 'Hashes, passwords and PDF protection.',
    order: 7,
    fileBased: false,
  },
  {
    id: 'math',
    label: 'Math',
    icon: IconCalculator,
    blurb: 'Calculate and convert numbers and units.',
    order: 8,
    fileBased: false,
  },
  {
    id: 'time',
    label: 'Time',
    icon: IconClock,
    blurb: 'Dates and focus timers.',
    order: 9,
    fileBased: false,
  },
] as const satisfies readonly CategoryDef[];
```

PDF groups: `quick-tasks` ("Quick tasks": the 8 quick-task ids) and, until their Parts delete them, `more` ("More PDF tools": the folded tools). Add the icon names to `lucide.ts` if missing (A1 rule).

- [ ] **Step 3: Manifests.** Apply this table (spec §3.2 plus G19 interim slugs). Keywords: at least 3 plain words each, chosen from the tool's description and common synonyms.

| id                    | category | slug            | kind       | accepts                                                                          | alsoIn         |
| --------------------- | -------- | --------------- | ---------- | -------------------------------------------------------------------------------- | -------------- |
| pdf-merger            | pdf      | merge           | quick-task | `[{kinds:['pdf'], multiple:true, min:2}]`                                        |                |
| pdf-splitter          | pdf      | split           | quick-task | `[{kinds:['pdf']}]`                                                              |                |
| pdf-compressor        | pdf      | compress        | quick-task | `[{kinds:['pdf']}]`                                                              |                |
| images-to-pdf         | pdf      | images-to-pdf   | quick-task | `[{kinds:['png','jpeg','webp','gif'], multiple:true}]`                           |                |
| pdf-to-images         | pdf      | to-images       | quick-task | `[{kinds:['pdf']}]`                                                              |                |
| pdf-to-text           | pdf      | to-text         | quick-task | `[{kinds:['pdf']}]`                                                              |                |
| pdf-protect           | pdf      | protect         | quick-task | `[{kinds:['pdf']}]`                                                              | security       |
| pdf-unlock            | pdf      | unlock          | quick-task | `[{kinds:['pdf']}]`                                                              | security       |
| pdf-organize          | pdf      | organize        | tool       | `[{kinds:['pdf']}]`                                                              | (deleted in B) |
| pdf-sign              | pdf      | sign            | tool       | `[{kinds:['pdf']}]`                                                              | (deleted in C) |
| pdf-fill-form         | pdf      | fill-form       | tool       | `[{kinds:['pdf']}]`                                                              | (deleted in C) |
| pdf-watermark         | pdf      | watermark       | tool       | `[{kinds:['pdf']}]`                                                              | (deleted in D) |
| pdf-page-numbers      | pdf      | page-numbers    | tool       | `[{kinds:['pdf']}]`                                                              | (deleted in D) |
| pdf-metadata          | pdf      | metadata        | tool       | `[{kinds:['pdf']}]`                                                              | (deleted in E) |
| regex-tester          | text     | regex           | tool       |                                                                                  |                |
| text-diff-checker     | text     | diff            | tool       | `[{kinds:['text','csv','tsv','json','xml','log'], multiple:true, min:2, max:2}]` |                |
| log-parser            | text     | logs            | tool       | `[{kinds:['log','text']}]`                                                       |                |
| csv-viewer            | data     | csv             | tool       | `[{kinds:['csv','tsv']}]`                                                        |                |
| json-and-xml-viewer   | data     | json-xml        | tool       | `[{kinds:['json','xml']}]`                                                       |                |
| random-data-generator | data     | random          | tool       |                                                                                  |                |
| base64-converter      | encoding | base64          | tool       | `[{kinds:['any']}]`                                                              |                |
| jwt-decode            | encoding | jwt             | tool       |                                                                                  |                |
| url-encoder-decoder   | encoding | url             | tool       |                                                                                  |                |
| api-request           | web      | api-request     | tool       |                                                                                  |                |
| qr-code-generator     | web      | qr              | tool       |                                                                                  |                |
| url-parser            | web      | url-parser      | tool       |                                                                                  |                |
| image-optimizer       | media    | image-optimizer | tool       | `[{kinds:['png','jpeg','webp','gif'], multiple:true}]`                           |                |
| color-tester          | media    | color           | tool       |                                                                                  |                |
| rive-animation-player | media    | rive            | tool       | `[{kinds:['riv']}]`                                                              |                |
| hash-generator        | security | hash            | tool       | `[{kinds:['any']}]`                                                              |                |
| password-generator    | security | password        | tool       |                                                                                  |                |
| calculator            | math     | calculator      | tool       |                                                                                  |                |
| number-converter      | math     | number-base     | tool       |                                                                                  |                |
| unit-converter        | math     | units           | tool       |                                                                                  |                |
| date-calculator       | time     | date            | tool       |                                                                                  |                |
| pomodoro              | time     | pomodoro        | tool       |                                                                                  |                |

`test/e2e/tool-routes.ts` parses `slug` and `category` too and exposes `path`.

- [ ] **Step 4: Verify** `pnpm vitest run src/app` and `pnpm typecheck`. Commit — `feat(registry): slug, kind, keywords, accepts and alsoIn; categories table; route helpers`.

### Task A2-2: File handoff and drop routing

**Files:**

- Create: `src/shared/lib/handoff.ts` (+ `.test.ts`), `src/app/drop-routing.ts` (+ `.test.ts`), `src/shared/lib/sniff.ts` (+ `.test.ts`)

**Interfaces:**

```ts
// handoff.ts — in memory only, never persisted (spec §5.3)
export function putHandoff(files: File[]): string; // returns a one-time id (newId())
export function takeHandoff(id: string): File[] | null; // deletes on read
export function useHandoffFiles(onFiles: (files: File[]) => void): void;
// reads ?handoff=<id> once per mount, calls onFiles, removes the param with history.replaceState (no navigation)
// sniff.ts — content-based, never the extension
export async function sniffAcceptKind(
  file: File,
): Promise<Exclude<AcceptKind, 'any'> | null>;
// binary: detectKind(bytes) for pdf/png/jpeg/webp/gif; 'RIVE' magic (0x52 0x49 0x56 0x45) -> 'riv';
// text: first 64 KB decoded with TextDecoder('utf-8', { fatal: true }) (failure -> null);
//   JSON when trimmed text starts with { or [ and JSON.parse succeeds on files up to 2 MB (larger: first char only);
//   XML when it starts with '<?xml' or '<' + letter;
//   CSV/TSV when >= 2 of the first 10 non-empty lines share the same count (>= 1) of ',' or '\t';
//   log when >= 50% of the first 20 lines start with a date/time (/^\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/) or a level token (INFO|WARN|ERROR|DEBUG);
//   else 'text'.
// drop-routing.ts
export type DropDecision =
  | { type: 'navigate'; path: string; files: File[] }
  | {
      type: 'choose';
      options: { tool: ToolManifest; path: string }[];
      files: File[];
    }
  | { type: 'error'; error: ToolError };
export async function routeDrop(
  files: File[],
  tools: ToolManifest[],
  category?: ToolCategory,
): Promise<DropDecision>;
// Matching: a tool matches when every file's kind is in some accepts rule's kinds ('any' matches all), and the
// file count satisfies multiple/min/max (multiple false means exactly 1). Candidates = enabled tools in `category`
// (and tools with alsoIn containing it). Exactly one -> navigate; several -> choose; none -> INVALID_FILE
// "No tool here accepts these files. Accepted: {describe kinds}".
```

- [ ] **Step 1: Tests first.** sniff: PDF bytes -> 'pdf'; `{"a":1}` -> 'json'; `<?xml version="1.0"?><a/>` -> 'xml'; three CSV lines -> 'csv'; tab lines -> 'tsv'; log lines -> 'log'; binary garbage -> null; `.csv` name with JSON content -> 'json'. handoff: `take` twice returns files then null. routeDrop: text hub + one CSV file -> navigate `/data/csv` only when category 'data'; text hub + 2 text files -> navigate `/text/diff`; media hub + 3 PNGs -> navigate image optimizer; security hub + any file -> choose (base64 is not in security; hash is; Protect/Unlock via alsoIn accept pdf only) -> for a PDF: choose among hash, protect, unlock; unknown binary in data hub -> error INVALID_FILE naming "CSV, TSV, JSON or XML".
- [ ] **Step 2: Implement.** Commit — `feat(app): one-time file handoff, content sniffing and hub drop routing`.

### Task A2-3: `ToolPage` frame and favourites

**Files:**

- Create: `src/app/pages/ToolPage.tsx`, `src/app/favorites.ts` (+ `.test.ts`), `src/app/pages/ToolPage.test.tsx`

**Interfaces:**

```ts
// favorites.ts — keeps the legacy localStorage key 'favoriteTools' (array of ids) so users keep their stars.
export function useFavorites(): {
  ids: string[];
  isFavorite(id: string): boolean;
  toggle(id: string): void;
};
// implemented with createToolStore({ toolId: 'app-favorites', initial: { ids: [] as string[] },
//   legacy: { keys: ['favoriteTools'], read: (raw) => ({ ids: JSON.parse(raw.favoriteTools ?? '[]') }) } })
// Unknown ids (removed tools) are kept in storage but filtered when listing.
```

```tsx
export interface ToolPageProps {
  tool: ToolManifest;
  children: React.ReactNode;
}
// Inside AppShell (A2-4): TopBar breadcrumb [category label -> /category, tool name]; page header: icon (lg),
// <h1>{name}</h1>, description, favourite IconButton (aria-pressed, label "Add {name} to favourites"),
// then children inside ToolErrorBoundary; Suspense fallback LoadingState "Loading {name}".
```

- [ ] **Step 1: Tests** — favourites import legacy `favoriteTools` once (pre-seed localStorage, read `ids`); toggle persists under `kit:store:tool:app-favorites`; ToolPage renders `h1` with the name, breadcrumb items `[Text, Regex Tester]`, the favourite button toggles `aria-pressed`.
- [ ] **Step 2: Implement; commit** — `feat(app): ToolPage frame with breadcrumb and favourites (legacy key imported)`.

### Task A2-4: Router, AppShell wiring, deletions

**Files:**

- Modify: `src/app/App.tsx`, `src/main.tsx`
- Create: `src/app/pages/NotFound.tsx` (rewrite), `src/app/shell/AppFrame.tsx` (AppShell + TopBar + palette + Toaster + theme menu)
- Delete: `src/app/Dashboard.tsx`, `src/app/ToolLayout.tsx`, `src/app/AnimatedBackground.tsx` (if still present), `src/theme/terminal.css`, `src/app/NotFound.tsx` (moved), `bg-terminal-grid` usages (Home in A2-5 does not use it; remove the utility from `tokens.css` if unused)

**Interfaces:**

```tsx
// App.tsx route table (react-router 7, BrowserRouter)
// <Route element={<AppFrame />}>             // layout route rendering <Outlet/>
//   <Route path="/" element={<Home />} />
//   {DEV && <Route path="/__kit" element={<KitGallery />} />}
//   <Route path="/:category" element={<HubRoute />} />            // unknown category -> NotFound
//   {tools.map(t => <Route path={toolPath(t)} element={<ToolPage tool={t}><LazyTool definition={t} /></ToolPage>} />)}
//   <Route path="*" element={<NotFound />} />
// </Route>
// Disabled tools get no route (clean break: no Navigate). The workspace route is added in B.
// AppFrame: TopBar (breadcrumb from a BreadcrumbContext set by pages), actions: Mod+K Button (IconSearch + "Search" + ShortcutHint 'Mod+K'),
// theme DropdownMenu with SegmentedControl (System / Light / Dark with IconMonitor/IconSun/IconMoon).
export function useBreadcrumb(
  segments: { label: string; href?: string }[],
): void;
```

NotFound (spec §3.2): `<h1>No page at <code>{pathname}</code></h1>` rendered as text "No page at" + `Code` element; a `SearchInput` labelled "Search tools" filtering the registry with `rankCommands`, result links; category links (CategoryCard grid). Never redirects.

- [ ] **Step 1: e2e first** — update `test/e2e/smoke.spec.ts`: `/` shows `h1` with the promise text; `/text/regex` renders "Regex Tester" `h1`; `/regex-tester` shows "No page at /regex-tester" (old URL, no redirect); `/nope/thing` shows NotFound with the search field.
- [ ] **Step 2: Implement router + AppFrame; delete legacy files.** `pnpm typecheck` finds every import of the deleted modules; fix them.
- [ ] **Step 3: Commit** — `feat(app)!: clean-break routes /<category>/<slug>; AppShell frame; Dashboard, ToolLayout and terminal.css removed`.

### Task A2-5: Home page

**Files:**

- Create: `src/app/pages/Home.tsx`, `src/app/pages/Home.test.tsx`

**Interfaces / content (spec §5.2):**

- Hero: `<Logo>` line is in the TopBar; hero `h1` "Free, private tools. Nothing leaves your browser."; a search Button styled as a field ("Search tools and actions", `ShortcutHint 'Mod+K'`) that opens the palette; `/` focuses it (registered via `useShortcuts` with `when: () => !isTypingTarget(...)`).
- PDF workspace card: `Card` with `h2` "PDF workspace", blurb, `DropZone variant="hero"` titled "Drop a PDF to start" (A2: drop routes through `routeDrop(files, tools, 'pdf')`; B replaces this with the workspace rules).
- Recent documents: rendered only when the workspace store exists (B adds `RecentDocuments`); A2 renders nothing for it.
- Favourites: `h2` "Favourites" + ToolCards for `useFavorites().ids` that resolve to enabled tools; hidden when empty.
- Categories: `h2` "Categories" + CategoryCard per `CATEGORIES` (count = enabled tools in category, topTools = first 3 by name).
- Footer: existing `Footer` restyled (version/build info from `footerUtils`, privacy note "Your files are processed on this device and never uploaded.", theme switch).

- [ ] **Step 1: Component test** — renders 9 category cards in order; favourites section absent with no favourites, present with one; search button opens the palette (mock `onOpenPalette` context).
- [ ] **Step 2: Implement; commit** — `feat(app): Home with hero search, PDF drop card, favourites and categories`.

### Task A2-6: Category hubs and the PDF hub

**Files:**

- Create: `src/app/pages/Hub.tsx`, `src/app/pages/PdfHub.tsx`, `src/app/pages/hub/HubDropZone.tsx`, `src/app/pages/hub/ToolChooser.tsx`, `src/app/pages/Hub.test.tsx`

**Interfaces:**

```tsx
export function Hub({ category }: { category: CategoryDef }): JSX.Element;
// HubLayout: icon, label, blurb; DropZone when category.fileBased (HubDropZone);
// groups from category.groups else one alphabetical group; cross-listed tools (alsoIn includes this category) shown with tag = their category id.
export function HubDropZone({
  category,
}: {
  category: CategoryDef;
}): JSX.Element;
// onFiles -> routeDrop; navigate: putHandoff(files) then navigate(`${path}?handoff=${id}`);
// choose: ToolChooser (Popover anchored to the drop zone, label "Choose a tool for these files", one Button per option);
// error: inline Alert (variant danger) with error.message, dismissible.
export function PdfHub(): JSX.Element; // A2: Hub for 'pdf' with groups Quick tasks / More PDF tools. B adds the modes grid and workspace routing.
```

- [ ] **Step 1: Tests** — text hub shows 3 tools; security hub shows Protect and Unlock with tag "pdf"; dropping 2 PDFs on the PDF hub navigates to `/pdf/merge?handoff=...`; dropping one CSV on the data hub navigates to `/data/csv?handoff=`; dropping a PNG on the text hub shows the inline error.
- [ ] **Step 2: Implement; commit** — `feat(app): one HubLayout for every category; drop routing with chooser and handoff`.

### Task A2-7: Global Mod+K sources

**Files:**

- Create: `src/app/commands/app-commands.ts` (+ `.test.ts`)
- Modify: `src/app/shell/AppFrame.tsx`

**Interfaces:**

```ts
export function routeCommands(navigate: (path: string) => void): CommandSource; // Home, each category hub ("Go to PDF")
export function toolCommands(
  navigate: (path: string) => void,
  tools: ToolManifest[],
): CommandSource; // label = tool name, keywords = tool keywords + description words, group 'Tools', icon = tool icon
export function favouriteCommands(
  navigate: (path: string) => void,
  favs: () => string[],
  tools: ToolManifest[],
): CommandSource; // group 'Favourites'
export function themeCommands(
  setPreference: (p: ThemePreference) => void,
): CommandSource; // 'Use light theme' etc., group 'Settings'
```

- [ ] **Step 1: Tests** — querying "regex" returns "Regex Tester" first; "pdf" returns the PDF hub route and PDF tools; empty query lists favourites group first when present.
- [ ] **Step 2: Wire in AppFrame** with `useCommands`; Mod+K opens the palette everywhere (`useCommandPaletteHotkey`). Commit — `feat(app): Mod+K sources for routes, tools, favourites and theme`.

### Task A2-8: Rule (b) `local/no-raw-ui-outside-kit`

**Files:**

- Create: `eslint-rules/no-raw-ui-outside-kit.js` (+ `.test.js`)
- Modify: `eslint-rules/index.js` (register; not yet enabled in `eslint.config.js` until A2-12)

**Interfaces:** rule `no-raw-ui-outside-kit`; options none; skips files under `src/shared/ui/` and `**/*.test.{ts,tsx}` (G1).

- [ ] **Step 1: Failing tests**

```js
const SVG_CHILDREN = [
  'svg',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'g',
  'defs',
  'use',
  'text',
  'tspan',
  'mask',
  'clipPath',
  'pattern',
  'linearGradient',
  'radialGradient',
  'stop',
  'marker',
  'symbol',
  'foreignObject',
  'image',
];
tester.run('no-raw-ui-outside-kit', rule, {
  valid: [
    {
      code: `const a = <Button>Go</Button>;`,
      filename: 'src/tools/x/Tool.tsx',
    },
    {
      code: `const a = <div className="flex" />;`,
      filename: 'src/tools/x/Tool.tsx',
    },
    {
      code: `const a = <button style={{}} />;`,
      filename: 'src/shared/ui/button.tsx',
    },
    { code: `const a = <button />;`, filename: 'src/tools/x/Tool.test.tsx' },
    {
      code: `const a = React.createElement('div');`,
      filename: 'src/tools/x/Tool.tsx',
    },
    {
      code: `const a = <Input type="text" />;`,
      filename: 'src/tools/x/Tool.tsx',
    },
  ],
  invalid: [
    ...[
      'button',
      'input',
      'select',
      'textarea',
      'svg',
      'img',
      'canvas',
      'video',
      'audio',
      'iframe',
    ].map((t) => ({
      code: `const a = <${t} />;`,
      filename: 'src/tools/x/Tool.tsx',
      errors: [{ messageId: 'element', data: { name: t } }],
    })),
    {
      code: `const a = <path d="M0 0" />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'element', data: { name: 'path' } }],
    },
    {
      code: `const a = <div style={{ width: 3 }} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = <Box style={s} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = <div {...{ style: s }} />;`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'style' }],
    },
    {
      code: `const a = React.createElement('svg');`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'element', data: { name: 'svg' } }],
    },
    {
      code: `const a = createElement('canvas', null);`,
      filename: 'src/app/a.tsx',
      errors: [{ messageId: 'element', data: { name: 'canvas' } }],
    },
    {
      code: `const el = document.createElement('canvas');`,
      filename: 'src/pdf/components/x.ts',
      errors: [{ messageId: 'dom', data: { name: 'canvas' } }],
    },
  ],
});
```

`document.createElement` of banned tags in UI modules is banned too (the canvas must come from `BitmapCanvas`); workers use `OffscreenCanvas`, which is not an element and stays allowed.

- [ ] **Step 2: Implement**

```js
// @ts-check
const BANNED = new Set([
  'button',
  'input',
  'select',
  'textarea',
  'svg',
  'img',
  'canvas',
  'video',
  'audio',
  'iframe',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'g',
  'defs',
  'use',
  'text',
  'tspan',
  'mask',
  'clipPath',
  'pattern',
  'linearGradient',
  'radialGradient',
  'stop',
  'marker',
  'symbol',
  'foreignObject',
  'image',
]);
const exempt = (f) =>
  /[\\/]src[\\/]shared[\\/]ui[\\/]/.test(f) ||
  /^src[\\/]shared[\\/]ui[\\/]/.test(f) ||
  /\.test\.(ts|tsx)$/.test(f);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    messages: {
      element:
        'Raw <{{name}}> outside src/shared/ui. Use or add a kit component (spec 1A R2).',
      style:
        'style props live only in src/shared/ui (Positioned, OverlayLayer, BitmapCanvas, ...). Use a kit primitive (spec 1A R2).',
      dom: 'document.createElement("{{name}}") outside src/shared/ui. Use a kit component (spec 1A R2).',
    },
    schema: [],
  },
  create(context) {
    if (exempt(context.filename)) return {};
    return {
      JSXOpeningElement(node) {
        // @ts-expect-error JSX node
        const n = node.name;
        if (
          n.type === 'JSXIdentifier' &&
          /^[a-z]/.test(n.name) &&
          BANNED.has(n.name)
        )
          context.report({
            node,
            messageId: 'element',
            data: { name: n.name },
          });
        // @ts-expect-error JSX node
        for (const attr of node.attributes) {
          if (attr.type === 'JSXAttribute' && attr.name.name === 'style')
            context.report({ node: attr, messageId: 'style' });
          if (
            attr.type === 'JSXSpreadAttribute' &&
            attr.argument.type === 'ObjectExpression' &&
            attr.argument.properties.some(
              (p) =>
                p.type === 'Property' &&
                (p.key.name === 'style' || p.key.value === 'style'),
            )
          )
            context.report({ node: attr, messageId: 'style' });
        }
      },
      CallExpression(node) {
        const c = node.callee;
        const arg = node.arguments[0];
        const tag =
          arg?.type === 'Literal' && typeof arg.value === 'string'
            ? arg.value
            : null;
        if (!tag || !BANNED.has(tag)) return;
        const name =
          c.type === 'Identifier'
            ? c.name
            : c.type === 'MemberExpression' && c.property.type === 'Identifier'
              ? c.property.name
              : '';
        const obj =
          c.type === 'MemberExpression' && c.object.type === 'Identifier'
            ? c.object.name
            : '';
        if (name === 'createElement' && obj === 'document')
          context.report({ node, messageId: 'dom', data: { name: tag } });
        else if (name === 'createElement')
          context.report({ node, messageId: 'element', data: { name: tag } });
      },
    };
  },
};
```

- [ ] **Step 3: Commit** — `feat(lint): no-raw-ui-outside-kit rule (registered, enabled in A2-12)`.

### Task A2-9: Kit primitives for media and inputs the legacy code needs

**Files:**

- Create: `src/shared/ui/bitmap-canvas.tsx`, `image.tsx`, `color-input.tsx`, `date-input.tsx`, `signature-pad.tsx`, `positioned.tsx`, `media.test.tsx`
- Modify: `src/shared/ui/index.ts`, `src/shared/ui/select.tsx` (add `NativeSelect` only if `Select` cannot express the regex-tester flags picker; prefer `Select`)

**Interfaces:**

```tsx
export interface BitmapCanvasProps {
  bitmap: ImageBitmap | null; // drawn on change; keeps last pixels when it becomes null (phase-1 note N2)
  width: number;
  height: number; // CSS px box
  label: string; // role="img" aria-label
  rotation?: 0 | 90 | 180 | 270; // CSS transform of the drawn bitmap
  className?: string;
  onDrawn?(): void; // after a successful draw; sets data-rendered="true" (e2e contract)
  'data-testid'?: string;
}
export interface ImageProps {
  src: Blob | Uint8Array | string; // Blob/bytes -> object URL created and revoked on change/unmount (useObjectUrl)
  mime?: string; // for bytes
  alt?: string;
  decorative?: boolean; // exactly one: alt text or decorative (alt="")
  fit?: 'contain' | 'cover';
  aspect?: number;
  className?: string;
}
export function ColorInput(props: {
  label: string;
  value: string;
  onChange(hex: string): void;
  disabled?: boolean;
}): JSX.Element; // swatch button + native color input owned by kit + hex text field, validates /^#[0-9a-f]{6}$/i
export function DateInput(props: {
  label: string;
  value: string;
  onChange(iso: string): void;
  min?: string;
  max?: string;
}): JSX.Element; // kit-owned <input type="date"> styled
export interface SignaturePadProps {
  width: number;
  height: number;
  label: string; // "Signature drawing area"
  ink: string; // token or hex
  strokeWidth?: number; // CSS px
  value: Stroke[]; // controlled strokes (pdf/sign/stroke Point[][] in pad px)
  onChange(strokes: Stroke[]): void;
  disabled?: boolean;
}
// owns the <canvas>; pointer events with capture; draws strokePath(points) per stroke; keyboard users use the Type/Upload tabs (spec §4.6).
// P5-H extends Stroke points with pressure/tilt/time and swaps the renderer (same component).
export function Positioned(props: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotate?: number;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}): JSX.Element; // absolute box in the parent's CSS px space
```

- [ ] **Step 1: Tests** (jsdom; mock canvas context with `vi.fn()` methods): BitmapCanvas calls `drawImage` once per new bitmap, keeps pixels when bitmap becomes null, sets `data-rendered="true"` after draw; Image revokes its object URL on unmount (`URL.revokeObjectURL` spy) and requires alt or decorative (TypeScript discriminated props: `{ alt: string } | { decorative: true }`); ColorInput rejects `#12` and accepts `#a1b2c3`; SignaturePad pointerdown/move/up emits one stroke with >= 2 points.
- [ ] **Step 2: Implement; commit** — `feat(kit): BitmapCanvas, Image, ColorInput, DateInput, SignaturePad, Positioned`.

### Task A2-10: Kit adapters (Chart, FlowCanvas, RivePlayer, QrCode, CodeEditor)

**Files:**

- Create: `src/shared/ui/adapters/Chart.tsx`, `FlowCanvas.tsx`, `RivePlayer.tsx`, `QrCode.tsx`, `CodeEditor.tsx`, `adapters/theme-colors.ts`, `adapters/adapters.test.tsx`
- Modify: `src/shared/ui/index.ts` (export adapters)

**Interfaces:**

```ts
// theme-colors.ts — reads resolved token values for libraries that need literal colours
export function tokenColor(
  name:
    | 'fg'
    | 'fg-muted'
    | 'line'
    | 'surface'
    | 'accent'
    | 'danger'
    | 'info'
    | 'warning'
    | 'canvas',
): string; // getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
export function useTokenColors<T extends string>(
  names: readonly T[],
): Record<T, string>; // re-reads on theme change (useTheme)
```

```tsx
export function Chart(props: {
  data: Plotly.Data[];
  layout?: Partial<Plotly.Layout>;
  label: string;
  className?: string;
}): JSX.Element;
// wraps react-plotly.js (CJS default unwrap from P4-D), applies paper/plot bg, font, grid colours from tokens, re-renders on theme change, config { displaylogo: false, responsive: true }.
export function FlowCanvas(
  props: ReactFlowProps & { label: string },
): JSX.Element; // @xyflow/react with colorMode from theme, token CSS vars for edges/nodes, <Background> using --line
export function RivePlayer(props: {
  buffer: ArrayBuffer;
  stateMachines?: string[];
  animations?: string[];
  autoplay?: boolean;
  label: string;
  onLoad?(rive: Rive): void;
  onLoadError?(e: unknown): void;
  className?: string;
}): JSX.Element; // owns the canvas via @rive-app/react-canvas useRive
export function QrCode(props: {
  value: string;
  size: number;
  level: 'L' | 'M' | 'Q' | 'H';
  fg: string;
  bg: string;
  label: string;
  imageSettings?: {
    src: string;
    width: number;
    height: number;
    excavate: boolean;
  };
  format: 'svg' | 'canvas';
  onRef?(el: SVGSVGElement | HTMLCanvasElement | null): void;
}): JSX.Element;
export function CodeEditor(props: {
  value: string;
  language: string;
  onChange(v: string): void;
  label: string;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}): JSX.Element; // @uiw/react-textarea-code-editor with data-color-mode from theme
```

- [ ] **Step 1: Smoke tests** (jsdom, libraries mocked with `vi.mock` where they need canvas/WebGL): each adapter renders with an accessible label (`role="img"` or `region` with `aria-label`) and passes theme colours (assert the mocked component received token values).
- [ ] **Step 2: Implement; commit** — `feat(kit): themed adapters for Plotly, React Flow, Rive, QR code and the code editor`.

### Task A2-11: Rule-(b) fixes in `src/app`, `src/pdf/components` and PDF tools

**Files:**

- Modify: `src/pdf/components/PageThumb.tsx` (canvas -> `BitmapCanvas`, keep `data-rendered`), `PdfPagePreview.tsx` (canvas -> `BitmapCanvas`), `PageGrid.tsx` (style grid columns -> `AutoGrid` or a kit `Grid` with `columns` prop; raw checkbox input -> kit `Checkbox`), `FileThumb.tsx` (style -> `Positioned`/kit popover `Popover`), `upright-jpeg` consumers (`img` -> kit `Image`), `src/tools/images-to-pdf/components/ImageThumb.tsx` (`Image`), `src/tools/pdf-sign/*` (canvas -> `SignaturePad`/`BitmapCanvas`; img -> `Image`; style -> `Positioned`), `src/tools/pdf-fill-form/components/FieldControl.tsx` (raw input -> kit `Input`/`Checkbox`), `src/app/Footer.tsx` (svg -> icon)

- [ ] **Step 1:** Enable the rule locally for the touched scopes to list violations: `pnpm exec eslint --rule "local/no-raw-ui-outside-kit: error" src/app src/pdf src/tools/pdf-* src/tools/images-to-pdf`.
- [ ] **Step 2:** Replace each hit with the kit primitive named above. Keep every accessible name and `data-rendered` contract so existing PDF e2e specs keep passing.
- [ ] **Step 3:** `pnpm test` + the PDF e2e specs (`pnpm test:e2e test/e2e/pdf-*.spec.ts`) green. Commit — `refactor(pdf): kit-only UI in PDF components and tools (BitmapCanvas, Image, SignaturePad, AutoGrid)`.

### Task A2-12: Rule-(b) fixes in legacy tools; token and variant codemod; enable rule (b)

**Files:**

- Modify: legacy tools with violations (at `d7c64bb`: `json-and-xml-viewer/components/DataNode.tsx` buttons -> `Button`/`IconButton`; `image-optimizer` img -> `Image`; `rive-animation-player` canvas -> `RivePlayer`; `regex-tester` select -> `Select`; `csv-viewer` svg -> icon; `date-calculator` input -> `DateInput`; `color-tester` input -> `ColorInput`; `style` props in `api-request`, `calculator/GraphDisplay` (-> `Chart`), `color-tester` (-> `Swatch`), `csv-viewer`, `json-and-xml-viewer` (DataNode indent -> new kit `Box` prop `indent={depth}` in `layout.tsx`), `DataFlow` (-> `FlowCanvas`), `jwt-decode`, `log-parser`, `password-generator` (strength bar -> kit `Progress` with tone), `regex-tester` (highlight colours -> kit `Highlight` span component with `tone` prop), `qr-code-generator` (-> `QrCode`, `CodeEditor`)
- Modify: `eslint.config.js` (`'local/no-raw-ui-outside-kit': 'error'`), `src/theme/tokens.css` (remove legacy aliases), `src/shared/ui/button-variants.ts` (remove `solid`, `soft`, `outline`, `xs`)
- Create (kit, as needed by the above): `src/shared/ui/highlight.tsx` (`<Highlight tone="accent|info|warning|danger" index?: number>` mark element using token soft backgrounds), `layout.tsx` `Box` gains `indent?: number` (padding-left = indent \* 16px, kit-owned style)

- [ ] **Step 1: Codemods** (scripted with a throwaway Node script in the scratchpad, results reviewed): replace class tokens `surface-subtle` -> `surface-2`, `surface-strong` -> `surface-3`, `accent-hover` -> `accent`, `accent-dim` -> `accent-soft`, `danger-dim` -> `danger-soft`, `text-success` -> `text-accent-fg`, `fg-faint` -> `fg-subtle`; Button/IconButton `variant="solid"` -> `"primary"`, `"soft"`/`"outline"` -> `"secondary"`, `size="xs"` -> `"sm"`. Badge has its own variants (`soft`, `solid`, `line`): rename Badge variants to `neutral | accent | danger | warning | info` with an explicit mapping in `badge.tsx` and codemod usages (`soft` -> `neutral`, `solid` -> `accent`, `line` -> `neutral` with `outline` prop).
- [ ] **Step 2: Fix every rule-(b) hit** listed above with kit components; add the two small kit primitives. Every replaced Plotly/React Flow/Rive/QR/code editor usage goes through the adapters from A2-10, so colours follow the theme (spec §16 step 3).
- [ ] **Step 3: Enable** rule (b) at `error`; delete aliases. `pnpm lint` -> 0; `pnpm typecheck` -> 0 (Badge/Button variant types catch stragglers).
- [ ] **Step 4: Commit** — `refactor(tools)!: kit-only UI in all legacy tools; rule (b) at error; token and variant aliases removed`.

### Task A2-13: Handoff in file-accepting tools

**Files:**

- Modify: `src/tools/{csv-viewer,json-and-xml-viewer,text-diff-checker,log-parser,base64-converter,hash-generator,image-optimizer,rive-animation-player}/Tool.tsx` (or their hooks after P4-E), the 8 PDF quick tasks and the 6 interim PDF tools (`PdfDropzone` gains `initialFiles?: File[]`)

**Interfaces:**

- Consumes: `useHandoffFiles(onFiles)` from A2-2; each tool routes handed files into the same code path its own file picker uses (no second path).
- Produces: `PdfDropzone` prop `initialFiles?: File[]` processed once on mount through the existing load + password flow.

- [ ] **Step 1: e2e** (`test/e2e/handoff.spec.ts`): drop `test/fixtures/generated/sample.csv` (add to `gen-fixtures.ts`: 3-row CSV) on `/data` -> lands on `/data/csv` with the table showing 3 rows and the URL has no `handoff` param after load; two PDFs on `/pdf` -> `/pdf/merge` lists both files; a PNG on `/media` -> image optimizer shows it.
- [ ] **Step 2: Implement; commit** — `feat(tools): file-accepting tools read hub handoffs`.

### Task A2-14: E2E rewrite to the new routes

**Files:**

- Modify: `test/e2e/*.spec.ts` (every `page.goto('/<id>')` -> `toolPath`), `test/e2e/global-setup.ts` (warm routes from `tool-routes.ts` paths; "Loading {name}" text now from `LoadingState`), `test/e2e/legacy-tools.spec.ts`
- Create: `test/e2e/route-table.spec.ts`

- [ ] **Step 1: Route table spec** generated from the registry (spec §15): for each enabled tool, Home -> category card -> hub -> tool card -> `h1` equals tool name; URL equals `toolPath`. Also: every hub `/<category>` renders `h1` = label; `/pdf/edit` is not yet a route in A2 (NotFound) — this assertion flips in B.
- [ ] **Step 2: Update all specs; run** `pnpm test:e2e` three times green. Commit — `test(e2e): route table from the registry; specs on clean-break routes`.

### Task A2-15: Visual suite for Home, hubs, tool pages, NotFound

**Files:**

- Create: `test/visual/app.visual.ts`

- [ ] **Step 1:** For `light` and `dark` at desktop 1280x800: `/`, `/text` (hub template), `/pdf` (PDF hub), `/regex-tester` (NotFound), and each of the 30 tool pages at `toolPath` (desktop only, spec §16 step 5). Phone 390x844 for `/`, `/pdf`, `/text`. Mask `[data-dynamic]` (Footer build stamp, pomodoro timer digits, random data output, password output, QR random seed). axe on each page.
- [ ] **Step 2:** Generate baselines (`--update-snapshots`), review each PNG for glyphs and contrast, commit. Commit — `test(visual): Home, hubs, tool pages and NotFound in both themes`.

### Task A2-16: P5-A2 verification

- [ ] `git grep -nE "Dashboard|ToolLayout|terminal\.css|AnimatedBackground" src test` -> no hits.
- [ ] Merge gate 1-6 (visual: A1 gallery + A2 suite).
- [ ] PR description: route table, interim slugs (G19), deletions, rule (b) on, codemods, adapters.

## PR boundary A2 — IA and kit-only UI

| Check                                              | Evidence                       |
| -------------------------------------------------- | ------------------------------ |
| All four rules enforced repo-wide, zero violations | `pnpm lint`                    |
| Route table e2e                                    | `test/e2e/route-table.spec.ts` |
| Visual suite Home/hubs/tool pages, both themes     | `pnpm test:visual`             |
| Old URLs give NotFound (no redirects)              | `smoke.spec.ts`                |
| lint/typecheck 0, e2e x3                           | gate                           |

---

# Part P5-B — Workspace core and Organize mode (PR: `feat/p5-b-workspace-core`)

**Scope (spec §6, §7, §12, §13, §14, §17 row B):** `pdf/doc` (op log, page map, registry, view fold, materialise, checkpoints, summary), edit worker, `storage.ts` + autosave/restore + recent documents, WorkspaceShell (Standard/Focus/phone), ModeTabs/Dock, Toolbar/Palette, PageRail, DocumentViewport (zoom, virtualisation, tiles), Inspector, overlay kit primitives, mode icon family, ExportDialog with summary, Organize mode (all v1 ops), encrypted open; `pdf/edit/draw.ts` foundation (G21); delete `pdf-organize`. Creates the append-only registries listed in the parallelisation section.

### Task B-1: `ToolError` codes and the IndexedDB helper

**Files:**

- Modify: `src/shared/lib/errors.ts` (+ test), `src/shared/ui/states.tsx` (titles exist from A1-13), `package.json` (dev: `fake-indexeddb`)
- Create: `src/shared/lib/storage.ts`, `src/shared/lib/storage.test.ts`

**Interfaces:**

```ts
// errors.ts
export type ToolErrorCode = /* existing */
  | 'STORAGE_FULL'
  | 'VERIFICATION_FAILED'
  | 'NETWORK';
// storage.ts
export interface IdbSchema {
  name: string;
  version: number;
  stores: readonly string[];
}
export interface IdbStore {
  get<T>(store: string, key: string): Promise<T | undefined>;
  put(store: string, key: string, value: unknown): Promise<void>;
  delete(store: string, key: string): Promise<void>;
  deletePrefix(store: string, prefix: string): Promise<number>;
  keys(store: string, prefix?: string): Promise<string[]>;
  getAll<T>(store: string): Promise<{ key: string; value: T }[]>;
  /** One transaction across stores; `fn` must only queue requests (no awaits on other promises). */
  write(
    stores: string[],
    fn: (tx: {
      put(store: string, key: string, value: unknown): void;
      delete(store: string, key: string): void;
    }) => void,
  ): Promise<void>;
  close(): void;
}
export function openIdb(
  schema: IdbSchema,
  factory?: IDBFactory,
): Promise<IdbStore>;
export const WORKSPACE_DB: IdbSchema; // { name: 'tools-workspace', version: 1, stores: ['documents', 'blobs', 'logs', 'profile'] }
export function isQuotaError(e: unknown): boolean;
export async function estimateQuota(): Promise<{
  usage: number;
  quota: number;
} | null>;
export async function requestPersistence(): Promise<boolean>;
```

- [ ] **Step 1: Failing tests** (`storage.test.ts`, `import 'fake-indexeddb/auto'` at top; pass `indexedDB` explicitly): put/get round trip of a `Blob` and a plain object; `deletePrefix('blobs', 'd1/')` deletes `d1/ckpt/0` and `d1/asset/a` but not `d10/ckpt/0` (the prefix range is `IDBKeyRange.bound(prefix, prefix + String.fromCharCode(0xffff))`); `write` with two stores commits atomically (throwing inside `fn` aborts both); a quota failure (simulate by wrapping `put` to throw `new DOMException('full', 'QuotaExceededError')`) rejects with `ToolError` code `STORAGE_FULL` and message "Your browser's storage is full. Clear old documents to keep saving locally."; `openIdb` rejection (factory that errors) rejects with `UNKNOWN` "Local storage is not available in this browser".
- [ ] **Step 2: Implement**

```ts
import { ToolError } from './errors';

export const WORKSPACE_DB = {
  name: 'tools-workspace',
  version: 1,
  stores: ['documents', 'blobs', 'logs', 'profile'],
} as const;
const FULL =
  "Your browser's storage is full. Clear old documents to keep saving locally.";

export function isQuotaError(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(
      (e as { name?: string }).name ?? '',
    )
  );
}
const mapError = (e: unknown) =>
  isQuotaError(e)
    ? new ToolError('STORAGE_FULL', FULL, { cause: e })
    : new ToolError('UNKNOWN', 'Saving on this device failed', { cause: e });

const req = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(mapError(r.error));
  });
const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(mapError(tx.error));
    tx.onabort = () =>
      reject(mapError(tx.error ?? new DOMException('Aborted', 'AbortError')));
  });
const upper = (prefix: string) => prefix + String.fromCharCode(0xffff);

export async function openIdb(
  schema: IdbSchema,
  factory: IDBFactory = globalThis.indexedDB,
): Promise<IdbStore> {
  let db: IDBDatabase;
  try {
    const open = factory.open(schema.name, schema.version);
    open.onupgradeneeded = () => {
      for (const s of schema.stores)
        if (!open.result.objectStoreNames.contains(s))
          open.result.createObjectStore(s);
    };
    db = await req(open);
  } catch (cause) {
    throw new ToolError(
      'UNKNOWN',
      'Local storage is not available in this browser',
      { cause },
    );
  }
  const store = (name: string, mode: IDBTransactionMode) =>
    db.transaction(name, mode).objectStore(name);
  return {
    get: (s, k) => req(store(s, 'readonly').get(k)),
    async put(s, k, v) {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).put(v, k);
      await done(tx);
    },
    async delete(s, k) {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).delete(k);
      await done(tx);
    },
    async deletePrefix(s, prefix) {
      const tx = db.transaction(s, 'readwrite');
      const range = IDBKeyRange.bound(prefix, upper(prefix));
      const n = await req(tx.objectStore(s).count(range));
      tx.objectStore(s).delete(range);
      await done(tx);
      return n;
    },
    keys: async (s, prefix) =>
      (
        await req(
          store(s, 'readonly').getAllKeys(
            prefix ? IDBKeyRange.bound(prefix, upper(prefix)) : undefined,
          ),
        )
      ).map(String),
    async getAll(s) {
      const os = store(s, 'readonly');
      const [keys, values] = await Promise.all([
        req(os.getAllKeys()),
        req(os.getAll()),
      ]);
      return keys.map((key, i) => ({ key: String(key), value: values[i] }));
    },
    async write(stores, fn) {
      const tx = db.transaction(stores, 'readwrite');
      try {
        fn({
          put: (s, k, v) => void tx.objectStore(s).put(v, k),
          delete: (s, k) => void tx.objectStore(s).delete(k),
        });
      } catch (e) {
        tx.abort();
        throw e;
      }
      await done(tx);
    },
    close: () => db.close(),
  };
}

export async function estimateQuota() {
  try {
    const e = await navigator.storage?.estimate?.();
    return e && e.quota ? { usage: e.usage ?? 0, quota: e.quota } : null;
  } catch {
    return null;
  }
}
export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
```

(`IdbSchema`/`IdbStore` declared above the functions as in Interfaces.)

- [ ] **Step 3: Commit** — `feat(shared): STORAGE_FULL, VERIFICATION_FAILED and NETWORK codes; IndexedDB helper`.

### Task B-2: Document types, op registry, page map and page geometry

**Files:**

- Create: `src/pdf/doc/types.ts`, `src/pdf/doc/registry.ts`, `src/pdf/doc/page-map.ts`, `src/pdf/doc/view.ts`, `src/pdf/doc/geometry.ts`, `src/pdf/doc/ops/organize.ts`, `src/pdf/doc/ops/index.ts`, tests `registry.test.ts`, `page-map.test.ts`, `geometry.test.ts`
- Modify: `src/pdf/render/types.ts` (`PageInfo` gains `view` and `rotate`), `src/pdf/render/page-sizes.ts` (fill them)

**Interfaces:**

```ts
// types.ts
import type { Rotation } from '@/pdf/edit';
export type SourceId = string;
export type CheckpointId = string;
export type AssetId = string;
export type PageId = string;
export type OpId = string;
export type ModeId =
  | 'organize'
  | 'edit'
  | 'annotate'
  | 'fill-sign'
  | 'redact'
  | 'convert'
  | 'protect'
  | 'optimize'
  | 'ocr';
/** PDF user space, unrotated, points; origin wherever the page's user space puts it (usually MediaBox lower-left). */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface PageGeom {
  view: [number, number, number, number];
  rotate: Rotation;
} // pdf.js page.view and page.rotate
export interface SourceRef {
  id: SourceId;
  name: string;
  byteSize: number;
  pageCount: number;
  pages: PageGeom[];
  origin: 'checkpoint' | 'merged';
}
export interface CheckpointReport {
  title: string;
  lines: string[];
  warnings: string[];
  rasterisedPages?: number[];
}
export interface CheckpointMeta {
  id: CheckpointId;
  index: number;
  sourceId: SourceId;
  opId: OpId | null;
  byteSize: number;
  pageCount: number;
  createdAt: number;
  report?: CheckpointReport;
  available: boolean;
}
export interface PageRef {
  id: PageId;
  source: SourceId;
  index: number; // index within the source
  rotate: Rotation; // pending rotation added to the source page's own /Rotate
  crop?: Box; // pending CropBox in page space
  size?: { width: number; height: number }; // pending resize (MediaBox), points
  blank?: { width: number; height: number }; // inserted blank page (source/index ignored)
}
export interface PageLabelRange {
  start: number;
  style: 'D' | 'r' | 'R' | 'a' | 'A' | null;
  prefix?: string;
  first?: number;
}
export interface OverlayItem {
  opId: OpId;
  type: string;
  pageId: PageId | null;
  params: unknown;
}
export interface DocView {
  checkpoint: CheckpointId;
  pages: readonly PageRef[];
  overlays: ReadonlyMap<PageId, readonly OverlayItem[]>; // page-scoped overlay ops, log order
  docOverlays: readonly OverlayItem[]; // pageId null (metadata, protect, labels...)
  pageLabels: readonly PageLabelRange[] | null;
  hidden: ReadonlySet<OpId>; // overlay ops removed by later ops (e.g. annot.delete of a pending annot)
}
export interface Operation<P = unknown> {
  id: OpId;
  type: string;
  v: number;
  params: P;
  at: number;
  label: string;
  group?: string;
  checkpoint?: CheckpointId;
}
export interface NewOperation<P = unknown> {
  type: string;
  params: P;
}
// registry.ts
export type OpKind = 'structure' | 'overlay' | 'checkpoint';
export interface LabelContext {
  pageNumber(id: PageId): number | null;
  pageCount: number;
}
export interface OperationDefinition<P = unknown> {
  type: string;
  v: number;
  kind: OpKind;
  mode: ModeId;
  label(p: P, ctx: LabelContext): string; // plain words, no glyphs
  summarize?(ops: P[]): string; // grouped export summary for this type
  applyToView?(view: DocView, p: P, op: Operation<P>): DocView; // required for structure/overlay
  validate(p: unknown): P; // throws ToolError INVALID_INPUT
}
export function defineOperation<P>(
  d: OperationDefinition<P>,
): OperationDefinition<P>;
export function registerOperations(
  defs: readonly OperationDefinition<any>[],
): void; // idempotent per type+v; conflicting redefinition throws
export function getOperation(type: string): OperationDefinition; // throws INVALID_INPUT "This document uses an edit this version does not know (type)"
export function allOperations(): OperationDefinition[];
// page-map.ts (pure helpers used by ops)
export function baseView(
  checkpoint: CheckpointMeta,
  source: SourceRef,
): DocView; // page ids `${checkpoint.id}:${i}`
export function pageNumberOf(view: DocView, id: PageId): number | null; // 1-based
export function withPages(view: DocView, pages: PageRef[]): DocView;
export function withOverlay(view: DocView, item: OverlayItem): DocView; // copy-on-write per page
export function effectiveRotation(
  page: PageRef,
  source: SourceRef | undefined,
): Rotation;
// view.ts
export function foldView(base: DocView, ops: readonly Operation[]): DocView; // reduce with getOperation(type).applyToView
// geometry.ts — mirrors pdf.js PageViewport so overlays line up with renders
export interface Viewport {
  width: number;
  height: number;
  transform: [number, number, number, number, number, number];
}
export function pageViewport(
  geom: PageGeom,
  extraRotate: Rotation,
  scale: number,
  crop?: Box,
): Viewport;
export function toScreen(vp: Viewport, x: number, y: number): [number, number];
export function toPage(vp: Viewport, sx: number, sy: number): [number, number];
export function boxToScreen(
  vp: Viewport,
  b: Box,
): { left: number; top: number; width: number; height: number };
export function screenRectToBox(
  vp: Viewport,
  r: { left: number; top: number; width: number; height: number },
): Box;
```

- [ ] **Step 1: Render geometry.** `page-sizes.ts` already reads each page; add `view: page.view as [n,n,n,n]` and `rotate: page.rotate` to `PageInfo`. Update `page-sizes.test.ts` expectations (a rotated fixture `makeRotatedPdf` gives `rotate: 90`).
- [ ] **Step 2: Failing geometry test** (`geometry.test.ts`): for `view=[0,0,612,792]`, rotations 0/90/180/270 and scale 1.5, `toScreen` equals pdf.js `new PageViewport({ viewBox, scale, rotation }).convertToViewportPoint(x, y)` for points (0,0), (612,792), (100,700) — import `PageViewport` from `pdfjs-dist` in the test (runs in Node); round trip `toPage(toScreen(p)) ~= p`; crop box `[100,100,300,400]` makes the viewport 200x300 at scale 1.
- [ ] **Step 3: Implement `pageViewport`** with pdf.js's formula:

```ts
export function pageViewport(
  geom: PageGeom,
  extraRotate: Rotation,
  scale: number,
  crop?: Box,
): Viewport {
  const [x0, y0, x1, y1] = crop
    ? [crop.x, crop.y, crop.x + crop.width, crop.y + crop.height]
    : geom.view;
  const rotation = (((geom.rotate + extraRotate) % 360) + 360) % 360;
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
  let a: number, b: number, c: number, d: number;
  switch (rotation) {
    case 90:
      a = 0;
      b = 1;
      c = 1;
      d = 0;
      break;
    case 180:
      a = -1;
      b = 0;
      c = 0;
      d = 1;
      break;
    case 270:
      a = 0;
      b = -1;
      c = -1;
      d = 0;
      break;
    default:
      a = 1;
      b = 0;
      c = 0;
      d = -1;
  }
  const w = x1 - x0,
    h = y1 - y0;
  const [width, height] =
    a === 0 ? [h * scale, w * scale] : [w * scale, h * scale];
  const offX = width / 2,
    offY = height / 2;
  return {
    width,
    height,
    transform: [
      a * scale,
      b * scale,
      c * scale,
      d * scale,
      offX - a * scale * cx - c * scale * cy,
      offY - b * scale * cx - d * scale * cy,
    ],
  };
}
export const toScreen = (
  vp: Viewport,
  x: number,
  y: number,
): [number, number] => {
  const [a, b, c, d, e, f] = vp.transform;
  return [a * x + c * y + e, b * x + d * y + f];
};
export const toPage = (
  vp: Viewport,
  sx: number,
  sy: number,
): [number, number] => {
  const [a, b, c, d, e, f] = vp.transform;
  const det = a * d - b * c;
  return [
    (d * (sx - e) - c * (sy - f)) / det,
    (-b * (sx - e) + a * (sy - f)) / det,
  ];
};
```

`boxToScreen` maps both corners and normalises min/max; `screenRectToBox` is its inverse.

- [ ] **Step 4: Failing registry + page-map tests.** Registry: registering the same definition twice is a no-op; registering a different object for the same type+v throws; `getOperation('nope')` throws INVALID_INPUT. Organize ops (all through `foldView`): reorder `{pageIds:['c:2'], to:0}` on 3 pages gives order c:2,c:0,c:1 and label "Move page 3 to position 1"; rotate `{pageIds:['c:0'], delta:90}` gives rotate 90 and label "Rotate page 1 clockwise" (`-90` "anticlockwise", 180 "Rotate page 1 by 180 degrees"; several pages "Rotate 3 pages clockwise"); deleting all pages passes `validate` (shape-only) but `applyToView` throws INVALID_INPUT "The document must keep at least one page" and `dispatch` surfaces it (tested in B-3); duplicate `{pageIds:['c:1'], newIds:['n1']}` inserts n1 after c:1 with same source/index/rotate; insertBlank `{at:1, newId:'b1', width:612, height:792}`; crop `{pageIds, box}`; resize `{pageIds, width, height}`; label `{ranges:[{start:0, style:'r'}, {start:2, style:'D', first:1}]}` sets `pageLabels`; mergeIn `{sourceId:'s2', at:3, newIds:['m0','m1']}` appends refs with `source:'s2'`, indexes 0..1. Unknown page id in any op -> INVALID_INPUT "Page no longer exists".
- [ ] **Step 5: Implement `page-map.ts`, `view.ts` and `ops/organize.ts`.** Example definition (the others follow the same pattern):

```ts
const plural = (n: number, one: string, many = `${one}s`) =>
  n === 1 ? one : many;
const pageList = (ids: PageId[], ctx: LabelContext) =>
  ids.length === 1
    ? `page ${ctx.pageNumber(ids[0]) ?? '?'}`
    : `${ids.length} pages`;
const ids = (v: unknown, what: string): PageId[] => {
  if (
    !Array.isArray(v) ||
    v.length === 0 ||
    !v.every((x) => typeof x === 'string')
  )
    throw new ToolError('INVALID_INPUT', `${what}: expected page ids`);
  return v;
};

export const rotatePages = defineOperation<{
  pageIds: PageId[];
  delta: 90 | -90 | 180;
}>({
  type: 'page.rotate',
  v: 1,
  kind: 'structure',
  mode: 'organize',
  validate(p) {
    const o = p as { pageIds: unknown; delta: unknown };
    if (![90, -90, 180].includes(o.delta as number))
      throw new ToolError(
        'INVALID_INPUT',
        'Rotation must be 90, -90 or 180 degrees',
      );
    return {
      pageIds: ids(o.pageIds, 'Rotate'),
      delta: o.delta as 90 | -90 | 180,
    };
  },
  label: (p, ctx) =>
    p.delta === 180
      ? `Rotate ${pageList(p.pageIds, ctx)} by 180 degrees`
      : `Rotate ${pageList(p.pageIds, ctx)} ${p.delta === 90 ? 'clockwise' : 'anticlockwise'}`,
  summarize: (ops) => {
    const n = new Set(ops.flatMap((o) => o.pageIds)).size;
    return `${n} ${plural(n, 'page')} rotated`;
  },
  applyToView(view, p) {
    const set = new Set(p.pageIds);
    requireAll(view, p.pageIds);
    return withPages(
      view,
      view.pages.map((pg) =>
        set.has(pg.id)
          ? { ...pg, rotate: normalizeRotation(pg.rotate + p.delta) }
          : pg,
      ),
    );
  },
});
```

`requireAll(view, ids)` throws INVALID_INPUT "Page no longer exists" for unknown ids. `deletePages.applyToView` throws when no page would remain. Also create `src/pdf/doc/ops/objects.ts` with the two generic overlay-object ops every later mode shares (both `noOutput: true`; they rewrite or hide their target in `applyToView`): `object.move { targetId: OpId; rect: Box; rotate?: number }` (label "Move object on page {n}") and `object.remove { targetId: OpId }` (label "Remove object on page {n}", adds the target to `view.hidden`). `OperationDefinition` gains `noOutput?: true` for overlay ops without a writer. `ops/index.ts` exports `ORGANIZE_OPS` and `registerCoreOperations()` which calls `registerOperations([...ORGANIZE_OPS])` (later Parts append their arrays here).

- [ ] **Step 6: Commit** — `feat(pdf-doc): document types, op registry, page map ops and pdf.js-equivalent page geometry`.

### Task B-3: `DocumentModel` — dispatch, groups, undo/redo, checkpoints, view memo

**Files:**

- Create: `src/pdf/doc/model.ts`, `src/pdf/doc/model.test.ts`

**Interfaces:**

```ts
export interface DocumentState {
  id: string;
  name: string;
  createdAt: number;
  sources: Record<SourceId, SourceRef>;
  checkpoints: CheckpointMeta[]; // [0] = original (decrypted) bytes
  log: Operation[];
  cursor: number; // log[0..cursor) applied
  encryptedInput: boolean;
  restricted: boolean; // owner-password-only input (spec §12)
  detection?: unknown; // DetectionCache from P5-C; not part of undo
}
export type HistoryEvent =
  | { kind: 'dispatch'; label: string; ops: Operation[] }
  | { kind: 'undo' | 'redo'; label: string }
  | { kind: 'checkpoint'; label: string; checkpoint: CheckpointMeta }
  | { kind: 'base-changed'; checkpoint: CheckpointMeta } // undo/redo crossed a checkpoint
  | { kind: 'dropped'; checkpoints: CheckpointMeta[]; sources: SourceId[] } // redo tail truncated: blobs to delete
  | { kind: 'renamed'; name: string };
export class DocumentModel {
  constructor(
    state: DocumentState,
    deps?: { now?: () => number; newId?: () => string },
  );
  subscribe(listener: (e: HistoryEvent) => void): () => void;
  getState(): DocumentState; // immutable snapshot; new object after every change
  getView(): DocView; // memoised (see Step 3)
  getVersion(): number; // increments on every change (useSyncExternalStore key)
  dispatch(ops: NewOperation | NewOperation[], label?: string): Operation[]; // throws ToolError on invalid; nothing applied then
  addSource(source: SourceRef): void; // merged-in file, before dispatching page.mergeIn
  commitCheckpoint(
    op: NewOperation,
    checkpoint: Omit<CheckpointMeta, 'index' | 'opId' | 'available'>,
    source: SourceRef,
    label?: string,
  ): Operation;
  canUndo(): boolean;
  canRedo(): boolean;
  undoLabel(): string | null;
  redoLabel(): string | null;
  undo(): HistoryEvent | null;
  redo(): HistoryEvent | null;
  currentCheckpoint(): CheckpointMeta;
  checkpointFor(cursor: number): CheckpointMeta;
  markUnavailable(ids: CheckpointId[]): void; // disk budget; limits undo (Step 4)
  rename(name: string): void;
  labelContext(): LabelContext;
}
```

- [ ] **Step 1: Failing tests** (`model.test.ts`; register organize ops in `beforeAll`): (1) dispatch rotate -> cursor 1, view rotate 90, event label "Rotate page 1 clockwise"; (2) undo -> cursor 0, view rotate 0, event `{kind:'undo', label:'Rotate page 1 clockwise'}`; redo restores; (3) grouped dispatch `[rotate p1, delete p2]` with label "Tidy pages" is one undo step and both ops carry the same `group`; (4) dispatch after undo truncates the redo tail; (5) invalid op (delete all pages) throws `INVALID_INPUT` and leaves cursor/log unchanged; (6) labels are computed at dispatch: rotate page 3, then move it to position 1: the first op's label still says "page 3"; (7) checkpoint: commit `optimize.repair`-like checkpoint op (register a test checkpoint definition with kind 'checkpoint') -> `currentCheckpoint().index === 1`, view pages are the new checkpoint's pages with fresh ids, event `checkpoint`; undo -> `base-changed` to checkpoint 0 and the view shows the pre-checkpoint fold (rotate still applied); redo -> `base-changed` to checkpoint 1; (8) undo past checkpoint then dispatch -> `dropped` lists checkpoint 1 and its source; (9) `markUnavailable(['ckpt0'])` -> `canUndo()` is false once the cursor sits just after the checkpoint op; (10) `getView()` returns the same object until a change (memo).
- [ ] **Step 2: Implement core**

```ts
export class DocumentModel {
  private state: DocumentState;
  private listeners = new Set<(e: HistoryEvent) => void>();
  private version = 0;
  private memo: {
    checkpoint: CheckpointId;
    upTo: number;
    view: DocView;
  } | null = null;
  private readonly now: () => number;
  private readonly id: () => string;

  constructor(
    state: DocumentState,
    deps: { now?: () => number; newId?: () => string } = {},
  ) {
    this.state = state;
    this.now = deps.now ?? Date.now;
    this.id = deps.newId ?? newId;
  }

  subscribe(l: (e: HistoryEvent) => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  getState() {
    return this.state;
  }
  getVersion() {
    return this.version;
  }
  private emit(e: HistoryEvent) {
    this.version++;
    for (const l of [...this.listeners]) l(e);
  }
  private set(patch: Partial<DocumentState>) {
    this.state = { ...this.state, ...patch };
  }

  /** Index of the last checkpoint op strictly before `cursor`, or -1 (base = checkpoint 0). */
  private lastCheckpointOp(cursor: number): number {
    for (let i = cursor - 1; i >= 0; i--)
      if (this.state.log[i].checkpoint) return i;
    return -1;
  }
  checkpointFor(cursor: number): CheckpointMeta {
    const i = this.lastCheckpointOp(cursor);
    const id =
      i < 0 ? this.state.checkpoints[0].id : this.state.log[i].checkpoint!;
    return this.state.checkpoints.find((c) => c.id === id)!;
  }
  currentCheckpoint() {
    return this.checkpointFor(this.state.cursor);
  }

  getView(): DocView {
    const { cursor, log } = this.state;
    const ckpt = this.currentCheckpoint();
    const start = this.lastCheckpointOp(cursor) + 1;
    // Extend the memo when only ops were appended in the same segment; otherwise fold from the base.
    if (
      this.memo &&
      this.memo.checkpoint === ckpt.id &&
      this.memo.upTo === cursor
    )
      return this.memo.view;
    let view: DocView;
    let from: number;
    if (
      this.memo &&
      this.memo.checkpoint === ckpt.id &&
      this.memo.upTo < cursor &&
      this.memo.upTo >= start
    ) {
      view = this.memo.view;
      from = this.memo.upTo;
    } else {
      view = baseView(ckpt, this.state.sources[ckpt.sourceId]);
      from = start;
    }
    view = foldView(view, log.slice(from, cursor));
    this.memo = { checkpoint: ckpt.id, upTo: cursor, view };
    return view;
  }

  labelContext(view = this.getView()): LabelContext {
    return {
      pageNumber: (id) => pageNumberOf(view, id),
      pageCount: view.pages.length,
    };
  }

  dispatch(input: NewOperation | NewOperation[], label?: string): Operation[] {
    const list = Array.isArray(input) ? input : [input];
    if (list.length === 0) return [];
    const group = list.length > 1 ? this.id() : undefined;
    // Validate and fold on a scratch view first: nothing changes unless every op applies.
    let view = this.getView();
    const ops: Operation[] = [];
    for (const n of list) {
      const def = getOperation(n.type);
      if (def.kind === 'checkpoint')
        throw new ToolError(
          'INVALID_INPUT',
          'Checkpoints run through runCheckpoint',
        );
      const params = def.validate(n.params);
      const op: Operation = {
        id: this.id(),
        type: def.type,
        v: def.v,
        params,
        at: this.now(),
        label: def.label(params, this.labelContext(view)),
        group,
      };
      view = def.applyToView ? def.applyToView(view, params, op) : view;
      ops.push(op);
    }
    if (group && label) ops[0] = { ...ops[0], label }; // the group's label lives on its first op
    const dropped = this.truncateTail();
    this.set({
      log: [...this.state.log.slice(0, this.state.cursor), ...ops],
      cursor: this.state.cursor + ops.length,
    });
    this.memo = {
      checkpoint: this.currentCheckpoint().id,
      upTo: this.state.cursor,
      view,
    };
    if (dropped) this.emit(dropped);
    this.emit({ kind: 'dispatch', label: ops[0].label, ops });
    return ops;
  }

  /** Drops log[cursor..] and the checkpoints/sources only they referenced. */
  private truncateTail(): HistoryEvent | null {
    const tail = this.state.log.slice(this.state.cursor);
    if (tail.length === 0) return null;
    const ids = new Set(
      tail.flatMap((o) => (o.checkpoint ? [o.checkpoint] : [])),
    );
    const dropped = this.state.checkpoints.filter((c) => ids.has(c.id));
    const mergedInTail = new Set(
      tail
        .filter((o) => o.type === 'page.mergeIn')
        .map((o) => (o.params as { sourceId: string }).sourceId),
    );
    const droppedSources = [...dropped.map((c) => c.sourceId), ...mergedInTail];
    const sources = { ...this.state.sources };
    for (const s of droppedSources) delete sources[s];
    this.set({
      checkpoints: this.state.checkpoints.filter((c) => !ids.has(c.id)),
      sources,
      log: this.state.log.slice(0, this.state.cursor),
    });
    return dropped.length || droppedSources.length
      ? { kind: 'dropped', checkpoints: dropped, sources: droppedSources }
      : null;
  }
}
```

Undo/redo step over a whole group: `undo()` moves the cursor back to the first index of the group of `log[cursor-1]`; `redo()` forward to the end of the group of `log[cursor]`. If the base checkpoint differs before/after, also emit `base-changed`. Labels: undo uses the group's first-op label. `commitCheckpoint` truncates the tail, appends one op with `checkpoint: meta.id`, pushes `{...meta, index: checkpoints.length, opId, available: true}`, adds the source, emits `checkpoint`. Undo limit with unavailable checkpoints: `canUndo()` is false when undoing `log[cursor-1]` would cross a checkpoint op whose previous checkpoint is `available: false`, or when `cursor === 0`.

- [ ] **Step 3: Run tests -> PASS; commit** — `feat(pdf-doc): DocumentModel with grouped undo/redo, checkpoint segments and a memoised view fold`.

### Task B-4: Change summary

**Files:**

- Create: `src/pdf/doc/summary.ts` (+ test)

**Interfaces:**

```ts
export interface ModeSummary {
  mode: ModeId;
  lines: string[];
} // one line per op type, plain words
export function summarizeChanges(
  state: DocumentState,
  view: DocView,
): ModeSummary[];
// Applied ops only (log[0..cursor)), excluding overlay ops hidden by later ops and ops on pages no longer in the view.
// Per type: definition.summarize(params[]) when present, else `${count} ${count === 1 ? 'change' : 'changes'}`.
// Checkpoint ops contribute their report title (e.g. "Redactions applied: 5 areas on 3 pages, verified").
// Modes ordered by the mode order (organize first). Empty modes omitted.
```

- [ ] **Step 1: Tests** — rotate p1 + rotate p2 + delete p3 summarises to `{ mode: 'organize', lines: ['2 pages rotated', '1 page deleted'] }`; undone ops excluded; no glyph in any line (`findBanned` over all lines).
- [ ] **Step 2: Implement; commit** — `feat(pdf-doc): change summary grouped by mode from op definitions`.

### Task B-5: `pdf/edit/draw.ts` and `pdf/edit/pages.ts` (drawing and page-arrangement foundations)

**Files:**

- Create: `src/pdf/edit/draw.ts` (+ test), `src/pdf/edit/pages.ts` (+ test), `src/pdf/edit/font-cache.ts`, `src/pdf/edit/fmt.ts` (+ test: `fmt(1/3) === '0.333'`, `fmt(2) === '2'`, `fmt(-0.0001) === '0'`, `fmt(1e21)` writes all digits, never exponent notation; shared by D, F, H content-stream writers)
- Modify: `src/pdf/edit/ops.ts` (`applyPageEdits` delegates to `arrangePages`, API unchanged), `src/pdf/edit/index.ts`, `package.json` (`@fontsource/noto-sans`)

**Interfaces (fixed for C, D, H — they only add new exports):**

```ts
// font-cache.ts
export type FontSpec =
  | { standard: 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Courier' }
  | { unicode: true }
  | { custom: string; bytes: Uint8Array };
export class FontCache {
  constructor(doc: PDFDocument, loadUnicode: () => Promise<Uint8Array>); // Noto Sans regular woff from @fontsource/noto-sans (?url), fetched once
  get(spec: FontSpec): Promise<PDFFont>; // registers fontkit on first non-standard font; subset: true
}
// draw.ts — page space (Box in PDF user space); `rotate` = degrees counterclockwise about the box centre, chosen so text reads upright on screen
export interface DrawCtx {
  doc: PDFDocument;
  fonts: FontCache;
}
export interface TextStyle {
  font: FontSpec;
  size: number;
  color: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  opacity?: number;
}
export interface FittedText {
  size: number;
  lines: string[];
  truncated: boolean;
}
export function fitText(
  font: PDFFont,
  text: string,
  box: Box,
  style: {
    size: number | 'auto';
    minSize: number;
    multiline: boolean;
    lineHeight?: number;
  },
): FittedText; // pure layout, shared by overlays
export async function drawText(
  ctx: DrawCtx,
  page: PDFPage,
  text: string,
  box: Box,
  style: TextStyle & {
    fit?: 'none' | 'shrink';
    minSize?: number;
    multiline?: boolean;
    rotate?: number;
  },
): Promise<FittedText>; // assertDrawable first (unsupported chars -> INVALID_INPUT naming them)
export function drawBox(
  page: PDFPage,
  box: Box,
  o: {
    fill?: string;
    stroke?: string;
    width?: number;
    opacity?: number;
    radius?: number;
    rotate?: number;
  },
): void;
export function drawEllipse(
  page: PDFPage,
  box: Box,
  o: {
    fill?: string;
    stroke?: string;
    width?: number;
    opacity?: number;
    rotate?: number;
  },
): void;
export function drawLine(
  page: PDFPage,
  from: [number, number],
  to: [number, number],
  o: { color: string; width: number; arrowEnd?: boolean; opacity?: number },
): void;
export function drawPath(
  page: PDFPage,
  d: string,
  o: {
    fill?: string;
    stroke?: string;
    width?: number;
    evenOdd?: boolean;
    opacity?: number;
    transform?: [number, number, number, number, number, number];
  },
): void; // d in page space
export async function drawImage(
  ctx: DrawCtx,
  page: PDFPage,
  bytes: Uint8Array,
  mime: 'image/png' | 'image/jpeg',
  box: Box,
  o?: { opacity?: number; rotate?: number },
): Promise<void>;
export function drawTick(page: PDFPage, box: Box, color: string): void; // vector check mark path, not a glyph (spec §8.5)
export function drawCross(page: PDFPage, box: Box, color: string): void;
// pages.ts
export interface ArrangeEntry {
  page: PDFPage | { blank: { width: number; height: number } };
  rotate: Rotation;
  crop?: Box;
  size?: { width: number; height: number };
}
export interface ArrangeResult {
  pages: PDFPage[];
  notes: string[];
}
export function arrangePages(
  doc: PDFDocument,
  entries: ArrangeEntry[],
): Promise<ArrangeResult>; // the editInPlace algorithm generalised (blank pages, crop, size)
export function setPageLabels(
  doc: PDFDocument,
  ranges: PageLabelRange[] | null,
): void; // /PageLabels number tree; null removes
```

- [ ] **Step 1: Failing tests.** `pages.test.ts`: arranging `[p2, blank 612x792, p0 rotate 90]` from a 3-page fixture yields 3 pages with sizes and rotations as asked, the blank page has empty content, the deleted page's content stream is gone from the saved bytes (search decoded objects for its text with `decodedObjects` from builders), and bookmarks/AcroForm notes match `applyPageEdits` behaviour (reuse its existing tests: they must still pass); crop sets `/CropBox` exactly; `setPageLabels` round trip read with pdf.js `getPageLabels()`. `draw.test.ts`: `drawText` with `fit:'shrink'` into a 100x12 box shrinks to <= 12/1.2 and reports `truncated:false`; long text with `minSize:6` reports `truncated:true`; Unicode text with `{ unicode: true }` embeds a font whose `ToUnicode` maps (pdf.js `getTextContent` returns the same string); `drawTick` writes a path and no text (pdf.js text content empty); every drawing lands inside its box on a page with `/Rotate 90` (check with `textPositions` from builders for text).
- [ ] **Step 2: Implement.** `arrangePages` moves the body of `editInPlace` from `ops.ts` into `pages.ts`, adding: blank entries create `PDFPage.create(doc)` with `setSize`; `crop` sets `CropBox` (and clamps it inside `MediaBox`); `size` sets `MediaBox` and scales nothing (content stays at origin; the Organize UI calls it "Change page size" and states that content is not scaled). `applyPageEdits` becomes `arrangePages(doc, edits.map(e => ({ page: original[e.source], rotate: e.rotate })))` plus its existing save; its tests stay green.
- [ ] **Step 3: Commit** — `feat(pdf-edit): drawing primitives with font cache and fitted text; arrangePages with blank, crop and size`.

### Task B-6: Edit worker, materialise and the main-thread services

**Files:**

- Create: `src/pdf/edit/edit.worker.ts`, `src/pdf/edit/worker/handlers.ts`, `src/pdf/doc/materialize/registry.ts`, `src/pdf/doc/materialize/materialize.ts`, `src/pdf/doc/materialize/organize.ts`, `src/pdf/doc/materialize/index.ts`, `src/pdf/doc/services.ts`, `src/pdf/doc/checkpoints/registry.ts`, `src/pdf/doc/checkpoints/index.ts`, tests `materialize.test.ts`, `registry-pairing.test.ts`

**Interfaces:**

```ts
// materialize/registry.ts (worker side)
export type MaterializePhase =
  | 'form'
  | 'flat'
  | 'content'
  | 'signature'
  | 'annotation'
  | 'metadata';
export const PHASE_ORDER: readonly MaterializePhase[]; // spec §6.4 step 3
export interface MaterializeCtx {
  doc: PDFDocument;
  draw: DrawCtx;
  page(id: PageId): PDFPage | null; // output page for a view page id; null if not exported
  asset(id: AssetId): Uint8Array; // throws INVALID_INPUT if missing
  note(text: string): void; // report line (plain words)
}
export interface Materializer<P = unknown> {
  type: string;
  phase: MaterializePhase;
  apply(ctx: MaterializeCtx, p: P, op: { id: OpId }): Promise<void> | void;
}
export function defineMaterializer<P>(m: Materializer<P>): Materializer<P>;
export function registerMaterializers(ms: readonly Materializer<any>[]): void;
export function getMaterializer(type: string): Materializer | undefined;
// materialize.ts (runs inside the edit worker)
export interface MaterializePlan {
  base: Uint8Array;
  baseSourceId: SourceId;
  sources: Record<SourceId, Uint8Array>; // merged-in sources referenced by pages
  assets: Record<AssetId, Uint8Array>;
  pages: PageRef[];
  pageLabels: PageLabelRange[] | null;
  overlays: OverlayItem[]; // view.docOverlays + per-page overlays, log order (hidden excluded)
}
export interface MaterializeResult {
  bytes: Uint8Array;
  notes: string[];
}
export async function materialize(
  plan: MaterializePlan,
  ctx: RpcContext,
): Promise<MaterializeResult>;
// edit worker handlers (worker/handlers.ts): spread of modules; B ships { materialize }
export const editHandlers: {
  materialize(
    ctx: RpcContext,
    plan: MaterializePlan,
  ): Promise<Transferred<MaterializeResult>>;
};
export type EditHandlers = typeof editHandlers;
// services.ts (main thread)
export interface Services {
  edit: RpcClient<EditHandlers>; // createRpcClient(() => new Worker(new URL('../edit/edit.worker.ts', import.meta.url), { type: 'module' }))
  render: PdfRender; // pdfRender
  qpdf: ReturnType<typeof createQpdf>;
  compress: CompressDeps; // browserCompressDeps (lazy import)
}
export function getServices(): Services; // lazily constructed singletons
export function planFor(
  model: DocumentModel,
  blobs: BlobSource,
  opts?: { onlyPages?: PageId[] },
): Promise<MaterializePlan>;
export interface BlobSource {
  checkpointBytes(id: CheckpointId): Promise<Uint8Array>;
  sourceBytes(id: SourceId): Promise<Uint8Array>;
  assetBytes(id: AssetId): Promise<Uint8Array>;
}
// checkpoints/registry.ts (main thread orchestrators, decision G5)
export interface CheckpointEnv {
  services: Services;
  signal: AbortSignal;
  progress(p: JobProgress): void;
}
export interface CheckpointInput<P> {
  bytes: Uint8Array;
  params: P;
  assets: Record<AssetId, Uint8Array>;
  view: DocView;
}
export interface CheckpointOutput {
  bytes: Uint8Array;
  report: CheckpointReport;
}
export interface CheckpointRunner<P = unknown> {
  type: string;
  run(input: CheckpointInput<P>, env: CheckpointEnv): Promise<CheckpointOutput>;
}
export function defineCheckpointRunner<P>(
  r: CheckpointRunner<P>,
): CheckpointRunner<P>;
export function registerCheckpointRunners(
  rs: readonly CheckpointRunner<any>[],
): void;
export function getCheckpointRunner(type: string): CheckpointRunner; // throws INVALID_INPUT
```

- [ ] **Step 1: Failing tests** (`materialize.test.ts`, Node, calls `materialize()` directly with a fake `RpcContext`): a plan from a 3-page fixture with pages [c:2, c:0 rotate 90] and a merged source page yields 3 pages in that order with the right rotation and the merged page's text (verified by `pdfPageTexts`); `onlyPages` (B-15 passes a filtered `pages`) yields 1 page; page labels round trip; an overlay of unknown type throws INVALID_INPUT "No writer for edit type x"; output re-opens with pdf.js (`pdfPageTexts` succeeds). `registry-pairing.test.ts`: every registered operation of kind `structure` is handled by `arrangePages` (types `page.*` except `page.mergeIn`, which needs a source) and every `overlay` op without `noOutput` has a materialiser, every `checkpoint` op a runner — imports `registerCoreOperations`, `registerMaterializers(ALL_MATERIALIZERS)`, `registerCheckpointRunners(ALL_RUNNERS)`; later Parts' ops join automatically.
- [ ] **Step 2: Implement `materialize`**

```ts
export async function materialize(
  plan: MaterializePlan,
  rpc: RpcContext,
): Promise<MaterializeResult> {
  const notes: string[] = [];
  const doc = await loadPdf(plan.base);
  const basePages = doc.getPages();
  const copied = new Map<SourceId, PDFDocument>();
  const entries: ArrangeEntry[] = [];
  const firstUse = new Set<number>();
  for (const ref of plan.pages) {
    if (rpc.signal.aborted) throw new ToolError('CANCELLED', 'Cancelled');
    if (ref.blank) {
      entries.push({
        page: { blank: ref.blank },
        rotate: ref.rotate,
        crop: ref.crop,
        size: ref.size,
      });
      continue;
    }
    let page: PDFPage;
    if (ref.source === plan.baseSourceId) {
      // First use moves the original page; repeats become copies (applyPageEdits rule).
      page = firstUse.has(ref.index)
        ? (await doc.copyPages(doc, [ref.index]))[0]
        : basePages[ref.index];
      firstUse.add(ref.index);
    } else {
      const bytes = plan.sources[ref.source];
      if (!bytes)
        throw new ToolError(
          'INVALID_INPUT',
          'A merged file is missing from this document',
        );
      let src = copied.get(ref.source);
      if (!src) {
        src = await loadPdf(bytes);
        copied.set(ref.source, src);
      }
      page = (await doc.copyPages(src, [ref.index]))[0];
    }
    entries.push({ page, rotate: ref.rotate, crop: ref.crop, size: ref.size });
  }
  const arranged = await arrangePages(doc, entries);
  notes.push(...arranged.notes);
  setPageLabels(doc, plan.pageLabels);
  const byId = new Map(plan.pages.map((p, i) => [p.id, arranged.pages[i]]));
  const draw: DrawCtx = { doc, fonts: new FontCache(doc, loadNotoSans) };
  const ctx: MaterializeCtx = {
    doc,
    draw,
    page: (id) => byId.get(id) ?? null,
    asset: (id) =>
      plan.assets[id] ??
      (() => {
        throw new ToolError(
          'INVALID_INPUT',
          'An image used in this document is missing',
        );
      })(),
    note: (t) => notes.push(t),
  };
  // planFor never sends noOutput ops (view-only: object.move/remove, detect.correct, annot.author).
  const unknown = plan.overlays.find((o) => !getMaterializer(o.type));
  if (unknown)
    throw new ToolError(
      'INVALID_INPUT',
      `No writer for edit type ${unknown.type}`,
    );
  for (const phase of PHASE_ORDER) {
    const items = plan.overlays.filter(
      (o) => getMaterializer(o.type)!.phase === phase,
    );
    for (const [i, o] of items.entries()) {
      await getMaterializer(o.type)!.apply(ctx, o.params, { id: o.opId });
      rpc.progress({ done: i + 1, total: items.length, label: phase });
    }
  }
  const bytes = await rebuildingSave(doc); // ops.ts `save` exported as rebuildingSave
  return { bytes, notes };
}
```

Check unknown types before loading anything heavy in the real code (move the check to the top of the function). `loadNotoSans` fetches the `@fontsource/noto-sans` latin+latin-ext regular WOFF via a `?url` import (works in module workers).

- [ ] **Step 3: Worker** (`edit.worker.ts`):

```ts
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { ALL_MATERIALIZERS } from '@/pdf/doc/materialize';
import { registerMaterializers } from '@/pdf/doc/materialize/registry';
import { editHandlers } from './worker/handlers';

registerCoreOperations();
registerMaterializers(ALL_MATERIALIZERS);
exposeRpc(editHandlers, self as unknown as RpcEndpoint);
```

`worker/handlers.ts` spreads handler modules (`{ ...materializeHandlers }`; C adds `...formHandlers`, E `...redactHandlers`, etc.); results are returned as `Transferred` with the output buffer. One job at a time (spec §6.7): the main-thread `services.edit` wrapper serialises calls through a one-slot limiter (`createSlotLimiter(1)`), and `useJob` cancel aborts the call (worker sees `ctx.signal`).

- [ ] **Step 4: `planFor`** gathers `view.pages`, overlays (excluding `view.hidden` and ops whose definition has `noOutput`), base bytes of the current checkpoint and referenced sources/assets from the `BlobSource` (B-7 implements it over memory + IndexedDB).
- [ ] **Step 5: Commit** — `feat(pdf-doc): edit worker with materialise, worker/main registries and service clients`.

### Task B-7: Autosave, restore, recent documents, checkpoint budget, blob source

**Files:**

- Create: `src/pdf/doc/serialize.ts`, `src/pdf/doc/autosave.ts`, `src/pdf/doc/recent.ts`, `src/pdf/doc/budget.ts`, `src/pdf/doc/blob-store.ts`, tests for each (`fake-indexeddb`)

**Interfaces:**

```ts
// serialize.ts — schema 1 (spec §6.6)
export const SCHEMA = 1;
export interface DocumentRecord {
  id: string;
  name: string;
  pageCount: number;
  byteSize: number;
  createdAt: number;
  updatedAt: number;
  thumb: Blob | null;
  schema: number;
  encryptedInput: boolean;
}
export interface LogRecord {
  log: Operation[];
  cursor: number;
  checkpoints: CheckpointMeta[];
  sources: Record<SourceId, SourceRef>;
  mode: ModeId;
  viewport: { page: number; zoom: ZoomSetting };
  detection?: unknown;
}
export const blobKey: {
  checkpoint(docId: string, index: number): string;
  source(docId: string, id: SourceId): string;
  asset(docId: string, id: AssetId): string;
};
export function toRecords(
  state: DocumentState,
  ui: { mode: ModeId; viewport: LogRecord['viewport'] },
): { doc: Omit<DocumentRecord, 'thumb' | 'updatedAt'>; log: LogRecord };
export function fromRecords(doc: DocumentRecord, log: LogRecord): DocumentState; // validates every op with getOperation(type).validate; throws ToolError INVALID_INPUT on any failure
// blob-store.ts — memory first, IndexedDB second (spec §6.5: current + previous checkpoint in memory)
export class BlobStore implements BlobSource {
  constructor(db: IdbStore | null, docId: string);
  addCheckpoint(meta: CheckpointMeta, bytes: Uint8Array): void;
  addSource(id: SourceId, bytes: Uint8Array): void;
  addAsset(id: AssetId, bytes: Uint8Array): void;
  keepInMemory(current: CheckpointId, previous: CheckpointId | null): void; // evicts other checkpoint bytes from memory (still on disk)
  pendingWrites(): { key: string; blob: Blob }[];
  markWritten(keys: string[]): void;
  checkpointBytes(id: CheckpointId): Promise<Uint8Array>; // memory, else IndexedDB (throws INVALID_INPUT "This undo step is no longer available on this device" when missing)
  sourceBytes(id: SourceId): Promise<Uint8Array>;
  assetBytes(id: AssetId): Promise<Uint8Array>;
  drop(keys: string[]): Promise<void>;
}
// autosave.ts
export interface AutosaveOptions {
  db: IdbStore;
  model: DocumentModel;
  blobs: BlobStore;
  ui(): { mode: ModeId; viewport: LogRecord['viewport'] };
  thumb(): Promise<Blob | null>; // JPEG 160px of page 1 (render worker renderPageImage)
  enabled: boolean; // false by default for encrypted inputs (spec §6.6)
  debounceMs?: number; // 750
  onError(e: ToolError): void; // STORAGE_FULL -> notify with action "Clear old documents"
}
export interface Autosave {
  flush(): Promise<void>;
  setEnabled(on: boolean): void;
  isEnabled(): boolean;
  dispose(): void;
}
export function createAutosave(o: AutosaveOptions): Autosave;
// recent.ts
export interface RecentDocument {
  id: string;
  name: string;
  pageCount: number;
  updatedAt: number;
  thumb: Blob | null;
  restorable: boolean;
}
export async function listRecentDocuments(
  db: IdbStore,
): Promise<RecentDocument[]>; // newest first; restorable = schema === SCHEMA
export async function restoreDocument(
  db: IdbStore,
  id: string,
): Promise<{
  state: DocumentState;
  ui: { mode: ModeId; viewport: LogRecord['viewport'] };
  blobs: BlobStore;
}>; // throws INVALID_INPUT "This document can't be restored by this version" on schema mismatch or invalid ops
export async function deleteDocument(db: IdbStore, id: string): Promise<void>;
export async function clearDocuments(db: IdbStore): Promise<void>;
export async function enforceRetention(
  db: IdbStore,
  keepId: string,
  max?: number,
): Promise<string[]>; // default 10; returns deleted ids
// budget.ts
export async function enforceCheckpointBudget(
  db: IdbStore,
  model: DocumentModel,
  quota: { quota: number } | null,
): Promise<CheckpointMeta[]>;
// total checkpoint bytes on disk <= min(1 GB, 50% of quota); drop oldest checkpoints except current and previous;
// model.markUnavailable(dropped); returns dropped so the UI toasts "Older undo steps were removed to free space on this device".
```

- [ ] **Step 1: Failing tests.** serialize round trip (state -> records -> state) deep-equals for a log with organize ops and a checkpoint; `fromRecords` with `schema: 2` throws the restore message; an op whose params fail validation throws the same message. autosave (fake timers): three dispatches within 750 ms produce one `logs` write; `visibilitychange` to hidden flushes immediately; each checkpoint/source/asset blob is written exactly once across saves; a disabled autosave writes nothing until `setEnabled(true)`; a quota failure calls `onError` with STORAGE_FULL and editing continues (model still dispatches); `requestPersistence` called once on the first save. recent: sorted newest first; `restorable:false` for schema 2. retention: 12 documents -> 2 oldest deleted (blobs by prefix, logs, documents), the open document never deleted. budget: with a fake quota of 100 MB and 3 checkpoints of 30 MB on disk (cap 50 MB): the oldest is dropped, marked unavailable, and `canUndo` stops there.
- [ ] **Step 2: Implement.** `createAutosave` subscribes to the model; on each event resets a debounce timer; `save()` writes in ONE transaction: `documents/<id>`, `logs/<id>`, and every pending blob (`blobs/<key>`), then `markWritten`. On `dropped` events it deletes those blob keys. On success after a failure it resumes silently (the failure was already reported). Thumb is regenerated on the first save and when page 1's id or rotation changed.
- [ ] **Step 3: Commit** — `feat(pdf-doc): IndexedDB autosave with one transaction per save, restore, recent list, retention and checkpoint budget`.

### Task B-8: Render worker additions — handler modules, page refs, tiles, text items, priorities, pixel budget

**Files:**

- Create: `src/pdf/render/handlers/index.ts`, `handlers/open.ts`, `handlers/render.ts`, `handlers/text.ts`, `src/pdf/render/priority.ts` (+ test)
- Modify: `src/pdf/render/render.worker.ts` (becomes `exposeRpc(renderHandlers, self)`), `client.ts` (`renderTile`, `textItems`, priority option), `bitmap-cache.ts` (+ test), `hooks.ts` (`usePageBitmap` gains `priority`), `scheduling.ts`

**Interfaces:**

```ts
// handlers/render.ts
renderTile(ctx, docId: string, pageIndex: number, scale: number, tile: { x: number; y: number; width: number; height: number }): Promise<Transferred<ImageBitmap>>;
// tile in viewport px at `scale` (unrotated page's own /Rotate applied, no pending rotation); 512px tiles above 200% zoom (spec §14)
// handlers/text.ts
export interface TextItemGeom { str: string; transform: [number, number, number, number, number, number]; width: number; height: number; fontName: string; hasEOL: boolean }
export interface PageTextItems { items: TextItemGeom[]; styles: Record<string, { ascent: number; descent: number; vertical: boolean; fontFamily: string }> }
textItems(ctx, docId: string, pageIndex: number): Promise<PageTextItems>; // page.getTextContent({ includeMarkedContent: false }); page space
// client.ts
renderPage(docId, pageIndex, widthPx, signal?, priority?: Priority): Promise<ImageBitmap>;
renderTile(docId, pageIndex, scale, tile, signal?, priority?: Priority): Promise<ImageBitmap>;
textItems(docId, pageIndex, signal?): Promise<PageTextItems>;
// priority.ts
export type Priority = 0 | 1 | 2; // 0 canvas, 1 rail, 2 detection/background (spec §14)
export function createPriorityLimiter(slots: number): <T>(fn: () => Promise<T>, signal?: AbortSignal, priority?: Priority) => Promise<T>;
// bitmap-cache.ts
export class BitmapCache { constructor(opts?: { maxPixels?: number }) } // default 256 MB / 4 = 64M px desktop; 24M px when matchMedia('(max-width: 899px)') (96 MB phone)
```

- [ ] **Step 1: Failing tests.** priority limiter: with 1 slot busy, queued tasks priority 2, 0, 1 start in order 0, 1, 2; aborted waiters leave the queue; FIFO within the same priority. Bitmap cache: evicts least-recently-used until total `width*height` <= maxPixels, closing evicted bitmaps (use fake bitmaps `{ width, height, close: vi.fn() }`); a single bitmap larger than the budget is kept alone (and the previous ones evicted).
- [ ] **Step 2: Split the worker** into handler modules without behaviour change (existing render tests must pass unchanged), then add `renderTile` (pdf.js `page.render` with `transform: [1,0,0,1,-tile.x,-tile.y]` on an OffscreenCanvas of tile size, viewport at `scale`) and `textItems`.
- [ ] **Step 3: Client + hooks** use `createPriorityLimiter(4)` instead of `createSlotLimiter(4)`; `usePageBitmap(docId, page, width, enabled, priority = 0)`; `PageThumb` passes `1`.
- [ ] **Step 4: Commit** — `feat(pdf-render): handler modules, tiles, positioned text items, render priorities and a pixel-budget bitmap cache`.

### Task B-9: Overlay and panel kit primitives

**Files:**

- Create: `src/shared/ui/overlay-layer.tsx`, `shape-layer.tsx`, `selection-frame.tsx`, `hit-area.tsx`, `progress-overlay.tsx`, `side-panel.tsx`, `inspector.tsx`, tests `overlay.test.tsx`, `panels.test.tsx`
- Modify: `src/shared/ui/positioned.tsx` (from A2-9; add `transform` support), `src/shared/ui/drawer.tsx` (restyle + `side` prop), `src/shared/ui/index.ts`

**Interfaces:**

```tsx
// overlay-layer.tsx — the only sanctioned home of data-driven geometry (spec §4.6)
export interface OverlayTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
} // page space -> CSS px (Viewport.transform)
export function OverlayLayer(props: {
  width: number;
  height: number;
  label?: string;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}): JSX.Element;
// absolutely fills its page slot (width x height CSS px); pointer-events none unless interactive.
export function PageBox(props: {
  transform: OverlayTransform;
  box: { x: number; y: number; width: number; height: number };
  rotate?: number;
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}): JSX.Element;
// positions a page-space box (maps both corners through the transform, normalises), optional rotation about its centre.
// shape-layer.tsx
export type Shape =
  | {
      kind: 'rect';
      box: Box;
      stroke?: Paint;
      fill?: Paint;
      width?: number;
      dash?: 'solid' | 'dotted' | 'dashed';
      hatch?: boolean;
      radius?: number;
    }
  | { kind: 'ellipse'; box: Box; stroke?: Paint; fill?: Paint; width?: number }
  | {
      kind: 'line';
      from: [number, number];
      to: [number, number];
      stroke: Paint;
      width: number;
      arrowEnd?: boolean;
    }
  | { kind: 'ink'; points: [number, number][][]; stroke: Paint; width: number } // polylines in page space
  | {
      kind: 'path';
      d: string;
      fill?: Paint;
      stroke?: Paint;
      width?: number;
      evenOdd?: boolean;
    } // page-space path data
  | { kind: 'quads'; quads: number[][]; fill: Paint; blend?: 'multiply' } // highlight quads (8 numbers each)
  | {
      kind: 'underline' | 'strike' | 'squiggly';
      quads: number[][];
      stroke: Paint;
      width: number;
    };
export type Paint =
  | {
      token:
        | 'accent'
        | 'accent-fg'
        | 'danger'
        | 'warning'
        | 'info'
        | 'redact'
        | 'fg'
        | 'fg-muted';
    }
  | { hex: string; opacity?: number }; // hex validated /^#[0-9a-f]{6}$/i
export function ShapeLayer(props: {
  width: number;
  height: number;
  transform: OverlayTransform;
  shapes: Shape[];
  className?: string;
}): JSX.Element;
// one <svg> with a group transform matrix(a,b,c,d,e,f); strokes use vector-effect="non-scaling-stroke"; arrows via <marker>; hatch via <pattern>; aria-hidden (semantic twins are HitAreas).
// selection-frame.tsx
export interface SelectionFrameProps {
  transform: OverlayTransform;
  box: Box;
  rotate?: number;
  resizable?: boolean;
  rotatable?: boolean;
  keepAspect?: boolean;
  snap?: (box: Box) => Box; // e.g. snap to cell edges
  onChange(box: Box, rotate: number): void; // during drag (preview)
  onCommit(box: Box, rotate: number): void; // pointer up / key up: one undo step
  label: string; // "Text box: Hello"
}
// 8 resize handles + optional rotate handle; pointer via detent useDraggable/useResizable (keyboard: false, R13);
// keyboard: arrows nudge 1pt, Shift+arrows 10pt, Alt+arrows resize 1pt (Shift 10pt), [ and ] rotate 15 degrees; Enter commits, Esc cancels to the start box.
// hit-area.tsx
export function HitArea(props: {
  transform: OverlayTransform;
  box: Box;
  label: string;
  pressed?: boolean;
  onActivate(): void;
  onKeyDown?(e: React.KeyboardEvent): void;
  tabIndex?: 0 | -1;
  'data-testid'?: string;
  children?: React.ReactNode;
}): JSX.Element;
// a real <button> sized to the box, transparent, focus ring visible; the accessible twin of shapes and fields.
// progress-overlay.tsx (spec §4.6)
export function ProgressOverlay(props: {
  open: boolean;
  title: string;
  progress: JobProgress | null;
  onCancel?(): void;
  cancelLabel?: string;
}): JSX.Element;
// modal dialog (z-dialog) with role="progressbar" aria-valuenow/max (indeterminate when null), label text, Cancel button.
// side-panel.tsx / inspector.tsx
export function SidePanel(props: {
  side: 'left' | 'right';
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onResize?(w: number): void;
  collapsed?: boolean;
  children: React.ReactNode;
}): JSX.Element;
// <aside aria-label> docked; optional resize handle (role="separator" aria-orientation="vertical" aria-valuenow, ArrowLeft/Right 8px).
export function Inspector(props: {
  title: string;
  mode: 'panel' | 'popover' | 'sheet';
  anchor?: PopoverProps['anchor'];
  open: boolean;
  onOpenChange(o: boolean): void;
  children: React.ReactNode;
}): JSX.Element;
export function InspectorSection(props: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}): JSX.Element; // labelled section (h3 + region)
```

- [ ] **Step 1: Tests** (jsdom): `PageBox` with the identity-like transform `{a:1,b:0,c:0,d:-1,e:0,f:792}` maps box (100,700,50,20) to left 100, top 72, width 50, height 20; ShapeLayer renders one `svg` with `aria-hidden`, a `marker` for arrow lines, a `pattern` when `hatch`; rejects `{hex:'red'}`; SelectionFrame: ArrowRight nudges 1pt (onChange then onCommit on keyup), Shift+ArrowRight 10pt, Esc restores the start box; HitArea is a `button` with the label; ProgressOverlay shows `progressbar` and Cancel calls `onCancel`; SidePanel separator responds to ArrowLeft with `onResize(w - 8)` clamped to min.
- [ ] **Step 2: Implement; gallery sections** for each primitive (both themes). Commit — `feat(kit): overlay layer, shape layer, selection frame, hit area, progress overlay, side panel and inspector`.

### Task B-10: `ModeTabs`/`FloatingDock` and `Toolbar`/`FloatingPalette`

**Files:**

- Create: `src/shared/ui/mode-tabs.tsx`, `floating-dock.tsx`, `toolbar.tsx`, `floating-palette.tsx`, tests

**Interfaces:**

```tsx
export interface ModeTabItem {
  id: string;
  label: string;
  icon: IconComponent;
  shortcut?: string;
  badge?: string;
}
export function ModeTabs(props: {
  label: string;
  items: ModeTabItem[];
  value: string;
  onChange(id: string): void;
  maxVisible?: number;
}): JSX.Element;
// role="tablist" aria-label; tabs role="tab" aria-selected aria-controls="mode-panel"; arrows/Home/End move focus AND select (automatic activation);
// overflow beyond maxVisible (default computed from width via ResizeObserver) goes into a "More" DropdownMenu (IconChevronDown) whose items keep shortcuts.
// Active indicator: 2px accent bar under the tab, animated with duration-base (motion-safe).
export function FloatingDock(props: {
  label: string;
  items: ModeTabItem[];
  value: string;
  onChange(id: string): void;
  size?: 'md' | 'lg';
}): JSX.Element;
// same data; bottom-centre pill (z-dock, rounded-xl shadow-e3); lg = 56px targets (phones); role="tablist".
export interface ToolItem {
  id: string;
  label: string;
  icon: IconComponent;
  shortcut?: string;
  kind: 'button' | 'toggle' | 'split';
  pressed?: boolean;
  disabled?: boolean | string;
  onSelect(): void;
  menu?: { id: string; label: string; onSelect(): void }[]; // split button menu
}
export interface ToolGroup {
  id: string;
  label: string;
  items: ToolItem[];
}
export function Toolbar(props: {
  label: string;
  groups: ToolGroup[];
  orientation?: 'horizontal' | 'vertical';
  trailing?: React.ReactNode;
}): JSX.Element;
// role="toolbar" aria-label aria-orientation; roving tabindex across all items; separators role="separator" between groups;
// toggles aria-pressed; each button has a Tooltip with label + ShortcutHint; disabled-with-reason shows the reason in the tooltip and aria-describedby.
export function FloatingPalette(props: {
  label: string;
  groups: ToolGroup[];
  side: 'left' | 'right';
  onSideChange(s: 'left' | 'right'): void;
}): JSX.Element;
// vertical Toolbar in a draggable card (z-toolbar); drag handle (IconGripVertical) snaps to the nearest edge on release; Alt+ArrowLeft/Right moves it (spec §4.6).
```

- [ ] **Step 1: Tests** — ModeTabs ArrowRight selects next and calls onChange; End selects last; overflow puts the 9th item into "More" (stub ResizeObserver width); FloatingDock renders the same tab names; Toolbar roving: only one item has `tabIndex=0`, ArrowRight moves it, Home/End; toggle has `aria-pressed`; split button opens its menu with ArrowDown; FloatingPalette Alt+ArrowRight calls `onSideChange('right')`.
- [ ] **Step 2: Implement; gallery; commit** — `feat(kit): ModeTabs and FloatingDock, Toolbar and FloatingPalette from the same data`.

### Task B-11: `PageRail` and `DocumentViewport`

**Files:**

- Create: `src/shared/ui/page-rail.tsx`, `src/shared/ui/document-viewport.tsx`, `src/shared/ui/virtual.ts` (+ test), tests `page-rail.test.tsx`, `document-viewport.test.tsx`

**Interfaces:**

```ts
// virtual.ts — pure
export function visibleRange(
  offsets: number[],
  sizes: number[],
  scrollTop: number,
  viewport: number,
  overscan: number,
): { start: number; end: number }; // binary search; end exclusive
export function cumulativeOffsets(sizes: number[], gap: number): number[];
```

```tsx
export interface RailPage {
  id: string;
  label: string;
  aspect: number;
  badges?: { tone: 'accent' | 'danger' | 'warning' | 'info'; label: string }[];
}
export interface PageRailProps {
  label: string; // "Pages"
  pages: RailPage[];
  selected: ReadonlySet<string>;
  current: string | null;
  onSelect(id: string, mods: { shift: boolean; meta: boolean }): void;
  onActivate(id: string): void; // Enter / double click: scroll the canvas to it
  onMove?(ids: string[], to: number): void; // drag (detent useSortable, keyboard false) or Alt+ArrowUp/Down
  onDelete?(ids: string[]): void; // Del / Backspace
  renderThumb(page: RailPage, width: number): React.ReactNode; // e.g. PageThumb priority 1
  width: number; // 120..260
}
// role="listbox" aria-multiselectable; options role="option" aria-selected, label "Page 3 of 37" + badges text;
// virtualised (visibleRange, overscan 3); move announcements via its own aria-live region ("Moved page 3 to position 1"), R13.
export type ZoomSetting =
  | { kind: 'fit-width' }
  | { kind: 'fit-page' }
  | { kind: 'percent'; value: number }; // 25..800
export interface DocumentViewportProps {
  label: string; // "Document"
  pages: { id: string; width: number; height: number }[]; // CSS px at zoom 1 (PDF points), after pending rotation/crop
  zoom: ZoomSetting;
  onZoomChange(z: ZoomSetting): void;
  renderPage(page: {
    id: string;
    index: number;
    scale: number;
    visible: boolean;
  }): React.ReactNode; // bitmap + overlays
  onVisiblePagesChange?(ids: string[]): void; // drives rendering, detection priority, rail current page
  scrollToPage?: { id: string; nonce: number }; // imperative scroll request
  gap?: number; // 16
}
// role="region" aria-label; each page slot role="region" aria-label="Page {n} of {N}", data-testid="page-slot-{n}";
// virtualised with visibleRange (overscan one viewport); zoom announced in a polite live region ("Zoom 150 percent");
// ctrl/meta+wheel and pinch (two pointers) zoom around the pointer; Space+drag pans; computed scale = fit-width: (clientWidth - 2*gap) / maxPageWidth.
// Background bg-backdrop; pages shadow-page.
```

- [ ] **Step 1: Tests** — `visibleRange` table tests (start, middle, end, empty); PageRail: options count equals visible window (300 pages -> fewer than 40 rendered), Alt+ArrowDown calls `onMove([id], i+1)` and keeps focus, Shift+click calls onSelect with shift, Del calls onDelete, live region text after move; DocumentViewport: renders only visible slots (jsdom: stub `clientHeight`, `scrollTop`), slots have region labels, ctrl+wheel calls `onZoomChange` with a percent, fit-width scale formula.
- [ ] **Step 2: Implement; gallery (with fake pages); commit** — `feat(kit): virtualised PageRail with keyboard reorder and DocumentViewport with zoom, pan and page regions`.

### Task B-12: Mode plug-in contract, mode registry, `ModeHost`, mode icon family

**Files:**

- Create: `src/pdf/workspace/modes/types.ts`, `src/pdf/workspace/modes/registry.ts`, `src/pdf/workspace/ModeHost.tsx`, `src/pdf/workspace/document-api.ts`, `src/shared/ui/icons/custom/modes.tsx`, tests `registry.test.ts`, `ModeHost.test.tsx`
- Modify: `src/shared/ui/icons/index.ts` (append `export * from './custom/modes';`)

**Interfaces (spec §7.1, with the decisions G4-G7):**

```ts
// modes/types.ts
import type { ComponentType } from 'react';
export interface ModeManifest {
  id: ModeId;
  label: string;
  icon: IconComponent;
  shortcut: string; // '1'..'9', fixed by spec order (G7)
  order: number;
  load: () => Promise<{ default: ModeModule }>;
}
export interface ModeModule {
  operations: OperationDefinition<any>[]; // registered on load (also registered eagerly by registerCoreOperations for restore; duplicates are no-ops)
  Toolbar: ComponentType<ModeProps>;
  Inspector?: ComponentType<ModeProps>;
  inspectorPinned?: boolean; // show even without a selection
  PageOverlay?: ComponentType<PageOverlayProps>;
  RailBadge?: ComponentType<{ page: PageRef; doc: DocumentApi }>;
  commands(ctx: ModeContext): Command[];
  shortcuts?: (ctx: ModeContext) => ShortcutDef[];
  onEnter?(ctx: ModeContext): void;
  onLeave?(ctx: ModeContext): void;
  canExit?(ctx: ModeContext): true | string; // string = reason shown in a confirm dialog
}
export interface ActiveTool {
  id: string | null;
  set(id: string | null): void;
}
export interface SelectionApi {
  pages: ReadonlySet<PageId>;
  objects: ReadonlySet<OpId>;
  selectPages(
    ids: PageId[],
    mode?: 'replace' | 'add' | 'toggle' | 'range',
  ): void;
  selectObjects(ids: OpId[], mode?: 'replace' | 'add' | 'toggle'): void;
  clear(): void;
}
export interface DocumentApi {
  view: DocView;
  state: DocumentState;
  sources: Record<SourceId, { docId: string | null; info: DocInfo | null }>; // render-worker handles per source
  dispatch(op: NewOperation | NewOperation[], label?: string): Operation[];
  runCheckpoint<P>(
    type: string,
    params: P,
    opts?: { title: string; confirm?: string },
  ): Promise<CheckpointReport | null>; // useJob + ProgressOverlay; null when cancelled
  addAsset(bytes: Uint8Array, mime: string): AssetId;
  addSource(bytes: Uint8Array, name: string): Promise<SourceId>; // opens in render worker, stores blob
  render: PdfRender;
  text(page: PageRef): Promise<PageTextItems>;
  pageGeom(page: PageRef): PageGeom; // source geometry
  viewport(page: PageRef, scale: number): Viewport; // geometry.pageViewport with pending rotation/crop
  services: Services;
  announce(message: string): void; // workspace live region
}
export interface ModeProps {
  doc: DocumentApi;
  selection: SelectionApi;
  tool: ActiveTool;
  layout: 'standard' | 'focus' | 'phone';
}
export interface PageOverlayProps extends ModeProps {
  page: PageRef;
  pageNumber: number;
  viewport: Viewport;
  width: number;
  height: number;
}
export interface ModeContext extends ModeProps {
  navigateMode(id: ModeId): void;
}
// modes/registry.ts — append-only list (no stub modes, G7)
export const MODE_ORDER: readonly ModeId[]; // ['organize','edit','annotate','fill-sign','redact','convert','protect','optimize','ocr']
export const MODES: readonly ModeManifest[]; // B: [organizeManifest]; each Part appends its import
export function getMode(id: string): ModeManifest | undefined;
export function shortcutFor(id: ModeId): string; // String(MODE_ORDER.indexOf(id) + 1)
```

`ModeHost` loads the active mode module lazily (Suspense with `LoadingState` "Loading {label}"), registers its operations, renders `Toolbar` in the Toolbar slot (Standard) or `FloatingPalette` (Focus) — the mode's `Toolbar` component returns `ToolGroup[]` through a render-prop: `Toolbar` components render `<ModeToolbar groups={...} />`, a workspace component that picks `Toolbar` or `FloatingPalette` by layout — registers `commands(ctx)` via `useCommands` and `shortcuts` via `useShortcuts` while active, calls `onEnter`/`onLeave`, and asks `canExit` before switching (kit `Dialog` confirm with the returned reason; buttons "Leave" / "Stay").

Mode icons (`custom/modes.tsx`): one family on the document outline `M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z` + fold `M14 3v5h5`, each with a mark in the lower half:

```tsx
const Doc = () => (
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </>
);
export const IconModeOrganize = defineIcon(
  'IconModeOrganize',
  <>
    <Doc />
    <rect x="8" y="11" width="3" height="3" rx=".5" />
    <rect x="13" y="11" width="3" height="3" rx=".5" />
    <rect x="8" y="16" width="3" height="2" rx=".5" />
    <rect x="13" y="16" width="3" height="2" rx=".5" />
  </>,
);
export const IconModeEdit = defineIcon(
  'IconModeEdit',
  <>
    <Doc />
    <path d="M9 18l.6-2.4 4.6-4.6 1.8 1.8-4.6 4.6z" />
  </>,
);
export const IconModeAnnotate = defineIcon(
  'IconModeAnnotate',
  <>
    <Doc />
    <path d="M8 13h8M8 16.5h5" />
    <path d="M8 13h8" strokeWidth={3} strokeOpacity={0.35} />
  </>,
);
export const IconModeFillSign = defineIcon(
  'IconModeFillSign',
  <>
    <Doc />
    <rect x="8" y="11" width="8" height="3" rx=".5" />
    <path d="M8 17.5c1-1 1.8-1 2.4 0s1.4 1 2.4 0 1.6-.8 3.2 0" />
  </>,
);
export const IconModeRedact = defineIcon(
  'IconModeRedact',
  <>
    <Doc />
    <rect x="8" y="12" width="8" height="2.5" rx=".5" fill="currentColor" />
    <path d="M8 17h5" />
  </>,
);
export const IconModeConvert = defineIcon(
  'IconModeConvert',
  <>
    <Doc />
    <path d="M8.5 13.5h6l-1.5-1.5M15.5 16.5h-6l1.5 1.5" />
  </>,
);
export const IconModeProtect = defineIcon(
  'IconModeProtect',
  <>
    <Doc />
    <rect x="9" y="14" width="6" height="4.5" rx="1" />
    <path d="M10.5 14v-1.5a1.5 1.5 0 0 1 3 0V14" />
  </>,
);
export const IconModeOptimize = defineIcon(
  'IconModeOptimize',
  <>
    <Doc />
    <path d="M12 11.5v6M9.5 15l2.5 2.5 2.5-2.5" />
  </>,
);
export const IconModeOcr = defineIcon(
  'IconModeOcr',
  <>
    <Doc />
    <path d="M8 12v-1h1.5M16 12v-1h-1.5M8 17v1h1.5M16 17v1h-1.5M10 14.5h4" />
  </>,
);
```

- [ ] **Step 1: Tests** — registry: `shortcutFor('ocr') === '9'`, `MODES` ids are unique and in `MODE_ORDER` order; ModeHost with a fake mode module: renders its Toolbar, registers its commands (query returns them) only while active, calls onEnter/onLeave, `canExit` returning a string shows the confirm dialog and "Stay" keeps the mode.
- [ ] **Step 2: Implement; icons appear in the gallery icon grid automatically; update the icon-name snapshot; commit** — `feat(workspace): mode plug-in contract, mode registry, ModeHost and the mode icon family`.

### Task B-13: `WorkspaceShell`, layouts, settings, keyboard map, live region

**Files:**

- Create: `src/pdf/workspace/WorkspaceShell.tsx`, `DocumentCanvas.tsx`, `PageRailPanel.tsx`, `TopBarControls.tsx`, `settings.ts`, `shortcuts.ts`, `live-region.tsx`, `useDocument.ts`, `useSelection.ts`, tests `WorkspaceShell.test.tsx`, `shortcuts.test.ts`

**Interfaces:**

```ts
// settings.ts — settings only (spec §6.1)
export interface WorkspaceSettings {
  layout: 'standard' | 'focus';
  railWidth: number;
  railOpen: boolean;
  zoom: ZoomSetting;
  lastMode: ModeId;
  palette: 'left' | 'right';
}
export const useWorkspaceSettings: ReturnType<
  typeof createToolStore<WorkspaceSettings>
>; // createToolStore({ toolId: 'pdf-edit', initial: { layout: 'standard', railWidth: 180, railOpen: true, zoom: { kind: 'fit-width' }, lastMode: 'organize', palette: 'left' } })
// useDocument.ts
export function useDocumentModel(model: DocumentModel): {
  state: DocumentState;
  view: DocView;
  version: number;
}; // useSyncExternalStore on getVersion
// shortcuts.ts — global workspace shortcuts (spec §13.1); mode-specific ones come from modes
export function workspaceShortcuts(api: {
  undo(): void;
  redo(): void;
  exportDoc(): void;
  open(): void;
  toggleFocus(): void;
  toggleRail(): void;
  setMode(i: number): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomFitWidth(): void;
  zoom100(): void;
  nextPage(): void;
  prevPage(): void;
  firstPage(): void;
  lastPage(): void;
  escape(): void;
  find(): void;
}): ShortcutDef[];
// Mod+Z, Mod+Shift+Z and Mod+Y, Mod+S, Mod+O, F, Mod+\, 1..9, Mod+=, Mod+-, Mod+0, Mod+1, PageDown/J, PageUp/K, Home, End, Escape, Mod+F
```

WorkspaceShell layout contract (spec §6.1), with test ids:

| Element                                   | Standard                                                                                                                                                                                                                                                                                                                                                                                                                             | Focus                                                                          | Phone (< 900px, always Focus) |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------- |
| Top bar (`banner`)                        | Breadcrumb `~/tools / pdf / edit`, filename field (label "Document name", Enter commits rename), Search button (Mod+K), Undo/Redo IconButtons (labels "Undo {label}" / "Redo {label}" or "Nothing to undo"), Focus toggle (`IconLayoutFocus`, label "Focus layout", F), autosave status (`StatusDot` + "Saved on this device" / "Not saved locally" toggle for encrypted inputs / "Saving"), Export primary Button ("Export", Mod+S) | compact: filename, Undo/Redo, Export, More menu (Focus toggle, rail, settings) | same as Focus                 |
| Modes (`navigation` "Modes")              | `ModeTabs` label "Modes"                                                                                                                                                                                                                                                                                                                                                                                                             | `FloatingDock`                                                                 | `FloatingDock size="lg"`      |
| Tools                                     | `Toolbar` under the tabs, label "{mode} tools"                                                                                                                                                                                                                                                                                                                                                                                       | `FloatingPalette`                                                              | bottom sheet above the dock   |
| Pages (`complementary` "Pages")           | `SidePanel side="left"` with `PageRail`, resizable 120-260, collapsible (Mod+\)                                                                                                                                                                                                                                                                                                                                                      | `Drawer` opened by IconButton "Pages" (`IconMenu`)                             | `Drawer`                      |
| Canvas (`main`)                           | `DocumentViewport` label "Document"                                                                                                                                                                                                                                                                                                                                                                                                  | same                                                                           | same                          |
| Properties (`complementary` "Properties") | `Inspector mode="panel"` when the mode has one and (selection or pinned)                                                                                                                                                                                                                                                                                                                                                             | `Inspector mode="popover"` anchored to the selection                           | `Inspector mode="sheet"`      |

Live region: one polite `role="status"` region (`data-testid="workspace-announcer"`) announcing "Undid: rotate page 3" (first letter lowercased after "Undid: "/"Redid: "), mode changes ("Organize mode"), job completion and verification results; errors go to an assertive region.

- [ ] **Step 1: Tests** (jsdom, fake model with organize ops, fake render): Standard shows tablist "Modes", toolbar "Organize tools", complementary "Pages"; pressing F switches to Focus (dock tablist present, toolbar absent, palette present) and persists `layout: 'focus'`; `matchMedia('(max-width: 899px)')` true forces Focus with `size="lg"` dock and hides the Focus toggle; Mod+Z undoes and the announcer reads "Undid: rotate page 1 clockwise"; typing in the filename field does not trigger single-letter shortcuts; digit 1 activates Organize.
- [ ] **Step 2: Implement; commit** — `feat(workspace): WorkspaceShell with Standard, Focus and phone layouts, settings, shortcuts and live region`.

### Task B-14: Opening documents, the `pdf-edit` tool, hub and Home integration

**Files:**

- Create: `src/tools/pdf-edit/index.ts`, `src/tools/pdf-edit/Tool.tsx`, `src/pdf/workspace/OpenDocument.tsx`, `src/pdf/workspace/open-flow.ts` (+ test), `src/pdf/workspace/workspace-store.ts` (+ test), `src/app/pages/home/RecentDocuments.tsx`
- Modify: `src/app/App.tsx` (route `/pdf/edit/:mode?`), `src/app/pages/PdfHub.tsx` (spec routing + modes grid), `src/app/pages/Home.tsx` (Recent documents + PDF card routing), `src/app/drop-routing.ts` (`routePdfHubDrop`)

**Interfaces:**

```ts
// workspace-store.ts — hands documents to /pdf/edit without persisting bytes in the URL (spec §5.3 "workspace document store")
export interface PendingOpen {
  id: string;
  name: string;
  bytes: Uint8Array;
  wasEncrypted: boolean;
}
export function stageDocument(p: Omit<PendingOpen, 'id'>): string; // returns id for ?open=<id>; in memory, one-time
export function takeStagedDocument(id: string): PendingOpen | null;
// open-flow.ts
export type OpenResult =
  | { status: 'ready'; model: DocumentModel; blobs: BlobStore; info: DocInfo }
  | { status: 'locked'; file: LoadedFile } // needs password: PasswordPrompt inline
  | {
      status: 'restricted';
      model: DocumentModel;
      blobs: BlobStore;
      info: DocInfo;
    }; // owner-password-only: opens read-only badge
export async function openFile(
  file: LoadedFile | PendingOpen,
  services: Services,
): Promise<OpenResult>;
// > 1 GB -> TOO_LARGE "This file is larger than 1 GB, which browsers cannot edit safely."; > 200 MB -> caller shows the dismissible warning (existing SOFT_SIZE_LIMIT);
// preparePdf (phase 3) for encryption; restricted detection via qpdf.inspect (encrypted && !needsPassword);
// pdf.js open failure with INVALID_FILE -> returns error with a Repair action (qpdf optimize rewrite) offered by OpenDocument.
export function newDocumentState(
  name: string,
  bytes: Uint8Array,
  info: DocInfo,
  flags: { encryptedInput: boolean; restricted: boolean },
): { state: DocumentState; blobs: BlobStore };
export const routePdfHubDrop: (files: File[]) => Promise<DropDecision>; // 1 PDF -> /pdf/edit?open=; >= 2 PDFs -> /pdf/merge; images -> /pdf/images-to-pdf; mixed -> 'confirm-merge' decision (asks first: "Convert the images and merge everything?")
```

`pdf-edit` manifest: `{ id: 'pdf-edit', slug: 'edit', category: 'pdf', kind: 'workspace', name: 'PDF workspace', description: 'Open a PDF and edit, organise, fill, sign, redact and convert it in one place', keywords: ['editor', 'workspace', 'organize', 'sign', 'annotate'], icon: IconModeEdit, accepts: [{ kinds: ['pdf'] }], enabled: true }`. The registry treats `kind: 'workspace'` specially: its route is `/pdf/edit/:mode?` and `edit` stays reserved for every other tool (registry check: only a `workspace` tool may take a reserved slug).

`OpenDocument` (empty state, spec §13.3 Workspace row): `DropZone variant="fullscreen"` (window drag) plus an inline hero DropZone titled "Open a PDF" with "Choose file" (Mod+O), and `RecentDocuments` (up to 10, thumbnail via kit `Image`, name, `MetaList` ["37 pages", "edited 2 hours ago"] using `Intl.RelativeTimeFormat`, Remove IconButton "Remove {name} from this device", non-restorable ones show "Can't be restored by this version" + Delete). Loading: first-page skeleton (`LoadingState` "Opening {name}"). Locked: `PasswordPrompt` inline (existing component) with WRONG_PASSWORD inline error. Errors: `ErrorState` with actions — INVALID_FILE: "Try to repair" + "Choose another file"; TOO_LARGE: "Choose another file"; WORKER_CRASHED: auto-reopen once then "Reload".

Routes: `/pdf/edit` (empty state), `/pdf/edit?open=<id>` (staged), `/pdf/edit?doc=<id>` (restore), `/pdf/edit/<mode>` (mode deep link; unknown mode id -> the workspace shows Organize and a notify.info "There is no {x} mode; showing Organize").

- [ ] **Step 1: Tests.** open-flow: a 3-page fixture opens ready with a model of 3 pages; the AES fixture returns `locked`; owner-only fixture returns `restricted`; 1.1 GB fake `LoadedFile` (size field only) throws TOO_LARGE. workspace-store: take twice returns null the second time. routePdfHubDrop: table of the four cases.
- [ ] **Step 2: e2e** (`test/e2e/workspace-open.spec.ts`): drop `text-3.pdf` on `/pdf` -> URL `/pdf/edit` and `page-slot-1` contains `canvas[data-rendered="true"]`; `/pdf/edit` with the AES fixture shows the password field, wrong password shows "Wrong password", correct opens and the top bar shows "Not saved locally"; Home shows "Recent documents" after a document was opened and edited (autosave), clicking it restores.
- [ ] **Step 3: Implement; flip `route-table.spec.ts`'s `/pdf/edit` assertion; commit** — `feat(workspace): open flow with password, restricted and repair paths; /pdf/edit route; PDF hub and Home integration`.

### Task B-15: Export dialog and export pipeline

**Files:**

- Create: `src/pdf/doc/export.ts` (+ test), `src/pdf/doc/export-stages.ts`, `src/pdf/workspace/ExportDialog.tsx` (+ test), `src/pdf/workspace/export-options.ts`, `src/pdf/workspace/PreviewAsExported.tsx`

**Interfaces:**

```ts
// export-stages.ts — append-only (B: removeUnreferenced)
export interface ExportContext {
  model: DocumentModel;
  view: DocView;
  options: ExportOptions;
  services: Services;
  signal: AbortSignal;
  progress(p: JobProgress): void;
  warnings: string[];
}
export interface ExportStage {
  id: string;
  order: number;
  applies(ctx: ExportContext): boolean;
  run(bytes: Uint8Array, ctx: ExportContext): Promise<Uint8Array>;
}
export const EXPORT_STAGES: ExportStage[]; // B: [{ id: 'remove-unreferenced', order: 10, applies: history has redaction or sanitize checkpoint, run: qpdf.optimize({ removeUnreferenced: true, objectStreams: 'generate' }) }]
export interface ExportOptions {
  filename: string;
  onlyPages: PageId[] | null;
  stripMetadata: boolean;
  [key: string]: unknown;
} // Parts add keys (flatten, linearize, password, signature)
// export.ts
export async function exportDocument(
  model: DocumentModel,
  blobs: BlobStore,
  options: ExportOptions,
  env: {
    services: Services;
    signal: AbortSignal;
    progress(p: JobProgress): void;
  },
): Promise<{ bytes: Uint8Array; warnings: string[]; notes: string[] }>;
// planFor -> services.edit.call('materialize') -> stages sorted by order -> result. Throws ToolError; never returns partial output.
// export-options.ts — append-only option sections
export interface ExportOptionSection {
  id: string;
  order: number;
  title: string;
  visible(doc: DocumentApi): boolean;
  Component: ComponentType<{
    doc: DocumentApi;
    options: ExportOptions;
    set(patch: Partial<ExportOptions>): void;
  }>;
}
export const EXPORT_OPTION_SECTIONS: ExportOptionSection[]; // B: 'pages' (Export selected pages toggle), 'metadata' (Remove document properties)
```

ExportDialog (spec §6.4), `Dialog` titled "Export PDF":

- Filename `Input` label "File name" (default `deriveFilename(name, 'edited', 'pdf')` per existing helper semantics).
- "Changes" kit list: one row per `summarizeChanges` mode: mode icon, mode name, lines joined with ", ". Empty: "No changes. The export is a copy of the original."
- Option sections from `EXPORT_OPTION_SECTIONS` (visible ones, by order).
- Warnings (`Alert` warning): rasterised pages from checkpoint reports ("Pages 3 and 7 were turned into images during redaction"), "This document was opened with a password. The exported file is not password-protected." unless Protect configured (E adds that condition), plus `notes` from materialise after a run.
- "Preview page as exported" (for the current page) opens `PreviewAsExported`: materialises `onlyPages: [currentPageId]`, opens the bytes in the render worker, shows the bitmap (BitmapCanvas) beside the live render; automatic for pages with changes when the dialog opens (first changed page).
- Footer: Cancel, Export (primary). Running: `ProgressOverlay` "Exporting" with per-stage progress and Cancel; done: `saveBlob(bytes, filename, 'application/pdf')`, toast "Exported {filename}"; error: `ErrorState` inside the dialog with the message.

- [ ] **Step 1: Tests.** export.ts (Node with a fake edit client that calls `materialize` in-process and a fake qpdf): stages run in order and only when applicable; cancellation rejects with CANCELLED and no output. ExportDialog (jsdom, fake export): lists "Organize: 2 pages rotated, 1 page deleted", Export calls `saveBlob` with the filename, encrypted-input warning shown when `encryptedInput`.
- [ ] **Step 2: Implement; commit** — `feat(workspace): export dialog with change summary, option sections, preview as exported and staged export pipeline`.

### Task B-16: Organize mode; delete `pdf-organize`

**Files:**

- Create: `src/pdf/workspace/modes/organize/index.ts`, `Mode.tsx`, `OrganizeToolbar.tsx`, `CropTool.tsx`, `PageLabelsDialog.tsx`, `MergeInButton.tsx`, `split-extract.ts` (+ test), `src/shared/ui/icons/custom/organize.tsx`
- Modify: `src/pdf/workspace/modes/registry.ts` (append organize), `src/pdf/doc/materialize/organize.ts` (page.mergeIn handled by plan sources; no overlay materialisers needed for structure ops), `src/shared/ui/icons/index.ts`
- Delete: `src/tools/pdf-organize/` (move `lib/edits.test.ts` cases that still apply into `page-map.test.ts`), `test/e2e/pdf-organize.spec.ts` (replaced in B-18), interim slug `/pdf/organize`

**Interfaces:**

- Organize toolbar groups (labels are exact; shortcuts per spec §13.1):

| Group  | Item                                                                                                                                                                                                                        | Kind          | Shortcut         | Op / action                                                                                             |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Rotate | "Rotate left" (`IconRotatePageCcw`), "Rotate right" (`IconRotatePageCw`)                                                                                                                                                    | button        | Shift+R, R       | `page.rotate` delta -90 / 90 on selected pages (current page if none)                                   |
| Pages  | "Delete pages" (`IconTrash`), "Duplicate pages" (`IconDuplicatePage`), "Insert blank page" (`IconInsertBlankPage`)                                                                                                          | button        | Del, Mod+D, none | `page.delete`, `page.duplicate`, `page.insertBlank` after the current page with the current page's size |
| Shape  | "Crop" (`IconCropPage`, toggle tool `crop`), "Page size" (`IconScaling`, opens a Popover with A4/Letter/custom)                                                                                                             | toggle/button | none             | `page.crop`, `page.resize`                                                                              |
| Labels | "Page labels" (`IconPageLabel`)                                                                                                                                                                                             | button        | none             | `PageLabelsDialog` -> `page.label`                                                                      |
| Files  | "Merge in" (`IconMergeIn`, file picker + password prompt), "Extract pages" (`IconExtractPages`, split button: "Download" / "Open as new document"), "Split" (`IconSplitAt`, Popover: "At selected pages" / "Every N pages") | button/split  | none             | `page.mergeIn`; extract/split produce new files (spec §7.2), never doc changes                          |

- Organize icons (`custom/organize.tsx`), on the page outline `<rect x="6" y="3" width="12" height="18" rx="2"/>`: `IconInsertBlankPage` (+ plus `M12 9v6M9 12h6`), `IconDuplicatePage` (two offset rects), `IconExtractPages` (page + arrow out `M14 12h7M18 9l3 3-3 3`), `IconSplitAt` (page + dashed cut line `M3 12h18` with `strokeDasharray="2 2"`), `IconMergeIn` (page + arrow in `M3 12h7M7 9l3 3-3 3`), `IconCropPage` (crop corners), `IconPageLabel` (page + tag `M9 14h6l1.5 1.5L15 17H9z`), `IconRotatePageCw`/`IconRotatePageCcw` (page + curved arrow `M20 8a8 8 0 0 0-8-5` with head). Draw each with `defineIcon` on the 24 grid; review in the gallery at all sizes, both themes.
- Rail for Organize: multi-select, Alt+ArrowUp/Down move selected pages (`page.reorder`), drag reorder, Del deletes; `RailBadge` none.
- Page overlay: in `crop` tool, `SelectionFrame` over the page initialised to the current crop or full view; Enter commits `page.crop`; Esc cancels.
- `split-extract.ts`: `extractPages(model, blobs, pageIds): Promise<Uint8Array>` (materialise with `onlyPages`), `splitDocument(model, blobs, at: 'selected' | { every: number }): Promise<{ name: string; bytes: Uint8Array }[]>` (each part materialised; zip via `saveZip`). "Open as new document" stages bytes and opens `/pdf/edit?open=` in the same tab after confirming the current document is autosaved (or, when autosave is off, asks "Leave this document? Changes are not saved on this device.").

- [ ] **Step 1: Tests** — split-extract (Node, in-process materialise): extract pages 1 and 3 from a 3-page fixture -> 2 pages with the right text; split every 2 pages of a 5-page doc -> 3 files (2, 2, 1). Component tests for OrganizeToolbar: R rotates the current page (dispatches `page.rotate` 90), Del deletes selection, disabled "Delete pages" with reason "The document must keep at least one page" when all pages are selected.
- [ ] **Step 2: Implement; delete `pdf-organize`; update the registry e2e list. Commit** — `feat(organize-mode): all v1 page operations in the workspace; pdf-organize tool removed`.

### Task B-17: Fixtures, perf measurement, overlay-vs-materialised harness

**Files:**

- Modify: `test/fixtures/builders.ts` (`makeLargePdf(pages = 300)`: each page text + a 1200x1600 noise JPEG so the file is about 20 MB; `makeAnnotatedPdf()` placeholder is NOT added here: D adds it), `scripts/gen-fixtures.ts` (`large-300.pdf`)
- Create: `test/e2e/perf.spec.ts` (tagged `@perf`, excluded from the default run with `grepInvert: /@perf/` in `playwright.config.ts`), `test/helpers/pixel-diff.ts` (+ test), `test/visual-diff/overlay-vs-export.ts`

**Interfaces:**

```ts
// pixel-diff.ts — pure
export function pixelDiffRatio(
  a: { data: Uint8ClampedArray; width: number; height: number },
  b: typeof a,
  tolerance?: number,
): number; // fraction of pixels whose max channel delta > tolerance (default 24)
// overlay-vs-export.ts — Playwright helper used by C and D (spec §6.3 mitigation 3): renders the workspace page slot (bitmap + overlay)
// to PNG via locator.screenshot, renders the exported page with pdf.js at the same scale inside the page, compares with pixelDiffRatio <= 0.015.
export async function compareOverlayWithExport(
  page: Page,
  opts: { pageNumber: number; exportBytes: Uint8Array; scale: number },
): Promise<number>;
```

- [ ] **Step 1:** `perf.spec.ts` records: drop to first `canvas[data-rendered="true"]` time; scroll fps over 3 s of scripted wheel scrolling (count `requestAnimationFrame` callbacks); rotate-to-visible-change time; export time; long tasks via `PerformanceObserver('longtask')`. Writes `test-results/perf.json`. Asserts nothing in B (spec §15: not PR-blocking at first); G-6 adds budgets in a nightly job.
- [ ] **Step 2:** pixel-diff unit tests (identical = 0, one changed pixel in 100 = 0.01). Commit — `test: large-300 fixture, perf measurement spec and overlay-vs-export pixel harness`.

### Task B-18: Workspace e2e, visual baselines, P5-B verification

**Files:**

- Create: `test/e2e/workspace-organize.spec.ts`, `test/visual/workspace.visual.ts`
- Modify: `test/e2e/global-setup.ts` (warm `/pdf/edit` with `text-3.pdf`, ready `[data-testid="page-slot-1"] canvas[data-rendered="true"]`)

- [ ] **Step 1: e2e (spec §17 row B exit):** open `text-3.pdf` at `/pdf/edit`; select page 3 in the rail and press Alt+ArrowUp twice (page 3 first); press R; press Del on page 2; Mod+Z restores page 2 (announcer "Undid: delete page 2"); Mod+Shift+Z deletes again; reload the tab: the same pages, order, rotation, mode and undo availability come back (`?doc=` in the URL or Recent documents); Export -> download `text-3.edited.pdf`; reopen with pdf-lib: 2 pages, rotations `[90, 0]`, texts `['Alpha 3', 'Alpha 1']` (fixture text labels). Encrypted open covered in B-14.
- [ ] **Step 2: Visual:** workspace Standard and Focus with `text-3.pdf` open in Organize (desktop) and phone Focus; Export dialog; empty state with recent documents; password prompt — both themes; axe clean. Dynamic regions masked (`[data-dynamic]`: relative times).
- [ ] **Step 3: Perf:** run `pnpm test:e2e --grep @perf` once and paste `test-results/perf.json` into the PR description (measured, not gated).
- [ ] **Step 4:** Merge gate 1-6.

## PR boundary B — Workspace core

| Check                                            | Evidence                                                       |
| ------------------------------------------------ | -------------------------------------------------------------- |
| open -> organize -> undo -> reload -> export e2e | `workspace-organize.spec.ts` x3                                |
| autosave round trip                              | `serialize.test.ts`, `autosave.test.ts`                        |
| perf budgets measured on `large-300.pdf`         | `perf.json` in the PR                                          |
| workspace visual baselines both themes, axe      | `pnpm test:visual`                                             |
| `pdf-organize` deleted, no redirect              | `git grep pdf-organize src` empty; `/pdf/organize` is NotFound |

---

# Part P5-C — Fill & Sign with flat-form detection (PR: `feat/p5-c-fill-sign`)

**Scope (spec §8, §17 row C):** AcroForm in the overlay, signatures (move `pdf-sign` lib to `pdf/sign`; draw, upload, type; no saved signatures, decision G12), kit `FieldBox` + Fill & Sign icons, `pdf/detect` (geometry, cells, candidates, classification, confidence), flat fills, corrections, Tab order, My details, Make fillable, Flatten; PDF-hub detected-document card; delete `pdf-sign`, `pdf-fill-form`.

Cut from `master` after P5-B. Runs in parallel with D, E and F-1..F-5 (append-only registries).

### Task C-1: Move signature and form libraries into `src/pdf`

**Files:**

- Move: `src/tools/pdf-sign/lib/{stroke,pixels,placement,fonts,signature}.ts` (+ tests) -> `src/pdf/sign/` (`git mv`), `src/tools/pdf-fill-form/lib/values.ts` (+ test) -> merged into `src/pdf/edit/forms.ts` as `initialValues`/`changedValues`
- Modify: `src/pdf/edit/forms.ts` (+ tests: `listFormWidgets`, `setFieldValue`), `src/pdf/edit/index.ts`, `src/pdf/sign/index.ts` (new barrel), the two tools' imports (they still exist until C-14)

**Interfaces:**

```ts
// forms.ts additions
export interface FormWidget {
  fieldName: string;
  kind: FormField['kind'];
  pageIndex: number;
  rect: Box;
  readOnly: boolean;
  onValue?: string;
} // page space; one per widget (radios have several)
export async function listFormWidgets(bytes: Uint8Array): Promise<FormWidget[]>; // throws UNSUPPORTED_FEATURE (XFA_MESSAGE) for XFA
export function setFieldValue(
  form: PDFForm,
  name: string,
  value: FormValue,
  font: PDFFont,
): void; // the per-field body of fillForm, shared by the form.setValue materialiser
export function initialValues(fields: FormField[]): Record<string, FormValue>;
export function changedValues(
  fields: FormField[],
  values: Record<string, FormValue>,
  initial: Record<string, FormValue>,
): Record<string, FormValue>;
```

- [ ] **Step 1:** `git mv` files; update imports (`@/pdf/sign`); refactor `fillForm` to loop over `setFieldValue` (existing tests unchanged and green).
- [ ] **Step 2: Failing test** for `listFormWidgets` on `makeFormPdf()`: one entry per widget with `pageIndex` and a rect matching the widget's `/Rect`; XFA fixture throws UNSUPPORTED_FEATURE.
- [ ] **Step 3: Implement** (walk `form.getFields()`, `field.acroField.getWidgets()`, page by `widget.P()` ref or by scanning pages' `/Annots` for the widget ref when `/P` is missing). Commit — `refactor(pdf): signature lib to pdf/sign; form values and widget geometry in pdf/edit/forms`.

### Task C-2: Fill & Sign icons and kit `FieldBox`

**Files:**

- Create: `src/shared/ui/icons/custom/fill-sign.tsx`, `src/shared/ui/field-box.tsx` (+ test)
- Modify: `src/shared/ui/icons/index.ts` (append line), `src/shared/ui/index.ts`, gallery section

**Interfaces:**

```tsx
export type FieldBoxState =
  | 'field'
  | 'suggested'
  | 'filled'
  | 'focused'
  | 'error';
export interface FieldBoxProps {
  transform: OverlayTransform;
  box: Box;
  state: FieldBoxState;
  label: string; // accessible name, e.g. "Text field: Surname, empty"
  onActivate(): void; // click / Enter: open the inline editor
  onKeyDown?(e: React.KeyboardEvent): void;
  inTabOrder: boolean; // suggested fields are not (spec §8.4)
  children?: React.ReactNode; // inline editor slot (Input/Textarea/DateInput/Checkbox) when editing
  'data-testid'?: string; // "field-{id}"
}
// Visuals (tokens): field = accent-fg 1.5px outline + accent-soft fill; suggested = dotted info outline + info-soft fill;
// filled = accent-fg outline only (value text is drawn by the overlay); focused = 2px focus ring; error = danger outline + IconAlertCircle badge.
// forced-colors: outline uses CanvasText / Highlight.
```

Fill & Sign icons (24 grid, `defineIcon`): `IconFlatFormDetect` (page + dashed rect + magnifier), `IconMakeFillable` (dashed rect turning solid + plus), `IconFieldText` (rect + "T" drawn as paths `M9 10h6M12 10v5`), `IconFieldTick` (rect + check path `M8.5 12.5l2 2 4.5-4.5`), `IconFieldCross` (rect + `M9 9l6 6M15 9l-6 6`), `IconFieldDate` (rect + calendar ticks), `IconFieldSignature` (rect + scribble), `IconFieldSuggested` (dotted rect + small spark of 3 strokes), `IconSnapToCell` (grid + corner magnet), `IconNextField` (rect + chevron right), `IconMyDetails` (id card), `IconFlatten` (stacked layers merging), `IconSignatureDraw` (pen + scribble), `IconSignatureType` (text baseline + italic stroke), `IconSignatureUpload` (image + up arrow), `IconInitials` (two short scribbles). Paths are authored in this task on the 24 grid with stroke 1.75, reviewed in the gallery at every size, both themes.

- [ ] **Step 1: FieldBox tests** — renders a `button` named by `label` sized by the transform; `inTabOrder=false` sets `tabIndex=-1`; each state sets `data-state`; children render inside when provided.
- [ ] **Step 2: Implement; snapshot update; commit** — `feat(kit): FieldBox and the Fill & Sign icon set`.

### Task C-3: `pdf/detect/geometry.ts` — operator-list interpreter (spec §8.2 step 1, 4)

**Files:**

- Create: `src/pdf/detect/types.ts`, `src/pdf/detect/geometry.ts`, `src/pdf/detect/geometry.test.ts`

**Interfaces:**

```ts
// types.ts
export type Matrix = [number, number, number, number, number, number];
export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} // page space, points
export interface RectShape {
  x: number;
  y: number;
  w: number;
  h: number;
  filled: boolean;
  stroked: boolean;
  fill: string | null;
  alpha: number;
}
export interface GlyphBox {
  x: number;
  y: number;
  w: number;
  h: number;
  ch: string;
  cp: number;
  item: number;
  baseline: number;
  size: number;
  font: string;
}
export interface TextRun {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  baseline: number;
  size: number;
  font: string;
  item: number;
}
export interface PageGeometry {
  segments: Seg[];
  rects: RectShape[];
  runs: TextRun[];
  glyphs: GlyphBox[];
  opCount: number;
  skipped: 'too-complex' | null;
}
export interface OperatorListLike {
  fnArray: ArrayLike<number>;
  argsArray: ArrayLike<unknown>;
}
export interface OpsTable {
  save: number;
  restore: number;
  transform: number;
  constructPath: number;
  setLineWidth: number;
  setFillRGBColor: number;
  setStrokeRGBColor: number;
  setGState: number;
  paintFormXObjectBegin: number;
  paintFormXObjectEnd: number;
  paintImageMaskXObject: number;
  stroke: number;
  closeStroke: number;
  fill: number;
  eoFill: number;
  fillStroke: number;
  eoFillStroke: number;
  closeFillStroke: number;
  closeEOFillStroke: number;
  endPath: number;
}
// geometry.ts
export const MAX_PATH_OPS = 20_000; // spec §8.4: pages above this are skipped and reported
export function extractGeometry(
  list: OperatorListLike,
  OPS: OpsTable,
  text: PageTextItems,
  fontNames: Record<string, string>,
): PageGeometry;
```

- [ ] **Step 1: Failing tests** (Node; build tiny PDFs with pdf-lib content streams, run pdf.js `getOperatorList()` + `getTextContent()` in the test like `text.test.ts` does): (a) `0 0 m 100 0 l S` gives one segment (0,0)-(100,0); (b) `q 2 0 0 2 10 10 cm 0 0 m 50 0 l S Q` gives (10,10)-(110,10) (CTM applied); (c) `10 10 100 0.5 re f` gives a filled rect h=0.5 (later converted to a segment in C-4); (d) `10 10 50 30 re S` gives a stroked rect; (e) a white fill `1 g 0 0 100 1 re f` keeps `fill: '#ffffff'`; (f) `/GS1 gs` with `/ca 0.05` gives alpha 0.05; (g) text "Name:" at (72,700) size 12 yields one run and 5 glyph boxes whose x positions increase by proportional advance and whose union equals the run box; (h) a page with 20 001 path ops returns `skipped: 'too-complex'` and no segments.
- [ ] **Step 2: Implement**

```ts
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];
// pdf.js DrawOPS inside constructPath data (pdfjs-dist 6): moveTo 0, lineTo 1, curveTo 2, quadraticCurveTo 3, closePath 4.
const D = { moveTo: 0, lineTo: 1, curveTo: 2, quad: 3, close: 4 } as const;

interface GState {
  ctm: Matrix;
  fill: string | null;
  stroke: string | null;
  fillAlpha: number;
  strokeAlpha: number;
}

export function extractGeometry(
  list: OperatorListLike,
  OPS: OpsTable,
  text: PageTextItems,
  fontNames: Record<string, string>,
): PageGeometry {
  let pathOps = 0;
  for (let i = 0; i < list.fnArray.length; i++)
    if (list.fnArray[i] === OPS.constructPath) pathOps++;
  const runs = textRuns(text, fontNames);
  const glyphs = runs.flatMap(splitGlyphs);
  if (pathOps > MAX_PATH_OPS)
    return {
      segments: [],
      rects: [],
      runs,
      glyphs,
      opCount: pathOps,
      skipped: 'too-complex',
    };

  const segments: Seg[] = [];
  const rects: RectShape[] = [];
  const stack: GState[] = [];
  let g: GState = {
    ctm: [1, 0, 0, 1, 0, 0],
    fill: '#000000',
    stroke: '#000000',
    fillAlpha: 1,
    strokeAlpha: 1,
  };
  let maskDepth = 0; // inside image masks we ignore paths (spec §8.2)
  const FILLS = new Set([OPS.fill, OPS.eoFill]);
  const STROKES = new Set([OPS.stroke, OPS.closeStroke]);
  const BOTH = new Set([
    OPS.fillStroke,
    OPS.eoFillStroke,
    OPS.closeFillStroke,
    OPS.closeEOFillStroke,
  ]);

  for (let i = 0; i < list.fnArray.length; i++) {
    const fn = list.fnArray[i];
    const args = list.argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push({ ...g });
    else if (fn === OPS.restore) g = stack.pop() ?? g;
    else if (fn === OPS.transform)
      g = { ...g, ctm: mul(args as Matrix, g.ctm) };
    else if (fn === OPS.setFillRGBColor) g = { ...g, fill: String(args[0]) };
    else if (fn === OPS.setStrokeRGBColor)
      g = { ...g, stroke: String(args[0]) };
    else if (fn === OPS.setGState) {
      for (const [k, v] of args[0] as [string, unknown][]) {
        if (k === 'ca') g = { ...g, fillAlpha: Number(v) };
        if (k === 'CA') g = { ...g, strokeAlpha: Number(v) };
      }
    } else if (fn === OPS.paintFormXObjectBegin) {
      stack.push({ ...g });
      const m = args[0] as Matrix | null;
      if (m) g = { ...g, ctm: mul(m, g.ctm) };
    } else if (fn === OPS.paintFormXObjectEnd) g = stack.pop() ?? g;
    else if (fn === OPS.constructPath) {
      if (maskDepth > 0) continue;
      const [paint, [data]] = args as [number, [ArrayLike<number> | null]];
      if (!data) continue;
      const filled = FILLS.has(paint) || BOTH.has(paint);
      const stroked = STROKES.has(paint) || BOTH.has(paint);
      if (!filled && !stroked) continue; // endPath (clip-only paths)
      const alpha = filled ? g.fillAlpha : g.strokeAlpha;
      if (alpha < 0.1) continue;
      collectPath(data, g.ctm, filled, stroked, g.fill, alpha, segments, rects);
    }
  }
  return { segments, rects, runs, glyphs, opCount: pathOps, skipped: null };
}
```

`collectPath` walks the DrawOPS buffer: it tracks subpaths; a subpath of exactly `moveTo + 3 lineTo + close` (or 4 lineTo returning to start) whose transformed edges are axis-aligned within 0.01pt becomes a `RectShape` (pdf.js expands `re` into exactly that shape); otherwise every `lineTo` of a stroked path becomes a `Seg` (transformed), and curves are ignored (they do not form table rules). `paintImageMaskXObject` does not open a scope in pdf.js; the mask-depth guard covers inline Type3 glyph procedures painted through `paintFormXObjectBegin` with a mask flag (pdf.js passes it for `/ImageMask` forms; verify at task start and keep `maskDepth` at 0 if pdf.js does not expose it).

`textRuns` converts each text item to a run: `x = transform[4]`, `baseline = transform[5]`, `size = hypot(transform[2], transform[3])` (font size in page space), `w = item.width`, ascent/descent from `text.styles[fontName]` (fallback 0.8/-0.2), `y = baseline + descent * size`, `h = (ascent - descent) * size`; rotated text (transform[1] != 0) is kept but excluded from cell labelling (flag via `font` suffix ` rotated`). `splitGlyphs` divides a run proportionally: advance = w / length of `Array.from(str)` and emits one `GlyphBox` per code point with `cp`.

- [ ] **Step 3: Commit** — `feat(pdf-detect): operator-list geometry extraction with CTM, colours, alpha and per-glyph boxes`.

### Task C-4: Segment normalisation, snapping and merging (spec §8.2 steps 2-3)

**Files:**

- Create: `src/pdf/detect/segments.ts` (+ test)

**Interfaces:**

```ts
export interface HLine {
  y: number;
  x1: number;
  x2: number;
} // x1 < x2
export interface VLine {
  x: number;
  y1: number;
  y2: number;
} // y1 < y2
export interface Lines {
  h: HLine[];
  v: VLine[];
}
export const AXIS_TOL = 0.6; // |dy| or |dx| for horizontal/vertical
export const MIN_LEN = 4;
export const THIN = 2; // filled rect with min side <= 2pt -> centreline (Word table borders)
export const SNAP_TOL = 1.5;
export const MERGE_GAP = 2;
export function toLines(segments: Seg[], rects: RectShape[]): Lines;
export function snap(lines: Lines): Lines; // single-linkage clustering of y (h) and x (v), replaced by cluster mean
export function mergeCollinear(lines: Lines): Lines;
export function coverage(
  lines: HLine[] | VLine[],
  at: number,
  from: number,
  to: number,
): number; // fraction of [from,to] covered by lines at coordinate `at` (exact after snap)
export function normaliseLines(segments: Seg[], rects: RectShape[]): Lines; // toLines -> snap -> mergeCollinear; lines indexed by coordinate for coverage()
```

- [ ] **Step 1: Failing tests** — diagonal segments dropped; a 0.5pt-high filled rect becomes one horizontal line at its centre; a stroked 50x30 rect gives 2 h + 2 v lines; a white thin filled rect (`fill '#ffffff'`) is dropped; lines at y=100.0 and y=101.2 snap to 100.6; segments [0,50] and [51.5,100] on one y merge to [0,100]; gap 3 stays split; `coverage` of [0,100] by [0,45] + [50,100] equals 0.95.
- [ ] **Step 2: Implement**

```ts
export function toLines(segments: Seg[], rects: RectShape[]): Lines {
  const h: HLine[] = [];
  const v: VLine[] = [];
  const pushSeg = (s: Seg) => {
    const dx = Math.abs(s.x2 - s.x1),
      dy = Math.abs(s.y2 - s.y1);
    if (dy <= AXIS_TOL && dx >= MIN_LEN)
      h.push({
        y: (s.y1 + s.y2) / 2,
        x1: Math.min(s.x1, s.x2),
        x2: Math.max(s.x1, s.x2),
      });
    else if (dx <= AXIS_TOL && dy >= MIN_LEN)
      v.push({
        x: (s.x1 + s.x2) / 2,
        y1: Math.min(s.y1, s.y2),
        y2: Math.max(s.y1, s.y2),
      });
  };
  segments.forEach(pushSeg);
  for (const r of rects) {
    if (r.filled && r.fill && r.fill.toLowerCase() === '#ffffff') continue; // white-on-white (spec §8.2)
    const thin = Math.min(r.w, r.h) <= THIN;
    if (r.filled && thin) {
      if (r.w >= r.h)
        pushSeg({
          x1: r.x,
          y1: r.y + r.h / 2,
          x2: r.x + r.w,
          y2: r.y + r.h / 2,
        });
      else
        pushSeg({
          x1: r.x + r.w / 2,
          y1: r.y,
          x2: r.x + r.w / 2,
          y2: r.y + r.h,
        });
    } else if (r.stroked && r.w > THIN && r.h > THIN) {
      pushSeg({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y });
      pushSeg({ x1: r.x, y1: r.y + r.h, x2: r.x + r.w, y2: r.y + r.h });
      pushSeg({ x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.h });
      pushSeg({ x1: r.x + r.w, y1: r.y, x2: r.x + r.w, y2: r.y + r.h });
    }
  }
  return { h, v };
}

function clusterMeans(values: number[]): Map<number, number> {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const out = new Map<number, number>();
  let group: number[] = [];
  const flush = () => {
    const m = group.reduce((s, x) => s + x, 0) / group.length;
    group.forEach((x) => out.set(x, m));
    group = [];
  };
  for (const x of sorted) {
    if (group.length && x - group[group.length - 1] > SNAP_TOL) flush();
    group.push(x);
  }
  if (group.length) flush();
  return out;
}

export function snap({ h, v }: Lines): Lines {
  const ys = clusterMeans(h.map((l) => l.y));
  const xs = clusterMeans(v.map((l) => l.x));
  // Snap line ends to the nearest perpendicular cluster within SNAP_TOL so corners meet exactly.
  const near = (m: Map<number, number>, x: number) => {
    let best = x,
      d = SNAP_TOL;
    for (const c of new Set(m.values()))
      if (Math.abs(c - x) <= d) {
        best = c;
        d = Math.abs(c - x);
      }
    return best;
  };
  return {
    h: h.map((l) => ({
      y: ys.get(l.y)!,
      x1: near(xs, l.x1),
      x2: near(xs, l.x2),
    })),
    v: v.map((l) => ({
      x: xs.get(l.x)!,
      y1: near(ys, l.y1),
      y2: near(ys, l.y2),
    })),
  };
}

export function mergeCollinear({ h, v }: Lines): Lines {
  const mergeAxis = <T>(
    items: T[],
    key: (t: T) => number,
    lo: (t: T) => number,
    hi: (t: T) => number,
    make: (k: number, a: number, b: number) => T,
  ): T[] => {
    const byKey = new Map<number, T[]>();
    for (const it of items)
      byKey.set(key(it), [...(byKey.get(key(it)) ?? []), it]);
    const out: T[] = [];
    for (const [k, list] of byKey) {
      list.sort((a, b) => lo(a) - lo(b));
      let [a, b] = [lo(list[0]), hi(list[0])];
      for (const it of list.slice(1)) {
        if (lo(it) <= b + MERGE_GAP) b = Math.max(b, hi(it));
        else {
          out.push(make(k, a, b));
          [a, b] = [lo(it), hi(it)];
        }
      }
      out.push(make(k, a, b));
    }
    return out;
  };
  return {
    h: mergeAxis(
      h,
      (l) => l.y,
      (l) => l.x1,
      (l) => l.x2,
      (y, x1, x2) => ({ y, x1, x2 }),
    ),
    v: mergeAxis(
      v,
      (l) => l.x,
      (l) => l.y1,
      (l) => l.y2,
      (x, y1, y2) => ({ x, y1, y2 }),
    ),
  };
}
```

`coverage` sums the overlap of `[from,to]` with every line whose coordinate equals `at` (exact match after snapping; use a `Map<number, Line[]>` index built in `normaliseLines`).

- [ ] **Step 3: Commit** — `feat(pdf-detect): axis-aligned line normalisation, snapping and collinear merging`.

### Task C-5: Cell reconstruction (spec §8.3 rows 1-2)

**Files:**

- Create: `src/pdf/detect/cells.ts` (+ test)

**Interfaces:**

```ts
export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  table: number;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}
export const SIDE_COVERAGE = 0.9;
export function buildCells(lines: Lines): { cells: Cell[]; squares: Box[] }; // squares: closed boxes 6..16pt (checkbox candidates, C-6) found before the cell size filter
export function cellSizeOk(c: { w: number; h: number }): boolean; // w >= 12, 8 <= h <= 220
```

- [ ] **Step 1: Failing tests** — a 3x2 grid of lines yields 6 cells with rows/cols; a grid whose middle vertical line covers only the top row yields a merged bottom cell (`colSpan 2`); a missing outer side (coverage 0.5) yields no cells on that edge; a 10x10 closed box is returned in `squares`, not `cells`; two separate tables get different `table` ids; a "table" formed by a single horizontal line yields nothing.
- [ ] **Step 2: Implement** with elementary cells + union-find:

```ts
export function buildCells(lines: Lines): { cells: Cell[]; squares: Box[] } {
  const xs = [...new Set(lines.v.map((l) => l.x))].sort((a, b) => a - b);
  const ys = [...new Set(lines.h.map((l) => l.y))].sort((a, b) => a - b);
  const nx = xs.length - 1,
    ny = ys.length - 1;
  if (nx < 1 || ny < 1) return { cells: [], squares: [] };
  const vCov = (x: number, y1: number, y2: number) =>
    coverage(lines.v, x, y1, y2);
  const hCov = (y: number, x1: number, x2: number) =>
    coverage(lines.h, y, x1, x2);
  const idx = (i: number, j: number) => j * nx + i;
  const parent = Array.from({ length: nx * ny }, (_, k) => k);
  const find = (k: number): number =>
    parent[k] === k ? k : (parent[k] = find(parent[k]));
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  // Join neighbours whose shared edge is NOT drawn.
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      if (i + 1 < nx && vCov(xs[i + 1], ys[j], ys[j + 1]) < SIDE_COVERAGE)
        union(idx(i, j), idx(i + 1, j));
      if (j + 1 < ny && hCov(ys[j + 1], xs[i], xs[i + 1]) < SIDE_COVERAGE)
        union(idx(i, j), idx(i, j + 1));
    }
  // Components -> bounding boxes in grid indices.
  const comps = new Map<
    number,
    { i0: number; i1: number; j0: number; j1: number; n: number }
  >();
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const r = find(idx(i, j));
      const c = comps.get(r) ?? { i0: i, i1: i, j0: j, j1: j, n: 0 };
      c.i0 = Math.min(c.i0, i);
      c.i1 = Math.max(c.i1, i);
      c.j0 = Math.min(c.j0, j);
      c.j1 = Math.max(c.j1, j);
      c.n++;
      comps.set(r, c);
    }
  const closed: {
    x: number;
    y: number;
    w: number;
    h: number;
    i0: number;
    i1: number;
    j0: number;
    j1: number;
  }[] = [];
  for (const c of comps.values()) {
    if (c.n !== (c.i1 - c.i0 + 1) * (c.j1 - c.j0 + 1)) continue; // not rectangular
    const x1 = xs[c.i0],
      x2 = xs[c.i1 + 1],
      y1 = ys[c.j0],
      y2 = ys[c.j1 + 1];
    const sides = [
      hCov(y1, x1, x2),
      hCov(y2, x1, x2),
      vCov(x1, y1, y2),
      vCov(x2, y1, y2),
    ];
    if (sides.some((s) => s < SIDE_COVERAGE)) continue; // open region (outside a table)
    closed.push({ x: x1, y: y1, w: x2 - x1, h: y2 - y1, ...c });
  }
  const squares = closed
    .filter((b) => Math.abs(b.w - b.h) <= 1.5 && b.w >= 6 && b.w <= 16)
    .map(({ x, y, w, h }) => ({ x, y, width: w, height: h }));
  const sized = closed.filter(cellSizeOk);
  return { cells: assignTables(sized), squares };
}
```

`assignTables` unions cells whose rectangles share an edge segment (touching within 0.5pt with overlap > 0), numbers tables in reading order (top to bottom, then left), and sets `row`/`col` as the index of the cell's top y / left x among that table's distinct values (top row = 0; PDF y is up, so sort descending by `y + h`), `rowSpan`/`colSpan` from the grid index span. Minimality holds by construction: any drawn line strictly inside separates elementary cells, so the component would not contain it.

- [ ] **Step 3: Commit** — `feat(pdf-detect): table cell reconstruction from covered edges with merged cells and tables`.

### Task C-6: Candidate generation (spec §8.3)

**Files:**

- Create: `src/pdf/detect/candidates.ts` (+ test), `src/pdf/detect/glyph-codes.ts`

**Interfaces:**

```ts
export type CandidateSource =
  | 'cell'
  | 'trailing'
  | 'underscore'
  | 'ruled'
  | 'checkbox-vector'
  | 'checkbox-glyph'
  | 'date';
export interface Candidate {
  source: CandidateSource;
  rect: Box;
  exact: boolean;
  prechecked?: boolean;
  cell?: Cell;
  anchorText?: string;
}
export function cellCandidates(
  cells: Cell[],
  glyphs: GlyphBox[],
): { empty: Candidate[]; labels: Cell[]; trailing: Candidate[] }; // spec §8.4 label/empty/partial
export function underscoreRuns(runs: TextRun[]): Candidate[];
export function ruledLines(
  lines: Lines,
  cells: Cell[],
  glyphs: GlyphBox[],
  medianLineHeight: number,
): Candidate[];
export function vectorCheckboxes(
  squares: Box[],
  rects: RectShape[],
  glyphs: GlyphBox[],
): Candidate[];
export function glyphCheckboxes(glyphs: GlyphBox[]): Candidate[];
export function datePatterns(runs: TextRun[]): Candidate[];
export function medianLineHeight(runs: TextRun[]): number; // median run height; 12 when no text
// glyph-codes.ts — numeric code points only (rule (a), spec §8.3)
export const EMPTY_BOX_UNICODE = [0x2610, 0x25a1, 0x25a2, 0x274f, 0x2b1c];
export const CHECKED_BOX_UNICODE = [0x2611, 0x2612];
export const SYMBOL_FONT_CODES: {
  font: RegExp;
  empty: number[];
  checked: number[];
}[] = [
  { font: /wingdings[- ]?2/i, empty: [0xa3], checked: [0x53, 0x54] },
  {
    font: /wingdings(?![- ]?[23])/i,
    empty: [0xa8, 0x6f, 0x71],
    checked: [0xfe, 0xfd],
  },
  { font: /zapfdingbats|dingbats/i, empty: [0x6f, 0x71], checked: [] },
  { font: /symbol/i, empty: [], checked: [] },
];
// pdf.js maps symbolic fonts without ToUnicode into the private use area: code c may arrive as 0xF000 + c. Match both.
```

- [ ] **Step 1: Failing tests** (synthetic geometry, no PDFs): cell with "Name" glyphs covering > 8% and >= 2 letters is a label; cell with no glyph in its 1.5pt inset is empty -> candidate rect = inset cell; "Name:" in the left 20% of a 300pt-wide cell -> trailing candidate to the right of the last glyph (free width >= max(40, 45%)), inset 1.5pt; run "Signature: **\_\_**" -> underscore candidate from the first underscore to the last, height 1.25 x size, bottom at baseline - 1; run "........" (8 dots) -> candidate; a 200pt horizontal line with no glyph within 1.2 x median line height above it and not on any cell edge -> ruled candidate with height = median line height; the same line with "Name" just above it is rejected; 10x10 square with nothing inside -> checkbox (exact) inset 1pt; a glyph `String.fromCodePoint(0x2612)` -> prechecked checkbox; Wingdings 2 code 0xF053 -> prechecked; "DD/MM/YYYY" and "**/**/\_\_\_\_" -> date candidates.
- [ ] **Step 2: Implement.** Key rules:

```ts
const inset = (b: Box, d: number): Box => ({
  x: b.x + d,
  y: b.y + d,
  width: b.width - 2 * d,
  height: b.height - 2 * d,
});
const intersects = (
  a: Box,
  g: { x: number; y: number; w: number; h: number },
) =>
  g.x < a.x + a.width &&
  g.x + g.w > a.x &&
  g.y < a.y + a.height &&
  g.y + g.h > a.y;
const area = (b: Box) => b.width * b.height;

export function cellCandidates(cells: Cell[], glyphs: GlyphBox[]) {
  const empty: Candidate[] = [],
    labels: Cell[] = [],
    trailing: Candidate[] = [];
  for (const c of cells) {
    const box = inset({ x: c.x, y: c.y, width: c.w, height: c.h }, 1.5);
    const inside = glyphs.filter((g) => intersects(box, g));
    if (inside.length === 0) {
      empty.push({ source: 'cell', rect: box, exact: true, cell: c });
      continue;
    }
    const covered = inside.reduce((s, g) => s + g.w * g.h, 0) / area(box);
    const letters = inside.filter((g) => /\p{L}/u.test(g.ch)).length;
    if (covered > 0.08 && letters >= 2) labels.push(c);
    const lastX = Math.max(...inside.map((g) => g.x + g.w));
    const free = box.x + box.width - lastX;
    if (free >= Math.max(40, 0.45 * box.width)) {
      trailing.push({
        source: 'trailing',
        rect: {
          x: lastX + 1.5,
          y: box.y,
          width: free - 1.5,
          height: box.height,
        },
        exact: false,
        cell: c,
        anchorText: inside.map((g) => g.ch).join(''),
      });
    }
  }
  return { empty, labels, trailing };
}
```

A label cell can also yield a trailing candidate ("Name:" inside a wide cell); `classify` decides. `underscoreRuns` scans each run's string with `/_{3,}|\.{5,}|\u2026{2,}/g` (two or more U+2026 ellipsis characters) — written as `new RegExp('_{3,}|\\.{5,}|' + String.fromCodePoint(0x2026) + '{2,}', 'g')` (U+2026 is not banned, but keep code points uniform); it joins consecutive runs on one baseline (|dy| <= 0.5) when both end/start with underscores; rect x from proportional advance of the matched indices. `ruledLines`: h-lines with `x2 - x1 >= 36`, not within 1pt of any cell's top/bottom edge with x-overlap > 50%, and no glyph whose bottom is within `[y, y + 1.2 * mlh]` overlapping the x-range; rect `{x: x1, y, width: x2-x1, height: mlh}`. `vectorCheckboxes` = `squares` plus stroked `RectShape`s with `|w-h| <= 1.5` and `6 <= w <= 16` (dedupe by IoU > 0.8), empty inside (no glyph intersects `inset(box, 1)`). `glyphCheckboxes` checks `cp` against Unicode lists and, when `font` matches a `SYMBOL_FONT_CODES` entry, `cp` or `cp - 0xF000`. `datePatterns`: `/\b(?:dd|mm)\s*[/.-]\s*(?:mm|dd)\s*[/.-]\s*(?:yy){1,2}\b/i`, `/_{2}\s*\/\s*_{2}\s*\/\s*_{2,4}/`, `/\b\d{2}\/\d{2}\/\d{4}\b/` is NOT a placeholder (already filled) and is ignored.

- [ ] **Step 3: Commit** — `feat(pdf-detect): candidates from cells, trailing space, underscore runs, ruled lines, checkboxes and date patterns`.

### Task C-7: Classification, labels, types, autofill keys, confidence, reading order (spec §8.4, §8.5 Tab)

**Files:**

- Create: `src/pdf/detect/classify.ts`, `confidence.ts`, `autofill.ts`, `reading-order.ts`, `src/pdf/detect/index.ts` (`detectPage`), tests for each

**Interfaces:**

```ts
export type FieldType = 'text' | 'multiline' | 'tick' | 'date' | 'signature';
export type AutofillKey =
  | 'fullName'
  | 'firstName'
  | 'surname'
  | 'address1'
  | 'address2'
  | 'address3'
  | 'town'
  | 'county'
  | 'postcode'
  | 'country'
  | 'email'
  | 'phone'
  | 'dob'
  | 'nationality'
  | 'occupation';
export interface DetectedField {
  id: string; // deterministic: `${pageIndex}:${source}:${round(x)}:${round(y)}`
  pageIndex: number; // index within the source document
  rect: Box;
  type: FieldType;
  label: string | null;
  autofill: AutofillKey | null;
  confidence: number;
  status: 'field' | 'suggested';
  source: CandidateSource;
  prechecked?: boolean;
  table?: number;
  row?: number;
  col?: number;
}
export interface PageDetection {
  pageIndex: number;
  fields: DetectedField[];
  skipped: 'too-complex' | null;
  ms: number;
}
// autofill.ts — plain table for i18n later
export const AUTOFILL_DICTIONARY: { key: AutofillKey; pattern: RegExp }[];
export function autofillKey(label: string | null): AutofillKey | null;
// confidence.ts
export interface ConfidenceInput {
  exact: boolean;
  hasLabel: boolean;
  plausible: boolean;
  peers: number;
  inHeaderRow: boolean;
}
export function confidence(i: ConfidenceInput): number; // 0.35*exact + 0.25*hasLabel + 0.15*plausible + 0.15*(peers>=2) + 0.10*!inHeaderRow, clamped [0,1]
export const FIELD_MIN = 0.7,
  SUGGEST_MIN = 0.45;
// classify.ts
export function classify(
  geom: PageGeometry,
  lines: Lines,
  cells: Cell[],
  squares: Box[],
  pageIndex: number,
): DetectedField[];
export function dedupeAgainstWidgets(
  fields: DetectedField[],
  widgets: { pageIndex: number; rect: Box }[],
): DetectedField[]; // drop IoU >= 0.3 (spec §8.1)
export function isFlatForm(
  pages: PageDetection[],
  hasAcroForm: boolean,
): boolean; // no AcroForm and (>= 5 fields at c >= 0.7, or >= 3 on each of >= 2 pages)
// reading-order.ts
export function readingOrder(
  fields: { pageNumber: number; rect: Box }[],
  lineHeight: number,
): number[]; // indices: by page, then row bands (y-cluster tol 0.5 x line height, top to bottom), then x
// index.ts — the per-page pipeline (render worker)
export function detectPage(
  geom: PageGeometry,
  pageIndex: number,
): PageDetection;
```

- [ ] **Step 1: Failing tests** — autofill: "Surname" -> surname, "Family name" -> surname, "Forename(s)" -> firstName, "Post code" -> postcode, "Eircode" -> postcode, "Tel" -> phone, "Date of birth" -> dob, "Address line 2" -> address2, "Address" (first of three stacked) -> address1; type inference: tick for checkbox sources, date for label "Date of birth" or pattern source, signature for "Signature" / "Sign here", multiline when height >= 2.2 x median line height; confidence table (all features 1.0, none 0.0, exact+label 0.6); label assignment: cell to the left on the same row band wins over text above; column header used when no left label; checkbox label = nearest text to the right on the same baseline (|dy| <= 0.3 x size); header row detection (first row of a table where all cells are labels) lowers confidence of empty cells in it; reading order on a 2-column form goes row by row, not column by column; `isFlatForm` thresholds.
- [ ] **Step 2: Implement**

```ts
export const AUTOFILL_DICTIONARY = [
  { key: 'surname', pattern: /\b(surname|last\s*name|family\s*name)\b/i },
  { key: 'firstName', pattern: /\b(first\s*name|forename|given\s*name)s?\b/i },
  { key: 'fullName', pattern: /\b(full\s*name|name)\b/i },
  { key: 'address1', pattern: /\baddress(\s*line)?\s*1\b|\baddress\b/i },
  { key: 'address2', pattern: /\baddress(\s*line)?\s*2\b/i },
  { key: 'address3', pattern: /\baddress(\s*line)?\s*3\b/i },
  { key: 'town', pattern: /\b(town|city)\b/i },
  { key: 'county', pattern: /\b(county|state|province)\b/i },
  {
    key: 'postcode',
    pattern: /\b(post\s*code|postal\s*code|zip(\s*code)?|eircode)\b/i,
  },
  { key: 'country', pattern: /\bcountry\b/i },
  { key: 'email', pattern: /\be-?mail\b/i },
  { key: 'phone', pattern: /\b(phone|telephone|tel|mobile)\b/i },
  { key: 'dob', pattern: /\b(date\s*of\s*birth|d\.?o\.?b\.?|birth\s*date)\b/i },
  { key: 'nationality', pattern: /\bnationality\b/i },
  { key: 'occupation', pattern: /\b(occupation|job\s*title|profession)\b/i },
] as const satisfies readonly { key: AutofillKey; pattern: RegExp }[];
// Order matters: specific keys before generic "name"/"address". "Address" stacked rows: classify assigns address1..3 by row order within a group of consecutive address-labelled fields.

export function confidence(i: ConfidenceInput): number {
  const c =
    0.35 * +i.exact +
    0.25 * +i.hasLabel +
    0.15 * +i.plausible +
    0.15 * +(i.peers >= 2) +
    0.1 * +!i.inHeaderRow;
  return Math.min(1, Math.max(0, Math.round(c * 100) / 100));
}
const plausible = (type: FieldType, b: Box) =>
  type === 'tick'
    ? b.width >= 6 && b.width <= 16
    : type === 'multiline'
      ? b.height >= 10
      : b.height >= 10 && b.height <= 40;
```

`classify` steps: `mlh = medianLineHeight(runs)`; candidates from C-6; empty cells and trailing regions; for each candidate: label via the first-match rules (left same band: label cells whose vertical centre is within the candidate's y-range and whose right edge is within 4pt of the candidate's left; else text runs ending left of the rect on the same band within 150pt; else runs directly above within 1.5 x mlh overlapping x; checkboxes: nearest run to the right on the same baseline); type; autofill key from label; peers = candidates in the same table with width and height within 2pt; header row flag; confidence; keep `>= SUGGEST_MIN`; status by `FIELD_MIN`; remove duplicates (two candidates with IoU > 0.6: keep the higher confidence, preferring `cell` over `ruled`). `detectPage` = normaliseLines -> buildCells -> classify, with `performance.now()` timing (`ms`).

- [ ] **Step 3: Commit** — `feat(pdf-detect): labels, types, autofill keys, confidence, flat-form verdict and reading order`.

### Task C-8: Detection fixtures and the precision/recall suite (spec §8.7)

**Files:**

- Create: `test/fixtures/flat-form.ts` (`makeFlatFormWord`, `makeFlatFormStroked`, `makeNegativeReport`, `makeMixedAcroform`, `makeScanForm`), `src/pdf/detect/detect.metrics.test.ts`
- Modify: `scripts/gen-fixtures.ts` (write PDFs and `flat-form-word.truth.json`), `package.json` (dev: `@fontsource/noto-sans-symbols-2`), `.gitignore` (`test/fixtures/private/`)

**Interfaces:**

```ts
export interface TruthField {
  page: number;
  rect: Box;
  type: FieldType;
  label: string | null;
}
export interface FlatFormFixture {
  bytes: Uint8Array;
  truth: TruthField[];
}
export async function makeFlatFormWord(): Promise<FlatFormFixture>; // 6 pages, Word-like: 0.5pt thin filled-rect borders
export async function makeFlatFormStroked(): Promise<FlatFormFixture>; // same layout, stroked lines (LibreOffice style)
export async function makeNegativeReport(): Promise<Uint8Array>; // prose + a filled data table
export async function makeMixedAcroform(): Promise<FlatFormFixture>; // half widgets, half drawn cells; truth = drawn half only
export async function makeScanForm(): Promise<Uint8Array>; // image-only render of page 1 of the flat form (for P5-F)
```

Layout written by one `drawForm(page, style: 'thin-fill' | 'stroke')` helper (pdf-lib `drawRectangle` with `borderWidth` for stroke, `drawRectangle` with height 0.5 and `color` for thin fills):

- Page 1: header table ("Applicant details" header row spanning 2 columns), rows Surname / Forename(s) / Date of birth / Address (3 stacked rows) / Town / Postcode / Email / Telephone: label cell 160pt left, empty cell 340pt right, row height 22pt.
- Page 2: a 4-column table with a header row ("Name", "Relationship", "Date of birth", "Phone") and 4 empty rows (row/column consistency), one merged cell row ("Notes", spanning 3 columns).
- Page 3: "Name: " followed by an underscore run, "Signature: ******\_\_******", "Date: **/**/\_\_\_\_", dotted leader "Occupation ........................", and two ruled lines with labels to their left.
- Page 4: vector checkboxes (10pt squares) with labels to their right ("Yes", "No", "I agree"), and glyph checkboxes U+2610 and U+2612 written in Noto Sans Symbols 2 (subset embedded with fontkit) from numeric code points (`String.fromCodePoint(0x2610)`), labels to their right; truth marks U+2612 as `prechecked`.
- Page 5: a "Details" cell 120pt high (multiline) and a "Cell with trailing space" row ("Name:" text inside a 400pt cell).
- Page 6: page 1's table on a `/Rotate 90` page.

Truth rects are the inset rects the rules produce (computed by the builder from the same layout constants, not from the detector).

- [ ] **Step 1: Metrics test**

```ts
const iou = (a: Box, b: Box) => {
  const x = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const y = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
  const i = x * y;
  return i / (a.width * a.height + b.width * b.height - i);
};
async function detectAll(bytes: Uint8Array): Promise<DetectedField[]> {
  /* pdf.js in Node: per page getOperatorList + getTextContent + font names -> extractGeometry -> detectPage */
}
describe.each([
  ['word', makeFlatFormWord],
  ['stroked', makeFlatFormStroked],
])('%s flat form', (_n, make) => {
  it('precision and recall >= 0.90 at IoU >= 0.6; labels >= 0.85; ticks and dates exact', async () => {
    const { bytes, truth } = await make();
    const found = (await detectAll(bytes)).filter((f) => f.status === 'field');
    const matched = new Set<number>();
    let tp = 0,
      labelOk = 0,
      typeMismatches: string[] = [];
    for (const f of found) {
      const j = truth.findIndex(
        (t, k) =>
          !matched.has(k) &&
          t.page === f.pageIndex &&
          iou(t.rect, f.rect) >= 0.6,
      );
      if (j < 0) continue;
      matched.add(j);
      tp++;
      if (
        (truth[j].label ?? '')
          .toLowerCase()
          .startsWith((f.label ?? '').toLowerCase().slice(0, 4))
      )
        labelOk++;
      if (['tick', 'date'].includes(truth[j].type) && truth[j].type !== f.type)
        typeMismatches.push(`${f.id} ${f.type}`);
    }
    expect(tp / found.length).toBeGreaterThanOrEqual(0.9);
    expect(tp / truth.length).toBeGreaterThanOrEqual(0.9);
    expect(labelOk / tp).toBeGreaterThanOrEqual(0.85);
    expect(typeMismatches).toEqual([]);
  });
});
it('negative report: <= 2 detections and not a flat form', async () => {
  /* ... */
});
it('mixed AcroForm: no detection overlaps a widget (IoU >= 0.3)', async () => {
  /* listFormWidgets + dedupeAgainstWidgets */
});
it('median detection time <= 40 ms per page', async () => {
  /* PageDetection.ms over the 6 pages */
});
it.skipIf(!existsSync('test/fixtures/private'))(
  'owner sample: flat form with fields on most pages',
  async () => {
    /* any PDF in the folder */
  },
);
```

- [ ] **Step 2: Tune only through the spec's parameters** (tolerances already fixed by spec); if P/R falls short, fix rule implementation bugs, not thresholds; report the measured numbers in the task report.
- [ ] **Step 3: Commit** — `test(pdf-detect): Word-like and stroked flat-form fixtures with truth, negative and mixed cases, metrics suite`.

### Task C-9: Detection in the render worker; `DetectionCache` in the document

**Files:**

- Create: `src/pdf/render/handlers/geometry.ts`, `src/pdf/doc/detection.ts` (+ test), `src/pdf/workspace/modes/fill-sign/useDetection.ts`
- Modify: `src/pdf/render/handlers/index.ts` (append), `src/pdf/render/client.ts` (`detect`, `detectSummary`), `src/pdf/doc/model.ts` (`setDetection` — not an undo step), `src/pdf/doc/serialize.ts` (detection autosaved; already a `LogRecord` field)

**Interfaces:**

```ts
// render handlers
detect(ctx, docId: string, pageIndex: number): Promise<PageDetection>; // getOperatorList + getTextContent + font names from page.commonObjs; extractGeometry; detectPage
detectSummary(ctx, docId: string, pages: number[]): Promise<DetectSummary>;
export interface DetectSummary { pageCount: number; sampled: number; fields: number; estimatedFields: number; hasAcroForm: boolean; hasXfa: boolean; hasTextLayer: boolean; flatForm: boolean }
// estimatedFields = round(fields / sampled * pageCount) (spec §5.3 "extrapolated"); hasTextLayer from textFromItems on the sampled pages
// doc/detection.ts
export interface DetectionCache { key: string; pages: Record<string, PageDetection> } // key per source + page: `${sourceId}:${pageIndex}`
export function detectionKey(sourceId: SourceId, pageIndex: number): string;
export function mergeDetection(cache: DetectionCache | undefined, sourceId: SourceId, d: PageDetection): DetectionCache;
// useDetection.ts — visible pages first, then idle-time for the rest; cancellable; priority 2
export function useDetection(doc: DocumentApi, visiblePageIds: PageId[], enabled: boolean): { progress: { done: number; total: number }; crashed: number[] };
```

- [ ] **Step 1: Tests.** `detection.test.ts`: merge keeps other pages; serialise/restore keeps the cache. Worker handler test via the existing worker test harness pattern (`client.test.ts` style fake endpoint calling handlers directly in Node): `detect` on `flat-form-word.pdf` page 0 returns fields; on a too-complex page (`makeShapesOnlyPdf` scaled to 25 000 path ops in a new builder) returns `skipped: 'too-complex'` and the rail badge text is "No detection: page too complex".
- [ ] **Step 2: Implement.** A detection crash on one page (worker error or ToolError) records the page in `crashed`, shows a rail badge "Detection failed on this page", and continues with the next page (spec §13.3).
- [ ] **Step 3: Commit** — `feat(pdf-detect): detection in the render worker with summary probe; detection cache kept with the document`.

### Task C-10: Fill & Sign operations and materialisers

**Files:**

- Create: `src/pdf/doc/ops/fill-sign.ts`, `src/pdf/doc/materialize/fill-sign.ts`, `src/pdf/doc/checkpoints/fill-sign.ts`, `src/pdf/edit/worker/forms.ts` (edit worker handlers), `src/pdf/edit/forms-create.ts` (`createFields`), tests `fill-sign.ops.test.ts`, `fill-sign.materialize.test.ts`, `forms-create.test.ts`
- Modify: `src/pdf/doc/ops/index.ts`, `src/pdf/doc/materialize/index.ts`, `src/pdf/doc/checkpoints/index.ts`, `src/pdf/edit/worker/handlers.ts`

**Interfaces:**

```ts
// ops (view side)
export type SignatureContent =
  | { kind: 'image'; assetId: AssetId; mime: 'image/png' | 'image/jpeg' }
  | { kind: 'text'; text: string; fontId: SignatureFontId; color: string };      // P5-H adds 'ink' and 'trace'
'form.setValue'  { name: string; value: FormValue }                                // overlay, docOverlay keyed by field name; later ops on the same name supersede earlier ones in the view
'flat.fill'      { id: string; pageId: PageId; rect: Box; kind: 'text' | 'tick' | 'cross' | 'date'; value: string; fieldId?: string; size?: number; unicode?: boolean } // value '' clears
'sign.place'     { id: string; pageId: PageId; rect: Box; rotate: number; content: SignatureContent; role: 'signature' | 'initials' }
// object.move / object.remove come from P5-B (ops/objects.ts) and apply to sign.place and flat.fill objects too
'detect.correct' { action: 'dismiss' | 'accept' | 'add' | 'resize' | 'retype' | 'split' | 'merge'; fieldIds: string[]; field?: DetectedField; rect?: Box; type?: FieldType; parts?: DetectedField[] } // noOutput
// checkpoint ops
'form.flatten'     {}                                                              // AcroForm -> page content (pdf-lib form.flatten())
'flat.makeFillable'{ fields: { pageId: PageId; rect: Box; type: FieldType; label: string | null; value?: string }[] }
// forms-create.ts (edit worker)
export async function createFields(bytes: Uint8Array, fields: { pageIndex: number; rect: Box; type: FieldType; label: string | null; value?: string }[]): Promise<{ bytes: Uint8Array; names: string[] }>;
// names from labels: lower-case words joined by '_' (non-letters dropped), 'field' when no label; duplicates get _2, _3 (spec §8.5);
// text/date/signature -> PDFTextField (date: /TU "Date (DD/MM/YYYY)"; signature: text field with /TU "Signature", not a /Sig field);
// multiline -> enableMultiline; tick -> PDFCheckBox; values set; NeedAppearances false; form.updateFieldAppearances(Helvetica).
```

Labels (plain words): `form.setValue` "Fill {label or name}"; `flat.fill` "Fill {field label or 'text'} on page {n}" / "Tick on page {n}"; `sign.place` "Place signature on page {n}" / "Place initials on page {n}"; `detect.correct` "Dismiss detected field" / "Accept suggested field" / "Add field on page {n}" / "Resize field" / "Change field type" / "Split field" / "Merge fields"; checkpoints "Flatten form", "Make form fillable". Summaries: "{n} fields filled", "{n} signatures", "{n} initials", "Form flattened", "{n} fields made fillable".

Materialisers: `form.setValue` (phase `form`, uses `setFieldValue` with Helvetica; unsupported characters -> INVALID_INPUT naming the field), `flat.fill` (phase `flat`; text via `drawText(... fit 'shrink', minSize 6, multiline for multiline fields)`, date same as text, tick via `drawTick`, cross via `drawCross`, page by `ctx.page(pageId)`; truncated text adds a note "Text in a field on page {n} was too long and was cut"), `sign.place` (phase `signature`; image via `drawImage`, text via the existing `stamp` text path refactored to `drawSignatureText(ctx, page, content, rect, rotate)` using the signature font bytes from `pdf/sign/fonts`), `object.move`/`object.remove` are view-only (they rewrite or hide the target in `applyToView`) and `noOutput`.

- [ ] **Step 1: Failing tests.** ops: `flat.fill` adds an overlay on its page; `object.move` updates the target rect in the view; `object.remove` hides it; `detect.correct` dismiss hides a detected field id in the view's detection layer (`view` gains `detectionEdits: ReadonlyMap<string, DetectionEdit>`); label texts. materialise (Node, in-process): flat text "Doe" at a rect on page 1 appears at that position (`textPositions` from builders: x within the rect, baseline within it); tick draws no text; a 200-character value in a 100x12 box shrinks to >= 6pt and notes truncation; `form.setValue` on `form.pdf` sets the field (re-read with `listFormFields`); signature image lands inside the rect (`imagePlacements` from builders). createFields: three fields with labels "Name", "Name", "" produce names `name`, `name_2`, `field` and real widgets at the rects (pdf.js `getFieldObjects()` / `getAnnotations()` subtype Widget, rect within 0.5pt).
- [ ] **Step 2: Implement; register; commit** — `feat(fill-sign): form, flat-fill, signature, object and correction ops with writers; flatten and make-fillable checkpoints`.

### Task C-11: "My details" profile

**Files:**

- Create: `src/pdf/doc/profile.ts` (+ test), `src/pdf/workspace/modes/fill-sign/MyDetailsDialog.tsx`, `AutofillPreview.tsx` (+ test)

**Interfaces:**

```ts
export interface MyDetails {
  fullName: string;
  firstName: string;
  surname: string;
  address1: string;
  address2: string;
  address3: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
  dob: string; // dob ISO yyyy-mm-dd
  nationality: string;
  occupation: string;
  custom: { key: string; value: string }[]; // up to 10 (spec §8.6)
}
export async function loadMyDetails(db: IdbStore): Promise<MyDetails | null>; // profile/'my-details'
export async function saveMyDetails(db: IdbStore, d: MyDetails): Promise<void>;
export async function clearMyDetails(db: IdbStore): Promise<void>;
export function autofillPlan(
  fields: DetectedField[],
  widgets: FormWidget[],
  values: MyDetails,
  filled: ReadonlySet<string>,
): { fieldId: string; label: string; value: string }[]; // empty fields whose key has a value; dob formatted DD/MM/YYYY (en-GB) unless the field label shows MM/DD
```

Dialog `MyDetailsDialog` (title "My details"): inputs labelled exactly as the field names above ("Full name", "First name", "Surname", "Address line 1", "Address line 2", "Address line 3", "Town or city", "County or state", "Postcode", "Country", "Email", "Phone", "Date of birth" via `DateInput`, "Nationality", "Occupation"), "Add custom detail" (max 10, key/value rows), note text "Stored only on this device and not encrypted.", buttons "Clear my details" (danger), "Cancel", "Save". `AutofillPreview` (Popover from the "My details" toolbar button): checklist (kit `Checkbox` per row "{label}: {value}", all checked), "Fill {n} fields" primary button dispatching one grouped op (label "Fill {n} fields from My details"), never applied without this step (spec §8.6).

- [ ] **Step 1: Tests** — `autofillPlan` maps Surname/Postcode fields and skips filled ones; dob formatting; preview unchecking one row dispatches n-1 `flat.fill`/`form.setValue` ops in one group.
- [ ] **Step 2: Implement; commit** — `feat(fill-sign): My details profile with preview-before-apply autofill`.

### Task C-12: Fill & Sign mode UI

**Files:**

- Create: `src/pdf/workspace/modes/fill-sign/index.ts`, `Mode.tsx`, `FillSignToolbar.tsx`, `FieldsOverlay.tsx`, `FieldEditor.tsx`, `ToolPicker.tsx`, `SignaturePanel.tsx`, `SignatureDraw.tsx`, `SignatureUpload.tsx`, `SignatureType.tsx`, `FillSignInspector.tsx`, `tab-order.ts` (+ test), `snap.ts` (+ test), `FieldsOverlay.test.tsx`
- Modify: `src/pdf/workspace/modes/registry.ts` (append fill-sign), `src/shared/ui/signature-pad.tsx` only if a gap appears (report it)

**Interfaces / behaviour (spec §8.1, §8.5):**

- Manifest: `{ id: 'fill-sign', label: 'Fill & Sign', icon: IconModeFillSign, shortcut: '4', order: 4 }`.
- Entry: `listFormWidgets(base)`; XFA -> inline `Alert` (UNSUPPORTED_FEATURE message) and flat tools still usable; no widgets -> detection starts (`useDetection`); partial AcroForm -> both, detections deduped against widgets (IoU < 0.3).
- Toolbar groups: "Fields" — "Detect fields" (`IconFlatFormDetect`, toggle detection overlay visibility), "Next empty field" (`IconNextField`, Tab), "Add field" (`IconFieldSuggested`, tool `add-field`: drag a rect that snaps to cells; keyboard: places a 120x20 field at page centre, then arrows resize with Alt); "Fill" — "Text" (T), "Tick", "Cross", "Date" (tools `text|tick|cross|date`); "Sign" — "Signature" (`IconFieldSignature`), "Initials" (`IconInitials`); "Form" — "My details" (`IconMyDetails`), "Make fillable" (`IconMakeFillable`, checkpoint, confirm "Turns {n} accepted fields into real form fields."), "Flatten" (`IconFlatten`, checkpoint, confirm "Turns form fields into page content. Fields can no longer be edited.").
- `FieldsOverlay` (PageOverlay): `FieldBox` per AcroForm widget (state `filled` when it has a value) and per detected field (`field`/`suggested`), each `data-testid="field-{id}"`, accessible name `"{Type} field: {label or 'unlabelled'}, {empty|filled}"`, e.g. "Text field: Surname, empty". Click/Enter opens `FieldEditor` inside the box: text -> kit `Input` (single line) or `Textarea` (multiline) auto-fitting via `fitText` with the same font metrics as export (Helvetica widths from pdf-lib `StandardFonts` metrics bundled by `fitText`), warning badge "Text is too long for this field" when truncated; date -> `DateInput` + formatted DD/MM/YYYY; tick -> toggle. Enter commits (`flat.fill` or `form.setValue`) and advances to the next empty field; Shift+Tab/Tab move through `tabOrder`; Esc cancels.
- Click on empty page area with tool `text|tick|cross|date`: `snap.ts#snapToCell(point, cells)` returns the containing cell (any cell, label cells included) and a text box left-padded 3pt at the cell's baseline (cell bottom + 0.25 x cell height, capped to font size); otherwise a box at the click baseline (width 160, height 1.25 x 11pt). Tick/cross boxes are 10pt squares centred on the click or the checkbox.
- Corrections (spec §8.5): on a detected field, a small `Popover` (opened by right-click or the field's menu button `IconMoreHorizontal` "Field options") with "Not a field" (Del), "Accept suggestion" (Enter on a suggested field), "Change type" (submenu Text / Multiline / Tick / Date / Signature), "Split" (into two equal halves along the long axis), "Merge with next" (adjacent same-row field); resize handles via `SelectionFrame` with `snap` to cell edges. Each correction is one `detect.correct` op.
- `SignaturePanel` (Inspector section "Signature", or Popover in Focus): `Tabs` "Draw" (`SignaturePad`, ink colours from `INK_COLORS`, "Clear", "Undo stroke"), "Type" (name `Input` + 3 existing fonts as a radiogroup preview), "Upload" (kit `FilePicker` PNG/JPEG, white background removal via `pdf/sign/pixels`); "Place" button enters placement: the signature follows the pointer and a click places it (`sign.place`); keyboard: "Place at page centre" then arrows nudge. Copy below the tabs: "This is a picture of your signature, not a certificate signature." No saved signatures (G12).
- `RailBadge`: "{n} fields left" (`StatusDot` info) when the page has empty detected or widget fields; "No detection: page too complex" (warning); "Detection failed on this page" (danger).
- Commands: "Next empty field", "Fill from My details", "Make form fillable", "Flatten form", "Detect fields on this page".
- Empty state hint (spec §13.3): when detection found nothing and there are no widgets: inline card "No form fields found" with buttons "Detect manually" (tool `add-field`) and "Click anywhere to type" (tool `text`).
- Loading: non-blocking `StatusDot` + "Detecting fields, page 4 of 37" in the toolbar trailing slot.

- [ ] **Step 1: Tests.** `tab-order.test.ts`: reading order across pages and rows (uses `readingOrder`); suggested fields excluded until accepted. `snap.test.ts`: a click inside a label cell snaps to it; outside cells returns the click baseline box. `FieldsOverlay.test.tsx` (fake DocumentApi): fields render as buttons with the accessible names above; Enter on "Text field: Surname, empty" opens an input; typing "Doe" + Enter dispatches `flat.fill` and focuses the next field; Del on a detected field dispatches `detect.correct` dismiss.
- [ ] **Step 2: Implement; commit** — `feat(fill-sign-mode): fields overlay, inline editing, Tab order, click-anywhere tools, corrections and signature placement`.

### Task C-13: PDF hub detected-document card

**Files:**

- Create: `src/app/pages/pdf-hub/DetectedDocumentCard.tsx` (+ test)
- Modify: `src/app/pages/PdfHub.tsx`

**Behaviour (spec §5.3):** after a single-PDF drop the hub stages the document (`stageDocument`) and shows the card immediately with the file name and primary action "Open in editor" (enabled at once; the probe never blocks). In parallel it opens the bytes in the render worker and runs `detectSummary(docId, [0,1,2])` (300-800 ms typical). When it resolves: `MetaList` items "{pageCount} pages", "Flat form" (when `flatForm`), "{estimatedFields} fields detected" (when > 0), "Has form fields" (AcroForm), "No text layer" (when `!hasTextLayer`); actions: "Fill & Sign" (`IconArrowRight` after the label as an icon, never a glyph) -> `/pdf/edit/fill-sign?open=<id>`, "Open in editor" -> `/pdf/edit?open=<id>`, "Run OCR" shown only without a text layer (until P5-F this button is omitted entirely: nothing faked; F-7 adds it). Encrypted input: card shows `PasswordPrompt` before probing. Probe errors show "Could not inspect this file" with "Open in editor" still available. The worker document is closed when the card unmounts.

- [ ] **Step 1: Test** (fake render client): card shows "Open in editor" before the probe resolves; after resolve lists "3 pages" and "Flat form" and "12 fields detected" separated by MetaList separators (no glyph text); "Fill & Sign" navigates to `/pdf/edit/fill-sign?open=...`.
- [ ] **Step 2: Implement; commit** — `feat(pdf-hub): detected-document card with non-blocking probe and suggested entries`.

### Task C-14: Delete `pdf-sign` and `pdf-fill-form`; e2e; visual; P5-C verification

**Files:**

- Delete: `src/tools/pdf-sign/`, `src/tools/pdf-fill-form/`, `test/e2e/pdf-sign.spec.ts`, `test/e2e/pdf-fill-form.spec.ts` (replaced), warm-up entries in `global-setup.ts`
- Create: `test/e2e/fill-sign.spec.ts`, `test/visual/fill-sign.visual.ts`

- [ ] **Step 1: e2e (spec §1 criterion 1, §15):**
  1. Open `flat-form-word.pdf` at `/pdf/edit/fill-sign`; within 10 s at least 10 `[data-testid^="field-"]` exist on page 1.
  2. Open My details, fill Surname "Doe", Forename "Jane", Postcode "D02 XY45", Save; click "My details" toolbar button; preview lists 3 rows; "Fill 3 fields".
  3. Focus the first empty field via "Next empty field"; type "Engineer" + Enter in Occupation (page 3) by pressing Tab until the field named "Text field: Occupation, empty" is focused.
  4. Signature tab "Type", name "Jane Doe", Place at page centre on page 3, nudge with arrows.
  5. Export; reopen with pdf.js in the test: `textPositions` finds "Doe" inside the Surname truth rect, "Jane" in Forename, "Engineer" in Occupation; page 3 has an image or text drawing inside the placed rect.
  6. Make fillable on a fresh open: export; pdf.js `getFieldObjects()` returns fields named `surname`, `forename_s`, ... with rects matching the truth within 2pt.
  7. AcroForm path on `form.pdf`: fill a text field and a checkbox; export; `listFormFields` shows the values.
- [ ] **Step 2: Visual:** Fill & Sign on `flat-form-word.pdf` page 1 (fields highlighted, one suggested), inline editor open, My details dialog, signature panel — both themes desktop, plus phone Focus with the bottom sheet. Detection-input fixtures contain checkbox glyphs; page 4 (glyph checkboxes) is excluded from baselines (spec §8.7, R24).
- [ ] **Step 3: Gate 1-6.**

## PR boundary C — Fill & Sign

| Check                                                                       | Evidence                               |
| --------------------------------------------------------------------------- | -------------------------------------- |
| Detection P/R >= 0.9 on fixtures                                            | `detect.metrics.test.ts` numbers in PR |
| Flat-form e2e (Tab, My details, sign, export, positions)                    | `fill-sign.spec.ts` x3                 |
| Make fillable verified in pdf.js                                            | same spec, step 6                      |
| `pdf-sign`, `pdf-fill-form` deleted; `/pdf/sign`, `/pdf/fill-form` NotFound | grep + smoke                           |
| Visual both themes                                                          | `pnpm test:visual`                     |

---

# Part P5-H — Signing+ (PR: `feat/p5-h-signing-plus`)

**Owner scope (binding, added to phase 5 after the spec):**

1. **Ink pen:** pressure- and velocity-sensitive strokes from PointerEvent pressure, tilt and velocity (mouse simulated from velocity), tapering, smoothing (`perfect-freehand`, MIT), ink colours black, blue, dark blue, three weights, stroke-level undo, vector output embedded as PDF paths.
2. **Typed signatures:** live gallery of 10 OFL handwriting fonts rendering the user's name; slant, size and colour; fonts embedded via fontkit, lazy-loaded.
3. **Photo capture:** camera (`getUserMedia`) or upload; auto-crop, background removal (adaptive threshold), deskew, ink clean-up, vector tracing (in-house, from published algorithms: no potrace code, it is GPL); fully on device.
4. **Initials and blocks:** matching initials; signature block (signature, printed name, title, locale-formatted date); "initial every page" or chosen pages at the same spot.
5. **Smart placement:** signature, date and initials targets from label text plus an adjacent line or box (flat forms reuse P5-C detection) and real `/Sig` fields; "Next place to sign"; snap to line at the right scale; free move, resize, rotate with keyboard equivalents.
6. **Real digital signatures (PAdES-B-B):** sign with a user .p12/.pfx (PKCS#12 via `pkijs` + `asn1js`, BSD-3-Clause, and WebCrypto) or a generated self-signed certificate; incremental update with a `/Sig` field, `/ByteRange` and a detached CMS SignedData; visible appearance from the visual signature; optional RFC 3161 timestamp (opt-in, labelled as the one network call, never automatic; without it the time is the device clock and the UI says so). Tests verify with an independent verifier (`openssl cms -verify`) and our own; tampering breaks the signature.
7. **Verify signatures:** signers, signing time, coverage (whole document or later changes), integrity (ByteRange digest), certificate chain status with honest trust labels; optional import of trusted roots.
8. **Signing certificate page:** optional appended summary page (what, where, when, SHA-256), marked informational.

Not included: saved signatures (owner). All design-system rules apply. New ToolError codes `CERTIFICATE_INVALID`, `SIGNATURE_INVALID`.

Cut from `master` after P5-C merged. Runs in parallel with D and E (overlaps: one-line registry entries in `doc/export-stages.ts`, `workspace/export-options.ts`, `doc/ops/index.ts`, `doc/materialize/index.ts`, `edit/worker/handlers.ts`, icon barrel; `shared/lib/errors.ts` two codes).

Security notes for every H task: private keys and certificate passwords live only in memory for the duration of one Export dialog session, are never put in the op log, autosave, store-kit or logs, and are dropped (references cleared, password buffers zero-filled) after export or cancel (same rule as phase-3 password clearing, review M1).

### Task H-1: Dependencies, error codes, signing module skeleton

**Files:**

- Modify: `package.json` (`perfect-freehand`, `pkijs`, `asn1js`, 7 `@fontsource/*` script fonts), `src/shared/lib/errors.ts` (+ test), `src/shared/ui/states.tsx` (titles), `src/shared/ui/icons/custom/signing.tsx` (new group) + barrel line
- Create: `src/pdf/sign/pades/index.ts` (barrel). Licenses are reported in the task report (no new docs files).

**Interfaces:**

```ts
export type ToolErrorCode = /* existing + B */
  | 'CERTIFICATE_INVALID'
  | 'SIGNATURE_INVALID';
// states.tsx titles: CERTIFICATE_INVALID 'Certificate problem', SIGNATURE_INVALID 'Signature check failed'
```

Signing icons (`custom/signing.tsx`; `IconCamera` is a lucide re-export added to `lucide.ts`): `IconInkPen`, `IconInkWeight`, `IconTraceSignature`, `IconSignatureBlock`, `IconInitialPages`, `IconNextSignTarget`, `IconCertificate`, `IconCertificateNew`, `IconTimestamp`, `IconSignatureVerified`, `IconSignatureBroken`, `IconSignatureUnknown`, `IconSummaryPage` — drawn on the 24 grid like A1-4, reviewed in the gallery.

- [ ] **Step 1:** `pnpm add perfect-freehand pkijs asn1js @fontsource/sacramento @fontsource/allura @fontsource/alex-brush @fontsource/parisienne @fontsource/pinyon-script @fontsource/mr-dafoe @fontsource/kristi`. Open each package's LICENSE: perfect-freehand MIT; pkijs and asn1js BSD-3-Clause; fonts OFL-1.1. If any font package's license is not OFL, replace it with another OFL script font from fontsource and report.
- [ ] **Step 2:** Codes + tests (`toToolError` passthrough, titles). Icons + snapshot. Commit — `chore(signing): dependencies, CERTIFICATE_INVALID and SIGNATURE_INVALID, signing icons`.

### Task H-2: Ink pen — pressure/velocity model, outlines, vector paths, stroke undo

**Files:**

- Create: `src/pdf/sign/ink.ts` (+ test)
- Modify: `src/shared/ui/signature-pad.tsx` (+ test) (pressure, tilt, time; weight; renderer uses `inkOutline`), `src/pdf/sign/signature.ts` (`INK_COLORS`), `src/pdf/doc/ops/fill-sign.ts` (`SignatureContent` gains `ink`), `src/pdf/doc/materialize/fill-sign.ts` (ink writer)

**Interfaces:**

```ts
export interface InkPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  t: number;
} // pad px, ms
export type InkStroke = InkPoint[];
export type InkWeight = 'thin' | 'medium' | 'bold';
export const INK_WEIGHTS: Record<InkWeight, number>; // base size in pad px at 1x: thin 2.2, medium 3.4, bold 5
export const INK_COLORS: readonly { value: string; label: string }[]; // [{'#111827','Black'}, {'#1d4ed8','Blue'}, {'#1e3a8a','Dark blue'}]
export function pointFromEvent(
  e: PointerEvent,
  rect: DOMRect,
  prev: InkPoint | null,
): InkPoint;
// pen: pressure = e.pressure (0 means "unknown": 0.5); tilt from e.tiltX/tiltY; mouse/touch without pressure: simulated pressure (below).
export function simulatedPressure(
  prev: InkPoint | null,
  x: number,
  y: number,
  t: number,
  prevPressure: number,
): number;
// velocity v = distance / max(1, dt) px/ms; target = clamp(1 - v / 1.5, 0.2, 1); EMA: prev + (target - prev) * 0.35 (fast strokes thin out, slow ones thicken)
export function inkOutline(
  stroke: InkStroke,
  weight: InkWeight,
  scale?: number,
): [number, number][];
// perfect-freehand getStroke(points as [x, y, pressure][], { size: INK_WEIGHTS[weight] * scale, thinning: 0.62, smoothing: 0.55, streamline: 0.45,
//   simulatePressure: false, start: { taper: true, cap: true }, end: { taper: true, cap: true }, last: true });
// tilt widens the nib: size *= 1 + 0.25 * min(1, hypot(tiltX, tiltY) / 60)
export function outlineToPath(outline: [number, number][]): string; // SVG path, quadratic midpoints converted to cubic segments (C), closed with Z
export interface InkVector {
  d: string;
  width: number;
  height: number;
} // path in pad px, y down
export function inkToVector(
  strokes: InkStroke[],
  weight: InkWeight,
  pad: { width: number; height: number },
): InkVector; // union of stroke paths (one subpath each), cropped to ink bounds + 2px
export function fitVectorToBox(
  v: InkVector,
  box: Box,
): { d: string; transform: [number, number, number, number, number, number] }; // page space (y up): uniform scale, centred, y flipped
```

- [ ] **Step 1: Failing tests** — `simulatedPressure`: a slow move (1px over 16ms) raises pressure toward 1, a fast move (40px over 16ms) lowers it toward 0.2, clamped; `inkOutline` of a 3-point straight stroke returns a closed polygon whose width near the middle is close to the weight size and tapers at both ends (distance between outline points at the ends < 40% of the middle width); `outlineToPath` contains only `M`, `C`, `Z` commands; `inkToVector` bounds cover all strokes; `fitVectorToBox` keeps aspect and centres inside the box (y flipped).
- [ ] **Step 2: Implement.** Quadratic-to-cubic: for quadratic control `q` between points `p0`, `p1`: `c1 = p0 + 2/3 (q - p0)`, `c2 = p1 + 2/3 (q - p1)`.
- [ ] **Step 3: SignaturePad upgrade** (kit, owns the canvas): props become `{ width, height, label, ink, weight: InkWeight, value: InkStroke[], onChange(strokes), disabled? }`; renders each stroke's outline filled with `ink` via `Path2D(outlineToPath(...))`; pointer capture; `pointerType === 'pen'` uses real pressure; coalesced events (`getCoalescedEvents`) for smoothness; stroke-level undo is the parent's job (it owns `value`). Toolbar inside the pad: none (parent supplies "Undo stroke"/"Clear").
- [ ] **Step 4: Materialise `ink` content:** `SignatureContent` adds `{ kind: 'ink'; vector: InkVector; color: string }`; the writer calls `drawPath(page, fitted.d, { fill: color, transform: fitted.transform })` (nonzero fill). Test: after materialising, pdf.js operator list for the page contains a `constructPath` with fill and no image/text.
- [ ] **Step 5: Commit** — `feat(signing): pressure and velocity sensitive ink pen with tapered outlines embedded as vector paths`.

### Task H-3: Typed signatures — 10-font gallery, slant, size, colour

**Files:**

- Modify: `src/pdf/sign/fonts.ts` (+ test): registry grows to 10 fonts, lazy URLs
- Create: `src/shared/ui/choice-grid.tsx` (+ test), `src/shared/ui/font-preview.tsx`, `src/pdf/sign/typed.ts` (+ test)
- Modify: `src/pdf/doc/materialize/fill-sign.ts` (text writer honours slant/size)

**Interfaces:**

```ts
export type SignatureFontId =
  | 'dancing-script'
  | 'great-vibes'
  | 'caveat'
  | 'sacramento'
  | 'allura'
  | 'alex-brush'
  | 'parisienne'
  | 'pinyon-script'
  | 'mr-dafoe'
  | 'kristi';
export const SIGNATURE_FONTS: readonly {
  id: SignatureFontId;
  label: string;
  family: string;
  load: () => Promise<string>;
}[];
// load = () => import('@fontsource/<pkg>/files/<pkg>-latin-400-normal.woff?url').then(m => m.default)  (lazy; nothing fetched until the gallery opens)
export function ensureFontFace(id: SignatureFontId): Promise<void>; // FontFace via load() url
export function fetchFontBytes(id: SignatureFontId): Promise<Uint8Array>;
// typed.ts
export interface TypedSignature {
  text: string;
  fontId: SignatureFontId;
  color: string;
  slant: number /* degrees, -20..20, positive leans right */;
  size: 'fit' | number;
}
export function slantMatrix(
  deg: number,
): [number, number, number, number, number, number]; // [1, 0, tan(deg), 1, 0, 0]
export function typedLayout(
  font: SignatureFont,
  sig: TypedSignature,
  box: Box,
): { size: number; x: number; baseline: number; width: number }; // fits ink bounds (layoutInk) into the box after slant widening
// SignatureContent 'text' gains slant?: number and size?: 'fit' | number
```

```tsx
export interface ChoiceGridProps<V extends string> {
  label: string;
  value: V | null;
  onChange(v: V): void;
  options: { value: V; label: string; render(): React.ReactNode }[];
  columns?: number;
}
// role="radiogroup" with role="radio" cards (aria-checked), roving tabindex, arrows in 2D (columns), visible label under each card.
export function FontPreview(props: {
  family: string;
  text: string;
  slant: number;
  color: string;
  size?: number;
  label: string;
}): JSX.Element;
// kit-owned style (font-family, skewX(-slant), colour); role="img" aria-label={label}; shows the placeholder "Your name" in fg-subtle when text is empty.
```

- [ ] **Step 1: Tests** — 10 fonts registered with unique ids; `load` is not called at import time (spy); `slantMatrix(0)` is identity, `slantMatrix(20)[2]` equals `tan(20 deg)`; `typedLayout` keeps the slanted ink inside the box; ChoiceGrid arrow navigation across columns; materialised typed text with slant 15: pdf.js text content returns the name, and the operator list contains a `transform` op whose third coefficient equals `tan(15 deg)` (within 1e-3).
- [ ] **Step 2: Implement** the writer: `page.pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, tan, 1, x0 - tan * baseline, 0))` around `page.drawText(text, { font, size, x, y: baseline, color })`, then `popGraphicsState()`; the embedded font is `doc.embedFont(bytes, { subset: true })` through `FontCache.get({ custom: fontId, bytes })` (owner: embedded via fontkit, G23).
- [ ] **Step 3: Commit** — `feat(signing): typed signature gallery with ten lazy OFL fonts, slant, size and colour`.

### Task H-4: Photo clean-up — threshold, despeckle, deskew, auto-crop (pure)

**Files:**

- Create: `src/pdf/sign/photo/binarize.ts`, `components.ts`, `deskew.ts`, `crop.ts`, `pipeline.ts`, `photo.worker.ts`, `client.ts`, tests for each (synthetic images built in the tests)

**Interfaces:**

```ts
export interface Gray {
  width: number;
  height: number;
  data: Uint8Array;
} // 0..255 luminance
export interface Mask {
  width: number;
  height: number;
  data: Uint8Array;
} // 1 = ink
export function toGray(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Gray; // Rec. 709 luma
export function downscale(g: Gray, maxSide: number): Gray; // box filter, maxSide 1600
export function adaptiveThreshold(
  g: Gray,
  opts?: { window?: number; t?: number },
): Mask; // Bradley-Roth with an integral image; window = round(width / 8) (odd), t = 0.15
export function despeckle(m: Mask, minArea: number): Mask; // drop 8-connected components smaller than minArea (default max(8, 0.0002 * w * h))
export function close3(m: Mask): Mask; // 3x3 dilation then erosion (repairs broken strokes)
export function dropBorderComponents(m: Mask): Mask; // components touching the image border are paper edges or shadows
export function skewAngle(m: Mask): number; // degrees, PCA of ink pixel coordinates, clamped to [-15, 15]
export function rotateMask(m: Mask, deg: number): Mask; // nearest neighbour, canvas grows to fit
export function inkBounds(
  m: Mask,
  marginRatio?: number,
): { x: number; y: number; width: number; height: number } | null; // 4% margin
export function cropMask(
  m: Mask,
  r: { x: number; y: number; width: number; height: number },
): Mask;
export interface PhotoResult {
  mask: Mask;
  angle: number;
  inkPixels: number;
}
export function cleanSignaturePhoto(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts?: { t?: number },
): PhotoResult;
// pipeline: toGray -> downscale(1600) -> adaptiveThreshold -> despeckle -> close3 -> dropBorderComponents -> skewAngle -> rotateMask(-angle) -> inkBounds -> cropMask
// throws ToolError INVALID_INPUT "No signature found in this photo. Use dark ink on light paper and fill the frame." when inkPixels < 0.1% of the area
// photo.worker.ts exposes { clean(ctx, bitmap: ImageBitmap, opts) } via worker-rpc: draws to OffscreenCanvas, getImageData, runs the pipeline; client.ts wraps it
```

- [ ] **Step 1: Failing tests** — adaptive threshold on a gradient background (dark left to light right) with a thin dark line marks the line and no background (> 99% of background pixels 0); despeckle removes 3-pixel specks, keeps the stroke; `skewAngle` of a rendered thick line at 8 degrees returns 8 +- 1; rotating back gives about 0; `inkBounds` with margin; `cleanSignaturePhoto` on a synthetic "photo" (noise + gradient + a scribble path rasterised at 6 degrees + a dark border strip) returns a mask with the scribble, angle about 6, and no border strip; an empty white image throws the INVALID_INPUT message.
- [ ] **Step 2: Implement**

```ts
export function adaptiveThreshold(
  g: Gray,
  { window, t = 0.15 }: { window?: number; t?: number } = {},
): Mask {
  const { width: w, height: h, data } = g;
  const s = Math.max(15, (window ?? Math.round(w / 8)) | 1);
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += data[(y - 1) * w + (x - 1)];
      integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + row;
    }
  }
  const out = new Uint8Array(w * h);
  const r = s >> 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - r),
        x2 = Math.min(w - 1, x + r),
        y1 = Math.max(0, y - r),
        y2 = Math.min(h - 1, y + r);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[(y2 + 1) * (w + 1) + (x2 + 1)] -
        integral[y1 * (w + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (w + 1) + x1] +
        integral[y1 * (w + 1) + x1];
      out[y * w + x] = data[y * w + x] * count <= sum * (1 - t) ? 1 : 0;
    }
  return { width: w, height: h, data: out };
}

export function skewAngle(m: Mask): number {
  let n = 0,
    sx = 0,
    sy = 0;
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (m.data[y * m.width + x]) {
        n++;
        sx += x;
        sy += y;
      }
  if (n < 10) return 0;
  const mx = sx / n,
    my = sy / n;
  let cxx = 0,
    cyy = 0,
    cxy = 0;
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (m.data[y * m.width + x]) {
        const dx = x - mx,
          dy = y - my;
        cxx += dx * dx;
        cyy += dy * dy;
        cxy += dx * dy;
      }
  // Principal axis angle; image y grows downward, so a line rising to the right has negative slope here.
  const deg = (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
  return Math.max(-15, Math.min(15, -deg));
}
```

Components use an iterative stack flood fill (no recursion) with 8-connectivity.

- [ ] **Step 3: Commit** — `feat(signing): on-device photo clean-up with adaptive threshold, despeckle, deskew and auto-crop`.

### Task H-5: Vector tracing (in-house; boundary decomposition, polygon simplification, Bezier fitting)

**Files:**

- Create: `src/pdf/sign/trace/boundary.ts`, `simplify.ts`, `fit-curve.ts`, `trace.ts`, tests for each plus `trace.raster.test.ts`

**Interfaces:**

```ts
export type Pt = [number, number];
export interface Contour {
  points: Pt[];
  hole: boolean;
} // closed lattice polygon (pixel corners), y down
export function traceBoundaries(m: Mask): Contour[]; // every black/white boundary, outer and holes
export function rdp(points: Pt[], epsilon: number, closed: boolean): Pt[];
export function splitAtCorners(points: Pt[], maxAngleDeg?: number): Pt[][]; // corners where the interior angle < 120 degrees
export type Cubic = [Pt, Pt, Pt, Pt];
export function fitCubics(points: Pt[], error: number): Cubic[]; // Schneider (Graphics Gems, 1990): least squares + Newton-Raphson reparameterisation, recursive split
export interface TraceOptions {
  simplify?: number;
  curveError?: number;
  minArea?: number;
} // defaults 0.8, 1.0, 12 px^2
export function traceMask(m: Mask, o?: TraceOptions): InkVector; // path data (M ... C ... Z per contour), filled with the even-odd rule
```

- [ ] **Step 1: Failing tests** — a filled 10x10 square traces to one contour of 4 corners after `rdp`; a ring (outer 20, inner 8) traces to 2 contours with one `hole: true`; `fitCubics` on points sampled from a known cubic reproduces it with max error < 0.5; `trace.raster.test.ts`: rasterise the traced path back with a pure even-odd scanline filler (test helper) and compare to the source mask: IoU >= 0.95 for a ring, a thick "S" curve and the H-4 synthetic scribble; the path string contains no NaN.
- [ ] **Step 2: Implement boundary tracing** on the pixel-edge lattice (each pixel (x,y) occupies [x,x+1] x [y,y+1]); an edge is a boundary when it separates ink from background; walk with ink on the left:

```ts
export function traceBoundaries(m: Mask): Contour[] {
  const { width: w, height: h } = m;
  const ink = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && m.data[y * w + x] === 1;
  // visited horizontal edges: top edge of pixel (x,y) traversed left-to-right when ink is below (outer start condition)
  const seen = new Uint8Array((w + 1) * (h + 1) * 4);
  const key = (x: number, y: number, dir: number) =>
    ((y * (w + 1) + x) << 2) | dir; // dir 0 E, 1 S, 2 W, 3 N
  const contours: Contour[] = [];
  const DX = [1, 0, -1, 0],
    DY = [0, 1, 0, -1];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // A boundary starts on a top edge with ink below and background above, walking east.
      if (!ink(x, y) || ink(x, y - 1) || seen[key(x, y, 0)]) continue;
      const pts: Pt[] = [];
      let cx = x,
        cy = y,
        dir = 0;
      do {
        seen[key(cx, cy, dir)] = 1;
        pts.push([cx, cy]);
        cx += DX[dir];
        cy += DY[dir];
        // Pixels ahead-left and ahead-right of the lattice point relative to `dir` (ink must stay on the right when moving east along a top edge).
        const right =
          dir === 0
            ? ink(cx, cy)
            : dir === 1
              ? ink(cx - 1, cy)
              : dir === 2
                ? ink(cx - 1, cy - 1)
                : ink(cx, cy - 1);
        const left =
          dir === 0
            ? ink(cx, cy - 1)
            : dir === 1
              ? ink(cx, cy)
              : dir === 2
                ? ink(cx - 1, cy)
                : ink(cx - 1, cy - 1);
        if (left && right)
          dir = (dir + 3) % 4; // turn left (towards ink)
        else if (!left && right) {
          /* straight */
        } else dir = (dir + 1) % 4; // turn right
        // Ambiguous diagonal (left && !right) resolves to a right turn: keeps 8-connected ink pieces separate consistently ("minority" policies are not needed for signatures).
      } while (!(cx === x && cy === y && dir === 0));
      contours.push({ points: pts, hole: false });
    }
  // The single start rule also finds holes: a hole's bottom edge has background (hole) above and ink below.
  // With y down and ink kept on the right, outer boundaries have positive shoelace area (a single pixel gives +1), holes negative.
  return contours.map((c) => ({ ...c, hole: signedArea(c.points) < 0 }));
}
const signedArea = (p: Pt[]) =>
  p.reduce((s, [x1, y1], i) => {
    const [x2, y2] = p[(i + 1) % p.length];
    return s + (x1 * y2 - x2 * y1);
  }, 0) / 2;
```

Unit tests (single pixel: 4 points and area +1; square; ring with one hole) are the arbiter; the even-odd fill makes the rendering independent of orientation anyway.

- [ ] **Step 3: Implement `rdp`** (iterative stack), `splitAtCorners` (angle between incoming and outgoing direction vectors over a 2-point window), and **Schneider fitting**:

```ts
export function fitCubics(points: Pt[], error: number): Cubic[] {
  if (points.length < 2) return [];
  if (points.length === 2) return [lineAsCubic(points[0], points[1])];
  const leftT = norm(sub(points[1], points[0]));
  const rightT = norm(
    sub(points[points.length - 2], points[points.length - 1]),
  );
  return fitRange(points, leftT, rightT, error);
}
function fitRange(pts: Pt[], tHat1: Pt, tHat2: Pt, error: number): Cubic[] {
  if (pts.length === 2) {
    const d = dist(pts[0], pts[1]) / 3;
    return [
      [pts[0], add(pts[0], mul(tHat1, d)), add(pts[1], mul(tHat2, d)), pts[1]],
    ];
  }
  let u = chordLengthParameterize(pts);
  let bez = generateBezier(pts, u, tHat1, tHat2);
  let [maxErr, split] = maxError(pts, bez, u);
  if (maxErr < error) return [bez];
  if (maxErr < error * 4) {
    for (let i = 0; i < 20; i++) {
      u = u.map((ui, k) => newtonRaphson(bez, pts[k], ui));
      bez = generateBezier(pts, u, tHat1, tHat2);
      [maxErr, split] = maxError(pts, bez, u);
      if (maxErr < error) return [bez];
    }
  }
  const center = norm(sub(pts[split - 1], pts[split + 1]));
  return [
    ...fitRange(pts.slice(0, split + 1), tHat1, center, error),
    ...fitRange(pts.slice(split), mul(center, -1), tHat2, error),
  ];
}
function generateBezier(pts: Pt[], u: number[], t1: Pt, t2: Pt): Cubic {
  const first = pts[0],
    last = pts[pts.length - 1];
  const C = [
      [0, 0],
      [0, 0],
    ],
    X = [0, 0];
  u.forEach((ui, i) => {
    const b1 = 3 * ui * (1 - ui) ** 2,
      b2 = 3 * ui ** 2 * (1 - ui);
    const A1 = mul(t1, b1),
      A2 = mul(t2, b2);
    C[0][0] += dot(A1, A1);
    C[0][1] += dot(A1, A2);
    C[1][1] += dot(A2, A2);
    const tmp = sub(pts[i], bezierAt([first, first, last, last], ui));
    X[0] += dot(A1, tmp);
    X[1] += dot(A2, tmp);
  });
  C[1][0] = C[0][1];
  const det = C[0][0] * C[1][1] - C[1][0] * C[0][1];
  let a1 = det === 0 ? 0 : (X[0] * C[1][1] - X[1] * C[0][1]) / det;
  let a2 = det === 0 ? 0 : (C[0][0] * X[1] - C[1][0] * X[0]) / det;
  const seg = dist(first, last),
    eps = 1e-6 * seg;
  if (a1 < eps || a2 < eps) a1 = a2 = seg / 3; // Wu/Barsky heuristic fallback
  return [first, add(first, mul(t1, a1)), add(last, mul(t2, a2)), last];
}
```

(`newtonRaphson`, `maxError`, `chordLengthParameterize`, `bezierAt`, derivative helpers and 2D vector helpers `add/sub/mul/dot/norm/dist` complete the module; all from the published algorithm, no third-party code.)

- [ ] **Step 4: `traceMask`**: boundaries -> drop contours with |area| < minArea -> rdp(simplify) -> split at corners -> fit each run -> path `M x0 y0 C ... Z`; returns `InkVector` (same type as the pen) so placement, preview (`ShapeLayer` path) and writing (`drawPath` with `evenOdd: true`) are shared. SignatureContent adds `{ kind: 'trace'; vector: InkVector; color: string }`.
- [ ] **Step 5: Commit** — `feat(signing): in-house vector tracing with boundary decomposition, simplification and Bezier fitting`.

### Task H-6: Kit `CameraCapture` and the photo flow

**Files:**

- Create: `src/shared/ui/camera-capture.tsx` (+ test), `src/pdf/workspace/modes/fill-sign/SignaturePhoto.tsx` (+ test)

**Interfaces:**

```tsx
export type CameraState =
  | 'idle'
  | 'requesting'
  | 'live'
  | 'denied'
  | 'unavailable'
  | 'error';
export interface CameraCaptureProps {
  label: string; // "Camera preview"
  onCapture(frame: ImageBitmap): void;
  facing?: 'environment' | 'user'; // default environment
  onStateChange?(s: CameraState): void;
}
// Owns <video> (kit). idle: Button "Start camera" (IconCamera). requesting: LoadingState "Waiting for camera permission".
// live: video preview with a framing guide (ShapeLayer dashed rect, aria-hidden), Buttons "Capture" (primary), "Switch camera" (when >1 videoinput), "Stop".
// denied (NotAllowedError): Alert "Camera access was blocked. Allow it in your browser settings, or upload a photo instead."
// unavailable (no navigator.mediaDevices or NotFoundError, or insecure context): Alert "This browser can't use a camera here. Upload a photo instead."
// error: Alert with the error message. Tracks are stopped on Stop, capture and unmount. Nothing leaves the device.
```

`SignaturePhoto` (tab "Photo" in the signature panel): two choices `SegmentedControl` "Camera" / "Upload"; Upload uses kit `FilePicker` (PNG/JPEG/WebP/HEIC rejected with INVALID_FILE naming supported kinds); after a frame/file: runs `photoClient.clean` with `useJob` (`LoadingState` "Cleaning up the photo"), shows the result preview (kit `ShapeLayer` path from `traceMask`, ink colour selectable), a "Contrast" `Slider` (t from 0.05 to 0.30, re-runs threshold), the detected angle ("Straightened by 6 degrees"), buttons "Use this signature" and "Retake". Errors render `ErrorState` (e.g. no signature found).

- [ ] **Step 1: Tests** (jsdom; mock `navigator.mediaDevices.getUserMedia`): resolves -> state live and video srcObject set; rejects with `NotAllowedError` -> denied message; missing `mediaDevices` -> unavailable message; unmount stops tracks (`track.stop` spy). SignaturePhoto with a mocked photo client: upload -> preview path rendered -> "Use this signature" calls `onChange({ kind: 'trace', ... })`.
- [ ] **Step 2: Implement; gallery entry (idle and denied states); commit** — `feat(kit): CameraCapture; signature photo flow with on-device clean-up and tracing`.

### Task H-7: Initials, signature blocks, initial every page

**Files:**

- Create: `src/pdf/sign/initials.ts` (+ test), `src/pdf/sign/block.ts` (+ test)
- Modify: `src/pdf/doc/ops/fill-sign.ts` (`sign.block`, `sign.initialPages`), `src/pdf/doc/materialize/fill-sign.ts`

**Interfaces:**

```ts
export function deriveInitials(name: string): string; // first letter of up to 3 words, upper-case, locale-aware (toLocaleUpperCase); hyphenated parts count as words ("Jean-Luc Picard" -> "JLP")
export interface BlockContent { signature: SignatureContent; name: string; title: string; dateIso: string; locale: string; showDate: boolean }
export function formatBlockDate(iso: string, locale: string): string; // Intl.DateTimeFormat(locale, { dateStyle: 'long' })
export interface BlockLayout { signature: Box; name: Box; title: Box | null; date: Box | null } // stacked inside the block rect: signature 55% height, then 3 text lines
export function layoutBlock(rect: Box, c: BlockContent): BlockLayout;
// ops
'sign.block'        { id: string; pageId: PageId; rect: Box; rotate: number; content: BlockContent }
'sign.initialPages' { id: string; pageIds: PageId[]; anchor: { fx: number; fy: number; fw: number; fh: number }; content: SignatureContent } // same spot as fractions of each page's view box
```

Labels: "Place signature block on page {n}", "Initial {n} pages". Summaries "{n} signature blocks", "Initials on {n} pages". Materialise: block = signature writer for `signature` box + `drawText` Helvetica for name/title/date (fit shrink, min 6); initialPages = for each page, rect from fractions of that page's view box, then the signature writer.

- [ ] **Step 1: Tests** — `deriveInitials('jane mary doe') === 'JMD'`, `'  '` -> ''; `formatBlockDate('2026-10-01', 'en-GB') === '1 October 2026'`, `'en-US'` -> 'October 1, 2026'; `layoutBlock` boxes stay inside the rect and do not overlap; materialised initialPages on 3 pages of different sizes land at the same relative spot (fractions within 0.01).
- [ ] **Step 2: Implement; commit** — `feat(signing): initials, signature blocks with locale dates, and initials on chosen pages at the same spot`.

### Task H-8: Smart placement — sign targets, next place to sign, snap to line

**Files:**

- Create: `src/pdf/detect/sign-targets.ts` (+ test), `src/pdf/workspace/modes/fill-sign/placement.ts` (+ test), `src/pdf/workspace/modes/fill-sign/SignTargetsOverlay.tsx`
- Modify: `src/pdf/render/handlers/geometry.ts` (`signTargets` handler), `src/pdf/edit/forms.ts` (`listFormWidgets` includes `/Sig` fields with `kind: 'unsupported'` today: add `kind: 'signature'` to `FormWidget` and `signed: boolean`)

**Interfaces:**

```ts
export type SignTargetKind = 'signature' | 'initials' | 'date';
export interface SignTarget {
  id: string;
  pageIndex: number;
  kind: SignTargetKind;
  rect: Box;
  label: string;
  source: 'sig-field' | 'line' | 'cell' | 'underscore';
  fieldName?: string;
}
export const SIGN_LABELS: { kind: SignTargetKind; pattern: RegExp }[] = [
  { kind: 'signature', pattern: /\b(signature|signed|sign here|signatory)\b/i },
  { kind: 'initials', pattern: /\binitials?\b/i },
  { kind: 'date', pattern: /\bdate\b/i },
];
export function findSignTargets(
  geom: PageGeometry,
  lines: Lines,
  cells: Cell[],
  pageIndex: number,
): SignTarget[];
// label run matching SIGN_LABELS -> nearest of: underscore run in the same or next run on the baseline; ruled line to the right (same band, within 200pt)
// or directly below (within 1.5 line heights, x-overlap >= 50%); empty cell to the right or below. One target per label.
export function sigFieldTargets(widgets: FormWidget[]): SignTarget[]; // unsigned /Sig widgets (signed ones are listed by the verifier instead)
// placement.ts
export function snapToTarget(
  content: { aspect: number },
  target: SignTarget,
  lineGap: number,
): Box;
// line/underscore targets: height = clamp(0.9 * lineGap, 18, 48); width = min(height * aspect, target width); baseline sits on the line:
// rect.y = target.rect.y - 0.15 * height (descender room), left aligned with 4pt padding; cell targets: fit inside with 2pt inset; sig-field targets: exact rect.
export function nearestTarget(
  targets: SignTarget[],
  point: [number, number],
  pageIndex: number,
  within?: number,
): SignTarget | null; // within 12pt of the line/box
```

UI: `SignTargetsOverlay` draws dotted `info` outlines on targets with a `HitArea` each ("Signature place: Signature of applicant") while placing; toolbar button "Next place to sign" (`IconNextSignTarget`, command of the same name) scrolls to the next target in reading order (wraps) and starts placement there with the current signature (or opens the signature panel if none yet); dragging a signature near a target snaps to it (`snapToTarget`) with a polite announcement "Snapped to Signature of applicant"; after placement `SelectionFrame` gives move/resize/rotate with keyboard (arrows 1pt, Shift 10pt, Alt+arrows resize, [ and ] rotate 15 degrees).

- [ ] **Step 1: Tests** — on `flat-form-word.pdf` page 3: one signature target from "Signature: \_**\_" (underscore source) and one date target from "Date: **/**/\_\_**"; a ruled-line target from "Signature of applicant" with a line below; `snapToTarget` puts the baseline on the line with the clamp; `sigFieldTargets` on a fixture with an empty `/Sig` field (new builder `makeSigFieldPdf()`) returns its exact rect.
- [ ] **Step 2: Implement; commit** — `feat(signing): smart placement from labels, lines, cells and /Sig fields with snap and next-place navigation`.

### Task H-9: Incremental-update writer with ByteRange placeholders

**Files:**

- Create: `src/pdf/sign/pades/tail.ts`, `src/pdf/sign/pades/incremental.ts`, `src/pdf/sign/pades/byte-range.ts`, tests for each

**Interfaces:**

```ts
// tail.ts — reads the last cross-reference section of the original bytes
export interface PdfTail {
  startxref: number; // offset of the last xref section
  kind: 'table' | 'stream';
  size: number; // trailer /Size
  root: { num: number; gen: number };
  info: { num: number; gen: number } | null;
  id: [string, string] | null; // hex strings without brackets
  encrypted: boolean; // trailer has /Encrypt
}
export function readTail(bytes: Uint8Array): PdfTail; // throws INVALID_FILE "This PDF's structure could not be read for signing" when startxref/trailer are missing
// incremental.ts
export interface IncrementObject {
  num: number;
  gen: number;
  bytes: Uint8Array;
} // the full "n g obj ... endobj\n"
export function serializeObject(
  num: number,
  gen: number,
  obj: PDFObject,
): Uint8Array; // pdf-lib sizeInBytes + copyBytesInto
export function appendIncrement(
  original: Uint8Array,
  objects: IncrementObject[],
  tail: PdfTail,
): Uint8Array;
// writes "\n" if the file does not end with EOL, every object, then:
//   kind 'table':  "xref\n" + subsections ("<first> <count>\n" + "<offset 10> <gen 5> n\r\n" per entry; entries are 20 bytes) +
//                  "trailer\n<< /Size S /Root r /Info i /ID [<a><b>] /Prev P >>\nstartxref\nX\n%%EOF\n"
//   kind 'stream': an XRef stream object numbered S (Size becomes S+1): << /Type /XRef /Size S+1 /W [1 4 2] /Index [...] /Root /Info /ID /Prev /Length >>
//                  stream of 7-byte rows (type 1, offset, gen) including its own entry; then startxref + %%EOF.
// byte-range.ts
export const CONTENTS_PLACEHOLDER_BYTES = 16384; // 32768 when a timestamp is requested
export interface Placeholders {
  contentsHexLength: number;
}
export function sigDictBytes(
  num: number,
  o: {
    contentsBytes: number;
    name: string;
    reason?: string;
    location?: string;
    m: Date;
    subFilter: 'ETSI.CAdES.detached';
  },
): Uint8Array;
// "<n> 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /ETSI.CAdES.detached /ByteRange [0 0000000000 0000000000 0000000000] /Contents <00...00> /M (D:YYYYMMDDHHmmSS+hh'mm') /Name (...) /Reason (...) /Location (...) >>\nendobj\n"
// strings are PDF literal strings with \\, \( and \) escaped and non-ASCII written as UTF-16BE hex strings <FEFF...>
export interface ByteRangeInfo {
  range: [number, number, number, number];
  contentsStart: number;
  contentsEnd: number;
}
export function locateAndPatchByteRange(file: Uint8Array): ByteRangeInfo; // finds the LAST "/ByteRange [0 0000000000 ..." placeholder and the "/Contents <" after it; writes the four numbers left-aligned, space-padded to 10 digits
export function signedContent(file: Uint8Array, r: ByteRangeInfo): Uint8Array; // concat [0, contentsStart) + [contentsEnd, end)
export function insertSignature(
  file: Uint8Array,
  r: ByteRangeInfo,
  der: Uint8Array,
): Uint8Array; // upper-case hex, zero-padded; throws SIGNATURE_INVALID "The signature did not fit in the space reserved for it" when too large
```

The excluded gap is the `/Contents` hex string including its angle brackets: `contentsStart` is the offset of `<`, `contentsEnd` the offset just after `>` (ISO 32000-1 §12.8.1: the range covers the whole file except the signature value; mainstream readers exclude the brackets too). H-15's openssl verification is the arbiter.

- [ ] **Step 1: Failing tests.** `readTail` on a pdf-lib saved file (`useObjectStreams: false` -> table; `true` -> stream) returns the right kind, size and root; a file with two increments returns the last section and its `/Prev` chain is not needed for the tail. `appendIncrement` adding one new object (a dictionary `<< /Test true >>`) to each kind: the result re-opens in pdf-lib and pdf.js, `context.lookup` finds the new object, the original bytes are an exact prefix, and qpdf-wasm `check()` reports no errors (Node test imports `@arshad-shah/qpdf-wasm` directly as earlier phases do). Byte range: after patching, `range[0] === 0`, `range[1] === contentsStart`, `range[2] === contentsEnd`, `range[1] + (contentsEnd - contentsStart) + range[3] === file.length`, and the placeholder width is unchanged (file length identical before and after patching).
- [ ] **Step 2: Implement.** `readTail` scans the last 2 KB for `startxref`, parses the offset, then at the offset either `xref` (table: skip subsections to `trailer`, parse the dictionary with a small tokenizer reusing E's lexer if merged, otherwise a local minimal dict parser for names, numbers, refs and hex/array values) or `n g obj` with `/Type /XRef` (stream: parse its dictionary only).
- [ ] **Step 3: Commit** — `feat(signing): incremental-update writer for table and stream xref files with ByteRange placeholders`.

### Task H-10: Certificates — PKCS#12 import, self-signed generation, export

**Files:**

- Create: `src/pdf/sign/pades/pkcs12.ts`, `src/pdf/sign/pades/self-signed.ts`, `src/pdf/sign/pades/cert-info.ts`, tests for each, `test/fixtures/signing.ts` (generates .p12 fixtures with Node `crypto` + pkijs: PBES2 AES-256 file, legacy 3DES file built with `openssl pkcs12 -legacy` when openssl is on PATH, else skipped)

**Interfaces:**

```ts
export interface SigningIdentity {
  privateKey: CryptoKey; // non-extractable, usage ['sign']
  algorithm:
    | { name: 'RSASSA-PKCS1-v1_5'; hash: 'SHA-256' }
    | {
        name: 'ECDSA';
        namedCurve: 'P-256' | 'P-384';
        hash: 'SHA-256' | 'SHA-384';
      };
  certificate: pkijs.Certificate; // signer
  chain: pkijs.Certificate[]; // other certificates from the file (may be empty)
  info: CertInfo;
}
export interface CertInfo {
  subjectCN: string;
  subject: string;
  issuerCN: string;
  issuer: string;
  serialHex: string;
  notBefore: Date;
  notAfter: Date;
  selfSigned: boolean;
  keyDescription: string;
  sha256: string;
}
export async function importPkcs12(
  bytes: Uint8Array,
  password: string,
): Promise<SigningIdentity>;
// pkijs PFX: parseInternalValues({ password, checkIntegrity: true }) (MAC with PBKDF2/HMAC or PKCS#12 KDF); authenticatedSafe.parseInternalValues({ safeContents: [{ password }...] });
// key bag (PKCS8ShroudedKeyBag, PBES2) -> PrivateKeyInfo DER -> crypto.subtle.importKey('pkcs8', der, alg, false, ['sign']);
// signer = cert whose localKeyId matches the key bag's, else the only non-CA cert; chain = remaining certs.
// Errors (all CERTIFICATE_INVALID): wrong password / MAC failure "The certificate password is wrong";
// legacy PBE (OIDs 1.2.840.113549.1.12.1.3, 1.2.840.113549.1.12.1.6, 1.2.840.113549.1.12.1.5) "This certificate file uses old encryption (3DES or RC2) that browsers cannot open. Export it again with AES-256 (for example: openssl pkcs12 -export -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256)." (G13);
// no private key "This file has no private key, so it cannot sign"; unsupported key type "Only RSA and ECDSA (P-256, P-384) keys can sign here";
// expired cert: allowed but flagged in info (the UI warns "This certificate expired on {date}"), never silently.
export interface SelfSignedOptions {
  name: string;
  email?: string;
  organisation?: string;
  years: 1 | 3;
  keyType: 'ecdsa-p256' | 'rsa-2048';
}
export async function createSelfSigned(
  o: SelfSignedOptions,
): Promise<SigningIdentity & { exportable: CryptoKeyPair }>;
// generateKey (extractable true only to allow .p12 export, then a non-extractable signing copy is imported); pkijs Certificate v3:
// serial = 16 random bytes (positive), issuer = subject = CN (+ E, O), validity now - 5 min .. now + years,
// extensions: basicConstraints cA false (critical), keyUsage digitalSignature + nonRepudiation (critical), extKeyUsage emailProtection + id-kp-documentSigning (1.3.6.1.5.5.7.3.36);
// subjectPublicKeyInfo.importKey(publicKey); await cert.sign(privateKey, 'SHA-256').
export async function exportPkcs12(
  id: { certificate: pkijs.Certificate; keyPair: CryptoKeyPair },
  password: string,
): Promise<Uint8Array>;
// PBES2: PBKDF2-HMAC-SHA256, 210 000 iterations, AES-256-CBC for both key and cert bags; MAC HMAC-SHA256; password >= 8 characters else INVALID_INPUT
export function describeCertificate(cert: pkijs.Certificate): CertInfo;
```

- [ ] **Step 1: Failing tests** (Node 22+ WebCrypto): import the PBES2 fixture with the right password -> identity with CN "Test Signer", chain length per fixture; wrong password -> CERTIFICATE_INVALID "The certificate password is wrong"; legacy fixture -> the legacy message; a cert-only .p12 -> "no private key"; `createSelfSigned` -> `info.selfSigned === true`, validity 1 year, signing a buffer and verifying with the cert's public key succeeds; `exportPkcs12` then `importPkcs12` round trip; `openssl pkcs12 -info -noout -passin pass:...` accepts the exported file (skipped without openssl).
- [ ] **Step 2: Implement** (verify pkijs v3 method names against `node_modules/pkijs/build/index.d.ts` at task start: `PFX`, `AuthenticatedSafe`, `SafeContents`, `SafeBag`, `PKCS8ShroudedKeyBag`, `CertBag`, `PrivateKeyInfo`, `Certificate`, `BasicConstraints`, `ExtKeyUsage`, `Extension`).
- [ ] **Step 3: Commit** — `feat(signing): PKCS#12 import over WebCrypto, self-signed certificates and AES .p12 export`.

### Task H-11: PAdES-B-B signing — CMS, appearance, optional timestamp, export stage, self-verification

Execution order note: run H-12 before this task (H-11 calls `verifyPdfSignatures`). H-12's tests need `createCms` from this task's `cms.ts`: implement `cms.ts` (Step 1 cms tests + its code) first, then H-12, then the rest of H-11.

**Files:**

- Create: `src/pdf/sign/pades/cms.ts`, `src/pdf/sign/pades/tsa.ts`, `src/pdf/sign/pades/appearance.ts`, `src/pdf/sign/pades/sign-pdf.ts`, `src/pdf/doc/export-stages/sign.ts`, tests `cms.test.ts`, `tsa.test.ts`, `sign-pdf.test.ts`, `test/fixtures/test-tsa.ts`
- Modify: `src/pdf/doc/export-stages.ts` (append `signStage`), `src/pdf/doc/services.ts` (sign runs in the edit worker: `edit/worker/sign.ts` handler `signPdf`)

**Interfaces:**

```ts
// cms.ts
export const OID = {
  data: '1.2.840.113549.1.7.1',
  signedData: '1.2.840.113549.1.7.2',
  contentType: '1.2.840.113549.1.9.3',
  messageDigest: '1.2.840.113549.1.9.4',
  signingCertificateV2: '1.2.840.113549.1.9.16.2.47',
  timeStampToken: '1.2.840.113549.1.9.16.2.14',
  sha256: '2.16.840.1.101.3.4.2.1',
} as const;
export async function buildSignedAttributes(
  digest: ArrayBuffer,
  cert: pkijs.Certificate,
): Promise<pkijs.Attribute[]>;
// contentType = id-data; messageDigest = digest; signingCertificateV2 = SEQUENCE { SEQUENCE OF ESSCertIDv2 { certHash OCTET STRING SHA-256(cert DER) } } (hashAlgorithm omitted = SHA-256 default).
// No signing-time attribute (PAdES baseline: the time is the /M entry or the timestamp).
export async function createCms(
  content: Uint8Array,
  id: SigningIdentity,
  opts: { timestamp?: (signatureValue: ArrayBuffer) => Promise<ArrayBuffer> },
): Promise<Uint8Array>;
// SignedData v1, detached (no eContent), digestAlgorithms [sha256], signerInfos [SignerInfo v1 with IssuerAndSerialNumber, signedAttrs],
// certificates [signer, ...chain]; cms.sign(privateKey, 0, 'SHA-256'); optional unsigned attribute timeStampToken = await opts.timestamp(signerInfo.signature.valueBlock.valueHexView);
// returns DER of ContentInfo { signedData }.
// tsa.ts — the one optional network request (owner item 6)
export interface TimestampRequestOptions {
  url: string;
  signal: AbortSignal;
}
export async function requestTimestamp(
  signatureValue: ArrayBuffer,
  o: TimestampRequestOptions,
): Promise<ArrayBuffer>; // returns the TimeStampToken (ContentInfo DER)
// builds TimeStampReq { version 1, messageImprint SHA-256(signatureValue), nonce (8 random bytes), certReq true };
// fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/timestamp-query' }, body, signal, credentials: 'omit', mode: 'cors' });
// non-https URL -> INVALID_INPUT "Timestamp servers must use https"; network/CORS failure -> NETWORK "Couldn't reach the timestamp server. It may not allow requests from browsers. Try another server or sign without a timestamp.";
// status not granted/grantedWithMods -> NETWORK with the server's status text; imprint or nonce mismatch -> SIGNATURE_INVALID "The timestamp did not match this signature".
// appearance.ts
export async function buildAppearance(
  doc: PDFDocument,
  rect: Box,
  visual: SignatureContent | null,
  caption: { name: string; date: string } | null,
): Promise<PDFRef>;
// Form XObject /BBox [0 0 w h]; draws the visual (image XObject, ink/trace path, or typed text with an embedded subset font) fitted into the upper 75%
// and, when caption, "Digitally signed by {name}" and "{date}" in Helvetica 6-8pt below; invisible signatures (visual null) get an empty /BBox [0 0 0 0] widget with /Rect [0 0 0 0].
// sign-pdf.ts (edit worker)
export interface SignPdfRequest {
  bytes: Uint8Array; // fully materialised export (or original bytes for sign-only, G17)
  placement: {
    pageIndex: number;
    rect: Box;
    visual: SignatureContent | null;
    fieldName?: string;
  } | null; // existing unsigned /Sig field reused when fieldName given
  // No key material here: keys never cross the worker boundary; the CMS is built on the main thread (stage flow below).
  reason?: string;
  location?: string;
  m: Date;
  caption: boolean;
  name: string;
  contentsBytes: number; // 16384, or 32768 with a timestamp
}
export async function prepareSignature(
  req: SignPdfRequest,
): Promise<{ file: Uint8Array; range: ByteRangeInfo; content: Uint8Array }>;
// pdf-lib load (updateMetadata false) of req.bytes; readTail; doc.context.largestObjectNumber = tail.size - 1 so new refs start at Size;
// record existing refs; create AP (buildAppearance), widget+field dict (/Type /Annot /Subtype /Widget /FT /Sig /T (Signature{n}) /F 132 (Print+Locked) /P page /Rect /AP << /N ap >> /V sigRef),
// or reuse the existing field object (set /V, /AP); AcroForm: create or update /Fields and /SigFlags 3 (update the indirect AcroForm object, or the catalog when inline);
// page /Annots: append (update the indirect Annots array object or the page dict); doc.flush() to embed images/fonts;
// objects = new refs + modified refs, serialised (the sig dict written by sigDictBytes); appendIncrement; locateAndPatchByteRange; signedContent.
export function finishSignature(
  file: Uint8Array,
  range: ByteRangeInfo,
  der: Uint8Array,
): Uint8Array; // insertSignature
// export-stages/sign.ts — order 100 (last); applies when options.signature is set
export interface SignatureExportOption {
  identity: SigningIdentity; // in memory only
  placementOpId: OpId | null; // a sign.place op used as the visible appearance, excluded from page content (plan option excludeOverlays)
  reason: string;
  location: string;
  caption: boolean;
  timestampUrl: string | null; // null = device clock (UI states it)
  summaryPage: boolean; // H-13
}
```

Stage flow (main thread, keys never leave it): `prepareSignature` in the edit worker -> main thread computes `createCms(content, identity, { timestamp })` (WebCrypto `sign` on the main thread is asynchronous and off the main JS thread internally) -> `finishSignature` (cheap, main thread) -> **self-verification** with H-12's `verifyPdfSignatures(output)`: the new signature must be intact, cover the whole document and verify, else throw `SIGNATURE_INVALID` "The new signature could not be verified, so the file was not saved" (nothing half-written, ToolError model). Protect (encryption) and signature together -> `INVALID_INPUT` "Choose either password protection or a digital signature for this export. A signed file cannot be encrypted afterwards." (G14). Document with existing signatures and other changes -> warning in the dialog "This document is already signed by {names}. Saving changes will make those signatures invalid." (G17); a sign-only export (no ops except the chosen `sign.place`) signs `checkpoints[0]` bytes incrementally and keeps existing signatures valid.

Default TSA (G16): during this task, check candidate free HTTPS TSAs from the executor machine with `curl -s -o /dev/null -w "%{http_code}" -X OPTIONS -H "Origin: https://tools.example" -H "Access-Control-Request-Method: POST" <url>` and inspect `access-control-allow-origin` on a POST with `-i`; ship a default only when the response allows any origin (`*`); otherwise the URL field starts empty with the hint "Enter a timestamp server that allows browser requests". Record the result in the task report.

- [ ] **Step 1: Failing tests.** `cms.test.ts`: `createCms` output parses with pkijs; `signedAttrs` contain exactly contentType, messageDigest, signingCertificateV2 (no signingTime); pkijs `SignedData.verify({ signer: 0, data, checkChain: false })` is true; ECDSA P-256 and RSA identities both verify. `tsa.test.ts` with `fetch` mocked by `test/fixtures/test-tsa.ts` (a Node TSA built with pkijs that signs `TSTInfo` for a request): granted response yields a token whose imprint matches; tampered nonce -> SIGNATURE_INVALID; `http://` URL -> INVALID_INPUT; fetch rejection -> NETWORK message. `sign-pdf.test.ts`: sign `text-3.pdf` (table xref) and an object-stream PDF (stream xref) with a self-signed identity: output re-opens in pdf-lib and pdf.js; pdf.js annotations include a Widget with `fieldType: 'Sig'`; the original bytes are an exact prefix (incremental); visible appearance rect equals the placement; invisible signature has `/Rect [0 0 0 0]`; signing a file that already has one signature keeps the first signature intact (H-12 verifier says both intact; the first one's coverage is "changed after signing", the second "whole document").
- [ ] **Step 2: Implement; commit** — `feat(signing): PAdES-B-B detached CMS with signing-certificate-v2, visible appearance, opt-in RFC 3161 timestamp and self-verified export`.

### Task H-12: Signature verification and trusted roots

**Files:**

- Create: `src/pdf/sign/pades/verify.ts` (+ test), `src/pdf/sign/pades/trust.ts` (+ test)

**Interfaces:**

```ts
export type Integrity = 'intact' | 'broken';
export type Coverage = 'whole-document' | 'changed-after-signing';
export type TrustStatus =
  | 'trusted'
  | 'self-signed'
  | 'untrusted-issuer'
  | 'invalid-certificate'
  | 'expired-at-signing';
export interface SignatureReport {
  fieldName: string;
  signer: CertInfo | null;
  integrity: Integrity; // messageDigest equals SHA-256 of the ByteRange content
  signatureValid: boolean; // CMS signature over signedAttrs verifies with the signer key
  coverage: Coverage;
  revisionsAfter: number; // count of later increments
  time: { value: Date | null; source: 'timestamp' | 'device-clock' }; // timestamp genTime when a token is present and verifies, else /M
  timestampValid: boolean | null;
  trust: TrustStatus;
  chain: CertInfo[];
  subFilter: string; // ETSI.CAdES.detached or adbe.pkcs7.detached (both verified the same way)
  summary: string; // plain words, see labels
  problems: string[];
}
export async function verifyPdfSignatures(
  bytes: Uint8Array,
  opts?: { trustedRoots?: pkijs.Certificate[] },
): Promise<SignatureReport[]>;
// for every signed /Sig field: /ByteRange + /Contents (hex string bytes, trailing zero padding stripped by DER length) ->
// SHA-256(signedContent) == messageDigest; pkijs verify (signer 0, data, checkChain false) for signatureValid;
// coverage = range[2] + range[3] === bytes.length ? whole-document : changed-after-signing; revisionsAfter = count of "%%EOF" after range end;
// chain: start at signer; find issuer among CMS certificates + trustedRoots by subject DN; verify each link (Certificate.verify(issuer));
// trust: trusted when the chain ends at an imported root and every link verifies and validity covers the signing time;
// self-signed when issuer == subject and the self-signature verifies; untrusted-issuer when the chain ends at an unknown issuer;
// invalid-certificate when any link fails; expired-at-signing when the time is outside notBefore..notAfter. Revocation is not checked (stated).
// trust.ts — imported roots (G22)
export async function loadTrustedRoots(
  db: IdbStore,
): Promise<pkijs.Certificate[]>; // profile/'trusted-roots' (array of DER blobs)
export async function addTrustedRoot(
  db: IdbStore,
  der: Uint8Array,
): Promise<CertInfo>; // PEM or DER accepted; must be a CA (basicConstraints cA) or self-signed, else CERTIFICATE_INVALID
export async function removeTrustedRoot(
  db: IdbStore,
  sha256: string,
): Promise<void>;
export async function clearTrustedRoots(db: IdbStore): Promise<void>;
```

Honest labels (UI text; `summary` field):

| Condition                            | Summary                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| intact + valid + trusted             | "Valid. Signed by {CN}. The certificate chains to a root you imported."              |
| intact + valid + self-signed         | "Valid signature from a self-signed certificate. Nobody has verified who {CN} is."   |
| intact + valid + untrusted-issuer    | "Valid signature, but the certificate issuer is not trusted on this device."         |
| intact + valid + expired-at-signing  | "Valid signature, but the certificate was not valid at the signing time."            |
| broken or not valid                  | "Invalid. The document or the signature was changed after signing."                  |
| coverage changed-after-signing (any) | extra line: "The document has {n} later revisions not covered by this signature."    |
| time source device-clock             | extra line: "Signing time comes from the signer's device clock and is not verified." |
| always                               | extra line: "Revocation status is not checked."                                      |

- [ ] **Step 1: Failing tests** — a fresh self-signed signature: intact, valid, self-signed, whole-document, device-clock; flip one byte inside the signed range -> broken + "Invalid"; append an increment after signing (H-9 writer, harmless object) -> coverage changed-after-signing, revisionsAfter 1, still intact; a chain fixture (root CA -> intermediate -> leaf, generated in `test/fixtures/signing.ts`) with the root imported -> trusted, without -> untrusted-issuer; an expired leaf (validity in the past) -> expired-at-signing; with a test timestamp -> time source timestamp and timestampValid true.
- [ ] **Step 2: Implement; commit** — `feat(signing): signature verification with integrity, coverage, chain and honest trust labels; imported trusted roots`.

### Task H-13: Signing certificate summary page

**Files:**

- Create: `src/pdf/sign/pades/summary-page.ts` (+ test)
- Modify: `src/pdf/doc/export-stages/sign.ts` (adds the page before `prepareSignature`)

**Interfaces:**

```ts
export interface SummaryPageInput {
  documentName: string;
  pagesSigned: number;
  signerName: string;
  signerInfo: CertInfo;
  locations: number[] /* 1-based page numbers of visible signatures */;
  time: Date;
  timeSource: 'device-clock' | 'timestamp-requested';
  timestampUrl?: string;
  preSignSha256: string;
}
export async function appendSummaryPage(
  bytes: Uint8Array,
  s: SummaryPageInput,
): Promise<Uint8Array>; // pdf-lib full save; page size = last page size; Helvetica via draw.ts
```

Page content (plain words, no glyphs, G15): heading "Signing summary"; rows "Document: {name}", "Pages: {n} (not counting this page)", "Signed by: {CN}", "Certificate: {self-signed or issuer CN}, valid {notBefore} to {notAfter}", "Signature locations: page 2, page 5" or "Invisible signature", "Signing time: {date time} (device clock)" or "(timestamp requested from {host})", "SHA-256 of the document before this page and the signature were added: {hex in groups of 8}"; footer "This page is for information only. Check the digital signature in a PDF reader that verifies signatures." The option is disabled with the reason "A summary page can't be added without breaking the existing signatures" when the document already has signatures (G17).

- [ ] **Step 1: Test** — appended page count +1; pdf.js text of the last page contains "Signing summary" and the hex digest equals `sha256(bytes before append)`; option disabled reason on a signed input.
- [ ] **Step 2: Implement; commit** — `feat(signing): optional signing summary page added before signing`.

### Task H-14: Signing UI — signature panel tabs, smart placement, digital signature, signatures panel

**Files:**

- Modify: `src/pdf/workspace/modes/fill-sign/SignaturePanel.tsx`, `FillSignToolbar.tsx`, `FillSignInspector.tsx`, `Mode.tsx`
- Create: `src/pdf/workspace/modes/fill-sign/SignatureInk.tsx`, `SignatureTypeGallery.tsx`, `SignatureInitials.tsx`, `SignatureBlockForm.tsx`, `InitialPagesDialog.tsx`, `DigitalSignatureSection.tsx` (export option section), `CertificateDialog.tsx`, `SignaturesPanel.tsx`, `TrustedRootsDialog.tsx`, tests for each dialog/panel
- Modify: `src/pdf/workspace/export-options.ts` (append `digital-signature` section), `src/pdf/workspace/WorkspaceShell.tsx` top bar badge

**Component specs:**

- `SignaturePanel` tabs (`Tabs` label "Signature method"): "Draw" (`SignatureInk`: `SignaturePad` 480x180 (fits container, phone full width), `SegmentedControl` "Weight" Thin/Medium/Bold, `ColorSwatchPicker` "Ink colour" Black/Blue/Dark blue, Buttons "Undo stroke" (Mod+Z inside the pad focus scope) and "Clear"), "Type" (`SignatureTypeGallery`: `Input` "Your name", `ChoiceGrid` "Style" of 10 `FontPreview` cards (fonts load when the tab opens; each card shows `LoadingState` until its FontFace resolves), `Slider` "Slant" -20..20 (step 1, value text "{n} degrees"), `Slider` "Size" (Auto or 8..48pt; Auto when 0), ink colour picker), "Photo" (`SignaturePhoto` from H-6), "Initials" (`SignatureInitials`: derived initials `Input` "Initials" prefilled from the name, same method chooser Draw/Type, "Initial pages" button opening `InitialPagesDialog`: radio "Every page" / "Chosen pages" with `PageRangeField` (existing component), "Same spot as the selected initials"), "Block" (`SignatureBlockForm`: uses the current signature, `Input` "Printed name", `Input` "Title", `Switch` "Include date", date preview in the user's locale). Footer of the panel: "Place" (primary), "Next place to sign" (`IconNextSignTarget`), note "This is a picture of your signature. For a certificate-backed signature, turn on Digital signature when you export."
- `DigitalSignatureSection` (Export dialog section "Digital signature", hidden unless the user toggles `Switch` "Sign digitally (PAdES)"): certificate row ("Choose certificate file" -> `CertificateDialog` with `FilePicker` .p12/.pfx + password `Input type=password` + "Use this certificate"; or "Create a self-signed certificate" with name/email/organisation/validity 1 or 3 years/key type ECDSA P-256 default or RSA 2048, plus "Download certificate file (.p12)" requiring a new password >= 8 characters; shows `CertInfo` as a `MetaList` and a warning `Alert` for self-signed: "Self-signed certificates prove the file was not changed, not who signed it"); "Appearance" `Select` (each placed `sign.place` by page, or "Invisible signature"); `Input` "Reason", `Input` "Location"; `Switch` "Caption under the signature"; `Switch` "Add a signing summary page" (disabled with reason when applicable); "Timestamp" `Switch` "Add a trusted timestamp (sends one request to the server below)" + `Input` "Timestamp server" (https URL; default per G16) + `IconTimestamp`; when off, the inline note "The signing time will come from this device's clock." Export button label becomes "Sign and export".
- `SignaturesPanel` (Inspector section "Signatures in this document", visible when `verifyPdfSignatures(current base)` finds any; also opened from the top-bar badge "Signed" with `StatusDot`): one card per signature with `IconSignatureVerified` / `IconSignatureBroken` / `IconSignatureUnknown`, signer CN, summary text, `MetaList` of time + source, coverage text, problems list, "Show certificate" disclosure (subject, issuer, serial, validity, SHA-256), and the line "Revocation status is not checked."; button "Trusted roots" opens `TrustedRootsDialog` (list with Remove, "Import root certificate" `FilePicker` .cer/.crt/.pem/.der, "Clear all"); re-verifies after changes.
- Settings menu additions: "Clear trusted roots".

- [ ] **Step 1: Tests** — SignatureInk: weight change re-renders with the new size, "Undo stroke" removes the last stroke; TypeGallery: 10 radio cards, arrow keys move, slant slider value text "5 degrees"; InitialPagesDialog "Every page" dispatches `sign.initialPages` with all page ids; DigitalSignatureSection: with Protect password configured the Export button is disabled with the G14 message; timestamp switch off shows the device-clock note; CertificateDialog wrong password shows "The certificate password is wrong"; SignaturesPanel renders the self-signed summary and "Revocation status is not checked."
- [ ] **Step 2: Implement; commit** — `feat(fill-sign-mode): ink, type gallery, photo, initials and block tabs; digital signature export section; signatures panel`.

### Task H-15: Independent verification, tamper tests, e2e, visual, P5-H verification

**Files:**

- Create: `test/signing-openssl.test.ts`, `test/e2e/signing.spec.ts`, `test/visual/signing.visual.ts`
- Modify: `playwright.config.ts` (project `chromium-camera` for `signing.spec.ts` with `launchOptions.args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']`, `permissions: ['camera']`)

- [ ] **Step 1: Independent verifier** (`test/signing-openssl.test.ts`, `describe.skipIf(!opensslAvailable())`; available on the Windows dev box via Git for Windows and on ubuntu CI):

```ts
const signed = await signFixture(); // H-11 pipeline in Node with a self-signed ECDSA identity
const [r] = await verifyPdfSignatures(signed);
const range = byteRangeOf(signed); // parse the last /ByteRange
const content = concat(
  signed.subarray(0, range[1]),
  signed.subarray(range[2], range[2] + range[3]),
);
const der = trimDer(hexToBytes(contentsHexOf(signed)));
writeFileSync(join(tmp, 'data.bin'), content);
writeFileSync(join(tmp, 'sig.der'), der);
const out = spawnSync(
  'openssl',
  [
    'cms',
    '-verify',
    '-binary',
    '-inform',
    'DER',
    '-in',
    join(tmp, 'sig.der'),
    '-content',
    join(tmp, 'data.bin'),
    '-noverify',
    '-purpose',
    'any',
    '-out',
    join(tmp, 'out.bin'),
  ],
  { encoding: 'utf8' },
);
expect(out.status, out.stderr).toBe(0);
expect(out.stderr).toMatch(/Verification successful/);
// Tamper: flip one byte inside the first range (inside page content) -> openssl fails and our verifier reports broken.
const tampered = signed.slice();
tampered[200] ^= 0x01;
writeFileSync(
  join(tmp, 'data2.bin'),
  concat(
    tampered.subarray(0, range[1]),
    tampered.subarray(range[2], range[2] + range[3]),
  ),
);
expect(
  spawnSync('openssl', [
    /* same args with data2.bin */
  ]).status,
).not.toBe(0);
expect((await verifyPdfSignatures(tampered))[0].integrity).toBe('broken');
```

Also run qpdf-wasm `check()` on the signed file (no errors) and pdf.js opens it. `-noverify` skips chain building only (self-signed); the signature math is fully checked by openssl.

- [ ] **Step 2: e2e** (`signing.spec.ts`):
  1. Open `flat-form-word.pdf` in Fill & Sign; Draw tab: draw a stroke with `page.mouse` (move, down, several moves, up) on the pad; weight Bold; colour Blue; "Next place to sign" scrolls to page 3 and places on "Signature: \_\_\_\_"; the overlay shows the snapped signature on the line.
  2. Type tab: name "Jane Doe", choose the 4th style, slant 10; place as initials via "Initial pages" -> "Every page".
  3. Photo tab with the fake camera: Start camera -> Capture -> the cleaned preview appears or the "No signature found" error appears (the fake device shows a test pattern; assert one of the two honest outcomes, never a silent success); then Upload `test/fixtures/generated/signature-photo.png` (new fixture: white paper with a dark scribble at 6 degrees and a grey border) -> "Straightened by 6 degrees" (tolerance: text contains "Straightened by"), "Use this signature".
  4. Export with "Sign digitally": create a self-signed certificate (name "Jane Doe"), appearance = the page-3 signature, timestamp on with `https://tsa.test/` routed by `page.route('https://tsa.test/**', ...)` to `test-tsa.ts`; "Sign and export"; download.
  5. Re-open the download in the workspace: the top bar shows "Signed"; the Signatures panel says "Valid signature from a self-signed certificate" and the time source is the timestamp.
  6. Network assertion: `page.on('request')` collects URLs; every request is same-origin except exactly one POST to `https://tsa.test/`.
  7. Tamper: modify one byte of the downloaded file in Node, open it: the panel says "Invalid. The document or the signature was changed after signing."
- [ ] **Step 3: Visual:** signature panel each tab (Draw with a stroke, Type gallery, Photo idle/denied, Initials, Block), Export dialog digital-signature section, Signatures panel with a valid self-signed and a broken signature — both themes desktop; phone Focus for the signature sheet.
- [ ] **Step 4: Gate 1-6.**

## PR boundary H — Signing+

| Check                                                                           | Evidence                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Ink, typed, photo, initials, blocks, smart placement                            | unit tests + `signing.spec.ts`                             |
| PAdES-B-B verified by openssl, tamper breaks it                                 | `signing-openssl.test.ts`                                  |
| Verification labels honest (self-signed, untrusted, trusted with imported root) | `verify.test.ts`                                           |
| Only one network request, opt-in timestamp                                      | e2e request log                                            |
| No saved signatures, no keys persisted                                          | code review + `git grep -n "privateKey" src/pdf/doc` empty |
| Visual both themes                                                              | `pnpm test:visual`                                         |

---

# Part P5-D — Annotate and Edit (PR: `feat/p5-d-annotate-edit`)

**Scope (spec §9, §17 row D):** `pdf/edit/annot` (standard annotation dictionaries with appearance streams), TextLayer selection, comments panel, existing-annotation handling; Edit (`draw.ts` additions, header/footer, cover and replace, object transforms); delete `pdf-watermark`, `pdf-page-numbers`.

Cut from `master` after P5-B. Parallel with C, E, H, F-1..F-5. D adds new exports to `pdf/edit/draw.ts` (G21) and never changes existing signatures.

### Task D-1: Annotation dictionary foundation and text-markup writers

**Files:**

- Create: `src/pdf/edit/annot/common.ts`, `src/pdf/edit/annot/appearance.ts`, `src/pdf/edit/annot/markup.ts`, tests `annot.markup.test.ts`

**Interfaces:**

```ts
// common.ts
export interface AnnotBase {
  nm: string;
  author: string;
  color: string;
  opacity: number;
  contents: string;
  created: Date;
  modified: Date;
} // color #rrggbb; opacity 0..1
export function pdfDate(d: Date): string; // "D:YYYYMMDDHHmmSS+hh'mm'" (local offset), spec 7.9.4
export function rectArray(b: Box): [number, number, number, number]; // [x1 y1 x2 y2] normalised
export function baseAnnot(
  doc: PDFDocument,
  page: PDFPage,
  subtype: string,
  rect: Box,
  a: AnnotBase,
): PDFDict;
// entries (spec §9.1): /Type /Annot /Subtype /Rect /NM (nm) /T <FEFF..author> /M /CreationDate /F 4 /P page.ref /C [r g b] /CA opacity /Contents <FEFF..>
export function addToPage(
  doc: PDFDocument,
  page: PDFPage,
  dict: PDFDict,
): PDFRef; // registers and appends to /Annots (creates the array; resolves an indirect /Annots array)
export function textString(s: string): PDFString | PDFHexString; // ASCII-only -> literal; else UTF-16BE hex with BOM
// appearance.ts
export function appearanceStream(
  doc: PDFDocument,
  bbox: Box,
  content: string,
  resources?: Record<string, unknown>,
): PDFRef;
// Form XObject /Subtype /Form /BBox [rect] /Matrix [1 0 0 1 0 0] (draws in page space), /Resources from `resources`
export function setAppearance(dict: PDFDict, normal: PDFRef): void; // /AP << /N ref >>
export { fmt } from '../fmt'; // P5-B helper: fixed 3 decimals, no trailing zeros, no exponent
export function rgbOps(hex: string, stroke: boolean): string; // "r g b rg" or "RG"
// markup.ts — Highlight / Underline / StrikeOut / Squiggly
export type Quad = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]; // UL, UR, LL, LR (Acrobat order; pdf.js reads it)
export interface TextMarkupParams extends AnnotBase {
  subtype: 'Highlight' | 'Underline' | 'StrikeOut' | 'Squiggly';
  quads: Quad[];
}
export function writeTextMarkup(
  doc: PDFDocument,
  page: PDFPage,
  p: TextMarkupParams,
): PDFRef;
```

Appearance content per subtype (page space; `q`/`Q` wrapped; `/GS0` ExtGState with `/CA` and `/ca` = opacity):

```ts
function markupAppearance(p: TextMarkupParams): {
  content: string;
  extGState: Record<string, unknown>;
} {
  const ops: string[] = ['q', '/GS0 gs'];
  for (const q of p.quads) {
    const [ulx, uly, urx, ury, llx, lly, lrx, lry] = q;
    const h = Math.hypot(ulx - llx, uly - lly);
    if (p.subtype === 'Highlight') {
      ops.push(
        rgbOps(p.color, false),
        `${fmt(ulx)} ${fmt(uly)} m ${fmt(urx)} ${fmt(ury)} l ${fmt(lrx)} ${fmt(lry)} l ${fmt(llx)} ${fmt(lly)} l h f`,
      );
    } else {
      const w = Math.max(0.5, h / 14);
      ops.push(rgbOps(p.color, true), `${fmt(w)} w`);
      if (p.subtype === 'Underline')
        ops.push(
          `${fmt(llx)} ${fmt(lly + w)} m ${fmt(lrx)} ${fmt(lry + w)} l S`,
        );
      if (p.subtype === 'StrikeOut')
        ops.push(
          `${fmt((ulx + llx) / 2)} ${fmt((uly + lly) / 2)} m ${fmt((urx + lrx) / 2)} ${fmt((ury + lry) / 2)} l S`,
        );
      if (p.subtype === 'Squiggly') {
        const period = h / 4,
          amp = h / 12,
          len = Math.hypot(lrx - llx, lry - lly);
        const ux = (lrx - llx) / len,
          uy = (lry - lly) / len;
        const pts: string[] = [];
        for (let s = 0, i = 0; s <= len; s += period / 2, i++) {
          const off = i % 2 === 0 ? amp : -amp;
          pts.push(
            `${fmt(llx + ux * s - uy * (amp + off))} ${fmt(lly + uy * s + ux * (amp + off))}`,
          );
        }
        ops.push(
          `${pts[0]} m ${pts
            .slice(1)
            .map((pt) => `${pt} l`)
            .join(' ')} S`,
        );
      }
    }
  }
  ops.push('Q');
  return {
    content: ops.join('\n'),
    extGState: {
      GS0: {
        Type: 'ExtGState',
        CA: p.opacity,
        ca: p.opacity,
        ...(p.subtype === 'Highlight' ? { BM: 'Multiply' } : {}),
      },
    },
  };
}
```

`/Rect` is the union of the quads (padded 1pt for squiggly amplitude); `/QuadPoints` flattens the quads.

- [ ] **Step 1: Failing tests** (Node; write into a fixture page then save and reopen with pdf.js `getAnnotations()`): each subtype reads back with `subtype` equal to the written one, `quadPoints` length 8 per quad and values equal to the written ones (pdf.js normalises to its own order: compare as sets of corner points), `color` equals the RGB bytes, `contentsObj.str` equals contents, `titleObj.str` equals author, `/F 4` (print flag) present; `appearance` is used by pdf.js (render the page with pdf.js `annotationMode: AnnotationMode.ENABLE_FORMS` and check pixels inside a highlight quad are tinted: mean colour moves toward the highlight colour); non-ASCII author "Zoe" with diaeresis round-trips through UTF-16BE.
- [ ] **Step 2: Implement; commit** — `feat(pdf-annot): annotation dictionary foundation and text-markup writers with appearance streams`.

### Task D-2: Note, FreeText, Ink, Square/Circle, Line/Arrow and Stamp writers

**Files:**

- Create: `src/pdf/edit/annot/note.ts`, `freetext.ts`, `ink.ts`, `shapes.ts`, `stamp.ts`, `simplify.ts` (RDP for page space), tests `annot.writers.test.ts`

**Interfaces:**

```ts
export interface NoteParams extends AnnotBase {
  at: [number, number];
  icon: 'Comment' | 'Note';
  open: boolean;
  replyTo?: PDFRef | string; /* NM of a pending note */
}
export function writeNote(
  doc: PDFDocument,
  page: PDFPage,
  p: NoteParams,
  resolveNm: (nm: string) => PDFRef | null,
): PDFRef;
// /Subtype /Text /Name /Comment|/Note /Open false /Rect [x y x+20 y+20] + /Popup (Subtype Popup, /Parent, /Rect beside the note, /Open false);
// replies: /IRT ref /RT /R (spec §9.1 replies for Text). AP: 20x20 note glyph drawn as paths (rounded rect + 3 lines), fill = colour, stroke = darker.
export interface FreeTextParams extends AnnotBase {
  rect: Box;
  text: string;
  fontSize: number;
  align: 'left' | 'center' | 'right';
  border: boolean;
}
export function writeFreeText(
  doc: PDFDocument,
  page: PDFPage,
  p: FreeTextParams,
): PDFRef;
// /DA "/Helv {size} Tf {r g b} rg", /Q 0|1|2, /DS default style string, AP with Helvetica (font resource /Helv = embedded StandardFonts.Helvetica dict),
// text wrapped by fitText(font, text, rect, { size, minSize: 6, multiline: true }); strings encoded with font.encodeText (hex Tj).
export interface InkParams extends AnnotBase {
  strokes: [number, number][][];
  width: number;
}
export function writeInk(doc: PDFDocument, page: PDFPage, p: InkParams): PDFRef;
// strokes simplified with rdp(0.5pt) (spec §9.1); /InkList [[x y ...] ...] /BS << /W w /S /S >>; AP polylines with 1 J 1 j (round caps/joins).
export interface ShapeParams extends AnnotBase {
  kind: 'Square' | 'Circle';
  rect: Box;
  width: number;
  fill: string | null;
}
export function writeShape(
  doc: PDFDocument,
  page: PDFPage,
  p: ShapeParams,
): PDFRef; // /BS, /IC when fill; AP rect `re` or ellipse with 4 Beziers (k = 0.5523), inset by width/2
export interface LineParams extends AnnotBase {
  from: [number, number];
  to: [number, number];
  width: number;
  arrowEnd: boolean;
}
export function writeLine(
  doc: PDFDocument,
  page: PDFPage,
  p: LineParams,
): PDFRef; // /Subtype /Line /L [..] /LE [/None /OpenArrow|/None] /BS; AP line + arrowhead (two strokes at +-30 deg, length 3w+6)
export type StampPreset =
  | 'Approved'
  | 'Draft'
  | 'Confidential'
  | 'Final'
  | 'NotApproved'
  | 'ForComment';
export interface StampParams extends AnnotBase {
  rect: Box;
  preset?: StampPreset;
  label?: string;
  image?: { bytes: Uint8Array; mime: 'image/png' | 'image/jpeg' };
}
export function writeStamp(
  doc: PDFDocument,
  page: PDFPage,
  p: StampParams,
): Promise<PDFRef>;
// /Subtype /Stamp /Name /<preset>; AP: rounded rect border 2pt in colour + upper-case label in Helvetica-Bold fitted; image stamps draw the image XObject.
// Preset labels (UI and AP text): Approved "APPROVED", Draft "DRAFT", Confidential "CONFIDENTIAL", Final "FINAL", NotApproved "NOT APPROVED", ForComment "FOR COMMENT".
```

- [ ] **Step 1: Failing tests** — each writer's output reopened with pdf.js `getAnnotations()`: expected `subtype`; Text has `popupRef`/popup annotation and `name`; a reply has `inReplyTo` pointing at the parent id; FreeText `textContent` (pdf.js exposes `textContent` lines for FreeText) equals the wrapped lines; Ink `inkLists` point counts reduced by RDP on a dense straight stroke (100 points -> 2); Square `interiorColor` when filled; Line `lineEndings` `['None', 'OpenArrow']`; Stamp `name` equals the preset. Each renders visibly with pdf.js (pixel check inside rect not equal to white).
- [ ] **Step 2: Implement; commit** — `feat(pdf-annot): note with popup and replies, free text, ink, shapes, line and stamp writers`.

### Task D-3: Existing annotations — read, hide, delete, edit

**Files:**

- Create: `src/pdf/render/handlers/annotations.ts`, `src/pdf/edit/annot/edit.ts` (+ test), `test/fixtures/annotated.ts` (`makeAnnotatedPdf`: third-party-style annotations of every supported subtype plus a Link and a Widget that must be preserved untouched)
- Modify: `src/pdf/render/handlers/index.ts`, `src/pdf/render/client.ts` (`annotations(docId, pageIndex)`), `scripts/gen-fixtures.ts` (`annotated.pdf`)

**Interfaces:**

```ts
export interface ExistingAnnotation {
  ref: string;               // pdf.js id, e.g. "12R" or "12R3" (gen 3)
  subtype: string; rect: Box; color: string | null; author: string | null; contents: string | null; modified: string | null;
  inReplyTo: string | null; quadPoints: number[] | null; editable: boolean; // editable = subtype in the supported set (spec §9.1)
}
annotations(ctx, docId, pageIndex): Promise<ExistingAnnotation[]>; // page.getAnnotations({ intent: 'display' }), mapped; Widgets and Popups excluded
// edit.ts
export function parseAnnotRef(id: string): PDFRef;          // "12R" -> PDFRef.of(12, 0); "12R3" -> PDFRef.of(12, 3)
export function deleteAnnotation(doc: PDFDocument, page: PDFPage, ref: PDFRef): boolean; // removes from /Annots (and its /Popup); false when not on the page
export function updateAnnotation(doc: PDFDocument, page: PDFPage, ref: PDFRef, patch: { rect?: Box; color?: string; contents?: string; opacity?: number }): boolean;
// rewrites the dict fields and regenerates /AP for supported subtypes (from the dict's own geometry); others untouched; /M updated
```

Duplicated pages: copies created by `copyPages` get new annotation refs; `annot.delete`/`annot.update` ops store `{ pageId, ref, nm }` and the materialiser matches on the output page by ref first, then by `/NM`, then by position index within the copied page's `/Annots` (stored in the op at dispatch time).

- [ ] **Step 1: Tests** — reading `annotated.pdf` lists every annotation with author/contents; delete removes it and its popup and leaves the Link and Widget; update recolours a Square and pdf.js reads the new colour; unknown ref returns false (materialiser adds a note "An annotation to delete was no longer on page {n}").
- [ ] **Step 2: Implement; commit** — `feat(pdf-annot): read, delete and edit existing annotations; others preserved`.

### Task D-4: Text layer adapter, selection quads and overlay text

**Files:**

- Create: `src/shared/ui/adapters/PdfTextLayerHost.tsx`, `src/shared/ui/adapters/text-layer.css`, `src/shared/ui/overlay-text.tsx`, `src/pdf/workspace/selection-quads.ts` (+ test), `src/pdf/workspace/overlay-fonts.ts`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**

```tsx
export interface PdfTextLayerHostProps {
  text: PageTextItems; // from pdfRender.textItems
  geom: PageGeom;
  rotate: Rotation;
  scale: number;
  crop?: Box;
  onSelectionChange?(range: Range | null): void;
  selectable: boolean; // pointer-events/user-select only while a text tool is active
  label: string; // "Page 3 text"
}
// Creates a pdfjs.PageViewport with the same viewBox/rotation/scale as geometry.pageViewport, runs `new TextLayer({ textContentSource: text, container, viewport }).render()`,
// sets --scale-factor; re-renders on scale change (debounced 120ms); cancels on unmount. Kept in the DOM for visible pages (spec §13.2, screen readers).
// text-layer.css: the textLayer rules from pdfjs-dist/web/pdf_viewer.css (Apache-2.0, attribution comment), scoped under .pdf-text-layer, colours via tokens (selection = accent-soft).
export function OverlayText(props: {
  transform: OverlayTransform;
  box: Box;
  text: string;
  family: 'helvetica' | 'noto' | 'times' | 'courier';
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  rotate?: number;
  lineHeight?: number;
}): JSX.Element;
// Positioned, non-interactive text using the same wrapping as fitText (lines passed in or computed via the shared layout); font family from overlay-fonts.
```

```ts
// overlay-fonts.ts — same font files as the export where possible (spec §6.3 mitigation 1)
export async function ensureOverlayFonts(): Promise<void>;
// 'helvetica' -> FontFace 'PdfHelvetica' from /pdfjs/standard_fonts/LiberationSans-Regular.ttf (pdf.js renders exported Helvetica with this file);
// 'noto' -> FontFace 'PdfNoto' from the @fontsource/noto-sans file used by FontCache; 'times'/'courier' -> CSS serif/monospace (preview may differ slightly; "Preview page as exported" is exact)
// selection-quads.ts
export function selectionQuads(
  rects: DOMRect[],
  pageRect: DOMRect,
  vp: Viewport,
): Quad[]; // client rects -> page space via toPage; merge rects on one line (same top within 2px, gap < 4px); one quad per merged line
```

- [ ] **Step 1: Tests** — `selectionQuads`: two rects on one line merge into one quad; two lines give two quads; rotation 90 maps correctly (round trip through `toScreen`). PdfTextLayerHost (jsdom; mock `pdfjs-dist` TextLayer): constructs with a viewport whose `rotation`/`scale` match props and sets `--scale-factor`.
- [ ] **Step 2: Implement; commit** — `feat(kit): pdf.js text layer adapter, overlay text with export fonts, selection to quads`.

### Task D-5: Annotate operations and Annotate mode

**Files:**

- Create: `src/pdf/doc/ops/annotate.ts`, `src/pdf/doc/materialize/annotate.ts`, `src/pdf/workspace/modes/annotate/{index.ts,Mode.tsx,AnnotateToolbar.tsx,AnnotationsOverlay.tsx,CommentsPanel.tsx,NoteEditor.tsx,StampPicker.tsx}`, `src/shared/ui/color-swatch-picker.tsx` (+ test), `src/shared/ui/icons/custom/annotate.tsx`, tests `annotate.ops.test.ts`, `CommentsPanel.test.tsx`
- Modify: registries (ops, materialize, modes, icons, kit barrel)

**Interfaces:**

```ts
// ops (overlay, phase 'annotation')
'annot.markup'   { id: string; pageId: PageId; subtype: 'Highlight' | 'Underline' | 'StrikeOut' | 'Squiggly'; quads: Quad[]; color: string; opacity: number; author: string; contents: string }
'annot.note'     { id: string; pageId: PageId; at: [number, number]; icon: 'Comment' | 'Note'; color: string; author: string; contents: string; replyTo?: { kind: 'pending'; id: string } | { kind: 'existing'; ref: string } }
'annot.freetext' { id: string; pageId: PageId; rect: Box; text: string; fontSize: number; color: string; align: 'left' | 'center' | 'right'; border: boolean; author: string }
'annot.ink'      { id: string; pageId: PageId; strokes: [number, number][][]; width: number; color: string; opacity: number; author: string }
'annot.shape'    { id: string; pageId: PageId; kind: 'Square' | 'Circle'; rect: Box; width: number; color: string; fill: string | null; author: string }
'annot.line'     { id: string; pageId: PageId; from: [number, number]; to: [number, number]; width: number; color: string; arrowEnd: boolean; author: string }
'annot.stamp'    { id: string; pageId: PageId; rect: Box; preset?: StampPreset; label?: string; image?: { assetId: AssetId; mime: 'image/png' | 'image/jpeg' }; color: string; author: string }
'annot.delete'   { pageId: PageId; target: { kind: 'pending'; id: string } | { kind: 'existing'; ref: string; nm: string | null; index: number } }
'annot.update'   { pageId: PageId; target: same as delete; patch: { rect?: Box; color?: string; contents?: string; opacity?: number } }
'annot.author'   { name: string } // docOverlay: default author for later annotations; noOutput
```

Labels: "Highlight text on page {n}", "Underline text on page {n}", "Strike out text on page {n}", "Squiggly underline on page {n}", "Add note on page {n}", "Reply to note on page {n}", "Add text comment on page {n}", "Draw on page {n}", "Add rectangle on page {n}", "Add ellipse on page {n}", "Add line on page {n}", "Add arrow on page {n}", "Add {preset label} stamp on page {n}", "Delete annotation on page {n}", "Edit annotation on page {n}". Summary: "{n} highlights, {m} notes, ..." (one clause per kind with counts > 0).

Annotate mode (manifest `{ id: 'annotate', label: 'Annotate', icon: IconModeAnnotate, shortcut: '3', order: 3 }`):

- Toolbar (exact labels and shortcuts, spec §13.1): Select (V), Text comment (T, `IconTextComment`), Highlight (H), Underline (U), Strike (S), Squiggly (`IconSquiggly`), Note (N), Pen (P), Rectangle (B), Ellipse, Line, Arrow (`IconArrowAnnot`), Stamp (`IconStampPreset`, split button with presets and "Image stamp..."), Eraser (E: click an ink/annotation to delete it); trailing group: `ColorSwatchPicker` "Colour" (presets: yellow #ffd400, green #5fd068, blue #4aa8ff, pink #ff6fb5, red #ff4d4d, purple #a78bfa, plus custom hex via ColorInput), `Slider` "Opacity", `SegmentedControl` "Width" (thin 1, medium 2, bold 4).
- Text markup tools use `PdfTextLayerHost` with `selectable` true; on `pointerup` with a non-empty selection inside one page: `selectionQuads` -> dispatch `annot.markup`, clear the selection. Selection on a page without a text layer: inline hint "No text here. Run OCR to make it selectable." (the action button is added by F-7; until then the hint text only).
- Overlay: pending annotations via `ShapeLayer` (+ `OverlayText` for free text) and existing annotations from `annotations()` as `HitArea`s (label "{Subtype} by {author}: {contents}"), hidden when the "Hide existing annotations" toggle is on (preview only, spec §9.1).
- `CommentsPanel` (Inspector, pinned): list of existing + pending annotations (author, relative date, text, page), filters (`Select` page / author / type), each row: "Go to", "Reply" (Text only), "Edit" (supported subtypes), "Delete". Author name field "Your name for comments" (default "Me", dispatches `annot.author`).
- Commands: each tool ("Highlight tool"), "Hide existing annotations", "Show comments".
- Kit `ColorSwatchPicker`: `{ label; value; onChange; options: { value: string; label: string }[]; allowCustom?: boolean }`, `radiogroup` of `Swatch` radios, arrow keys, custom opens `ColorInput`.

- [ ] **Step 1: Tests** — ops: labels and summaries; delete of a pending annotation hides it in the view; author op changes the default for later dispatches. CommentsPanel filters by author and type; Reply dispatches `annot.note` with `replyTo`. ColorSwatchPicker radiogroup keyboard.
- [ ] **Step 2: Implement; commit** — `feat(annotate-mode): annotation tools on the text layer, comments panel and existing-annotation handling`.

### Task D-6: Edit content operations — text box, image, shapes

**Files:**

- Create: `src/pdf/doc/ops/edit.ts`, `src/pdf/doc/materialize/edit.ts`, tests
- Modify: `src/pdf/edit/draw.ts` (add exports only: `drawArrow`, `drawTextBox` = `drawText` with border/background options), `src/pdf/edit/images.ts` (export `toEmbeddable(bytes): { bytes, mime }` that converts WebP/GIF via `image-convert` — main thread conversion before the op, assets stored as PNG/JPEG)

**Interfaces:**

```ts
'content.text'  { id: string; pageId: PageId; rect: Box; rotate: number; text: string; font: 'Helvetica' | 'Times-Roman' | 'Courier' | 'unicode'; size: number; color: string; align: 'left' | 'center' | 'right'; lineHeight: number }
'content.image' { id: string; pageId: PageId; rect: Box; rotate: number; assetId: AssetId; mime: 'image/png' | 'image/jpeg'; opacity: number; keepAspect: boolean }
'content.shape' { id: string; pageId: PageId; kind: 'rect' | 'ellipse' | 'line' | 'arrow'; rect: Box; from?: [number, number]; to?: [number, number]; stroke: string | null; fill: string | null; width: number; opacity: number; rotate: number }
// object.move / object.remove (generic, from P5-B ops/objects.ts) apply to these too
```

Labels: "Add text on page {n}", "Add image on page {n}", "Add rectangle on page {n}" etc.; summary "{n} text boxes, {m} images, {k} shapes". Materialisers (phase `content`) call `drawText` (unsupported characters -> INVALID_INPUT with the "Use Unicode font" hint; the UI offers switching the op's font to `unicode`), `drawImage`, `drawBox`/`drawEllipse`/`drawLine`/`drawArrow`.

- [ ] **Step 1: Tests** (in-process materialise): text lands in its rect (textPositions); rotated text (rotate 90) lands in its rect; image placement (imagePlacements); shapes produce paths, no text; WebP input converted before embedding.
- [ ] **Step 2: Implement; commit** — `feat(edit): text box, image and shape content operations with writers`.

### Task D-7: Watermark, page numbers and header/footer as operations

**Files:**

- Modify: `src/pdf/edit/markup.ts` (+ tests): split each function into `watermarkDoc(doc, opts)` / `pageNumbersDoc(doc, opts)` + the existing bytes wrappers (API unchanged); add `headerFooterDoc(doc, opts)` and `formatHeaderFooter(template, ctx)`
- Create: `src/pdf/doc/ops/markup.ts`, `src/pdf/doc/materialize/markup.ts`, `src/pdf/workspace/modes/edit/MarkupPreview.tsx`

**Interfaces:**

```ts
export interface HeaderFooterOptions {
  header: { left: string; center: string; right: string }; footer: { left: string; center: string; right: string };
  fontSize: number; color: string; margin: { top: number; bottom: number; side: number }; // points
  pages: PageSelection;                 // geometry.ts PageSelection
  filename: string; date: Date;         // token values captured at dispatch (date) and export (filename)
}
export function formatHeaderFooter(template: string, ctx: { n: number; total: number; date: Date; filename: string; locale: string }): string; // tokens {n} {total} {date} {filename}; unknown tokens left as typed
export async function headerFooterDoc(doc: PDFDocument, o: HeaderFooterOptions): Promise<void>; // Helvetica (unicode fallback via FontCache when needed), anchored to the visual page edges (pageFrame), rotation-aware
'markup.watermark'    WatermarkOptions (existing type) + { id: string }   // docOverlay (pageId null); pages via its own selection
'markup.pageNumbers'  PageNumberOptions + { id: string }
'markup.headerFooter' Omit<HeaderFooterOptions, 'filename'> + { id: string }
```

Labels: "Add watermark", "Add page numbers", "Add header and footer"; editing an existing markup op dispatches a new op of the same type that supersedes it (view keeps the last per type; the summary counts one). Overlay preview: `MarkupPreview` draws the watermark/number/header text with `OverlayText` on every affected visible page using the same `pageFrame`/anchor math as the writers (shared pure functions from `markup.ts`).

- [ ] **Step 1: Tests** — markup.ts existing tests green after the split; `formatHeaderFooter('Page {n} of {total}', ...)` gives "Page 2 of 5"; header/footer text positions on a rotated page sit at the visual top/bottom (textPositions + rotation); the preview's computed anchor equals the writer's (unit test on the shared function).
- [ ] **Step 2: Implement; commit** — `feat(edit): watermark, page numbers and header and footer as workspace operations with live preview`.

### Task D-8: Object transforms; cover and replace

**Files:**

- Create: `src/pdf/workspace/objects/useObjectSelection.ts`, `ObjectsOverlay.tsx`, `align.ts` (+ test), `clipboard.ts` (+ test), `src/pdf/render/handlers/sample.ts` (`sampleColor`), `src/pdf/doc/ops/cover.ts`, `src/pdf/doc/materialize/cover.ts`

**Interfaces:**

```ts
export function alignBoxes(boxes: Box[], how: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): Box[]; // >= 2
export function distributeBoxes(boxes: Box[], axis: 'horizontal' | 'vertical'): Box[];                          // >= 3, equal gaps
export interface ObjectClipboard { copy(ops: Operation[]): void; paste(pageId: PageId): NewOperation[] } // in memory; pasted ops get new ids and +10pt offset
sampleColor(ctx, docId: string, pageIndex: number, box: Box): Promise<string>; // renders the box region at 72 dpi, returns the median of the box's border pixels as #rrggbb
'content.cover' { id: string; pageId: PageId; rect: Box; fill: string; text: string; font: 'Helvetica' | 'Times-Roman' | 'Courier' | 'unicode'; size: number; color: string; align: 'left' | 'center' | 'right' }
```

Behaviour (spec §9.2): selecting an object shows `SelectionFrame` (move, resize, rotate; keyboard arrows 1pt, Shift 10pt, Alt resize, [ ] rotate); each committed change is one `object.move`; Del removes (`object.remove`); Mod+C / Mod+V copy and paste within the document; Mod+D duplicates; inspector "Arrange" section with align (6 buttons) and distribute (2 buttons) for multi-selection; Mod+A selects all objects on the page. Cover and replace tool: drag a rectangle over existing text -> `sampleColor` fills the cover (editable via ColorInput), a text field opens on top; the inspector shows exactly: "This covers the original text. The original is still in the file and can be copied or found by search. To remove text, use Redact." (with a button "Open Redact" that switches mode). Materialiser draws `drawBox` fill then `drawText` (phase `content`).

- [ ] **Step 1: Tests** — align/distribute tables; clipboard paste produces new ids and offsets; cover op writes a filled rect then text (operator order) and the original text is still extractable (asserting the honest UI copy's claim).
- [ ] **Step 2: Implement; commit** — `feat(edit): object selection, transforms, align and distribute, copy and paste; cover and replace with sampled colour`.

### Task D-9: Edit mode UI; delete `pdf-watermark` and `pdf-page-numbers`

**Files:**

- Create: `src/pdf/workspace/modes/edit/{index.ts,Mode.tsx,EditToolbar.tsx,EditInspector.tsx,WatermarkForm.tsx,PageNumbersForm.tsx,HeaderFooterForm.tsx}`, `src/shared/ui/icons/custom/edit.tsx`
- Modify: registries
- Delete: `src/tools/pdf-watermark/`, `src/tools/pdf-page-numbers/` (their store settings are not migrated: settings only; the mode keeps sensible defaults), their e2e specs and warm-up entries, interim slugs

**Behaviour:** manifest `{ id: 'edit', label: 'Edit', icon: IconModeEdit, shortcut: '2', order: 2 }`. Toolbar: Select (V), Text (T, click to add, hint "Click to add text"), Image (file picker; WebP/GIF converted), Shapes (split: Rectangle, Ellipse, Line, Arrow), Cover and replace (`IconCoverReplace`), Watermark (`IconWatermark`, opens `WatermarkForm` in the inspector with the old tool's fields: text/image, font size, colour, opacity, rotation, position, pages), Page numbers (`IconPageNumbers`, `PageNumbersForm`: format, position, start number, pages), Header and footer (`IconHeaderFooter`, `HeaderFooterForm`: six slots with token help text "Use {n}, {total}, {date} and {filename}", margins, size, colour, pages). Inspector for a selected text box: font (Helvetica, Times, Courier, Unicode), size, colour, alignment, line height; image: opacity, keep aspect; shape: stroke, fill, width. Font load spinner while the Unicode font loads (spec §13.3). Unsupported characters: inline `Alert` with action "Use Unicode font".

- [ ] **Step 1:** Implement; icons (`IconCoverReplace`, `IconHeaderFooter`, `IconPageNumbers`, `IconWatermark`) on the 24 grid; gallery. Delete the two tools. Commit — `feat(edit-mode): text, image, shapes, cover and replace, watermark, page numbers, header and footer; old tools removed`.

### Task D-10: Pixel fidelity tests, round trips, e2e, visual, P5-D verification

**Files:**

- Create: `test/e2e/annotate.spec.ts`, `test/e2e/edit.spec.ts`, `test/e2e/fidelity.spec.ts`, `test/visual/annotate-edit.visual.ts`

- [ ] **Step 1: Fidelity (spec §6.3 mitigation 3):** for each op type (annot.markup x4, annot.note, annot.freetext, annot.ink, annot.shape x2, annot.line, annot.stamp, content.text (Helvetica and Unicode), content.image, content.shape x4, content.cover, markup.watermark, markup.pageNumbers, markup.headerFooter, flat.fill (when C merged), sign.place (when C merged)): open `text-3.pdf`, dispatch the op through the UI or the test hook `window.__workspaceTest.dispatch` (exposed only when `import.meta.env.DEV`), export, then `compareOverlayWithExport` -> ratio <= 0.015. Times/Courier text is excluded (overlay uses system serif/monospace; documented in D-4).
- [ ] **Step 2: Round trips:** annotate e2e: highlight a word by dragging over the text layer, add a note with a reply, draw ink, add an arrow and an Approved stamp; export; reopen with pdf.js in the test: annotations present with the right subtypes and QuadPoints inside the word's text box. Existing annotations: open `annotated.pdf`, delete one, recolour one, export: pdf.js shows one fewer and the new colour; the Link and Widget survive.
- [ ] **Step 3: Edit e2e:** add text "Hello" at a point, an image, header/footer "Page {n} of {total}", watermark "DRAFT"; export; textPositions show "Hello" and "Page 1 of 3" positions; image placement present.
- [ ] **Step 4: Visual:** Annotate and Edit modes with fixtures in both themes (desktop) and Focus; comments panel; watermark form. Gate 1-6.

## PR boundary D — Annotate and Edit

| Check                                                        | Evidence                              |
| ------------------------------------------------------------ | ------------------------------------- |
| Annotation round-trip tests                                  | `annot.*.test.ts`, `annotate.spec.ts` |
| Overlay-vs-materialised pixel tests per op type              | `fidelity.spec.ts` (<= 1.5%)          |
| `pdf-watermark`, `pdf-page-numbers` deleted, routes NotFound | grep + smoke                          |
| Visual both themes                                           | `pnpm test:visual`                    |

---

# Part P5-E — Content engine, Redact, Protect, Optimize, Convert, quick-task handoff (PR: `feat/p5-e-redact-protect`)

**Scope (spec §10, §7.2 Protect/Optimize/Convert, §5.3 quick tasks, §17 row E):** `pdf/edit/content` full lexer, serialiser and interpreter with glyph positioning; Redact (marks, search, apply, rasterise fallback, verification); Protect mode (protect at export, metadata, sanitise); Optimize mode (compress, repair, linearize, size breakdown); Convert mode (incl. PDF to Markdown); quick tasks restyled with "Open result in workspace"; delete `pdf-metadata`.

Cut from `master` after P5-B; E-1 and E-2 are independent of everything else (spec §17). Passwords for Protect are entered in the Export dialog and never stored in the op log or autosave (decision G25: `protect.set` stores the choice and permissions only).

### Task E-1: Content-stream lexer and byte-faithful serialiser

**Files:**

- Create: `src/pdf/edit/content/tokens.ts`, `src/pdf/edit/content/lexer.ts`, `src/pdf/edit/content/serialize.ts`, tests `lexer.test.ts`, `roundtrip.test.ts`

**Interfaces:**

```ts
export type Tok =
  | { t: 'num'; v: number; raw: string }
  | { t: 'str'; v: Uint8Array; hex: boolean }
  | { t: 'name'; v: string }                 // #xx decoded
  | { t: 'arr'; v: Tok[] }
  | { t: 'dict'; v: Map<string, Tok> }
  | { t: 'bool'; v: boolean }
  | { t: 'null' };
export interface ContentOp {
  op: string; operands: Tok[];
  raw?: Uint8Array;                          // original bytes from the end of the previous op to the end of this op (whitespace and comments included); absent once modified
  inline?: { dict: Map<string, Tok>; data: Uint8Array }; // BI ... ID data EI collapsed into one op 'BI'
}
export interface ParsedContent { ops: ContentOp[]; tail: Uint8Array }
export class ContentParseError extends Error { constructor(message: string, readonly offset: number) }
export function parseContent(bytes: Uint8Array): ParsedContent;
export function serializeContent(p: ParsedContent): Uint8Array; // raw ops verbatim; modified ops canonical (" " + operands + " " + op + "\n")
export function serializeTok(t: Tok): string;                    // canonical: numbers fixed (max 6 decimals, no exponent), strings as hex <..>, names with #xx escapes for delimiters/non-regular bytes
```

- [ ] **Step 1: Failing tests** — tokens: numbers (`-.5`, `+3`, `4.`), literal strings with balanced parentheses, escapes (`\n`, `\(`, octal `\053`, line continuation backslash-EOL), hex strings with whitespace and odd length (pad 0), names with `#20`, nested arrays and dicts, `true`/`false`/`null`, comments skipped and kept in `raw`; inline image with `/L` length, with ASCIIHex data ending in `>`, with binary data containing `EI` inside followed by a non-operator (the heuristic must continue scanning); unterminated string throws ContentParseError with offset. Round trip: for every content stream in the fixture corpus (`text-3`, `structured-3`, `form`, `images-heavy`, `annotated`, `flat-form-word`, `redact-adversarial` once E-8 lands), `serializeContent(parseContent(b))` equals `b` byte for byte; marking every op modified then re-parsing yields identical token values (semantic round trip).
- [ ] **Step 2: Implement** the lexer as a single pass over bytes with the PDF character classes (`WS = 00 09 0A 0C 0D 20`, delimiters `()<>[]{}/%`):

```ts
export function parseContent(b: Uint8Array): ParsedContent {
  const ops: ContentOp[] = [];
  let i = 0,
    opStart = 0;
  let operands: Tok[] = [];
  const stack: (Tok[] | Map<string, Tok> | null)[] = [];
  // ... readToken(i) returns [Tok | {t:'op', v}, next] using: number grammar, ( ) literal strings with depth + escapes,
  // < > hex strings, << >> dicts, [ ] arrays, /names, keywords true/false/null, else operator keyword (regular characters).
  while (i < b.length) {
    i = skipWsAndComments(b, i);
    if (i >= b.length) break;
    const [tok, next] = readToken(b, i);
    i = next;
    if (tok.t !== 'op') {
      operands.push(tok);
      continue;
    }
    if (tok.v === 'BI') {
      const { dict, data, end } = readInlineImage(b, i); // parses the dict up to ID, then data per /L|/Length, filter end markers, raw size, or the EI heuristic
      ops.push({
        op: 'BI',
        operands: [],
        inline: { dict, data },
        raw: b.subarray(opStart, end),
      });
      i = opStart = end;
      operands = [];
      continue;
    }
    ops.push({ op: tok.v, operands, raw: b.subarray(opStart, i) });
    opStart = i;
    operands = [];
  }
  if (operands.length)
    throw new ContentParseError(
      'Operands without an operator at the end of the content',
      i,
    );
  return { ops, tail: b.subarray(opStart) };
}
```

`readInlineImage` decides the data length in this order: `/L` or `/Length`; ASCIIHex (`/AHx`, `/ASCIIHexDecode`) up to `>`; ASCII85 up to `~>`; uncompressed: `ceil(W * BPC * comps / 8) * H` (comps from `/CS` G=1, RGB=3, CMYK=4, indexed=1, image masks 1); otherwise scan for `WS E I (WS|EOF)` and accept the candidate only when the bytes after it lex as an operator or operand (else keep scanning). The existing `compress/content-ops.ts` keeps working; it is migrated to the new lexer in E-11 only if trivial (otherwise left as is: it is tested).

- [ ] **Step 3: Commit** — `feat(pdf-content): full content-stream lexer with inline images and a byte-faithful serialiser`.

### Task E-2: Font metrics and the graphics/text-state interpreter with glyph boxes

**Files:**

- Create: `src/pdf/edit/content/font-metrics.ts`, `src/pdf/edit/content/cmap.ts`, `src/pdf/edit/content/interpreter.ts`, tests `font-metrics.test.ts`, `interpreter.test.ts`
- Modify: `package.json` (explicit `@pdf-lib/standard-fonts`, already a pdf-lib dependency; MIT)

**Interfaces:**

```ts
// font-metrics.ts
export type RasterReason =
  | 'type3-no-metrics'
  | 'font-no-widths'
  | 'unsupported-cmap'
  | 'clip-text'
  | 'pattern-text'
  | 'image-filter'
  | 'image-colorspace'
  | 'parse-error';
export interface FontMetrics {
  kind: 'simple' | 'cid' | 'type3';
  codeLength(bytes: Uint8Array, at: number): number; // 1 for simple; per codespace ranges for CID (Identity-H/V = 2)
  width(code: number): number; // glyph space units / 1000 (Type3: already multiplied by FontMatrix[0])
  ascent: number;
  descent: number; // text space units per 1 unit of font size (e.g. 0.8 / -0.2)
  isSpace(code: number, length: number): boolean; // Tw applies to single-byte code 32 only (PDF 9.3.3)
}
export function loadFontMetrics(
  doc: PDFDocument,
  fontDict: PDFDict,
): FontMetrics | { raster: RasterReason };
// simple: /FirstChar + /Widths (+ FontDescriptor /MissingWidth); standard 14 without /Widths: @pdf-lib/standard-fonts metrics through the font's /Encoding (WinAnsi, Standard, MacRoman, Differences);
// cid (Type0): DescendantFonts[0] /W + /DW (default 1000); /Encoding Identity-H|V or an embedded CMap stream (cmap.ts codespace ranges); predefined non-identity CMaps -> raster 'unsupported-cmap';
// type3: /Widths x /FontMatrix[0]; missing -> raster 'type3-no-metrics'; no width information at all -> raster 'font-no-widths'.
// cmap.ts
export function parseCodespaceRanges(
  cmap: Uint8Array,
): { low: Uint8Array; high: Uint8Array }[];
// interpreter.ts
export type Matrix = [number, number, number, number, number, number];
export interface GlyphHit {
  op: number;
  part: number;
  byteStart: number;
  byteLength: number;
  code: number;
  quad: Quad;
  advance: number; /* user-space-free: text space units, already x Tfs x Th */
}
export interface ImageHit {
  op: number;
  name: string | null;
  inline: boolean;
  ctm: Matrix;
} // unit square -> page
export interface PathHit {
  opStart: number;
  opEnd: number;
  bbox: Box;
  painted: boolean;
  clip: boolean;
}
export interface FormHit {
  op: number;
  name: string;
  ctm: Matrix;
}
export interface Interpretation {
  glyphs: GlyphHit[];
  images: ImageHit[];
  paths: PathHit[];
  forms: FormHit[];
  raster: RasterReason[];
}
export function interpret(
  parsed: ParsedContent,
  resources: PDFDict | undefined,
  doc: PDFDocument,
  ctm0: Matrix,
): Interpretation;
```

Glyph positioning (PDF 32000-1 §9.4.4), implemented exactly:

```ts
// For each glyph of a string shown by Tj/TJ/'/" with font metrics m, size Tfs, Tc, Tw, Th = Tz/100, Trise:
const w0 = m.width(code);
const isWordSpace = m.isSpace(code, len);
const tx = (w0 * Tfs + Tc + (isWordSpace ? Tw : 0)) * Th;
// Text rendering matrix: Trm = [Tfs*Th, 0, 0, Tfs, 0, Trise] x Tm x CTM
const trm = mul(mul([Tfs * Th, 0, 0, Tfs, 0, Trise], tm), ctm);
// Glyph box in glyph space: x 0..w0, y descent..ascent -> four corners through trm (UL, UR, LL, LR)
const quad = corners(trm, 0, m.descent, w0, m.ascent);
glyphs.push({ op, part, byteStart, byteLength: len, code, quad, advance: tx });
tm = mul([1, 0, 0, 1, tx, 0], tm);
// TJ numbers: tm = mul([1, 0, 0, 1, (-n / 1000) * Tfs * Th, 0], tm)
```

State handled: `q Q cm` (CTM stack), `BT ET` (Tm = Tlm = identity), `Tf Tc Tw Tz TL Ts Tr`, `Td TD Tm T*`, `' "`, `Do` (image vs form by `/Subtype`), `BI` inline images (CTM unit square), path construction `m l c v y h re` with painting `S s f F f* B B* b b* n` and clip `W W*`; text render modes 4-7 add raster reason `clip-text`; text shown while the fill colour space is `/Pattern` (`cs /Pattern` or `scn` with a name) adds `pattern-text`.

- [ ] **Step 1: Failing tests** — metrics: Helvetica (no /Widths) width of "A" equals 0.667; a TrueType simple font with /Widths; Identity-H CID font with `/W [1 [500 600]]`; Type3 with FontMatrix [0.001 0 0 0.001 0 0]; a font without widths returns raster. Interpreter (content strings + resources built with pdf-lib): `BT /F1 12 Tf 72 700 Td (AB) Tj ET` gives two glyph quads starting at x=72, the second at 72 + 0.667\*12; `[(A) -500 (B)] TJ` shifts B by 6pt; `2 Tc` and `3 Tw` on a space applied; `150 Tz` scales; rotated `Tm` gives rotated quads; `q 2 0 0 2 0 0 cm ... Q` scales boxes; `/Im0 Do` with `cm` gives the image unit-square transform; a path `10 10 50 50 re f` gives a painted PathHit with that bbox; `3 Tr` (invisible) still yields glyphs; `7 Tr` adds `clip-text`.
- [ ] **Step 2: Implement; commit** — `feat(pdf-content): font metrics and a graphics and text state interpreter with exact glyph boxes`.

### Task E-3: Redaction marks and search

**Files:**

- Create: `src/pdf/redact/search.ts` (+ test), `src/pdf/redact/patterns.ts` (+ test), `src/pdf/doc/ops/redact.ts` (+ test)

**Interfaces:**

```ts
export type RedactPreset = 'email' | 'phone' | 'iban' | 'card';
export interface SearchQuery { text: string; regex: boolean; caseSensitive: boolean; wholeWord: boolean; preset?: RedactPreset }
export interface SearchMatch { pageId: PageId; pageNumber: number; text: string; rects: Box[]; context: string } // rects merged per line, padded 0.5pt
export function searchPages(pages: { pageId: PageId; pageNumber: number; items: PageTextItems }[], q: SearchQuery): SearchMatch[];
// builds each page's string from items (EOL -> '\n'), keeps char -> glyph box mapping (proportional advance, C-3's splitGlyphs), runs the regex
// (literal text escaped; wholeWord adds \b; case flag), maps match ranges to glyph boxes; invalid regex -> INVALID_INPUT "That search pattern is not valid".
export const PRESETS: Record<RedactPreset, { label: string; pattern: RegExp; check?: (s: string) => boolean }>;
// email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// phone: /(?:\+?\d[\d ()-]{7,}\d)/g with >= 9 digits
// iban:  /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/g with the ISO 13616 mod-97 check
// card:  /\b(?:\d[ -]?){13,19}\b/g with the Luhn check
export function luhn(digits: string): boolean;
export function ibanValid(s: string): boolean;
// ops
'redact.mark'  { id: string; pageId: PageId; rects: Box[]; source: { kind: 'area' } | { kind: 'search'; query: SearchQuery; matched: string }; fill: string; overlayText: string | null }
'redact.apply' { dpi: number }   // checkpoint; dpi 150..300 (default 200) for rasterised pages
```

Labels: "Mark area for redaction on page {n}", "Mark {n} search matches for redaction", "Apply redactions". Summary from the apply report title: "{marks} areas on {pages} pages, verified" (plus ", {k} pages turned into images").

- [ ] **Step 1: Tests** — search "secret" case-insensitive finds "Secret" with one rect per line; wholeWord excludes "secretary"; regex `\d{4}` finds years; presets: valid IBAN `IE29AIBK93115212345678` found, a mod-97 failure ignored; card `4111 1111 1111 1111` found, `4111 1111 1111 1112` ignored; phone with 8 digits ignored; invalid regex message. Ops: mark adds to the view; apply is a checkpoint (dispatch refuses it).
- [ ] **Step 2: Implement; commit** — `feat(redact): area and search marks with literal, regex and validated preset patterns`.

### Task E-4: Text and vector removal under marks

**Files:**

- Create: `src/pdf/redact/text.ts` (+ test), `src/pdf/redact/paths.ts` (+ test), `src/pdf/redact/geometry.ts`

**Interfaces:**

```ts
// geometry.ts
export function quadBox(q: Quad): Box;
export function overlapFraction(glyph: Box, mark: Box): number; // intersection area / glyph area
export function coveredBy(box: Box, marks: Box[]): boolean; // box fully inside the union of marks (sampled 4x4 grid + corners, conservative)
// text.ts
export function removeGlyphs(
  parsed: ParsedContent,
  interp: Interpretation,
  marks: Box[],
  fonts: Map<string, FontMetrics>,
): { parsed: ParsedContent; removed: number };
// paths.ts
export function removePaths(
  parsed: ParsedContent,
  interp: Interpretation,
  marks: Box[],
): { parsed: ParsedContent; removed: number };
```

Rules (spec §10.2 step 2, 5):

- A glyph is removed when `overlapFraction(quadBox(glyph.quad), mark) >= 0.01` for any mark.
- Each affected text-showing op is rewritten as a `TJ` whose array keeps surviving glyph bytes as hex strings and replaces each removed glyph with the number `n = -advance * 1000 / (Tfs * Th)` (merging adjacent numbers, keeping the op's own original numbers), so surviving glyphs keep their exact positions and the text matrix after the op is unchanged. `'` becomes `T*` + `TJ`; `"` becomes `aw Tw ac Tc T*` + `TJ`. An op whose glyphs are all removed becomes a `TJ` of numbers only.
- Paths: a painted path whose bbox `coveredBy(marks)` is removed (its construction ops and paint op dropped); a clip path (`W`/`W*`) that is also painted keeps its construction and becomes `W n`; intersecting paths stay (they carry no text) and are covered by the fill.

```ts
function rewriteShow(
  op: ContentOp,
  hits: GlyphHit[],
  removedIdx: Set<number>,
  tfs: number,
  th: number,
): ContentOp[] {
  const parts: Tok[] = [];
  let pendingBytes: number[] = [];
  let pendingNum = 0;
  const flushBytes = () => {
    if (pendingBytes.length) {
      parts.push({ t: 'str', v: Uint8Array.from(pendingBytes), hex: true });
      pendingBytes = [];
    }
  };
  const flushNum = () => {
    if (pendingNum !== 0) {
      parts.push({ t: 'num', v: pendingNum, raw: '' });
      pendingNum = 0;
    }
  };
  for (const item of showItems(op)) {
    // strings (with their glyph hits in order) and the op's own numbers
    if (item.kind === 'num') {
      flushBytes();
      pendingNum += item.value;
      continue;
    }
    for (const g of item.glyphs) {
      if (removedIdx.has(g.index)) {
        flushBytes();
        pendingNum += (-g.hit.advance * 1000) / (tfs * th);
      } else {
        flushNum();
        pendingBytes.push(
          ...item.bytes.subarray(
            g.hit.byteStart,
            g.hit.byteStart + g.hit.byteLength,
          ),
        );
      }
    }
  }
  flushBytes();
  flushNum();
  const tj: ContentOp = { op: 'TJ', operands: [{ t: 'arr', v: parts }] };
  if (op.op === "'") return [{ op: 'T*', operands: [] }, tj];
  if (op.op === '"')
    return [
      { op: 'Tw', operands: [op.operands[0]] },
      { op: 'Tc', operands: [op.operands[1]] },
      { op: 'T*', operands: [] },
      tj,
    ];
  return [tj];
}
```

(`showItems` pairs each string operand with the `GlyphHit`s the interpreter produced for it, using `part` and `byteStart`.)

- [ ] **Step 1: Failing tests** (pdf-lib fixture -> parse -> interpret -> remove -> write back -> pdf.js text content and positions): removing "SECRET" from "My SECRET plan" leaves "My" and "plan" at their original x positions (+-0.01pt) and no "SECRET" text; TJ with kerning numbers keeps surviving glyph positions; `'` and `"` rewritten; Identity-H two-byte codes removed in pairs; a path fully inside a mark is removed, an intersecting path stays; a clip path becomes `W n`.
- [ ] **Step 2: Implement; commit** — `feat(redact): glyph removal with exact TJ compensation and vector removal under marks`.

### Task E-5: Image patching and Form XObject recursion

**Files:**

- Create: `src/pdf/redact/images.ts` (+ test), `src/pdf/redact/xobjects.ts` (+ test), `src/pdf/redact/codec.ts`

**Interfaces:**

```ts
export interface DecodedImage {
  width: number;
  height: number;
  comps: 1 | 3;
  pixels: Uint8Array;
  smask?: { pixels: Uint8Array };
}
export async function decodeForRedaction(
  doc: PDFDocument,
  stream: PDFRawStream,
  codec: ImageCodec,
): Promise<DecodedImage | { raster: RasterReason }>;
// supported: DCTDecode (codec.decodeJpeg; Decode arrays or /DecodeParms -> raster), FlateDecode (+ PNG predictors via compress/pixels unpredictPng), no filter;
// colour spaces DeviceGray, DeviceRGB, CalGray/CalRGB, ICCBased with N 1 or 3; BitsPerComponent 8 only; anything else (JBIG2, JPX, CCITT, CMYK, Indexed, Lab, BPC != 8) -> raster 'image-filter' or 'image-colorspace' (spec §10.2 rasterise list)
export function paintCovered(
  img: DecodedImage,
  ctm: Matrix,
  marks: Box[],
  fill: [number, number, number],
): number; // returns painted pixel count
// pixel (px, py) centre -> unit square (u = (px + 0.5) / W, v = 1 - (py + 0.5) / H) -> page via ctm; inside any mark -> fill (gray: luma of fill); smask pixel -> 255 (opaque)
export async function encodeReplacement(
  doc: PDFDocument,
  original: PDFRawStream,
  img: DecodedImage,
  codec: ImageCodec,
): Promise<PDFRef>;
// new XObject (shared originals untouched, spec §10.2 step 3): JPEG (quality 0.92) when the original was DCT, else Flate (zlib via fflate); new SMask stream when present
export function imageCoverage(
  ctm: Matrix,
  marks: Box[],
): 'none' | 'partial' | 'full';
// xobjects.ts
export async function redactForm(
  doc: PDFDocument,
  formRef: PDFRef,
  ctm: Matrix,
  marks: Box[],
  ctx: RedactPageCtx,
): Promise<{ ref: PDFRef; changed: boolean; raster: RasterReason[] }>;
// interprets the form's content with ctm x /Matrix; applies E-4 and E-5 inside; when anything changed, CLONES the form stream (new ref) and returns it so the caller rewrites the Do name
// in a page-private copy of /Resources /XObject (never edits a form that other pages share); recursion depth limit 12 (deeper -> raster 'parse-error').
```

```ts
export function paintCovered(
  img: DecodedImage,
  ctm: Matrix,
  marks: Box[],
  fill: [number, number, number],
): number {
  const { width: W, height: H, comps, pixels } = img;
  const gray = Math.round(
    0.2126 * fill[0] + 0.7152 * fill[1] + 0.0722 * fill[2],
  );
  // Only scan the pixel window that can intersect a mark: invert the CTM for each mark's corners.
  const inv = invert(ctm);
  let painted = 0;
  for (const m of marks) {
    const corners = [
      [m.x, m.y],
      [m.x + m.width, m.y],
      [m.x, m.y + m.height],
      [m.x + m.width, m.y + m.height],
    ].map(([x, y]) => apply(inv, x, y));
    const us = corners.map((c) => c[0]),
      vs = corners.map((c) => c[1]);
    const px0 = Math.max(0, Math.floor(Math.min(...us) * W) - 1),
      px1 = Math.min(W - 1, Math.ceil(Math.max(...us) * W) + 1);
    const py0 = Math.max(0, Math.floor((1 - Math.max(...vs)) * H) - 1),
      py1 = Math.min(H - 1, Math.ceil((1 - Math.min(...vs)) * H) + 1);
    for (let py = py0; py <= py1; py++)
      for (let px = px0; px <= px1; px++) {
        const [x, y] = apply(ctm, (px + 0.5) / W, 1 - (py + 0.5) / H);
        if (x < m.x || x > m.x + m.width || y < m.y || y > m.y + m.height)
          continue;
        const o = (py * W + px) * comps;
        if (comps === 1) pixels[o] = gray;
        else {
          pixels[o] = fill[0];
          pixels[o + 1] = fill[1];
          pixels[o + 2] = fill[2];
        }
        if (img.smask) img.smask.pixels[py * W + px] = 255;
        painted++;
      }
  }
  return painted;
}
export function imageCoverage(
  ctm: Matrix,
  marks: Box[],
): 'none' | 'partial' | 'full' {
  const box = quadBox(corners(ctm, 0, 0, 1, 1));
  if (!marks.some((m) => overlapFraction(box, m) > 0)) return 'none';
  return coveredBy(box, marks) ? 'full' : 'partial';
}
```

(`invert`, `apply`, `corners` are the interpreter's matrix helpers exported from `content/interpreter.ts`; a pixel counted twice under overlapping marks is harmless.)

- [ ] **Step 1: Failing tests** — a page with a 100x100 RGB Flate image and a mark over its left half: after patching, decode the new XObject: left half pixels are the fill colour, right half unchanged; the original XObject object still exists unchanged (shared originals untouched) and another page using it still shows the original; DCT image patched and re-encoded as JPEG; SMask covered region set to 255; full coverage removes the `Do`; a JBIG2-filtered image returns raster; a Form XObject used on two pages: redacting page 1 clones it for page 1 only.
- [ ] **Step 2: Implement** (codec: edit worker uses `canvasCodec` from `pdf/compress/canvas-codec.ts`, which runs in workers via OffscreenCanvas; tests use the `jpeg-js` test codec as phase 3 does). Commit — `feat(redact): image patching into new XObjects, SMask clearing and page-private Form XObject clones`.

### Task E-6: Apply orchestration, annotations, fill, document scrub, rasterise fallback

**Files:**

- Create: `src/pdf/redact/apply.ts` (+ test), `src/pdf/redact/scrub.ts` (+ test), `src/pdf/redact/rasterise.ts`, `src/pdf/edit/worker/redact.ts` (edit worker handlers), `src/pdf/render/handlers/redact.ts` (`renderBurned`, `markCoverage`), `src/pdf/doc/checkpoints/redact.ts` (main-thread runner)
- Modify: `src/pdf/qpdf/handlers.ts` + `client.ts` (`qdf(bytes)`: `run(['--qdf', '--object-streams=disable', 'in.pdf', 'out.pdf'], { 'in.pdf': bytes })`), registries, `src/pdf/doc/export-stages.ts` (`remove-unreferenced` applies when a `redact.apply` or `sanitize` checkpoint is in history: already defined in B)

**Interfaces:**

```ts
export interface PageMarks { pageIndex: number; marks: Box[]; fill: string; overlayText: string | null }
export interface RedactPagesResult { bytes: Uint8Array; rasterNeeded: { pageIndex: number; reasons: RasterReason[] }[]; removed: { glyphs: number; images: number; paths: number; annotations: number } }
// edit worker
redactPages(ctx, bytes: Uint8Array, pages: PageMarks[], terms: string[]): Promise<Transferred<RedactPagesResult & { scrubbed: string[] }>>;
// per page (spec §10.2 steps 1-7): parse every content stream (concatenated /Contents array) -> interpret -> if raster reasons: record the page and skip edits
// -> removeGlyphs, removePaths, images (decode/paint/encode or remove Do), forms (redactForm) -> remove annotations/widgets whose /Rect intersects a mark
// (widgets also leave /AcroForm /Fields; field values gone) -> write the new content stream (one stream replacing /Contents) -> append the fill content
// "q r g b rg x y w h re f Q" per mark (+ overlay text in Helvetica, white or black by contrast, fitted).
// then document level (step 8, scrub.ts): remove /StructTreeRoot and /MarkInfo; drop every page's /Thumb and /PieceInfo; outline titles containing a term -> "Redacted";
// Info values containing a term -> removed; XMP rebuilt from the scrubbed Info (metadata.ts buildXmp); embedded files whose name or description contains a term -> removed; each item listed in `scrubbed`.
// save (full rewrite, useObjectStreams true).
replaceWithImage(ctx, bytes: Uint8Array, pageIndex: number, image: Uint8Array, mime: 'image/png' | 'image/jpeg', keepAnnotsOutside: Box[]): Promise<Transferred<Uint8Array>>;
// new image-only page of identical MediaBox/CropBox/Rotate: content "q W 0 0 H x y cm /Im0 Do Q"; fonts and other resources dropped; annotations inside marks dropped
// render worker
renderBurned(ctx, docId: string, pageIndex: number, dpi: number, marks: Box[], fill: string): Promise<Transferred<{ bytes: Uint8Array; mime: 'image/png' }>>; // marks painted onto the canvas before encoding
markCoverage(ctx, docId: string, pageIndex: number, dpi: number, marks: Box[], fill: string): Promise<number[]>; // per mark: fraction of pixels within +-8/255 of the fill (spec §10.3 step 1)
// checkpoints/redact.ts — the main-thread orchestrator (decision G5)
export const redactApplyRunner: CheckpointRunner<{ dpi: number }>;
// 1. pages + terms from the view's redact.mark ops; 2. edit.redactPages; 3. for rasterNeeded pages: render.renderBurned on the ORIGINAL checkpoint bytes -> edit.replaceWithImage;
// 4. qpdf.optimize({ removeUnreferenced: true, objectStreams: 'generate' }) (step 9); 5. verify (E-7); 6. failures -> rasterise those pages, re-verify once;
// 7. still failing -> throw VERIFICATION_FAILED "Redaction could not be verified on pages {list}. Nothing was changed."; the checkpoint is discarded (no commit).
// Report: title "{marks} areas on {pages} pages, verified", lines per page ("Page 3: 2 marks, 14 characters removed, 1 image patched"), rasterised pages with reasons
// in plain words ("Page 5 was turned into an image because it uses a font without size information. Run OCR to make it searchable again."), scrubbed metadata items,
// and "Tagged structure was removed because it can contain hidden copies of text." when it existed.
```

- [ ] **Step 1: Failing tests** (Node, in-process: edit handlers called directly; render/qpdf via fakes where noted): apply on `redact-basic` (builder: text, an image, a path, an annotation and a widget under one mark) removes all of them and draws the fill; pages outside marks unchanged (content stream bytes identical); StructTreeRoot removed; outline title with the term becomes "Redacted"; Info Title containing the term removed and listed; a Type3 page is reported in `rasterNeeded` with `type3-no-metrics`; `replaceWithImage` produces a page with no text content (pdf.js) and the same size and rotation.
- [ ] **Step 2: Implement; commit** — `feat(redact): apply redactions per page with annotations, fills, document scrub and rasterise fallback, orchestrated as a checkpoint`.

### Task E-7: Verification (export blocked on failure)

**Files:**

- Create: `src/pdf/redact/verify.ts` (+ test)

**Interfaces:**

```ts
export interface VerifyInput {
  bytes: Uint8Array;
  pages: PageMarks[];
  terms: string[];
}
export interface VerifyResult {
  ok: boolean;
  failedPages: number[];
  problems: string[];
} // problems in plain words, e.g. "Page 3: text remains under a mark"
export async function verifyRedaction(
  input: VerifyInput,
  services: Pick<Services, 'render' | 'qpdf'>,
  signal: AbortSignal,
): Promise<VerifyResult>;
export function normalise(s: string): { spaced: string; compact: string }; // NFKC, lower case, whitespace runs -> ' ', and a whitespace-free copy
export function rawContainsTerm(bytes: Uint8Array, term: string): boolean; // latin1 (case-insensitive ASCII folding) and UTF-16BE (both cases), spec §10.3 step 3
```

Steps (spec §10.3): (1) open the bytes in the render worker; per marked page: `textItems` -> glyph boxes (proportional) -> none with `overlapFraction >= 0.01` against any mark; `markCoverage` at 100 DPI -> every mark >= 0.99; (2) whole document: every page's text, annotation contents (render `annotations()`), outline titles (`getOutline` via a new render handler `docTexts(docId)` returning `{ entries: { text; where; page }[] }` collected from page text, `getAnnotations`, `getOutline`, `getMetadata`, `getFieldObjects` and `getAttachments`), Info, XMP, form values, attachment names: none contains a term in `spaced` or `compact` form; (3) `qpdf.qdf(bytes)` output: `rawContainsTerm` false for every term. Area-only redactions have no terms: steps 2-3 then check nothing beyond step 1.

```ts
export function normalise(s: string) {
  const spaced = s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  return { spaced, compact: spaced.replace(/ /g, '') };
}
const utf16be = (s: string) => {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[2 * i] = c >> 8;
    out[2 * i + 1] = c & 0xff;
  }
  return out;
};
const latin1 = (s: string) =>
  Uint8Array.from([...s].map((ch) => ch.charCodeAt(0) & 0xff));
function indexOfFolded(
  hay: Uint8Array,
  needle: Uint8Array,
  fold: boolean,
): number {
  const f = (b: number) => (fold && b >= 0x41 && b <= 0x5a ? b + 32 : b);
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++)
      if (f(hay[i + j]) !== f(needle[j])) continue outer;
    return i;
  }
  return -1;
}
export function rawContainsTerm(bytes: Uint8Array, term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  // latin1, ASCII case folded; UTF-16BE in both the original and the lower/upper case forms.
  return (
    indexOfFolded(bytes, latin1(t), true) >= 0 ||
    [t, t.toLowerCase(), t.toUpperCase()].some(
      (v) => indexOfFolded(bytes, utf16be(v), false) >= 0,
    )
  );
}

export async function verifyRedaction(
  input: VerifyInput,
  services: Pick<Services, 'render' | 'qpdf'>,
  signal: AbortSignal,
): Promise<VerifyResult> {
  const failed = new Set<number>();
  const problems: string[] = [];
  const doc = await services.render.open(input.bytes, signal);
  try {
    for (const p of input.pages) {
      // step 1: geometry and pixels
      const items = await services.render.textItems(
        doc.docId,
        p.pageIndex,
        signal,
      );
      const leftover = glyphBoxes(items).filter((g) =>
        p.marks.some((m) => overlapFraction(g, m) >= 0.01),
      );
      if (leftover.length) {
        failed.add(p.pageIndex);
        problems.push(`Page ${p.pageIndex + 1}: text remains under a mark`);
      }
      const coverage = await services.render.markCoverage(
        doc.docId,
        p.pageIndex,
        100,
        p.marks,
        p.fill,
        signal,
      );
      if (coverage.some((c) => c < 0.99)) {
        failed.add(p.pageIndex);
        problems.push(`Page ${p.pageIndex + 1}: a mark is not fully covered`);
      }
    }
    const terms = input.terms
      .map(normalise)
      .filter((t) => t.compact.length > 0);
    if (terms.length) {
      // step 2: document strings
      const strings = await services.render.docTexts(doc.docId, signal); // pages' text, annotation contents, outline, info, xmp, fields, attachments (with page numbers where known)
      for (const s of strings.entries) {
        const n = normalise(s.text);
        if (
          terms.some(
            (t) => n.spaced.includes(t.spaced) || n.compact.includes(t.compact),
          )
        ) {
          if (s.page !== null) failed.add(s.page);
          problems.push(`A search term remains in ${s.where}`);
        }
      }
      const qdf = await services.qpdf.qdf(input.bytes, signal); // step 3: raw bytes
      for (const t of input.terms)
        if (rawContainsTerm(qdf.bytes, t))
          problems.push('A search term remains in the file data');
    }
  } finally {
    await services.render.close(doc.docId);
  }
  return {
    ok: problems.length === 0,
    failedPages: [...failed].sort((a, b) => a - b),
    problems,
  };
}
```

(`docTexts` returns `{ entries: { text: string; where: string; page: number | null }[] }` with `where` in plain words, e.g. "page 3 text", "the document title", "an attachment name". A failure without a page (metadata, raw bytes) cannot be fixed by rasterising: the runner reports `VERIFICATION_FAILED` directly with those problems.)

- [ ] **Step 1: Failing tests** with fake services built on real pdf.js in Node: a correctly redacted file passes; a file where the text was only covered (Edit "cover and replace" output) fails step 1 for that page; a file whose Info Title still contains the term fails step 2; a file with the term in an uncompressed stream comment fails step 3 (latin1); the UTF-16BE form is found.
- [ ] **Step 2: Implement; commit** — `feat(redact): automatic verification of geometry, pixels, document strings and raw bytes`.

### Task E-8: Adversarial redaction suite

**Files:**

- Create: `test/fixtures/redact.ts` (`makeRedactBasic`, `makeRedactAdversarial`, `makeType3FontPdf`), `src/pdf/redact/adversarial.test.ts`
- Modify: `scripts/gen-fixtures.ts` (`redact-adversarial.pdf`, `type3-font.pdf`)

`makeRedactAdversarial()` pages (each with the term "TOPSECRET-42" and a known mark rect):

1. Term drawn as text, then an opaque image placed on top (text hidden under image): the text must be removed, not just covered.
2. Term in a `TJ` with heavy kerning numbers between every glyph.
3. Term inside a Form XObject reused on pages 3 and 4; only page 3 is marked.
4. Same form, unmarked: term must remain on page 4 (and the search-term verification is per-term: this case uses a different term for page 3's mark to keep the check meaningful).
5. Term drawn with an Identity-H CID font (Noto Sans subset).
6. Term in a Type3 font -> page rasterised, reported, verified.
7. Term as an inline image of rendered text (pixels) under the mark -> inline image patched.
8. Term in an annotation `/Contents` inside the mark and in the outline and Info.
9. Term drawn with `7 Tr` (clip text) -> rasterised.
10. Term in a widget value under the mark -> widget removed, field value gone.

- [ ] **Step 1: Test** — apply redaction with marks from the fixture (the runner with real pdf.js/qpdf-wasm in Node; the edit handlers in-process): verification passes; for each page: no glyph of the term remains (pdf.js text), raw qdf bytes contain no term, page 4 still shows its term, pages 6 and 9 are image-only and listed in the report with the plain-words reasons; the report title says "verified". A deliberately broken run (stub `removeGlyphs` to a no-op through dependency injection) leads to rasterisation and then passes; stubbing rasterise too leads to `VERIFICATION_FAILED` naming the pages and no checkpoint commit.
- [ ] **Step 2: Commit** — `test(redact): adversarial suite covering hidden text, kerning, shared forms, CID and Type3 fonts, inline images, annotations and widgets`.

### Task E-9: Redact mode UI

**Files:**

- Create: `src/pdf/workspace/modes/redact/{index.ts,Mode.tsx,RedactToolbar.tsx,MarksOverlay.tsx,SearchPanel.tsx,ApplyConfirm.tsx,RedactReport.tsx}`, `src/shared/ui/icons/custom/redact.tsx`, tests `SearchPanel.test.tsx`, `ApplyConfirm.test.tsx`
- Modify: registries

**Behaviour (spec §10.1, §13.3):** manifest `{ id: 'redact', label: 'Redact', icon: IconModeRedact, shortcut: '5', order: 5 }`. Toolbar: "Mark area" (`IconRedactArea`, drag rectangles; option `Switch` "Snap to text lines" snapping the rect to the union of glyph boxes it touches), "Find and mark" (`IconRedactSearch`, Mod+F, opens `SearchPanel`), "Apply redactions" (`IconRedactApply`, primary, disabled with reason "Mark something to redact first" when no marks), fill colour (`ColorSwatchPicker` Black/White/custom), `Input` "Text on redactions" (optional, e.g. "REDACTED"), `Select` "Image quality for pages turned into images" (150/200/300 DPI). Marks render with `ShapeLayer` rect `stroke: { token: 'redact' }`, `hatch: true` (preview only); each mark is a `HitArea` "Redaction mark on page {n}" (Del removes it via `object.remove`). `SearchPanel`: `Input` "Find", `Switch` "Regular expression", "Match case", "Whole words", presets as toggle `Button`s "Email addresses", "Phone numbers", "IBANs", "Card numbers"; results list (page, context snippet with the match highlighted by kit `Highlight`, per-match `Checkbox`), "Mark all" / "Mark selected" (one grouped op). `ApplyConfirm` (Dialog): "Removes the content under {n} marks on {m} pages. You can undo until you export." + note "Tagged structure (used by screen readers) will be removed from this document." when the doc is tagged; buttons "Cancel", "Apply redactions" (danger). Apply runs `runCheckpoint('redact.apply')` with `ProgressOverlay` "Applying redactions" per page; success announces "Redactions applied and verified"; `VERIFICATION_FAILED` shows a blocking `ErrorState` with the message and "Close" (the document is unchanged). `RedactReport` (Inspector, after apply): the checkpoint report (lines, rasterised pages as warnings with "Run OCR" button added in F-7, scrubbed items). Rail badges: "{n} marks" (danger dot) before apply; "Redacted" / "Turned into image" after.

Redact icons: `IconRedactArea` (dashed rect + fill bar), `IconRedactSearch` (magnifier + bar), `IconRedactApply` (bar + check path), `IconRedactVerified` (shield + check), `IconRasterised` (page + pixel grid 3x3 squares).

- [ ] **Step 1: Tests** — SearchPanel: typing "secret" lists matches with checkboxes; "Mark all" dispatches one grouped `redact.mark` set; invalid regex shows the inline error; ApplyConfirm copy with counts.
- [ ] **Step 2: Implement; commit** — `feat(redact-mode): area and search marking, presets, apply confirmation with verification report`.

### Task E-10: Protect mode — protection at export, metadata, sanitise; delete `pdf-metadata`

**Files:**

- Create: `src/pdf/doc/ops/protect.ts`, `src/pdf/doc/materialize/protect.ts`, `src/pdf/edit/sanitize.ts` (+ test), `src/pdf/doc/checkpoints/sanitize.ts`, `src/pdf/doc/export-stages/encrypt.ts`, `src/pdf/workspace/modes/protect/{index.ts,Mode.tsx,ProtectToolbar.tsx,PermissionsForm.tsx,MetadataForm.tsx,SanitizeDialog.tsx,ProtectExportSection.tsx}`, `src/shared/ui/icons/custom/optimize.tsx` (`IconSanitize`, `IconPermissions`, plus Optimize icons for E-11)
- Modify: `src/pdf/edit/metadata.ts` (doc-level `applyMetadataPatch(doc, patch)` used by both the bytes API and the materialiser), registries, `src/pdf/workspace/export-options.ts` (append `protect` section), `src/pdf/doc/export-stages.ts` (append encrypt, order 30)
- Delete: `src/tools/pdf-metadata/`, its e2e spec and warm-up entry, interim slug

**Interfaces:**

```ts
'protect.set' { enabled: boolean; permissions: Permissions /* qpdf-wasm type, from tools/pdf-protect/lib/permissions.ts moved to pdf/edit/permissions.ts */ } // docOverlay, noOutput (applied by the export stage)
'meta.set'    { patch: MetadataPatch }                                                                    // docOverlay, phase 'metadata'
'sanitize'    { scripts: boolean; attachments: boolean; links: boolean; metadata: boolean; hiddenLayers: boolean } // checkpoint
// sanitize.ts (edit worker)
export interface SanitizeReport { removed: string[] } // plain words: "Document JavaScript (2 scripts)", "Open action", "Additional actions on 3 pages", "4 attachments", "XFA form data", ...
export async function sanitizeDoc(bytes: Uint8Array, o: SanitizeOptions): Promise<{ bytes: Uint8Array; report: SanitizeReport }>;
// scripts: /Names /JavaScript, catalog /OpenAction when JavaScript, /AA on catalog, pages, annotations and fields, JavaScript and Launch actions in links/widgets; /AcroForm /XFA
// attachments: /Names /EmbeddedFiles and FileAttachment annotations; links: Link annotations with URI/Launch/GoToR actions;
// metadata: Info + XMP (stripMetadataInPlace); hiddenLayers: optional content groups that are OFF by default and their content (marked-content BDC /OC ... EMC blocks removed via the E-1 parser); page /PieceInfo and /Thumb always
// export-stages/encrypt.ts — order 30; applies when protect.set.enabled; needs options.password (entered in the Export dialog, never persisted)
```

Export dialog "Password protection" section (shown when `protect.set.enabled`): `Input type=password` "Password to open", "Confirm password", optional "Owner password" (defaults to a random value, as the phase-3 tool does), strength note via the existing `pdf-protect/lib/permissions.ts` rules (moved to `pdf/edit/permissions.ts`); mismatch/weak/empty -> inline errors; passwords zero-filled after export (phase-3 rule). The "input was encrypted; output is unencrypted" warning is suppressed when protection is enabled. Encrypt stage + signature stage together -> G14 error (H registers its check; E's stage also refuses when `options.signature` is set so the order of merges does not matter).

Protect mode (manifest `{ id: 'protect', label: 'Protect', icon: IconModeProtect, shortcut: '7', order: 7 }`): toolbar "Password protection" (`Switch` + `PermissionsForm` in the inspector: print none/low/full, modify none/assembly/form/annotate/all, copy text, the phase-3 tool's options), "Document properties" (`MetadataForm`: the phase-3 metadata fields; "Remove all properties" button), "Sanitise" (`IconSanitize`, `SanitizeDialog` with the five checkboxes and a preview of what will be removed computed by a dry run `sanitizeDoc(..., { dryRun })`), restricted documents (owner-password-only, spec §12): "Unlock for editing" prompts for the owner password (qpdf decrypt) — no bypass.

- [ ] **Step 1: Tests** — sanitize removes document JS, OpenAction JS, page AA, attachments and XFA from a fixture (`makeScriptedPdf` builder) and reports each; dry run changes nothing; `meta.set` materialises (getMetadata reads the patch); encrypt stage output needs the password (qpdf inspect `needsPassword: true`) and permissions match; encrypt + signature refused.
- [ ] **Step 2: Implement; delete `pdf-metadata`; commit** — `feat(protect-mode): password protection at export, document properties and sanitise; pdf-metadata tool removed`.

### Task E-11: Optimize mode — compress, repair, linearize, size breakdown

**Files:**

- Create: `src/pdf/doc/checkpoints/optimize.ts`, `src/pdf/edit/size-breakdown.ts` (+ test), `src/pdf/doc/export-stages/linearize.ts`, `src/pdf/workspace/modes/optimize/{index.ts,Mode.tsx,OptimizeToolbar.tsx,SizeBreakdown.tsx,CompressPanel.tsx}`
- Modify: registries, `export-options.ts` (append `linearize` switch "Optimise for fast web view"), `export-stages.ts` (linearize order 20)

**Interfaces:**

```ts
'optimize.compress' { preset: PresetId; settings?: CompressSettings }  // checkpoint via compressPdf + browserCompressDeps; output >= input -> keep original, report "Kept original: the compressed file was not smaller" (existing behaviour, not an error)
'optimize.repair'   {}                                                // checkpoint via qpdf.optimize({ objectStreams: 'preserve' }) full rewrite; report qpdf warnings
export interface SizeBreakdown { total: number; images: number; fonts: number; content: number; other: number; largestImages: { page: number; bytes: number; width: number; height: number }[]; fontList: { name: string; bytes: number; embedded: boolean; subset: boolean }[] }
export async function sizeBreakdown(bytes: Uint8Array): Promise<SizeBreakdown>; // edit worker; images via compress/inventory; fonts = FontFile/FontFile2/FontFile3 stream lengths; content = page content streams; other = total - the rest
```

Optimize mode (manifest `{ id: 'optimize', label: 'Optimize', icon: IconModeOptimize, shortcut: '8', order: 8 }`): `SizeBreakdown` panel (kit `Progress` bars per category with `formatBytes`, largest images list with "Go to page", fonts list), `CompressPanel` (presets via `SegmentedControl` Lossless / Balanced / Strong with the phase-3 descriptions, advanced settings disclosure, "Compress" runs the checkpoint with per-stage progress and shows the phase-3 report view moved from `tools/pdf-compressor/components/CompressReportView.tsx` to `src/pdf/components/CompressReport.tsx` so both share it), "Repair" (`IconRepair`), linearize lives in the Export dialog. Icons `IconLinearize`, `IconRepair`, `IconSizeBreakdown`.

- [ ] **Step 1: Tests** — size breakdown on `images-heavy.pdf` attributes most bytes to images and sums to total; compress checkpoint keeps the original on an already-small file and reports it; linearize stage output inspected by qpdf (`check` reports linearized) when enabled.
- [ ] **Step 2: Implement; commit** — `feat(optimize-mode): compress and repair checkpoints, linearize at export, size breakdown`.

### Task E-12: Convert mode and PDF to Markdown

**Files:**

- Create: `src/pdf/convert/markdown.ts` (+ test), `src/pdf/doc/ops/convert.ts` (`page.insertImages`), `src/pdf/workspace/modes/convert/{index.ts,Mode.tsx,ConvertToolbar.tsx,ConvertPanel.tsx}`
- Modify: registries

**Interfaces:**

```ts
export interface MarkdownOptions { pages?: number[]; headingRatio?: number /* 1.25 */ }
export function toMarkdown(pages: { items: PageTextItems; geometry?: { lines: Lines; cells: Cell[] } }[], o?: MarkdownOptions): string;
// spec §7.2: items -> lines (baseline clusters, tol 0.5 x size) -> blocks (vertical gap > 1.2 x median line height); body size = median run size;
// size >= 1.25 x body -> '#' (largest cluster) / '##' (next); leading list markers (digits + '.' or ')', '-', '*', and bullet glyphs recognised by numeric code points 0x2022, 0x25CF, 0x25E6, 0x2023) -> '- ' / '1. ';
// tables from the C detector's cells (when P5-C merged: cells -> GFM table with header = first row); hyphenation joined ("-" at line end + lower-case start of next line);
// the output starts with the HTML comment "<!-- Converted by tools: best-effort structure, check before use -->" and the UI states it is a best-effort structural conversion.
'page.insertImages' { at: number; sourceId: SourceId; newIds: PageId[] } // structure; the source is created by converting images with imagesToPdf in the edit worker (DocumentApi.addSource)
```

Convert mode (manifest `{ id: 'convert', label: 'Convert', icon: IconModeConvert, shortcut: '6', order: 6 }`): actions on the current materialised view (materialise once per action with `useJob` and `ProgressOverlay`): "Pages to images" (format PNG/JPEG, DPI, pages: all or selected; zip via `saveZip`; capped DPI notes from the existing `PageImage.capped`), "Text" (`.txt` via `textFromItems`), "Markdown" (`.md` via `toMarkdown`), "Selected pages as PDF" (extract), "Insert images as pages" (file picker -> `page.insertImages` after the current page). No doc ops except the last one (spec §7.2).

- [ ] **Step 1: Tests** — markdown: a fixture with a 20pt title, 12pt body paragraphs, a numbered list and a hyphenated line produces `# Title`, paragraphs, `1. ` items and the joined word; a table fixture (when C merged) produces a GFM table; the leading comment is present; no banned glyph in the output (bullets converted to '- ').
- [ ] **Step 2: Implement; commit** — `feat(convert-mode): images, text, Markdown and selected-page exports; insert images as pages`.

### Task E-13: Quick tasks restyle, "Open result in workspace", e2e, visual, P5-E verification

**Files:**

- Modify: the 8 quick-task `Tool.tsx` files (layout on `ToolPage`, kit components only, `JobPanel`/`ResultFiles` restyled), `src/pdf/components/ResultFiles.tsx` (+ test): prop `openInWorkspace?: boolean` showing "Open result in workspace" for single-PDF results; `src/tools/pdf-compressor/*` (report view moved to `src/pdf/components/CompressReport.tsx`)
- Create: `test/e2e/redact.spec.ts`, `test/e2e/protect-optimize-convert.spec.ts`, `test/e2e/quick-task-handoff.spec.ts`, `test/visual/redact-protect.visual.ts`

**Interfaces:**

```ts
// ResultFiles: openInWorkspace -> Button "Open result in workspace" (IconArrowRight after the label) -> stageDocument({ name, bytes, wasEncrypted: false }) -> navigate(`/pdf/edit?open=${id}`)
```

- [ ] **Step 1: e2e:**
  1. Redact: open `redact-adversarial.pdf`, Find "TOPSECRET-42", Mark all, Apply; report says "verified"; Export; in the test, the downloaded file's pdf.js text has no "TOPSECRET-42" on marked pages and qdf bytes (qpdf-wasm in Node) contain no term.
  2. Protect/unlock round trip: Protect mode, enable password protection, Export with password "correct horse"; reopen the download in the workspace: password prompt; correct password opens; Unlock quick task (`/pdf/unlock`) removes it.
  3. Optimize: `images-heavy.pdf` Balanced compress -> report shows a smaller size; Export.
  4. Convert: Markdown download contains "# " heading from `structured-3.pdf`.
  5. Quick-task handoff: `/pdf/merge` with two PDFs -> result -> "Open result in workspace" -> `/pdf/edit` shows the merged page count.
- [ ] **Step 2: Visual:** Redact (marks, search panel, apply confirm, report), Protect (permissions, sanitise dialog), Optimize (size breakdown), Convert panel, a quick task page with a result — both themes desktop; Redact in Focus phone. Gate 1-6.

## PR boundary E — Redact, Protect, Optimize, Convert

| Check                                  | Evidence                              |
| -------------------------------------- | ------------------------------------- |
| Adversarial redaction suite green      | `adversarial.test.ts`                 |
| protect/unlock and compress e2e        | `protect-optimize-convert.spec.ts` x3 |
| quick-task handoff e2e                 | `quick-task-handoff.spec.ts`          |
| `pdf-metadata` deleted, route NotFound | grep + smoke                          |
| Visual both themes                     | `pnpm test:visual`                    |

---

# Part P5-F — OCR (PR: `feat/p5-f-ocr`)

**Scope (spec §11, §17 row F):** asset copy script + manifest, consent/download UI, OCR worker pool, invisible text layer, raster ruling detection for scanned forms, "Run OCR" actions from Annotate/Redact/hub card; CSP headers.

F-1..F-5 start after P5-B (parallel with C, D, E, H). Before F-6 rebase on C (cell builder); before F-7 rebase on C, D and E (entry points live in their modes). The only network use is same-origin OCR asset fetching after consent.

### Task F-1: Dependencies, asset copy script, `ocr-manifest.json`

**Files:**

- Create: `scripts/copy-ocr-assets.mjs`, `test/ocr-assets.test.ts`
- Modify: `package.json` (`tesseract.js`, `tesseract.js-core`, `@tesseract.js-data/{eng,fra,deu,spa,ita,por,nld,gle,pol,swe}`; scripts `dev` and `build` run `node scripts/copy-ocr-assets.mjs` after the pdf.js copy), `.gitignore` (`public/ocr`), `eslint.config.js` ignores (`public/ocr`), `wrangler.jsonc` unchanged (immutable caching comes from hashed paths: files are copied under a versioned directory `public/ocr/<tesseract.js version>/`)

**Interfaces:**

```ts
// public/ocr/<v>/ocr-manifest.json (generated; exact byte sizes)
interface OcrManifest {
  version: string; // tesseract.js version
  worker: { path: string; bytes: number }; // e.g. '/ocr/6.0.1/worker.min.js'
  core: {
    simd: { dir: string; bytes: number };
    plain: { dir: string; bytes: number };
  }; // LSTM-only cores (one is fetched)
  languages: Record<
    OcrLanguage,
    { label: string; path: string; bytes: number }
  >; // '/ocr/6.0.1/lang/eng.traineddata.gz'
}
type OcrLanguage =
  | 'eng'
  | 'fra'
  | 'deu'
  | 'spa'
  | 'ita'
  | 'por'
  | 'nld'
  | 'gle'
  | 'pol'
  | 'swe';
// labels: English, French, German, Spanish, Italian, Portuguese, Dutch, Irish, Polish, Swedish
```

- [ ] **Step 1:** Install; report licenses (Apache-2.0). List `node_modules/tesseract.js-core/` and the data packages: copy only the LSTM cores (`tesseract-core-simd-lstm.wasm(.js)` and `tesseract-core-lstm.wasm(.js)`, exact file names per installed version) and the `tessdata_fast` variant of each language (`*.traineddata.gz`; when a package only ships `best_int`, use it and report the size difference).
- [ ] **Step 2: Script** — idempotent like `pdfjs-assets.mjs` (P4-D): copies when the destination is missing or older, writes the manifest with `statSync().size` of every file, and never touches anything outside `public/ocr`.
- [ ] **Step 3: Test** (`ocr-assets.test.ts`, runs the script into a temp dir via an exported function): manifest lists 10 languages with sizes > 0, paths are same-origin absolute paths starting with `/ocr/`, every file exists. Commit — `chore(ocr): tesseract.js engine and Latin-script language data copied same-origin with an exact-size manifest`.

### Task F-2: Content-Security-Policy

**Files:**

- Create: `scripts/csp.ts` (+ `test/csp.test.ts`), `public/_headers` (generated by `scripts/csp.ts` during build), `test/e2e-csp/csp.spec.ts`, `playwright.csp.config.ts`
- Modify: `vite.config.ts` (`preview.headers` from `scripts/csp.ts`), `package.json` (`"test:csp": "pnpm build && playwright test -c playwright.csp.config.ts"`)

**Interfaces:**

```ts
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'", // sonner and Plotly inject style elements
  "img-src 'self' data: blob: https:", // Random Data Generator shows remote avatar URLs as data (phase 4 note)
  "font-src 'self' data:",
  'connect-src * data: blob:', // decision G11: API Request tool and opt-in TSA; workspace enforced by request-log tests
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');
export function headersFile(): string; // "/*\n  Content-Security-Policy: ...\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n"
```

- [ ] **Step 1:** CSP e2e against `vite preview` (port 4174, preview serves the same headers): visit every route from the registry and `/pdf/edit` with a document open, collect `securitypolicyviolation` events via `page.addInitScript` (listener pushing to `window.__csp`) and console errors containing "Content Security Policy"; expect none. Plotly (calculator) and Rive must work under the policy; if one needs `'unsafe-eval'`, stop and report to the controller instead of loosening the policy silently.
- [ ] **Step 2: Commit** — `feat(security): Content-Security-Policy headers verified on every route`.

### Task F-3: OCR engine pool and same-origin asset loader

**Files:**

- Create: `src/pdf/ocr/assets.ts` (+ test), `src/pdf/ocr/pool.ts` (+ test with a fake engine)

**Interfaces:**

```ts
// assets.ts
export async function loadOcrManifest(
  signal?: AbortSignal,
): Promise<OcrManifest>; // fetch('/ocr/<v>/ocr-manifest.json'); failure -> NETWORK "Couldn't download OCR data. Check your connection and try again."
export function assertSameOrigin(url: string): void; // throws UNKNOWN in dev builds if any OCR URL is not same-origin (guard for decision G11)
export function simdSupported(): boolean; // WebAssembly.validate of the 30-byte SIMD probe module
export function downloadSize(m: OcrManifest, langs: OcrLanguage[]): number; // worker + chosen core + languages (spec §11 "size stated before download")
export async function hasCachedLanguage(lang: OcrLanguage): Promise<boolean>; // tesseract.js cache (idb-keyval store used by cacheMethod 'write'; executor confirms the DB/store names in the installed version)
export async function removeOcrData(): Promise<void>; // deletes that cache; engine files remain in the HTTP cache (stated in the UI)
// pool.ts
export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
} // image pixels
export interface OcrPageResult {
  words: OcrWord[];
  meanConfidence: number;
}
export interface OcrPool {
  recognize(image: Blob, signal: AbortSignal): Promise<OcrPageResult>;
  terminate(): Promise<void>;
}
export async function createOcrPool(o: {
  langs: OcrLanguage[];
  manifest: OcrManifest;
  onProgress(p: { status: string; progress: number }): void;
  size?: number;
}): Promise<OcrPool>;
// size = min(2, max(1, floor(navigator.hardwareConcurrency / 2))); tesseract.js createScheduler + createWorker(langs.join('+'), OEM.LSTM_ONLY, {
//   workerPath: manifest.worker.path, corePath: simd ? manifest.core.simd.dir : manifest.core.plain.dir, langPath: dirname(lang path),
//   cacheMethod: 'write', gzip: true, workerBlobURL: false, logger: onProgress });
// recognize(image, {}, { blocks: true }) -> flatten blocks/paragraphs/lines/words; abort -> scheduler job cancel is not supported by tesseract: terminate the pool and recreate it on next use (like createQpdf's restart rule);
// worker load/fetch failures -> NETWORK (message above); crashes -> WORKER_CRASHED.
```

- [ ] **Step 1: Tests** — `downloadSize` sums correctly for SIMD and plain; `assertSameOrigin('https://cdn.example/x')` throws; pool with an injected fake `createWorker` maps nested blocks to a flat word list and mean confidence; an abort terminates and the next `recognize` recreates the workers; fetch failure maps to NETWORK.
- [ ] **Step 2: Implement** (`createOcrPool` takes an optional `engine` dependency for tests; default imports `tesseract.js` lazily). Commit — `feat(ocr): same-origin asset manifest, SIMD detection and a cancellable tesseract.js worker pool`.

### Task F-4: Page selection and recognition pipeline

**Files:**

- Create: `src/pdf/ocr/pages.ts` (+ test), `src/pdf/doc/checkpoints/ocr.ts`
- Modify: `src/pdf/doc/ops/index.ts` (op `ocr.textLayer`), registries

**Interfaces:**

```ts
export function glyphCoverage(items: PageTextItems, page: PageGeom): number;  // sum of run boxes / page area
export function pagesNeedingOcr(pages: { index: number; text: PageTextItems; geom: PageGeom }[], mode: 'auto' | 'force' | number[]): number[];
// auto: hasTextLayer false (textFromItems) or coverage < 0.01 (spec §11)
'ocr.textLayer' { langs: OcrLanguage[]; pages: 'auto' | 'force' | PageId[] } // checkpoint
export interface OcrPageReport { page: number; words: number; meanConfidence: number; low: boolean; dpi: number; capped: boolean; skippedChars: number }
// runner (main thread): open input bytes in the render worker -> pages -> for each (visible first, then the rest): renderPageImage({ dpi: 300, format: 'png', quality: 1 })
// (capped by MAX_CANVAS_PIXELS; report the real dpi) -> pool.recognize -> edit.writeTextLayer (F-5) for all pages at once -> report:
// title "Text layer added to {n} pages", lines per page "Page 3: 412 words, 91% confidence", warnings for low pages "Page 7: low confidence (54%)" (< 60, spec §11).
```

- [ ] **Step 1: Tests** — coverage of a text page > 0.01, of `scan-form.pdf` = 0; `pagesNeedingOcr` auto/force/explicit; the runner with a fake pool and real render/edit in-process produces a report with per-page lines and flags a fake page with 50% confidence.
- [ ] **Step 2: Implement; commit** — `feat(ocr): page selection by text coverage and a recognition checkpoint with a quality report`.

### Task F-5: Invisible text-layer writer

**Files:**

- Create: `src/pdf/ocr/text-layer.ts` (+ test), `src/pdf/edit/worker/ocr.ts` (edit worker handler `writeTextLayer`)
- Modify: `src/pdf/edit/worker/handlers.ts` (append)

**Interfaces:**

```ts
export interface PageWords {
  pageIndex: number;
  words: OcrWord[];
  imageWidth: number;
  imageHeight: number;
  dpi: number;
}
export async function writeTextLayer(
  bytes: Uint8Array,
  pages: PageWords[],
  fontBytes: Uint8Array,
): Promise<{ bytes: Uint8Array; skippedChars: Record<number, number> }>;
```

Algorithm (spec §11 "Text layer"):

```ts
const font = await doc.embedFont(fontBytes, { subset: true }); // Noto Sans (pdf-lib Type0 Identity-H with a correct ToUnicode CMap)
for (const p of pages) {
  const page = doc.getPage(p.pageIndex);
  const geom = {
    view: viewOf(page),
    rotate: page.getRotation().angle as Rotation,
  };
  const vp = pageViewport(geom, 0, p.dpi / 72); // same transform the render used (rotation included)
  const ops: string[] = ['q', 'BT', '3 Tr'];
  const name = page.node.newFontDictionary('FOCR', font.ref).asString(); // PDFPageLeaf API: registers a unique /FOCRn name in the page resources
  for (const w of p.words) {
    const text = w.text.trim();
    if (!text) continue;
    const drawable = [...text]
      .filter((ch) => font.getCharacterSet().includes(ch.codePointAt(0)!))
      .join('');
    skipped += text.length - drawable.length;
    if (!drawable) continue;
    // Image px -> viewport px -> page space (bottom-left and bottom-right of the word box define the baseline direction)
    const [x0, y0] = toPage(vp, w.bbox.x0, w.bbox.y1);
    const [x1, y1] = toPage(vp, w.bbox.x1, w.bbox.y1);
    const [xt, yt] = toPage(vp, w.bbox.x0, w.bbox.y0);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const height = Math.hypot(xt - x0, yt - y0);
    if (len < 0.5 || height < 0.5) continue;
    const ux = (x1 - x0) / len,
      uy = (y1 - y0) / len;
    const size = height / (font.heightAtSize(1) || 1); // font size whose full height matches the box height
    const natural = font.widthOfTextAtSize(drawable, size);
    const tz = natural > 0 ? (100 * len) / natural : 100; // horizontal scaling to match the box width
    const descent = 0.21 * size; // Noto Sans descent ratio; baseline sits above the box bottom
    // "Up" in page space is the baseline direction rotated +90 degrees: (-uy, ux).
    const ox = x0 - uy * descent,
      oy = y0 + ux * descent;
    ops.push(
      `${fmt(tz)} Tz`,
      `${name} ${fmt(size)} Tf`,
      `${fmt(ux)} ${fmt(uy)} ${fmt(-uy)} ${fmt(ux)} ${fmt(ox)} ${fmt(oy)} Tm`,
      `${font.encodeText(drawable).toString()} Tj`,
    );
  }
  ops.push('ET', 'Q');
  // Append as a separate content stream so the original image stream stays untouched (spec §11).
  page.node.addContentStream(
    doc.context.register(doc.context.flateStream(ops.join('\n'))),
  );
}
```

`fmt` is the shared number formatter from P5-B (`src/pdf/edit/fmt.ts`).

- [ ] **Step 1: Failing tests** (mocked recognition output, spec §15): write words "Invoice", "Total", "42.00" with known boxes on `scan-form.pdf` page 1 at 300 dpi; reopen with pdf.js: `textFromItems` contains the three words; each word's text item origin and width match the box mapped to page space within 1pt; the page renders identically to before (pixel diff 0 at 72 dpi: invisible text); a rotated (90) page maps correctly; a word with an unsupported character counts in `skippedChars`.
- [ ] **Step 2: Implement; commit** — `feat(ocr): invisible text layer with box-matched size and horizontal scaling over the original image`.

### Task F-6: Raster ruling detection for scanned forms (needs P5-C merged)

**Files:**

- Create: `src/pdf/detect/raster.ts` (+ test), `src/pdf/render/handlers/raster-geometry.ts`
- Modify: `src/pdf/render/handlers/geometry.ts` (`detect` uses raster segments when a page has no vector segments and at least one image covering > 50% of the page), `src/pdf/render/handlers/index.ts`

**Interfaces:**

```ts
export function otsuThreshold(gray: Uint8Array): number;
export function rulingSegments(gray: { width: number; height: number; data: Uint8Array }, dpi: number): Seg[]; // image px -> later mapped to page space
// binarise with Otsu; horizontal: per row, close gaps <= 3px, then dark runs >= 36pt equivalent (36 * dpi / 72 px); group consecutive rows (thickness <= 4px) into one segment at the centre row;
// vertical the same on columns; returns segments in image pixel coordinates (spec §11 "Scans as forms")
rasterGeometry(ctx, docId: string, pageIndex: number): Promise<Seg[]>; // renders at 150 dpi grey, runs rulingSegments, maps to page space with toPage(pageViewport(geom, 0, 150/72))
```

- [ ] **Step 1: Tests** — a synthetic 150-dpi image with a 3x2 grid of 2px lines yields 4 horizontal + 3 vertical segments at the right coordinates (+-1px); speckle noise does not create segments; `scan-form.pdf` page 1 detection (after OCR text layer from F-5 for labels, or without labels) yields cells; precision >= 0.8 against the flat-form truth for that page (scan quality is lower; threshold stated in the test).
- [ ] **Step 2: Implement; commit** — `feat(pdf-detect): raster ruling detection feeds the cell builder on image-only pages`.

### Task F-7: OCR mode UI and "Run OCR" entry points (needs C, D, E merged)

**Files:**

- Create: `src/pdf/workspace/modes/ocr/{index.ts,Mode.tsx,OcrToolbar.tsx,ConsentCard.tsx,OcrReport.tsx}`, `src/shared/ui/icons/custom/ocr.tsx`, tests `ConsentCard.test.tsx`
- Modify: registries; Annotate (D-5 hint gains "Run OCR" button), Redact report (E-9 rasterised pages gain "Run OCR"), PDF hub card (C-13 gains "Run OCR" when `!hasTextLayer`), workspace settings menu ("Remove OCR data")

**Behaviour (spec §11, §13.3):** manifest `{ id: 'ocr', label: 'OCR', icon: IconModeOcr, shortcut: '9', order: 9 }`. `ConsentCard` (empty state until data is cached): heading "Make this document searchable", language `Select` "Language" (10 options; multi-select up to 3 joined with '+'), text "{Language} OCR data: {size} download (engine + language), stored on this device for next time." (size via `downloadSize`, `formatBytes`), buttons "Download and run" (primary) and "Not now"; nothing is fetched before the click. Download progress: `ProgressOverlay` "Downloading OCR data" (tesseract logger progress) then per-page "Recognising text, page 4 of 37". Toolbar: pages `SegmentedControl` "Pages without text" / "All pages" / "Selected pages", "Run OCR" (`IconOcrScan`), language picker (`IconOcrLanguage`). After run: `OcrReport` inspector (per-page confidence with `StatusDot` warning for < 60%, total words, capped DPI notes), rail badges "Text added" / "Low confidence". Errors: `NETWORK` (message from F-3, action "Try again"), `WORKER_CRASHED` (action "Try again"). Icons: `IconOcrScan`, `IconOcrLanguage`, `IconTextLayer`.

- [ ] **Step 1: Tests** — ConsentCard shows the exact size string for English with SIMD ("English OCR data: 5.5 MB download ..." computed from a fake manifest) and does not call `fetch` before "Download and run".
- [ ] **Step 2: Implement; commit** — `feat(ocr-mode): consent before download, recognition with progress, quality report and Run OCR entry points`.

### Task F-8: OCR e2e, network assertions, visual, P5-F verification

**Files:**

- Create: `test/e2e/ocr.spec.ts`, `test/visual/ocr.visual.ts`
- Modify: `test/e2e/global-setup.ts` (runs `copy-ocr-assets` before warm-up)

- [ ] **Step 1: e2e (spec §17 row F exit):** record every request (`page.on('request')`); open `scan-form.pdf`; OCR mode shows the consent card; "Download and run" with English; wait for the report; Export; in Node, pdf.js text of page 1 contains the expected words from the fixture ("Applicant", "Surname", "Postcode"); assert every recorded request URL has the app origin (no third-party request at all). Second run in the same browser context: the consent card says the data is stored (no language download request: assert no request to `*.traineddata.gz`).
- [ ] **Step 2: Annotate "Run OCR" hint on `scan-form.pdf`** navigates to OCR mode; Redact report button visible for a rasterised page.
- [ ] **Step 3: Visual:** consent card, progress, report — both themes. Gate 1-6 plus `pnpm test:csp`.

## PR boundary F — OCR

| Check                      | Evidence              |
| -------------------------- | --------------------- |
| OCR e2e on `scan-form.pdf` | `ocr.spec.ts` x3      |
| No third-party requests    | request-log assertion |
| CSP clean on every route   | `pnpm test:csp`       |
| Raster ruling detection    | `raster.test.ts`      |

---

# Part P5-G — Polish and success criteria (PR: `feat/p5-g-polish`)

**Scope (spec §17 row G):** icon gallery review (every custom icon at every size, both themes), shortcut sheet, remaining a11y gaps (axe 0), reduced-motion audit, full visual-regression matrix in both themes, perf job in CI, docs (README architecture section, mode-authoring guide, privacy note), dead-code sweep; every spec §1 success criterion verified.

Cut from `master` after every other Part merged.

### Task G-1: Icon gallery review

**Files:**

- Modify: `src/app/gallery/sections/Icons.tsx` (grouped by `custom/<group>` file; each icon at xs..xl on `surface`, `surface-2`, `accent` fill with `accent-ink`), `test/visual/kit-gallery.visual.ts` (one screenshot per icon group per theme)
- Create: `test/icons-grid.test.ts`

- [ ] **Step 1: Grid test** — parse every `custom/*.tsx` icon's JSX children (render with react-dom/server and read path/rect/circle coordinates): all coordinates inside [0, 24], stroke width attribute absent (inherits from the component), `fill` only on icons declared with `{ fill: true }`; each custom icon name appears in the spec §4.7 table or in this plan (Signing group) — a list in the test makes removals deliberate.
- [ ] **Step 2: Review** every custom icon at every size in both themes in the gallery (owner-visible screenshots in the PR); fix optical weight issues found (consistent 1.75 stroke, round caps, 2px corner radius language). Commit — `test(icons): gallery review grid and per-group baselines for every custom icon`.

### Task G-2: Shortcut sheet

**Files:**

- Create: `src/app/shell/ShortcutSheet.tsx` (+ test)
- Modify: `src/app/shell/AppFrame.tsx` (`?` opens it globally; also a "Keyboard shortcuts" item in the top-bar menu and a Mod+K command)

**Behaviour:** `Dialog` titled "Keyboard shortcuts"; sections from `listShortcuts()` grouped by `group` (Global, Workspace, current mode); each row: description + `Kbd`; a filter `SearchInput` "Filter shortcuts"; content reflects the active mode (mode shortcuts registered by ModeHost). All keys rendered by `Kbd` (SVG keys, no glyphs).

- [ ] **Step 1: Test** — `?` opens the sheet (not while typing in an input); rows include "Undo" with Mod+Z; filtering "zoom" leaves zoom rows only. Commit — `feat(app): keyboard shortcut sheet from the hotkey registry`.

### Task G-3: Accessibility sweep

**Files:**

- Modify: any component failing; `test/visual/helpers.ts` (`expectAxeClean` already in every visual test)
- Create: `test/e2e/a11y-keyboard.spec.ts`

- [ ] **Step 1:** Run the full visual suite; fix every axe serious/critical finding (do not disable rules).
- [ ] **Step 2: Keyboard-only e2e** (spec §13.2): open a document, reach the canvas through the skip link "Skip to document", rotate page 2 via the rail (Alt+ArrowDown, R), add a text field via "Add field" + arrows, fill a field with Tab/Enter, open Export with Mod+S and export — without the mouse. Landmarks: exactly one `banner`, `main`; rail and inspector are `complementary` with names. Live region announces "Undid: rotate page 2 clockwise".
- [ ] **Step 3: Forced colours**: `page.emulateMedia({ forcedColors: 'active' })` screenshot of the workspace shows focus outlines (visual baseline `forced-colors.png`, light theme only).
- [ ] **Step 4: Commit** — `fix(a11y): axe clean across the visual suite; keyboard-only workspace flow; forced-colours outlines`.

### Task G-4: Reduced-motion audit

**Files:**

- Create: `test/e2e/reduced-motion.spec.ts`

- [ ] **Step 1:** With `reducedMotion: 'reduce'`: on Home, a hub, the workspace (switch layout with F, open a drawer, open Mod+K, switch modes) collect `getAnimations()` on the document every 50 ms during the interactions: no animation longer than 80 ms and no transform animation; the Logo caret has no running animation; `scroll-behavior` computed `auto`. Without reduced motion, the caret animation exists and stops after 3 iterations.
- [ ] **Step 2: Fix offenders; commit** — `test(motion): reduced-motion audit across shell, hubs and workspace`.

### Task G-5: Full visual matrix

**Files:**

- Modify: `test/visual/*.visual.ts` (complete the matrix)

- [ ] **Step 1:** Ensure the spec §15 matrix exists: Home, each hub template, PDF hub, workspace Standard and Focus for each of the 9 modes with a fixture open, dialogs (Export, Mod+K, password, My details, certificate, sanitise), states (empty, error, loading) — light and dark x desktop 1280x800 and phone 390x844 (tool pages: desktop only); reduced motion forced; dynamic regions masked; threshold 0.2%.
- [ ] **Step 2:** Regenerate missing baselines only (`--update-snapshots=missing`), review, commit. Commit — `test(visual): complete light and dark matrix for desktop and phone`.

### Task G-6: Performance job and budgets

**Files:**

- Create: `.github/workflows/perf.yml` (nightly `schedule` + `workflow_dispatch`), `test/e2e/perf-budgets.spec.ts` (tagged `@perf`), `test/bundle-size.test.ts`

- [ ] **Step 1: Budgets** (spec §14) asserted in `perf-budgets.spec.ts` on `large-300.pdf`: open to first page <= 1500 ms; scroll >= 50 fps; rotate feedback <= 50 ms; export <= 15 s; no long task > 100 ms during scrolling. The nightly job runs `pnpm test:e2e --grep @perf` and uploads `perf.json`; not PR-blocking (spec §15).
- [ ] **Step 2: Bundle size test** (runs after build, PR-blocking): Home route JS (entry chunk + chunks imported by `/` on first load, from the Vite manifest) <= 120 KB gzip; workspace, each mode, tesseract, qpdf and compress are separate lazy chunks (manifest `isDynamicEntry`).
- [ ] **Step 3: Commit** — `ci(perf): nightly workspace performance budgets and a PR-blocking Home bundle budget`.

### Task G-7: Documentation and privacy note

**Files:**

- Modify: `README.md` (architecture section: shell, kit and enforcement rules, workspace document model, workers, modes; how to run lint/tests/visual), `CONTRIBUTING.md` (design-system rules and how to add a kit component first)
- Create: `docs/mode-authoring.md` (how to add a mode: manifest, ModeModule, operations with `defineOperation`, materialisers, checkpoint runners, tests, icons; the append-only registries)
- Modify: `src/app/pages/Home.tsx` footer privacy note and a `PrivacyNote` dialog linked from the footer and the workspace menu: "Your files are processed on this device. Documents you edit are saved only in this browser (you can clear them in settings). Optional network use: OCR language data from this site, and a timestamp server you choose when signing."

- [ ] **Step 1:** Write the docs (no glyphs; markdown lists with `-`). Commit — `docs: architecture, mode authoring guide and privacy note`.

### Task G-8: Dead-code sweep and success-criteria verification

**Files:**

- Modify: anything unused found
- Create: none

- [ ] **Step 1: Sweep:** `pnpm exec tsc -p tsconfig.app.json --noUnusedLocals --noUnusedParameters --noEmit` and fix; `git grep` for exports with no importers in `src/shared` and `src/pdf` (script in the scratchpad listing `export` names and grepping usages); delete dead code; confirm no `src/tools/pdf-{organize,sign,fill-form,watermark,page-numbers,metadata}` and no interim slugs remain.
- [ ] **Step 2: Success criteria (spec §1)** — record evidence for each in the PR description:
  1. 37-page flat form flow without leaving `/pdf/edit`: `fill-sign.spec.ts` (generated 6-page form) plus the private-sample test when the owner provides it.
  2. Every v1 mode end-to-end with reopened outputs: the per-mode e2e specs.
  3. Redaction verification or refusal: `adversarial.test.ts`, `redact.spec.ts`.
  4. 300 pages at >= 50 fps, first page <= 1.5 s: `perf.json` from the nightly job.
  5. Refresh restores document, history and mode: `workspace-organize.spec.ts`.
  6. All 30 tools outside the workspace unchanged under the new shell (G24): `route-table.spec.ts`, `legacy-tools.spec.ts`.
  7. Both themes axe-clean and visual suite green; lint, typecheck, unit, e2e, build green.
  8. Design-system rules zero violations: `pnpm lint`, `dist-glyphs.test.ts`, `no-inline-disable.test.ts`.
- [ ] **Step 3: Gate 1-6 plus `pnpm test:csp`.** Commit — `chore: dead-code sweep; phase 5 success criteria verified`.

## PR boundary G — Polish

| Check                               | Evidence                         |
| ----------------------------------- | -------------------------------- |
| All spec §1 success criteria        | PR description evidence list     |
| axe 0 serious/critical, both themes | visual suite                     |
| Reduced motion audit                | `reduced-motion.spec.ts`         |
| Perf job in CI                      | `perf.yml`                       |
| Docs                                | README, `docs/mode-authoring.md` |

---

## Spec coverage

| Spec section                                               | Plan tasks                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| §1A R1-R4, 1A.1, 1A.2, 1A.3                                | A1-1, A1-2, A1-3, A1-4, A1-5, A1-6, A2-8, A2-11, A2-12                                                        |
| §2 architecture, §2.1 modules, new error codes             | B-1, B-2..B-8, C-3..C-9, E-1..E-7, F-3..F-5, H-1                                                              |
| §3.1 manifest, §3.2 routes, §3.3 removed tools             | A2-1, A2-4, B-14, B-16, C-14, D-9, E-10                                                                       |
| §4.2-4.4 tokens, typography, spacing, motion               | A1-7                                                                                                          |
| §4.5 existing primitives restyled                          | A1-8                                                                                                          |
| §4.6 new primitives                                        | A1-9..A1-14, A2-9, A2-10, B-9..B-11, C-2, D-4, D-5 (ColorSwatchPicker), H-3 (ChoiceGrid), H-6 (CameraCapture) |
| §4.7 icons                                                 | A1-3, A1-4, B-12, B-16, C-2, D-5, D-9, E-9, E-10, E-11, F-7, H-1, G-1                                         |
| §5.1 shell, §5.2 Home, §5.3 hubs and handoff, PDF hub card | A1-11, A2-2..A2-7, A2-13, B-14, C-13                                                                          |
| §6.1 layout                                                | B-13                                                                                                          |
| §6.2 document model, §6.3 preview strategy                 | B-2, B-3, B-9, B-17 (pixel harness), D-10                                                                     |
| §6.4 materialisation and export                            | B-6, B-15, E-6 (remove unreferenced), E-10, E-11, H-11                                                        |
| §6.5 memory limits                                         | B-7 (budget), B-8 (bitmap pixel budget), B-14 (1 GB)                                                          |
| §6.6 autosave                                              | B-7                                                                                                           |
| §6.7 workers                                               | B-6, B-8, F-3, H-4 (photo worker)                                                                             |
| §7 mode contract                                           | B-12                                                                                                          |
| §8 Fill & Sign, detection, My details, fixtures            | C-1..C-14                                                                                                     |
| §9 Annotate and Edit                                       | D-1..D-10                                                                                                     |
| §10 Redact                                                 | E-1..E-9                                                                                                      |
| §11 OCR, CSP                                               | F-1..F-8                                                                                                      |
| §12 opening and encryption                                 | B-14, E-10 (restricted unlock)                                                                                |
| §13 keyboard, a11y, states                                 | A1-9, B-13, G-2, G-3, G-4, per-mode tasks                                                                     |
| §14 performance                                            | B-8, B-11, B-17, G-6                                                                                          |
| §15 testing                                                | every task; visual A1-15, A2-15, B-18, C-14, D-10, E-13, F-8, H-15, G-5                                       |
| §16 legacy migration                                       | A2-1, A2-3, A2-12, A2-13, A2-14, A2-15                                                                        |
| §17 phasing                                                | Parts A1..G and the parallelisation map                                                                       |
| Owner addition Signing+                                    | H-1..H-15                                                                                                     |

## Self-review notes (plan author)

- Placeholder scan: no "TBD"/"TODO"; every task lists files, interfaces and runnable test steps. Where a third-party API detail must be confirmed at task start (pdf.js operator-list layout, pkijs v3 class names, tesseract.js output shape, Rolldown plugin hooks), the task names the exact file to inspect and the expected shape it was written against.
- Type consistency: `Box` (page space) is used by detection, overlays, ops and writers; `Quad` (UL, UR, LL, LR) by annotations and redaction; `InkVector` by pen and tracing; `PageTextItems` by detection, search, text layer and OCR coverage; `SignatureContent` grows by union members only (`image`, `text`, then `ink`, `trace`).
- Ordering inside Parts: A1-9 before A1-8 (ShortcutHint); B-5 before B-6 (draw/pages before materialise); C-3..C-7 before C-9; in Part H the execution order is H-9, H-10, H-11 `cms.ts` only, H-12, rest of H-11, H-13 (H-11's self-verification calls H-12's `verifyPdfSignatures`; H-12's tests build signed fixtures with `createCms` + the H-9 writer directly).
- Security: keys, certificate passwords and Protect passwords are never persisted (G25, H header); the only network calls are same-origin OCR assets after consent and the opt-in TSA request.
