# PDF Workspace & App Redesign (Phase 5) — Design

**Date:** 2026-10-01
**Status:** Draft for owner review
**Builds on:** `2026-10-01-pdf-suite-and-modular-architecture-design.md` (architecture, `ToolError`, `worker-rpc`, `src/pdf` core) and `2026-07-15-terminal-ui-redesign-design.md` (Terminal Precision).
**Baseline assumed:** phase 3 Part C (Protect, Unlock, Metadata, Compressor, encrypted-input flow, `src/pdf/qpdf`, `src/pdf/compress`, `PasswordPrompt`) and phase 4 PRs D/E (styling, file splits, lint 0) have landed on `master`.

---

## 1. Intent

**Owner decisions (binding, summarised; full text in the phase-5 brief)**

| #   | Decision                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **One PDF document workspace.** Open once; every capability is a _mode_ on the open document; edits stack with unlimited undo/redo; local autosave to IndexedDB; one Export with a change summary.                                                                        |
| D2  | **Layout:** _Standard_ (top bar + mode tabs + contextual toolbar + page rail + canvas + optional inspector) and _Focus_ (same tools relocated: dock, palette, drawer, popover). Mod+K in both. Last layout remembered; phones always Focus.                               |
| D3  | **Refined terminal** visual direction: Inter UI text, mono meta, `~/tools` caret wordmark, single mint accent, light **and** dark, WCAG AA, reduced motion. Becomes the kit's tokens app-wide.                                                                            |
| D4  | **Clean-break IA:** `/` home by category, `/<category>` hubs (one hub layout), `/pdf` hub with quick tasks, `/pdf/edit` workspace, every tool at `/<category>/<slug>`. No redirects, no shims; old dashboard and old per-tool PDF pages removed.                          |
| D5  | **v1 modes:** Organize, Edit, Annotate, Fill & Sign (incl. flat-form detection), Redact, Convert, Protect, Optimize, OCR. Compare deferred.                                                                                                                               |
| D6  | **Engineering:** keep modularity (thin tools, logic in `src/pdf/*`, UI from `src/shared/ui`, workers via `worker-rpc`, state via store-kit/`useJob`), keep the `ToolError` model (nothing faked, no silent failures), everything composed from a beautiful, reusable kit. |

**Success criteria**

1. A user can open a 37-page flat (fieldless) Word-exported form, see detected fields highlighted, fill it with Tab + "My details", sign it and export — without leaving `/pdf/edit`.
2. Every v1 mode works end-to-end on the fixture corpus; outputs are re-opened and verified in tests (no simulated output).
3. Redaction output passes automated verification (no glyphs, image pixels or annotations inside redacted areas; search terms absent) or the export is refused.
4. A 300-page document scrolls at ≥ 50 fps on a mid-range laptop; first page visible ≤ 1.5 s after drop (20 MB fixture).
5. Refreshing the tab mid-edit restores the document, the full undo history and the current mode.
6. All 30 non-PDF tools run under the new shell, hub and tokens with unchanged behaviour.
7. Both themes pass axe (0 serious/critical) and the Playwright visual suite; lint, typecheck, unit, e2e and build pass in CI.
8. The design-system rules in §1A hold with **zero violations** in CI: every icon comes from `src/shared/ui/icons` (no `lucide-react` import elsewhere), every visual element comes from `src/shared/ui`, and no emoji, pictographic, dingbat, arrow or box-drawing glyph appears in source strings, JSX text or built assets.

**Revisions to earlier specs**

| Earlier statement                                               | Now                                                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Existing tool IDs and URLs are preserved" (suite §1)           | **IDs** preserved (so `tool:<id>` stores and `favoriteTools` keep working); **URLs** change, no redirects. |
| "Documents, bytes and results are never persisted" (suite §3.4) | Exception: the open workspace document is autosaved to IndexedDB (local only, clearable, §6.6).            |
| OCR and redaction out of scope (suite §10)                      | In scope (§9, §10).                                                                                        |
| Dark-only, lime `#a3e635` (terminal §Locked decisions)          | Light + dark, mint accent (§4).                                                                            |
| 14 standalone PDF tools (suite §4)                              | 8 quick tasks + workspace modes (§3.3).                                                                    |
| "No network" (implicit)                                         | One exception: OCR language data, **same-origin**, lazily fetched, size stated before download (§11).      |

---

## 1A. Design-system rules (enforced)

These rules are **binding** (owner) and enforced by CI. They apply to everything in `src/` and to anything the product renders.

| #   | Rule                                           | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Enforced by                                                    |
| --- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| R1  | **SVG icons only, from one module**            | All icons come from `src/shared/ui/icons`: lucide icons re-exported through a wrapper, plus custom-drawn SVG icon components where lucide has nothing suitable (§4.7). Every icon is a named React component with the same `IconProps` (`size`, `strokeWidth`, `label`). Without `label` it renders `aria-hidden="true"`; with `label` it renders `role="img"` + `aria-label`. The `~/tools` wordmark is an SVG `Logo` component (caret included). Manifests and modes type their icon as `IconComponent` from the kit, not `LucideIcon`.                                                                                           | ESLint `local/no-lucide-outside-icons` (c)                     |
| R2  | **No hand-rolled UI, ever**                    | Every visual element comes from `src/shared/ui`. If a need is not covered, a kit component is created first (with tests and a gallery entry) and then reused. Tools, modes, `src/pdf/components` and `src/pdf/workspace` compose kit components only. Third-party visual libraries (Plotly, React Flow, Rive, QR code, code editor, pdf.js text layer, sonner) are reached only through kit adapters (§4.6).                                                                                                                                                                                                                        | ESLint `local/no-raw-ui-outside-kit` (b)                       |
| R3  | **No ASCII art, emoji or pictographic glyphs** | No emoji, and no pictographic, dingbat, arrow, geometric-shape, box-drawing or technical-symbol glyphs, in UI text, labels, toasts, empty states, in-app help, op labels, export summaries, or product-authored fixtures (demo documents, gallery samples, visual baselines). Examples banned: check marks, triangles, Command-key symbol, arrows, stars, bullets/dots, emoji. Use SVG icons; keyboard keys render through `Kbd`, which draws modifier and arrow keys as SVG icons and letters as text. Separators (breadcrumb, meta lists) are kit elements (`Breadcrumb` chevron icon, `MetaList` dot element), never characters. | ESLint `local/no-pictographic-text` (a) + built-asset scan (d) |
| R4  | **CI enforcement**                             | Local ESLint plugin `eslint-rules/` (wired as `local/*` in `eslint.config.js`), all rules at `error`, no inline disables permitted for these rules (`--report-unused-disable-directives` + a rule that rejects `eslint-disable` comments naming them).                                                                                                                                                                                                                                                                                                                                                                              | `pnpm lint`, `pnpm test` in CI                                 |

### 1A.1 Lint rules (`eslint-rules/`)

| Rule                                | Scope                                    | Fails on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (a) `local/no-pictographic-text`    | all of `src/**/*.{ts,tsx}`               | Any banned code point in JSX text, JSX attribute strings, string literals, template-literal quasis and regex literals. Banned set: `\p{Extended_Pictographic}`, `\p{Emoji_Presentation}`, U+FE0F, U+20E3, regional indicators U+1F1E6–1F1FF, Arrows U+2190–21FF, Misc Technical U+2300–23FF, Box Drawing U+2500–257F, Block Elements U+2580–259F, Geometric Shapes U+25A0–25FF, Misc Symbols U+2600–26FF, Dingbats U+2700–27BF, Supplemental Arrows U+27F0–27FF and U+2900–297F, Misc Symbols and Arrows U+2B00–2BFF, bullets U+2022/2023/2043, angle quotes U+2039/203A. **No allow-list.** Code that must recognise such characters in third-party PDFs (e.g. checkbox glyph detection, §8.3) uses numeric code points (`0x2610`), never literals. Comments are not checked. |
| (b) `local/no-raw-ui-outside-kit`   | `src/**` except `src/shared/ui/**`       | JSX intrinsic elements `button`, `input`, `select`, `textarea`, `svg` (and any SVG child element), `img`, `canvas`, `video`, `audio`, `iframe`; any `style` prop. Data-driven geometry (e.g. positioning in page coordinates) goes through kit primitives that accept typed props (`Positioned`, `OverlayLayer`, `BitmapCanvas`…, §4.6), which own the `style` usage internally.                                                                                                                                                                                                                                                                                                                                                                                               |
| (c) `local/no-lucide-outside-icons` | `src/**` except `src/shared/ui/icons/**` | Any import or dynamic import of `lucide-react` (including deep paths).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `local/no-disable-enforced`         | all                                      | `eslint-disable*` comments that name any of the rules above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Each rule ships with `RuleTester` unit tests (valid/invalid cases, including tricky ones: emoji in template literals, `String.fromCodePoint` allowed, `<svg>` via `React.createElement('svg')` also caught, `lucide-react/dist/esm/icons/x` caught).

### 1A.2 Built-asset scan (d)

`test/dist-glyphs.test.ts` runs after `pnpm build` in CI: scans every `dist/**/*.{js,css,html,json,svg}` for `\p{Emoji_Presentation}`, U+FE0F and regional indicators (all chunks, vendor included), and for the full rule-(a) set in app-owned chunks and CSS (identified via the Vite manifest / sourcemap module ids). Hits print file, offset and originating module; any hit fails. A vendor hit is fixed by replacing or wrapping the dependency, never by an exemption list. CSS `content:` values are covered by this scan.

### 1A.3 Legacy migration

Existing violations are fixed, not exempted (phase 4 PRs D/E remove part of them already):

1. P5-A1 lands the icon module, `Logo`, `Kbd`, and rules (a), (c), (d) at `error` repo-wide, fixing every hit: lucide imports in all manifests and tools move to `@/shared/ui/icons`; glyph literals (e.g. favourites stars, arrows in button labels, check marks in copy confirmations, bullets in lists) are replaced by icons or wording.
2. P5-A2 lands rule (b) at `error` repo-wide together with the kit adapters, fixing every raw element and inline style in the 30 legacy tools, `src/app`, `src/pdf/components` (e.g. `PageThumb` canvas moves to kit `BitmapCanvas`, `upright-jpeg` previews to kit `Image`) and the remaining PDF quick tasks. CSS modules left in tools (`DataNode.module.css`, `CustomNode.module.css`, `LivePreview.module.css`) are deleted in favour of kit components.
3. No phase-5 PR after A2 may merge with a violation; there is no baseline file.

---

## 2. Architecture overview

```
eslint-rules/            local ESLint plugin: no-pictographic-text, no-raw-ui-outside-kit, no-lucide-outside-icons, no-disable-enforced (§1A)
src/
  app/                   router, registry, categories, AppShell wiring, Home, Hub, NotFound, boundaries
  theme/tokens.css       design tokens (replaces theme/terminal.css)
  shared/
    ui/                  kit (existing primitives restyled + new primitives §4.6); the ONLY home of raw elements/styles (R2)
      icons/             the ONLY icon source (R1): lucide wrapper re-exports + custom SVG icons + Logo (§4.7)
      adapters/          kit wrappers for third-party visual libraries (Plotly, React Flow, Rive, QR, code editor, pdf.js text layer)
    lib/                 + storage.ts (IndexedDB helper), hotkeys.ts, theme.ts
    state/               createToolStore, useJob (unchanged API)
  pdf/
    render/              pdf.js worker (+ operator-list geometry, text-layer helpers, annotations read)
    edit/                pure pdf-lib ops (existing) + annot/, content/ (new, §2.1)
    qpdf/  compress/     unchanged (phase 3)
    doc/                 NEW document model: op log, page map, materialise, checkpoints, autosave (no React)
    detect/              NEW flat-form detection (pure; runs in render worker)
    redact/              NEW redaction apply + verify (pure; runs in edit worker)
    ocr/                 NEW tesseract.js worker client + text-layer writer
    sign/                signature lib moved from tools/pdf-sign/lib (stroke, pixels, placement, fonts)
    components/          existing PDF components (PageThumb, PageGrid, JobPanel, PasswordPrompt…)
    workspace/           NEW React workspace: WorkspaceShell, DocumentCanvas, PageRail, ModeHost, ExportDialog
      modes/<mode-id>/   thin mode UI (toolbar, inspector, overlay, commands) per §7
  tools/<id>/            manifest + Tool.tsx (quick tasks, workspace entry, the 30 non-PDF tools)
```

### 2.1 New `src/pdf` modules

| Module                    | Responsibility                                                                                                                                  | Runs in                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `pdf/doc`                 | `OpenDocument`, op log, cursor, page map, op registry, `materialize()`, checkpoints, change summary, autosave serialiser.                       | main (model) + edit worker (materialise) |
| `pdf/edit/annot`          | Writers for standard annotation dicts + appearance streams (Highlight, Underline, StrikeOut, Text, FreeText, Ink, Square, Circle, Line, Stamp). | edit worker                              |
| `pdf/edit/content`        | Full content-stream lexer/parser/serialiser + graphics/text-state interpreter with glyph positioning (grows from `compress/content-ops`).       | edit worker                              |
| `pdf/edit/edit.worker.ts` | NEW `worker-rpc` worker hosting `materialize`, `applyCheckpoint`, redaction and annotation writing (pdf-lib off the main thread).               | worker                                   |
| `pdf/detect`              | Geometry extraction from pdf.js operator lists, cell reconstruction, field classification (§8).                                                 | render worker                            |
| `pdf/redact`              | Redaction planning, content filtering, image patching, rasterise fallback, verification (§10).                                                  | edit worker                              |
| `pdf/ocr`                 | tesseract.js scheduler, word boxes -> invisible text layer (§11).                                                                               | OCR worker(s)                            |

`ToolError` gains three codes (extension, not a new model): `STORAGE_FULL` (IndexedDB quota), `VERIFICATION_FAILED` (redaction or export self-check failed), `NETWORK` (OCR asset fetch failed). All carry user-facing messages.

---

## 3. Information architecture & routes

### 3.1 Manifest changes

```ts
defineTool({
  id: 'regex-tester',              // unchanged; equals folder name
  slug: 'regex',                   // NEW: URL segment within the category
  category: 'text',
  kind: 'tool',                    // NEW: 'tool' | 'quick-task' | 'workspace'
  keywords: ['regexp', 'pattern'], // NEW: Mod+K / search
  accepts?: [{ kinds: ['csv','tsv','text'], multiple: false }], // NEW: hub drop routing
  alsoIn?: ['security'],           // NEW: cross-list on another hub (link only)
  icon: IconFileText,              // IconComponent from @/shared/ui/icons (R1), not LucideIcon
  …name, description, version, isNew, enabled, load
});
```

- Route = `/${category}/${slug}`. Registry validates `(category, slug)` uniqueness, that slugs are kebab-case, and that `slug` does not collide with reserved segments (`edit` is reserved under `pdf`).
- `src/app/categories.ts` holds the typed category table: `{ id, label, icon, blurb, order, fileBased }`. Home and hubs are generated from it plus the registry.

### 3.2 Route table

| Route                    | Page              | Tool id (folder)        | Notes                                                               |
| ------------------------ | ----------------- | ----------------------- | ------------------------------------------------------------------- |
| `/`                      | Home              | —                       | §5.1                                                                |
| `/pdf`                   | PDF hub           | —                       | §5.3                                                                |
| `/pdf/edit/:mode?`       | Workspace         | `pdf-edit` (new)        | `?doc=<id>` reopens a recent document; `:mode` = mode id            |
| `/pdf/merge`             | Quick task        | `pdf-merger`            |                                                                     |
| `/pdf/split`             | Quick task        | `pdf-splitter`          |                                                                     |
| `/pdf/compress`          | Quick task        | `pdf-compressor`        |                                                                     |
| `/pdf/images-to-pdf`     | Quick task        | `images-to-pdf`         |                                                                     |
| `/pdf/to-images`         | Quick task        | `pdf-to-images`         |                                                                     |
| `/pdf/to-text`           | Quick task        | `pdf-to-text`           |                                                                     |
| `/pdf/protect`           | Quick task        | `pdf-protect`           | `alsoIn: ['security']`                                              |
| `/pdf/unlock`            | Quick task        | `pdf-unlock`            | `alsoIn: ['security']`                                              |
| `/text`                  | Hub               | —                       | file-based (text files)                                             |
| `/text/regex`            | Tool              | `regex-tester`          |                                                                     |
| `/text/diff`             | Tool              | `text-diff-checker`     | accepts 2 text files                                                |
| `/text/logs`             | Tool              | `log-parser`            | accepts `.log`/text                                                 |
| `/data`                  | Hub               | —                       | file-based                                                          |
| `/data/csv`              | Tool              | `csv-viewer`            | accepts csv/tsv                                                     |
| `/data/json-xml`         | Tool              | `json-and-xml-viewer`   | accepts json/xml                                                    |
| `/data/random`           | Tool              | `random-data-generator` |                                                                     |
| `/encoding`              | Hub               | —                       |                                                                     |
| `/encoding/base64`       | Tool              | `base64-converter`      | accepts any file                                                    |
| `/encoding/jwt`          | Tool              | `jwt-decode`            |                                                                     |
| `/encoding/url`          | Tool              | `url-encoder-decoder`   |                                                                     |
| `/web`                   | Hub ("Web & dev") | —                       |                                                                     |
| `/web/api-request`       | Tool              | `api-request`           |                                                                     |
| `/web/qr`                | Tool              | `qr-code-generator`     |                                                                     |
| `/web/url-parser`        | Tool              | `url-parser`            |                                                                     |
| `/media`                 | Hub               | —                       | file-based (images, .riv)                                           |
| `/media/image-optimizer` | Tool              | `image-optimizer`       | accepts png/jpeg/webp/gif                                           |
| `/media/color`           | Tool              | `color-tester`          |                                                                     |
| `/media/rive`            | Tool              | `rive-animation-player` | accepts `.riv`                                                      |
| `/security`              | Hub               | —                       | also lists Protect/Unlock PDF                                       |
| `/security/hash`         | Tool              | `hash-generator`        | accepts any file                                                    |
| `/security/password`     | Tool              | `password-generator`    |                                                                     |
| `/math`                  | Hub               | —                       |                                                                     |
| `/math/calculator`       | Tool              | `calculator`            |                                                                     |
| `/math/number-base`      | Tool              | `number-converter`      |                                                                     |
| `/math/units`            | Tool              | `unit-converter`        |                                                                     |
| `/time`                  | Hub               | —                       |                                                                     |
| `/time/date`             | Tool              | `date-calculator`       |                                                                     |
| `/time/pomodoro`         | Tool              | `pomodoro`              |                                                                     |
| `*`                      | Not found         | —                       | "No page at `/x`" + search field over the registry + category links |

### 3.3 Removed / folded PDF tools

| Removed folder     | Lives on as               | Logic moves to                                                     |
| ------------------ | ------------------------- | ------------------------------------------------------------------ |
| `pdf-organize`     | Organize mode             | `lib/edits` -> `pdf/doc/page-map.ts`                               |
| `pdf-page-numbers` | Edit mode / Page numbers  | already `pdf/edit/markup.ts`                                       |
| `pdf-watermark`    | Edit mode / Watermark     | already `pdf/edit/markup.ts`                                       |
| `pdf-sign`         | Fill & Sign / Signature   | `lib/*` -> `pdf/sign/`; components -> `workspace/modes/fill-sign/` |
| `pdf-fill-form`    | Fill & Sign / Form fields | `lib/values` -> `pdf/edit/forms.ts`; `FieldControl` -> mode        |
| `pdf-metadata`     | Protect mode / Metadata   | already `pdf/edit/metadata.ts`                                     |

Old `Dashboard.tsx`, `ToolLayout.tsx`, `AnimatedBackground.tsx` and `theme/terminal.css` are deleted. Their e2e specs are rewritten against the new routes.

---

## 4. Design system — "Refined terminal"

### 4.1 Principles

Calm surfaces, one accent, mono only where it carries meaning (paths, sizes, counts, shortcuts, labels), generous whitespace, hierarchy by weight and tone rather than borders. The document is the hero in the workspace; chrome recedes.

### 4.2 Colour roles

Tokens are CSS variables on `:root[data-theme]`, exposed to Tailwind v4 through `@theme inline`. `data-theme` is `light | dark`, resolved from the stored preference `system | light | dark` by an inline script in `index.html` before first paint (no flash).

| Role                | Dark                    | Light                   | Use                                                               |
| ------------------- | ----------------------- | ----------------------- | ----------------------------------------------------------------- |
| `canvas`            | `#0c0e12`               | `#f6f7f9`               | app background                                                    |
| `surface`           | `#12151b`               | `#ffffff`               | cards, bars, panels                                               |
| `surface-2`         | `#171b22`               | `#f1f3f6`               | hover, inputs, rail                                               |
| `surface-3`         | `#1e232c`               | `#e7eaef`               | pressed, selected rows                                            |
| `backdrop`          | `#08090c`               | `#e4e7ec`               | document canvas behind pages                                      |
| `line`              | `#232934`               | `#e0e4ea`               | hairlines                                                         |
| `line-strong`       | `#2f3643`               | `#cbd2dc`               | inputs, focusable outlines                                        |
| `fg`                | `#e8ebf0`               | `#0f1419`               | primary text                                                      |
| `fg-muted`          | `#a3abba`               | `#4a5363`               | secondary text (≥ 7:1 dark, ≥ 7:1 light)                          |
| `fg-subtle`         | `#7f8898`               | `#687182`               | meta, placeholders (≥ 4.5:1 on `surface`)                         |
| `accent`            | `#3ddc97`               | `#3ddc97`               | fills: primary button, active tab indicator, selection            |
| `accent-ink`        | `#04140c`               | `#04140c`               | text/icons on `accent` fills (≥ 10:1)                             |
| `accent-fg`         | `#3ddc97`               | `#0b7f53`               | accent **text/icons** on surfaces (light uses darker mint for AA) |
| `accent-soft`       | `#3ddc971f`             | `#3ddc9726`             | tinted backgrounds, detected-field fill                           |
| `focus`             | `#3ddc97`               | `#0b7f53`               | 2px focus ring + 2px offset                                       |
| `danger` / `-soft`  | `#f87171` / `#f871711f` | `#c62828` / `#c628281a` | errors, destructive                                               |
| `warning` / `-soft` | `#fbbf24` / `#fbbf241f` | `#a15c00` / `#a15c001a` | rasterised notice, large file                                     |
| `info` / `-soft`    | `#60a5fa` / `#60a5fa1f` | `#1d5fc4` / `#1d5fc41a` | hints, suggested (low-confidence) fields                          |
| `redact`            | `#ef4444`               | `#dc2626`               | redaction-mark outline (preview only)                             |

Success uses `accent-fg`. Every pair used for text is checked by a unit test (`tokens.contrast.test.ts`) computing WCAG ratios from the token file.

### 4.3 Typography

| Token                    | Value                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `font-sans`              | Inter Variable (self-hosted `@fontsource-variable/inter`), system fallback                                |
| `font-mono`              | JetBrains Mono Variable (self-hosted, OFL), `ui-monospace` fallback                                       |
| Scale (px / line-height) | `xs 12/16` · `sm 13/18` · `base 14/20` · `md 16/24` · `lg 18/26` · `xl 22/28` · `2xl 28/34` · `3xl 36/42` |
| Weights                  | 400 body · 500 UI labels · 600 headings · mono 450                                                        |
| Mono uses                | breadcrumb path, wordmark, sizes/counts, Kbd, badges, section labels, page numbers                        |

Wordmark: the SVG `Logo` component (`~/tools` drawn as mono outlines with a mint block caret; variants `full`, `mark` for favicon/app icon, `mono` for print). The caret blinks only when motion is allowed and stops after 3 blinks. No text-rendered wordmark.

### 4.4 Spacing, radii, elevation, motion

| Token       | Values                                                                                                                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Space       | 4px base: `0.5=2 1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64`                                                                                                                                                                                |
| Radii       | `sm 4` (badges, Kbd) · `md 6` (inputs, buttons) · `lg 10` (cards, panels) · `xl 14` (dock, palette, dialogs) · `full`                                                                                                                               |
| Elevation   | `e0` flat · `e1` hairline + 0 1 2 (cards) · `e2` 0 4 12 (popovers, inspector) · `e3` 0 12 32 (dock, palette, dialogs) · `page` (document pages). Dark uses lower-alpha black + a 1px `line` ring; light uses soft neutral shadows.                  |
| Motion      | `fast 120ms` (hover, press) · `base 180ms` (popover, tab indicator) · `slow 260ms` (drawer, layout switch); easing `cubic-bezier(.2,.8,.2,1)`. `prefers-reduced-motion`: transforms removed, opacity fades ≤ 80ms, caret static, smooth scroll off. |
| Z-index     | `rail 10 · toolbar 20 · dock 30 · popover 40 · dialog 50 · toast 60 · palette 70`                                                                                                                                                                   |
| Breakpoints | `sm 640 · md 900 · lg 1200 · xl 1600`; workspace is Focus-only below `md`.                                                                                                                                                                          |

### 4.5 Existing kit primitives

All current `src/shared/ui` primitives keep their APIs and are restyled to the tokens (Button, IconButton, Card, Badge, Alert, Input, Select, Tabs, Dialog, Drawer, DropdownMenu, Tooltip, Switch/Checkbox/Slider, Table, FileUpload, EmptyState…). `Button` gains `variant: 'primary' | 'secondary' | 'ghost' | 'danger'` and `size: 'sm' | 'md' | 'lg'` consistently; `Tooltip` gains a `shortcut` prop rendering `Kbd`.

### 4.6 New kit primitives

| Component                                                                                 | Responsibility                                                                                                                                                                                        | Key a11y                                        |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `AppShell`                                                                                | Top bar slot, main, optional side regions; skip link; theme + layout context.                                                                                                                         | landmarks, skip-to-content                      |
| `TopBar`, `Breadcrumb`                                                                    | Wordmark, mono path segments `~/tools` / `pdf` / `edit` separated by the `ChevronRight` icon (never a character), right-side action slot.                                                             | `nav[aria-label=Breadcrumb]`                    |
| `CommandPalette`                                                                          | Mod+K dialog; fuzzy search over a command source registry (tools, modes, actions, `p 12`); recent commands; groups.                                                                                   | combobox + listbox, focus trap                  |
| `ModeTabs`                                                                                | Horizontal tabs with icon + label + shortcut, overflow into "More". Same data drives `FloatingDock`.                                                                                                  | `tablist`, arrow keys                           |
| `Toolbar`, `ToolbarGroup`, `ToolButton`                                                   | Contextual tool row; toggles, split buttons, separators. Same data drives `FloatingPalette`.                                                                                                          | `role=toolbar`, roving tabindex                 |
| `FloatingDock`                                                                            | Bottom-centre pill of mode buttons (Focus); larger targets on phones.                                                                                                                                 | `tablist`                                       |
| `FloatingPalette`                                                                         | Draggable vertical tool palette (Focus); snaps to left/right edge.                                                                                                                                    | `toolbar`, Alt+Arrow moves it                   |
| `SidePanel` / `Drawer`                                                                    | Docked panel (Standard) or slide-over drawer (Focus/phone).                                                                                                                                           | `dialog` when modal                             |
| `Inspector`                                                                               | Right panel of property sections; in Focus renders as `Popover` anchored to the selection.                                                                                                            | labelled sections                               |
| `Popover`                                                                                 | Anchored floating surface with collision handling (hand-rolled, no Radix).                                                                                                                            | `Esc`, focus return                             |
| `PageRail`                                                                                | Virtualised vertical thumbnail list; selection, drag reorder (detent), page labels, badges (filled/redacted).                                                                                         | listbox, Alt+Arrow reorder                      |
| `DocumentViewport`                                                                        | Scroll container with zoom (fit width/page, 25–800%), virtualised page slots, overlay layer slots, pinch/ctrl-wheel.                                                                                  | `region`, zoom announced                        |
| `HubLayout`                                                                               | Hub header (icon, title, blurb), optional `DropZone`, grouped `ToolCard` grid.                                                                                                                        | headings hierarchy                              |
| `CategoryCard`, `ToolCard`                                                                | Card with icon, title, count/description, favourite toggle (`IconStar` outline/filled).                                                                                                               | whole card is one link; star is separate button |
| `DropZone`                                                                                | Variants `hero` (home/hub), `inline`, `fullscreen` (window-level drag overlay); kind sniffing via `detectKind`.                                                                                       | keyboard "Choose files" button                  |
| `Toast` (sonner theme)                                                                    | Success/error/info + action button ("Undo", "Open in workspace").                                                                                                                                     | `status`/`alert` live regions                   |
| `EmptyState`, `ErrorState`, `LoadingState`                                                | Unified states; `ErrorState` takes a `ToolError` and renders message + recovery actions.                                                                                                              | `role=alert` for errors                         |
| `Kbd`, `ShortcutHint`                                                                     | Platform-aware keys: modifier/arrow/enter/backspace keys drawn as SVG key icons (`KeyCommand`, `KeyShift`, `KeyOption`, `KeyControl`, `KeyEnter`, `KeyBackspace`, `KeyArrow*`), letters as mono text. | `aria-hidden` decorative + text alternative     |
| `SegmentedControl`                                                                        | 2–5 exclusive options (theme, presets).                                                                                                                                                               | radiogroup                                      |
| `ColorSwatchPicker`                                                                       | Fixed annotation palettes + custom hex.                                                                                                                                                               | radiogroup                                      |
| `ProgressOverlay`                                                                         | Blocking progress for checkpoints/export with cancel (wraps `useJob`).                                                                                                                                | `progressbar`                                   |
| `MetaList`                                                                                | Inline list of meta values with a kit separator element (replaces middle-dot/bullet characters).                                                                                                      | `ul` semantics                                  |
| `Icon*`, `Logo`                                                                           | §4.7.                                                                                                                                                                                                 | R1 label handling                               |
| `BitmapCanvas`                                                                            | Draws an `ImageBitmap` (page renders, thumbnails, tiles); owns the `<canvas>` element.                                                                                                                | `role=img` + label                              |
| `Image`                                                                                   | Object-URL-safe `<img>` (revokes on unmount), fit/aspect props.                                                                                                                                       | required `alt` or `decorative`                  |
| `Positioned`, `OverlayLayer`                                                              | Absolutely positioned layer and children in a given coordinate space (PDF points to CSS px via a transform prop); the only sanctioned home of data-driven `style`.                                    | pointer + keyboard pass-through                 |
| `ShapeLayer`                                                                              | Kit SVG renderer for overlay shapes: rect, ellipse, line, arrow (SVG marker), polyline/ink, quad highlights, hatching; token colours or validated hex.                                                | `aria-hidden`; semantic twin via `HitArea`      |
| `SelectionFrame`, `HitArea`                                                               | Selection outline with resize/rotate handles; focusable hit target with accessible name for overlay objects and detected fields.                                                                      | button semantics, arrow nudge                   |
| `FieldBox`                                                                                | Detected/AcroForm field visual (states: field, suggested, filled, focused, error) + inline editor slot.                                                                                               | form-control labelling                          |
| `SignaturePad`                                                                            | Pointer drawing surface (owns its canvas), undo stroke, clear; emits strokes.                                                                                                                         | keyboard alternative: Type/Upload tabs          |
| `Swatch`, `StatusDot`                                                                     | Colour chip; status indicator dot (replaces dot characters).                                                                                                                                          | text label required                             |
| Adapters: `Chart`, `FlowCanvas`, `RivePlayer`, `QrCode`, `CodeEditor`, `PdfTextLayerHost` | Wrap Plotly, React Flow, Rive, qrcode.react, react-textarea-code-editor and the pdf.js `TextLayer` DOM; apply tokens and theme switching.                                                             | per library                                     |

Rules (R2): tools, modes, `src/pdf/components` and `src/pdf/workspace` contain no raw interactive/media elements, no inline styles and no bespoke design CSS; layout-only Tailwind classes on kit layout primitives are allowed. A missing capability means a new kit component first, then reuse.

### 4.7 Icons (`src/shared/ui/icons`)

```ts
export interface IconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // 12 · 14 · 18 · 20 · 24 px
  strokeWidth?: 1.5 | 1.75 | 2; // default 1.75
  label?: string; // absent: aria-hidden; present: role=img + aria-label
  className?: string;
}
export type IconComponent = (props: IconProps) => JSX.Element;
export const IconFileText = fromLucide(FileText); // wrapper applies the defaults above, currentColor
```

- Naming: `Icon<Name>` for every icon; lucide-backed and custom icons are indistinguishable to consumers. One barrel of named, tree-shakeable exports.
- Custom icons are drawn on lucide's 24px grid with matching stroke, round caps/joins and optical weight, stored as TSX components (no runtime SVG loading), and reviewed in the kit gallery at every size in both themes.

**Custom icons required (lucide has nothing suitable):**

| Group              | Icons                                                                                                                                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand              | `Logo` (full wordmark with caret), `LogoMark` (caret tile: favicon, app icon, OG image source)                                                                                                                                                                                                                |
| Modes              | `IconModeOrganize`, `IconModeEdit`, `IconModeAnnotate`, `IconModeFillSign`, `IconModeRedact`, `IconModeConvert`, `IconModeProtect`, `IconModeOptimize`, `IconModeOcr` (one family: document outline + mode mark)                                                                                              |
| Redact             | `IconRedactArea`, `IconRedactSearch`, `IconRedactApply`, `IconRedactVerified`, `IconRasterised`                                                                                                                                                                                                               |
| OCR                | `IconOcrScan`, `IconOcrLanguage`, `IconTextLayer`                                                                                                                                                                                                                                                             |
| Fill & Sign        | `IconFlatFormDetect`, `IconMakeFillable`, `IconFieldText`, `IconFieldTick`, `IconFieldCross`, `IconFieldDate`, `IconFieldSignature`, `IconFieldSuggested`, `IconSnapToCell`, `IconNextField`, `IconMyDetails`, `IconFlatten`, `IconSignatureDraw`, `IconSignatureType`, `IconSignatureUpload`, `IconInitials` |
| Annotate           | `IconSquiggly`, `IconTextComment`, `IconArrowAnnot`, `IconStampPreset`                                                                                                                                                                                                                                        |
| Edit               | `IconCoverReplace`, `IconHeaderFooter`, `IconPageNumbers`, `IconWatermark`                                                                                                                                                                                                                                    |
| Organize           | `IconInsertBlankPage`, `IconDuplicatePage`, `IconExtractPages`, `IconSplitAt`, `IconMergeIn`, `IconCropPage`, `IconPageLabel`, `IconRotatePageCw`, `IconRotatePageCcw`                                                                                                                                        |
| Optimize / Protect | `IconLinearize`, `IconRepair`, `IconSizeBreakdown`, `IconSanitize`, `IconPermissions`                                                                                                                                                                                                                         |
| Layout             | `IconLayoutStandard`, `IconLayoutFocus`, `IconDock`, `IconRailToggle`, `IconInspectorToggle`, `IconZoomFitWidth`, `IconZoomFitPage`                                                                                                                                                                           |
| Keys (for `Kbd`)   | `KeyCommand`, `KeyShift`, `KeyOption`, `KeyControl`, `KeyEnter`, `KeyBackspace`, `KeyTab`, `KeyEscape`, `KeyArrowUp`, `KeyArrowDown`, `KeyArrowLeft`, `KeyArrowRight`                                                                                                                                         |
| Categories         | lucide-backed where suitable; custom `IconCategoryEncoding` and `IconCategoryWebDev` if review finds the lucide options ambiguous                                                                                                                                                                             |

Everything else (undo, redo, search, star, chevrons, arrows, close, menu, highlighter, underline, strikethrough, sticky note, pen, shapes, lock, unlock, download, upload, sun/moon/monitor, check, alert, info) is lucide, re-exported via `fromLucide`.

---

## 5. App shell, home & hubs

### 5.1 Shell & navigation

- `AppShell` wraps every route. Top bar: wordmark (-> `/`), breadcrumb, Mod+K button with `Kbd`, theme `SegmentedControl` in a menu, page-specific actions slot.
- Mod+K is global; command sources register via `useCommands(source)` (routes, tools, favourites, recent docs, and the active workspace's mode commands).
- `/` key focuses search on Home/hubs; `?` opens the shortcut sheet.

### 5.2 Home `/`

| Region             | Content                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Hero               | Wordmark line, one-sentence promise ("Free, private tools. Nothing leaves your browser."), search (opens Mod+K). |
| PDF workspace card | Large card with its own `DropZone hero`; drop follows the PDF hub routing rules (§5.3).                          |
| Recent documents   | Up to 6 autosaved workspace docs (thumbnail, name, pages, "edited 2h ago", remove). Hidden when empty.           |
| Favourites         | `ToolCard`s for starred tools (`favoriteTools` key, ids unchanged).                                              |
| Categories         | `CategoryCard` per category from `categories.ts` (icon, label, tool count, 3 top tool names), ordered.           |
| Footer             | Version/build info (existing `footerUtils`), privacy note, theme switch.                                         |

### 5.3 Category hubs `/<category>` (one `HubLayout`)

- Header, then tools grouped (`groups` in category table, else alphabetical), cross-listed tools (`alsoIn`) shown with a small "pdf" tag.
- File-based hubs show a `DropZone`; routing uses manifests' `accepts`: exactly one matching tool -> navigate with the files handed off; several -> a chooser `Popover`; none -> inline error `INVALID_FILE` naming accepted kinds.
- **File handoff:** `shared/lib/handoff.ts` keeps `File[]` in memory under a one-time id; target tool reads `?handoff=<id>` once. Not persisted.

**PDF hub `/pdf`**

| Region                 | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drop zone              | 1 PDF -> `/pdf/edit` (opens doc); ≥ 2 PDFs -> `/pdf/merge`; images -> `/pdf/images-to-pdf`; mixed PDFs + images -> Merge with images converted (asks first).                                                                                                                                                                                                                                                                                                                                                                                          |
| Detected-document card | After a single drop, before navigating, a 300–800 ms probe (render worker `open` + `detect.summary` on first 3 pages, extrapolated, plus AcroForm/encryption/text-layer flags) shows e.g. a kit `MetaList` ("37 pages", "Flat form", "142 fields detected", separated by the kit separator element, not a character) with suggested entry buttons **Fill & Sign**, **Open in editor**, **Run OCR** (no text layer); any direction cue is the `IconArrowRight` icon, never a glyph. The probe never blocks: "Open in editor" is available immediately. |
| Quick tasks grid       | Merge, Split, Compress, Images->PDF, PDF->Images, PDF->Text, Protect, Unlock.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Workspace modes        | Second grid listing modes as entry points (`/pdf/edit/<mode>`; shows the workspace drop zone if no doc).                                                                                                                                                                                                                                                                                                                                                                                                                                              |

**Quick tasks** keep today's tool structure (`PdfDropzone` -> options -> `JobPanel`) restyled; on success `ResultFiles` adds **Open result in workspace** (single-PDF results) which hands bytes to `/pdf/edit` via the workspace document store (§6.6) and navigates.

---

## 6. Workspace architecture

### 6.1 Layout

| Element          | Standard                                                                              | Focus (F or the `LayoutFocus` icon button)      | Phone (< 900px)              |
| ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| Top bar          | breadcrumb, filename (rename inline), Mod+K, undo/redo, Focus, Export                 | compact: filename, undo/redo, Export, More menu | same as Focus                |
| Modes            | `ModeTabs` under top bar                                                              | `FloatingDock` bottom-centre                    | `FloatingDock`, 56px targets |
| Contextual tools | `Toolbar` under tabs                                                                  | `FloatingPalette` side                          | bottom sheet above dock      |
| Pages            | pinned `PageRail` (left, resizable 120–260px, collapsible)                            | `Drawer` (Menu icon)                            | `Drawer` (Menu icon)         |
| Properties       | `Inspector` right (only when mode supplies one and selection exists, or mode pins it) | `Popover` next to selection                     | bottom sheet                 |

Layout preference (`standard|focus`), rail width, zoom mode and last mode persist via `createToolStore('pdf-edit')` (settings only).

### 6.2 Document model

```ts
interface OpenDocument {
  id: string; // newId(); also autosave key
  name: string;
  sources: Record<SourceId, SourceRef>; // the base checkpoint + merged-in files
  checkpoints: Checkpoint[]; // [0] = original (decrypted) bytes
  log: Operation[]; // all ops since checkpoint 0, in order
  cursor: number; // ops[0..cursor) are applied; redo = ops[cursor..]
  detection?: DetectionCache; // per page, keyed by source+page (not part of undo)
}
interface Operation<P = unknown> {
  id: string;
  type: string;
  v: number; // registry key + schema version
  params: P; // JSON-serialisable; binaries referenced by AssetId
  at: number; // timestamp
  checkpoint?: CheckpointId; // set for kind 'checkpoint' once applied
}
```

**Operation kinds** (declared in the op registry, §7.2):

| Kind         | Examples                                                                                                                                                                                         | Preview                                                                                                                                                                                  | Materialised                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `structure`  | reorder, rotate, delete, duplicate, insert blank, merge-in, extract-as-new, crop/resize, page labels                                                                                             | **Page map**: `PageRef { source, index, rotate, crop?, blank? }[]` derived by folding ops; pdf.js renders each `PageRef` from its source, rotation/crop applied as canvas transform/clip | at export                   |
| `overlay`    | annotations, text boxes, images, shapes, form values, flat-form fills, signatures, watermark/numbers/header-footer, redaction **marks**, detection corrections, metadata edits, protect settings | **Overlay layers**: React SVG/DOM in PDF-point space over the page bitmap, indexed by `PageRef`                                                                                          | at export                   |
| `checkpoint` | apply redactions, flatten, make fillable, OCR, sanitise, compress/optimize, repair                                                                                                               | new base bytes; viewer reopens the checkpoint                                                                                                                                            | immediately, in edit worker |

**Undo/redo** is a command log with a cursor: undo decrements `cursor`, redo increments it; a new op truncates `log[cursor..]`. The view (page map + overlay index) is a pure fold `view = ops.slice(0, cursor).reduce(apply, baseView(checkpointFor(cursor)))`, memoised per checkpoint segment so folding cost is O(ops since last checkpoint). Undoing a `checkpoint` op switches the base back to the previous checkpoint bytes (kept, §6.5); no recomputation. Unlimited depth, bounded only by storage (§6.5). Every op has a human label (`"Rotate page 3 clockwise"`; labels are plain words, never glyphs, per R3) used by the undo tooltip, the live-region announcement and the export summary.

### 6.3 Preview strategy (decision)

**Chosen:** pdf.js renders the **base checkpoint** (and merged-in sources) unchanged; pending `structure` ops are a page map, pending `overlay` ops are DOM/SVG layers. **Not chosen:** re-materialising through pdf-lib after each edit.

| Criterion     | Base + overlays (chosen)                               | Re-materialise per edit                                          |
| ------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Edit latency  | < 16 ms (React state)                                  | pdf-lib save of a 300-page/50 MB doc ≈ 1–6 s, then pdf.js reopen |
| Bitmap cache  | survives edits (keys by source+page)                   | invalidated on every save                                        |
| Undo          | O(1) cursor move                                       | needs snapshot per step (memory ×N) or replay                    |
| Fidelity risk | overlay ≠ final appearance (fonts, appearance streams) | exact                                                            |

Fidelity mitigations: (1) overlays render with the same geometry functions (`pdf/edit/geometry`, `text-fit`) and the same fonts (FontFace from the bytes we embed) as the writers; (2) **"Preview page as exported"** (inspector action, and automatic in Export dialog for pages with changes) materialises just that page (`extract` + ops) in the edit worker and renders it; (3) a per-op-type test renders overlay vs materialised page and asserts pixel diff ≤ 1.5% (§14).

Checkpoints are the only places pdf-lib re-materialises during editing; each shows a `ProgressOverlay` with cancel.

### 6.4 Materialisation & export

`materialize(checkpointBytes, sources, ops) -> Uint8Array` runs in `edit.worker.ts`:

1. Load base with pdf-lib; copy pages from other sources referenced by the page map (`copyPages`).
2. Build output page order from the page map (structure ops), applying `/Rotate`, `/CropBox` + `/MediaBox`, blank pages, `/PageLabels`.
3. Apply overlay ops grouped by type in a fixed order: form values -> flat fills -> page content (text/images/shapes/watermark/numbers/header-footer) -> signatures -> annotations -> metadata -> (Protect) encryption via qpdf last.
4. Save with full rewrite (`useObjectStreams: true`), then qpdf `optimize({ removeUnreferenced })` when any redaction or sanitise checkpoint exists in history (ensures no orphaned original objects survive).

**Export dialog:** filename (`deriveFilename`), change summary grouped by mode rendered as a kit list with one row per mode (mode icon, mode name, plain-words summary from op labels, e.g. Organize: "3 pages deleted, 2 rotated"; Fill & Sign: "24 fields filled, 1 signature"; Redact: "5 areas on 3 pages, verified"), options (flatten forms, linearize, keep/strip metadata, password if Protect configured), warnings (rasterised pages, "input was encrypted; output is unencrypted" unless Protect set), **Export selected pages** toggle. Runs via `useJob`; progress per page; result saved with `saveBlob`.

### 6.5 Memory limits

| Item                        | Limit / policy                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Input file                  | > 200 MB: dismissible warning (unchanged). > 1 GB: refused with `TOO_LARGE` (browsers cannot hold the working copies).                                                                                                               |
| Working copies              | base bytes in main thread as `Blob` (off-heap), one `ArrayBuffer` copy in render worker, one in edit worker during jobs. Peak ≈ 3× file + bitmaps.                                                                                   |
| Checkpoints in memory       | current + previous; older checkpoints only in IndexedDB, loaded on undo across them (spinner).                                                                                                                                       |
| Checkpoint history on disk  | total ≤ min(1 GB, 50% of `navigator.storage.estimate().quota`); beyond that the oldest checkpoints are dropped and the undo history before them is marked "unavailable" in the undo menu and a toast says so (no silent truncation). |
| Bitmaps                     | LRU by pixel budget: 256 MB desktop / 96 MB phone (w·h·4), `.close()` on eviction (extends `bitmap-cache`).                                                                                                                          |
| Assets (images, signatures) | stored once as Blobs, referenced by `AssetId`; ≤ 25 MB each (`TOO_LARGE`).                                                                                                                                                           |

### 6.6 Autosave (IndexedDB)

Database `tools-workspace`, version 1, via `shared/lib/storage.ts` (thin promise wrapper; no new dependency):

| Store       | Key                                                    | Value                                                                                                                   |
| ----------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `documents` | `docId`                                                | `{ id, name, pageCount, byteSize, createdAt, updatedAt, thumb: Blob (JPEG 160px), schema: 1, encryptedInput: boolean }` |
| `blobs`     | `docId/ckpt/<n>`, `docId/src/<id>`, `docId/asset/<id>` | `Blob`                                                                                                                  |
| `logs`      | `docId`                                                | `{ log: Operation[], cursor, checkpoints: CheckpointMeta[], mode, viewport: { page, zoom } }`                           |
| `profile`   | `'my-details'`                                         | "My details" autofill record (§8.6)                                                                                     |

- Writes: blobs once when created; `logs` debounced 750 ms after any op and on `visibilitychange: hidden`. One transaction per save; `navigator.storage.persist()` requested on first save.
- Restore: `/pdf/edit?doc=<id>` or Home "Recent documents"; schema mismatch -> document listed as "can't be restored by this version" with Delete (no migration shims in v1; `schema` exists for future versions).
- **Encrypted inputs:** autosave is **off by default** for documents opened with a password (decrypted bytes would otherwise sit on disk). The top bar shows "Not saved locally" with a toggle to opt in.
- Retention: 10 most recent documents; settings menu "Clear local documents" and "Clear my details". Quota errors -> `STORAGE_FULL` toast with "Clear old documents"; editing continues in memory.
- Never synced, never sent anywhere (stated in the UI's privacy note).

### 6.7 Concurrency & workers

| Worker          | Owns                                                                                        | Notes                                            |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| render (pdf.js) | open, renderPage (tiles), text content, operator-list geometry, detection, annotations read | existing; 4-slot limiter retained                |
| edit (pdf-lib)  | materialise, checkpoints, annotation writers, redaction                                     | NEW; one job at a time; `useJob` cancel -> abort |
| qpdf            | encrypt/decrypt/optimize/repair/check                                                       | existing                                         |
| compress        | image recompression                                                                         | existing                                         |
| ocr (×1–2)      | tesseract.js                                                                                | NEW; lazy                                        |

All via `worker-rpc` with transferables, progress events and crash -> `WORKER_CRASHED` (render worker reopens from `Blob`).

---

## 7. Mode plug-in contract

### 7.1 Mode module

```ts
// src/pdf/workspace/modes/types.ts
export interface ModeManifest {
  id: ModeId; // 'organize' | 'edit' | 'annotate' | 'fill-sign' | 'redact' | 'convert' | 'protect' | 'optimize' | 'ocr'
  label: string;
  icon: IconComponent;
  shortcut: string; // '1'…'9'
  order: number;
  load: () => Promise<{ default: ModeModule }>; // lazy per mode
}
export interface ModeModule {
  operations: OperationDefinition[]; // registered into the op registry on load
  Toolbar: ComponentType<ModeProps>; // rendered in Toolbar or FloatingPalette (same tree)
  Inspector?: ComponentType<ModeProps>; // Inspector panel or Popover
  PageOverlay?: ComponentType<PageOverlayProps>; // per visible page, PDF-point coordinate space
  RailBadge?: ComponentType<{ page: PageRef }>; // e.g. "3 fields left"
  commands(ctx: ModeContext): Command[]; // Mod+K entries (label, keywords, shortcut, run)
  shortcuts?: Shortcut[]; // active only while mode is active
  onEnter?(ctx): void;
  onLeave?(ctx): void; // e.g. start detection, clear tool
  canExit?(ctx): true | string; // e.g. unsaved signature pad
}
export interface ModeProps {
  doc: DocumentApi;
  selection: SelectionApi;
  tool: ActiveTool;
}
export interface DocumentApi {
  view: DocView; // page map + overlay index (read-only)
  dispatch(op: NewOperation | NewOperation[], label?: string): void; // grouped = one undo step
  runCheckpoint(type: string, params): Promise<void>; // via useJob + ProgressOverlay
  render: PdfRenderApi;
  text(page: PageRef): Promise<PageText>;
}
```

```ts
export interface OperationDefinition<P> {
  type: string;
  v: number;
  kind: 'structure' | 'overlay' | 'checkpoint';
  label(p: P): string; // undo/summary text
  summarize?(ops: P[]): string; // grouped export summary
  applyToView?(view: DocView, p: P): DocView; // structure/overlay: pure, fast
  materialize?(ctx: MaterializeCtx, p: P): Promise<void>; // edit worker; pdf-lib doc in ctx
  checkpoint?(
    bytes: Uint8Array,
    p: P,
    rpc: RpcContext,
  ): Promise<CheckpointResult>; // returns bytes + report
  validate(p: unknown): P; // throws ToolError INVALID_INPUT; used on autosave restore
}
```

Ops are registered by type in both the main thread (for `applyToView`) and the edit worker (for `materialize`/`checkpoint`); the worker imports `pdf/doc/ops/*` directly, so op logic lives in `src/pdf`, not in mode UI folders. Mode folders only hold React.

### 7.2 Mapping existing `src/pdf` to modes and ops

| Mode        | Operations (type -> engine)                                                                                                                                                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organize    | `page.reorder/rotate/delete/duplicate/insertBlank/crop/resize/label` -> page map -> `applyPageEdits`, new `setBoxes`, `setPageLabels`; `page.mergeIn` -> `merge`; `page.extract` / `page.split` -> `extract`/`split` (produce **new files**, not doc changes: saved directly or opened as new doc) |
| Edit        | `content.text/image/shape` -> new `pdf/edit/draw.ts` (pdf-lib `drawText/drawImage/drawRectangle`, fonts via `fonts.ts`); `markup.watermark`, `markup.pageNumbers` -> `markup.ts`; `markup.headerFooter` -> new in `markup.ts`; `content.cover` -> `draw.ts`                                        |
| Annotate    | `annot.*` -> `pdf/edit/annot`                                                                                                                                                                                                                                                                      |
| Fill & Sign | `form.setValue` -> `fillForm`; `flat.fill` -> `draw.ts` + `text-fit`; `sign.place` -> `stamp`; `detect.correct` (overlay, no output); checkpoints `form.flatten`, `flat.makeFillable` -> new `forms.ts#createFields`                                                                               |
| Redact      | `redact.mark` (overlay); checkpoint `redact.apply` -> `pdf/redact`                                                                                                                                                                                                                                 |
| Convert     | no doc ops; actions export from the current materialised view: PDF->Images (`render.pageImage`), PDF->Text (`textFromItems`), PDF->Markdown (new `pdf/convert/markdown.ts`), selected pages (`extract`); Images->PDF inserts pages (`page.insertImages` -> `imagesToPdf` + merge-in)               |
| Protect     | `protect.set` (overlay; encryption at export via `qpdf.encrypt`); `meta.set` -> `metadata.ts`; checkpoint `sanitize` -> new `pdf/edit/sanitize.ts`; Unlock happens on open (§12)                                                                                                                   |
| Optimize    | checkpoints `optimize.compress` -> `compress` pipeline, `optimize.repair` -> qpdf rewrite; `linearize` is an export option; size breakdown -> `compress/inventory` + new font/stream accounting                                                                                                    |
| OCR         | checkpoint `ocr.textLayer` -> `pdf/ocr`                                                                                                                                                                                                                                                            |

**PDF->Markdown:** text items grouped into lines/blocks by geometry; headings from font-size clusters (≥ 1.25× body median -> `#`/`##`), lists from leading bullets/numbers, tables from the §8 grid detector (cells -> GFM table), hyphenation joined. Output states it is a best-effort structural conversion.

---

## 8. Fill & Sign

### 8.1 Entry & form kinds

| Document has            | Behaviour                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| AcroForm fields         | Fields rendered as kit controls in the overlay (existing `FieldControl`), Tab order = widget order; values are `form.setValue` ops. |
| XFA                     | `UNSUPPORTED_FEATURE` (existing message); flat-fill tools still usable on the rendered page.                                        |
| No fields               | Flat-form detection runs (render worker, page by page, visible pages first); results highlighted.                                   |
| Both (partial AcroForm) | Both: AcroForm widgets + detections that don't overlap a widget (IoU < 0.3).                                                        |

Signatures: draw / upload / type (existing `pdf/sign`), saved signatures kept in `profile` store (local, clearable); placed via drag/resize (detent); visual only, UI states "not a certificate signature".

### 8.2 Flat-form detection — geometry extraction

Input per page: `page.getOperatorList()` and `page.getTextContent()` in the render worker.

1. **Interpret drawing ops** with a CTM stack (`save/restore/transform`) and pdf.js `constructPath` data. Collect, in page space (points, origin bottom-left, page `/Rotate` normalised):
   - stroked segments (`moveTo/lineTo` + stroke);
   - rectangles (`rectangle` op) with fill/stroke flag;
   - **thin filled rectangles** with `min(w,h) ≤ 2pt` -> converted to a segment along the long centreline (Word exports table borders this way).
   - Ignore paths inside image masks, white-on-white (fill colour equals the cell fill below), and anything with alpha < 0.1.
2. **Normalise segments:** horizontal if `|Δy| ≤ 0.6pt`, vertical if `|Δx| ≤ 0.6pt`, else discarded; length ≥ 4pt. Stroked rectangles of size > 2pt in both dimensions contribute 4 segments.
3. **Snap & merge:** cluster x (verticals) and y (horizontals) coordinates with tolerance 1.5pt (single-linkage), replace by cluster mean; merge collinear segments with gap ≤ 2pt.
4. **Text boxes:** each text item -> glyph-run box from its transform, width and font ascent/descent (pdf.js `fontAscent/descent` style info); split items into per-character boxes by proportional advance when needed.

### 8.3 Candidate generation

| Candidate                    | Rule                                                                                                                                                                                                                                                                                                                                             | Field rect                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------ | ---------------- |
| **Table cell**               | Adjacent horizontals `y1<y2` and verticals `x1<x2` from the snapped sets whose four sides are each ≥ 90% covered by merged segments; minimal (no line strictly inside). Size `w ≥ 12pt`, `8pt ≤ h ≤ 220pt`.                                                                                                                                      | cell inset 1.5pt                                                         |
| **Cell with trailing space** | Cell contains text only in its left part and free width ≥ max(40pt, 45% of cell) to the right of the last glyph (e.g. "Name:" inside a wide cell).                                                                                                                                                                                               | free region right of text, inset 1.5pt                                   |
| **Underscore run**           | Text run of ≥ 3 `_` (or ≥ 5 `.`/`…` leaders) in one text item or consecutive items on one baseline.                                                                                                                                                                                                                                              | run bbox, height = 1.25× font size, bottom at baseline − 1pt             |
| **Ruled line**               | Horizontal segment not part of any cell edge, length ≥ 36pt, no glyph within 1.2× median line height above it.                                                                                                                                                                                                                                   | segment x-range, height = median line height above segment               |
| **Checkbox (vector)**        | Closed square (rect op or 4 segments) with `                                                                                                                                                                                                                                                                                                     | w−h                                                                      | ≤ 1.5pt`and`6pt ≤ w ≤ 16pt`, empty inside. | square inset 1pt |
| **Checkbox (glyph)**         | Code points U+2610, U+25A1, U+25A2, U+274F, U+2B1C (matched numerically, R3); in Wingdings/Wingdings 2/ZapfDingbats/Symbol fonts the codes for an empty box (Wingdings `0xA8`, `0x6F`, `0x71`; Wingdings 2 `0xA3`; ZapfDingbats `0x6F`, `0x71`). Checked glyphs (U+2611, U+2612, Wingdings 2 `0x53/0x54`, Wingdings `0xFE/0xFD`) -> pre-checked. | glyph bbox                                                               |
| **Date pattern**             | Text `DD/MM/YYYY`, `__/__/____`, `MM/DD/YY` etc. (regex), or date-label + adjacent field.                                                                                                                                                                                                                                                        | pattern bbox (glyphs are replaced visually by covering only when filled) |

### 8.4 Classification, labels and confidence

A cell is **label** if glyph coverage of its inset area > 8% and it contains ≥ 2 letters, **empty** if no glyph box intersects its inset rect, **partial** otherwise (handled by "trailing space"). Empty cells become field candidates; label cells give labels.

Label assignment (first match): text left of the field on the same row band (cell to the left, or text in the same cell); text immediately above within 1.5 line heights (column header); for checkboxes, nearest text to the right on the same baseline.

Type inference: checkbox candidates -> `tick`; label/pattern matches `/date|d\.?o\.?b|birth|dd\/mm/i` -> `date`; `/signature|signed|sign here/i` -> `signature`; height ≥ 2.2× median line height -> `multiline`; else `text`. Autofill key from a label dictionary (`name`, `first name|forename`, `surname|last name|family name`, `address` (lines 1–3), `town|city`, `county|state`, `postcode|zip|eircode`, `country`, `email`, `phone|telephone|mobile`, `dob`, `nationality`, `occupation`); dictionary is a plain table for i18n later.

**Confidence** `c ∈ [0,1]` = weighted sum, then clamped:

| Feature                                                                           | Weight |
| --------------------------------------------------------------------------------- | ------ |
| Geometric closure (cell sides ≥ 90%) / exact underscore run / exact glyph         | 0.35   |
| Has an assigned label                                                             | 0.25   |
| Plausible size for type (text h 10–40pt, tick 6–16pt)                             | 0.15   |
| Row/column consistency (≥ 2 peers with same width/height ± 2pt in the same table) | 0.15   |
| Not inside a header row (first row of a table where all cells are label)          | 0.10   |

Thresholds: `c ≥ 0.70` -> **field** (mint outline + soft fill); `0.45 ≤ c < 0.70` -> **suggested** (dotted `info` outline, not in Tab order until accepted); below -> dropped. Document is reported as a **flat form** when it has no AcroForm fields and ≥ 5 fields at `c ≥ 0.70` (or ≥ 3 on each of ≥ 2 pages). The hub card count is the number of `field` candidates.

Performance budget: ≤ 40 ms median per page in the worker; results cached in `DetectionCache` (and autosaved with the doc). Large pages with > 20 000 path ops are sampled out (detection skipped for that page, rail badge "no detection: page too complex").

### 8.5 Interaction

| Action                | Behaviour                                                                                                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click a field         | Inline editor (kit `Input`/`Textarea`/date picker/tick toggle) positioned on the field; text auto-fits (`text-fit`), min 6pt, warns when truncated.                                                                                                                                       |
| Click anywhere        | Tool picker (Text / Tick / Cross / Date / Signature / Initials). Text **snaps to the containing cell** (any cell, even label cells) left-padded at the cell's baseline; otherwise placed at the click baseline.                                                                           |
| Tab / Shift+Tab       | Next/previous empty field in reading order: by page, then row bands (y-cluster tolerance 0.5× line height, top->bottom), then x. Enter commits & advances.                                                                                                                                |
| "My details" autofill | Button fills every field whose autofill key has a stored value; preview list with checkboxes before applying; one undo step.                                                                                                                                                              |
| Correct detections    | Dismiss ("Not a field", Del), accept suggestion (Enter), resize (handles snap to cell edges), draw new field (drag; snaps), change type, split/merge adjacent cells. Each is a `detect.correct` op (undoable, autosaved, used by Make fillable).                                          |
| Make fillable         | Checkpoint: writes real AcroForm widgets (text, checkbox, date as text with `AFDate_FormatEx` format action omitted — plain text with label hint) for all accepted fields, names from labels (deduped, `name_2`), current values set, `NeedAppearances` false with generated appearances. |
| Flatten               | Checkpoint (or export option): AcroForm -> page content via pdf-lib `form.flatten()`; flat fills are already page content.                                                                                                                                                                |

Flat fills are written as page content with embedded fonts (Helvetica for WinAnsi; otherwise Noto Sans subset via fontkit, existing `fonts.ts` check). Ticks use a vector check mark path, not a font glyph.

### 8.6 "My details"

Fields: full name, first name, surname, address lines 1–3, town/city, county/state, postcode, country, email, phone, date of birth, plus up to 10 custom key/value pairs. Stored in IndexedDB `profile` (local only, not encrypted at rest — stated in the UI), editable in a dialog, "Clear my details" one click. Never auto-applied without the preview step.

### 8.7 Test fixtures

| Fixture (generated by `scripts/gen-fixtures.ts`) | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flat-form-word.pdf` (6 pages)                   | Word-like: tables drawn with 0.5pt thin filled rectangles, label cells left / empty cells right, header rows, merged cells, "Signature: **\_\_**", dotted leaders, vector checkboxes and checkbox glyphs U+2610/U+2612 (Noto Sans Symbols 2, OFL, subset; written from numeric code points in `test/fixtures/builders.ts`), date placeholders, multi-line "Details" cells, one rotated page. Emits `flat-form-word.truth.json` (expected fields: page, rect, type, label). |
| `flat-form-stroked.pdf`                          | Same layout drawn with stroked lines (LibreOffice style).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `negative-report.pdf`                            | Prose + a filled data table: expected ≤ 2 detections, not flagged as a flat form.                                                                                                                                                                                                                                                                                                                                                                                          |
| `mixed-acroform.pdf`                             | Half AcroForm widgets, half drawn cells: no duplicates.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `scan-form.pdf`                                  | Image-only form (for P5-F raster ruling detection + OCR).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Private owner sample (37-page gov form)          | Optional, git-ignored `test/fixtures/private/`; test skipped when absent; never committed.                                                                                                                                                                                                                                                                                                                                                                                 |

R3 and fixtures: detection-input fixtures deliberately simulate third-party documents and therefore contain checkbox glyphs; they live under `test/` (outside the lint scope), are generated from numeric code points, are never displayed by the product, and are excluded from visual baselines. Product-authored samples (kit gallery, demo documents, visual baselines) contain no banned glyphs. Owner to confirm this reading of R3.

Metrics (unit test): precision ≥ 0.90 and recall ≥ 0.90 at IoU ≥ 0.6 on the generated flat forms; label accuracy ≥ 0.85; types exact for ticks/dates.

---

## 9. Annotate & Edit

### 9.1 Annotate (standard annotations)

Written by `pdf/edit/annot` using pdf-lib's low-level `context.obj` and appended to the page's `/Annots`. Every annotation gets `/NM` (uuid), `/T` (author, default "Me", settable), `/M`, `/CreationDate`, `/F 4` (Print), `/P`, `/C`, `/CA`, `/Contents`, and an **appearance stream** `/AP /N` (Form XObject) so viewers that don't regenerate appearances still render it.

| Tool                                      | Subtype                                              | Geometry source                                                                                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Highlight / Underline / Strike / Squiggly | `Highlight` / `Underline` / `StrikeOut` / `Squiggly` | Selection on the pdf.js **TextLayer** (visible pages): `Range.getClientRects()` -> page coordinates, merged per line -> `/QuadPoints` (+ `/Rect` union). Blend `Multiply` in AP for highlight. |
| Sticky note                               | `Text` + `Popup`                                     | click point; icon `Comment`/`Note`                                                                                                                                                             |
| Text comment                              | `FreeText`                                           | drag box; `/DA` + AP with embedded Helvetica                                                                                                                                                   |
| Freehand                                  | `Ink`                                                | pointer samples simplified (Ramer–Douglas–Peucker, 0.5pt) -> `/InkList`; stroke smoothing reuses `pdf/sign/stroke`                                                                             |
| Rectangle / Ellipse                       | `Square` / `Circle`                                  | drag; `/BS`, `/IC` fill                                                                                                                                                                        |
| Line / Arrow                              | `Line` with `/LE [/None /OpenArrow]`                 | drag                                                                                                                                                                                           |
| Stamp                                     | `Stamp`                                              | preset text stamps (Approved, Draft, Confidential…) or an image; AP drawn by us                                                                                                                |

Existing annotations: read via pdf.js `getAnnotations()`, listed in the Comments inspector (author, date, text), can be hidden in preview, deleted (`annot.delete` by object ref) and — for the subtypes above — moved/recoloured/edited (rewrites that dict). Others are preserved untouched. Replies (`/IRT`) supported for `Text`. Comments panel filters by page/author/type.

### 9.2 Edit (page content)

| Tool                     | Implementation                                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text box                 | `draw.ts`: font (Helvetica/Times/Courier or embedded Noto Sans for non-WinAnsi), size, colour, alignment, multi-line wrap (`text-fit`).                                                                                                                                                     |
| Image                    | PNG/JPEG embed (WebP/GIF via `image-convert`), aspect lock, opacity.                                                                                                                                                                                                                        |
| Shapes                   | rectangle, ellipse, line, arrow as content paths.                                                                                                                                                                                                                                           |
| Watermark / Page numbers | existing `markup.ts` options; overlay preview on every affected page.                                                                                                                                                                                                                       |
| Header & footer          | new `markup.headerFooter`: left/centre/right slots with tokens `{n} {total} {date} {filename}`, margins, page selection.                                                                                                                                                                    |
| Cover & replace          | Draw a filled rect (colour sampled from the rendered bitmap under the selection, editable) + new text on top. **UI copy:** "This covers the original text. The original is still in the file and can be copied or found by search. To remove text, use Redact." No in-place reflow editing. |

Selection/transform of overlay objects: detent `useDraggable/useResizable`, rotation handle, arrow-key nudge (1pt, Shift 10pt), align/distribute in inspector, copy/paste within the doc.

---

## 10. Redact

### 10.1 Marking (overlay ops)

- **Area:** drag rectangles (snap to text lines optional).
- **Search:** literal or regex (case/whole-word options) across all pages' text content; preset patterns (email, phone, IBAN, card number with Luhn check). Each match -> rects from glyph boxes; results list with per-match toggles and "mark all".
- Marks render as `redact`-coloured outlines with a hatched preview; nothing is removed until **Apply redactions** (a checkpoint). Apply confirms: "Removes the content under N marks on M pages. You can undo until you export."

### 10.2 Apply (checkpoint, edit worker) — per page with marks

| Step | Action                                                                                                                                                                                                                                                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Parse all page content streams with `pdf/edit/content` (full lexer incl. strings, arrays, dicts, inline images), interpreting graphics state (CTM, clip ignored for safety), text state (Tm, Tlm, Tf, Tc, Tw, Tz, TL, Ts, Tr).                                                                                                                                        |
| 2    | **Text:** for each `Tj/TJ/'/"`, compute each glyph's box from font widths (`/Widths`, `/W` for CID fonts, `/FontMatrix` for Type 3), font bbox height. Glyph intersecting any mark (≥ 1% area) is **removed**: the string is split and the removed glyphs are replaced by a `TJ` numeric adjustment equal to their advance, so surviving glyphs keep their positions. |
| 3    | **Images** (`Do` of image XObject and inline images): fully covered -> draw removed; partially covered -> decode (compress codecs: DCT, Flate, raw, 8-bit Gray/RGB), paint covered pixels with the fill colour, re-encode, store as a **new** XObject for this page (shared originals untouched). SMask region cleared as well.                                       |
| 4    | **Form XObjects:** recurse; clone before editing if referenced from elsewhere.                                                                                                                                                                                                                                                                                        |
| 5    | **Vector paths:** paths whose bbox is fully inside a mark are removed; intersecting paths are kept (they carry no text) and covered by the fill.                                                                                                                                                                                                                      |
| 6    | **Annotations & widgets:** remove any whose `/Rect` intersects a mark (including field values for widgets).                                                                                                                                                                                                                                                           |
| 7    | Draw the redaction fill (default black; optional overlay text "REDACTED" or a code).                                                                                                                                                                                                                                                                                  |
| 8    | **Document level:** remove `/StructTreeRoot` + `/MarkInfo` if the doc has redactions (alt text/ActualText can leak; UI states tagging is removed), drop page `/Thumb` and `/PieceInfo`, scrub outline titles and Info/XMP values containing search terms (listed in the report).                                                                                      |
| 9    | Save full rewrite -> qpdf `optimize({ removeUnreferenced: true, objectStreams: 'generate' })` so no orphaned original object remains.                                                                                                                                                                                                                                 |

**Rasterise fallback (per page, stated in report and on the rail):** used when the page has Type 3 fonts without usable metrics, fonts with no width info, text render modes with clipping (`Tr 4–7`), image filters we cannot decode (JBIG2, JPX, CCITT, CMYK/Indexed), shading/pattern-painted text, or content-stream parse errors. Page is rendered at 200 DPI (setting 150–300) with marks burned in, replaced by an image-only page of identical size; its text is lost ("Run OCR to make it searchable again" action offered).

### 10.3 Verification (automatic; export blocked on failure)

1. Reopen the checkpoint bytes in pdf.js. For every marked page: no text-content glyph box intersects a mark; render the page at 100 DPI and check every mark area is ≥ 99% fill colour (±8/255).
2. Whole document: no search term (case-insensitive, whitespace-normalised) in text content, annotation `/Contents`, outline titles, Info, XMP, form values or attachment names.
3. Raw bytes: after qpdf `--qdf --object-streams=disable` decompress, no search term occurs in any stream (latin1 and UTF-16BE).
4. Any failure -> that page is rasterised automatically and re-verified; if it still fails -> `VERIFICATION_FAILED` with the page numbers; the checkpoint is discarded (nothing half-applied).

Report (inspector + export summary): marks per page, pages rasterised and why, metadata items scrubbed, verification result ("Verified: no content remains under the marks").

---

## 11. OCR

| Aspect          | Decision                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine          | `tesseract.js` + `tesseract.js-core` (Apache-2.0), LSTM, SIMD build with non-SIMD fallback.                                                                                                                                                                                                                                                                                                                               |
| Asset hosting   | **Same-origin static assets**, never a third-party CDN. `scripts/copy-ocr-assets.mjs` (like `copy-pdfjs-assets`) copies pinned files into `public/ocr/`: worker (~0.1 MB), core wasm+js (SIMD ≈ 3.5 MB, fallback ≈ 3.4 MB; only one is fetched), and `tessdata_fast` language files (`*.traineddata.gz`, from pinned `@tesseract.js-data/<lang>` packages). Served with long-cache immutable headers via wrangler assets. |
| Languages (v1)  | Latin-script set: eng (≈ 2.0 MB gz), fra, deu, spa, ita, por, nld, gle, pol, swe (each ≈ 1.5–3 MB gz). Others out of scope for v1.                                                                                                                                                                                                                                                                                        |
| First use       | OCR mode shows "English OCR data: 5.5 MB download (engine + language), stored on this device for next time" with Download button; nothing fetched before consent. Size figures come from a generated `ocr-manifest.json` (exact bytes).                                                                                                                                                                                   |
| Caching         | Language data cached by tesseract.js in IndexedDB (`cacheMethod: 'write'`); engine files via HTTP cache. "Remove OCR data" in settings.                                                                                                                                                                                                                                                                                   |
| Offline/failure | Fetch failure -> `NETWORK` ("Couldn't download OCR data. Check your connection and try again."); never falls back silently.                                                                                                                                                                                                                                                                                               |
| CSP             | `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self' blob:`; `connect-src` stays open (decision G11, `scripts/csp.ts`) because the HTTP Client and the opt-in signing timestamp (P5-H) call URLs the user chooses — the workspace's same-origin rule is enforced by request-log tests and the OCR loader's same-origin guard.                                                                                       |
| Pipeline        | Pages needing OCR = no text layer (existing `hasTextLayer`) or glyph coverage < 1% of page; "Force" option. Render worker renders at 300 DPI (capped by `MAX_CANVAS_PIXELS`) -> `ImageBitmap` transferred to OCR worker pool (`min(2, cores/2)`) -> `recognize` with word boxes + confidence -> per-page progress.                                                                                                        |
| Text layer      | Checkpoint `ocr.textLayer`: append a content stream per page: `BT 3 Tr` (invisible), one `Tj` per word with font size from box height and `Tz` horizontal scaling to match box width; font = embedded GlyphLess-style Noto Sans subset (Unicode `ToUnicode` CMap correct). Original image untouched. Result is searchable/selectable and feeds flat-form label detection.                                                 |
| Scans as forms  | P5-F adds **raster ruling detection** for image-only pages: binarise the 150-DPI render (Otsu), find horizontal/vertical runs ≥ 36pt-equivalent via run-length + morphological closing, emit segments into the same §8 cell builder.                                                                                                                                                                                      |
| Quality report  | mean word confidence per page; pages < 60% flagged "low confidence".                                                                                                                                                                                                                                                                                                                                                      |

---

## 12. Opening documents & encryption

Drop/choose -> `detectKind` -> `preparePdf` (phase 3): unencrypted -> open; encrypted -> `PasswordPrompt` inline in the workspace empty state -> `qpdf.decrypt` -> base checkpoint is the decrypted bytes (`encryptedInput: true`, autosave off by default, export warns unless Protect is set). Owner-password-only PDFs (open but restricted) open, show a "restricted" badge, and editing requires the owner password (prompt) — no permission bypass. Damaged files: offer **Repair** (qpdf rewrite) before failing with `INVALID_FILE`.

---

## 13. Keyboard, accessibility, states

### 13.1 Keyboard map (Mod = Command on macOS, Ctrl elsewhere; rendered by `Kbd` with SVG key icons)

| Keys                          | Action                                                                    | Keys                | Action                                            |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------- | ------------------------------------------------- |
| Mod+K                         | Command palette                                                           | ?                   | Shortcut sheet                                    |
| Mod+Z / Mod+Shift+Z (Mod+Y)   | Undo / redo                                                               | Mod+S               | Export                                            |
| Mod+O                         | Open file                                                                 | F                   | Toggle Focus layout                               |
| 1–9                           | Switch mode (Organize…OCR)                                                | Mod+\\              | Toggle page rail                                  |
| Mod+= / Mod+− / Mod+0 / Mod+1 | Zoom in / out / fit width / 100%                                          | Space (hold) + drag | Pan                                               |
| PgDn / PgUp, J / K            | Next / previous page                                                      | Home / End          | First / last page                                 |
| Mod+F                         | Find in document (Redact: find to mark)                                   | Esc                 | Cancel tool -> clear selection -> close popover   |
| Tab / Shift+Tab               | Fill & Sign: next / previous empty field                                  | Enter               | Commit field / accept suggestion                  |
| Arrows / Shift+Arrows         | Nudge selected object 1pt / 10pt                                          | Del / Backspace     | Delete selection (page in rail, object on canvas) |
| Mod+D                         | Duplicate selection                                                       | R / Shift+R         | Organize: rotate right / left                     |
| Alt+Up / Alt+Down             | Move page in rail                                                         | Mod+A               | Select all pages (rail) / objects (page)          |
| V, T, H, U, S, N, P, B, E     | Tools: select, text, highlight, underline, strike, note, pen, box, eraser | `p 12` in Mod+K     | Go to page 12                                     |

Single-letter shortcuts are disabled while typing in inputs; all shortcuts are listed in tooltips via `ShortcutHint` and are remappable later (registry in `shared/lib/hotkeys.ts`).

### 13.2 Accessibility

- WCAG 2.2 AA in both themes; contrast tests on tokens; `forced-colors` mode respected (outlines use `CanvasText`/`Highlight`).
- Landmarks: banner (top bar), navigation (tabs/dock), complementary (rail, inspector), main (canvas). Skip links to canvas and to tools.
- Pages: each page slot is a `region` labelled "Page 3 of 37"; pdf.js text layer kept in the DOM for visible pages so screen readers can read text.
- Overlay objects and detected fields are focusable elements (`button`/form controls) with accessible names ("Text field: Surname, empty"); every pointer action has a keyboard equivalent (place object at page centre then nudge; draw field via "Add field" + arrow-resize).
- Live region announces undo/redo ("Undid: rotate page 3"), mode changes, job completion, verification results.
- Touch targets ≥ 44px in Focus/phone; pinch zoom on canvas; no hover-only affordances.
- Reduced motion per §4.4.

### 13.3 Error handling & states per mode

| Mode        | Empty                                                   | Loading                                      | Errors (code -> UX)                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace   | `DropZone fullscreen` + recent documents                | first-page skeleton, page placeholders       | `INVALID_FILE` (not a PDF/damaged -> Repair offer), `ENCRYPTED`/`WRONG_PASSWORD` (inline prompt), `TOO_LARGE`, `WORKER_CRASHED` (auto-reopen, then ErrorState with Reload), `STORAGE_FULL` (toast; continue in memory) |
| Organize    | —                                                       | thumbnail skeletons                          | merge-in of an encrypted file -> password prompt; invalid crop -> `INVALID_INPUT` inline                                                                                                                               |
| Edit        | hint "Click to add text"                                | font load spinner                            | unsupported characters for chosen font -> inline (`assertDrawable`) with "Use Unicode font" action                                                                                                                     |
| Annotate    | hint                                                    | —                                            | selection on page without text layer -> "No text here — run OCR" action                                                                                                                                                |
| Fill & Sign | "No form fields found" + Detect manually/Click anywhere | "Detecting fields… page 4/37" (non-blocking) | XFA -> `UNSUPPORTED_FEATURE`; detection crash per page -> rail badge + continue; truncated text -> field warning                                                                                                       |
| Redact      | hint                                                    | `ProgressOverlay` per page                   | rasterised pages -> warning banner; `VERIFICATION_FAILED` -> blocking ErrorState, checkpoint discarded                                                                                                                 |
| Convert     | —                                                       | job progress                                 | canvas cap -> result notes `capped` DPI (existing)                                                                                                                                                                     |
| Protect     | —                                                       | job progress                                 | weak/empty password -> inline; qpdf errors via `qpdfToToolError`                                                                                                                                                       |
| Optimize    | —                                                       | per-stage progress                           | output ≥ input -> "Kept original" (existing behaviour, not an error)                                                                                                                                                   |
| OCR         | consent card with download size                         | download progress, per-page progress         | `NETWORK`, `WORKER_CRASHED`, low confidence flags                                                                                                                                                                      |

All errors render through `ErrorState`/`Alert` with the `ToolError.message`; `cause` logged in dev via `logToolError`. No silent fallbacks: every fallback (rasterise, kept original, skipped page) is reported.

---

## 14. Performance

| Concern                                                      | Approach / budget                                                                                                                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas virtualisation                                        | Page slots sized from `DocInfo.pages` (no render needed for layout); render visible pages ± 1 viewport overscan; cancel renders scrolled away (abort signal).                                        |
| Zoom                                                         | Render at `zoom × devicePixelRatio`, quantised to steps (50/75/100/150/200/300%); CSS-scale the nearest bitmap while the sharp one renders; above 200% render 512px **tiles** for visible area only. |
| Text / annotation layers                                     | Only for visible pages; created lazily after the bitmap.                                                                                                                                             |
| Rail                                                         | Virtualised list; 160px thumbnails at low priority (render queue priority: canvas > rail > detection).                                                                                               |
| Ops                                                          | View fold memoised per checkpoint segment; overlay index by page so a page re-renders only when its ops change.                                                                                      |
| Detection / OCR                                              | Visible pages first, idle-time for the rest; cancellable.                                                                                                                                            |
| Budgets (CI perf test on `large-300.pdf`, 300 pages, ~20 MB) | open -> first page ≤ 1.5 s; scroll ≥ 50 fps (Playwright trace); rotate/delete feedback ≤ 50 ms; export ≤ 15 s; main-thread long tasks ≤ 100 ms.                                                      |
| Bundle                                                       | Workspace route lazy; each mode lazy; tesseract/qpdf/compress lazy; Home JS ≤ 120 KB gz.                                                                                                             |

---

## 15. Testing strategy

| Layer                      | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest, Node)        | Op registry: every op's `validate`, `applyToView`, `materialize` (outputs reopened with pdf-lib/pdf.js); undo/redo/truncate/checkpoint logic; autosave serialise/restore round trip (fake-indexeddb, dev dep); detection precision/recall on fixtures; content lexer round trip (parse -> serialise byte-equivalent on fixture corpus); redaction verifier (positive + adversarial: text hidden under image, TJ kerning, Form XObject reuse, Type 3 -> rasterised); annotation dicts readable by pdf.js `getAnnotations` with expected subtype/QuadPoints; OCR text-layer writer with mocked recognition output; token contrast.                  |
| Component (Vitest, jsdom)  | Kit primitives: keyboard and ARIA behaviour (CommandPalette, ModeTabs, Toolbar roving focus, Popover, PageRail reorder, DropZone, Kbd SVG keys). Icon module: every export renders an `<svg>` that is `aria-hidden` by default and `role=img` with a name when `label` is set, honours size/stroke; a snapshot of the icon name list makes removals deliberate.                                                                                                                                                                                                                                                                                   |
| Design-system enforcement  | `RuleTester` suites for each `eslint-rules/` rule (§1A.1); `pnpm lint` with all rules at `error` and zero warnings; `test/dist-glyphs.test.ts` over the production build (§1A.2); an import-graph test (Vite manifest) asserting `lucide-react` is reached only from `src/shared/ui/icons`. Visual baselines double as a glyph review: any text-rendered symbol fails review.                                                                                                                                                                                                                                                                     |
| E2E (Playwright, Chromium) | Home -> hub -> tool for every category route (route table test generated from registry); PDF hub routing (1 PDF, many PDFs, images); workspace: open -> organize -> undo/redo -> reload restores -> export reopened; flat-form fill with Tab + My details + sign -> export -> text drawn where expected (pdf.js text positions); Make fillable -> AcroForm fields exist; annotate -> annotations present after export; redact search term -> term absent in output; protect -> unlock round trip; OCR on `scan-form.pdf` -> extracted text contains expected words (uses committed same-origin assets); quick task -> "Open result in workspace". |
| Visual regression          | Playwright `toHaveScreenshot` for Home, each hub template, PDF hub, workspace Standard and Focus (each mode with a fixture open), dialogs (Export, Mod+K, password), states (empty/error/loading) — **both themes** × desktop 1280×800 and phone 390×844; reduced-motion forced; dynamic regions masked; threshold 0.2%. Run in the pinned Playwright Docker image for deterministic fonts; baselines updated only via an explicit `pnpm test:visual --update` commit.                                                                                                                                                                            |
| Accessibility              | `@axe-core/playwright` on every visual-suite page: 0 serious/critical.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Performance                | Nightly/perf job (not PR-blocking at first) on `large-300.pdf` with budgets from §14.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

New fixtures: `flat-form-*` (§8.7), `large-300.pdf`, `annotated.pdf` (third-party-style annotations), `redact-adversarial.pdf`, `type3-font.pdf`, `scan-form.pdf`, encrypted variants (qpdf).

---

## 16. Migration of legacy tools

Each of the 30 non-PDF tools keeps its `Tool.tsx`, `lib/`, stores and ids; only the frame and styling change.

| Step | Change per tool                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Manifest gains `slug`, `kind: 'tool'`, `keywords`, optional `accepts` (route table §3.2).                                                                                                                                                                          |
| 2    | Rendered inside `AppShell` + new `ToolPage` frame (header with icon, name, description, favourite, breadcrumb) replacing `ToolLayout`.                                                                                                                             |
| 3a   | Design-system rules (§1A.3): lucide imports move to `@/shared/ui/icons`; glyph literals replaced by icons or wording; raw `button/input/select/textarea/svg/img/canvas`, inline `style` and CSS modules replaced by kit components or new kit primitives/adapters. |
| 3    | Kit restyle is automatic via tokens; any tool-level colour literals (charts: Plotly in calculator, React Flow in JSON viewer, Rive canvas, regex highlights) switch to token CSS variables and respond to theme changes.                                           |
| 4    | File-accepting tools read hub handoff (`?handoff=`).                                                                                                                                                                                                               |
| 5    | e2e `legacy-tools.spec.ts` updated to new routes; visual baseline per tool page (both themes, desktop only).                                                                                                                                                       |

PDF tools: 8 quick tasks restyled + "Open result in workspace"; 6 folded tools deleted after their logic is moved (§3.3) and covered by workspace tests.

---

## 17. Phasing (PR-sized; each leaves `master` shippable)

| PR        | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Exit criteria                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P5-A1** | `eslint-rules/` plugin with rules (a), (c) and no-disable at `error`, built-asset glyph scan (d); icon module (`fromLucide` wrapper, custom shell/brand/key icons, `Logo`/`LogoMark`); fix all (a)/(c) violations repo-wide. Design tokens (`theme/tokens.css`, light/dark, theme script, fonts), restyle existing kit, new primitives not tied to the workspace: AppShell, TopBar/Breadcrumb, CommandPalette, Popover, DropZone variants, HubLayout, CategoryCard/ToolCard, Toast theme, Empty/Error/LoadingState, Kbd/ShortcutHint (SVG keys), MetaList, SegmentedControl, StatusDot. | Lint 0 with (a)/(c)/(d) enforced; rule tests; icon module tests; kit component tests + token contrast tests; visual baselines for kit gallery (dev-only route) in both themes. |
| **P5-A2** | Manifest fields + `categories.ts`; routes move to `/<category>/<slug>`; Home, hubs, PDF hub (without detected-doc card), NotFound with search; Mod+K global sources; handoff; delete Dashboard/ToolLayout/AnimatedBackground/terminal.css; legacy tools in new frame; kit adapters (Chart, FlowCanvas, RivePlayer, QrCode, CodeEditor) + `BitmapCanvas`/`Image`; rule (b) at `error` with every legacy violation fixed (tools, `src/app`, `src/pdf/components`, quick tasks) and CSS modules removed.                                                                                   | All four rules enforced repo-wide with zero violations; route table e2e; visual suite for Home/hubs/tool pages; lint/typecheck 0.                                              |
| **P5-B**  | Workspace core: `pdf/doc` (op log, page map, registry, materialise, checkpoints), edit worker, `storage.ts` + autosave/restore + recent docs, WorkspaceShell (Standard/Focus/phone), ModeTabs/Dock, Toolbar/Palette, PageRail, DocumentViewport (zoom, virtualisation, tiles), Inspector, kit primitives `Positioned`/`OverlayLayer`/`ShapeLayer`/`SelectionFrame`/`HitArea`, mode icon family, ExportDialog with summary, Organize mode (all v1 ops), encrypted open; delete `pdf-organize`.                                                                                           | Open->organize->undo->reload->export e2e; perf budgets on `large-300.pdf` measured; autosave round-trip tests.                                                                 |
| **P5-C**  | Fill & Sign: AcroForm in overlay, signatures (move `pdf-sign` lib), kit `FieldBox`/`SignaturePad` + Fill & Sign custom icons, `pdf/detect` + flat fills + corrections + Tab order + My details + Make fillable + flatten; PDF-hub detected-document card; delete `pdf-sign`, `pdf-fill-form`.                                                                                                                                                                                                                                                                                           | Detection P/R ≥ 0.9 on fixtures; flat-form e2e; Make fillable verified in pdf.js.                                                                                              |
| **P5-D**  | Annotate (`pdf/edit/annot`, TextLayer selection, comments panel, existing-annotation handling) + Edit (`draw.ts`, header/footer, cover & replace, object transforms); delete `pdf-watermark`, `pdf-page-numbers`.                                                                                                                                                                                                                                                                                                                                                                       | Annotation round-trip tests; overlay-vs-materialised pixel tests per op type.                                                                                                  |
| **P5-E**  | `pdf/edit/content` full lexer/interpreter; Redact (marks, search, apply, rasterise fallback, verification); Protect mode (protect at export, metadata, sanitise) + Optimize mode (compress, repair, linearize, size breakdown) + Convert mode (incl. PDF->Markdown); quick tasks restyle + "Open result in workspace"; delete `pdf-metadata`.                                                                                                                                                                                                                                           | Adversarial redaction suite green; protect/unlock and compress e2e; quick-task handoff e2e.                                                                                    |
| **P5-F**  | OCR: asset copy script + manifest, consent/download UI, OCR worker pool, invisible text layer, raster ruling detection for scanned forms, "Run OCR" actions from Annotate/Redact/hub card.                                                                                                                                                                                                                                                                                                                                                                                              | OCR e2e on `scan-form.pdf`; no third-party network requests (Playwright request log assertion).                                                                                |
| **P5-G**  | Polish: icon gallery review (every custom icon at every size, both themes), shortcut sheet, remaining a11y gaps (axe 0), reduced-motion audit, full visual-regression matrix both themes, perf job in CI, docs (README architecture section, `docs/` mode-authoring guide, privacy note), dead-code sweep.                                                                                                                                                                                                                                                                              | All §1 success criteria met.                                                                                                                                                   |

Order constraints: A1 -> A2 -> B -> (C, D, E in any order; E's content lexer is independent and can start in parallel with C) -> F (needs B; raster detection needs C) -> G.

---

## 18. Out of scope

- **Compare** (deferred by owner).
- True in-place text editing/reflow of existing PDF text (cover & replace only, stated in UI).
- Certificate-based digital signatures and signature validation.
- XFA form filling (detected, reported).
- Server processing, accounts, sync, sharing, cloud storage; autosave is local only.
- Redirects or compatibility routes for old URLs.
- OCR for non-Latin scripts and handwriting; layout-preserving PDF->Word/Office conversions; Office->PDF.
- PDF/A, PDF/UA conversion or validation; preserving tagged structure after redaction.
- Form JavaScript calculations/validation scripts (stripped by Sanitise, otherwise left inert in the file).
- Collaborative/multi-user annotation workflows (reviews, status sync).
- Autosave schema migrations (v1 introduces `schema: 1` only).
