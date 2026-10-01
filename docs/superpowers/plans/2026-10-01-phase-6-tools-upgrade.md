# Phase 6: Every Tool Shines (Tools Upgrade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. Per controller ruling R22 there is one executor per Part (PR), and each Part runs in its own git worktree.

**Goal:** Ship every audit upgrade for the 22 non-PDF tools, ten new tools, the JSON & XML Viewer rebuilt (code-like Tree plus canvas card-diagram Map), the renames, cross-tool hand-offs and the shared text input panel. The work is split into twelve PR-sized Parts:

| Part     | Scope                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **6-P0** | Correctness fixes. Standalone; ships first, on current `master`, before phase 5.                                                    |
| **6-A1** | Shared platform: share codec, text hand-off, workers, settings, commands, domain libraries, syntax, tokens.                         |
| **6-A2** | Kit additions: CodeSurface, TextInputPanel, SplitPane, VirtualList, DataGrid, Chart (Plotly out), ColorPicker, CodeTree and others. |
| **6-A3** | Diagram engine ported from Verql, plus the `DiagramCanvas` kit host.                                                                |
| **6-B**  | JSON & XML Viewer.                                                                                                                  |
| **6-C**  | Text tools: Regex, Diff, Log Viewer, Text Toolkit, Markdown.                                                                        |
| **6-D**  | Data tools: CSV, Mock data, Code Formatter.                                                                                         |
| **6-E**  | Encoding and security: Base64, Hash, JWT, Text Encoder, Password, UUID, Encrypt.                                                    |
| **6-F**  | Math and time: Calculator, Number, Units, Date, Epoch, Cron, Pomodoro.                                                              |
| **6-G1** | Media: Image Compressor, Color, Rive, EXIF, Favicon.                                                                                |
| **6-G2** | Web: HTTP Client, QR Generator, QR Scanner, URL Inspector.                                                                          |
| **6-H**  | Workflows, no-network suite, dependency sweep, visual matrix, docs.                                                                 |

**Architecture:**

- **Shared domain logic** lives in `src/shared/lib/*` (pure, worker-safe, unit-tested).
- **Heavy work** runs in `src/shared/workers/text.worker.ts` (handler barrel, one module, many instances) and `image.worker.ts`. Both are reached through `worker-rpc` and the new `killable-client`.
- **UI** comes only from `src/shared/ui` (new components added in A2 and A3 before any tool uses them).
- **Diagram engine:** `src/shared/diagram` is a framework-free port of `arshad-shah/verql` `src/renderer/src/components/er` (model, metrics, layered layout, row-port routing, canvas paint, viewport, minimap, theme bridge, SVG and PNG export), with a worker layout.
- **Tools** stay thin: `src/tools/<id>/{index.ts,Tool.tsx,lib/*,components/*}`.

**Tech stack:**

- **Existing:** React 19, Vite 8, TypeScript 6, Tailwind v4, Vitest 5 plus Testing Library, Playwright 1.63, store-kit plus zustand 5, detent 0.3, mathjs 15, diff 9, papaparse 5, fflate, qrcode.react, @rive-app/react-canvas, @internationalized/date.
- **Added** (licence re-checked in each Part's first task):

| Part | Packages                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------- |
| P0   | `hash-wasm` (MIT), `upng-js` (MIT, with `pako`), `@types/upng-js` (dev)                                           |
| A1   | `yaml` (ISC), `smol-toml` (BSD-3-Clause)                                                                          |
| C    | `micromark`, `micromark-extension-gfm` (MIT)                                                                      |
| D    | `prettier` (MIT), `sql-formatter` (MIT), `terser` (BSD-2-Clause), `csso` (MIT)                                    |
| E    | `@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en` (MIT); EFF wordlist data (CC BY 3.0 US) |
| G1   | `exifr` (MIT), `@jsquash/avif` (Apache-2.0)                                                                       |
| G2   | `zxing-wasm` (MIT), `tldts` (MIT; PSL data MPL-2.0 unmodified)                                                    |

- **Removed:**

| Part | Packages                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------ |
| A2   | plotly.js, react-plotly.js and their types                                                             |
| B    | @xyflow/react, dagre, @types/dagre, @uiw/react-textarea-code-editor, rehype-prism-plus, rehype-rewrite |
| D    | lodash, @types/lodash                                                                                  |
| G2   | crypto-js, @types/crypto-js                                                                            |

**Spec:** `docs/superpowers/specs/2026-10-01-phase-6-tools-upgrade-design.md` (the authority; §n references below). Requirements source: `docs/superpowers/specs/2026-10-01-tools-audit.md`.

**Controller log:** `.superpowers/sdd/2026-10-01-phase-1-foundation/progress.md`. Rulings R1–R27 apply. In particular:

- R1: tests import `test/fixtures/*` relatively.
- R2: `typecheck` is `tsc -b`.
- R13: keyboard reorder is Alt+Arrow with detent `keyboard: false`.
- R22: one executor per PR, worktrees.
- R24: new codes `NETWORK` and `VERIFICATION_FAILED` exist from P5.
- R26: JSON/XML Map and Tree design, Verql port.
- R27: depth A, ten new tools, P0 first.

**Phase-5 decisions inherited:** G1 (rule b skips tests), G2 (rule a checks cooked values), G8 (per-platform visual baselines), G18 (`/__kit` gallery).

## Global Constraints

**Owner rules (binding; restate in every task report)**

1. **SVG icons only, from `src/shared/ui/icons`** (P0 is exempt: it lands before P5-A1 and keeps master's current `lucide-react` imports, which P5-A1 migrates). A missing icon becomes a custom TSX icon on lucide's 24px grid in an icon group file (append-only barrel line).
2. **No hand-rolled UI.** Tools compose kit components only. A missing capability means a kit component is added first, with tests and a `/__kit` gallery entry. No raw `button/input/select/textarea/svg/img/canvas/video/audio/iframe` and no `style` prop outside `src/shared/ui` (rule b).
3. **No glyphs.** No emoji, pictographic, dingbat, arrow, geometric-shape, box-drawing, bullet or technical-symbol character in any string, JSX text, test name in `src` or display fixture. Tests that need astral characters build them with `String.fromCodePoint(0x1f600)`. Copy uses words ("to", "and").
4. **Enforced in CI.** `pnpm lint` with `--max-warnings 0 --report-unused-disable-directives`, all `local/*` rules at `error`, no inline disables of them.
5. **Modularity.** Tools are thin. Logic goes in `lib/` or `src/shared/lib`, workers via `worker-rpc` and `killable-client`, settings via `createToolSettings` (P0: existing `createToolStore` patterns), async via `useJob`.
6. **ToolError model.** Nothing faked, no silent fallback. New code in this phase: `TIMEOUT` (P0) only.
7. **Settings persisted, data never.** No input, output, token, key, password or document is written to storage, except the labelled opt-ins in spec §8 (HTTP Client secret values, HTTP history).
8. **Share only from the allow-list** (spec §4.2). **Network only in HTTP Client and the opt-in remote images** of the Markdown and HTTP previews.
9. **Light and dark themes, WCAG 2.2 AA, reduced motion** for every new surface. Colours only from tokens.

**Platform**

- Fully client-side. MIT-compatible licences only. Never add GPL code, `mupdf`, Ghostscript, Comlink, `@dnd-kit` or `cynosure-*`. Prefer `@arshad-shah/*` packages.
- WASM assets (hash-wasm embeds its wasm in JS; `@jsquash/avif`, `zxing-wasm`) are served same-origin. Verify there is no CDN fetch with a Playwright request-log assertion in the Part that adds them.

**Code conventions**

- `@/` imports. Relative imports never climb out of their module folder (R1 exception for tests).
- Tool folders are kebab-case and equal the id; the entry is `Tool.tsx`; non-JSX files use `.ts`; files stay under 400 lines (split when a task would exceed that).
- Ids via `newId()`. Downloads via `saveBlob`, `saveZip` and `deriveFilename`. Toasts via `notify`. Files via `loadFile`, `loadTextFile` and `readBytes`.
- Tests prefer `getByRole` plus an accessible name. `data-testid` only on canvases and overlays (the names listed here are contract).
- Every tool gets an e2e spec at `test/e2e/tools/<id>.spec.ts` (from 6-B on; P0 adds to today's `test/e2e/legacy-tools.spec.ts` and new `test/e2e/p0-*.spec.ts`).

**Concurrency note (read at every task start)**

- **Step 0 of every task:** open every module the task consumes and confirm the signature named under **Interfaces / Consumes**. Phase-5 APIs were written from the P5 spec, not from merged code: `handoff.ts`, `useCommands`, `hotkeys.ts`, the kit adapters (`Chart`, `CodeEditor`, `FlowCanvas`, `QrCode`, `RivePlayer`), `ErrorState`, `SegmentedControl`, `DropZone`, `Popover` and the token names in `src/theme/tokens.css`. If one differs, adapt the call sites to the real signature and note it in the task report. Do not change a shared module unless the task lists it under **Files / Modify**.
- Phase-4 PR E splits large tool files. P0 targets master as of `d7c64bb`. If P4-E merged first, re-locate code by the quoted identifiers.

**Append-only registries (Parts never edit each other's lines):**

- `src/shared/ui/index.ts`: one export line per kit module.
- `src/shared/ui/icons/index.ts`: one `export * from './custom/<group>'` line per icon group (`custom/tools-p6.tsx` is owned by A2; Parts B–G2 each add their own group file if needed).
- `src/shared/workers/handlers/index.ts`: one spread line per handler module (A1 creates it).
- `src/app/licences.ts`: one entry per bundled third-party data or library needing attribution (A1 creates it).
- `test/share-allowlist.test.ts`: the allow-list constant (A1 creates it with spec §4.2's list; Parts never edit it).

**Windows and git**

- Case-only renames go through a temporary name.
- `pnpm` 10.11.0, never npm (except read-only `npm view`).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `--no-verify`.
- Stop any dev server you start. No long-running processes left behind.

**Merge gate (every Part; all green, in order)**

1. `pnpm lint` (0 errors, 0 warnings)
2. `pnpm typecheck`
3. `pnpm build`
4. `pnpm test` (includes the dist glyph scan, rule tests, `test/share-allowlist.test.ts` and `test/bundle-budget.test.ts` from A1/H on)
5. `pnpm test:e2e`, three consecutive green runs (investigate any flake; no retries or sleeps added; note N3)
6. `pnpm test:visual` for the Part's pages: both themes, desktop 1280x800, plus phone 390x844 for the flagship pages listed in spec §12.5; reduced motion forced; threshold 0.2%; axe 0 serious or critical

P0's gate is steps 1–5 on today's scripts (no visual suite exists on master yet).

## Parallelisation map

| Part | Branch                        | Cut from `master` after  | Parallel with (separate worktrees) | Overlap risks and mitigation                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ----------------------------- | ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6-P0 | `fix/p6-p0-correctness`       | now (`d7c64bb` or later) | P4-D, P4-E, all of phase 5         | Edits `regex-tester/Tool.tsx`, `jwt-decode/Tool.tsx`, `csv-viewer/Tool.tsx`, `calculator/hooks/useCalculator.ts` and `json-and-xml-viewer/components/TreeView.tsx`, which P4-E splits. Mitigation: all logic goes in new `lib/` files; Tool edits are call-site swaps. Whoever merges second rebases (import-line and call-site conflicts only). Adds `TIMEOUT` to `errors.ts` (one line; P5-B adds three codes nearby, so the conflict is trivial). |
| 6-A1 | `feat/p6-a1-platform`         | P5-A2 and 6-P0           | 6-A3, P5-B..H                      | Edits `src/theme/tokens.css` (syntax, diff and chart tokens only, appended block) and `src/shared/lib/handoff.ts` (P5 file; additive union member). P5-B..H do not touch either after A2.                                                                                                                                                                                                                                                            |
| 6-A2 | `feat/p6-a2-kit`              | 6-A1 merged              | 6-A3                               | Kit barrel append lines only. A2-9 rewrites the P5 `Chart` adapter and its consumers (`calculator/components/GraphDisplay.tsx`, `csv-viewer` chart), and no other Part touches those until A2 merges. If P5-H added a camera primitive, A2-14 reuses it.                                                                                                                                                                                             |
| 6-A3 | `feat/p6-a3-diagram`          | P5-A2                    | 6-A1, 6-A2                         | New folder `src/shared/diagram` plus one kit file and a barrel line.                                                                                                                                                                                                                                                                                                                                                                                 |
| 6-B  | `feat/p6-b-json-xml`          | 6-A1, 6-A2, 6-A3 merged  | 6-C, 6-D, 6-E, 6-F, 6-G1, 6-G2     | Only `src/tools/json-and-xml-viewer/**`, the deletion of P5's `FlowCanvas` and `CodeEditor` adapters (sole consumer, grep in B-3/B-6), and `package.json` removals.                                                                                                                                                                                                                                                                                  |
| 6-C  | `feat/p6-c-text`              | 6-A1, 6-A2 merged        | B, D, E, F, G1, G2                 | Adds `src/shared/workers/handlers/{regex,diff,log}.ts` (own files) and barrel lines. Text Diff is a hand-off target for other Parts: they only send payloads, so there is no code overlap.                                                                                                                                                                                                                                                           |
| 6-D  | `feat/p6-d-data`              | 6-A1, 6-A2 merged        | B, C, E, F, G1, G2                 | `handlers/{csv,format,mock}.ts`. Removing `lodash` needs no other consumer (verify with grep in D-9).                                                                                                                                                                                                                                                                                                                                                |
| 6-E  | `feat/p6-e-encoding-security` | 6-A1, 6-A2 merged        | B, C, D, F, G1, G2                 | Extends `src/shared/lib/crypto/digest.ts` (A1-owned; E is its only editor in phase 6). `handlers/hash.ts`.                                                                                                                                                                                                                                                                                                                                           |
| 6-F  | `feat/p6-f-math-time`         | 6-A1, 6-A2 merged        | B, C, D, E, G1, G2                 | Creates `src/shared/lib/numbers/*` (F only).                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6-G1 | `feat/p6-g1-media`            | 6-A1, 6-A2 merged        | B, C, D, E, F, G2                  | Creates `src/shared/workers/image.worker.ts` (G1 only).                                                                                                                                                                                                                                                                                                                                                                                              |
| 6-G2 | `feat/p6-g2-web`              | 6-A1, 6-A2 merged        | B, C, D, E, F, G1                  | Creates `src/shared/lib/qr-decode.ts` (G2 only). Removing `crypto-js` requires P0 (the hash tool is off crypto-js); verify with grep in G2-8.                                                                                                                                                                                                                                                                                                        |
| 6-H  | `feat/p6-h-finish`            | all of the above         | none                               | Sweeps everything.                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Every Part that adds dependencies edits `package.json` and `pnpm-lock.yaml`. On rebase, take master's lockfile, re-run `pnpm install` and commit the regenerated lockfile. Never hand-merge the lockfile.

The order in one line: `P0 (now) ... P5-A2 -> { A1 -> A2, A3 } -> { B (needs A3), C, D, E, F, G1, G2 } in parallel -> H`.

**Task counts:**

| Part | Tasks | Part | Tasks |
| ---- | ----- | ---- | ----- |
| 6-P0 | 12    | 6-D  | 13    |
| 6-A1 | 13    | 6-E  | 16    |
| 6-A2 | 17    | 6-F  | 17    |
| 6-A3 | 11    | 6-G1 | 14    |
| 6-B  | 12    | 6-G2 | 12    |
| 6-C  | 17    | 6-H  | 6     |

The total is 160 tasks.

## Review Focus

1. **The tab never freezes.**
   - Regex, Log custom formats and Text Toolkit regex replace run in dedicated killable workers with a 1 s `TIMEOUT`.
   - A regex bomb leaves the UI responsive.
   - Covered by P0-4, P0-5, C-1, C-12, C-14, H-2.
2. **Crypto is correct and honest.**
   - Hash and HMAC known-answer vectors (RFC 4231, FIPS 202).
   - JWT verification for every algorithm with tamper cases, and the UI never says "Token valid".
   - Encrypt round-trip, wrong-passphrase and tamper cases.
   - UUID v7 monotonic.
   - Covered by P0-3, P0-6, P0-7, E-2, E-5, E-12, E-14, E-15.
3. **Data is never persisted, and only allow-listed tools share.**
   - `createToolSettings` deny-list guard per tool.
   - `test/share-allowlist.test.ts`.
   - Share fragments respect size limits and the zip-bomb guard.
   - Covered by A1-1, A1-4, H-5.
4. **The JSON & XML Viewer at scale.**
   - 20 MB parse in a worker.
   - Tree virtualised.
   - Map worker layout deterministic, culling via spatial index, node cap with `more` rows.
   - Tree, Map, editor and path bar stay in sync.
   - Covered by A3-2, A3-4, A3-8, A3-11, B-1, B-5, B-6, B-12.
5. **No third-party network.**
   - zxing and AVIF wasm served same-origin.
   - Markdown and HTTP previews block remote images until opted in.
   - The no-network suite visits every tool.
   - Covered by G1-2, G2-6, C-16, G2-4, H-2.
6. **Kit-only UI and no glyphs.**
   - Every new visual primitive is in `src/shared/ui` with gallery entries and both-theme baselines.
   - Lint is 0 in every Part.
   - Covered by A2-17, A3-10, and each Part's gate.
7. **Migrations keep user data.**
   - Calculator history, favourites and memories; HTTP collections; pomodoro.
   - Store keys unchanged; snapshot tests.
   - Covered by F-3, G2-1, F-15.

## Decisions (also in spec §17)

D1 to D22 of the spec apply. These plan-level decisions are added:

| #   | Decision                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | P0 tests that need astral characters use `String.fromCodePoint`, so P5-A1's rule (a) scan of `src` stays clean.                                                                                             |
| P2  | P0's regex worker (`src/tools/regex-tester/lib/regex.worker.ts`) is folded into the shared text worker's `regex` handler in C-1; the dedicated killable instance remains.                                   |
| P3  | P0's `hash-generator/lib/hash.ts` moves to `src/shared/lib/crypto/digest.ts` in A1-7 (re-exported from the old path until E-2 swaps imports, then deleted).                                                 |
| P4  | Visual baselines for each tool page are created in that tool's Part; H-4 only fills gaps and runs the full matrix.                                                                                          |
| P5  | Large-input fixtures (`large.json`, `large.csv`, `large.log`, `map-5000.json`) are generated by `scripts/gen-fixtures.ts` into `test/fixtures/generated/` (gitignored) during `pnpm test:e2e` global setup. |

---

## File Structure (phase 6 end state, new or substantially changed)

```
src/
  app/licences.ts                       attribution entries (append-only)
  shared/
    lib/
      encoding.ts (P0, +A1)  killable-client.ts (P0)  share-state.ts  handoff.ts (+text)  tool-settings.ts  tool-commands.ts  qr-decode.ts (G2)  prng.ts (D)
      crypto/  random.ts  digest.ts  keys.ts  aead.ts
      color/   parse.ts  convert.ts  contrast.ts  apca.ts  cvd.ts  scale.ts  names.ts  index.ts
      data-formats/  json-locate.ts  yaml.ts  xml.ts  toml.ts  csv-write.ts  sql-insert.ts  markdown-table.ts  ndjson.ts  xlsx-write.ts  index.ts
      time/    parse.ts  format.ts  zones.ts  index.ts
      syntax/  tokenize.ts  languages/{json,xml,yaml,csv,log,regex,markdown,js,css,html,sql,http}.ts
      numbers/ base.ts  twos.ts  ieee754.ts  bits.ts  (F)
    workers/
      text.worker.ts  text-client.ts  handlers/{index,ping,regex,diff,log,csv,json,hash,format,mock,tokens}.ts
      image.worker.ts  image-client.ts  (G1)
    diagram/
      model.ts  metrics.ts  layout.ts  route.ts  viewport.ts  spatial-index.ts  theme-bridge.ts  paint.ts  export.ts  layout.worker.ts  layout-client.ts  index.ts  *.test.ts
    ui/
      code-surface/*  text-input-panel.tsx  split-pane.tsx  virtual-list.tsx  data-grid/*  chart/*  color-picker.tsx  code-tree.tsx
      key-value-editor.tsx  compare-slider.tsx  sandboxed-html.tsx  camera-capture.tsx  bit-grid.tsx  meter.tsx  secret-text.tsx
      bytes-view.tsx  focus-overlay.tsx  device-frame.tsx  send-to-menu.tsx  share-button.tsx  privacy-note.tsx  diagram-canvas.tsx
      icons/custom/tools-p6.tsx
  theme/tokens.css                       + syntax, diff, match, chart tokens
  tools/<22 existing>/                   upgraded (spec §8)
  tools/{text-toolkit,markdown-editor,code-formatter,uuid-generator,text-encrypt,epoch-converter,cron-builder,exif-tool,favicon-generator,qr-scanner}/   new
test/
  e2e/tools/<id>.spec.ts  e2e/workflows.spec.ts  e2e/no-network.spec.ts  share-allowlist.test.ts  bundle-budget.test.ts
  fixtures/generated/ (gitignored)
```

Deleted by the end of phase 6:

- `src/shared/ui/adapters/{chart(plotly),flow-canvas,code-editor}`
- `src/shared/lib/interop.ts` (if unused)
- `src/tools/json-and-xml-viewer/components/{treeview/*,DataNode.tsx,TreeView.tsx}`
- `src/tools/calculator/components/GraphDisplay.tsx` (replaced)
- `src/tools/regex-tester/lib/regex.worker.ts` (P2)
- `src/tools/hash-generator/lib/hash.ts` (P3)

---

# Part 6-P0: correctness fixes (ships first; standalone; current `master`, before phase 5)

**Branch:** `fix/p6-p0-correctness` from `master`. **Independent of the phase-5 kit:** it uses today's `@/shared/ui` exports, `lucide-react` icons and today's routes (`/<id>`). It adds no glyph literals.

**Boundary:** Hash HMAC and SHA-3, Base64 Unicode and files, Regex worker timeout and escaping, JWT decode and verification and honest status, CSV delimiter and bad rows, JSON search crash and error position, Calculator keyboard, angle and grapher, Image Optimizer alpha-to-JPEG and PNG. Tests are unit tests plus e2e on today's routes.

### Task P0-1: `encoding.ts`, UTF-8 and Base64 core

**Files:**

- Create: `src/shared/lib/encoding.ts`, `src/shared/lib/encoding.test.ts`

**Interfaces:**

- Produces:
  - `utf8Encode(text): Uint8Array`
  - `utf8Decode(bytes): string` (fatal; `INVALID_INPUT`)
  - `bytesToBase64(bytes, { urlSafe?, padding?, wrap76? }): string`
  - `base64ToBytes(text): Uint8Array` (whitespace-tolerant, both alphabets, positioned errors)
  - `toDataUri(bytes, mime)`, `parseDataUri(text): { mime, bytes } | null`
  - `bytesToHex(bytes, upper?)`, `hexToBytes(text)`
- Consumes: `ToolError` from `@/shared/lib/errors`.

- [ ] **Step 0:** Confirm `ToolError(code, message, { cause })` in `src/shared/lib/errors.ts`.
- [ ] **Step 1: Write the failing test** `src/shared/lib/encoding.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  hexToBytes,
  parseDataUri,
  toDataUri,
  utf8Decode,
  utf8Encode,
} from './encoding';

const sample = `café €${String.fromCodePoint(0x1f600)}`;

describe('utf8 + base64', () => {
  it('encodes non-Latin-1 text (btoa cannot)', () => {
    expect(bytesToBase64(utf8Encode(sample))).toBe('Y2Fmw6kg4oKs8J+YgA==');
  });
  it('supports URL-safe without padding', () => {
    expect(
      bytesToBase64(utf8Encode(sample), { urlSafe: true, padding: false }),
    ).toBe('Y2Fmw6kg4oKs8J-YgA');
  });
  it('decodes both alphabets, with or without padding, ignoring whitespace', () => {
    for (const input of [
      'Y2Fmw6kg4oKs8J+YgA==',
      'Y2Fmw6kg4oKs8J-YgA',
      'Y2Fm w6kg\n4oKs8J+Y gA==',
    ]) {
      expect(utf8Decode(base64ToBytes(input))).toBe(sample);
    }
  });
  it('wraps at 76 characters', () => {
    const out = bytesToBase64(new Uint8Array(100), { wrap76: true });
    const lines = out.split('\n');
    expect(lines[0]).toHaveLength(76);
    expect(lines.every((l) => l.length <= 76)).toBe(true);
    expect(base64ToBytes(out)).toEqual(new Uint8Array(100));
  });
  it('handles large inputs without stack overflow', () => {
    const big = new Uint8Array(3_000_000).fill(65);
    expect(base64ToBytes(bytesToBase64(big))).toHaveLength(3_000_000);
  });
  it('names the first invalid character and its 1-based position', () => {
    expect(() => base64ToBytes('ab$c')).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'Invalid Base64 character "$" at position 3',
      }),
    );
  });
  it('rejects padding in the middle and impossible lengths', () => {
    expect(() => base64ToBytes('ab=c')).toThrow(/Padding/);
    expect(() => base64ToBytes('abcde')).toThrow(/length/);
  });
  it('refuses invalid UTF-8 when decoding text', () => {
    expect(() => utf8Decode(Uint8Array.of(0xff))).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});

describe('hex and data URIs', () => {
  it('round-trips hex with separators and prefix', () => {
    expect(bytesToHex(Uint8Array.of(0, 255, 16))).toBe('00ff10');
    expect(bytesToHex(Uint8Array.of(0, 255, 16), true)).toBe('00FF10');
    expect(hexToBytes('0x00 FF:10')).toEqual(Uint8Array.of(0, 255, 16));
    expect(() => hexToBytes('abc')).toThrow(/even/);
    expect(() => hexToBytes('zz')).toThrow(/0-9/);
  });
  it('builds and parses data URIs (base64 and percent-encoded)', () => {
    expect(toDataUri(Uint8Array.of(1, 2, 3), 'application/octet-stream')).toBe(
      'data:application/octet-stream;base64,AQID',
    );
    expect(parseDataUri('data:image/png;base64,AQID')).toEqual({
      mime: 'image/png',
      bytes: Uint8Array.of(1, 2, 3),
    });
    const text = parseDataUri('data:text/plain;charset=utf-8,hi%20there');
    expect(text?.mime).toBe('text/plain');
    expect(utf8Decode(text!.bytes)).toBe('hi there');
    expect(parseDataUri('not a data uri')).toBeNull();
  });
});
```

- [ ] **Step 2:** Run `pnpm vitest run src/shared/lib/encoding.test.ts`. Expect FAIL (module not found).
- [ ] **Step 3: Implement** `src/shared/lib/encoding.ts`:

```ts
import { ToolError } from './errors';

const encoder = new TextEncoder();

export function utf8Encode(text: string): Uint8Array {
  return encoder.encode(text);
}

/** Strict: invalid UTF-8 is an error, never replacement characters. */
export function utf8Decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      'The decoded bytes are not valid UTF-8 text',
      { cause },
    );
  }
}

export interface Base64Options {
  urlSafe?: boolean;
  padding?: boolean;
  /** Line break every 76 characters (MIME). */
  wrap76?: boolean;
}

export function bytesToBase64(
  bytes: Uint8Array,
  { urlSafe = false, padding = true, wrap76 = false }: Base64Options = {},
): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  let out = btoa(binary);
  if (urlSafe) out = out.replace(/\+/g, '-').replace(/\//g, '_');
  if (!padding) out = out.replace(/=+$/, '');
  if (wrap76) out = out.replace(/(.{76})(?=.)/g, '$1\n');
  return out;
}

/** Accepts standard and URL-safe alphabets, optional padding, any whitespace. */
export function base64ToBytes(input: string): Uint8Array {
  const bad = /[^A-Za-z0-9+/\-_=\s]/.exec(input);
  if (bad) {
    throw new ToolError(
      'INVALID_INPUT',
      `Invalid Base64 character "${bad[0]}" at position ${bad.index + 1}`,
    );
  }
  const compact = input.replace(/\s+/g, '');
  const body = compact.replace(/=+$/, '');
  if (body.includes('=')) {
    throw new ToolError(
      'INVALID_INPUT',
      'Padding "=" may only appear at the end',
    );
  }
  if (body.length % 4 === 1) {
    throw new ToolError(
      'INVALID_INPUT',
      'This Base64 has an impossible length (one character too many or too few)',
    );
  }
  const std = body.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(std + '='.repeat((4 - (std.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function toDataUri(bytes: Uint8Array, mime: string): string {
  return `data:${mime || 'application/octet-stream'};base64,${bytesToBase64(bytes)}`;
}

export function parseDataUri(
  text: string,
): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^,]*?),(.*)$/s.exec(text.trim());
  if (!m) return null;
  const params = m[1].split(';');
  const mime = params[0] || 'text/plain';
  const isBase64 = params.slice(1).includes('base64');
  return {
    mime,
    bytes: isBase64
      ? base64ToBytes(m[2])
      : utf8Encode(decodeURIComponent(m[2])),
  };
}

export function bytesToHex(bytes: Uint8Array, upper = false): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return upper ? s.toUpperCase() : s;
}

export function hexToBytes(input: string): Uint8Array {
  const clean = input
    .trim()
    .replace(/^0x/i, '')
    .replace(/[\s:_-]/g, '');
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    throw new ToolError('INVALID_INPUT', 'Hex may only contain 0-9 and a-f');
  }
  if (clean.length % 2) {
    throw new ToolError('INVALID_INPUT', 'Hex needs an even number of digits');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
```

- [ ] **Step 4:** Run the test. Expect PASS. Then run `pnpm lint` and `pnpm typecheck`.
- [ ] **Step 5: Commit.**

```bash
git add src/shared/lib/encoding.ts src/shared/lib/encoding.test.ts
git commit -m "feat(shared): UTF-8 safe Base64, hex and data-URI helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task P0-2: Base64 tool: Unicode, variants, file mode

**Files:**

- Modify: `src/tools/base64-converter/Tool.tsx`
- Create: `src/tools/base64-converter/lib/convert.ts`, `src/tools/base64-converter/lib/convert.test.ts`
- Create: `test/e2e/p0-base64.spec.ts`

**Interfaces:**

- Produces:
  - `encodeText(text, opts: Base64Options): string`
  - `decodeToText(b64): string` (throws `INVALID_INPUT`)
  - `encodeFile(bytes, mime, as: 'base64' | 'data-uri', opts): string`
  - `decodeToFile(input): { bytes: Uint8Array; mime: string; extension: string; isText: boolean }`
- Consumes: `encoding.ts` (P0-1); `detectKind(bytes)` from `@/shared/lib/files` (returns `'pdf'|'png'|'jpeg'|'webp'|'gif'|null`); `saveBlob`, `deriveFilename` from `@/shared/lib/download`; kit `Tabs`, `Switch` (or `Checkbox`), `FileUpload`, `Textarea`, `Alert`, `Button`.

- [ ] **Step 0:** Confirm the `detectKind`, `saveBlob(blob|bytes, name, mime?)` and `FileUpload` props (`onFiles`?) signatures in the current files and adapt.
- [ ] **Step 1: Failing test** `lib/convert.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decodeToFile, decodeToText, encodeFile, encodeText } from './convert';

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

describe('base64 tool conversions', () => {
  it('encodes and decodes Unicode text', () => {
    const t = `naïve ${String.fromCodePoint(0x1f680)}`;
    expect(decodeToText(encodeText(t, {}))).toBe(t);
  });
  it('applies variants', () => {
    expect(encodeText('??>', { urlSafe: true, padding: false })).toBe('Pz8-');
  });
  it('encodes a file as a data URI', () => {
    expect(
      encodeFile(Uint8Array.of(1, 2, 3), 'image/png', 'data-uri', {}),
    ).toBe('data:image/png;base64,AQID');
  });
  it('decodes a data URI or raw Base64 to a typed file', () => {
    const f = decodeToFile(`data:image/png;base64,${PNG_1PX}`);
    expect(f).toMatchObject({
      mime: 'image/png',
      extension: 'png',
      isText: false,
    });
    const raw = decodeToFile(PNG_1PX);
    expect(raw).toMatchObject({ mime: 'image/png', extension: 'png' });
  });
  it('marks UTF-8 text payloads as text', () => {
    expect(decodeToFile(encodeText('hello', {}))).toMatchObject({
      isText: true,
      extension: 'txt',
      mime: 'text/plain',
    });
  });
  it('falls back to binary for unknown bytes', () => {
    expect(decodeToFile('/wD/AA==')).toMatchObject({
      isText: false,
      extension: 'bin',
      mime: 'application/octet-stream',
    });
  });
});
```

- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3: Implement** `lib/convert.ts`:
  - `encodeText = (t, o) => bytesToBase64(utf8Encode(t), o)`.
  - `decodeToText = (s) => utf8Decode(base64ToBytes(s))`.
  - `encodeFile` returns `toDataUri(bytes, mime)` for `'data-uri'`, else `bytesToBase64(bytes, opts)`.
  - `decodeToFile`:
    1. Use `parseDataUri(input)`, falling back to `{ mime: '', bytes: base64ToBytes(input) }`.
    2. `kind = detectKind(bytes)`. If `kind`, use mime `image/<kind>` or `application/pdf` and extension `kind === 'jpeg' ? 'jpg' : kind`.
    3. Otherwise, if the bytes are valid UTF-8 (try `utf8Decode`) and contain no NUL, use `text/plain`, `txt`, `isText: true`.
    4. Otherwise use the data-URI mime when present (extension from a small map `{ 'application/json': 'json', 'text/plain': 'txt' }`), else `application/octet-stream` and `bin`.
- [ ] **Step 4: Tool UI.**
  - Tabs "Text" | "File".
  - **Text tab** (existing layout): the result effect calls `encodeText` or `decodeToText` in a `try`, storing `ToolError` messages (`toToolError(e).message`). Add three switches under the input: "URL-safe", "Padding" (default on), "Wrap at 76". They are visible in encode mode; decode ignores them and accepts everything.
  - **Swap** moves the output to the input and flips the mode (existing behaviour, now using the lib).
  - **File tab:** a `FileUpload` (any file) and a `Select` "Output" (Base64 / Data URI). The output appears in a read-only `Textarea` with Copy and "Download .txt" (`deriveFilename(file.name, 'txt')` or the existing helper).
  - Below it, "Decode to file": a `Textarea` for Base64 or a data URI and a button "Decode". The result shows `<mime>`, the size, an image preview when `mime` starts with `image/` (object URL; revoke on change), and "Download file" (`saveBlob(new Blob([bytes], { type: mime }), \`decoded.${extension}\`)`). Errors render in `Alert status="danger"`.
- [ ] **Step 5: E2E** `test/e2e/p0-base64.spec.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('base64 encodes Unicode text that btoa rejects', async ({ page }) => {
  await page.goto('/base64-converter');
  await page.getByRole('textbox').first().fill('café €');
  await expect(page.getByText('Y2Fmw6kg4oKs')).toBeVisible();
});

test('base64 decodes a data URI to a downloadable file', async ({ page }) => {
  await page.goto('/base64-converter');
  await page.getByRole('tab', { name: 'File' }).click();
  await page
    .getByLabel('Base64 or data URI to decode')
    .fill('data:application/octet-stream;base64,AQID');
  await page.getByRole('button', { name: 'Decode' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download file' }).click();
  const file = await download;
  expect([...(await readFile(await file.path()))]).toEqual([1, 2, 3]);
});
```

- [ ] **Step 6:** Run the unit test and `pnpm test:e2e test/e2e/p0-base64.spec.ts`. Expect PASS. Then lint and typecheck.
- [ ] **Step 7: Commit** `fix(base64): UTF-8 safe encoding, URL-safe/padding/wrap options and file mode` (with the trailer).

### Task P0-3: Hash: real SHA-3, labelled Keccak, keyed HMAC (`hash-wasm`)

**Files:**

- Modify: `package.json` (add `hash-wasm`), `src/tools/hash-generator/Tool.tsx`
- Create: `src/tools/hash-generator/lib/hash.ts`, `src/tools/hash-generator/lib/hash.test.ts`, `test/e2e/p0-hash.spec.ts`

**Interfaces:**

- Produces:
  - `HASHES: readonly HashAlgorithm[]`, where `HashAlgorithm = { id: HashId; name: string; note?: string; run(data: Uint8Array): Promise<string> }`
  - `HMAC_ALGORITHMS: readonly { id: HmacId; name: string }[]`
  - `hmac(alg: HmacId, key: Uint8Array, data: Uint8Array): Promise<string>`
  - `decodeKey(key: string, enc: 'text' | 'hex' | 'base64'): Uint8Array`
- Consumes: `hash-wasm` (`md5, sha1, sha224, sha256, sha384, sha512, sha3, keccak, ripemd160, createHMAC, createMD5, createSHA1, createSHA256, createSHA384, createSHA512, createSHA3`, type `IHasher`); `encoding.ts`.

- [ ] **Step 0:** `npm view hash-wasm license` gives MIT; record it in the task report. Run `pnpm add hash-wasm`.
- [ ] **Step 1: Failing test** `lib/hash.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { utf8Encode } from '@/shared/lib/encoding';
import { decodeKey, hmac, HASHES } from './hash';

const run = (id: string, s: string) =>
  HASHES.find((h) => h.id === id)!.run(utf8Encode(s));

describe('hash algorithms (known-answer vectors)', () => {
  it('MD5 and SHA-256 of "abc"', async () => {
    expect(await run('md5', 'abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(await run('sha256', 'abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
  it('FIPS 202 SHA3-256 and SHA3-512 of "abc"', async () => {
    expect(await run('sha3-256', 'abc')).toBe(
      '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    );
    expect(await run('sha3-512', 'abc')).toBe(
      'b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0',
    );
  });
  it('Keccak-256 of "" (Ethereum) is labelled, not called SHA-3', async () => {
    expect(await run('keccak-256', '')).toBe(
      'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    );
    expect(HASHES.find((h) => h.id === 'keccak-256')!.name).toMatch(/Keccak/);
    expect(HASHES.some((h) => h.name === 'SHA-3')).toBe(false);
  });
});

describe('HMAC uses the key the user gives (RFC 2104 / RFC 4231 case 2)', () => {
  const data = utf8Encode('what do ya want for nothing?');
  it('HMAC-SHA256', async () => {
    expect(await hmac('sha256', decodeKey('Jefe', 'text'), data)).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });
  it('HMAC-MD5 with the key given as hex', async () => {
    expect(await hmac('md5', decodeKey('4a656665', 'hex'), data)).toBe(
      '750c783e6ab0b503eaa86e310a5db738',
    );
  });
  it('HMAC-SHA512 with the key given as Base64', async () => {
    expect(await hmac('sha512', decodeKey('SmVmZQ==', 'base64'), data)).toBe(
      '164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737',
    );
  });
  it('a different key gives a different MAC (no hard-coded key)', async () => {
    const a = await hmac('sha256', decodeKey('key', 'text'), data);
    const b = await hmac('sha256', decodeKey('Jefe', 'text'), data);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3: Implement** `lib/hash.ts`:

```ts
import {
  createHMAC,
  createMD5,
  createSHA1,
  createSHA256,
  createSHA3,
  createSHA384,
  createSHA512,
  keccak,
  md5,
  ripemd160,
  sha1,
  sha224,
  sha256,
  sha3,
  sha384,
  sha512,
  type IHasher,
} from 'hash-wasm';
import { base64ToBytes, hexToBytes, utf8Encode } from '@/shared/lib/encoding';

export type HashId =
  | 'md5'
  | 'sha1'
  | 'sha224'
  | 'sha256'
  | 'sha384'
  | 'sha512'
  | 'sha3-256'
  | 'sha3-512'
  | 'keccak-256'
  | 'ripemd160';

export interface HashAlgorithm {
  id: HashId;
  name: string;
  note?: string;
  run(data: Uint8Array): Promise<string>;
}

export const HASHES: readonly HashAlgorithm[] = [
  { id: 'md5', name: 'MD5', note: 'Broken for security', run: (d) => md5(d) },
  {
    id: 'sha1',
    name: 'SHA-1',
    note: 'Broken for security',
    run: (d) => sha1(d),
  },
  { id: 'sha224', name: 'SHA-224', run: (d) => sha224(d) },
  { id: 'sha256', name: 'SHA-256', run: (d) => sha256(d) },
  { id: 'sha384', name: 'SHA-384', run: (d) => sha384(d) },
  { id: 'sha512', name: 'SHA-512', run: (d) => sha512(d) },
  { id: 'sha3-256', name: 'SHA3-256', run: (d) => sha3(d, 256) },
  { id: 'sha3-512', name: 'SHA3-512', run: (d) => sha3(d, 512) },
  {
    id: 'keccak-256',
    name: 'Keccak-256 (Ethereum)',
    note: 'Original Keccak padding, as used by Ethereum; differs from SHA3-256',
    run: (d) => keccak(d, 256),
  },
  { id: 'ripemd160', name: 'RIPEMD-160', run: (d) => ripemd160(d) },
];

export type HmacId =
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'sha384'
  | 'sha512'
  | 'sha3-256';

const HMAC_HASHERS: Record<HmacId, () => Promise<IHasher>> = {
  md5: createMD5,
  sha1: createSHA1,
  sha256: createSHA256,
  sha384: createSHA384,
  sha512: createSHA512,
  'sha3-256': () => createSHA3(256),
};

export const HMAC_ALGORITHMS: readonly { id: HmacId; name: string }[] = [
  { id: 'sha256', name: 'HMAC-SHA256' },
  { id: 'sha384', name: 'HMAC-SHA384' },
  { id: 'sha512', name: 'HMAC-SHA512' },
  { id: 'sha3-256', name: 'HMAC-SHA3-256' },
  { id: 'sha1', name: 'HMAC-SHA1' },
  { id: 'md5', name: 'HMAC-MD5' },
];

export async function hmac(
  alg: HmacId,
  key: Uint8Array,
  data: Uint8Array,
): Promise<string> {
  const h = await createHMAC(HMAC_HASHERS[alg](), key);
  h.init();
  h.update(data);
  return h.digest('hex');
}

export type KeyEncoding = 'text' | 'hex' | 'base64';

export function decodeKey(key: string, enc: KeyEncoding): Uint8Array {
  if (enc === 'hex') return hexToBytes(key);
  if (enc === 'base64') return base64ToBytes(key);
  return utf8Encode(key);
}
```

- [ ] **Step 4: Tool UI** (`Tool.tsx`).
  - Remove `crypto-js`.
  - **Section "Hashes":** the existing input `Textarea` and `Select` (All algorithms or one). An effect computes the selected `HASHES` with a `cancelled` flag (async), stores `Record<HashId, string>`, and renders each in the existing result cards. A `Badge` shows `note` ("Broken for security", warning tone).
  - **Section "HMAC"** (new `Card`): `Input` "Secret key" (type password with a show toggle), `Select` "Key format" (Text, Hex, Base64), `Select` "Algorithm" (`HMAC_ALGORITHMS`), result card with Copy.
  - With no key it shows "Enter a key to compute an HMAC". It never computes with a default key.
  - Key decode errors (bad hex or Base64) show `Alert status="danger"` with the `ToolError` message.
  - Replace `console.error` with `toToolError` plus `Alert`.
- [ ] **Step 5: E2E** `test/e2e/p0-hash.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('HMAC uses the entered key', async ({ page }) => {
  await page.goto('/hash-generator');
  await page.getByLabel('Text to hash').fill('what do ya want for nothing?');
  await page.getByLabel('Secret key').fill('Jefe');
  await expect(
    page.getByText(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    ),
  ).toBeVisible();
});

test('SHA3-256 matches FIPS 202', async ({ page }) => {
  await page.goto('/hash-generator');
  await page.getByLabel('Text to hash').fill('abc');
  await expect(
    page.getByText(
      '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
    ),
  ).toBeVisible();
});
```

- [ ] **Step 6:** Run the unit test and e2e. Expect PASS. Then lint and typecheck.
- [ ] **Step 7: Commit** `fix(hash): keyed HMAC, real SHA-3 and labelled Keccak via hash-wasm`.

### Task P0-4: `TIMEOUT` code and the killable worker client

**Files:**

- Modify: `src/shared/lib/errors.ts` (add `'TIMEOUT'` to `ToolErrorCode`)
- Create: `src/shared/lib/killable-client.ts`, `src/shared/lib/killable-client.test.ts`

**Interfaces:**

- Produces:
  - `createKillableClient<H extends RpcHandlers>(connect: () => RpcEndpoint, defaults?: { timeoutMs?: number }): KillableClient<H>`
  - `KillableClient<H>.call(method, args, opts?: CallOptions & { timeoutMs?: number; timeoutMessage?: string }): Promise<Result>`
  - `KillableClient<H>.terminate()`
- Consumes: `createRpcClient`, `RpcClient`, `RpcEndpoint`, `RpcHandlers`, `CallOptions`, `Transferred` from `@/shared/lib/worker-rpc`.

- [ ] **Step 0:** Confirm that `RpcClient.terminate()` rejects pending calls with `CANCELLED` (`worker-rpc.ts`, the `terminate()` near line 345).
- [ ] **Step 1: Failing test** `killable-client.test.ts` (same harness as `src/pdf/qpdf/client.test.ts`):

```ts
import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';
import { exposeRpc, type RpcEndpoint } from './worker-rpc';
import { createKillableClient } from './killable-client';

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

const handlers = {
  echo: (_ctx: unknown, s: string) => s,
  hang: () => new Promise<never>(() => {}),
};

function setup(timeoutMs?: number) {
  let workers = 0;
  let terminated = 0;
  const client = createKillableClient<typeof handlers>(
    () => {
      workers++;
      const channel = new MessageChannel();
      channels.push(channel);
      exposeRpc(handlers, channel.port2 as unknown as RpcEndpoint);
      channel.port1.start();
      channel.port2.start();
      const port = channel.port1;
      return {
        postMessage: (m, t) => port.postMessage(m, t as never),
        addEventListener: (type, l) =>
          port.addEventListener(type as 'message', l as never),
        removeEventListener: (type, l) =>
          port.removeEventListener(type as 'message', l as never),
        terminate: () => {
          terminated++;
          port.close();
        },
      } satisfies RpcEndpoint;
    },
    { timeoutMs },
  );
  return { client, workers: () => workers, terminated: () => terminated };
}

describe('killable client', () => {
  it('returns results normally and reuses the worker', async () => {
    const { client, workers } = setup(1000);
    await expect(client.call('echo', ['a'])).resolves.toBe('a');
    await expect(client.call('echo', ['b'])).resolves.toBe('b');
    expect(workers()).toBe(1);
  });
  it('times out with TIMEOUT, kills the worker, and the next call gets a fresh one', async () => {
    const { client, workers, terminated } = setup(50);
    await expect(
      client.call('hang', [], { timeoutMessage: 'Too slow' }),
    ).rejects.toMatchObject({ code: 'TIMEOUT', message: 'Too slow' });
    expect(terminated()).toBe(1);
    await expect(client.call('echo', ['ok'])).resolves.toBe('ok');
    expect(workers()).toBe(2);
  });
  it('a per-call timeout overrides the default', async () => {
    const { client } = setup(10_000);
    await expect(
      client.call('hang', [], { timeoutMs: 30 }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('aborting a running call cancels it and replaces the worker', async () => {
    const { client, workers } = setup();
    const ctrl = new AbortController();
    const p = client.call('hang', [], { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(client.call('echo', ['x'])).resolves.toBe('x');
    expect(workers()).toBe(2);
  });
});
```

- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3: Implement** `killable-client.ts`:

```ts
import { ToolError } from './errors';
import {
  createRpcClient,
  type CallOptions,
  type RpcClient,
  type RpcEndpoint,
  type RpcHandlers,
  type Transferred,
} from './worker-rpc';

type Args<F> = F extends (ctx: never, ...args: infer A) => unknown ? A : never;
type Result<F> = F extends (...a: never[]) => infer R
  ? Awaited<R> extends Transferred<infer V>
    ? V
    : Awaited<R>
  : never;

export interface KillableCallOptions extends CallOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

export interface KillableClient<H extends RpcHandlers> {
  call<K extends keyof H & string>(
    method: K,
    args: Args<H[K]>,
    opts?: KillableCallOptions,
  ): Promise<Result<H[K]>>;
  terminate(): void;
}

/**
 * For work that cannot be interrupted from inside (a backtracking regex, a
 * synchronous wasm call): on timeout, or on abort while running, the worker
 * is terminated and the next call starts a fresh one. Generalises the
 * restart pattern in pdf/qpdf/client.ts.
 */
export function createKillableClient<H extends RpcHandlers>(
  connect: () => RpcEndpoint,
  defaults: { timeoutMs?: number } = {},
): KillableClient<H> {
  let client: RpcClient<H> = createRpcClient<H>(connect);
  const replace = (owner: RpcClient<H>) => {
    if (client !== owner) return;
    owner.terminate();
    client = createRpcClient<H>(connect);
  };

  return {
    call(method, args, opts = {}) {
      const owner = client;
      const timeoutMs = opts.timeoutMs ?? defaults.timeoutMs;
      let settled = false;
      const onAbort = () => {
        if (!settled) replace(owner);
      };
      if (!opts.signal?.aborted)
        opts.signal?.addEventListener('abort', onAbort, { once: true });
      const work = owner.call(method, args as never, opts) as Promise<
        Result<H[typeof method]>
      >;
      const timed =
        timeoutMs === undefined
          ? work
          : new Promise<Result<H[typeof method]>>((resolve, reject) => {
              const timer = setTimeout(() => {
                if (settled) return;
                replace(owner);
                reject(
                  new ToolError(
                    'TIMEOUT',
                    opts.timeoutMessage ??
                      `This took longer than ${timeoutMs / 1000} s and was stopped`,
                  ),
                );
              }, timeoutMs);
              work.then(
                (v) => {
                  clearTimeout(timer);
                  resolve(v);
                },
                (e: unknown) => {
                  clearTimeout(timer);
                  reject(e);
                },
              );
            });
      return timed.finally(() => {
        settled = true;
        opts.signal?.removeEventListener('abort', onAbort);
      });
    },
    terminate() {
      client.terminate();
    },
  };
}
```

- [ ] **Step 4:** Add `| 'TIMEOUT'` to `ToolErrorCode` in `errors.ts`, with the comment `// a worker job exceeded its time budget (killable-client)`. Run the tests. Expect PASS. Then lint and typecheck (`Transferred` must be exported as a type from `worker-rpc.ts`; it is a class export already).
- [ ] **Step 5: Commit** `feat(shared): TIMEOUT error code and a killable worker client`.

### Task P0-5: Regex: worker with a 1 s timeout and correct code export

**Files:**

- Create:
  - `src/tools/regex-tester/lib/engine.ts`, `lib/engine.test.ts`
  - `lib/handlers.ts`, `lib/regex.worker.ts`
  - `lib/client.ts`
  - `lib/code.ts`, `lib/code.test.ts`
  - `hooks/useRegexRun.ts`
  - `test/e2e/p0-regex.spec.ts`
- Modify: `src/tools/regex-tester/Tool.tsx` (replace the matching `useEffect` at about lines 310–361 and the code strings at 368 and 461)

**Interfaces:**

- Produces:
  - `runRegex(pattern, flags, text, limit = 1000): { matches: RegexMatch[]; truncated: boolean }` (throws `INVALID_INPUT`)
  - `RegexMatch = { text; index; length; groups: (string | undefined)[] | null; namedGroups: Record<string, string | undefined> | null }`
  - `createRegexRunner(connect?)` returning `run(pattern, flags, text, signal?)`
  - `REGEX_TIMEOUT_MS = 1000`
  - `useRegexRun(pattern, flags, text)` returning `{ matches, truncated, error: ToolError | null, running }`
  - `toRegexLiteral(pattern, flags)`, `toJsSnippet(pattern, flags, text)`
- Consumes: `createKillableClient` (P0-4), `exposeRpc`, `RpcEndpoint`.

- [ ] **Step 1: Failing tests.**

`lib/engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { runRegex } from './engine';

describe('runRegex', () => {
  it('collects global matches with groups and named groups', () => {
    const r = runRegex('(?<y>\\d{4})-(\\d{2})', 'g', 'a 2024-01 b 1999-12');
    expect(r.matches.map((m) => m.text)).toEqual(['2024-01', '1999-12']);
    expect(r.matches[0]).toMatchObject({
      index: 2,
      length: 7,
      groups: ['2024', '01'],
      namedGroups: { y: '2024' },
    });
  });
  it('returns the first match only without the g flag', () => {
    expect(runRegex('a', '', 'aaa').matches).toHaveLength(1);
  });
  it('advances past empty matches (and past a surrogate pair with u)', () => {
    expect(runRegex('', 'g', 'ab').matches).toHaveLength(3);
    const astral = String.fromCodePoint(0x1f600);
    expect(runRegex('', 'gu', astral).matches).toHaveLength(2);
  });
  it('caps at the limit and reports truncation', () => {
    const r = runRegex('a', 'g', 'a'.repeat(50), 10);
    expect(r).toMatchObject({ truncated: true });
    expect(r.matches).toHaveLength(10);
  });
  it('reports a syntax error as INVALID_INPUT', () => {
    expect(() => runRegex('(', 'g', 'x')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});
```

`lib/code.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toJsSnippet, toRegexLiteral } from './code';

describe('code export', () => {
  it('escapes slashes and line terminators in the literal', () => {
    expect(toRegexLiteral('a/b\nc', 'g')).toBe('/a\\/b\\nc/g');
    expect(toRegexLiteral('a\\/b', '')).toBe('/a\\/b/');
    expect(toRegexLiteral('', 'g')).toBe('/(?:)/g');
  });
  it('produces JavaScript that runs and finds the same matches', () => {
    const text = "x a/b\n'y' a/b";
    const snippet = toJsSnippet('a/b', 'g', text);
    const matches = new Function(
      `${snippet}\nreturn matches;`,
    )() as RegExpMatchArray[];
    expect(matches.map((m) => m[0])).toEqual(['a/b', 'a/b']);
  });
  it('uses match() without the g flag', () => {
    const snippet = toJsSnippet('\\d+', '', 'n=42');
    expect(
      (new Function(`${snippet}\nreturn matches;`)() as RegExpMatchArray)[0],
    ).toBe('42');
  });
});
```

- [ ] **Step 2:** Run both. Expect FAIL.
- [ ] **Step 3: Implement.**

`lib/engine.ts`:

```ts
import { ToolError } from '@/shared/lib/errors';

export interface RegexMatch {
  text: string;
  index: number;
  length: number;
  groups: (string | undefined)[] | null;
  namedGroups: Record<string, string | undefined> | null;
}

export const MATCH_LIMIT = 1000;

export function runRegex(
  pattern: string,
  flags: string,
  text: string,
  limit = MATCH_LIMIT,
): { matches: RegexMatch[]; truncated: boolean } {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      cause instanceof Error ? cause.message : 'Invalid regular expression',
      { cause },
    );
  }
  const toMatch = (m: RegExpExecArray): RegexMatch => ({
    text: m[0],
    index: m.index,
    length: m[0].length,
    groups: m.length > 1 ? m.slice(1) : null,
    namedGroups: m.groups ? { ...m.groups } : null,
  });
  if (!regex.global) {
    const m = regex.exec(text);
    return { matches: m ? [toMatch(m)] : [], truncated: false };
  }
  const unicode = regex.unicode || regex.unicodeSets;
  const matches: RegexMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (matches.length === limit) return { matches, truncated: true };
    matches.push(toMatch(m));
    if (m[0].length === 0) {
      const cp = unicode ? text.codePointAt(m.index) : undefined;
      regex.lastIndex = m.index + (cp !== undefined && cp > 0xffff ? 2 : 1);
    }
  }
  return { matches, truncated: false };
}
```

`lib/handlers.ts`: `export const regexHandlers = { run: (_ctx: RpcContext, pattern: string, flags: string, text: string) => runRegex(pattern, flags, text) }; export type RegexHandlers = typeof regexHandlers;`

`lib/regex.worker.ts`: `exposeRpc(regexHandlers, self as unknown as RpcEndpoint);`

`lib/client.ts`:

```ts
import { createKillableClient } from '@/shared/lib/killable-client';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import type { RegexHandlers } from './handlers';

export const REGEX_TIMEOUT_MS = 1000;
export const TIMEOUT_MESSAGE =
  'The pattern took longer than 1 second on this text (possible catastrophic backtracking). Simplify the pattern or shorten the text.';

export function createRegexRunner(
  connect: () => RpcEndpoint = () =>
    new Worker(new URL('./regex.worker.ts', import.meta.url), {
      type: 'module',
    }),
) {
  const client = createKillableClient<RegexHandlers>(connect, {
    timeoutMs: REGEX_TIMEOUT_MS,
  });
  return (pattern: string, flags: string, text: string, signal?: AbortSignal) =>
    client.call('run', [pattern, flags, text], {
      signal,
      timeoutMessage: TIMEOUT_MESSAGE,
    });
}
```

`hooks/useRegexRun.ts`:

- Module-level `const run = createRegexRunner()`, created lazily on first use.
- State: `{ matches, truncated, error, running }`.
- An effect on `[pattern, flags, text]`:
  1. With an empty pattern or text, reset immediately.
  2. Otherwise start a 150 ms `setTimeout` that creates an `AbortController`, sets `running`, and calls `run(...)`.
  3. Results apply only if the controller is not aborted. Errors go through `toToolError`.
  4. The cleanup clears the timer and aborts the controller.

`lib/code.ts`:

```ts
/** `/pattern/flags`, valid as a JavaScript literal. */
export function toRegexLiteral(pattern: string, flags: string): string {
  if (pattern === '') return `/(?:)/${flags}`;
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\') {
      out += c + (pattern[i + 1] ?? '');
      i++;
    } else if (c === '/') out += '\\/';
    else if (c === '\n') out += '\\n';
    else if (c === '\r') out += '\\r';
    else if (c === ' ') out += '\\u2028';
    else if (c === ' ') out += '\\u2029';
    else out += c;
  }
  return `/${out}/${flags}`;
}

export function toJsSnippet(
  pattern: string,
  flags: string,
  text: string,
): string {
  const call = flags.includes('g')
    ? '[...text.matchAll(regex)]'
    : 'text.match(regex)';
  return `const regex = ${toRegexLiteral(pattern, flags)};\nconst text = ${JSON.stringify(text)};\nconst matches = ${call};\n`;
}
```

- [ ] **Step 4: Tool.**
  - Replace the matching `useEffect` with `const { matches, truncated, error, running } = useRegexRun(pattern, flagsStr, testString)`.
  - Map the state:
    - `isValid = error?.code !== 'INVALID_INPUT'`.
    - `errorMessage = error?.message`.
    - When `error?.code === 'TIMEOUT'`, render `Alert status="warning"` titled "Pattern took too long" with the message, and keep the previous highlights cleared.
    - Show `Spinner` (small) while `running` exceeds 300 ms (a timer flag).
    - Show the existing "Showing first 100 of n" note, plus "Stopped at 1,000 matches" when `truncated`.
  - `copyPattern` uses `toRegexLiteral(pattern, flagsStr)`; the "Copy as JS" handler (line about 461) uses `toJsSnippet(pattern, flagsStr, testString)`.
- [ ] **Step 5: E2E** `test/e2e/p0-regex.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('catastrophic backtracking times out and the page stays responsive', async ({
  page,
}) => {
  await page.goto('/regex-tester');
  await page.getByLabel('Test string').fill(`${'a'.repeat(32)}!`);
  await page.getByLabel('Regular expression').fill('(a+)+$');
  await expect(page.getByText('Pattern took too long')).toBeVisible({
    timeout: 3000,
  });
  // The main thread is free: typing still updates the field immediately.
  await page.getByLabel('Regular expression').fill('a+');
  await expect(page.getByText('Pattern took too long')).toBeHidden();
});
```

- [ ] **Step 6:** Run the unit tests and e2e. Expect PASS. Then lint and typecheck. Confirm in the build output that `regex.worker` becomes its own chunk.
- [ ] **Step 7: Commit** `fix(regex): run patterns in a worker with a 1 s timeout; correct code export escaping`.

### Task P0-6: JWT: UTF-8 decoding, token clean-up, JWE detection, honest time status

**Files:**

- Create: `src/tools/jwt-decode/lib/decode.ts`, `lib/decode.test.ts`, `lib/time-status.ts`, `lib/time-status.test.ts`, `hooks/useNow.ts`
- Modify: `src/tools/jwt-decode/hooks/useJwtDecoder.ts`, `src/tools/jwt-decode/Tool.tsx` (the banner at about lines 715–745 and the claim rows at about 434–462)

**Interfaces:**

- Produces:
  - `normalizeToken(raw): string`
  - `decodeJwt(raw): DecodedJWT` (throws `INVALID_INPUT` or `UNSUPPORTED_FEATURE`)
  - `timeStatus(payload, nowSec, skewSec = 0): { exp: 'ok' | 'expired' | 'absent'; nbf: 'ok' | 'not-yet-valid' | 'absent'; iat: 'ok' | 'issued-in-future' | 'absent' }`
  - `formatDuration(seconds): string` (`"4 min 12 s"`, `"2 d 3 h"`)
  - `useNow(intervalMs): number` (ms; ticks)
- Consumes: `base64ToBytes`, `utf8Decode`, `bytesToBase64`, `utf8Encode` (P0-1).

- [ ] **Step 1: Failing tests.**

`lib/decode.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decodeJwt, normalizeToken } from './decode';

const CLASSIC =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

describe('decodeJwt', () => {
  it('decodes UTF-8 claims (atob would garble them)', () => {
    const t = `eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSm9zw6kg5ryi5a2XIn0.sig`;
    expect(decodeJwt(t).payload.name).toBe('José 漢字');
  });
  it('strips a Bearer prefix, quotes and whitespace', () => {
    expect(normalizeToken(` Bearer "${CLASSIC}"\n`)).toBe(CLASSIC);
    expect(decodeJwt(`Bearer ${CLASSIC}`).header.alg).toBe('HS256');
  });
  it('recognises an encrypted token (JWE)', () => {
    expect(() => decodeJwt('a.b.c.d.e')).toThrow(
      expect.objectContaining({
        code: 'UNSUPPORTED_FEATURE',
        message: expect.stringMatching(/encrypted token \(JWE\)/),
      }),
    );
  });
  it('explains the wrong part count, bad Base64url and bad JSON', () => {
    expect(() => decodeJwt('a.b')).toThrow(/3 parts/);
    expect(() => decodeJwt('$$$.e30.x')).toThrow(
      /header is not valid Base64url/,
    );
    expect(() => decodeJwt('bm90IGpzb24.e30.x')).toThrow(
      /header is not valid JSON/,
    );
    expect(() => decodeJwt('e30.e30.x')).toThrow(/"alg"/);
  });
});
```

`lib/time-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDuration, timeStatus } from './time-status';

describe('timeStatus', () => {
  const now = 1_700_000_000;
  it('reports each claim independently', () => {
    expect(
      timeStatus({ exp: now + 60, nbf: now - 1, iat: now - 5 }, now),
    ).toEqual({ exp: 'ok', nbf: 'ok', iat: 'ok' });
    expect(timeStatus({ exp: now - 1 }, now).exp).toBe('expired');
    expect(timeStatus({ nbf: now + 100 }, now).nbf).toBe('not-yet-valid');
    expect(timeStatus({ iat: now + 100 }, now).iat).toBe('issued-in-future');
    expect(timeStatus({}, now)).toEqual({
      exp: 'absent',
      nbf: 'absent',
      iat: 'absent',
    });
  });
  it('applies clock skew', () => {
    expect(timeStatus({ exp: now - 30 }, now, 60).exp).toBe('ok');
    expect(timeStatus({ nbf: now + 30 }, now, 60).nbf).toBe('ok');
  });
  it('ignores non-numeric claims', () => {
    expect(timeStatus({ exp: 'soon' }, now).exp).toBe('absent');
  });
  it('formats durations compactly', () => {
    expect(formatDuration(252)).toBe('4 min 12 s');
    expect(formatDuration(183_600)).toBe('2 d 3 h');
    expect(formatDuration(0)).toBe('0 s');
  });
});
```

- [ ] **Step 2:** Run both. Expect FAIL.
- [ ] **Step 3: Implement.**
  - **`decode.ts`:**
    - `normalizeToken` trims, removes `/^bearer\s+/i`, strips one pair of surrounding quotes, and removes all whitespace.
    - `decodeJwt`:
      - 5 parts gives `UNSUPPORTED_FEATURE` "This is an encrypted token (JWE). Its payload cannot be decoded without the key."
      - Not 3 parts gives `INVALID_INPUT` "A JWT has 3 parts separated by dots; this has N."
      - Each part is decoded via `utf8Decode(base64ToBytes(part))`, then `JSON.parse`, with the error wording from the tests.
      - The header must be an object with a string `alg`, else "The header has no "alg" field".
      - Returns the existing `DecodedJWT` shape with `raw` set to the normalised token.
  - **`time-status.ts`:**
    - Numeric checks use `typeof v === 'number' && Number.isFinite(v)`.
    - `exp` is expired when `now - skew >= exp`; `nbf` is not yet valid when `now + skew < nbf`; `iat` is in the future when `iat > now + skew`.
    - `formatDuration` gives the two largest non-zero units among d, h, min, s (and "0 s" for zero).
  - **`useNow.ts`:** `useState(Date.now)` with a `setInterval` and cleanup.
  - **`useJwtDecoder.ts`:** calls `decodeJwt` in a try and stores `toToolError(e)` (`error` becomes a `ToolError | null`). The Tool shows `error.message`.
  - **Tool banner:** remove "Token valid" entirely. New status block (kit `Alert`, tone from the worst state):
    - Line 1 is the signature state (P0-7 fills it in; in this task it always says "Signature not checked: paste the secret or public key below to verify").
    - Line 2 lists the time claims from `timeStatus(payload, now / 1000)` with live text: "Expires in 4 min 12 s", "Expired 3 h ago", "Not valid until <date>", or "No expiry (exp) claim".
    - `now` comes from `useNow(1000)`.
  - **Claim rows:** use the same live values.
- [ ] **Step 4:** Run the unit tests. Expect PASS. Run the existing e2e `test/e2e/legacy-tools.spec.ts` (jwt cases). Expect PASS. Then lint and typecheck.
- [ ] **Step 5: Commit** `fix(jwt): UTF-8 decoding, Bearer/quote clean-up, JWE notice and an honest live time status`.

### Task P0-7: JWT signature verification (WebCrypto)

**Files:**

- Create: `src/shared/lib/crypto/keys.ts`, `src/shared/lib/crypto/keys.test.ts`, `src/tools/jwt-decode/lib/verify.ts`, `src/tools/jwt-decode/lib/verify.test.ts`, `src/tools/jwt-decode/components/VerifyPanel.tsx`, `test/e2e/p0-jwt.spec.ts`
- Modify: `src/tools/jwt-decode/Tool.tsx` (mount `VerifyPanel`; feed its state into the banner line 1)

**Interfaces:**

- Produces:
  - `pemToDer(pem): { label: string; der: Uint8Array }` (throws `INVALID_INPUT`)
  - `derToPem(der, label): string`
  - `JwtKeyInput = { kind: 'secret'; value: string; encoding: 'text' | 'base64' | 'base64url' } | { kind: 'pem'; value: string } | { kind: 'jwk'; value: string }`
  - `SignatureState = 'verified' | 'invalid' | 'unsigned'`
  - `verifyJwt(decoded: DecodedJWT, key: JwtKeyInput): Promise<SignatureState>` (throws `INVALID_INPUT` or `UNSUPPORTED_FEATURE`)
  - `JWT_ALGORITHMS` (the supported list)
- Consumes: `crypto.subtle`; `encoding.ts`; `decodeJwt` (P0-6).

- [ ] **Step 1: Failing tests.**

`crypto/keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { derToPem, pemToDer } from './keys';

describe('PEM', () => {
  it('round-trips DER through PEM with 64-column lines', () => {
    const der = Uint8Array.from({ length: 100 }, (_, i) => i);
    const pem = derToPem(der, 'PUBLIC KEY');
    expect(pem.split('\n')[0]).toBe('-----BEGIN PUBLIC KEY-----');
    expect(pem.split('\n')[1]).toHaveLength(64);
    expect(pemToDer(pem)).toEqual({ label: 'PUBLIC KEY', der });
  });
  it('rejects text without PEM armour', () => {
    expect(() => pemToDer('abc')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});
```

`lib/verify.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bytesToBase64, utf8Encode } from '@/shared/lib/encoding';
import { derToPem } from '@/shared/lib/crypto/keys';
import { decodeJwt } from './decode';
import { verifyJwt } from './verify';

const CLASSIC =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const b64u = (b: Uint8Array) =>
  bytesToBase64(b, { urlSafe: true, padding: false });
const part = (o: object) => b64u(utf8Encode(JSON.stringify(o)));

async function signed(
  alg: string,
  gen: AlgorithmIdentifier | RsaHashedKeyGenParams | EcKeyGenParams,
  sign: AlgorithmIdentifier | RsaPssParams | EcdsaParams,
  kid?: string,
) {
  const pair = (await crypto.subtle.generateKey(gen, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const input = `${part({ alg, typ: 'JWT', ...(kid ? { kid } : {}) })}.${part({ sub: 'u1' })}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign(sign, pair.privateKey, utf8Encode(input)),
  );
  const spki = new Uint8Array(
    await crypto.subtle.exportKey('spki', pair.publicKey),
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return {
    token: `${input}.${b64u(sig)}`,
    pem: derToPem(spki, 'PUBLIC KEY'),
    jwk,
  };
}

const tamper = (t: string) => {
  const [h, , s] = t.split('.');
  return `${h}.${part({ sub: 'attacker' })}.${s}`;
};

describe('verifyJwt', () => {
  it('HS256: verified with the right secret, invalid with a wrong one', async () => {
    const d = decodeJwt(CLASSIC);
    await expect(
      verifyJwt(d, {
        kind: 'secret',
        value: 'your-256-bit-secret',
        encoding: 'text',
      }),
    ).resolves.toBe('verified');
    await expect(
      verifyJwt(d, { kind: 'secret', value: 'nope', encoding: 'text' }),
    ).resolves.toBe('invalid');
  });
  const rsa = { modulusLength: 2048, publicExponent: Uint8Array.of(1, 0, 1) };
  const cases: [
    string,
    Parameters<typeof signed>[1],
    Parameters<typeof signed>[2],
  ][] = [
    [
      'RS256',
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', ...rsa },
      { name: 'RSASSA-PKCS1-v1_5' },
    ],
    [
      'PS384',
      { name: 'RSA-PSS', hash: 'SHA-384', ...rsa },
      { name: 'RSA-PSS', saltLength: 48 },
    ],
    [
      'ES256',
      { name: 'ECDSA', namedCurve: 'P-256' },
      { name: 'ECDSA', hash: 'SHA-256' },
    ],
    [
      'ES512',
      { name: 'ECDSA', namedCurve: 'P-521' },
      { name: 'ECDSA', hash: 'SHA-512' },
    ],
    ['EdDSA', { name: 'Ed25519' }, { name: 'Ed25519' }],
  ];
  for (const [alg, gen, sign] of cases) {
    it(`${alg}: verifies with PEM and JWK, rejects a tampered payload`, async () => {
      const s = await signed(alg, gen, sign);
      await expect(
        verifyJwt(decodeJwt(s.token), { kind: 'pem', value: s.pem }),
      ).resolves.toBe('verified');
      await expect(
        verifyJwt(decodeJwt(s.token), {
          kind: 'jwk',
          value: JSON.stringify(s.jwk),
        }),
      ).resolves.toBe('verified');
      await expect(
        verifyJwt(decodeJwt(tamper(s.token)), { kind: 'pem', value: s.pem }),
      ).resolves.toBe('invalid');
    }, 20_000);
  }
  it('picks the key from a JWKS by kid', async () => {
    const a = await signed(
      'ES256',
      { name: 'ECDSA', namedCurve: 'P-256' },
      { name: 'ECDSA', hash: 'SHA-256' },
      'k2',
    );
    const other = await signed(
      'ES256',
      { name: 'ECDSA', namedCurve: 'P-256' },
      { name: 'ECDSA', hash: 'SHA-256' },
      'k1',
    );
    const jwks = JSON.stringify({
      keys: [
        { ...other.jwk, kid: 'k1' },
        { ...a.jwk, kid: 'k2' },
      ],
    });
    await expect(
      verifyJwt(decodeJwt(a.token), { kind: 'jwk', value: jwks }),
    ).resolves.toBe('verified');
  });
  it('reports alg none as unsigned, and refuses mismatched key kinds', async () => {
    const none = `${part({ alg: 'none' })}.${part({})}.`;
    await expect(
      verifyJwt(decodeJwt(none), {
        kind: 'secret',
        value: 'x',
        encoding: 'text',
      }),
    ).resolves.toBe('unsigned');
    await expect(
      verifyJwt(decodeJwt(CLASSIC), {
        kind: 'pem',
        value: '-----BEGIN PUBLIC KEY-----\nAA==\n-----END PUBLIC KEY-----',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('refuses a certificate with a helpful message', async () => {
    const rs = `${part({ alg: 'RS256' })}.${part({})}.AA`;
    await expect(
      verifyJwt(decodeJwt(rs), {
        kind: 'pem',
        value: '-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----',
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FEATURE' });
  });
});
```

- [ ] **Step 2:** Run both. Expect FAIL.
- [ ] **Step 3: Implement.**
  - **`crypto/keys.ts`:**
    - `pemToDer` matches `/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/`, else `INVALID_INPUT` "Paste a PEM block (-----BEGIN PUBLIC KEY----- ...)". The label is group 1; the DER is `base64ToBytes(group2)`.
    - `derToPem` wraps the Base64 at 64 columns.
  - **`verify.ts`:** a table `alg` to `{ import: HmacImportParams | RsaHashedImportParams | EcKeyImportParams | Algorithm; verify: AlgorithmIdentifier | RsaPssParams | EcdsaParams; family: 'hmac' | 'rsa' | 'ec' | 'okp' }`:

| alg           | import params                                            | verify params                               |
| ------------- | -------------------------------------------------------- | ------------------------------------------- |
| HS256/384/512 | `{ name: 'HMAC', hash: 'SHA-256' }` (etc.)               | `'HMAC'`                                    |
| RS256/384/512 | `{ name: 'RSASSA-PKCS1-v1_5', hash }`                    | `'RSASSA-PKCS1-v1_5'`                       |
| PS256/384/512 | `{ name: 'RSA-PSS', hash }`                              | `{ name: 'RSA-PSS', saltLength: 32/48/64 }` |
| ES256/384/512 | `{ name: 'ECDSA', namedCurve: 'P-256'/'P-384'/'P-521' }` | `{ name: 'ECDSA', hash }`                   |
| EdDSA         | `{ name: 'Ed25519' }`                                    | `'Ed25519'`                                 |

- **`verifyJwt` steps:**
  1. `alg === 'none'` returns `'unsigned'`.
  2. An unknown alg gives `UNSUPPORTED_FEATURE` "Algorithm <alg> is not supported".
  3. Key-kind mismatch (a secret for a non-HMAC alg, or a PEM for HMAC) gives `INVALID_INPUT` "<alg> needs a shared secret" or "<alg> needs a public key (PEM or JWK)".
  4. PEM: label `CERTIFICATE` gives `UNSUPPORTED_FEATURE` "Paste the public key (BEGIN PUBLIC KEY), not a certificate"; label `RSA PUBLIC KEY` gives `UNSUPPORTED_FEATURE` "Convert this PKCS#1 key to SPKI (BEGIN PUBLIC KEY) first"; otherwise `importKey('spki', der, ...)`.
  5. JWK: `JSON.parse` (`INVALID_INPUT` on failure). If `keys` is an array, pick by `header.kid`; else, with one key, use it; else `INVALID_INPUT` "This JWKS has several keys and the token has no kid". Then `importKey('jwk', key, ...)`.
  6. Secret: `text` gives `utf8Encode`; `base64` and `base64url` give `base64ToBytes`.
  7. `importKey` failures: `NotSupportedError` gives `UNSUPPORTED_FEATURE` "This browser cannot verify <alg>"; others give `INVALID_INPUT` "This key could not be read for <alg>".
  8. `crypto.subtle.verify(verifyParams, key, base64ToBytes(sig), utf8Encode(\`${p0}.${p1}\`))`gives`'verified'`or`'invalid'`.
- **`VerifyPanel.tsx`** (existing kit only):
  - `Select` "Key type" (Shared secret, PEM public key, JWK or JWKS); `Textarea` "Secret or public key" (secret shown as password via an `Input type=password` with a show toggle when the type is a secret); `Select` "Secret encoding" (Text, Base64, Base64url) for secrets.
  - Verification runs live (300 ms debounce, cancelled-flag effect) whenever the key is non-empty.
  - The `onState(state: 'not-checked' | SignatureState, error?: ToolError)` callback feeds the banner.
  - Badges and wording: "Signature verified" (success), "Signature invalid" (danger), "Signature not checked" (neutral, no key), "Unsigned token (alg: none)" (warning). Errors appear in an `Alert` with the `ToolError` message.
- **Note:** "Nothing leaves your browser" (plain `Text` under the panel).
- [ ] **Step 4: E2E** `test/e2e/p0-jwt.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const CLASSIC =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

test('JWT never claims validity without verification, and verifies HS256', async ({
  page,
}) => {
  await page.goto('/jwt-decode');
  await page.getByLabel('JWT token').fill(CLASSIC);
  await expect(page.getByText('Token valid')).toHaveCount(0);
  await expect(page.getByText('Signature not checked').first()).toBeVisible();
  await page.getByLabel('Secret or public key').fill('your-256-bit-secret');
  await expect(page.getByText('Signature verified')).toBeVisible();
  await page.getByLabel('Secret or public key').fill('wrong');
  await expect(page.getByText('Signature invalid')).toBeVisible();
});
```

- [ ] **Step 5:** Run the unit tests and e2e. Expect PASS. Then lint and typecheck.
- [ ] **Step 6: Commit** `feat(jwt): verify HS/RS/PS/ES/EdDSA signatures locally with WebCrypto`.

### Task P0-8: CSV: delimiter detection, tolerant rows, no precision loss

**Files:**

- Modify: `src/tools/csv-viewer/lib/parse.ts`, `src/tools/csv-viewer/lib/parse.test.ts` (rewrite), `src/tools/csv-viewer/Tool.tsx` (the `loadJob` at about line 186 and a new delimiter `Select` plus issues `Alert`)
- Create: `test/e2e/p0-csv.spec.ts`

**Interfaces:**

- Produces:
  - `type Delimiter = ',' | ';' | '\t' | '|'`, `DELIMITERS`
  - `detectDelimiter(text, fileName?): Delimiter`
  - `coerceCell(raw: string): unknown`
  - `parseDelimited(content, delimiter): { data; columns; delimiter; issues: { row: number; message: string }[]; issueCount: number }` (throws only when no row parses)
  - `ISSUE_LIMIT = 100`
- `delimiterFor` is removed (its only caller is `Tool.tsx`).

- [ ] **Step 1: Failing tests** (replace the file):

```ts
import { describe, expect, it } from 'vitest';
import { coerceCell, detectDelimiter, parseDelimited } from './parse';

describe('detectDelimiter', () => {
  it.each([
    ['a,b,c\n1,2,3', ','],
    ['a;b;c\n1;2;3', ';'],
    ['x;y\n1,5;2,5\n3,0;4,1', ';'],
    ['a\tb\n1\t2', '\t'],
    ['a|b\n1|2', '|'],
    ['a,b\n"x;y;z",2', ','],
    ['name\nAda', ','],
  ])('%j uses %j', (text, expected) => {
    expect(detectDelimiter(text)).toBe(expected);
  });
  it('trusts a .tsv extension', () => {
    expect(detectDelimiter('a,b\n1,2', 'data.TSV')).toBe('\t');
  });
});

describe('coerceCell', () => {
  it('keeps identifiers that would lose information as text', () => {
    expect(coerceCell('00123')).toBe('00123');
    expect(coerceCell('12345678901234567')).toBe('12345678901234567');
    expect(coerceCell('2024-01-05')).toBe('2024-01-05');
  });
  it('types safe numbers, booleans and empties', () => {
    expect(coerceCell('42')).toBe(42);
    expect(coerceCell('-0.5')).toBe(-0.5);
    expect(coerceCell('1e3')).toBe(1000);
    expect(coerceCell('true')).toBe(true);
    expect(coerceCell('FALSE')).toBe(false);
    expect(coerceCell('')).toBeNull();
  });
});

describe('parseDelimited', () => {
  it('parses headers and skips empty lines', () => {
    expect(parseDelimited('name,age\nAda,36\n\nBob,7\n', ',')).toMatchObject({
      columns: ['name', 'age'],
      data: [
        { name: 'Ada', age: 36 },
        { name: 'Bob', age: 7 },
      ],
      issues: [],
      issueCount: 0,
    });
  });
  it('loads ragged rows anyway and lists them', () => {
    const r = parseDelimited('a,b\n1,2\n3\n4,5', ',');
    expect(r.data).toHaveLength(3);
    expect(r.data[1]).toEqual({ a: 3, b: null });
    expect(r.issueCount).toBe(1);
    expect(r.issues[0]).toMatchObject({
      row: 2,
      message: expect.stringMatching(/few/i),
    });
  });
  it('fails only when nothing parses', () => {
    expect(() => parseDelimited('', ',')).not.toThrow();
    expect(() => parseDelimited('"', ',')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});
```

(Verified against papaparse 5.5: `'"'` yields no data rows plus a `MissingQuotes` error, so the "nothing parses" branch throws. The ragged row reports `TooFewFields` at `row: 1`, which becomes data row 2.)

- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3: Implement** `parse.ts`:

```ts
import Papa from 'papaparse';
import { ToolError } from '@/shared/lib/errors';
import type { ParsedData } from '../types';

export type Delimiter = ',' | ';' | '\t' | '|';
export const DELIMITERS: readonly Delimiter[] = [',', ';', '\t', '|'];
export const ISSUE_LIMIT = 100;

const SAFE_NUMBER = /^-?(?:0|[1-9]\d{0,14})(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/** Typed value, unless typing would drop leading zeros or digits. */
export function coerceCell(raw: string): unknown {
  if (raw === '') return null;
  if (raw === 'true' || raw === 'TRUE') return true;
  if (raw === 'false' || raw === 'FALSE') return false;
  if (SAFE_NUMBER.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return raw;
}

export function detectDelimiter(text: string, fileName = ''): Delimiter {
  if (fileName.toLowerCase().endsWith('.tsv')) return '\t';
  const lines = text
    .slice(0, 64 * 1024)
    .replace(/"(?:[^"]|"")*"/g, '""')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .slice(0, 20);
  let best: Delimiter = ',';
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const counts = lines.map((l) => l.split(d).length - 1);
    const first = counts[0] ?? 0;
    if (first === 0) continue;
    const share = counts.filter((c) => c === first).length / counts.length;
    const score = first * share * share;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

export function parseDelimited(content: string, delimiter: Delimiter) {
  const r = Papa.parse<Record<string, string | undefined>>(content, {
    delimiter,
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });
  const columns = r.meta.fields ?? [];
  if (r.data.length === 0 && r.errors.length > 0) {
    throw new ToolError(
      'INVALID_INPUT',
      `Could not read any rows: ${r.errors[0].message}`,
    );
  }
  const data: ParsedData[] = r.data.map((row) => {
    const out: ParsedData = {};
    for (const c of columns) out[c] = coerceCell(row[c] ?? '');
    return out;
  });
  const issues = r.errors.slice(0, ISSUE_LIMIT).map((e) => ({
    row: (e.row ?? 0) + 1,
    message: e.message,
  }));
  return { data, columns, delimiter, issues, issueCount: r.errors.length };
}
```

- [ ] **Step 4: Tool.**
  - The `loadJob` keeps the raw `text` and `name` in state.
  - A `Select` "Delimiter" offers Auto (shows "Auto (semicolon)" with the detected one), Comma, Semicolon, Tab and Pipe.
  - The parse runs with `override ?? detectDelimiter(text, name)` (re-parsed on change, through `useMemo`).
  - When `issueCount > 0`, show an `Alert status="warning"`, "Loaded with N problem rows", with an `Accordion` listing up to 100 "Row r: message" lines and "and M more" when truncated.
- [ ] **Step 5: E2E** `test/e2e/p0-csv.spec.ts`: upload `{ name: 'eu.csv', mimeType: 'text/csv', buffer: Buffer.from('name;zip\nAda;00123\nBob;4\nCy') }`. Assert:
  - a cell with text `00123` is visible;
  - the `Delimiter` select shows "Auto (semicolon)";
  - the text "Loaded with 1 problem row" is visible (singular wording handled).
- [ ] **Step 6:** Run the tests. Expect PASS. Then lint and typecheck.
- [ ] **Step 7: Commit** `fix(csv): detect the delimiter, load ragged rows with a report, keep IDs exact`.

### Task P0-9: JSON & XML Viewer: search cannot crash; parse errors show line and column

**Files:**

- Create: `src/tools/json-and-xml-viewer/lib/search.ts`, `lib/json-error.ts`, `lib/p0.test.ts`
- Modify: `src/tools/json-and-xml-viewer/components/TreeView.tsx` (line 31 `new RegExp(searchTerm, 'i')` and its `.match` uses), `src/tools/json-and-xml-viewer/Tool.tsx` (the error display)

**Interfaces:**

- Produces:
  - `matchesTerm(value: unknown, term: string): boolean` (case-insensitive literal)
  - `locationFromMessage(text, message): { line: number; column: number } | null`
  - `jsonErrorLocation(text, error: unknown)`

- [ ] **Step 1: Failing test** `lib/p0.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { matchesTerm } from './search';
import { jsonErrorLocation, locationFromMessage } from './json-error';

describe('search', () => {
  it('treats regex metacharacters literally and never throws', () => {
    expect(() => matchesTerm('a(b', '(')).not.toThrow();
    expect(matchesTerm('a(b', '(')).toBe(true);
    expect(matchesTerm('price [usd]', '[USD]')).toBe(true);
    expect(matchesTerm(42, '4')).toBe(true);
    expect(matchesTerm(null, 'x')).toBe(false);
  });
});

describe('json error location', () => {
  const text = '{\n  "a": 1,\n}';
  it('reads "line X column Y" messages', () => {
    expect(
      locationFromMessage(text, 'Unexpected token (line 3 column 1)'),
    ).toEqual({ line: 3, column: 1 });
  });
  it('converts "at position N" to line and column', () => {
    expect(
      locationFromMessage(text, 'Unexpected token } in JSON at position 12'),
    ).toEqual({ line: 3, column: 1 });
  });
  it('works with the real JSON.parse error of this engine', () => {
    let err: unknown;
    try {
      JSON.parse(text);
    } catch (e) {
      err = e;
    }
    expect(jsonErrorLocation(text, err)).toEqual({ line: 3, column: 1 });
  });
});
```

- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3: Implement.**
  - `matchesTerm`: `value === null || typeof value === 'object' ? false : String(value).toLowerCase().includes(term.toLowerCase())`.
  - `locationFromMessage`: try `/line (\d+) column (\d+)/`. Else `/position (\d+)/`, computing the line as 1 plus the count of `\n` before the position, and the column as the position minus the last newline index. Else `null`.
  - `jsonErrorLocation(text, e)`: `e instanceof Error ? locationFromMessage(text, e.message) : null`.
  - **TreeView:** replace the regex with `matchesTerm(obj, searchTerm)` and `matchesTerm(nodeName, searchTerm)`.
  - **Tool:** where the JSON parse error is set, append ` (line ${l.line}, column ${l.column})` when located.
- [ ] **Step 4: E2E** (append to `test/e2e/legacy-tools.spec.ts`): fill valid JSON, type `(` into the search field, and assert that the tree is still visible and no error-boundary text ("Something went wrong") appears. Fill `{"a":1,}` and assert the text `line 1, column 8` is visible (the column follows the engine message; assert with `/line 1, column \d+/`).
- [ ] **Step 5:** Run the tests. Expect PASS. Then lint and typecheck.
- [ ] **Step 6: Commit** `fix(json-xml): literal search (no crash on brackets) and line/column on parse errors`.

### Task P0-10: Calculator: keyboard map with focus guard, angle mode in expressions, compiled grapher

**Files:**

- Create: `src/tools/calculator/lib/keys.ts`, `lib/keys.test.ts`, `lib/expression.ts`, `lib/expression.test.ts`
- Modify: `src/tools/calculator/hooks/useCalculator.ts` (the `handleKeyDown` at about lines 43–67 and `evaluateExpression` at about 466), `src/tools/calculator/components/GraphDisplay.tsx` (the sampling at about lines 50–70; the `step` input is removed)
- Create: `test/e2e/p0-calculator.spec.ts`

**Interfaces:**

- Produces:
  - `keyToAction(e: { key; ctrlKey; metaKey; altKey; target: EventTarget | null }): CalcKeyAction | null`
  - `CalcKeyAction = { type: 'digit'; digit: number } | { type: 'decimal' } | { type: 'operator'; op: '+' | '-' | '×' | '÷' | 'pow' } | { type: 'equals' } | { type: 'backspace' } | { type: 'clear-entry' } | { type: 'clear' } | { type: 'percent' }`
  - `evaluateExpression(expr, angle: AngleUnit): { value: number; text: string }` (throws `INVALID_INPUT`)
  - `formatResult(n): string`
  - `compileFunction(expr, angle): (x: number) => number` (NaN on error)
  - `sampleFunction(fn, minX, maxX, n = 400): { xs: number[]; ys: (number | null)[] }`
- Consumes: `mathjs` `create`, `all`; the existing hook actions `inputDigit, inputDecimal, performOperation, calculate, backspace, clearEntry, clear, percentage`.

- [ ] **Step 1: Failing tests.**

`lib/keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { keyToAction } from './keys';

const ev = (key: string, target: unknown = { tagName: 'BODY' }, mods = {}) =>
  ({
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target,
    ...mods,
  }) as Parameters<typeof keyToAction>[0];

describe('keyToAction', () => {
  it('maps digits, operators, decimal, enter, backspace, delete, escape, percent', () => {
    expect(keyToAction(ev('7'))).toEqual({ type: 'digit', digit: 7 });
    expect(keyToAction(ev('+'))).toEqual({ type: 'operator', op: '+' });
    expect(keyToAction(ev('*'))).toEqual({ type: 'operator', op: '×' });
    expect(keyToAction(ev('/'))).toEqual({ type: 'operator', op: '÷' });
    expect(keyToAction(ev('^'))).toEqual({ type: 'operator', op: 'pow' });
    expect(keyToAction(ev('.'))).toEqual({ type: 'decimal' });
    expect(keyToAction(ev('Enter'))).toEqual({ type: 'equals' });
    expect(keyToAction(ev('='))).toEqual({ type: 'equals' });
    expect(keyToAction(ev('Backspace'))).toEqual({ type: 'backspace' });
    expect(keyToAction(ev('Delete'))).toEqual({ type: 'clear-entry' });
    expect(keyToAction(ev('Escape'))).toEqual({ type: 'clear' });
    expect(keyToAction(ev('%'))).toEqual({ type: 'percent' });
  });
  it('ignores keys typed into editable fields', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(keyToAction(ev('7', { tagName }))).toBeNull();
      expect(keyToAction(ev('Escape', { tagName }))).toBeNull();
    }
    expect(
      keyToAction(ev('7', { tagName: 'DIV', isContentEditable: true })),
    ).toBeNull();
  });
  it('lets a focused button handle Enter and Space itself', () => {
    expect(keyToAction(ev('Enter', { tagName: 'BUTTON' }))).toBeNull();
    expect(keyToAction(ev(' ', { tagName: 'BUTTON' }))).toBeNull();
    expect(keyToAction(ev('7', { tagName: 'BUTTON' }))).toEqual({
      type: 'digit',
      digit: 7,
    });
  });
  it('leaves shortcuts with modifiers to the browser', () => {
    expect(keyToAction(ev('c', undefined, { ctrlKey: true }))).toBeNull();
    expect(keyToAction(ev('1', undefined, { metaKey: true }))).toBeNull();
  });
});
```

`lib/expression.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  compileFunction,
  evaluateExpression,
  formatResult,
  sampleFunction,
} from './expression';

describe('evaluateExpression', () => {
  it('honours degrees for trig and inverse trig', () => {
    expect(evaluateExpression('sin(30)', 'deg').text).toBe('0.5');
    expect(evaluateExpression('cos(60)', 'deg').text).toBe('0.5');
    expect(evaluateExpression('sin(180)', 'deg').value).toBe(0);
    expect(evaluateExpression('asin(0.5)', 'deg').text).toBe('30');
    expect(evaluateExpression('atan2(1, 1)', 'deg').text).toBe('45');
  });
  it('uses radians in rad mode and still accepts explicit units', () => {
    expect(evaluateExpression('sin(pi / 6)', 'rad').text).toBe('0.5');
    expect(evaluateExpression('sin(30 deg)', 'rad').text).toBe('0.5');
  });
  it('cleans floating noise', () => {
    expect(evaluateExpression('0.1 + 0.2', 'rad').text).toBe('0.3');
    expect(formatResult(1 / 3)).toBe('0.33333333333333');
  });
  it('rejects bad and non-scalar expressions', () => {
    expect(() => evaluateExpression('2 +', 'rad')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() => evaluateExpression('[1, 2]', 'rad')).toThrow(/single number/);
  });
});

describe('grapher', () => {
  it('compiles functions containing the letter x inside names (exp, max)', () => {
    expect(compileFunction('exp(x)', 'rad')(1)).toBeCloseTo(Math.E);
    expect(compileFunction('max(x, 2)', 'rad')(5)).toBe(5);
  });
  it('samples smoothly with gaps for undefined points', () => {
    const { xs, ys } = sampleFunction(
      compileFunction('1 / x', 'rad'),
      -1,
      1,
      401,
    );
    expect(xs).toHaveLength(401);
    expect(ys[200]).toBeNull();
    expect(ys[0]).toBeCloseTo(-1);
  });
});
```

- [ ] **Step 2:** Run both. Expect FAIL.
- [ ] **Step 3: Implement.**

`lib/keys.ts`:

```ts
export type CalcKeyAction =
  | { type: 'digit'; digit: number }
  | { type: 'decimal' }
  | { type: 'operator'; op: '+' | '-' | '×' | '÷' | 'pow' }
  | { type: 'equals' }
  | { type: 'backspace' }
  | { type: 'clear-entry' }
  | { type: 'clear' }
  | { type: 'percent' };

interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

const tagOf = (t: EventTarget | null) => {
  const el = t as { tagName?: unknown; isContentEditable?: unknown } | null;
  return {
    tag: typeof el?.tagName === 'string' ? el.tagName.toUpperCase() : '',
    editable: el?.isContentEditable === true,
  };
};

export function keyToAction(e: KeyLike): CalcKeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const { tag, editable } = tagOf(e.target);
  if (editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
    return null;
  if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return null;
  const k = e.key;
  if (k.length === 1 && k >= '0' && k <= '9')
    return { type: 'digit', digit: Number(k) };
  switch (k) {
    case '.':
    case ',':
      return { type: 'decimal' };
    case '+':
      return { type: 'operator', op: '+' };
    case '-':
      return { type: 'operator', op: '-' };
    case '*':
      return { type: 'operator', op: '×' };
    case '/':
      return { type: 'operator', op: '÷' };
    case '^':
      return { type: 'operator', op: 'pow' };
    case '%':
      return { type: 'percent' };
    case 'Enter':
    case '=':
      return { type: 'equals' };
    case 'Backspace':
      return { type: 'backspace' };
    case 'Delete':
      return { type: 'clear-entry' };
    case 'Escape':
      return { type: 'clear' };
    default:
      return null;
  }
}
```

`lib/expression.ts`:

```ts
import { all, create, type MathJsInstance } from 'mathjs';
import { ToolError } from '@/shared/lib/errors';
import type { AngleUnit } from '../types';

const RAD = Math.PI / 180;
type Fn = (...a: unknown[]) => unknown;

function exactDeg(name: 'sin' | 'cos' | 'tan', deg: number): number | null {
  const r = ((deg % 360) + 360) % 360;
  if (name === 'sin' && r % 180 === 0) return 0;
  if (name === 'cos' && (r === 90 || r === 270)) return 0;
  if (name === 'tan' && r % 180 === 0) return 0;
  return null;
}

const instances = new Map<AngleUnit, MathJsInstance>();

function mathFor(angle: AngleUnit): MathJsInstance {
  const hit = instances.get(angle);
  if (hit) return hit;
  const math = create(all, {});
  if (angle === 'deg') {
    const o: Record<string, Fn> = {};
    for (const name of ['sin', 'cos', 'tan', 'sec', 'csc', 'cot'] as const) {
      const orig = math[name] as unknown as Fn;
      o[name] = (x) => {
        if (typeof x !== 'number') return orig(x);
        if (name === 'sin' || name === 'cos' || name === 'tan') {
          const exact = exactDeg(name, x);
          if (exact !== null) return exact;
        }
        return orig(x * RAD);
      };
    }
    for (const name of [
      'asin',
      'acos',
      'atan',
      'asec',
      'acsc',
      'acot',
    ] as const) {
      const orig = math[name] as unknown as Fn;
      o[name] = (x) => {
        const r = orig(x);
        return typeof r === 'number' ? r / RAD : r;
      };
    }
    const atan2 = math.atan2 as unknown as Fn;
    o.atan2 = (y, x) => {
      const r = atan2(y, x);
      return typeof r === 'number' ? r / RAD : r;
    };
    math.import(o, { override: true });
  }
  instances.set(angle, math);
  return math;
}

export function formatResult(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  return String(Number(v.toPrecision(14)));
}

export function evaluateExpression(expr: string, angle: AngleUnit) {
  let result: unknown;
  try {
    result = mathFor(angle).evaluate(expr);
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      cause instanceof Error ? cause.message : 'Bad expression',
      { cause },
    );
  }
  if (typeof result !== 'number') {
    throw new ToolError(
      'INVALID_INPUT',
      'The expression did not produce a single number',
    );
  }
  return { value: result, text: formatResult(result) };
}

export function compileFunction(
  expr: string,
  angle: AngleUnit,
): (x: number) => number {
  const code = mathFor(angle).compile(expr);
  return (x) => {
    try {
      const y = code.evaluate({ x });
      return typeof y === 'number' && Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
}

export function sampleFunction(
  fn: (x: number) => number,
  minX: number,
  maxX: number,
  n = 400,
) {
  const xs: number[] = [];
  const ys: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const x = minX + ((maxX - minX) * i) / (n - 1);
    const y = fn(x);
    xs.push(x);
    ys.push(Number.isNaN(y) ? null : y);
  }
  return { xs, ys };
}
```

(`sin(30 deg)`: a Unit argument goes to `orig(x)` unchanged, so mathjs converts it. `1 / x` at `x = 0` gives `Infinity`, which is non-finite, so NaN, so `null`.)

- [ ] **Step 4: Hook.**
  - Replace `handleKeyDown` with a stable listener:
    - `const actionsRef = useRef({...})` assigned on every render.
    - `useEffect(() => { const onKey = (e: KeyboardEvent) => { if (modeRef.current === 'expression') return; const a = keyToAction(e); if (!a) return; e.preventDefault(); actionsRef.current.dispatch(a); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [])`.
  - The `dispatch` switch maps:

| Action        | Hook call              |
| ------------- | ---------------------- |
| `digit`       | `inputDigit`           |
| `decimal`     | `inputDecimal`         |
| `operator`    | `performOperation(op)` |
| `equals`      | `calculate()`          |
| `backspace`   | `backspace`            |
| `clear-entry` | `clearEntry`           |
| `clear`       | `clear`                |
| `percent`     | `percentage`           |

- Remove the `eslint-disable-next-line react-hooks/exhaustive-deps`.
- `evaluateExpression` in the hook calls the lib with `angleUnit`, uses `.text` for the display and history, and sets `setDisplayError(e.message)` from the `ToolError`.
- [ ] **Step 5: Grapher.**
  - `const fn = useMemo(() => compileFunction(expression, angleUnit), [expression, angleUnit])` (pass `angleUnit` as a new prop from `Tool.tsx`).
  - `const { xs, ys } = sampleFunction(fn, minX, maxX, 400)`. Plotly accepts `null` for gaps (`connectgaps: false`).
  - Remove the `step` input and state.
  - Compile errors show "Cannot plot: <message>" (`compileFunction` throws from `compile`, caught in `useMemo` via a try that stores the error).
- [ ] **Step 6: E2E** `test/e2e/p0-calculator.spec.ts`:
  - Keyboard: on `/calculator` in standard mode, `page.keyboard.type('12+3')`, then `press('Enter')`; assert the display shows `15`.
  - Escape guard: switch to expression mode, focus the expression textarea, type `sin(30)` and assert the textarea value is exactly `sin(30)` (not swallowed). Press `Escape` in the textarea and assert the value is unchanged. Click "=" or press the evaluate control; with angle mode "deg" (default), assert `0.5` is visible.
- [ ] **Step 7:** Run the tests. Expect PASS. Then lint and typecheck.
- [ ] **Step 8: Commit** `fix(calculator): full keyboard map that respects focus, degrees in expressions, compiled smooth plots`.

### Task P0-11: Image Optimizer: white background for JPEG, honest PNG options

**Files:**

- Modify: `package.json` (add `upng-js`; dev `@types/upng-js`), `src/tools/image-optimizer/lib/convert.ts`, `src/tools/image-optimizer/lib/convert.test.ts`, `src/tools/image-optimizer/Tool.tsx`
- Create: `src/tools/image-optimizer/lib/png-palette.ts`, `lib/png-palette.test.ts`, `test/e2e/p0-image.spec.ts`

**Interfaces:**

- Produces:
  - `type Encoding = 'jpeg' | 'webp' | 'png' | 'png-palette'`, `ENCODINGS: { id: Encoding; label: string; lossy: boolean; alpha: boolean; quality: boolean }[]`
  - `convertImage(file, { encoding, quality, background }, signal?)`
  - `DEFAULT_BACKGROUND = '#ffffff'`
  - `encodePalettePng(rgba, width, height, colours = 256): Uint8Array`
- `OutputFormat` and `mimeFor` stay for existing callers (`mimeFor` is now derived from the encoding).

- [ ] **Step 0:** `npm view upng-js license` gives MIT and `npm view pako@1 license` gives MIT; record both. Run `pnpm add upng-js && pnpm add -D @types/upng-js`.
- [ ] **Step 1: Failing tests.**

`lib/png-palette.test.ts`:

```ts
import UPNG from 'upng-js';
import { describe, expect, it } from 'vitest';
import { encodePalettePng } from './png-palette';

function gradient(w: number, h: number) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = i % 256;
    px[i * 4 + 1] = (i * 7) % 256;
    px[i * 4 + 2] = (i * 13) % 256;
    px[i * 4 + 3] = 255;
  }
  return px;
}

describe('encodePalettePng', () => {
  it('writes an indexed (palette) PNG of the same size', () => {
    const out = encodePalettePng(gradient(64, 64), 64, 64);
    const img = UPNG.decode(out.buffer as ArrayBuffer);
    expect(img.width).toBe(64);
    expect(img.height).toBe(64);
    expect(img.ctype).toBe(3);
  });
  it('is smaller than a truecolour PNG for a photo-like image', () => {
    const px = gradient(128, 128);
    const truecolour = UPNG.encode([px.buffer as ArrayBuffer], 128, 128, 0);
    expect(encodePalettePng(px, 128, 128).byteLength).toBeLessThan(
      truecolour.byteLength,
    );
  });
});
```

Add to `lib/convert.test.ts`:

```ts
import { ENCODINGS } from './convert';

it('offers quality only for lossy encodings and marks alpha support', () => {
  const by = Object.fromEntries(ENCODINGS.map((e) => [e.id, e]));
  expect(by.png.quality).toBe(false);
  expect(by['png-palette'].quality).toBe(false);
  expect(by.jpeg).toMatchObject({ quality: true, alpha: false });
  expect(by.webp).toMatchObject({ quality: true, alpha: true });
});
```

- [ ] **Step 2:** Run both. Expect FAIL.
- [ ] **Step 3: Implement.**

`lib/png-palette.ts`:

```ts
import UPNG from 'upng-js';

/** Lossy palette PNG (at most `colours` colours, indexed). */
export function encodePalettePng(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  colours = 256,
): Uint8Array {
  const copy = new Uint8Array(rgba).buffer;
  return new Uint8Array(UPNG.encode([copy], width, height, colours));
}
```

`convert.ts` changes:

```ts
export type Encoding = 'jpeg' | 'webp' | 'png' | 'png-palette';
export const ENCODINGS = [
  { id: 'jpeg', label: 'JPEG', lossy: true, alpha: false, quality: true },
  { id: 'webp', label: 'WebP', lossy: true, alpha: true, quality: true },
  {
    id: 'png',
    label: 'PNG (lossless)',
    lossy: false,
    alpha: true,
    quality: false,
  },
  {
    id: 'png-palette',
    label: 'PNG (256 colours)',
    lossy: true,
    alpha: true,
    quality: false,
  },
] as const satisfies readonly {
  id: Encoding;
  label: string;
  lossy: boolean;
  alpha: boolean;
  quality: boolean;
}[];
export const DEFAULT_BACKGROUND = '#ffffff';
```

In `convertImage(file, { encoding, quality, background = DEFAULT_BACKGROUND }, signal)`:

1. After creating the context: `if (encoding === 'jpeg') { ctx.fillStyle = background; ctx.fillRect(0, 0, width, height); }`, before `drawImage`.
2. For `png-palette`, take `ctx.getImageData(0, 0, width, height).data` and pass it to `encodePalettePng` with `mime 'image/png'`.
3. Otherwise use `toBlob(mime, quality only for jpeg/webp)`.

- [ ] **Step 4: Tool.**
  - The format `Select` uses `ENCODINGS` labels.
  - The quality `Slider` is shown only when `quality` is true.
  - For `png-palette`, show the hint "Lossy: reduces the image to at most 256 colours".
  - For `jpeg`, show the background colour input (kit `Input type="color"`, label "Background for transparent areas", default white).
  - When `reductionLabel` returns "No reduction", show an `Alert status="info"`, "The result is not smaller than the original", with the button "Download original" (`saveBlob(file, file.name)`).
- [ ] **Step 5: E2E** `test/e2e/p0-image.spec.ts`:

```ts
import { readFile } from 'node:fs/promises';
import jpeg from 'jpeg-js';
import UPNG from 'upng-js';
import { expect, test } from '@playwright/test';

test('transparent PNG to JPEG gets a white background, not black', async ({
  page,
}) => {
  const clear = Buffer.from(
    UPNG.encode([new Uint8Array(8 * 8 * 4).buffer], 8, 8, 0),
  );
  await page.goto('/image-optimizer');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'clear.png', mimeType: 'image/png', buffer: clear });
  await page.getByLabel('Output format').selectOption({ label: 'JPEG' });
  await page.getByRole('button', { name: /optimi[sz]e/i }).click();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: /download/i })
    .first()
    .click();
  const img = jpeg.decode(await readFile(await (await download).path()));
  expect(img.data[0]).toBeGreaterThan(245);
  expect(img.data[1]).toBeGreaterThan(245);
  expect(img.data[2]).toBeGreaterThan(245);
});
```

Step 0 of this step: adapt the selectors to the current Tool's labels and the select component. If the kit `Select` is not a native select, use `getByRole('combobox')` and option clicks.

- [ ] **Step 6:** Run the tests. Expect PASS. Then lint and typecheck.
- [ ] **Step 7: Commit** `fix(image-optimizer): white background for JPEG and honest PNG lossless/256-colour options`.

### Task P0-12: P0 verification and PR

**Files:** none new (fixes only, if the gate finds issues).

- [ ] **Step 1:** Run `pnpm lint && pnpm typecheck && pnpm build && pnpm test`. All must be green. Grep the new files for glyph literals with the phase-5 banned set; expect none (rule a lands later and must find nothing new).
- [ ] **Step 2:** Run `pnpm test:e2e` three times consecutively. All must be green; investigate any flake (N3).
- [ ] **Step 3:** Run `pnpm build` and check the bundle report. `regex.worker` is a separate chunk; `hash-wasm` appears only in the hash chunk; `upng-js` only in the image-optimizer chunk.
- [ ] **Step 4:** Push the branch and open a PR "P0: correctness fixes for hash, regex, JWT, Base64, CSV, JSON viewer, calculator, image optimizer". The description lists each fix with its test, the new `TIMEOUT` code, the two dependencies and their licences, and the behaviour changes:
  - Hash "SHA-3" is renamed SHA3-512/256 plus Keccak-256.
  - HMAC requires a key.
  - JWT shows "Signature not checked" instead of "Token valid".
  - CSV no longer types `00123` as 123.
  - The calculator ignores keys typed into fields.
  - The JPEG background is white.

  The body ends with the generated-with line.

---

# Phase 6 Parts (after P5-A1 and P5-A2)

**Standard loop for every task below (written once, applies everywhere):**

- [ ] **Step 0:** confirm the consumed signatures (see Concurrency note).
- [ ] **Step 1:** write the listed tests.
- [ ] **Step 2:** run `pnpm vitest run <test files>` (or `pnpm test:e2e <spec>`) and confirm they fail for the stated reason.
- [ ] **Step 3:** implement as specified.
- [ ] **Step 4:** run until green, then `pnpm lint && pnpm typecheck`.
- [ ] **Step 5:** commit with the given message plus the trailer.

Tests are given verbatim. Where an implementation is specified by interface and behaviour rather than full code, every behaviour named is tested. Kit components additionally get a `/__kit` gallery entry and a both-theme visual baseline in the Part's last task.

---

# Part 6-A1: shared platform

**Branch:** `feat/p6-a1-platform`. **Boundary:** no tool changes except the P3 re-export. Everything here is consumed by A2–G2.

### Task A1-1: Dependencies, licences registry, `createToolSettings`

**Files:**

- Modify: `package.json` (`yaml`, `smol-toml`)
- Create: `src/app/licences.ts`, `src/shared/lib/tool-settings.ts`, `src/shared/lib/tool-settings.test.ts`, `test/helpers/settings-guard.ts`

**Interfaces:**

- Produces:
  - `createToolSettings<S extends Record<string, Json>>(toolId: string, defaults: S, opts: { version: number; migrate?: (old: unknown, fromVersion: number) => S }): { useSettings(): [S, (patch: Partial<S>) => void, () => void]; getSettings(): S }`
  - `assertNoDataFields(defaults: object)`, a test helper that throws if any key, case-insensitively, matches `/^(input|text|token|secret|password|key|body|data|value)$/` or ends with `Input`, `Token`, `Secret` or `Password`
  - `LICENCES: { name: string; licence: string; url: string; note?: string }[]`
- Consumes: `createToolStore` (`src/shared/state/createToolStore.ts`; store key `kit:store:tool:<id>`).

- [ ] **Step 0:** `npm view yaml license` gives ISC and `npm view smol-toml license` gives BSD-3-Clause; record both. Run `pnpm add yaml smol-toml`.
- [ ] **Tests** (`tool-settings.test.ts`, jsdom):

```ts
/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { assertNoDataFields } from '../../../test/helpers/settings-guard';
import { createToolSettings } from './tool-settings';

beforeEach(() => localStorage.clear());

describe('createToolSettings', () => {
  it('returns defaults, persists patches under the tool key, resets', () => {
    const s = createToolSettings(
      'demo',
      { indent: 2, wrap: false },
      { version: 1 },
    );
    const { result } = renderHook(() => s.useSettings());
    expect(result.current[0]).toEqual({ indent: 2, wrap: false });
    act(() => result.current[1]({ indent: 4 }));
    expect(result.current[0].indent).toBe(4);
    expect(localStorage.getItem('kit:store:tool:demo')).toContain('"indent":4');
    act(() => result.current[2]());
    expect(s.getSettings()).toEqual({ indent: 2, wrap: false });
  });
  it('migrates stored state from an older version', () => {
    localStorage.setItem(
      'kit:store:tool:old',
      JSON.stringify({ state: { history: ['1+1 = 2'] }, version: 0 }),
    );
    const s = createToolSettings(
      'old',
      { history: [] as string[], precision: 10 },
      {
        version: 1,
        migrate: (old) => ({
          history: (old as { history?: string[] }).history ?? [],
          precision: 10,
        }),
      },
    );
    expect(s.getSettings().history).toEqual(['1+1 = 2']);
  });
});

describe('assertNoDataFields', () => {
  it('rejects data-like keys', () => {
    expect(() => assertNoDataFields({ indent: 2, input: '' })).toThrow(/input/);
    expect(() => assertNoDataFields({ apiToken: '' })).toThrow(/apiToken/);
    expect(() =>
      assertNoDataFields({ indent: 2, keyFormat: 'hex' }),
    ).not.toThrow();
  });
});
```

The exact persisted envelope follows store-kit. Step 0 confirms the shape and adjusts the `localStorage` seed in the migration test (R6 / store-kit key note).

- [ ] **Implement:**
  - `tool-settings.ts` wraps `createToolStore(toolId, ...)` with `version`/`migrate` passed through to store-kit's persist options. `useSettings` selects the state plus `set` and `reset` actions.
  - Settings must be JSON-serialisable: a dev-only `assertJson` runs on patch.
  - `licences.ts` starts with entries for `hash-wasm`, `upng-js`, `yaml` and `smol-toml`, and for the existing bundled fonts (Inter, JetBrains Mono: OFL).
- [ ] **Commit:** `feat(shared): createToolSettings with migration and a data-never-persisted guard`.

### Task A1-2: `useToolCommands`

**Files:**

- Create: `src/shared/lib/tool-commands.ts`, `src/shared/lib/tool-commands.test.tsx`

**Interfaces:**

- Produces:
  - `ToolCommand = { id: string; label: string; shortcut?: string; group?: string; run: () => void; enabled?: boolean }`
  - `useToolCommands(toolId: string, commands: ToolCommand[]): void`, which registers with P5 `useCommands` (source id `tool:<toolId>`) and binds `shortcut` through `shared/lib/hotkeys.ts` with the editable-target guard; shortcuts with a modifier fire while typing, single keys do not.
- Consumes: P5 `useCommands(source)`, `hotkeys.ts` (`bindHotkey(spec, handler, { allowInInputs })`, names per Step 0).

- [ ] **Tests:**

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useToolCommands } from './tool-commands';

function Harness({ run, single }: { run: () => void; single: () => void }) {
  useToolCommands('demo', [
    { id: 'copy', label: 'Copy result', shortcut: 'Mod+Shift+C', run },
    { id: 'next', label: 'Next change', shortcut: 'n', run: single },
  ]);
  return <textarea aria-label="field" />;
}

describe('useToolCommands', () => {
  it('fires modifier shortcuts everywhere, single keys only outside inputs', () => {
    const run = vi.fn();
    const single = vi.fn();
    const { getByLabelText } = render(<Harness run={run} single={single} />);
    const field = getByLabelText('field');
    fireEvent.keyDown(field, { key: 'C', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(field, { key: 'n' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(single).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(single).toHaveBeenCalledTimes(1);
  });
  it('skips disabled commands', () => {
    const run = vi.fn();
    function H() {
      useToolCommands('demo2', [
        { id: 'x', label: 'X', shortcut: 'Mod+Enter', run, enabled: false },
      ]);
      return null;
    }
    render(<H />);
    fireEvent.keyDown(document.body, { key: 'Enter', ctrlKey: true });
    expect(run).not.toHaveBeenCalled();
  });
});
```

The test file is under `src` and rule (b) skips tests (G1), so the raw `textarea` is allowed here.

- [ ] **Implement:** a thin adapter. Registration is cleaned up on unmount, and command objects are read through a ref so closures stay fresh. `Mod` maps to Ctrl off macOS.
- [ ] **Commit:** `feat(shared): useToolCommands registers tool commands and guarded shortcuts`.

### Task A1-3: Text hand-off and `accepts.mimes`

**Files:**

- Modify: `src/shared/lib/handoff.ts` (P5), `src/app/tool.ts` (`accepts` item gains `mimes?: string[]`), `src/app/registry.ts` (validation), `src/app/registry.test.ts`
- Create or extend: `src/shared/lib/handoff.test.ts`

**Interfaces:**

- Produces:
  - `HandoffPayload` per spec §4.3
  - `putHandoff(p): string`, `takeHandoff(id): HandoffPayload | null`
  - `useHandoff(match): HandoffPayload | null`
  - `sendTo(navigate, toolId, p)`
  - `toolsAccepting(mime): ToolManifest[]` (registry)
  - Limits: `HANDOFF_TTL_MS = 300_000`, `HANDOFF_MAX = 8`, `HANDOFF_TEXT_MAX = 50 * 1024 * 1024`
- Consumes: the P5 handoff implementation (`File[]` only today).

- [ ] **Tests:**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HANDOFF_MAX, putHandoff, takeHandoff } from './handoff';

afterEach(() => vi.useRealTimers());

describe('handoff (text payloads)', () => {
  const text = {
    kind: 'text' as const,
    mime: 'application/json',
    text: '{}',
    sourceTool: 'csv-viewer',
  };
  it('is one-time', () => {
    const id = putHandoff(text);
    expect(takeHandoff(id)).toEqual(text);
    expect(takeHandoff(id)).toBeNull();
  });
  it('expires after five minutes', () => {
    vi.useFakeTimers();
    const id = putHandoff(text);
    vi.advanceTimersByTime(300_001);
    expect(takeHandoff(id)).toBeNull();
  });
  it('keeps at most HANDOFF_MAX entries (oldest evicted)', () => {
    const ids = Array.from({ length: HANDOFF_MAX + 1 }, () => putHandoff(text));
    expect(takeHandoff(ids[0])).toBeNull();
    expect(takeHandoff(ids[HANDOFF_MAX])).not.toBeNull();
  });
  it('refuses oversized text', () => {
    expect(() =>
      putHandoff({ ...text, text: 'x'.repeat(50 * 1024 * 1024 + 1) }),
    ).toThrow(expect.objectContaining({ code: 'TOO_LARGE' }));
  });
  it('still carries files', () => {
    const f = new File(['a'], 'a.txt');
    const id = putHandoff({ kind: 'files', files: [f] });
    expect(takeHandoff(id)).toMatchObject({ kind: 'files', files: [f] });
  });
});
```

`registry.test.ts` gains: a manifest with `accepts: [{ mimes: ['not a mime'] }]` fails validation; `toolsAccepting('application/json')` returns only tools listing that mime and excludes disabled tools.

- [ ] **Implement:**
  - Keep P5's `File[]` callers working; the old signature becomes a wrapper if P5 exposed `putFiles`.
  - The mime validity regex is `/^[a-z]+\/[a-z0-9.+-]+$/`.
  - `useHandoff` reads `?handoff=` via `useSearchParams`, takes the payload once (a ref guards against StrictMode double effects), and removes the param with `setSearchParams(..., { replace: true })`.
- [ ] **Commit:** `feat(shared): text hand-off payloads, mime-based discovery and limits`.

### Task A1-4: Share codec and `useShareableState`, plus the allow-list test

**Files:**

- Create: `src/shared/lib/share-state.ts`, `src/shared/lib/share-state.test.ts`, `src/shared/lib/use-shareable-state.ts`, `src/shared/lib/use-shareable-state.test.tsx`, `test/share-allowlist.test.ts`

**Interfaces:**

- Produces:
  - `encodeShare(state: unknown, version: number): { ok: true; fragment: string } | { ok: false; reason: 'too-large'; size: number }`
  - `decodeShare(fragment: string): { version: number; state: unknown }` (throws `INVALID_INPUT`)
  - Limits: `SHARE_JSON_MAX = 65_536`, `SHARE_FRAGMENT_MAX = 6_000`, `SHARE_DECODE_FRAGMENT_MAX = 16_000`, `SHARE_DECODE_JSON_MAX = 262_144`
  - `useShareableState<S>({ toolId, version, parse, select }): { share(): Promise<string>; canShare: boolean; reason?: string; loaded: S | null }`
- Consumes: `fflate` (`deflateSync`, streaming `Inflate`), `encoding.ts`, `useClipboard`, `notify`.

- [ ] **Tests** (`share-state.test.ts`):

```ts
import { deflateSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { bytesToBase64, utf8Encode } from './encoding';
import { decodeShare, encodeShare } from './share-state';

describe('share codec', () => {
  it('round-trips state with a version', () => {
    const r = encodeShare({ pattern: '\\d+', flags: 'g' }, 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fragment).toMatch(/^s=1\.[A-Za-z0-9_-]+$/);
    expect(decodeShare(r.fragment)).toEqual({
      version: 2,
      state: { pattern: '\\d+', flags: 'g' },
    });
  });
  it('refuses state whose fragment would exceed 6000 characters', () => {
    const noisy = Array.from(
      { length: 20_000 },
      (_, i) => (i * 7919) % 97,
    ).join(',');
    expect(encodeShare({ noisy }, 1)).toMatchObject({
      ok: false,
      reason: 'too-large',
    });
  });
  it('rejects damaged, oversized and zip-bomb fragments', () => {
    expect(() => decodeShare('s=1.!!!')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() => decodeShare(`s=1.${'A'.repeat(16_001)}`)).toThrow(/damaged/);
    const bomb = bytesToBase64(
      deflateSync(
        utf8Encode(JSON.stringify({ v: 1, s: 'a'.repeat(1_000_000) })),
      ),
      { urlSafe: true, padding: false },
    );
    expect(() => decodeShare(`s=1.${bomb}`)).toThrow(/damaged/);
  });
  it('rejects unknown codec versions', () => {
    expect(() => decodeShare('s=9.abc')).toThrow(/newer version/);
  });
});
```

`use-shareable-state.test.tsx` (jsdom):

- with `location.hash` set to a valid fragment, `loaded` equals the parsed state, `history.replaceState` is called removing the hash, and a second render does not re-hydrate;
- `parse` returning `null` gives `loaded: null` plus a notify error;
- `share()` copies `<origin><path>#s=...` (mock the clipboard);
- `canShare` is false with `reason: 'Too large to share as a link (n KB)'` for big state.

`test/share-allowlist.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

export const SHARE_ALLOWLIST = [
  'regex-tester',
  'text-diff-checker',
  'calculator',
  'number-converter',
  'unit-converter',
  'date-calculator',
  'epoch-converter',
  'cron-builder',
  'color-tester',
  'qr-code-generator',
  'random-data-generator',
  'url-parser',
].sort();

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory()
      ? files(p)
      : /\.(ts|tsx)$/.test(n)
        ? [p]
        : [];
  });
}

describe('share allow-list (spec 4.2)', () => {
  it('only allow-listed tools import useShareableState', () => {
    const users = new Set<string>();
    for (const f of files('src/tools')) {
      if (
        /use-shareable-state|useShareableState/.test(readFileSync(f, 'utf8'))
      ) {
        users.add(f.split(/[\\/]/)[2]);
      }
    }
    for (const u of users) expect(SHARE_ALLOWLIST).toContain(u);
  });
});
```

The test asserts subset during the phase. H-5 flips it to equality once every allow-listed tool ships Share.

- [ ] **Implement:**
  - `encodeShare`: `JSON.stringify({ v: version, s: state })`; if longer than `SHARE_JSON_MAX` return too-large; `deflateSync(utf8Encode(json), { level: 9 })`; Base64url without padding; `s=1.` prefix; check the fragment length.
  - `decodeShare`:
    1. Prefix check: `s=1.` is required, another number gives "newer version".
    2. Length check, then `base64ToBytes`.
    3. Inflate with an output cap: use the fflate streaming `Inflate` with an `ondata` accumulator that aborts past `SHARE_DECODE_JSON_MAX`.
    4. `utf8Decode`, `JSON.parse`, then shape check `{ v: number; s }`.
  - Every failure is `INVALID_INPUT` "This share link is damaged or from a newer version".
- [ ] **Commit:** `feat(shared): compressed URL-fragment share codec with limits and an allow-list test`.

### Task A1-5: Shared text worker

**Files:**

- Create: `src/shared/workers/text.worker.ts`, `src/shared/workers/handlers/index.ts`, `src/shared/workers/handlers/ping.ts`, `src/shared/workers/text-client.ts`, `src/shared/workers/text-client.test.ts`

**Interfaces:**

- Produces:
  - `textHandlers` (merged barrel; `ping(ctx, s) => s`)
  - `type TextHandlers`
  - `textWorker(): KillableClient<TextHandlers>` (shared singleton, no default timeout)
  - `createTextWorker(opts?: { timeoutMs?: number }): KillableClient<TextHandlers>` (dedicated instance)
  - Barrel rule: `handlers/index.ts` is `export const textHandlers = { ...ping /* Parts append one spread line each */ }`. Each handler module default-exports a plain object of handlers and lazily `import()`s heavy libraries inside handler bodies.
- Consumes: `createKillableClient` (P0), `exposeRpc`.

- [ ] **Tests:** use the same in-process channel harness as P0-4 with `textHandlers`.
  - `ping` round-trips.
  - Two `createTextWorker()` instances are independent: a timeout in one does not fail an in-flight call in the other (a hang handler is injected only in the test via `exposeRpc({ ...textHandlers, hang })`).
- [ ] **Implement:**
  - `text.worker.ts`: `exposeRpc(textHandlers, self as unknown as RpcEndpoint)`.
  - The client connects with `new Worker(new URL('./text.worker.ts', import.meta.url), { type: 'module' })`.
- [ ] **Commit:** `feat(shared): one text worker module with an append-only handler barrel`.

### Task A1-6: Encoding extensions and `crypto/random`

**Files:**

- Modify: `src/shared/lib/encoding.ts` (+ tests)
- Create: `src/shared/lib/crypto/random.ts`, `random.test.ts`

**Interfaces:**

- Produces:
  - `bytesToBase32(bytes, { padding? })`, `base32ToBytes(text)` (RFC 4648; case-insensitive; positioned errors)
  - `bytesToBase58(bytes)`, `base58ToBytes(text)` (Bitcoin alphabet; leading zeros preserved)
  - `bytesToBinary(bytes, groupBy = 8): string`
  - `randomInt(maxExclusive: number): number` (rejection sampling, `maxExclusive` from 1 to 2^32)
  - `randomBytes(n)`, `shuffle<T>(arr): T[]` (Fisher-Yates with `randomInt`), `pick<T>(arr): T`
  - `randomString(alphabet: string, length: number): string` (unbiased)
- Consumes: `crypto.getRandomValues`.

- [ ] **Tests:**
  - RFC 4648 vectors: `''`, `'f'` gives `MY======`, `'fo'` gives `MZXQ====`, `'foobar'` gives `MZXW6YTBOI======`.
  - Base58: `Uint8Array.of(0, 0, 1)` gives `'112'`, `'hello world'` gives `'StV1DL6CwTryKyV'`, round-trips, `'0OIl'` is refused with a position.
  - `randomInt` stays within range across 30,000 draws (each value of `randomInt(3)` appears 30–37% of the time).
  - `randomInt(1) === 0`; `randomInt(0)` throws.
  - `randomInt` uses rejection: mock `getRandomValues` to return `0xFFFFFFFF` first, then 5, and assert `randomInt(10)` returns 5 (`0xFFFFFFFF` lies above the largest multiple of 10).
  - `shuffle` returns a permutation.
  - `randomString('ab', 16)` matches `/^[ab]{16}$/`.
- [ ] **Implement:** as specified. Base58 uses BigInt-free long division over bytes.
- [ ] **Commit:** `feat(shared): Base32, Base58, binary views and an unbiased CSPRNG helper`.

### Task A1-7: `crypto/digest`, `crypto/keys` additions, `crypto/aead` envelope

**Files:**

- Create: `src/shared/lib/crypto/digest.ts`, `digest.test.ts`, `src/shared/lib/crypto/aead.ts`, `aead.test.ts`
- Modify: `src/shared/lib/crypto/keys.ts` (+ tests), `src/tools/hash-generator/lib/hash.ts` (re-export from `digest.ts`, P3)

**Interfaces:**

- Produces:
  - `DigestId = HashId | 'sha512-256' | 'sha3-224' | 'sha3-384' | 'blake2b-512' | 'blake2s-256' | 'blake3' | 'crc32' | 'crc32c' | 'xxhash64' | 'xxhash3'`
  - `DIGESTS: readonly { id; name; group: 'sha2' | 'sha3' | 'blake' | 'legacy' | 'checksum'; broken?: boolean; nonCrypto?: boolean; hexLength: number }[]`
  - `digest(id, bytes): Promise<string>` (hex)
  - `createDigest(id): Promise<{ update(b: Uint8Array): void; digestHex(): string }>`
  - `hmac` and `decodeKey`, moved from P0
  - `generateSigningKeyPair(alg: 'RS256' | 'ES256' | 'EdDSA'): Promise<{ publicPem; privatePem; publicJwk; privateJwk; privateKey: CryptoKey }>`
  - `ENVELOPE_MAGIC = 'TENC'`
  - `KdfParams = { kind: 'pbkdf2'; iterations: number } | { kind: 'argon2id'; memoryKiB: number; iterations: number; parallelism: number }`
  - `seal(plain: Uint8Array, passphrase: string, kdf: KdfParams): Promise<Uint8Array>`
  - `open(sealed: Uint8Array, passphrase: string): Promise<Uint8Array>` (throws `WRONG_PASSWORD`, `UNSUPPORTED_FEATURE` or `INVALID_INPUT`)
  - `armor(bytes): string`, `dearmor(text): Uint8Array`
  - `DEFAULT_KDF = { kind: 'pbkdf2', iterations: 600_000 }`
- Consumes: `hash-wasm` (`createBLAKE2b`, `createBLAKE2s`, `createBLAKE3`, `createCRC32`, `createXXHash64`, `createXXHash3`, `argon2id`, etc.), WebCrypto.

- [ ] **Tests:**
  - `digest`:

| Input                                           | Algorithm     | Expected                                                                                                                           |
| ----------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `'The quick brown fox jumps over the lazy dog'` | `crc32`       | `414fa339`                                                                                                                         |
| `''`                                            | `blake3`      | `af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262`                                                                 |
| `''`                                            | `xxhash64`    | `ef46db3751d8e999`                                                                                                                 |
| `'abc'`                                         | `blake2b-512` | `ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923` |

    `createDigest('sha256')` fed in three chunks equals `digest('sha256', all)`.

- `aead`:
  - Round-trip with a fast KDF in tests (`{ kind: 'pbkdf2', iterations: 1000 }`) and with Argon2id (`memoryKiB: 1024, iterations: 1, parallelism: 1`).
  - A wrong passphrase rejects `WRONG_PASSWORD` "Wrong passphrase, or the data was changed".
  - Flipping one ciphertext byte, or one header byte (the header is AAD), rejects `WRONG_PASSWORD`.
  - Changing the magic gives `INVALID_INPUT`; version byte 2 gives `UNSUPPORTED_FEATURE`.
  - `dearmor(armor(x))` equals `x`; the armour lines are at most 76 characters with the exact BEGIN and END lines from spec §9.5.
  - Two `seal` calls on the same input differ (random salt and IV).
- `keys`: `generateSigningKeyPair('ES256')` yields a PEM that the P0 `verifyJwt` path accepts (import the private key, sign, verify).
- [ ] **Implement:** the envelope layout exactly as spec §9.5. PBKDF2 via `crypto.subtle.deriveKey` (SHA-256, 256-bit AES-GCM key). Argon2id via `hash-wasm` `argon2id({ outputType: 'binary', hashLength: 32 })` imported as a raw key. AAD is the header bytes.
- [ ] **Commit:** `feat(shared): digest table with streaming, signing key pairs and an authenticated encryption envelope`.

### Task A1-8: `color/*`

**Files:**

- Create: `src/shared/lib/color/{parse,convert,contrast,apca,cvd,scale,names,index}.ts` plus `color.test.ts`

**Interfaces:**

- Produces:
  - `Color = { r; g; b; alpha }` (sRGB, 0–1 floats) as the internal canonical form
  - `parseColor(text): Color` (hex 3/4/6/8 digits, `rgb[a]()`, `hsl[a]()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, CSS named and `transparent`; throws `INVALID_INPUT` naming the format)
  - `formatColor(c, fmt: 'hex' | 'rgb' | 'hsl' | 'hwb' | 'lab' | 'lch' | 'oklab' | 'oklch'): string`
  - `toOklch(c)`, `fromOklch(l, c, h, alpha?)`, `gamutMap(c)` (CSS Color 4 chroma reduction)
  - `contrastRatio(fg, bg): number` (alpha composited over `bg`)
  - `wcagLevels(ratio): { normalAA; normalAAA; largeAA; largeAAA; uiAA }`
  - `apcaLc(text, bg): number` (APCA 0.0.98G-4g)
  - `suggestPassing(fg, bg, target: number, which: 'fg' | 'bg'): Color | null` (minimal OKLCH lightness change)
  - `simulateCvd(c, type: 'protan' | 'deutan' | 'tritan' | 'achroma', severity = 1)` (Machado 2009)
  - `scale(base, { steps?, hueShift?, chromaCurve? }): Record<number, Color>` (steps default `[50, 100, 200, ..., 900, 950]`)
  - `nearestNamed(c): { name; distance }` (OKLab Euclidean)
- Consumes: none.

- [ ] **Tests:**
  - `contrastRatio(#000, #fff) === 21`; `#777` on white is `4.48` (2 dp).
  - `apcaLc(#000, #fff)` is about `106.04`; `apcaLc(#fff, #000)` is about `-107.88` (published reference values, within 0.1).
  - `parseColor('oklch(62.8% 0.2577 29.23)')` is about `#ff0000` (each channel within 1/255).
  - Round-trips hex to OKLCH to hex for 50 seeded random colours (within 1/255).
  - `suggestPassing(#999, #fff, 4.5, 'fg')` returns a colour with ratio at least 4.5 and minimal lightness change (less than 0.12 in L).
  - `simulateCvd(#ff0000, 'deutan')` matches the Machado reference within 2/255.
  - `nearestNamed(#fe0000).name === 'red'`.
  - Invalid input names the problem: `parseColor('rgb(1,2)')` gives "rgb() needs 3 values".
- [ ] **Commit:** `feat(shared): colour parsing, conversion, WCAG/APCA contrast, CVD simulation and OKLCH scales`.

### Task A1-9: `data-formats/json-locate`

**Files:**

- Create: `src/shared/lib/data-formats/json-locate.ts`, `json-locate.test.ts`

**Interfaces:**

- Produces:
  - `parseJsonWithLocations(text, { maxDepth = 10_000 }): { value: unknown; root: LocNode; warnings: { message; line; column }[] }`
  - `LocNode = { kind: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'; start: number; end: number; keyStart?: number; children?: { key: string | number; node: LocNode }[] }`
  - Throws `JsonLocateError extends ToolError('INVALID_INPUT')` with `{ line, column, offset }`
  - `offsetToLineCol(text, offset)`
  - `nodeAtOffset(root, offset): (string | number)[]` (path of the deepest node)
- Consumes: none (iterative parser, explicit stack; no recursion).

- [ ] **Tests:**
  - **Fuzz parity:** 300 seeded random JSON documents (nested objects and arrays, unicode escapes, numbers with exponents) yield `value` deep-equal to `JSON.parse`.
  - **Positions:** `'{\n  "a": [1, 2,]\n}'` throws with `line 2, column 14` (the `]` after the trailing comma; the message names the token: "Unexpected ']' after ','").
  - **Truncation:** `'{"a": "x'` gives "Unterminated string" at the opening quote's line and column.
  - **Duplicate keys:** `'{"a":1,"a":2}'` warns `Duplicate key "a"` with its position, and the value follows `JSON.parse` semantics (last wins).
  - **Deep nesting:** 50,000 nested arrays give the `maxDepth` error "Nesting deeper than 10000 levels", not a stack overflow.
  - **Offsets:** `root.children[0].node.start/end` slice exactly to the source text of that value; `nodeAtOffset` returns `['a', 1]` for an offset inside the second array element of `{"a":[1,2]}`.
  - **Lone surrogate escapes:** `"\ud800"` is accepted, like `JSON.parse`.
  - **Performance:** a 5 MB generated document parses in under 1.5 s in Node (soft assertion logged; hard limit 4 s).
- [ ] **Commit:** `feat(shared): strict JSON parser with source offsets, line/column errors and duplicate-key warnings`.

### Task A1-10: Other data formats

**Files:**

- Create: `src/shared/lib/data-formats/{yaml,xml,toml,csv-write,sql-insert,markdown-table,ndjson,xlsx-write,index}.ts` plus tests per file

**Interfaces:**

- Produces:
  - `parseYaml(text)`, `toYaml(value, { indent })` (lazy `import('yaml')`, async), with errors carrying line and column from `yaml`'s `linePos`
  - `parseXml(text): Document` (DOMParser; `parsererror` mapped to `INVALID_INPUT` with line and column parsed from the error text, Chrome and Firefox formats)
  - `prettyXml(text | Document, { indent }): string` (DOM walk: keeps the XML declaration, comments, CDATA, processing instructions, mixed content, and whitespace-significant `xml:space="preserve"`)
  - `minifyXml`
  - `jsonToXml(value, { root = 'root', attrPrefix = '@', textKey = '#text' })`
  - `xmlToJson(doc)` (attributes as `@name`, text as `#text`, repeated elements as arrays, interleaved text kept in order under `#text` arrays)
  - `parseToml`, `toToml` (smol-toml, async lazy)
  - `toCsv(rows: Record<string, unknown>[], { delimiter = ',', columns?, header = true, crlf = false })` (RFC 4180 quoting)
  - `flattenObject(o, sep = '.')`
  - `toSqlInsert(rows, { table, dialect: 'postgres' | 'mysql' | 'sqlite' | 'mssql', batch = 500 })` (identifier quoting per dialect, string escaping, `NULL`, booleans per dialect)
  - `toMarkdownTable(rows, columns)` (pipe escaping)
  - `toNdjson(rows)`
  - `toXlsx(rows, columns, sheetName = 'Sheet1'): Uint8Array` (SpreadsheetML via fflate `zipSync`: `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/worksheets/sheet1.xml` with inline strings and numeric cells, `xl/styles.xml` minimal)
- Consumes: `yaml`, `smol-toml`, `fflate`, DOMParser (jsdom in tests).

- [ ] **Tests:**
  - **YAML:** round-trip; the error position for `'a: [1, 2'`.
  - **XML** (jsdom):
    - `prettyXml` keeps `<!-- c -->`, `<![CDATA[x<y]]>`, `<?xml version="1.0"?>` and mixed content `<p>Hi <b>there</b> you</p>` exactly in order;
    - `parseXml('<a><b></a>')` gives a line and column;
    - `xmlToJson` of `<r a="1"><i>x</i><i>y</i>t</r>` equals `{ r: { '@a': '1', i: ['x', 'y'], '#text': 't' } }`;
    - `jsonToXml` inverts it.
  - **CSV:** fields with commas, quotes and newlines are quoted and doubled.
  - **SQL:** `O'Brien` is escaped per dialect; the MySQL identifier is quoted with backticks, PostgreSQL with double quotes, MSSQL with brackets; batches split at 500.
  - **Markdown:** `|` is escaped.
  - **XLSX:** unzip with fflate `unzipSync` and assert that `xl/worksheets/sheet1.xml` contains the escaped inline string for `O'Brien` (either `&apos;` or `&#39;`) and the expected row count, and that `[Content_Types].xml` lists the worksheet part.
- [ ] **Commit:** `feat(shared): YAML, XML (faithful pretty print), TOML, CSV, SQL, Markdown, NDJSON and XLSX writers`.

### Task A1-11: `time/*`

**Files:**

- Create: `src/shared/lib/time/{parse,format,zones,index}.ts` plus `time.test.ts`

**Interfaces:**

- Produces:
  - `parseInstant(text, { now = Date.now(), zone? }): { epochMs: number; detected: 'unix-s' | 'unix-ms' | 'unix-us' | 'unix-ns' | 'iso' | 'rfc2822' | 'now' | 'relative' }` (throws `INVALID_INPUT` with a hint)
  - `formatIso(epochMs, zone?)`, `formatRfc2822(epochMs)`, `formatRfc3339(epochMs, zone)`, `formatRelative(epochMs, now, locale?)`
  - `isoWeek(epochMs, zone)`, `dayOfYear(epochMs, zone)`
  - `zoneOffsetMinutes(zone, epochMs)`
  - `wallClockToEpoch({ y, m, d, hh, mm, ss }, zone): { epochMs; status: 'ok' | 'skipped' | 'ambiguous' }`
  - `listZones(): { id; label; offsetNow }[]`
  - `inDst(zone, epochMs)`
- Consumes: `Intl`.

- [ ] **Tests:**
  - **Magnitude detection:** `1700000000` gives `unix-s`, `1700000000000` gives `unix-ms`, `1700000000000000` gives `unix-us`, 19 digits gives `unix-ns`.
  - **Formats:** ISO with offset, RFC 2822 (`formatRfc2822(1700000000000)` is `Tue, 14 Nov 2023 22:13:20 +0000`), `'now'`, `'today + 3w'` (relative to an injected `now`; units d, w, mo, y; signs).
  - **DST, Europe/Dublin:** `wallClockToEpoch` of 2024-03-31 01:30 is `skipped` and 2024-10-27 01:30 is `ambiguous`; for America/New_York, 2024-03-10 02:30 is `skipped`.
  - **ISO week:** 2021-01-03 is week 53 of 2020.
  - **Errors:** an invalid date names the field ("Month 13 is out of range").
- [ ] **Commit:** `feat(shared): instant parsing, formatting and DST-aware time-zone helpers`.

### Task A1-12: Syntax tokenisers and new tokens

**Files:**

- Create: `src/shared/lib/syntax/tokenize.ts`, `languages/{json,xml,yaml,csv,log,regex,markdown,js,css,html,sql,http}.ts`, `syntax.test.ts`
- Modify: `src/theme/tokens.css` (append the syntax, diff, match and chart blocks for both themes), the P5 `tokens.contrast.test.ts` (new pairs)

**Interfaces:**

- Produces:
  - `TokenKind = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct' | 'comment' | 'keyword' | 'tag' | 'attr' | 'fn' | 'regex' | 'plain'`
  - `tokenizeLine(lang, line, state): { tokens: { start; end; kind }[]; state }` (line-incremental, state carries open strings and comments)
  - `tokenize(lang, text): Token[][]` (per line)
  - `LANGUAGES` (ids plus labels plus file extensions)
  - Token CSS variables `--color-syntax-*`, `--color-diff-*`, `--color-match*`, `--color-chart-1..8`
- Consumes: none.

- [ ] **Tests:**

| Language | Case                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| JSON     | `{"a": 1, "b": [true, null, "x\"y"]}` gives key, number, boolean, null and string tokens at the exact columns |
| JS       | template literals spanning lines keep state                                                                   |
| CSS, JS  | block comments across lines                                                                                   |
| XML      | tag, attr and string tokens                                                                                   |
| SQL      | keywords case-insensitively                                                                                   |
| Regex    | groups and classes                                                                                            |
| Markdown | headings, code fences (state), links                                                                          |
| Log      | levels                                                                                                        |

Also: a 1 MB JSON line tokenises in under 300 ms. Contrast: every `syntax-*` token is at least 4.5:1 on `surface` and `surface-2` in both themes; `chart-1..8` are each at least 3:1 on `surface`, and adjacent chart pairs keep at least 10 deltaE OKLab under deutan simulation (uses `color/cvd`).

- [ ] **Implement:** state machines per language, no backtracking regex on whole text. Token values in `tokens.css` are chosen to pass the tests; record the chosen hex values in the task report.
- [ ] **Commit:** `feat(shared): incremental syntax tokenisers and syntax/diff/chart tokens for both themes`.

### Task A1-13: Part A1 gate

- [ ] Run the merge gate (steps 1–5; step 6 has no pages in A1).
- [ ] Open the PR "6-A1: shared platform (settings, commands, hand-off text, share codec, text worker, crypto, colour, data formats, time, syntax)". The description lists each module with its tests and both licences (`yaml` ISC, `smol-toml` BSD-3-Clause).

---

# Part 6-A2: kit additions

**Branch:** `feat/p6-a2-kit` (after A1 merged). **Boundary:** `src/shared/ui/**`, plus A2-9's migration of the two Plotly consumers. Every component gets component tests (keyboard and ARIA), a gallery entry and baselines (A2-17).

### Task A2-1: `VirtualList`

**Files:**

- Create: `src/shared/ui/virtual-list.tsx`, `virtual-list.test.tsx`

**Interfaces:**

- Produces: `VirtualList<T>` with props:
  - `items: T[]`
  - `estimateSize: number | ((i) => number)`
  - `measure?: boolean` (ResizeObserver per row)
  - `overscan = 6`
  - `renderItem(item, index, { focused }): ReactNode`
  - `getKey(item, i)`
  - `role?: 'list' | 'listbox' | 'tree' | 'grid' | 'log'`
  - `ariaLabel`
  - `stickyHeaders?: { index: number; render(): ReactNode }[]`
  - `onRangeChange?(start, end)`
  - `ref: { scrollToIndex(i, align?: 'start' | 'center' | 'auto') }`
  - `focusModel?: 'roving' | 'none'`
- Consumes: none.

- [ ] **Tests** (jsdom, with `ResizeObserver` and `getBoundingClientRect` mocked so the viewport is 200 px):
  - With 100,000 items at 20 px, at most 10 visible plus overscan rows are rendered.
  - `scrollToIndex(5000, 'center')` sets `scrollTop` to `5000 * 20 - 100 + 10`.
  - Roving focus: ArrowDown and End move the active row and call `scrollToIndex`; Home goes to the first row.
  - `aria-setsize` and `aria-posinset` are set on rows.
  - Measured mode: after a row reports 40 px, the total height updates.
- [ ] **Commit:** `feat(kit): VirtualList with measured rows, sticky headers and roving focus`.

### Task A2-2: `CodeSurface` core

**Files:**

- Create: `src/shared/ui/code-surface/{code-surface.tsx,use-highlight.ts,find-bar.tsx,index.ts}`, `code-surface.test.tsx`

**Interfaces:**

- Produces: `CodeSurface` with props:
  - `value`, `onChange?`
  - `language: LanguageId | 'plain'`
  - `label` (required)
  - `readOnly?`, `wrap?`, `lineNumbers = true`, `tabSize = 2`, `placeholder?`
  - `onSelectionChange?(start, end)`
  - `ref: { focus(); setSelection(start, end, { scroll }); scrollToLine(n) }`
  - `minHeight?`, `maxHeight?`
- Behaviour:
  - A transparent `textarea` over a highlighted line view (tokens from `syntax/*`, highlighted per visible line only through `VirtualList` when over 2,000 lines).
  - Gutter line numbers.
  - Tab and Shift+Tab indent and outdent the selected lines.
  - Enter keeps indentation.
  - Auto-pairs `() [] {} "" ''` only when the next character is whitespace or the end.
  - Mod+F opens the find bar (literal or regex, match count "3 of 17", Enter or Shift+Enter cycle, Escape closes).
  - Mod+/ toggles line comments for languages that have them.
- Consumes: `syntax/*`, `VirtualList`, kit `Input`, `IconButton`.

- [ ] **Tests** (jsdom):
  - Typing updates `onChange`.
  - Tab on a three-line selection indents all three by `tabSize`; Shift+Tab reverts.
  - Enter after `"  foo"` inserts `"\n  "`.
  - The find bar counts matches in `'a b a'` for `a` as "1 of 2" and Enter moves to "2 of 2".
  - Read-only mode has `aria-readonly` and no `onChange`.
  - The textarea has an accessible name from `label`.
  - The highlighted layer is `aria-hidden`.
  - With 50,000 lines, fewer than 200 line nodes are rendered.
- [ ] **Commit:** `feat(kit): CodeSurface editor with highlighting, indentation and find`.

### Task A2-3: `CodeSurface` decorations, markers, folds, single-line

**Files:**

- Modify: `src/shared/ui/code-surface/*` (+ tests)

**Interfaces:**

- Produces new props:
  - `markers?: { line; column?; message; severity: 'error' | 'warning' | 'info' }[]` (gutter icon plus underline plus tooltip; announced through a polite live region "Error on line 3: ...")
  - `lineDecorations?: { line; kind: 'added' | 'removed' | 'changed' | 'match' | 'active' }[]`
  - `ranges?: { start; end; kind: 'match' | 'match-active' | 'diff-add' | 'diff-del' | 'search' }[]`
  - `folds?: { fromLine; toLine; label: string }[]` (collapsed regions rendered as a kit `Button` "Show 120 hidden lines" that calls `onUnfold(index)`)
  - `singleLine?: boolean` (Enter calls `onSubmit`, no gutter)
- Consumes: as above.

- [ ] **Tests:**
  - A marker renders its gutter icon with an accessible label and the message in a tooltip; the live region announces the first error once.
  - A range of kind `match` wraps exactly characters 2–5 in a `mark` element with the token class.
  - A fold of lines 10–129 shows the button "Show 120 hidden lines" and no line nodes for 11–128; clicking it calls `onUnfold(0)`.
  - Single-line mode: Enter calls `onSubmit` and inserts no newline.
- [ ] **Commit:** `feat(kit): CodeSurface markers, decorations, ranges, folds and single-line mode`.

### Task A2-4: `TextInputPanel`

**Files:**

- Create: `src/shared/ui/text-input-panel.tsx`, `text-input-panel.test.tsx`

**Interfaces:**

- Produces: `TextInputPanel` per spec §4.1. Props:
  - `value`, `onChange`, `language`, `label`
  - `accept?`, `samples?`, `downloadName?`, `encodingOptions?`
  - `handoff?: (p) => boolean`
  - `maxBytes?`, `warnBytes = 5 MB`
  - `markers?`, `readOnly?`, `extraMeta?`, `acceptBinary?`
  - `onFile?(file)` (raw access for tools that need bytes)
- Consumes: `CodeSurface`, `useHandoff`, `loadTextFile`, kit `Toolbar`, `IconButton`, `Tooltip`, `DropdownMenu`, `MetaList`, `Badge`, `notify`.

- [ ] **Tests:**
  - Paste reads the clipboard (mocked) into `onChange`; a permission error shows the inline notice "Clipboard access was blocked; press Mod+V in the editor instead".
  - Dropping a `.json` file calls `onChange` with its text; dropping a binary (NUL byte) gives `INVALID_FILE` "This looks like a binary file".
  - A single sample loads directly; several samples open a menu.
  - Clear empties the text and shows a toast with "Undo", which restores it.
  - The status line shows "3 lines" and "12 bytes" for `'a\nb\nc'` with UTF-8 multi-byte characters counted correctly.
  - Over `warnBytes` a "Large input" badge appears; over `maxBytes` the input is refused with `TOO_LARGE` naming the limit.
  - A matching hand-off fills the panel once.
  - The `encoding` option `windows-1252` decodes byte `0x80` as the euro sign (assert the code point `0x20ac`).
- [ ] **Commit:** `feat(kit): TextInputPanel with paste, open, drop, samples, hand-off and size limits`.

### Task A2-5: `SplitPane`

**Files:**

- Create: `src/shared/ui/split-pane.tsx`, `split-pane.test.tsx`

**Interfaces:**

- Produces: `SplitPane` with props `direction: 'horizontal' | 'vertical'`, `defaultRatio = 0.5`, `min = 0.15`, `persistKey?`, `collapsible?: 'start' | 'end' | 'both'`, `stackBelow = 'md'`, and `children: [ReactNode, ReactNode]`. The separator is `role=separator` with `aria-valuenow` (percent), `aria-controls` and `tabIndex=0`. Arrow keys move it 5%, Shift+Arrow 20%, Home and End jump to `min`/`max`, Enter or double-click resets. The ratio is persisted via `createToolSettings('kit-split', ...)` keyed by `persistKey`.
- Consumes: kit `Positioned` (P5) for data-driven sizes.

- [ ] **Tests:**
  - ArrowRight changes `aria-valuenow` from 50 to 55, and it clamps at `min`/`max`.
  - Double-click resets.
  - Persisted: remount with the same `persistKey` and the ratio is restored.
  - Below `md` (matchMedia mocked) both panes stack and the separator is absent.
- [ ] **Commit:** `feat(kit): SplitPane with keyboard resize, persistence and stacked phone layout`.

### Task A2-6: `DataGrid` core

**Files:**

- Create: `src/shared/ui/data-grid/{data-grid.tsx,columns.ts,sort.ts,index.ts}`, `data-grid.test.tsx`, `sort.test.ts`

**Interfaces:**

- Produces: `DataGrid<R>` with props:
  - `rows: R[]`
  - `columns: { id; header; accessor(r): unknown; type?: 'text' | 'number' | 'date' | 'boolean'; width?; minWidth?; hidden?; pinned?: 'start' }[]`
  - `rowKey(r, i)`
  - `sort?: { id; dir: 'asc' | 'desc' }[]`, `onSortChange?`
  - `onColumnsChange?` (order, width, hidden)
  - `rowHeight = 32`, `ariaLabel`
  - `onRowActivate?(r)`
- Also produces `multiSort(rows, sort, columns): R[]` (stable; nulls last; numbers numeric; dates by value; text by `Intl.Collator` numeric).
- Consumes: `VirtualList` (rows) plus horizontal column virtualisation (render visible columns plus 2).

- [ ] **Tests:**
  - **`sort.test.ts`:** stable, multi-key, nulls last for both directions, numeric collation (`'item2' < 'item10'`).
  - **`data-grid.test.tsx`:**
    - `role=grid` with `aria-rowcount` equal to the rows plus 1 and `aria-colcount`;
    - clicking a header sorts ascending, then descending, then none; Shift+click adds a secondary key and `aria-sort` reflects it;
    - arrow keys move the active cell (`aria-activedescendant`); Home and End move within the row; Mod+Home goes to the first cell;
    - dragging the column resize handle (pointer events) changes the width; keyboard resize via the header menu "Wider" and "Narrower";
    - 1,000,000 rows times 30 columns render fewer than 50 rows times 12 columns of cells.
- [ ] **Commit:** `feat(kit): virtualised DataGrid with multi-sort, resize and keyboard cell navigation`.

### Task A2-7: `DataGrid` filters, search, selection, details, editing

**Files:**

- Modify: `src/shared/ui/data-grid/*`
- Create: `filters.ts`, `filters.test.ts`

**Interfaces:**

- Produces new props:
  - `filters?: Record<string, ColumnFilter>`, `onFiltersChange?`
  - `ColumnFilter = { kind: 'text'; value; regex?: boolean } | { kind: 'range'; min?; max? } | { kind: 'empty'; empty: boolean } | { kind: 'set'; values: string[] }`
  - `search?: string` (highlight only; filtering is done by the caller through `applyFilters`)
  - `selection: 'cell-range'` (Mod+C copies TSV)
  - `renderDetails?(r)` (Space or Enter on a row opens a `Drawer`)
  - `editable?: (col) => boolean`, `onCellEdit?(rowIndex, colId, value)`
- Also produces `applyFilters(rows, columns, filters): { rows: R[]; errors: Record<string, string> }` (an invalid regex reports an error entry and filters nothing; it never throws).
- Consumes: kit `Popover`, `Input`, `Checkbox`, `Drawer`.

- [ ] **Tests:**
  - **`filters.test.ts`:** text contains (case-insensitive); regex `^a` and invalid `(` give an error entry and pass all rows; range with open ends; empty; set.
  - **Grid:**
    - the filter popover opens from the header button "Filter Name";
    - Shift+Arrow extends the cell range and Mod+C writes `"a\tb\nc\td"` (mock the clipboard);
    - Enter opens the details drawer;
    - F2 or double-click edits; Enter commits through `onCellEdit`; Escape cancels.
- [ ] **Commit:** `feat(kit): DataGrid filters, search highlight, range copy, row details and cell editing`.

### Task A2-8: `Chart` core (in-house canvas)

**Files:**

- Create: `src/shared/ui/chart/{chart.tsx,scales.ts,ticks.ts,paint.ts,theme.ts,index.ts}`, `scales.test.ts`, `chart.test.tsx`

**Interfaces:**

- Produces: `Chart` with props:
  - `kind: 'line' | 'area' | 'bar' | 'scatter'`
  - `series: { id; label; points: { x: number | Date | string; y: number | null }[] }[]`
  - `stacked?`, `xType?: 'linear' | 'time' | 'band'`
  - `height = 260`, `ariaLabel`, `ariaSummary?`
  - `xLabel?`, `yLabel?`, `legend = true`
  - `formatX?`, `formatY?`
  - `onPointHover?`
- Behaviour:
  - Canvas painting with device-pixel snapping.
  - Colours come from `readThemeTokens(['chart-1', ..., 'chart-8', 'fg-muted', 'line'])`. If A3-5 has not merged yet, A2-8 creates `src/shared/lib/theme-tokens.ts` and A3-5 reuses it; whoever merges second dedupes.
  - Repaints on `data-theme` change.
  - Hover crosshair and tooltip (kit `Popover`).
  - A "Show data table" toggle renders a kit `Table` with the same data.
- Also produces `niceTicks(min, max, count): number[]` and `timeTicks(min, max, count)`.
- Consumes: kit `Popover`, `Table`, a kit-owned canvas.

- [ ] **Tests:**
  - **`scales.test.ts`:** `niceTicks(0, 97, 5)` gives `[0, 20, 40, 60, 80, 100]`; `niceTicks(-0.3, 0.7, 5)` gives `[-0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8]`; time ticks over 3 days give day boundaries.
  - **`chart.test.tsx`** (a jsdom canvas stub records calls):
    - `role=img` with an `aria-label`;
    - the "Show data table" toggle renders a table with the series rows;
    - a `data-theme` change triggers a repaint;
    - `null` points break lines (no `lineTo` across the gap).
- [ ] **Commit:** `feat(kit): canvas Chart with nice ticks, themes, tooltip and an accessible data table`.

### Task A2-9: `Chart` advanced kinds, interaction, export; Plotly removed

**Files:**

- Modify: `src/shared/ui/chart/*`
- Create: `lttb.ts`, `lttb.test.ts`, `sampling.ts`, `sampling.test.ts`
- Delete: the P5 Plotly chart adapter under `src/shared/ui/adapters/`
- Modify: the consumers found by grep (expected: `src/tools/calculator/components/GraphDisplay.tsx` and the `csv-viewer` chart), `package.json` (remove `plotly.js`, `react-plotly.js`, `@types/plotly.js`, `@types/react-plotly.js`), and `src/shared/lib/interop.ts` (delete if no other importer)

**Interfaces:**

- Produces:
  - `kind: 'histogram'` (`bins: number | 'auto'`, Freedman-Diaconis)
  - `kind: 'heatmap'` (`cells: { x; y; value }[]`, `calendar?: boolean`)
  - `kind: 'function'` (`fns: { id; label; fn(x): number }[]`, adaptive sampling)
  - Props: `zoomable` (wheel about the cursor, drag pan, pinch, keyboard `+ - 0` and arrows), `brush?: (range: [number, number] | null) => void`
  - `exportPng(): Promise<Blob>`, `exportSvg(): string` (line, bar, area)
  - `lttb(points, threshold)`
  - `adaptiveSample(fn, [a, b], { minSegments = 64, maxDepth = 10, tolerancePx = 0.5 }): { x; y: number | null }[]` (subdivides where the midpoint deviates; NaN or Infinity breaks)
- Consumes: as above.

- [ ] **Tests:**
  - `lttb` keeps the first and last points and returns exactly `threshold` points; a 100k sine series downsampled to 1,000 keeps its extremes within 1%.
  - `adaptiveSample(Math.tan, [-3, 3])` produces breaks near plus or minus pi/2 (`null` entries) and more samples near the asymptotes than in flat regions.
  - Histogram bins for 1,000 seeded normal samples follow Freedman-Diaconis.
  - The heatmap calendar renders 12 weeks times 7 cells (calls recorded).
  - Brush calls `onBrush([x0, x1])` after a drag.
  - `exportSvg()` contains a `path` per line series.
  - Consumers keep working: the calculator's `GraphDisplay` renders `kind='function'` with the P0 compiled function (sampling replaced by `adaptiveSample`); the existing calculator and CSV tests pass.
  - `pnpm why plotly.js` reports nothing after removal.
- [ ] **Commit:** `feat(kit): histogram, heatmap and function charts with zoom, brush and export; remove Plotly`.

### Task A2-10: `ColorPicker`

**Files:**

- Create: `src/shared/ui/color-picker.tsx`, `color-picker.test.tsx`

**Interfaces:**

- Produces: `ColorPicker` with props `value: string` (any CSS colour), `onChange(css: string, color: Color)`, `mode: 'srgb' | 'oklch'`, `alpha?`, `label`, `recent?: string[]`, `showEyeDropper = true`. The 2D area is a slider pair (`role=slider` for x and y with `aria-valuetext`); hue and alpha are sliders; there is a text field (any format, validated via `parseColor`) and an EyeDropper button (only when `'EyeDropper' in window`).
- Consumes: `color/*`, kit `Slider`, `Input`, `IconButton`, `Swatch`.

- [ ] **Tests:**
  - Typing `oklch(70% 0.1 200)` emits the hex-normalised colour; invalid text shows the inline error from `parseColor`.
  - ArrowRight on the area increases saturation by 1% (`aria-valuetext` "Saturation 51 percent").
  - The EyeDropper button is hidden without the API; with a mocked `window.EyeDropper`, `open()` resolves `{ sRGBHex: '#123456' }` and emits it.
  - Alpha slider changes are reflected in the `rgba()` output.
- [ ] **Commit:** `feat(kit): ColorPicker with sRGB/OKLCH modes, any-format input and EyeDropper`.

### Task A2-11: `CodeTree`

**Files:**

- Create: `src/shared/ui/code-tree.tsx`, `code-tree.test.tsx`, `src/shared/ui/code-tree-model.ts`, `code-tree-model.test.ts`

**Interfaces:**

- Produces:
  - `TreeNodeData = { id: string; label: string; value?: { text: string; kind: TokenKind }; summary?: string; childCount: number; children?: () => TreeNodeData[] }` (lazy children)
  - `CodeTree` with props:
    - `roots: TreeNodeData[]`
    - `expanded: Set<string>`, `onExpandedChange`
    - `selectedId`, `onSelect(id)`
    - `search?: { ids: Set<string>; activeId? }`
    - `ariaLabel`, `rowHeight = 22`
    - `rowStyle: 'code'` (renders `"key": value,` with syntax tokens)
  - `ref: { scrollToId(id); expandTo(id) }`
  - `flattenVisible(roots, expanded): { node; depth; isLast; ancestorsLast: boolean[] }[]` (model, pure)
  - Behaviour: indent guides (kit-rendered elements per depth); an active-branch accent guide on the ancestors of the selection; folded nodes show the summary chip (`{4}`, `[12]`, `<3>`).
- Consumes: `VirtualList`, syntax token CSS.

- [ ] **Tests:**
  - **`code-tree-model.test.ts`:** `flattenVisible` for a nested fixture gives the expected depth and order; lazy children are only called when expanded; the `ancestorsLast` flags are correct for guide drawing.
  - **`code-tree.test.tsx`:**
    - `role=tree`; rows are `treeitem` with `aria-level`, `aria-expanded`, `aria-selected`, `aria-setsize`, `aria-posinset`;
    - ArrowRight expands, then moves to the first child; ArrowLeft collapses, then moves to the parent; `*` expands all siblings; Home and End;
    - type-ahead jumps to the next label starting with the typed letters;
    - the selected node's ancestors carry the `data-active-branch` attribute;
    - 1,000,000 flattened rows stay virtualised (fewer than 100 DOM rows).
- [ ] **Commit:** `feat(kit): CodeTree with indent guides, active branch, summary chips and full tree keyboard`.

### Task A2-12: `KeyValueEditor`

**Files:**

- Create: `src/shared/ui/key-value-editor.tsx`, `key-value-editor.test.tsx`

**Interfaces:**

- Produces:
  - `KeyValueRow = { id; enabled; key; value; type?: 'text' | 'secret' | 'file'; file?: File; description? }`
  - `KeyValueEditor` with props `rows`, `onChange(rows)`, `allowFiles?`, `allowSecret?`, `keyLabel = 'Key'`, `valueLabel = 'Value'`, `bulkEdit = true`, `ariaLabel`
  - Reorder via Alt+ArrowUp/Down (R13) and detent pointer drag (`keyboard: false`); the bulk-edit toggle switches to a `CodeSurface` with `key: value` lines (disabled rows prefixed `# `)
- Consumes: kit `Table`, `Checkbox`, `Input`, `SecretText` (A2-15; land A2-15 first if the executor orders tasks, otherwise use `Input type=password` and switch in A2-15), `FileUpload`, `IconButton`, `CodeSurface`, detent.

- [ ] **Tests:**
  - Add a row, edit it, toggle enabled, delete it.
  - Alt+ArrowDown moves the focused row down and announces "Moved Accept to position 2".
  - The bulk-edit round-trip preserves disabled rows (`# key: value`).
  - Duplicate keys are allowed.
  - The file type shows a file picker and stores the `File`.
- [ ] **Commit:** `feat(kit): KeyValueEditor with toggles, secrets, files, reorder and bulk edit`.

### Task A2-13: `CompareSlider` and `SandboxedHtml`

**Files:**

- Create: `src/shared/ui/compare-slider.tsx`, `compare-slider.test.tsx`, `src/shared/ui/sandboxed-html.tsx`, `sandboxed-html.test.tsx`

**Interfaces:**

- Produces:
  - `CompareSlider` with props `before: ImageSource`, `after: ImageSource`, `labels = ['Before', 'After']`, `initial = 0.5`, `zoom?: 'fit' | '1:1'`. The divider is `role=slider` (arrows 1%, Shift 10%); panning is synchronised in 1:1 mode.
  - `SandboxedHtml` with props `html`, `title`, `allowRemoteImages = false`, `baseCss?`, `onLoad?`, and `ref: { print() }`.
    - It renders an `iframe` with `sandbox=""`. Step 0 checks whether `print()` works from a sandboxed frame; if not, printing uses a temporary frame with `sandbox="allow-modals"` (scripts still disabled).
    - `srcdoc` is `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:` (plus ` https:` when `allowRemoteImages`) `; style-src 'unsafe-inline'">`, followed by the styles and the HTML.
  - `countRemoteImages(html): number` helper.
- Consumes: kit `Image`/`BitmapCanvas`, `Slider`.

- [ ] **Tests:**
  - **CompareSlider:** ArrowLeft moves the divider from 50 to 49; `aria-valuetext` reads "Showing 49 percent before".
  - **SandboxedHtml:**
    - the `iframe` has `sandbox=""` and a `title`;
    - `srcdoc` contains the CSP meta without `https:` by default and with it when allowed;
    - a script in the HTML stays inert: `srcdoc` keeps it, but sandbox and CSP block it (assert the CSP string here; the C-16 e2e asserts no execution);
    - `countRemoteImages('<img src="https://a/b.png"><img src="data:x">')` returns 1.
- [ ] **Commit:** `feat(kit): CompareSlider and a CSP-locked SandboxedHtml preview`.

### Task A2-14: `CameraCapture`

**Files:**

- Create: `src/shared/ui/camera-capture.tsx`, `camera-capture.test.tsx` (or extend a P5-H camera primitive if present: Step 0)

**Interfaces:**

- Produces: `CameraCapture` with props `active: boolean`, `onFrame?: (bitmap: ImageBitmap) => void`, `fps = 8`, `facingMode = 'environment'`, `label`, `onError(e: ToolError)`.
  - It renders a device `Select` (after permission), a torch toggle when `track.getCapabilities().torch`, and Start and Stop buttons.
  - Tracks stop on `active=false` and on unmount.
  - Errors: `NotAllowedError` gives `INVALID_INPUT` "Camera access was blocked. Allow the camera for this site in your browser settings."; `NotFoundError` gives `UNSUPPORTED_FEATURE` "No camera found".
- Consumes: `navigator.mediaDevices`; the kit owns the `video` element.

- [ ] **Tests** (mocked `getUserMedia`, `MediaStreamTrack.stop` spy):
  - Start requests the stream; Stop and unmount stop every track.
  - `NotAllowedError` calls `onError` with the message above.
  - `onFrame` is called at about `fps` (fake timers plus a `createImageBitmap` mock).
  - Torch is hidden without the capability.
- [ ] **Commit:** `feat(kit): CameraCapture with device choice, torch and guaranteed track shutdown`.

### Task A2-15: `BitGrid`, `Meter`, `SecretText`, `BytesView`, `FocusOverlay`, `DeviceFrame`

**Files:**

- Create: one file plus a test each under `src/shared/ui/`

**Interfaces:**

- `BitGrid`: props `bits: 8 | 16 | 32 | 64`, `value: bigint`, `onToggle?(index)`, `readOnly?`. MSB first, grouped by nibble and byte, index labels; each bit is a toggle button named "Bit 7, set".
- `Meter`: props `value` (0–1), `segments?`, `tone?: 'danger' | 'warning' | 'ok' | 'auto'`, `label`, `valueText`. `role=meter`.
- `SecretText`: props `value`, `revealed`, `onRevealedChange`, `copyable`. The masked form is an SVG dot pattern sized to the length; it never renders bullet glyphs.
- `BytesView`: props `bytes`, `mode: 'hex' | 'binary'`, `bytesPerRow = 16`, `ariaLabel`. Offsets, hex, and an ASCII column with control names; virtualised.
- `FocusOverlay`: props `open`, `onClose`, `children`. A `dialog` with focus trap, Esc closes, reduced-motion aware.
- `DeviceFrame`: props `preset: 'phone' | 'tablet' | 'desktop' | { width; height }`, `children`. It labels its size.

- [ ] **Tests:**
  - `BitGrid` toggling bit 0 of `0n` emits `onToggle(0)`; Arrow keys move between bits; the labels are correct.
  - `Meter` `aria-valuenow` and the auto tone thresholds (below 0.4 danger, below 0.7 warning).
  - `SecretText` masked: no text node contains the secret and no text contains U+2022; revealed shows it.
  - `BytesView` row `00000010` shows `41 42` and `AB`, and control byte `0x00` shows as `NUL`.
  - `FocusOverlay` traps Tab and Esc calls `onClose`.
  - `DeviceFrame` phone is 390 by 844.
- [ ] **Commit:** `feat(kit): BitGrid, Meter, SecretText, BytesView, FocusOverlay and DeviceFrame`.

### Task A2-16: `SendToMenu`, `ShareButton`, `PrivacyNote`, icon group

**Files:**

- Create: `src/shared/ui/send-to-menu.tsx`, `share-button.tsx`, `privacy-note.tsx` plus tests, and `src/shared/ui/icons/custom/tools-p6.tsx` (custom icons needed by A2 and A3: `IconLayoutLeftRight`, `IconLayoutTopBottom`, `IconSendTo`, `IconShareLink`, `IconBitToggle`, plus any found in review)
- Modify: `src/shared/ui/icons/index.ts` (one barrel line)

**Interfaces:**

- `SendToMenu`: props `payload: () => HandoffPayload | null` (lazy, computed on open), `sourceTool`, `label = 'Send to'`. It lists `toolsAccepting(mime)` (or the file kinds) excluding the source; the empty state is "No other tool accepts this". Selecting an item calls `sendTo`.
- `ShareButton`: props `share: { share(); canShare; reason? }`. Disabled with a tooltip `reason`; on success it toasts "Link copied".
- `PrivacyNote`: props `variant: 'local' | 'network'`, `children?`. `local` reads "Nothing leaves your browser."; `network` reads "Requests go directly from your browser to the URL you enter."
- Consumes: A1-3, A1-4, kit `DropdownMenu`, `Tooltip`, icons.

- [ ] **Tests:**
  - `SendToMenu` lists only enabled tools whose `accepts.mimes` include the payload mime, with icons and names from a mocked registry; selecting navigates to `/<cat>/<slug>?handoff=<id>`.
  - `ShareButton` is disabled with the tooltip text when `canShare` is false.
  - `PrivacyNote` wording.
  - The icon gallery snapshot lists the new names.
- [ ] **Commit:** `feat(kit): SendToMenu, ShareButton, PrivacyNote and phase-6 custom icons`.

### Task A2-17: Gallery, baselines, Part A2 gate

- [ ] Add a `/__kit` gallery section per new component (realistic data, both themes, states: empty, error, loading).
- [ ] Run `pnpm test:visual --update` for the new gallery entries only, review every image in both themes at desktop and phone sizes, and commit the baselines.
- [ ] Run the merge gate (steps 1–6).
- [ ] Open the PR "6-A2: kit additions (CodeSurface, TextInputPanel, SplitPane, VirtualList, DataGrid, Chart, ColorPicker, CodeTree, KeyValueEditor, CompareSlider, SandboxedHtml, CameraCapture and more); Plotly removed".

---

# Part 6-A3: diagram engine (ported from Verql)

**Branch:** `feat/p6-a3-diagram` (after P5-A2; parallel with A1 and A2). **Source:** `gh api repos/arshad-shah/verql/contents/src/renderer/src/components/er/<file> --jq .content | base64 -d` and `tests/unit/er/<file>`. Every ported file carries the attribution header from spec §6.1. **Boundary:** `src/shared/diagram/**`, `src/shared/ui/diagram-canvas.tsx`, and one kit barrel line.

### Task A3-1: `model.ts` and `metrics.ts`

**Files:**

- Create: `src/shared/diagram/model.ts`, `metrics.ts`, `metrics.test.ts`

**Interfaces:**

- Produces:
  - `RowKind`, `DiagramRow`, `DiagramNode`, `DiagramEdge`, `Diagram` (spec §6.2)
  - `indexNodes(d)`, `pruneEdges(d)`
  - Constants: `HEADER_H = 36`, `ROW_H = 22`, `BODY_PAD_B = 6`, `PAD_X = 12`, `CHIP_GAP = 8`, `MIN_W = 176`, `MAX_W = 360`, `RADIUS = 8`, `GRID = 4`, `LOD_SCALE = 0.55`
  - `Measure`; `createMeasure(font?: { family: string })` (`OffscreenCanvas` or `document` canvas, else a fixed advance of `0.6 * px` per character; cached)
  - `Card = { id; node; x; y; w; h; rows: { y; midY }[] }`
  - `buildCards(nodes, theme, measure): Card[]`
  - `rowAnchor(card, row): { x; y }` (right edge, row centre)
  - `headerAnchor(card): { x; y }` (left edge, header centre)
  - `fit(text, font, max, measure)` (the ellipsis is built with `String.fromCodePoint(0x2026)` so the source stays plain ASCII)
- Consumes: the `DiagramTheme` type (declared here, implemented in A3-5).

- [ ] **Tests** (port of the Verql `erd-geometry` "metrics" cases, adapted):
  - Card width grows with longer keys or values and is clamped to `[MIN_W, MAX_W]` and quantised to 4.
  - The height is `HEADER_H + rows * ROW_H + BODY_PAD_B`.
  - `rowAnchor` y equals `card.y + HEADER_H + i * ROW_H + ROW_H / 2`.
  - `fit` truncates with the ellipsis and fits within `max`.
  - The headless measure is deterministic (`'abcd'` at 12 px is 28.8).
- [ ] **Commit:** `feat(diagram): typed record-card model and metrics (ported from Verql)`.

### Task A3-2: `layout.ts` (layered port plus tree fast path)

**Files:**

- Create: `src/shared/diagram/layout.ts`, `layout.test.ts`

**Interfaces:**

- Produces:
  - `Direction = 'LR' | 'TB'`
  - `LayoutOptions = { direction; rankGap = 96; nodeGap = 28; componentGap = 64; passes = 4; timeBudgetMs = 600 }`
  - `layout(cards, edges, opts): { mode: 'tree' | 'layered'; truncatedPasses: boolean }` (mutates `x`/`y`)
- Behaviour:
  - Verql's cycle break, longest-path rank, components, median and transpose ordering, place with drift correction, and integer snapping, all ported.
  - The **tree fast path** applies when every node has at most one parent and there are no cycles: rank is the depth, the order is the DFS order sorted by the parent's `toRow` (children appear in key order), and ordering passes are skipped.
  - The time budget stops refinement passes early and reports it.
- Consumes: A3-1.

- [ ] **Tests** (port of Verql "layout placement" and "termination", plus new ones):
  - No overlapping cards; a parent strictly left of its children (LR) and above them (TB).
  - Deterministic coordinates; integer origins.
  - A cyclic graph terminates with finite coordinates; orphans stack without overlap; an empty diagram works; self references are dropped from ranking.
  - **Tree path:** for a JSON-like fixture with a root whose rows 0, 1, 2 link to children A, B, C, the result is `mode: 'tree'` and A, B, C appear top to bottom in row order (LR).
  - **Budget:** 5,000 nodes (a random tree of fan-out 1–8) complete in under 800 ms in Node (logged; hard limit 3 s); a 2,000-node random DAG with `timeBudgetMs: 1` reports `truncatedPasses: true` and still has no overlaps.
- [ ] **Commit:** `feat(diagram): layered layout with a tree fast path and a time budget (ported from Verql)`.

### Task A3-3: `route.ts` (row ports)

**Files:**

- Create: `src/shared/diagram/route.ts`, `route.test.ts`

**Interfaces:**

- Produces:
  - `LANE = 14`, `STUB = 12`
  - `EndMarker = 'none' | 'dot'`
  - `Route = { id; from; to; pts: number[]; dashed; marker: EndMarker; minX; minY; maxX; maxY }`
  - `route(cards, edges, { marker = 'dot' }): Route[]`
- Behaviour: the parent port is `rowAnchor(parent, toRow)` (the header if absent) exiting right in LR (bottom in TB); the child port is `headerAnchor(child)`. Corridors, lane fanning, and the self and overlap cases are ported.
- Consumes: A3-1.

- [ ] **Tests** (port of "routing corridor discipline", plus new ones):
  - A vertical leg never passes through an uninvolved card.
  - Edges from rows 0 and 2 of the same parent start at exactly those rows' `midY`.
  - Two edges sharing a channel take different lanes (x differs by `LANE`).
  - `dashed` follows `style`.
  - The bounding boxes contain all points.
- [ ] **Commit:** `feat(diagram): orthogonal row-port edge routing with corridors and lanes (ported from Verql)`.

### Task A3-4: `viewport.ts` and `spatial-index.ts`

**Files:**

- Create: `src/shared/diagram/viewport.ts`, `viewport.test.ts`, `spatial-index.ts`, `spatial-index.test.ts`

**Interfaces:**

- Produces:
  - `Viewport`, `identity`, `toWorldX`, `toWorldY`, `zoomAt` (scale clamp 0.05–3), `bounds`, `fitToView`, `pick`
  - `pickRow(card, wy): number | null`
  - `centreOn(view, card, size): Viewport`
  - `minimapTransform(bounds, w, h): { scale; ox; oy }`
  - `SpatialIndex.build(cards, routes, cell = 512)`; `.queryCards(rect)`, `.queryRoutes(rect)`, `.pickCard(wx, wy)`
- Consumes: A3-1, A3-3.

- [ ] **Tests** (port of Verql `erd-viewport`, plus new ones):
  - The screen-to-world round-trip; `zoomAt` keeps the cursor pixel fixed and clamps.
  - `bounds`, `fitToView` (centres; never above `MAX_SCALE`); `pick` returns the topmost card.
  - `pickRow` returns the right row index and null in the header.
  - `SpatialIndex` returns the same set as a linear scan for 1,000 random rects over 10,000 cards, and is at least 10 times faster than linear for small rects (timed, logged).
- [ ] **Commit:** `feat(diagram): viewport maths, row picking and a spatial index for culling`.

### Task A3-5: `theme-bridge.ts`

**Files:**

- Create: `src/shared/diagram/theme-bridge.ts`, `theme-bridge.test.ts`, `src/shared/lib/theme-tokens.ts` (`readThemeTokens`, `watchTheme`; if A2-8 already created it, reuse it)

**Interfaces:**

- Produces:
  - `DiagramTheme` (surface, grid, card, cardHeader, cardBorder, cardBorderStrong, divider, title, eyebrow, key, value colours per `RowKind` from the syntax tokens, edge, edgeMuted, edgeActive, select, matchFill, and fonts `fontTitle`, `fontEyebrow`, `fontRow`, `fontChip` using the mono family)
  - `readDiagramTheme(el = document.documentElement)`
  - `watchTheme(cb, el)`
  - `readThemeTokens(names: string[], el?): Record<string, string>`
- Consumes: P5 token names (Step 0 confirms them in `tokens.css`).

- [ ] **Tests** (port of `erd-theme-bridge`):
  - Every field is a non-empty string.
  - Font shorthands have a pixel size and a family.
  - A token set on the element is reflected.
  - `watchTheme` fires on a `data-theme` change and stops after unsubscribe.
- [ ] **Commit:** `feat(diagram): theme bridge from live tokens (ported from Verql)`.

### Task A3-6: `paint.ts`

**Files:**

- Create: `src/shared/diagram/paint.ts`, `paint.test.ts`

**Interfaces:**

- Produces:
  - `PaintInput = { cards; routes; index: SpatialIndex; view; theme; measure; width; height; dpr; selectedId?; selectedRow?; hoveredId?; hoveredRow?; related?: Set<string>; matches?: Set<string>; grid = true }`
  - `paint(ctx, input): { drawnCards: number; drawnRoutes: number }`
- Behaviour:
  - Device-pixel snapping, as in Verql.
  - Dot grid.
  - Two-pass edges with lit edges on top.
  - Cards: header (eyebrow plus title), rows (key left in `syntax-key`, value right coloured by kind, chips `{n}` and `[n]` for links, `more` rows in `fg-subtle` italic).
  - Below `LOD_SCALE` a summary "12 fields".
  - Culling via `index.queryCards(viewRect)`.
  - Selection ring, related highlight, match row fill.
- Consumes: A3-1 to A3-5.

- [ ] **Tests** (a recording 2D-context stub):
  - Only cards intersecting the viewport are drawn (`drawnCards` equals the visible count for a 10,000-card grid with a small viewport).
  - At scale 0.4 no row text is drawn and the summary text is.
  - The selected card gets a stroke in `theme.select`.
  - A hairline at dpr 2 lands on a half device pixel (the Verql property).
  - A link row draws its chip text `{3}`.
- [ ] **Commit:** `feat(diagram): canvas painter with culling, level of detail and selection states (ported from Verql)`.

### Task A3-7: `export.ts` (SVG and PNG)

**Files:**

- Create: `src/shared/diagram/export.ts`, `export.test.ts`

**Interfaces:**

- Produces:
  - `toSvg(cards, routes, theme, pad = 32): string` (port; escaped text; mono font family from the theme)
  - `toPng(model, theme, { scale = 2, maxPixels = 64e6 }): Promise<{ blob: Blob; scaleUsed: number }>` (`OffscreenCanvas`; the scale reduces until under `maxPixels`, and the used scale is reported in the UI)
- Consumes: A3-3, A3-6.

- [ ] **Tests** (port of `erd-svg`):
  - The output is a single well-formed SVG (parsed by DOMParser in jsdom).
  - `<`, `&` and `"` are escaped in keys and values.
  - Dashed edges have `stroke-dasharray`.
  - A huge model reduces `scaleUsed` (a mocked `OffscreenCanvas`).
- [ ] **Commit:** `feat(diagram): SVG and PNG export from the same geometry`.

### Task A3-8: Layout worker

**Files:**

- Create: `src/shared/diagram/layout.worker.ts`, `layout-client.ts`, `layout-worker.test.ts`, `src/shared/diagram/index.ts`

**Interfaces:**

- Produces:
  - `layoutInWorker(diagram, opts, metrics: { family; sizes }, signal?): Promise<{ cards: Card[]; routes: Route[]; mode }>` (packs and unpacks `Float64Array` buffers, transferred)
  - `layoutSync(...)` with the same output
  - `WORKER_THRESHOLD = { nodes: 300, rows: 5000 }`
- Consumes: `worker-rpc`, `killable-client` (cancel on new input).

- [ ] **Tests:**
  - The in-process channel harness runs the handler: worker and sync results are deep-equal for three fixtures (a tree, a DAG, a cyclic graph).
  - Pack and unpack round-trip.
  - Aborting a second call cancels the first (`CANCELLED`).
- [ ] **Commit:** `feat(diagram): deterministic layout worker with packed transfer`.

### Task A3-9: `DiagramCanvas` host: render loop, sizing, pan, zoom, drag, minimap

**Files:**

- Create: `src/shared/ui/diagram-canvas.tsx`, `diagram-canvas.test.tsx`
- Modify: `src/shared/ui/index.ts` (one line)

**Interfaces:**

- Produces: `DiagramCanvas` with props `diagram`, `direction = 'LR'`, `selectedId?`, `selectedRow?`, `onSelect(id: string | null, row?: number)`, `matches?`, `onExpandMore?(id)`, `minimap = true`, `ariaLabel`, `ariaSummary`, `onLayout?(info: { cards; mode; truncatedPasses })`, and `ref: { fit(); zoomTo(scale); centreOn(id); exportPng(); exportSvg() }`.
- Behaviour:
  - Owns two canvases, a ResizeObserver and a dirty-flag rAF loop (repaint only when dirty).
  - Pointer: drag on empty space pans; dragging a card moves it and reroutes; click selects the card or row; a click on a `more` row calls `onExpandMore`.
  - Wheel zooms about the cursor; ctrl-wheel and pinch zoom.
  - The minimap paints the cards and the viewport rect; clicking or dragging it recentres.
  - Fits once per diagram after the first real size.
  - Repaints on theme change.
- Consumes: A3-1 to A3-8, kit `Positioned`.

- [ ] **Tests** (jsdom, canvas stub):
  - Mounting calls layout (sync for small diagrams; the worker client is mocked for large ones, and a 400-node fixture triggers `layoutInWorker`).
  - A click at a card's header calls `onSelect(id)`; at row 2, `onSelect(id, 2)`.
  - A wheel event changes the scale and the cursor world point stays fixed.
  - A minimap click recentres.
  - A theme attribute change marks it dirty.
  - Unmount cancels rAF and disconnects the ResizeObserver.
- [ ] **Commit:** `feat(kit): DiagramCanvas host with pan, zoom, drag, minimap and worker layout`.

### Task A3-10: `DiagramCanvas` controls, keyboard and accessibility; gallery

**Files:**

- Modify: `src/shared/ui/diagram-canvas.tsx` (+ tests)
- Create: the gallery entry

**Interfaces:**

- Produces: the controls toolbar and keyboard model exactly as spec §6.7 and §6.8:
  - controls: `+`, `-`, `0`, `1`, `D`, `M`, `C`, and the Mod+Shift+E export menu;
  - Tab and Shift+Tab cycle the selection in reading order; Enter selects; `[` and `]` go to the parent and first child; Alt+Up and Alt+Down go to siblings; Escape clears; arrows pan.
  - A live region announces "Object at <title>, n fields". The `aria-describedby` summary comes from `ariaSummary`.
- Consumes: kit `Toolbar`, `IconButton`, `Tooltip` (with `shortcut`), `DropdownMenu`, icons (A2-16 group plus lucide).

- [ ] **Tests:**
  - Every control has an accessible name and a tooltip with its shortcut.
  - `0` fits; `D` toggles direction (re-layout); `M` hides the minimap.
  - Tab cycles the selection in reading order (sorted by y, then x) and the live region text updates.
  - `]` from the root selects its first child.
  - Export PNG calls `toPng` and saves `diagram.png`.
- [ ] **Commit:** `feat(kit): DiagramCanvas controls, keyboard navigation and announcements`.

### Task A3-11: Performance test and Part A3 gate

- [ ] Add `src/shared/diagram/perf.test.ts`: 5,000 cards and 40,000 rows; layout under 800 ms (logged; hard 3 s); paint of a 1280x800 viewport under 8 ms average over 20 frames with the stub context (logged; hard 30 ms).
- [ ] Add the gallery baseline (a sample diagram, both themes).
- [ ] Run the merge gate.
- [ ] Open the PR "6-A3: diagram engine ported from Verql (layout, routing, paint, viewport, minimap, export, worker) and DiagramCanvas". The description includes the attribution and the Verql commit SHA used.

---

# Part 6-B: JSON & XML Viewer

**Branch:** `feat/p6-b-json-xml` (after A1, A2 and A3 merged). **Boundary:** `src/tools/json-and-xml-viewer/**`, deletion of P5's `FlowCanvas` and `CodeEditor` adapters (sole consumer), and `package.json` removals. **Spec:** §7.

### Task B-1: Document model, paths and accessors

**Files:**

- Create: `src/tools/json-and-xml-viewer/lib/doc-model.ts`, `lib/paths.ts`, `lib/doc-model.test.ts`, `lib/paths.test.ts`

**Interfaces:**

- Produces:
  - `DocNode = { id: string; path: PathSeg[]; kind: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'element' | 'attribute' | 'text' | 'comment' | 'cdata'; key?: string | number; name?: string; value?: string; childCount: number; children?: DocNode[]; range?: [number, number] }`
  - `PathSeg = { t: 'key'; k: string } | { t: 'index'; i: number } | { t: 'el'; name: string; nth: number } | { t: 'attr'; name: string } | { t: 'text'; nth: number }`
  - `fromJson(value, root: LocNode): DocNode` (ids are stable path strings)
  - `fromXml(doc: Document, text): DocNode` (ranges from a light scan of element start offsets)
  - `toJsonPath(path): string` (`$.store.book[0]['first name']`)
  - `toJsAccessor(path, rootVar = 'data'): string`
  - `toXPath(path): string` (`/catalog/book[2]/@id`, `text()[1]`)
  - `findById(root, id)`, `ancestors(root, id): string[]`
  - `summaryOf(node): string` (`{4}`, `[12]`, `<3>`)
- Consumes: `parseJsonWithLocations` (A1-9), `parseXml` (A1-10).

- [ ] **Tests:**
  - `toJsonPath` cases:

| Path                    | Output            |
| ----------------------- | ----------------- |
| `a.b[0]`                | `$.a.b[0]`        |
| key `first name`        | `$['first name']` |
| key `it's`              | `$['it\'s']`      |
| numeric-looking key `1` | `$['1']`          |

- `toJsAccessor` gives `data.a['first name'][0]`.
- `toXPath` for the second `book` element's `id` attribute gives `/catalog/book[2]/@id`.
- `fromJson` on `{"a":[1,{"b":null}]}` produces kinds, `childCount`s and ranges slicing the exact source.
- `fromXml` on `<r a="1"><i>x</i><!--c--><i/></r>` produces element, attribute, text and comment nodes in order, with `nth` counting same-name siblings.
- `ancestors` returns the root-to-parent ids.
- `summaryOf` gives `{1}`, `[2]`, `<2>`.
- [ ] **Commit:** `feat(json-xml): unified document model with JSONPath, JS accessor and XPath builders`.

### Task B-2: Parse pipeline (live, worker for large input, markers)

**Files:**

- Create: `src/shared/workers/handlers/json.ts` (appended to the barrel), `src/tools/json-and-xml-viewer/hooks/useParsedDocument.ts`, `lib/detect-format.ts`, `lib/detect-format.test.ts`, `hooks/useParsedDocument.test.tsx`

**Interfaces:**

- Produces:
  - `detectFormat(text, fileName?): 'json' | 'xml' | 'yaml'` (first non-space character `{`/`[` gives json; `<` gives xml; else yaml when `parseYaml` succeeds; the extension wins)
  - `useParsedDocument(text, format): { doc: DocNode | null; value: unknown; xml: Document | null; error: ToolError & { line?; column? } | null; warnings; parsing: boolean }` (150 ms debounce; input over 1 MB parses in the text worker via `json.parseWithLocations`; XML parses on the main thread with DOMParser; YAML goes to a JSON value through the lazy `yaml` import)
  - Worker handler `json.parseWithLocations(text)` returns `{ value, root, warnings }`
- Consumes: A1-5, A1-9, A1-10, B-1.

- [ ] **Tests:**
  - `detectFormat`: `' {"a":1}'` gives json, `'<?xml?><a/>'` gives xml, `'a: 1'` gives yaml, and `('x', 'f.xml')` gives xml.
  - The hook (jsdom, fake timers, mocked text worker):
    - updates after 150 ms;
    - a parse error exposes line and column;
    - a 1.2 MB input routes to the worker (mock called) and a 1 KB input does not;
    - a stale result (input changed mid-parse) is dropped.
- [ ] **Commit:** `feat(json-xml): live debounced parsing with worker offload and exact error positions`.

### Task B-3: Layout shell, path bar, old editor removed

**Files:**

- Modify: `src/tools/json-and-xml-viewer/Tool.tsx` (rewrite; split into `components/Shell.tsx`, `components/PathBar.tsx`)
- Delete: the old editor code using the P5 `CodeEditor` adapter and `rehype-*`; the P5 `src/shared/ui/adapters/code-editor*` if `grep -r "CodeEditor" src` shows no other consumer
- Modify: `package.json` (remove `@uiw/react-textarea-code-editor`, `rehype-prism-plus`, `rehype-rewrite`)

**Interfaces:**

- Produces: `SplitPane` (`persistKey: 'json-xml'`); left `TextInputPanel` (language from the format, the markers from B-2, samples JSON, XML and YAML, `accept: '.json,.xml,.yaml,.yml,.geojson,.svg'`); right `Tabs` Tree, Map, Query and Convert (Alt+1..4); format override `SegmentedControl` JSON | XML | YAML; `PathBar` with the copy actions (JSONPath or XPath, JS accessor, value, subtree JSON). Selection state is `selectedId` held in `Shell`.
- Consumes: A2 kit, B-1, B-2.

- [ ] **Tests** (component, jsdom):
  - Typing invalid JSON shows the marker and the inline error with "Jump to error" (moves the selection to that line).
  - The path bar copy buttons write the expected strings for a selected node (clipboard mocked).
  - Alt+3 switches to Query.
  - `pnpm why @uiw/react-textarea-code-editor` reports nothing.
- [ ] **Commit:** `feat(json-xml): split layout with TextInputPanel, tabs and a path bar; drop the old editor deps`.

### Task B-4: Tree tab

**Files:**

- Create: `src/tools/json-and-xml-viewer/components/TreeTab.tsx`, `lib/to-tree.ts`, `lib/to-tree.test.ts`, `lib/search.ts` (extend P0's with regex mode), `lib/search.test.ts`

**Interfaces:**

- Produces:
  - `toTreeData(doc): TreeNodeData[]` (code-like labels: JSON `"key": value`, XML `<name attr="...">`, `@attr="v"`, `#text`; values carry `TokenKind`; summaries)
  - `searchDoc(doc, term, { regex }): { ids: Set<string>; error?: string }` (an invalid regex gives an error and no matches; literal by default)
  - Toolbar: Expand all, Collapse all, Expand to depth (1–5), search `Input` with match count and Next/Previous (Enter and Shift+Enter) that expands ancestors of matches
  - Source sync: selecting a node calls `editor.setSelection(range)`; the caret in the editor selects `nodeAtOffset` (debounced 200 ms)
- Consumes: `CodeTree`, B-1.

- [ ] **Tests:**
  - `toTreeData` labels for `{"a":"x","b":[1]}` are `"a": "x"` (string kind) and `"b": [1]` (summary chip).
  - `searchDoc('(')` is literal and matches keys or values containing `(`; with regex on, `'('` gives the error "Invalid regex" and no throw; regex `^a` matches key `a`.
  - Component: Next cycles matches and expands collapsed ancestors; Expand to depth 2 expands exactly depth up to 2.
- [ ] **Commit:** `feat(json-xml): code-like Tree view with search, depth expansion and editor sync`.

### Task B-5: `to-diagram` adapter and node cap

**Files:**

- Create: `src/tools/json-and-xml-viewer/lib/to-diagram.ts`, `lib/to-diagram.test.ts`

**Interfaces:**

- Produces: `toDiagram(doc, { cap = 2000, expanded: Set<string> }): { diagram: Diagram; total: number; shown: number; rowOwner: Map<string, { cardId: string; row: number }> }`
- Rules:
  - Every object, array (JSON) and element (XML) becomes a card. The eyebrow is `object`, `array[12]` or `element`; the title is the key or tag (root: `$` or the root tag).
  - Rows: primitives become `{ key, value preview (max 60 chars), kind }`; nested values become `link` rows with value `{n}`/`[n]`/`<n>` and an edge to the child card (`toRow` = that row).
  - XML attributes become `@name` rows; text becomes a `#text` row.
  - Cap: breadth-first. Once `cap` cards exist, remaining children become a single `more` row "+340 more" on their parent, unless that parent id is in `expanded`, in which case its children are always included and do not count against the cap.
- Consumes: A3-1 model, B-1.

- [ ] **Tests:**
  - `{"a":1,"b":{"c":[true]}}` gives 3 cards ($, b, c). The $ rows are `a: 1` (number) and `b: {1}` (link); the edge from $ row 1 to card b.
  - XML `<r a="1"><i>x</i></r>` gives the root card with rows `@a`, plus `i` as a link to the i card, whose row is `#text: x`.
  - A 10,000-object array with `cap: 100` gives `shown <= 101` cards and the root's `more` row text "+9,900 more"; adding the root id to `expanded` includes all direct children.
  - Value previews are truncated with the ellipsis code point and keep `kind`.
- [ ] **Commit:** `feat(json-xml): document to diagram adapter with row-linked edges and a node cap`.

### Task B-6: Map tab, selection sync, export; React Flow removed

**Files:**

- Create: `src/tools/json-and-xml-viewer/components/MapTab.tsx`, `components/MapTab.test.tsx`
- Delete: `components/treeview/*` (`DataFlow`, `CustomNode`, `layoutManager`, `useDataProcessor`, `types`), `components/DataNode.tsx`, `components/TreeView.tsx`, the `*.module.css` files if they still exist, and P5's `src/shared/ui/adapters/flow-canvas*` (grep confirms there is no other consumer)
- Modify: `package.json` (remove `@xyflow/react`, `dagre`, `@types/dagre`)

**Interfaces:**

- Produces: `MapTab` rendering `DiagramCanvas`.
  - `selectedId` maps through `rowOwner`.
  - `onSelect(cardId, row)`: a link row selects the child node id, otherwise the card's node.
  - `onExpandMore` adds to `expanded` and recomputes.
  - The header shows "Showing 2,000 of 12,431 objects" plus a node cap `Select` (500/2,000/5,000, persisted).
  - Export menu: `<file>-map.png` and `.svg`.
  - When the selection changes from the Tree, the Map calls `centreOn` unless the user panned in the last 2 s (tracked through a `DiagramCanvas` `onViewportChange`; if absent, A3-9 adds it as a small additive prop in this task, listed under Modify).
- Consumes: A3, B-5.

- [ ] **Tests:**
  - Selecting in the Tree then switching to the Map shows the card selected (prop passed).
  - A Map `onSelect(card, linkRow)` sets the Tree selection to the child id.
  - A `more` click increases `shown`.
  - Export calls `saveBlob` with `-map.png`.
  - Dependencies: `pnpm why @xyflow/react` and `pnpm why dagre` report nothing.
  - `grep -r "xyflow\|dagre" src` finds nothing.
- [ ] **Commit:** `feat(json-xml): canvas Map view with Tree sync and export; remove React Flow and dagre`.

### Task B-7: JSONPath engine

**Files:**

- Create: `src/tools/json-and-xml-viewer/lib/jsonpath.ts`, `lib/jsonpath.test.ts`

**Interfaces:**

- Produces:
  - `parseJsonPath(expr): JsonPathAst` (throws `INVALID_INPUT` with a column)
  - `queryJsonPath(value, expr): { path: PathSeg[]; value: unknown }[]`
- Supported: `$`, `.name`, `['name']`, `["name"]`, `.*`, `[*]`, `..name`, `..*`, `[n]` (negative allowed), `[start:end:step]`, unions `[0,2]` and `['a','b']`, and filters `[?(@.price < 10 && @.tag == 'x')]` (operators `== != < <= > >= && || !`, parentheses, literals: number, string, true, false, null; `@.path` and `$.path` references; `length(@.x)`). No script evaluation; a hand-written parser.
- Consumes: B-1 `PathSeg`.

- [ ] **Tests** (RFC 9535 examples on the bookstore document):

| Expression                 | Expected               |
| -------------------------- | ---------------------- |
| `$.store.book[*].author`   | 4 authors in order     |
| `$..author`                | the same               |
| `$.store.*`                | 2 values               |
| `$.store..price`           | 5 prices               |
| `$..book[2]`               | the third book         |
| `$..book[-1]`              | the last book          |
| `$..book[0,1]`             | the first two books    |
| `$..book[:2]`              | the first two books    |
| `$..book[?(@.isbn)]`       | 2 books                |
| `$..book[?(@.price < 10)]` | 2 books                |
| `$..*`                     | the count from the RFC |

Errors: `$.store[` gives "Expected ']' at column 9"; `$..book[?(@.price <)]` gives a column error. A document of 100k elements with `$..id` completes in under 500 ms.

- [ ] **Commit:** `feat(json-xml): in-house JSONPath (RFC 9535 subset) with filters and positioned errors`.

### Task B-8: Query tab (JSONPath and XPath)

**Files:**

- Create: `src/tools/json-and-xml-viewer/components/QueryTab.tsx`, `lib/xpath.ts`, `lib/xpath.test.ts`, `components/QueryTab.test.tsx`

**Interfaces:**

- Produces:
  - `queryXPath(doc: Document, expr): { nodeId: string; text: string }[]` (`document.evaluate` with `ORDERED_NODE_SNAPSHOT_TYPE`; strings, numbers and booleans returned as a single value row; errors map to `INVALID_INPUT` with the browser message)
  - `QueryTab`: a single-line `CodeSurface` query input (history of the last 10 in settings), a result count, a `VirtualList` of path plus value preview (click selects in Tree and Map), and "Copy results as JSON"
- Consumes: B-1, B-7.

- [ ] **Tests:**
  - XPath (jsdom) `//book[@lang='en']/title` returns 2 nodes with ids matching `fromXml` ids; `count(//book)` returns a number row; an invalid `//[` gives `INVALID_INPUT`.
  - Component: Enter runs the query, the count shows "4 results", clicking a result calls `onSelect(id)`.
- [ ] **Commit:** `feat(json-xml): Query tab with JSONPath and XPath results linked to the Tree and Map`.

### Task B-9: Convert tab

**Files:**

- Create: `src/tools/json-and-xml-viewer/components/ConvertTab.tsx`, `lib/convert.ts`, `lib/convert.test.ts`

**Interfaces:**

- Produces: `convert(value | xmlDoc, target: 'json' | 'json-min' | 'yaml' | 'xml' | 'csv' | 'toml', opts): Promise<string>` plus `sortKeysDeep(value)`, `escapeJsonString(text)`, `unescapeJsonString(text)`.
  - CSV needs an array of objects (flattened with `flattenObject`), else `INVALID_INPUT` "Not tabular: needs an array of objects".
  - TOML needs an object root, else "TOML needs an object at the top level".
  - XML to JSON uses `xmlToJson`; JSON to XML uses `jsonToXml` with a root-name option.
  - The UI has a target `SegmentedControl`, options (indent, root name, CSV delimiter), output in a read-only `TextInputPanel` with Copy and Download (the extension per target), and Send to (CSV Viewer for CSV, Text Diff, Code Formatter).
- Consumes: A1-10.

- [ ] **Tests:**
  - `convert({a:[{b:1}]}, 'yaml')` parses back equal.
  - `[{a:1,b:{c:2}}]` to CSV gives `a,b.c\r\n1,2` or with `\n` per option.
  - `{a:1}` to CSV gives the not-tabular error.
  - `sortKeysDeep` orders nested keys.
  - `escapeJsonString('a"b\n')` gives `"a\"b\n"` (as a JSON literal) and unescape inverts it.
  - An XML round-trip through `jsonToXml(xmlToJson(x))` keeps attribute values.
- [ ] **Commit:** `feat(json-xml): convert to YAML, XML, CSV, TOML, minified JSON, plus sort and escape utilities`.

### Task B-10: TypeScript types and JSON Schema inference

**Files:**

- Create: `src/tools/json-and-xml-viewer/lib/infer.ts`, `lib/infer.test.ts`, `src/shared/lib/data-formats/mock-schema.ts` (the shared mock-schema type, also used by Part D; additive file), `mock-schema.test.ts`

**Interfaces:**

- Produces:
  - `inferTypeScript(value, { rootName = 'Root', sample = 1000 }): string` (interfaces; optional fields when missing in some sampled array items; `unknown[]` for empty arrays; PascalCase names from keys, deduplicated)
  - `inferJsonSchema(value): object` (draft 2020-12: `type`, `properties`, `required`, `items`, formats `email`, `uri`, `uuid`, `date-time` detected by regex)
  - `MockSchema` type plus `inferMockSchema(value): MockSchema` (field types for Part D's generator: email, uuid, date, int ranges from observed min/max, enum when at most 10 distinct strings in at least 20 samples)
- Consumes: none.

- [ ] **Tests:**
  - `[{id:1,name:'a',email:'x@y.z'},{id:2,name:'b'}]` gives `export interface Root { id: number; name: string; email?: string; }` with type `Root[]`.
  - The JSON Schema marks `email` with `format: 'email'` and `required: ['id','name']`.
  - Nested objects become named interfaces (`RootAddress`).
  - `inferMockSchema` picks `email` and `uuid` types, and gives an int range `[1, 2]`.
- [ ] **Commit:** `feat(json-xml): infer TypeScript types, JSON Schema and a mock-data schema`.

### Task B-11: Files, downloads, hand-offs, commands, settings, manifest

**Files:**

- Modify: `src/tools/json-and-xml-viewer/index.ts` (name "JSON & XML Viewer"; keywords json, xml, yaml, jsonpath, xpath, tree, viewer, "json and xml viewer"; `accepts` kinds plus mimes per spec §7), `Tool.tsx`
- Create: `src/tools/json-and-xml-viewer/settings.ts`, `settings.test.ts`

**Interfaces:**

- Produces:
  - Settings via `createToolSettings('json-and-xml-viewer', { indent: 2, tab: 'tree', direction: 'LR', minimap: true, cap: 2000, wrap: false, queryHistory: [] }, { version: 1 })` (query history is not data: it holds expressions only; `assertNoDataFields` passes).
  - Commands: Format (Mod+Shift+F), Minify, Copy path (Mod+Shift+P), Expand all, Collapse all, tab switches.
  - `SendToMenu` on the output and selection: CSV Viewer (`text/csv` via convert), Text Diff, Mock Data (`application/vnd.tools.mock-schema+json`), Code Formatter.
  - Hand-off accept fills the editor.
  - Download: the formatted document `<name>.<ext>`.
- Consumes: A1-1, A1-2, A1-3, A2-16.

- [ ] **Tests:**
  - `settings.test.ts`: `assertNoDataFields(defaults)`.
  - Component: a hand-off payload `application/json` fills the editor once; Format reindents; the "Send to" menu lists CSV Viewer only when the value is an array of objects.
- [ ] **Commit:** `feat(json-xml): file and hand-off integration, commands and persisted settings`.

### Task B-12: E2E, visual, performance, Part B gate

**Files:**

- Create: `test/e2e/tools/json-and-xml-viewer.spec.ts`
- Modify: `scripts/gen-fixtures.ts` (`large.json` 20 MB, `map-5000.json`)

- [ ] **E2E cases:**
  1. Paste JSON with a trailing comma: the error shows the line and column, and "Jump to error" moves the caret.
  2. Search `(`: no crash, literal matches.
  3. The Tree: select `$.store.book[1].title`; the path bar shows it; Copy JSONPath gives the clipboard text.
  4. The Map tab: the selected card shows (assert `data-testid="diagram-canvas"` plus the live-region text "Object at book"). Press `]`, then the live region names the child.
  5. Query `$..price`: "5 results"; click the third result and the Tree selection updates.
  6. Convert to YAML, download, re-parse in Node with `yaml`, deep-equal.
  7. XML sample: XPath `//book/@id` returns rows; `prettyXml` keeps the comment.
  8. Large: open `large.json` (20 MB). The parse completes under 2 s (`performance.now` around the "Parsed" status). The Tree scroll stays responsive (a long-task observer: no task over 100 ms while scrolling 50 screens). The Map with `map-5000.json` lays out in the worker: the main thread has no long task over 100 ms.
  9. A hand-off from the CSV Viewer: the Part D e2e covers it, gated with a `test.skip` if `csv-viewer` has not upgraded yet (removed in H-1).
- [ ] **Visual:** Tree and Map tabs in both themes, desktop and phone.
- [ ] Run the merge gate.
- [ ] Open the PR "6-B: JSON & XML Viewer rebuilt (code-like Tree, canvas Map, Query, Convert); React Flow, dagre and the textarea editor removed".

---

# Part 6-C: text tools (Regex, Diff, Log Viewer, Text Toolkit, Markdown)

**Branch:** `feat/p6-c-text`. **Boundary:** the five tool folders, `src/shared/workers/handlers/{regex,diff,log}.ts`, and barrel lines. **Spec:** §8.1, §9.1, §9.2.

### Task C-1: Regex engine into the text worker; Replace and Split modes

**Files:**

- Create: `src/shared/workers/handlers/regex.ts`, `src/tools/regex-tester/lib/replace.ts`, `lib/replace.test.ts`, `components/ReplaceTab.tsx`, `components/SplitTab.tsx`
- Modify: `src/tools/regex-tester/hooks/useRegexRun.ts` (now uses `createTextWorker({ timeoutMs: 1000 })`)
- Delete: `src/tools/regex-tester/lib/regex.worker.ts`, `lib/handlers.ts`, `lib/client.ts` (P2)

**Interfaces:**

- Produces:
  - Handlers `regex.run(pattern, flags, text, limit)`, `regex.replace(pattern, flags, text, replacement): { output; count }`, `regex.split(pattern, flags, text, limit = 10_000): string[]`
  - `expandReplacement(match, replacement): string` (supports `$1`, `$<name>`, `$&`, `` $` ``, `$'`, `$$`; same semantics as `String.prototype.replace`, verified against it)
- Consumes: A1-5, P0 engine.

- [ ] **Tests:**
  - `replace.test.ts`: for 30 table cases, our `expandReplacement`-driven replace equals the native `text.replace(new RegExp(p, f), r)`; `$<name>` with a missing group gives empty, like native.
  - Worker handler timeout: the P0 killable test pattern, re-run against `createTextWorker` with a `hang` injection.
  - The existing P0 regex e2e still passes.
- [ ] **Commit:** `feat(regex): engine in the shared text worker; Replace and Split modes`.

### Task C-2: Regex Tests tab, sharing, persistence, commands, library

**Files:**

- Create: `src/tools/regex-tester/components/TestsTab.tsx`, `lib/test-cases.ts`, `lib/test-cases.test.ts`, `lib/templates.ts` (40 templates with name, pattern, flags, description, samples), `components/CheatSheet.tsx`, `settings.ts`, `share.ts`, `share.test.ts`

**Interfaces:**

- Produces:
  - `runTestCases(pattern, flags, cases: { text; expect: 'match' | 'no-match' }[]): { pass: boolean; actual: boolean }[]` (through the worker with a timeout per batch)
  - Share state `{ v: 1; pattern; flags; text; replacement; mode; cases }` with `parseRegexShare` validator
  - Settings `{ flags, mode, cheatSheetOpen }`
  - Commands: Alt+G/I/M/S/U/Y/D toggle flags, Alt+1..4 modes, Copy code, Share (Mod+Shift+S)
  - "Use as log format" (`SendToMenu` payload `application/vnd.tools.regex+json`, enabled only when named groups exist)
- Consumes: A1-2, A1-4, A2-16.

- [ ] **Tests:**
  - `runTestCases` pass and fail.
  - `parseRegexShare` rejects wrong types and unknown versions and accepts valid state.
  - Settings guard.
  - Component: a share round-trip (`useShareableState` mocked loaded state hydrates pattern, flags and text).
- [ ] **Commit:** `feat(regex): should-match test cases, share links, persisted flags, template library and cheat sheet`.

### Task C-3: Regex Explain

**Files:**

- Create: `src/tools/regex-tester/lib/explain/{parser.ts,describe.ts}`, `explain.test.ts`, `components/ExplainPanel.tsx`

**Interfaces:**

- Produces:
  - `parseRegex(pattern, flags): RegexAst` (ECMAScript 2025: alternation, groups (capturing, named, non-capturing, lookahead and lookbehind, positive and negative), modifiers groups `(?i:...)` where supported, classes with ranges and escapes, Unicode property escapes `\p{L}`, `v`-flag set operations `[\p{L}--[a-z]]`, quantifiers greedy and lazy `{n,m}`, anchors, word boundaries, backreferences by number and name; each node carries `[start, end)`; errors give `INVALID_INPUT` with a column)
  - `describe(ast): ExplainNode` tree with sentences ("Capture group 1: one or more digits")
  - `ExplainPanel` renders a `CodeTree` (rows hovering highlight the pattern span via a `CodeSurface` range in the pattern input and the matches of that group)
- Consumes: A2-11, A2-3.

- [ ] **Tests:**
  - `(?<y>\d{4})-(\d{2})` describes "Named capture group y: exactly 4 digits", "literal -", "Capture group 2: exactly 2 digits".
  - `a+?` gives "one or more a, as few as possible".
  - `[^a-z\s]` gives "any character except a to z or whitespace".
  - `(?<=\$)\d+` gives "preceded by literal $".
  - `\p{Script=Greek}` describes the script.
  - `[\p{L}--[a-z]]` (v flag) gives the set difference text.
  - Spans: every node's span slices to its source.
  - Parity: for 50 valid patterns, `parseRegex` accepts exactly what `new RegExp` accepts; for 20 invalid ones, both reject (the column is reported).
- [ ] **Commit:** `feat(regex): pattern explainer tree with spans linked to the pattern and matches`.

### Task C-4: Regex code export for six languages

**Files:**

- Modify: `src/tools/regex-tester/lib/code.ts` (+ tests)
- Create: `components/CodeExport.tsx`

**Interfaces:**

- Produces: `toSnippet(lang: 'js' | 'python' | 'go' | 'php' | 'java' | 'csharp', pattern, flags, text): { code: string; warnings: string[] }`.
  - Python uses a raw string unless the pattern contains a quote or ends with a backslash, then a normal string with escapes; flags map `i` to `re.IGNORECASE`, `m` to `re.MULTILINE`, `s` to `re.DOTALL`; `y` and `d` give a warning.
  - Go uses a backtick raw string when possible; lookarounds and backreferences give the warning "RE2 does not support lookarounds or backreferences".
  - PHP uses `preg_match_all('/.../flags', ...)` with `/` escaped.
  - Java uses `Pattern.compile("...", Pattern.CASE_INSENSITIVE | ...)` with escaped backslashes and quotes.
  - C# uses a `@"..."` verbatim string with doubled quotes and `RegexOptions`.
- Consumes: none.

- [ ] **Tests:**
  - JS is executed (as in P0).
  - The others are string-compared against expected snippets for patterns containing `/`, `"`, `\`, a newline and a named group.
  - Warnings for Go lookbehind and Python `y`.
- [ ] **Commit:** `feat(regex): correctly escaped code export for JavaScript, Python, Go, PHP, Java and C#`.

### Task C-5: Diff worker engine with original line numbers, patch export, persistence

**Files:**

- Create: `src/shared/workers/handlers/diff.ts`, `src/tools/text-diff-checker/lib/engine.ts`, `lib/engine.test.ts`, `lib/patch.ts`, `lib/patch.test.ts`, `settings.ts`
- Modify: `src/tools/text-diff-checker/hooks/useIntelligentDiff.ts` (use the worker; cancel on new input)

**Interfaces:**

- Produces:
  - `computeDiff(left, right, opts: { granularity: 'line' | 'word' | 'char'; ignoreWhitespace; ignoreCase; ignoreBlankLines; trimTrailing }): DiffResult`
  - `DiffResult = { hunks: Hunk[]; stats: { added; removed; changed; unchanged } }`, where `Hunk = { kind: 'equal' | 'add' | 'del' | 'change'; leftStart; leftLines: number[]; rightStart; rightLines: number[]; intraline?: { left: Range[]; right: Range[] }[] }` and line numbers are **original** (pre-normalisation)
  - `toUnifiedPatch(leftName, rightName, left, right, context = 3): string` (the `diff` `createTwoFilesPatch`)
  - Settings for all options plus context lines plus view
- Consumes: `diff`, A1-5.

- [ ] **Tests:**
  - With `ignoreBlankLines`, `left='a\n\nb'` and `right='a\nb'` give no change; a following real change keeps the original line numbers (left line 3, right line 2).
  - `ignoreCase` gives no diff for `'A'` versus `'a'`.
  - Intraline ranges for `'hello world'` versus `'hello there'` mark `world` and `there`.
  - The patch applies cleanly with `diff`'s `applyPatch` back to `right`.
  - A 50k-line diff in Node completes in under 3 s (logged).
  - Settings guard.
- [ ] **Commit:** `feat(diff): worker diff engine keeping original line numbers, unified patch export, persisted options`.

### Task C-6: Diff views, collapse unchanged, navigation, minimap strip

**Files:**

- Create: `src/tools/text-diff-checker/components/DiffView.tsx`, `lib/view-model.ts`, `lib/view-model.test.ts`, `components/ChangeStrip.tsx`
- Modify: `Tool.tsx`

**Interfaces:**

- Produces:
  - `buildViewModel(result, { view: 'split' | 'unified' | 'inline'; context: 0 | 3 | 5 | 10 | 'all'; expanded: Set<number> }): { leftLines; rightLines; decorations; folds: { fromLine; toLine; hidden: number }[]; changeAnchors: number[] }`
  - The view renders two (split) or one (unified, inline) read-only `CodeSurface`s with `lineDecorations`, `ranges` and `folds` ("Show n hidden lines"), with synchronised scroll in split view.
  - Next/Previous change (`n`/`p` and buttons, counter "3 of 17").
  - `ChangeStrip` is a kit `Chart` heat strip of change positions (click to jump).
  - Syntax language by detected type (`detectLanguage(text, name)`).
- Consumes: A2-2, A2-3, A2-9.

- [ ] **Tests:**
  - Context 3 on a 200-line file with one change at line 100 gives two folds: lines 1–96 (96 hidden) and 104–200; expanding fold 0 removes it.
  - `changeAnchors` lists the first line of each hunk.
  - Component: `n` moves to the next anchor and updates "2 of 3"; `p` goes back.
- [ ] **Commit:** `feat(diff): split, unified and inline views with collapsed context, change navigation and strip`.

### Task C-7: Diff semantic modes (JSON, CSV, ignore order)

**Files:**

- Create: `src/tools/text-diff-checker/lib/semantic.ts`, `lib/semantic.test.ts`, `components/SemanticTable.tsx`

**Interfaces:**

- Produces:
  - `diffJson(a, b, { sortKeys }): { path: string; kind: 'added' | 'removed' | 'changed'; left?; right? }[]` (JSONPath strings; arrays diffed by index)
  - `diffCsv(a, b, { key: string }): { key; kind; cells?: { column; left; right }[] }[]`
  - `diffIgnoreOrder(a, b): { added: string[]; removed: string[] }` (multiset)
  - The mode `SegmentedControl` (Text | JSON | CSV | Ignore order) with errors when parsing fails ("Left side is not valid JSON: line 3, column 4")
- Consumes: `json-locate`, P0 CSV `parseDelimited` (or the D-1 worker handler if merged).

- [ ] **Tests:**
  - `{a:1,b:{c:2}}` versus `{a:1,b:{c:3},d:4}` gives `$.b.c` changed and `$.d` added.
  - `sortKeys` makes key order irrelevant.
  - CSV with key `id`: a changed cell is reported with its column; an added row too.
  - Ignore order: `['a','b','b']` versus `['b','a']` gives one removed `b`.
- [ ] **Commit:** `feat(diff): semantic JSON, CSV-by-key and ignore-order comparisons`.

### Task C-8: Diff merge, HTML export, share, hand-offs

**Files:**

- Create: `src/tools/text-diff-checker/lib/merge.ts`, `lib/merge.test.ts`, `lib/html-export.ts`, `lib/html-export.test.ts`, `share.ts`
- Modify: `index.ts` (name "Text Diff"; accepts `text/plain`, `application/vnd.tools.diff-pair+json`)

**Interfaces:**

- Produces:
  - `applyChoices(result, choices: Map<number, 'left' | 'right'>): string` (the default for unchosen hunks is left)
  - `toHtmlReport(result, names): string` (standalone, inline CSS from token values snapshot, escaped)
  - Share state `{ v: 1; left; right; opts }` (capped by the codec)
  - The hand-off accepts `meta.side` (`left` or `right`) or the pair payload
- Consumes: A1-4, A1-3.

- [ ] **Tests:**
  - Choosing right for hunk 2 only yields left text with hunk 2 replaced.
  - The HTML report escapes `<script>` and contains both file names.
  - The share parse validator.
  - A pair hand-off fills both sides.
- [ ] **Commit:** `feat(diff): per-hunk merge, HTML report, share links and hand-off targets`.

### Task C-9: Log Viewer rename and the streaming worker parse with a windowed store

**Files:**

- Modify: `src/tools/log-parser/index.ts` (name "Log Viewer"; keywords include "log parser"; accepts `.log, .txt, .jsonl, .ndjson` and mimes `text/plain`, `text/x-log`)
- Create: `src/shared/workers/handlers/log.ts`, `src/tools/log-parser/lib/store.ts`, `lib/store.test.ts`, `hooks/useLogSource.ts`

**Interfaces:**

- Produces worker handlers (stateful per instance: `createTextWorker()` dedicated to the Log Viewer):
  - `log.open(source: { file?: File; text?: string }, format: FormatSpec, ctx)` returns `{ total; levels: Record<string, number>; range: [t0, t1] | null }` (streams `file.stream()` in 1 MB chunks, line-splitting across chunk boundaries, progress `{ done: bytes, total }`)
  - `log.window(start, count, filter: LogFilter)` returns `{ entries: LogEntry[]; filteredTotal }`
  - `log.histogram(buckets, filter)` returns `{ t0; t1; counts: Record<level, number[]> }`
  - `log.nextMatch(from, filter, predicate: 'error' | { regex })` returns the index
  - `log.export(filter, fmt: 'text' | 'json' | 'csv')` returns a string
  - `LogEntry = { index; line; ts?: number; level?: string; component?: string; message: string; fields?: Record<string, string>; raw: string }`
- Limits: the 2 GB cap gives `TOO_LARGE`; entries are held as compact columns (Int32Array offsets into a text buffer).
- Consumes: A1-5.

- [ ] **Tests** (`store.test.ts` drives the handler functions directly in Node with a `Blob`-backed `File`):
  - Lines split correctly across chunk boundaries (a 3 MB synthetic file with the chunk size forced to 1,000 bytes).
  - The total and level counts.
  - A window returns the requested slice after a filter.
  - Progress callbacks are monotonic.
  - Cancel via signal stops reading (`CANCELLED`).
- [ ] **Commit:** `feat(log-viewer): rename and stream large files through a windowed worker store`.

### Task C-10: Log formats, structured parsers, multi-line grouping, anchored levels

**Files:**

- Create: `src/tools/log-parser/lib/formats/{index,detect,jsonl,access,syslog,logfmt,docker,legacy}.ts`, `formats.test.ts`, `lib/group.ts`, `group.test.ts`, `lib/level.ts`, `level.test.ts`
- Modify: the existing `lib/` parsers (moved under `formats/legacy.ts`)

**Interfaces:**

- Produces:
  - `FormatSpec = { id: string; parse(line): Partial<LogEntry> | null }`
  - `detectFormat(sample: string[]): { id; score }[]`
  - JSON lines key maps (`level|lvl|severity|log.level`, `msg|message`, `time|timestamp|@timestamp|ts` with epoch or ISO)
  - nginx and Apache combined regexes
  - syslog 3164 and 5424
  - logfmt with quoted values
  - Docker and Kubernetes prefix strip (`2024-...Z stdout F ` and `pod/container` labels)
  - `isContinuation(line, prev): boolean` (leading whitespace, `at `, `Caused by:`, `... n more`, `Traceback`, `File "`, a `^\s+\^`)
  - `detectLevel(text): string | undefined` (anchored tokens `\b(ERROR|ERR|FATAL|WARN(ING)?|INFO|DEBUG|TRACE)\b` at the line start or in a bracketed level field; never substring matches like `errors=0`)
- Consumes: none.

- [ ] **Tests:**
  - **Detection:** a pino sample gives `jsonl` (top score); an nginx sample gives `access`; a syslog 5424 sample is detected.
  - **JSON lines:** `{"level":30,"msg":"hi","time":1700000000000}` maps the pino numeric levels (30 is info, 50 is error).
  - **Access logs:** fields `status`, `method`, `path`, `bytes`, `ua`.
  - **Grouping:** a Java stack trace (12 lines) and a Python traceback each become one entry.
  - **Levels:** `"processed 10 items, errors=0"` gives an undefined level, and `"[ERROR] boom"` gives `ERROR`.
  - **Legacy:** formats keep their old test expectations.
- [ ] **Commit:** `feat(log-viewer): structured formats, multi-line grouping and anchored level detection`.

### Task C-11: Log list UI, filters, field click filters

**Files:**

- Create: `src/tools/log-parser/components/{LogList,EntryRow,FilterBar,FieldTable}.tsx`, `lib/filter.ts`, `lib/filter.test.ts`
- Modify: `Tool.tsx` (rewrite onto `TextInputPanel` for paste, plus a file open/drop with progress through `useJob`)

**Interfaces:**

- Produces:
  - `LogFilter = { levels: Set<string>; text?: { value; regex: boolean }; exclude: string[]; component?: string; range?: [number, number]; fields: { key; value; mode: 'include' | 'exclude' }[] }`
  - `matchesFilter(entry, filter)` (the component filter excludes entries without a component when set)
  - The UI: `VirtualList` (`role=log`) of `EntryRow`s (line number, `StatusDot` plus level, time, component, first message line, expand to full plus `FieldTable` with "Filter to" and "Exclude" buttons per field)
  - Level chips with counts
  - Search (literal or regex; an invalid regex shows inline) with highlights through `CodeSurface`-style ranges in the expanded view
- Consumes: A2-1, A2-4, C-9.

- [ ] **Tests:**
  - `matchesFilter` table: level, text, regex, exclude, component missing, time range, field include and exclude.
  - Component: clicking "Filter to" on a field adds the filter chip and the count updates (mocked worker window).
- [ ] **Commit:** `feat(log-viewer): virtualised entry list with level chips, search, excludes and field filters`.

### Task C-12: Log timeline, jump to error, custom formats, export, hand-offs

**Files:**

- Create: `src/tools/log-parser/components/{Timeline,CustomFormatDialog}.tsx`, `lib/custom-format.ts`, `lib/custom-format.test.ts`, `settings.ts`

**Interfaces:**

- Produces:
  - `Timeline`: a kit `Chart` stacked bar by level from `log.histogram`; brush sets `filter.range`
  - "Jump to next error" (`e`) via `log.nextMatch`
  - `compileCustomFormat({ name; pattern; flags }): FormatSpec` (named groups `ts`, `level` and `msg`, with others becoming fields; validation that at least `msg` or the whole line exists; runs in a dedicated killable worker with a 1 s timeout per 1,000 lines tested)
  - `CustomFormatDialog` uses the Regex Tester `useRegexRun` and match highlighting over the first 20 lines
  - Saved custom formats live in settings (pattern and name only)
  - The hand-off accepts `application/vnd.tools.regex+json` and opens the dialog prefilled
  - Export filtered entries as text, JSON or CSV (download)
  - "Compare selected" (two selected entries, or two ranges) sends to Text Diff
- Consumes: A2-9, C-1, A1-1, A1-3.

- [ ] **Tests:**
  - `compileCustomFormat` with `(?<ts>\S+) (?<level>\w+) (?<msg>.*)` parses a line into fields; a pattern without groups gives `INVALID_INPUT` "Add at least a named group msg".
  - A catastrophic custom pattern on test lines gives `TIMEOUT` surfaced inline.
  - Settings guard.
  - The export CSV header and escaping.
- [ ] **Commit:** `feat(log-viewer): timeline histogram with brush, jump to error, custom regex formats, export and hand-offs`.

### Task C-13: Text Toolkit library

**Files:**

- Create: `src/tools/text-toolkit/lib/{stats,case,lines,clean}.ts` plus tests

**Interfaces:**

- Produces:
  - `textStats(text, locale = 'en'): { chars; charsNoSpaces; words; sentences; paragraphs; lines; bytes; readingMinutes; speakingMinutes; topWords: [word, n][]; charFreq: [char, n][] }` (words via `Intl.Segmenter` `isWordLike`; reading 238 wpm, speaking 150 wpm)
  - `convertCase(text, kind: 'lower' | 'upper' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'dot'): string` (word splitting handles `camelCase`, `snake_case`, acronyms `XMLHttpRequest` into xml, http, request)
  - `slugify(text, sep = '-')`
  - `lineOps`: `sort(mode: 'az' | 'za' | 'natural' | 'length' | 'numeric')`, `dedupe({ caseInsensitive, keep: 'first' | 'last' })`, `reverse`, `shuffle` (CSPRNG), `trim`, `removeEmpty`, `number({ start, sep })`, `affix({ prefix, suffix })`, `join(sep)`, `split(sep)`, `filter({ contains | regex, invert })` (regex goes through the worker in the UI; the pure version accepts a `RegExp`)
  - `clean`: `collapseWhitespace`, `tabsToSpaces(n)`, `spacesToTabs(n)`, `removeDiacritics`, `stripNonPrintable`, `normaliseLineEndings('lf' | 'crlf')`, `normaliseUnicode(form)`
- Consumes: A1-6 (`shuffle`).

- [ ] **Tests:**
  - `textStats('Hello world. Bye!')` gives 3 words and 2 sentences, and the bytes count multi-byte characters.
  - `convertCase('XMLHttpRequest id', 'snake')` gives `xml_http_request_id`; `title` keeps "of" lower mid-sentence (`'war of the worlds'` gives `'War of the Worlds'`).
  - `slugify('Crème Brûlée!')` gives `creme-brulee`.
  - Natural sort `['a10','a2']` gives `['a2','a10']`.
  - Case-insensitive dedupe keeps the first.
  - `removeDiacritics`.
  - CRLF normalisation.
  - NFC versus NFD lengths.
- [ ] **Commit:** `feat(text-toolkit): text statistics, case conversion, slugify, line and clean-up operations`.

### Task C-14: Text Toolkit UI, regex replace, undo, commands

**Files:**

- Create: `src/tools/text-toolkit/{index.ts,Tool.tsx,settings.ts}`, `components/{StatsPanel,OpsPanel,ReplacePanel}.tsx`, `hooks/useUndoableText.ts`, `hooks/useUndoableText.test.ts`, `test/e2e/tools/text-toolkit.spec.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'text-toolkit', slug: 'toolkit', category: 'text', kind: 'tool', name: 'Text Toolkit', keywords: ['word count', 'case converter', 'slugify', 'sort lines', 'dedupe', 'find and replace'], accepts: [{ kinds: ['text'], mimes: ['text/plain'] }] }`
  - `useUndoableText(initial, limit = 100)` returns `{ text, set, apply(fn, label), undo, redo, canUndo, canRedo }`
  - The UI: `TextInputPanel` plus live `StatsPanel`, and `OpsPanel` (grouped buttons, each also a Mod+K command), plus `ReplacePanel` (plain or regex, case, whole word, match count; regex through a dedicated killable worker with a 1 s timeout)
  - The Send to menu for the output
- Consumes: A2-4, A1-2, A1-5, C-13.

- [ ] **Tests:**
  - `useUndoableText`: apply, undo, redo, and the limit drops the oldest.
  - E2E:
    1. Paste text, "Sort A to Z", then Mod+Z restores.
    2. Regex replace `(\w+)@` with `[$1]` gives the expected output.
    3. A catastrophic regex shows "Pattern took too long".
    4. The stats show "3 words" for the sample.
- [ ] **Commit:** `feat(text-toolkit): new Text Toolkit tool with live stats, operations, regex replace and undo`.

### Task C-15: Markdown rendering and export library

**Files:**

- Create: `src/tools/markdown-editor/lib/{render,line-map,export}.ts` plus tests
- Modify: `package.json` (`micromark`, `micromark-extension-gfm`; licences recorded in `licences.ts`)

**Interfaces:**

- Produces:
  - `renderMarkdown(md): Promise<{ html: string; remoteImages: number; outline: { depth; text; line; id }[] }>` (micromark plus GFM, `allowDangerousHtml: false`; code blocks highlighted with `syntax/*` into `<span class="tok-...">`; headings get ids; source line attributes `data-line` on block elements via a post-process that maps micromark positions)
  - `lineAt(htmlBlocks, scrollTop)` helpers for scroll sync (`line-map.ts`)
  - `toStandaloneHtml(html, title): string` (embedded light-theme CSS from a token snapshot)
  - `toRichClipboard(html, md): ClipboardItem`
- Consumes: A1-12.

- [ ] **Tests:**
  - A table, task list, strikethrough, autolink and footnote render the expected tags.
  - `<script>alert(1)</script>` in the source is escaped (no `<script` in the HTML).
  - An image with `https://` is counted in `remoteImages`.
  - Headings get unique ids (`intro`, `intro-1`).
  - Code fence `ts` tokens are present.
  - `toStandaloneHtml` contains `<!doctype html>` and the title escaped.
- [ ] **Commit:** `feat(markdown): GFM rendering with escaped HTML, highlighted code, outline and standalone export`.

### Task C-16: Markdown Editor UI

**Files:**

- Create: `src/tools/markdown-editor/{index.ts,Tool.tsx,settings.ts}`, `components/{FormatToolbar,Preview,Outline}.tsx`, `lib/format-actions.ts`, `lib/format-actions.test.ts`, `test/e2e/tools/markdown-editor.spec.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'markdown-editor', slug: 'markdown', category: 'text', name: 'Markdown Editor & Preview', keywords: ['markdown', 'md', 'preview', 'gfm', 'readme'], accepts: [{ kinds: ['text'], mimes: ['text/markdown', 'text/plain'] }] }`
  - `applyFormat(text, selection, action: 'bold' | 'italic' | 'code' | 'link' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'task' | 'quote' | 'table'): { text; selection }` (toggles when already applied)
  - The UI: `SplitPane` (`CodeSurface` markdown and `SandboxedHtml` preview), scroll sync, `FormatToolbar` (Mod+B, Mod+I, Mod+Shift+L link, Mod+Shift+7 ordered list), `Outline` drawer, word count in the status bar, a remote-images notice "n remote images blocked" with "Load for this document" (labelled network opt-in; toggles `allowRemoteImages`), export menu (`.html`, `.md`, copy rich text, copy HTML, Print), and a `beforeunload` guard when the text is not empty and not exported since the last edit
  - Settings: `{ wrap, scrollSync, previewWidth }` only
- Consumes: A2-13, A2-5, C-15.

- [ ] **Tests:**
  - `applyFormat` bold wraps the selection and toggles off when already bold; `table` inserts a 2x2 table at the caret.
  - E2E:
    1. Type a heading and a table: the preview frame contains `h1` and `table` (`frameLocator`).
    2. Markdown with `<img src="https://example.com/a.png">` shows "1 remote image blocked", and the request log has **no** request to example.com; after "Load for this document" the request is attempted (route-mocked).
    3. A script tag in the source never executes (`page.on('dialog')` is never fired).
    4. Download `.html` contains `<!doctype html>`.
- [ ] **Commit:** `feat(markdown): new Markdown Editor with live sandboxed preview, formatting toolbar, outline and exports`.

### Task C-17: Part C e2e, visual, gate

**Files:**

- Create: `test/e2e/tools/regex-tester.spec.ts`, `text-diff-checker.spec.ts`, `log-parser.spec.ts`
- Modify: `scripts/gen-fixtures.ts` (`large.log` 200 MB generated, `large-diff` pair)

- [ ] **Regex:** Replace output; Tests tab pass/fail; the Explain hover highlights; Go code export warns on a lookbehind; the share link round-trip (open the copied URL in a new page and assert the pattern and text are restored); the catastrophic pattern times out (P0 spec kept).
- [ ] **Diff:** collapse with "Show 96 hidden lines"; `n`/`p` navigation; the JSON semantic table; take right on hunk 1 and download merged; the `.patch` download applies (Node `applyPatch`); a hand-off pair from the Code Formatter is skipped until 6-D merges.
- [ ] **Log Viewer:** drop `large.log` with progress shown and the first window under 1 s after "Parsed"; a Java stack trace grouped; brush the timeline and the count changes; a custom format via a hand-off from the Regex Tester ("Use as log format"); export CSV and re-parse.
- [ ] **Visual:** each of the five pages in both themes, desktop; Regex, Diff and Markdown on phone.
- [ ] Run the merge gate.
- [ ] Open the PR "6-C: text tools (Regex, Diff, Log Viewer, Text Toolkit, Markdown)".

---

# Part 6-D: data tools (CSV, Mock data, Code Formatter)

**Branch:** `feat/p6-d-data`. **Boundary:** `csv-viewer`, `random-data-generator`, the new `code-formatter`, `handlers/{csv,mock,format}.ts`, `src/shared/lib/prng.ts`, and the removal of `lodash`. **Spec:** §8.2, §9.3.

### Task D-1: CSV parsing in the worker (encodings, header toggle, keep as text, progress)

**Files:**

- Create: `src/shared/workers/handlers/csv.ts`, `src/tools/csv-viewer/lib/decode.ts`, `lib/decode.test.ts`
- Modify: `src/tools/csv-viewer/lib/parse.ts` (+ tests; P0 functions kept and extended)

**Interfaces:**

- Produces:
  - `parseDelimited(content, delimiter, { header = true; quoteChar = '"'; keepText: Set<string> })` (P0 signature extended; `keepText` columns skip `coerceCell`; without a header, columns are `Column 1..n`)
  - `decodeBytes(bytes, encoding: 'auto' | 'utf-8' | 'windows-1252' | 'iso-8859-1' | 'utf-16le' | 'utf-16be'): { text; encoding }` (auto: BOM detection, then a fatal UTF-8 attempt, then windows-1252)
  - Worker `csv.parse(file | text, opts, ctx)` returns `ParseResult` (progress by bytes for files over 5 MB; Papa `step` streaming in the worker)
- Consumes: A1-5, P0 parse.

- [ ] **Tests:**
  - `decodeBytes` with a UTF-8 BOM, a UTF-16LE BOM, invalid UTF-8 falling back to windows-1252 (`0x80` becomes the euro sign code point), and an explicit ISO-8859-1.
  - `header: false` gives `Column 1..3`.
  - `keepText: {'amount'}` keeps `'42'` as a string.
  - A 500k-row synthetic CSV through the handler in Node completes under 4 s (logged) with progress events.
- [ ] **Commit:** `feat(csv): worker parsing with encoding detection, header toggle, keep-as-text columns and progress`.

### Task D-2: CSV grid on DataGrid; lodash removed from the CSV viewer

**Files:**

- Create: `src/tools/csv-viewer/components/{GridView,ParseOptions}.tsx`, `lib/columns.ts`, `lib/columns.test.ts`
- Modify: `src/tools/csv-viewer/Tool.tsx` (split; replaces the paginated table, the single filter and the lodash `orderBy`)

**Interfaces:**

- Produces:
  - `inferColumnTypes(rows, columns): Record<string, 'integer' | 'decimal' | 'boolean' | 'date' | 'text'>` (from the first 1,000 non-null values)
  - `GridView` (a `DataGrid` with type badges, multi-sort, per-column filters, a global search highlight, an "n of N rows" counter, and column visibility)
  - `ParseOptions` (delimiter, encoding, header, quote, keep-as-text multiselect; changing any of them re-parses)
- Consumes: A2-6, A2-7, D-1.

- [ ] **Tests:**
  - `inferColumnTypes` for mixed samples: `'00123'` (text, P0 kept) gives text; integers, decimals, booleans and ISO dates are detected.
  - Component: filtering a column to the range 10–20 updates the counter "3 of 10 rows"; Shift-click sorts by a second column.
  - `grep -rn "lodash" src/tools/csv-viewer` is empty.
- [ ] **Commit:** `feat(csv): virtualised grid with typed columns, multi-sort and per-column filters`.

### Task D-3: CSV profile and charts

**Files:**

- Create: `src/tools/csv-viewer/lib/profile.ts`, `lib/profile.test.ts`, `components/{ProfilePanel,ChartPanel}.tsx`
- Modify: the `handlers/csv.ts` `csv.profile`

**Interfaces:**

- Produces:
  - `profileColumn(values: unknown[], type): { count; nulls; empties; unique: number; uniqueApprox: boolean; min?; max?; mean?; median?; p25?; p75?; top: [value, n][]; histogram?: { x0; x1; n }[] }`
  - HyperLogLog (precision 12) for unique counts over 100k values; exact below.
  - Quantiles computed in the worker over **all filtered rows** (sort of a typed array copy; no spread into `Math.min`).
  - `ChartPanel`: a kit `Chart` bar, line, scatter or histogram over chosen X and Y columns, using all filtered rows, LTTB to 2,000 points, PNG export.
- Consumes: A2-8, A2-9.

- [ ] **Tests:**
  - Numeric profile of `[1, 2, 3, 4, null, '']` gives `count 6`, `nulls 1`, `empties 1`, `min 1`, `max 4`, `median 2.5`, `p25 1.75` (linear interpolation).
  - Top values are ordered by count.
  - HyperLogLog on 200k distinct values is within 3% and flagged approximate.
  - 1M values profile without a stack overflow.
- [ ] **Commit:** `feat(csv): column profile (types, nulls, uniques, quantiles, histograms) and full-data charts`.

### Task D-4: CSV light editing with undo

**Files:**

- Create: `src/tools/csv-viewer/lib/edit.ts`, `lib/edit.test.ts`, `components/EditToolbar.tsx`

**Interfaces:**

- Produces:
  - `EditOp = { kind: 'set-cell'; row; col; value } | { kind: 'add-row'; at } | { kind: 'delete-rows'; rows: number[] } | { kind: 'add-column'; name; at } | { kind: 'delete-column'; col } | { kind: 'rename-column'; col; name } | { kind: 'dedupe'; by: string[] } | { kind: 'trim' } | { kind: 'replace'; col; find; replace; regex }`
  - `applyEdit(table, op): { table; inverse: EditOp | { kind: 'restore'; snapshot } }` (pure)
  - An undo and redo stack of at most 100 entries (Mod+Z, Mod+Shift+Z)
  - A "Modified" badge
- Consumes: A2-7 `onCellEdit`.

- [ ] **Tests:** each op and its inverse restores the exact table (deep-equal); dedupe by `['email']` keeps the first; rename collisions give `INVALID_INPUT` "A column named x already exists"; regex replace with an invalid pattern gives `INVALID_INPUT`.
- [ ] **Commit:** `feat(csv): cell edits, row and column operations, dedupe, trim and replace with undo`.

### Task D-5: CSV exports, paste source, hand-offs, settings

**Files:**

- Create: `src/tools/csv-viewer/components/ExportMenu.tsx`, `lib/export.ts`, `lib/export.test.ts`, `settings.ts`
- Modify: `index.ts` (name "CSV Viewer & Converter"; accepts mimes `text/csv`, `text/tab-separated-values`, `text/plain`), `Tool.tsx` (`TextInputPanel` paste source with TSV auto-detect)

**Interfaces:**

- Produces:
  - `exportTable(table, format: 'csv' | 'tsv' | 'json' | 'ndjson' | 'sql' | 'markdown' | 'xlsx', opts): { bytes: Uint8Array; mime; extension }` (using A1-10 writers)
  - The file name `<name>-filtered-<n>rows.<ext>` when filtered, else `<name>.<ext>`
  - Send to: JSON Viewer (`application/json`), Mock Data (`inferMockSchema` from B-10's shared module), Text Diff
  - Settings `{ density, delimiterChoice, encoding, exportFormat, sqlDialect, sqlTable }`
- Consumes: A1-10, A2-16, B-10 `mock-schema.ts` (if B has not merged, D creates the same file; whoever merges second dedupes. The shared type lives in `src/shared/lib/data-formats/mock-schema.ts`).

- [ ] **Tests:**
  - The CSV export re-parses equal to the filtered rows.
  - XLSX unzips with the right row count.
  - SQL PostgreSQL quoting.
  - The file name rule.
  - Settings guard.
  - Component: pasting TSV detects the tab delimiter.
- [ ] **Commit:** `feat(csv): export to CSV, TSV, JSON, NDJSON, SQL, Markdown and XLSX; paste source; hand-offs`.

### Task D-6: Mock data PRNG, correct generators, cap, worker

**Files:**

- Create: `src/shared/lib/prng.ts`, `prng.test.ts`, `src/shared/workers/handlers/mock.ts`, `src/tools/random-data-generator/lib/generators/{index,ids,finance,people,net,text}.ts` plus tests, `lib/identicon.ts`, `identicon.test.ts`
- Modify: `src/tools/random-data-generator/lib/schema.ts` (remove lodash and `Math.random`)

**Interfaces:**

- Produces:
  - `createPrng(seed: string): Rng` (`xoshiro128**` seeded by `splitmix32` over the FNV-1a hash of the seed)
  - `cryptoRng(): Rng` (from `crypto/random`)
  - `Rng = { next(): number; int(max): number; pick<T>(a: T[]): T; bytes(n): Uint8Array }`
  - Generators take `(rng, opts)`: `uuidV4` (rng bytes with version and variant bits; with a seed it is labelled deterministic), `luhnCard(network: 'visa' | 'mastercard' | 'amex' | 'discover')`, `iban(country: 'GB' | 'DE' | 'FR' | 'ES' | 'IE')` with a valid mod-97 check, `ipv4`, `ipv6`, `mac`, `semver`, `hexColor`, `identiconSvgDataUri(seedText)`
  - `MAX_COUNT = 1_000_000`; `WARN_COUNT = 100_000`
  - Worker `mock.generate(schema, count, seed | null, ctx)` returns rows with progress per 10k rows and cancel
- Consumes: A1-5, A1-6.

- [ ] **Tests:**
  - `createPrng('abc')` produces the same first 5 numbers on every run (a snapshot of the values) and differs for `'abd'`.
  - Luhn: 1,000 generated cards per network pass the Luhn check, with lengths Visa 16, Mastercard 16, Amex 15, Discover 16 and the right prefixes.
  - IBAN mod-97 equals 1 for 100 samples per country.
  - UUID v4 matches `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`.
  - The identicon is a `data:image/svg+xml` URI and deterministic per seed.
  - A count over `MAX_COUNT` gives `TOO_LARGE`.
  - `grep -rn "Math.random\|lodash" src/tools/random-data-generator` is empty.
- [ ] **Commit:** `feat(mock-data): seeded PRNG, Luhn-valid cards, valid IBANs, local identicons, count cap and worker generation`.

### Task D-7: Mock data field options, locales, relations

**Files:**

- Create: `src/tools/random-data-generator/lib/{options,locales,relations,pattern}.ts` plus tests, `lib/locales/{en-US,en-GB,de-DE,fr-FR,es-ES}.ts` (in-house name, street, city and phone format lists of about 100 entries each)

**Interfaces:**

- Produces:
  - `FieldOptions = { nullablePct?: number; unique?: boolean; min?; max?; precision?; enum?: { value; weight }[]; pattern?: string; dateFrom?; dateTo?; locale? }`
  - `generateFromPattern(pattern, rng)` (classes, ranges, alternation, groups, quantifiers capped at 16; anchors ignored; unsupported constructs give `INVALID_INPUT` naming them)
  - Unique: retries up to 10 times the count, else `INVALID_INPUT` "Could not make 1000 unique values for email (only 812 possible)"
  - Relations: the schema has `tables: { name; count; fields }[]`; a field `{ type: 'foreign-key', table, field }` picks from the generated ids of that table (generated first; cycles rejected)
- Consumes: D-6.

- [ ] **Tests:**
  - `nullablePct: 100` gives all null; 0 gives none.
  - The weighted enum distribution is within 5% over 10k draws.
  - `generateFromPattern('[A-Z]{3}-\\d{4}')` matches `/^[A-Z]{3}-\d{4}$/` 100 times.
  - Unique failure message.
  - Foreign keys always reference existing ids.
  - A table cycle gives `INVALID_INPUT`.
  - Locale `de-DE` phone formats match the expected pattern.
- [ ] **Commit:** `feat(mock-data): field options (nullable, unique, ranges, enums, patterns), locales and table relations`.

### Task D-8: Mock data schema persistence, presets, inference, import/export, share

**Files:**

- Create: `src/tools/random-data-generator/lib/presets.ts`, `settings.ts`, `share.ts`, `share.test.ts`, `components/SchemaIO.tsx`

**Interfaces:**

- Produces:
  - Presets Users, Orders, Products and Events (schemas)
  - Settings `{ schema: MockSchema; locale; count; lastPreset }` (the schema is configuration, not data: `assertNoDataFields` passes because the key is `schema`)
  - Import and export schema JSON (validated by `parseMockSchema`)
  - "Infer from JSON sample" (`TextInputPanel` dialog, then `inferMockSchema`)
  - The hand-off accepts `application/vnd.tools.mock-schema+json`
  - Share `{ v: 1; schema; seed; count; locale }`
- Consumes: A1-1, A1-4, B-10's `mock-schema.ts`.

- [ ] **Tests:** `parseMockSchema` rejects unknown field types with the path; presets validate; the share validator; inference from a sample with `email` and `id` fields gives the `email` and `int` types.
- [ ] **Commit:** `feat(mock-data): persisted schema, presets, JSON-sample inference, schema import/export and share links`.

### Task D-9: Mock data exports, preview, hand-offs; lodash removed

**Files:**

- Create: `src/tools/random-data-generator/lib/export.ts`, `export.test.ts`
- Modify: `Tool.tsx` (split; `DataGrid` preview of the first 1,000 rows, JSON view in a read-only `CodeSurface`), `index.ts` (name "Mock Data Generator"; keywords "random data", "fake data", "test data")
- Modify: `package.json` (remove `lodash`, `@types/lodash` once `grep -rn "lodash" src` is empty)

**Interfaces:**

- Produces:
  - `exportRows(rows, format: 'json' | 'csv' | 'tsv' | 'ndjson' | 'sql' | 'ts' | 'xml', opts)` (TypeScript: `export interface User {...}` plus `export const users: User[] = [...] as const`; XML via `jsonToXml`)
  - Send to CSV Viewer (`text/csv`) and JSON Viewer (`application/json`)
- Consumes: A1-10.

- [ ] **Tests:**
  - The TS export compiles: run the TypeScript compiler API `ts.transpileModule` on the output and assert no syntax diagnostics.
  - SQL dialect quoting.
  - The XML root name.
  - `pnpm why lodash` reports nothing.
- [ ] **Commit:** `feat(mock-data): exports to CSV, TSV, NDJSON, SQL, TypeScript and XML; hand-offs; remove lodash`.

### Task D-10: Formatter worker (Prettier, sql-formatter, XML)

**Files:**

- Create: `src/shared/workers/handlers/format.ts`, `src/tools/code-formatter/lib/format.ts`, `lib/format.test.ts`, `lib/detect.ts`, `lib/detect.test.ts`
- Modify: `package.json` (`prettier`, `sql-formatter`; licences in `licences.ts`)

**Interfaces:**

- Produces:
  - `FormatLanguage = 'json' | 'javascript' | 'typescript' | 'jsx' | 'tsx' | 'css' | 'scss' | 'less' | 'html' | 'markdown' | 'yaml' | 'graphql' | 'sql' | 'xml'`
  - `formatCode(code, lang, opts: { indent: 2 | 4 | 'tab'; printWidth; singleQuote; semi; trailingComma: 'none' | 'es5' | 'all'; bracketSpacing; sqlDialect; keywordCase: 'upper' | 'lower' | 'preserve' }): Promise<string>` (Prettier standalone with lazily imported plugins: `babel`, `estree`, `typescript`, `postcss`, `html`, `markdown`, `yaml`, `graphql`; errors map to `INVALID_INPUT` with `line` and `column` from `loc`)
  - `detectLanguage(code, fileName?): FormatLanguage` (extension first, then heuristics)
  - The worker handler `format.code` runs with a 10 s `TIMEOUT` via a dedicated killable worker
- Consumes: A1-5, A1-10 `prettyXml` (XML runs on the main thread because DOMParser is not available in workers; documented).

- [ ] **Tests** (Node; Prettier runs in Node):
  - JS `const a={b:1}` gives `const a = { b: 1 };\n`; with `semi: false`, `const a = { b: 1 }\n`.
  - TS generics.
  - CSS.
  - HTML `<div><p>x</p></div>` is indented.
  - YAML.
  - SQL `select a,b from t where x=1` becomes the formatted upper-case keywords.
  - A syntax error `const = 1` gives `INVALID_INPUT` with `line: 1`.
  - `detectLanguage`: `'{"a":1}'` gives json, `'<html>'` gives html, `'SELECT'` gives sql, `('x', 'a.scss')` gives scss.
- [ ] **Commit:** `feat(code-formatter): Prettier and SQL formatting in a worker with positioned errors and language detection`.

### Task D-11: Minifiers

**Files:**

- Create: `src/tools/code-formatter/lib/minify/{index,html,xml,sql}.ts` plus tests
- Modify: `handlers/format.ts` (`format.minify`), `package.json` (`terser`, `csso`)

**Interfaces:**

- Produces: `minifyCode(code, lang: 'json' | 'css' | 'javascript' | 'html' | 'xml' | 'sql', { mangle = true }): Promise<{ code; before; after }>`.
  - JSON: `JSON.stringify(JSON.parse)`.
  - CSS: `csso`.
  - JS: `terser` (ES2022, `mangle` toggle).
  - HTML: in-house. Removes comments except conditional ones (`<!--[if`); collapses whitespace between tags; preserves `pre`, `textarea`, `script` and `style` content verbatim; collapses attribute whitespace; never removes optional tags or quotes.
  - XML: `minifyXml`.
  - SQL: in-house whitespace collapse outside strings, quoted identifiers and comments (`--` comments removed with a newline guard).
- Consumes: A1-10.

- [ ] **Tests:**
  - HTML minify keeps the `<pre>  a\n b</pre>` content intact, removes `<!-- x -->`, keeps `<!--[if IE]>`, and `<p> a  b </p>` becomes `<p> a b </p>`.
  - SQL: `select 'a  b' -- c\nfrom t` becomes `select 'a  b' from t`.
  - JS mangling shortens a local variable.
  - CSS output is smaller.
  - JSON with an invalid input gives `INVALID_INPUT`.
- [ ] **Commit:** `feat(code-formatter): JSON, CSS, JavaScript, HTML, XML and SQL minifiers`.

### Task D-12: Code Formatter UI

**Files:**

- Create: `src/tools/code-formatter/{index.ts,Tool.tsx,settings.ts}`, `components/OptionsPanel.tsx`, `test/e2e/tools/code-formatter.spec.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'code-formatter', slug: 'format', category: 'web', alsoIn: ['data'], name: 'Code Formatter & Minifier', keywords: ['prettier', 'beautify', 'minify', 'sql formatter', 'html formatter', 'css minifier'], accepts: [{ kinds: ['text'], mimes: ['text/plain', 'application/json', 'text/css', 'text/html', 'application/javascript', 'application/sql'] }] }`
  - The UI: a `SplitPane` of input and output `TextInputPanel`s (output read-only); a language `Select` (auto shows "Auto (TypeScript)"); Format and Minify actions (Mod+Shift+F, Mod+Shift+M); options per language (settings); error markers; the size before and after; "Show changes" sends `application/vnd.tools.diff-pair+json` to Text Diff; Download with the extension
- Consumes: A2-4, A2-5, D-10, D-11.

- [ ] **E2E:**
  1. Paste minified JS, Format, and the output matches the expected text.
  2. Minify CSS shows "before" and "after" sizes.
  3. A syntax error shows a marker on line 1.
  4. "Show changes" opens Text Diff with both sides filled (skipped if Part C has not merged; removed in H-1).
- [ ] **Commit:** `feat(code-formatter): new Code Formatter & Minifier tool`.

### Task D-13: Part D e2e, visual, gate

**Files:**

- Create: `test/e2e/tools/csv-viewer.spec.ts`, `random-data-generator.spec.ts`
- Modify: `scripts/gen-fixtures.ts` (`large.csv` 500k rows; a Windows-1252 CSV fixture)

- [ ] **CSV:** a semicolon CSV with ragged rows loads with the report; the Windows-1252 fixture shows the euro sign with encoding auto; filter plus multi-sort; the profile median; edit a cell then Mod+Z; export XLSX, unzip in Node, check the row count; "Open as JSON" hand-off to the JSON Viewer shows the tree (skipped until B merges; removed in H-1); `large.csv` grid scroll has no long task over 100 ms.
- [ ] **Mock data:** seed `abc` generates the same first row twice (reload); 200k rows show the progress and a cancel works; the SQL export; the share link restores the schema and seed; "Open in CSV Viewer" works.
- [ ] **Visual:** the three pages in both themes on desktop; CSV on phone.
- [ ] Run the merge gate.
- [ ] Open the PR "6-D: data tools (CSV Viewer & Converter, Mock Data Generator, Code Formatter); lodash removed".

---

# Part 6-E: encoding and security (Base64, Hash, JWT, Text Encoder, Password, UUID, Encrypt)

**Branch:** `feat/p6-e-encoding-security`. **Boundary:** the seven tool folders, `handlers/hash.ts`, and `src/shared/lib/crypto/digest.ts` additions. **Spec:** §8.3, §8.4, §9.4, §9.5.

### Task E-1: Base64 on the kit: insight, byte views, Send to, commands

**Files:**

- Create: `src/tools/base64-converter/lib/insight.ts`, `lib/insight.test.ts`, `settings.ts`
- Modify: `src/tools/base64-converter/Tool.tsx` (restyle onto `TextInputPanel`, `SegmentedControl`, `BytesView`, `Image`, `SendToMenu`), `src/shared/lib/files.ts` (`detectKind` gains `json`, `zip`, `gzip`, `svg`, `mp3`, `mp4`, `webm` signatures; additive, with tests), `index.ts` (name "Base64 Encoder / Decoder")

**Interfaces:**

- Produces:
  - `describeBytes(bytes): { label: string; kind: 'json' | 'jwt' | 'image' | 'text' | 'binary' | 'pdf' | 'archive' | 'media'; mime?: string; details?: string }` (for example `"Image (PNG 32x32)"` from the IHDR; `"JWT"` when the decoded text matches the JWT shape)
  - Actions: Open in JSON Viewer, JWT Decoder or Image Compressor
  - Commands: Encode clipboard, Decode clipboard, Swap (flips the mode)
  - Settings `{ urlSafe, padding, wrap76, mode, fileOutput }`
- Consumes: P0 lib, A2 kit, A1-3.

- [ ] **Tests:**
  - `describeBytes`: PNG bytes with IHDR 32x32 give `"Image (PNG 32x32)"`; `'{"a":1}'` gives json; a JWT string gives jwt; a gzip magic gives archive.
  - `detectKind` additions.
  - Settings guard.
- [ ] **Commit:** `feat(base64): kit restyle with content insight, hex and binary views, Send to and commands`.

### Task E-2: Hash algorithms, output formats, verify mode, badges

**Files:**

- Modify: `src/shared/lib/crypto/digest.ts` (+ tests), `src/tools/hash-generator/Tool.tsx` (split: `components/{TextHash,HmacCard,VerifyField,ResultRow}.tsx`), `index.ts` (name "Hash & Checksum")
- Create: `src/tools/hash-generator/lib/verify.ts`, `lib/verify.test.ts`, `lib/format.ts`, `lib/format.test.ts`, `settings.ts`
- Delete: `src/tools/hash-generator/lib/hash.ts` (P3; imports switched to `@/shared/lib/crypto/digest`)

**Interfaces:**

- Produces:
  - `formatDigest(hex, fmt: 'hex' | 'HEX' | 'base64' | 'base64url'): string`
  - `matchExpected(expected, results: Record<DigestId, string>): { match: DigestId | null; candidates: DigestId[] }` (normalises case, whitespace and `sha256:`-style prefixes; candidates by hex length)
  - Input encodings text, hex and Base64 for the text input
  - Badges: "Broken for security" (MD5, SHA-1), "Not cryptographic" (CRC32, CRC32C, xxHash)
  - Settings `{ selected: DigestId[], output, hmacAlg, inputEncoding }`
- Consumes: A1-7.

- [ ] **Tests:**
  - `formatDigest('00ff', 'base64')` gives `'AP8='`.
  - `matchExpected('SHA256: BA7816BF...', {sha256: 'ba7816bf...'})` gives match `sha256`.
  - A 32-hex-character expected value with no exact match gives `candidates: ['md5']` (the only selected algorithm with 32 hex characters).
  - Settings guard (`hmacAlg` allowed; no key).
  - Component: selecting algorithms updates the results; the verify field shows "Match: SHA-256".
- [ ] **Commit:** `feat(hash): more algorithms, output formats, verify mode with auto-detection and honest badges`.

### Task E-3: Hash file hashing in a worker with streaming and a checksum export

**Files:**

- Create: `src/shared/workers/handlers/hash.ts`, `src/tools/hash-generator/components/FileHashes.tsx`, `lib/checksum-file.ts`, `lib/checksum-file.test.ts`

**Interfaces:**

- Produces:
  - Worker `hash.file(file: File, algs: DigestId[], ctx)` returns `Record<DigestId, string>` (reads `file.stream()` in 4 MB chunks, updates every selected hasher incrementally, reports `{ done: bytes, total }` progress, honours abort)
  - `FileHashes`: multiple files in a `DataGrid` (name, size, one column per algorithm, per-row progress `Meter`, cancel per file)
  - `toChecksumFile(rows, alg): string` (`<hex>  <name>` lines, the `sha256sum` format)
  - Download `checksums.sha256`
- Consumes: A1-5, A1-7, A2-6.

- [ ] **Tests:**
  - The handler over a 20 MB `Blob` with chunks matches `digest()` of the whole for sha256, blake3 and crc32.
  - Progress events are monotonic and end at total.
  - Abort gives `CANCELLED`.
  - `toChecksumFile` format uses two spaces.
- [ ] **Commit:** `feat(hash): streamed multi-file hashing in a worker with progress, cancel and checksum files`.

### Task E-4: JWT live status, skew, JWKS and EdDSA polish, commands

**Files:**

- Modify: `src/tools/jwt-decode/Tool.tsx` (split into `components/{StatusRow,ClaimsView,TokenInput}.tsx`; restyle onto `TextInputPanel`, `Alert`, `Badge`, `MetaList`), `components/VerifyPanel.tsx` (kit `SegmentedControl`, `SecretText`, JWKS key picker when there is no `kid`), `src/tools/jwt-decode/settings.ts`
- Create: `src/tools/jwt-decode/lib/jwks.ts`, `lib/jwks.test.ts`

**Interfaces:**

- Produces:
  - `listJwksKeys(json): { kid?; kty; alg?; use?; label }[]` (for the manual picker)
  - Status row: signature state plus `exp`, `nbf` and `iat` with a live `formatDuration`; a clock skew `Select` (0, 30, 60, 120, 300 s) in settings
  - Commands: Paste token, Copy payload, Verify focus (Mod+Shift+V)
  - Settings `{ skew, keyKind }` (no key)
  - The `PrivacyNote` local variant
- Consumes: P0-6, P0-7.

- [ ] **Tests:**
  - `listJwksKeys` labels keys `"RSA (kid k1, RS256)"`; picking one verifies.
  - The skew affects the status (component, fake timers advance 1 s and the countdown text changes).
  - Settings guard.
- [ ] **Commit:** `feat(jwt): live status with clock skew, JWKS key picker and commands`.

### Task E-5: JWT builder and signer

**Files:**

- Create: `src/tools/jwt-decode/lib/sign.ts`, `lib/sign.test.ts`, `components/BuilderTab.tsx`

**Interfaces:**

- Produces:
  - `signJwt(header: object, payload: object, key: { kind: 'secret'; value; encoding } | { kind: 'private'; key: CryptoKey }, alg): Promise<string>` (HS\*, RS256, PS256, ES256, ES384, EdDSA; ECDSA signatures in raw r||s form as WebCrypto produces)
  - The builder: header and payload `CodeSurface` (JSON with `json-locate` markers), claim helpers (iat now, exp +1 h, +1 d, +7 d), an alg `Select`, a secret input or "Generate key pair" (A1-7; shows the public key as PEM and JWK with copy; the private key stays in memory), the resulting token with Copy, and "Open in decoder" (switches tabs and fills the token)
- Consumes: A1-7, P0-7.

- [ ] **Tests:**
  - For each alg: `verifyJwt(decodeJwt(await signJwt(...)), publicKey)` is `'verified'`.
  - The header `alg` is forced to match the chosen alg.
  - Invalid payload JSON gives `INVALID_INPUT` with a line.
- [ ] **Commit:** `feat(jwt): token builder and signer with HMAC secrets or generated key pairs`.

### Task E-6: JWT workflows and accepts

**Files:**

- Modify: `src/tools/jwt-decode/index.ts` (accepts mime `application/jwt`; keywords "jwt debugger", "json web token"), `Tool.tsx`

**Interfaces:**

- Produces: Send to: payload to the JSON Viewer (`application/json`); "Compare with another token" (opens a second `TextInputPanel`; then Text Diff hand-off with both pretty payloads as a `diff-pair`); `exp`/`iat` to Epoch (`text/plain` seconds). The hand-off accept fills the token.
- Consumes: A1-3, A2-16.

- [ ] **Tests:** component: a hand-off `application/jwt` fills and decodes; the Send to menu lists the JSON Viewer for the payload; Compare builds the pair payload with sorted-key JSON.
- [ ] **Commit:** `feat(jwt): hand-offs to the JSON Viewer, Text Diff and Epoch; accept tokens from other tools`.

### Task E-7: Text Encoder codec library, rename and slug

**Files:**

- Modify: `src/tools/url-encoder-decoder/index.ts` (name "Text Encoder / Decoder", slug `text`, keywords "url encoder", "html entities", "unicode escape", "punycode", "quoted printable")
- Create: `src/tools/url-encoder-decoder/lib/codecs/{index,url,html,unicode,js,punycode,hex,base32,qp}.ts` plus tests

**Interfaces:**

- Produces:
  - `Codec = { id; label; encode(s): string; decode(s): string }` (decode errors are `INVALID_INPUT` with a position)
  - `CODECS` (ids `url-component`, `url-full`, `form`, `html`, `unicode`, `js-string`, `json-string`, `punycode`, `hex`, `base32`, `quoted-printable`)
  - `decodeUntilStable(codec, s, max = 10): { output; rounds }`
  - `perLine(fn)(s)` helper
- Consumes: A1-6 (Base32), P0 encoding (hex).

- [ ] **Tests:**

| Codec              | Case                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `url-component`    | `'a b&c'` gives `'a%20b%26c'`; decoding `'%E2%82'` gives the error "Incomplete percent sequence at position 1" |
| `url-full`         | keeps `/?:` unescaped                                                                                          |
| `form`             | space becomes `+`, and `+` decodes to space                                                                    |
| `html`             | named `&amp;` and `&eacute;` (decode via the HTML5 table: jsdom DOMParser), numeric `&#x20AC;`                 |
| `unicode`          | `€`, `\u{1f600}` (astral built with `fromCodePoint` in the test) and `U+20AC` styles                           |
| `punycode`         | RFC 3492 sample strings, e.g. `'bücher'` gives `'xn--bcher-kva'`; hostname mode keeps dots                     |
| `quoted-printable` | soft line breaks at 76                                                                                         |
| `hex`              | round-trip                                                                                                     |

Also `decodeUntilStable` on `'%2541'` gives `'A'` in 2 rounds.

- [ ] **Commit:** `feat(text-encoder): codec library (URL modes, HTML entities, Unicode escapes, JS/JSON strings, Punycode, hex, Base32, quoted-printable)`.

### Task E-8: Text Encoder UI

**Files:**

- Modify: `src/tools/url-encoder-decoder/Tool.tsx` (rewrite), `settings.ts` (new)

**Interfaces:**

- Produces:
  - A codec `Select`; Encode or Decode `SegmentedControl`; Swap (flips the direction and moves output to input; fixes double encoding); "Decode until stable" (shows "Decoded in 2 rounds"); a per-line toggle
  - Input and output `TextInputPanel`s with inline errors at a position
  - A "How this codec works" disclosure (per-codec text)
  - The static card and the duplicate Clear are removed
  - When the output parses as a URL: "Open in URL Inspector" (`text/uri-list`)
  - Settings `{ codec, direction, perLine }`
- Consumes: E-7, A2 kit.

- [ ] **Tests** (component): Swap flips the mode (encode `a b`, swap, the decode output equals the original input); the per-line toggle encodes each line separately; the error shows a position; settings guard.
- [ ] **Commit:** `feat(text-encoder): multi-codec UI with swap, decode-until-stable, per-line mode and URL hand-off`.

### Task E-9: Password generator core

**Files:**

- Create: `src/tools/password-generator/lib/generate.ts` (replaces the old lib; the broken `getSecureRandomInRange` is deleted), `lib/generate.test.ts`, `lib/entropy.ts`, `lib/entropy.test.ts`, `settings.ts`
- Modify: `Tool.tsx` (split; `SecretText`, `Meter`, `Slider`, `Switch`)

**Interfaces:**

- Produces:
  - `generatePassword(opts: { length; lower; upper; digits; symbols; excludeAmbiguous; include?: string; exclude?: string; noLeadingSymbol; minPerClass: number; pin?: { noRepeats; noSequences } }): string` (at least `minPerClass` of each enabled class, then an unbiased fill and shuffle via `crypto/random`)
  - `entropyBits(poolSize, length)`, `poolSizeFor(opts)`
  - `crackTime(bits): { online: string; offline: string }` (1e4/s and 1e10/s, humanised)
  - Auto-regenerate on option change; Mod+Enter regenerates
  - Settings (all options)
- Consumes: A1-6, A2-15.

- [ ] **Tests:**
  - 1,000 generated passwords each contain at least `minPerClass` of every enabled class and none of `exclude` or the ambiguous set.
  - `noLeadingSymbol`.
  - PIN `noSequences` never contains `123` or `321`.
  - `entropyBits(10, 24)` is about 79.7.
  - Impossible options (all classes off, or exclude removing a whole class) give `INVALID_INPUT` naming the cause.
  - A chi-square uniformity check over 100k characters from a 4-symbol pool passes at p > 0.001.
- [ ] **Commit:** `feat(password): unbiased generator with exclusions, PIN mode, entropy meter and crack-time estimates`.

### Task E-10: Passphrases, bulk, licence entry

**Files:**

- Create: `src/tools/password-generator/lib/passphrase.ts`, `lib/passphrase.test.ts`, `src/tools/password-generator/data/eff-large.json` (7,776 words; loaded by `import()` so it is a lazy chunk), `components/BulkPanel.tsx`
- Modify: `src/app/licences.ts` (EFF wordlist, CC BY 3.0 US, source URL)

**Interfaces:**

- Produces:
  - `generatePassphrase({ words: 3..12; separator; capitalise: 'none' | 'first' | 'all'; addNumber; addSymbol }, list): string`
  - `passphraseEntropy(words, listSize)`
  - Bulk 1–1,000: copy all, download `.txt`
- Consumes: A1-6.

- [ ] **Tests:** the list has exactly 7,776 unique words; `generatePassphrase` with 6 words yields 6 list words joined by the separator; entropy for 6 words is about 77.5 bits; bulk 1,000 returns 1,000 unique values (probabilistically certain for these settings).
- [ ] **Commit:** `feat(password): EFF passphrases and bulk generation`.

### Task E-11: Strength checker and hand-offs

**Files:**

- Create: `src/tools/password-generator/components/CheckerTab.tsx`, `lib/checker.ts`, `lib/checker.test.ts`
- Modify: `package.json` (`@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en`; licences)

**Interfaces:**

- Produces:
  - `checkStrength(password): Promise<{ score: 0..4; guessesLog10; crackTime; warning?; suggestions: string[] }>` (lazy import of zxcvbn and its dictionaries on first call)
  - `CheckerTab`: a `SecretText` input, `Meter`, feedback list, and `PrivacyNote`
  - Send to: PDF Protect (`application/vnd.tools.secret`; target `/pdf/protect` accepts it if P5 wired `accepts.mimes`; otherwise the menu omits it), Text Encrypt (passphrase), Hash
- Consumes: A2-15, A2-16.

- [ ] **Tests:** `checkStrength('password')` scores 0 with a warning; a 5-word passphrase scores 4; the module is not imported until `checkStrength` runs (assert via a `vi.mock` call count).
- [ ] **Commit:** `feat(password): local strength checker (zxcvbn-ts, lazy) and hand-offs to Protect, Encrypt and Hash`.

### Task E-12: UUID / ULID / NanoID library

**Files:**

- Create: `src/tools/uuid-generator/lib/{uuid,ulid,nanoid,decode}.ts` plus tests

**Interfaces:**

- Produces:
  - `uuidV4()`
  - `uuidV7(now = Date.now)` (monotonic: a 12-bit counter in `rand_a` resets each ms and increments within the same ms; on overflow it borrows the next ms)
  - `uuidV5(namespace: 'dns' | 'url' | 'oid' | 'x500' | string, name): Promise<string>` (SHA-1 via `crypto/digest`)
  - `NIL`, `MAX`
  - `ulid(now = Date.now)` (monotonic: the same ms increments the random part)
  - `nanoid(alphabet = URL_ALPHABET, size = 21)` (unbiased)
  - `formatUuid(u, { upper; hyphens; braces; urn })`
  - `decodeId(text): { kind: 'uuid'; version; variant; timestamp?: number } | { kind: 'ulid'; timestamp } | { kind: 'unknown' }` (v1 and v6 Gregorian 100 ns since 1582; v7 ms)
  - `nanoidCollision(alphabetSize, size, perHour): string`
- Consumes: A1-6, A1-7.

- [ ] **Tests:**
  - The RFC 9562 v5 example: namespace DNS and name `www.example.com` give `2ed6657d-e927-568b-95e1-2665a8aea6a2`.
  - v7: 1,000 ids generated in the same mocked ms sort lexicographically in generation order; the timestamp decodes back.
  - ULID: Crockford alphabet, 26 characters, monotonic within a ms, decoded time.
  - NanoID: length and alphabet; distribution over a 2-character alphabet is within 2%.
  - Decoding a known v1 UUID gives the expected date.
  - `formatUuid` options.
- [ ] **Commit:** `feat(uuid): UUID v4/v5/v7, ULID and NanoID generation with decoding`.

### Task E-13: UUID tool UI

**Files:**

- Create: `src/tools/uuid-generator/{index.ts,Tool.tsx,settings.ts}`, `test/e2e/tools/uuid-generator.spec.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'uuid-generator', slug: 'uuid', category: 'security', alsoIn: ['data'], name: 'UUID / ULID / NanoID Generator', keywords: ['guid', 'uuid v4', 'uuid v7', 'ulid', 'nanoid'] }`
  - The UI: a kind `SegmentedControl`; options per kind; count 1–10,000; a list in a read-only `CodeSurface`; Copy all; Download `.txt`, `.csv` or `.json`; a Decode panel (paste an id to see its details); the NanoID collision estimate
  - Commands: Generate (Mod+Enter), Copy all
  - Settings `{ kind, count, format, nanoAlphabet, nanoSize, v5Namespace }`
- Consumes: E-12, A2 kit.

- [ ] **E2E:** generate 100 v7 ids, sorted equals as-is; decode a pasted v7 shows a date; download CSV with 100 lines.
- [ ] **Commit:** `feat(uuid): new UUID / ULID / NanoID Generator tool`.

### Task E-14: Text Encrypt: text mode

**Files:**

- Create: `src/tools/text-encrypt/{index.ts,Tool.tsx,settings.ts}`, `components/{TextMode,KdfOptions}.tsx`, `hooks/useCryptoJob.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'text-encrypt', slug: 'encrypt', category: 'security', name: 'Text & File Encrypt', keywords: ['aes', 'encrypt text', 'decrypt', 'password encrypt', 'pgp alternative'], accepts: [{ kinds: ['any'], mimes: ['text/plain', 'application/vnd.tools.secret'] }] }`
  - Text mode: plaintext or armoured input `TextInputPanel`; passphrase with confirm on encrypt (`SecretText`) plus a strength `Meter`; KDF `SegmentedControl` (PBKDF2 600k default, Argon2id) in settings; Encrypt and Decrypt; output with Copy
  - Argon2id runs in the text worker (`crypto.argon2` handler added to `handlers/hash.ts`) so the UI stays responsive
  - Errors from `open` show `WRONG_PASSWORD` and the other messages
  - "Generate passphrase" (E-10 lib)
  - The secret hand-off fills the passphrase
  - Settings `{ kdf }` (never passphrases)
- Consumes: A1-7, E-10, A2-15.

- [ ] **Tests** (component, with the KDF params mocked fast): encrypt then decrypt round-trip; a wrong passphrase shows "Wrong passphrase, or the data was changed"; a mismatched confirm blocks encrypt; settings guard.
- [ ] **Commit:** `feat(text-encrypt): new tool, text mode with AES-256-GCM and PBKDF2 or Argon2id`.

### Task E-15: Text Encrypt: file mode

**Files:**

- Create: `src/tools/text-encrypt/components/FileMode.tsx`, `lib/file-envelope.ts`, `lib/file-envelope.test.ts`, `test/e2e/tools/text-encrypt.spec.ts`

**Interfaces:**

- Produces:
  - `packFile(file): Promise<Uint8Array>` (inner payload: a `u16` name length, the name UTF-8, a `u16` mime length, the mime, then the bytes)
  - `unpackFile(bytes): { name; mime; bytes }`
  - File mode: drop any file to get `<name>.enc` via `seal`; drop `.enc` to decrypt via `open` then `unpackFile`, and download with the original name
  - 2 GB cap, with progress for the KDF and the encryption
- Consumes: A1-7, `saveBlob`.

- [ ] **Tests:**
  - `unpackFile(packFile(f))` round-trips the name with Unicode (an astral character from `fromCodePoint`) and the mime.
  - A truncated inner payload gives `INVALID_INPUT`.
- [ ] **E2E:** encrypt a fixture file, download `.enc`, decrypt it in Node with WebCrypto using the spec §9.5 layout (independent check of the format), and the bytes are equal; decrypt with the wrong passphrase in the UI shows the error.
- [ ] **Commit:** `feat(text-encrypt): file mode with name and type preserved inside the encrypted envelope`.

### Task E-16: Part E e2e, visual, gate

**Files:**

- Create: `test/e2e/tools/{base64-converter,hash-generator,jwt-decode,url-encoder-decoder,password-generator}.spec.ts` (moving the P0 specs into these files)

- [ ] **Base64:** a PNG data URI shows the preview and the "Image (PNG 1x1)" insight; Send to the JSON Viewer works for JSON.
- [ ] **Hash:** a 50 MB generated file shows progress and the sha256 equals Node's `crypto` value; the verify field matches; checksum file download.
- [ ] **JWT:** a builder-signed ES256 token verifies in the decoder; the live countdown changes after 2 s; the JWKS picker.
- [ ] **Text Encoder:** `/encoding/text` loads (slug changed; `/encoding/url` shows NotFound with search results containing "Text Encoder"); Punycode; decode until stable.
- [ ] **Password:** the PIN mode; a passphrase with 6 words; the checker scores `password` as 0; no network request for zxcvbn beyond the same-origin lazy chunk.
- [ ] **Visual:** all seven pages in both themes on desktop.
- [ ] Run the merge gate.
- [ ] Open the PR "6-E: encoding and security tools (Base64, Hash & Checksum, JWT, Text Encoder, Password, UUID, Text & File Encrypt)".

---

# Part 6-F: math and time (Calculator, Number, Units, Date, Epoch, Cron, Pomodoro)

**Branch:** `feat/p6-f-math-time`. **Boundary:** the seven tool folders and `src/shared/lib/numbers/*`. **Spec:** §8.5, §8.6, §9.6, §9.7.

### Task F-1: `numbers/*` library

**Files:**

- Create: `src/shared/lib/numbers/{base,twos,ieee754,bits,index}.ts` plus tests

**Interfaces:**

- Produces:
  - `parseInBase(text, base: 2..36, { allowPrefix = true }): { value: bigint; fraction?: string }` (accepts `0x`, `0b`, `0o` prefixes and `_`/space separators, a sign, and an optional `.fraction`; errors give `INVALID_INPUT` with a position: "Digit 9 is not valid in base 8 at position 3")
  - `formatInBase(value: bigint, base, { group?: number; prefix?: boolean; upper?: boolean })`
  - `fractionToBase(numerator: string, base, precision): { digits; repeating: boolean }`
  - `toTwos(value: bigint, bits: 8 | 16 | 32 | 64): bigint`, `fromTwos(raw: bigint, bits): bigint`
  - `overflows(value, bits, signed): boolean`
  - `toBytes(value, bits, endian: 'be' | 'le'): Uint8Array`
  - `float32FromBits(raw: number)`, `float64FromBits(raw: bigint)`
  - `decomposeFloat(bits: 32 | 64, raw): { sign; exponent; mantissa; value; kind: 'normal' | 'subnormal' | 'zero' | 'inf' | 'nan' }`
  - `bitOp(op: 'and' | 'or' | 'xor' | 'nand' | 'nor' | 'not' | 'shl' | 'shr' | 'sar' | 'rotl' | 'rotr', a: bigint, b: bigint, bits, signed): bigint`
  - `unixPermissions(octal: string): string` (`'750'` gives `'rwxr-x---'`) and `permissionsToOctal('rwxr-x---')`
- Consumes: A1-6 (Base32 and Base58 for byte strings).

- [ ] **Tests:**
  - `parseInBase('0xFFFF_FFFF_FFFF_FFFF', 16)` gives `18446744073709551615n` (precision kept beyond 2^53).
  - `formatInBase(255n, 2, { group: 4 })` gives `'1111 1111'`.
  - `toTwos(-1n, 8)` gives `255n` and `fromTwos(255n, 8)` gives `-1n`.
  - `overflows(128n, 8, true)` is true.
  - `toBytes(0x1234n, 16, 'le')` gives `[0x34, 0x12]`.
  - `float32FromBits(0x3f800000)` gives `1`; `decomposeFloat(32, 0x00000001)` is subnormal.
  - `bitOp('rotl', 0x81n, 1n, 8, false)` gives `0x03n`.
  - `fractionToBase('0.1', 2, 20)` is repeating.
  - Error positions.
  - Permissions round-trip.
- [ ] **Commit:** `feat(shared): BigInt base conversion, two's complement, IEEE-754 and bit operations`.

### Task F-2: Number Base Converter UI

**Files:**

- Modify: `src/tools/number-converter/Tool.tsx` (rewrite; split `components/{BaseFields,WidthPanel,Readouts}.tsx`), `index.ts` (name "Number Base Converter")
- Create: `settings.ts`, `share.ts`, `share.test.ts`, `lib/state.ts`, `lib/state.test.ts`

**Interfaces:**

- Produces:
  - `deriveAll(value: bigint, { bits; signed; customBase; fractionPrecision }): { bin; oct; dec; hex; custom; base32?; base58?; bytesBE; bytesLE; ascii; float?; perms? }`
  - Every field is editable: editing one parses it and updates the rest. An error shows inline under that field and all other fields **clear** (fixing stale results).
  - The `BitGrid` toggles bits.
  - The signedness and width `SegmentedControl`s; the overflow `Alert`.
  - Readouts: ASCII and UTF-8 (control names), IEEE-754 decomposition, Unix permissions (a two-way checkbox matrix).
  - "How it works" `Accordion` (replaces the info tab).
  - `'—'` placeholders become "None".
  - Share `{ v: 1; value: string; bits; signed; customBase }`; settings `{ bits, signed, customBase }`.
- Consumes: F-1, A2-15, A1-4.

- [ ] **Tests:**
  - `deriveAll(255n, { bits: 8, signed: true })` gives `dec '-1'` in the signed view and `hex 'FF'`.
  - Component: typing an invalid hex clears the other fields and shows "Digit G is not valid in base 16 at position 2"; toggling bit 0 updates dec.
  - The share validator.
  - Settings guard.
- [ ] **Commit:** `feat(number-base): every base editable with BigInt precision, widths, bit grid, float and permission readouts`.

### Task F-3: Calculator engine (sheet, variables, units, precision) and store migration

**Files:**

- Create: `src/tools/calculator/lib/engine.ts`, `lib/engine.test.ts`, `settings.ts`, `settings.test.ts`
- Modify: `src/tools/calculator/lib/expression.ts` (P0; extended, with angle overrides kept), `src/tools/calculator/store.ts` (replaced by `createToolSettings` with migration)

**Interfaces:**

- Produces:
  - `evaluateSheet(lines: string[], { angle; precision: 4..64; bigNumber: boolean; notation: { thousands: boolean; sciAbove: number } }): { results: ({ ok: true; text: string; value: unknown } | { ok: false; error: string } | { ok: true; text: '' })[]; scope: Record<string, unknown> }`
    - Per-line scope: assignments `a = 5`; `ans` is the previous result; `line3` refers to line 3's result.
    - Comments starting with `#` or `//` give empty results.
    - mathjs units: `5 km to mi` returns a Unit, formatted with the unit.
    - BigNumber mode uses `create(all, { number: 'BigNumber', precision })`.
  - Settings migration from the old calculator store (`history`, `saved`, `memories` kept; the key is unchanged `kit:store:tool:calculator`)
- Consumes: P0 expression, A1-1.

- [ ] **Tests:**
  - `['a = 5', 'a * 2', 'ans + 1', 'line2 / 2']` gives `['5', '10', '11', '5']`.
  - `['5 km to mi']` gives `'3.1068559611867 mi'` (14 significant digits; the precision setting controls it).
  - `['sin(30)']` in deg gives `'0.5'`.
  - BigNumber mode: `0.1 + 0.2` gives `'0.3'` exactly and `2^200` exact digits.
  - A line error does not stop later lines.
  - Thousands separators format `1234567` as `1,234,567`.
  - Migration: seed the old envelope with `history: ['1+1 = 2']`, `memories`, and see them preserved.
  - Settings guard: the `history` key holds the user's past expressions. That is settings-class data the user expects to persist (existing behaviour), so the guard is configured with `allow: ['history', 'saved', 'memories']` for this tool and the reason is documented in a comment.
- [ ] **Commit:** `feat(calculator): expression sheet engine with variables, units, precision and BigNumber; store migrated`.

### Task F-4: Calculator UI (sheet, expression-first keypads, help, history, share)

**Files:**

- Modify: `src/tools/calculator/Tool.tsx` (rewrite; split `components/{Sheet,Keypad,HistoryPanel,HelpSheet}.tsx`), `hooks/useCalculator.ts` (replaced by `hooks/useSheet.ts`; the immediate-execution state machine is deleted, D12), `index.ts` (name "Calculator & Grapher")
- Create: `share.ts`, `share.test.ts`, `hooks/useSheet.test.tsx`

**Interfaces:**

- Produces:
  - `useSheet()` returns `{ lines; setLine; activeLine; insert(token); evaluateActive(); clearActive(); backspace() }`
  - Modes `SegmentedControl`: Standard, Scientific, Programmer, Grapher.
  - The keypads insert tokens (`×` maps to `*`, and so on) at the caret of the active `CodeSurface` single-line row.
  - The keyboard map (P0 `keyToAction`) now drives `insert`/`evaluate` when focus is not in an editable target.
  - The `?` `HelpSheet` lists the keys via `Kbd`.
  - History: capped at 500, searchable, tape export `.txt`; favourites; memories.
  - Share `{ v: 1; lines; angle; precision }`.
- Consumes: F-3, P0 keys, A2 kit.

- [ ] **Tests:**
  - `useSheet`: insert at the caret; evaluate appends to history (capped at 500, the oldest dropped).
  - The share validator.
  - Component: clicking keypad `7`, `×`, `6`, `=` shows `42`.
- [ ] **Commit:** `feat(calculator): expression-first sheet UI with keypads, help sheet, history tape and share links`.

### Task F-5: Calculator programmer mode

**Files:**

- Create: `src/tools/calculator/components/Programmer.tsx`, `lib/programmer.ts`, `lib/programmer.test.ts`

**Interfaces:**

- Produces:
  - `programmerEval(expr, { bits; signed; base: 2 | 8 | 10 | 16 }): bigint` (tokens: numbers in the current base or prefixed, operators `& | ^ ~ << >> >>> + - * / %`, functions `rotl(a, n)`, `rotr`, `nand`, `nor`; results wrap to the word size)
  - The UI: word size and signedness controls; hex, dec, oct and bin fields (editable, F-1); `BitGrid`; operator buttons; "Open in Number Base Converter" (`text/plain` hand-off)
- Consumes: F-1.

- [ ] **Tests:**
  - `programmerEval('0xFF + 1', { bits: 8, signed: false })` gives `0n` (wrap).
  - `~0` at 16-bit signed gives `-1n`.
  - `rotl(0x81, 1)` at 8-bit gives `3n`.
  - `1 << 70` at 64-bit wraps.
  - Division by zero gives `INVALID_INPUT`.
- [ ] **Commit:** `feat(calculator): programmer mode with word sizes, bitwise operators and a bit grid`.

### Task F-6: Grapher on the kit Chart

**Files:**

- Modify: `src/tools/calculator/components/GraphDisplay.tsx` (replaced by `components/Grapher.tsx`)
- Create: `lib/roots.ts`, `lib/roots.test.ts`

**Interfaces:**

- Produces:
  - `findRoots(fn, [a, b], { samples = 2000 }): number[]` (sign-change scan plus Brent's method, tolerance 1e-12; skips discontinuities where `|f|` jumps above a threshold)
  - `findIntersections(f, g, range)`
  - `Grapher`: up to 6 functions (colour-coded rows, add or remove), a kit `Chart` `function` kind with zoom and pan, trace readout, a roots and intersections list (click to centre), range inputs, PNG export
- Consumes: A2-9, P0 `compileFunction`.

- [ ] **Tests:**
  - `findRoots(x => x*x - 2, [-3, 3])` gives about `[-1.41421356, 1.41421356]`.
  - `findRoots(Math.tan, [-2, 2])` gives only `[0]` (asymptotes rejected).
  - The intersections of `x` and `x^2` in `[-1, 2]` are `[0, 1]`.
- [ ] **Commit:** `feat(calculator): multi-function grapher with adaptive sampling, roots and intersections`.

### Task F-7: Unit definitions (exact factors, SI and IEC, precision, new categories)

**Files:**

- Create: `src/tools/unit-converter/lib/units/{index,length,mass,volume,temperature,area,speed,time,data,data-rate,pressure,energy,power,force,torque,angle,frequency,fuel,density,typography,cooking}.ts`, `lib/convert.ts`, `lib/convert.test.ts`, `lib/format.ts`, `lib/format.test.ts`

**Interfaces:**

- Produces:
  - `Unit = { id; label; symbol; toBase(v): number; fromBase(v): number; note?: string }` (linear units by factor; temperature and fuel economy by functions)
  - `CATEGORIES: { id; label; base; units: Unit[] }[]`
  - `convert(value, from, to)`
  - `formatNumber(v, { significant = 10; locale })` (uses `toPrecision` plus exponent display for magnitudes below 1e-6 or above 1e15; never rounds tiny values to 0)
  - `parseLocaleNumber(text, locale)` (`1,5` in de-DE gives 1.5; with an explicit toggle)
  - Typography takes a base font size parameter.
- Consumes: none.

- [ ] **Tests:**
  - 1 mile is exactly 1609.344 m.
  - 1 lb is 0.45359237 kg.
  - 1 MB is 1,000,000 B and 1 MiB is 1,048,576 B.
  - 1 eV in J formats as `1.602176634e-19` (not `0`).
  - 32 F is 0 C; -40 F is -40 C.
  - 10 L/100km is about 23.5215 mpg (US); converting back gives 10.
  - 16 px at base 16 is 1 rem.
  - The month note "average Gregorian (30.436875 d)".
  - Every unit round-trips `fromBase(toBase(x))` within 1e-12 relative.
- [ ] **Commit:** `feat(units): exact factors, SI and IEC data units, significant-digit precision and ten new categories`.

### Task F-8: Units all-units view, free text, history, favourites, share

**Files:**

- Modify: `src/tools/unit-converter/Tool.tsx` (rewrite; split `components/{AllUnits,FreeText,HistoryList}.tsx`)
- Create: `lib/free-text.ts`, `lib/free-text.test.ts`, `settings.ts`, `share.ts`

**Interfaces:**

- Produces:
  - `AllUnits`: every unit in the category as an editable row (typing in any row updates the others; copy per row; pin to top)
  - `parseFreeText(text): { category; from; value; to?: string } | null` (`'5 ft 3 in to cm'` sums compound lengths; `'72F'` gives temperature; otherwise mathjs `unit()` parsing mapped onto our ids)
  - History: the last 20, added after 800 ms idle
  - Favourites
  - Share `{ v: 1; category; value; unit }`
  - The Mod+K command "Convert…" opens the free-text field
  - Settings `{ category, favourites, history, precision, locale }`
- Consumes: F-7, A1-1, A1-2, A1-4.

- [ ] **Tests:**
  - `parseFreeText('5 ft 3 in to cm')` gives a length of 160.02 cm.
  - `'72F'` gives about 22.22 C.
  - Garbage gives null.
  - Component: typing in the km row updates the mile row; history adds after 800 ms (fake timers), not on blur.
  - Settings guard (`history` allowed with a documented reason).
- [ ] **Commit:** `feat(units): all-units bidirectional view, free-text conversions, persisted history and favourites, share`.

### Task F-9: Date calculator difference and add/subtract (calendar-accurate, clamp, chain)

**Files:**

- Create: `src/tools/date-calculator/lib/{difference,arith}.ts` plus tests

**Interfaces:**

- Produces:
  - `difference(a: ZonedDateTime, b: ZonedDateTime): { sign: 1 | -1; years; months; days; hours; minutes; seconds; totals: { days; weeks: { weeks; days }; hours; minutes; seconds } }` (`@internationalized/date` calendar arithmetic, leap years and month lengths respected)
  - `applyOps(base, ops: { amount; unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' | 'business-day' }[], { overflow: 'clamp' | 'roll'; workweek; holidays })`
- Consumes: `@internationalized/date`, A1-11.

- [ ] **Tests:**
  - 2023-01-15 to 2024-02-19 gives 1 year, 1 month, 4 days.
  - The sign is -1 when a > b.
  - 2024-01-31 + 1 month (clamp) gives 2024-02-29; with roll, 2024-03-02.
  - A chain of +1 month then +3 days.
  - Totals: 2024 has 366 days.
  - Across a DST change in Europe/Dublin, the hours total is 23 for a 1-day span in March.
- [ ] **Commit:** `feat(date): calendar-accurate signed differences and chained arithmetic with end-of-month clamping`.

### Task F-10: Date business days, holidays, zones, flexible input and output, share

**Files:**

- Create: `src/tools/date-calculator/lib/{business,ics}.ts` plus tests, `settings.ts`, `share.ts`
- Modify: `Tool.tsx` (rewrite onto the kit; live, no buttons; split `components/{DifferenceTab,ArithmeticTab,BusinessTab,DateInput}.tsx`), `index.ts` (name "Date & Time Calculator")

**Interfaces:**

- Produces:
  - `businessDaysBetween(a, b, { workweek: boolean[7]; holidays: Set<string> }): number`
  - `addBusinessDays(d, n, opts)`
  - `parseIcsDates(text): string[]` (VEVENT `DTSTART` with `VALUE=DATE` or a datetime, unfolded lines)
  - `DateInput`: accepts ISO, Unix s/ms, RFC 2822, "now", "today + 3w" (A1-11), with a zone `Select` and a "Now" button
  - Outputs: ISO, Unix, relative, ISO week, day of year, quarter
  - "Compare across zones" sends to Epoch (`text/plain` epoch seconds)
  - Settings `{ workweek, defaultZone, overflow }`
  - Share `{ v: 1; tab; inputs; zone; workweek; holidays }`
- Consumes: F-9, A1-11, A1-4.

- [ ] **Tests:**
  - Business days Mon 2024-06-03 to Mon 2024-06-10 with Mon–Fri give 5; with the holiday 2024-06-05, 4.
  - `addBusinessDays(Fri, 1)` gives Mon.
  - An `.ics` with a folded `DTSTART;VALUE=DATE:20241225` gives `['2024-12-25']`.
  - The share validator; settings guard.
- [ ] **Commit:** `feat(date): business days with holidays and .ics import, zone-aware inputs, flexible formats, share links`.

### Task F-11: Epoch converter (now, convert, outputs)

**Files:**

- Create: `src/tools/epoch-converter/{index.ts,Tool.tsx,settings.ts,share.ts}`, `components/{NowPanel,ConvertPanel}.tsx`, `lib/outputs.ts`, `lib/outputs.test.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'epoch-converter', slug: 'epoch', category: 'time', name: 'Epoch & Time Zone Converter', keywords: ['unix timestamp', 'epoch converter', 'timestamp to date', 'time zone converter', 'world clock'], accepts: [{ kinds: ['text'], mimes: ['text/plain'] }] }`
  - `outputsFor(epochMs, zone): { label; value }[]` (ISO UTC, ISO with offset, RFC 2822, RFC 3339, Unix s, ms, µs and ns, relative, weekday, ISO week, day of year, DST)
  - `NowPanel`: ticking each second, pausable, copy each unit
  - `ConvertPanel`: one input with the auto-detected kind shown ("Detected: Unix milliseconds") and an override
- Consumes: A1-11.

- [ ] **Tests:** `outputsFor(1700000000000, 'UTC')` includes `2023-11-14T22:13:20.000Z`, `Tue, 14 Nov 2023 22:13:20 +0000`, week 46, day 318; for zone `America/New_York` the ISO offset is `-05:00`.
- [ ] **Commit:** `feat(epoch): new Epoch & Time Zone Converter with live now and auto-detected conversions`.

### Task F-12: Epoch zones (world clock, zone converter, meeting planner)

**Files:**

- Create: `src/tools/epoch-converter/components/{WorldClock,ZoneConverter,MeetingPlanner}.tsx`, `lib/planner.ts`, `lib/planner.test.ts`

**Interfaces:**

- Produces:
  - `WorldClock`: a persisted zone list (add by search over `listZones()` plus city aliases such as "Dublin" for Europe/Dublin; remove; reorder with Alt+Arrow)
  - `ZoneConverter`: a wall-clock time in zone A shown in all listed zones (uses `wallClockToEpoch`, reporting `skipped` or `ambiguous` times with a notice)
  - `planDay(dateISO, zones, workHours: [9, 17]): { hourUTC: number; cells: { zone; localHour; working: boolean }[] }[]` plus `bestOverlap()`
  - `MeetingPlanner`: a 24-column strip per zone with working-hour shading (token colours) and the best-overlap highlight
  - Share `{ v: 1; instant; zones }`; settings `{ zones, workHours }`
- Consumes: A1-11, F-11.

- [ ] **Tests:**
  - `planDay('2024-06-03', ['Europe/Dublin', 'America/New_York'], [9, 17])`: Dublin is UTC+1 (working 08:00–16:00 UTC) and New York is UTC-4 (working 13:00–21:00 UTC), so `bestOverlap()` is the UTC hour cells 13, 14 and 15 (13:00–16:00 UTC).
  - A skipped wall-clock time notice for a DST gap.
- [ ] **Commit:** `feat(epoch): world clock, zone converter and meeting planner`.

### Task F-13: Cron parser, explanation and next runs

**Files:**

- Create: `src/tools/cron-builder/lib/{parse,explain,next}.ts` plus tests

**Interfaces:**

- Produces:
  - `parseCron(expr, flavour: 'unix' | 'seconds' | 'quartz'): CronAst` (fields with lists, ranges, steps and names; Quartz `? L W #`; macros; errors give `INVALID_INPUT` with `{ field, column }`, for example "Day of month: 32 is out of range 1-31")
  - `explainCron(ast): string`
  - `nextRuns(ast, { from: number; count: number; zone: string }): number[]`, which iterates in wall-clock time in `zone`. DST rules (Vixie cron semantics, documented in the code):
    - a fixed-time run inside a skipped hour fires at the first valid minute after the gap;
    - a run inside a repeated hour fires once, at the first occurrence;
    - interval schedules (`*/5`) simply skip the missing minutes.
      Unix day-of-month and day-of-week use OR semantics when both are restricted; Quartz requires `?` in one of them.
- Consumes: A1-11.

- [ ] **Tests:**
  - **Explanations** (a corpus of 25 expressions):
    - `'*/5 * * * *'` gives "Every 5 minutes".
    - `'30 9 * * 1-5'` gives "At 09:30 on every weekday from Monday to Friday".
    - `'0 0 1 * *'` gives "At 00:00 on day 1 of every month".
    - `'0 0 12 ? * MON#2'` (Quartz) gives "At 12:00 on the second Monday of every month".
    - `'@hourly'` gives "Every hour".
    - `'@reboot'` gives "At startup (no scheduled times)".
  - **Next runs:**
    - `'0 9 * * *'` from 2024-03-30T12:00Z in Europe/Dublin gives 2024-03-31T08:00Z (09:00 IST), then 2024-04-01T08:00Z.
    - `'30 1 * * *'` on 2024-03-31 in Europe/Dublin (01:30 does not exist; clocks jump from 01:00 GMT to 02:00 IST) runs at 2024-03-31T01:00Z (02:00 IST).
    - `'0 1 * * *'` on 2024-10-27 in Europe/Dublin (01:00 occurs twice) runs once, at 2024-10-27T00:00Z (01:00 IST, the first occurrence).
    - The OR semantics: `'0 0 13 * 5'` matches both the 13th and Fridays.
  - **Errors** carry the field and column.
- [ ] **Commit:** `feat(cron): parser for Unix, seconds and Quartz flavours with English explanations and DST-correct next runs`.

### Task F-14: Cron Builder UI

**Files:**

- Create: `src/tools/cron-builder/{index.ts,Tool.tsx,settings.ts,share.ts}`, `components/{FieldEditor,Presets,NextRuns}.tsx`, `lib/build.ts`, `lib/build.test.ts`, `test/e2e/tools/cron-builder.spec.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'cron-builder', slug: 'cron', category: 'time', alsoIn: ['web'], name: 'Cron Expression Builder', keywords: ['crontab', 'cron generator', 'quartz cron', 'cron explain', 'schedule'] }`
  - `buildField(spec: { mode: 'every' | 'specific' | 'range' | 'step'; values?; from?; to?; step? }, field): string` and `fieldToSpec(text, field)` (two-way)
  - The UI: an expression `CodeSurface` single-line with error markers; the flavour `SegmentedControl`; per-field editors; presets; the explanation; next runs (10, 20 or 50) in a zone `Select`; copy
  - Share `{ v: 1; expr; flavour; zone }`; settings `{ flavour, zone, count }`
- Consumes: F-13, A2 kit.

- [ ] **Tests:**
  - `buildField({ mode: 'step', from: 0, step: 15 }, 'minute')` gives `'0/15'` (Quartz) or `'*/15'` (Unix), per flavour.
  - The `fieldToSpec` round-trip.
- [ ] **E2E:**
  1. Choose the preset "Weekdays at 9" and see the expression `0 9 * * 1-5` and the explanation.
  2. Edit the minute field to `32 9 * * *` and see 10 next runs.
  3. Type `61 * * * *` and see the error marker at column 1 with the message.
  4. The share link round-trip.
- [ ] **Commit:** `feat(cron): new Cron Expression Builder tool`.

### Task F-15: Pomodoro cycle, skip, optional task, shortcuts

**Files:**

- Modify: `src/tools/pomodoro/**` (the existing store, hooks and lib: Step 0 records which of these P4-B already fixed, and only the remainder is implemented), `index.ts` (name "Pomodoro Timer")

**Interfaces:**

- Produces:
  - The setting `longBreakEvery` (default 4)
  - `nextSession(state): 'work' | 'short' | 'long'` (work goes to long when `completedWork % longBreakEvery === 0`)
  - Skip does not increment completed counts or stats
  - `toggle()` works without a current task ("Just focus")
  - `useToolCommands`: Space start/pause, S skip, R reset
  - Session dots (`StatusDot` times N)
- Consumes: A1-2, the existing pomodoro lib.

- [ ] **Tests** (`lib` tests extended):
  - After 4 completed work sessions the next is `long`.
  - Skip leaves `completed` unchanged.
  - Starting with no task runs.
  - The shortcut Space toggles (component).
- [ ] **Commit:** `feat(pomodoro): long break every N sessions, uncounted skips, optional tasks and shortcuts`.

### Task F-16: Pomodoro notifications, sounds, favicon ring, history, presets, focus view

**Files:**

- Create: `src/tools/pomodoro/lib/history.ts`, `history.test.ts`, `lib/favicon-ring.ts`, `components/{HistoryPanel,PresetBar,FocusView}.tsx`, `src/tools/pomodoro/assets/{chime,bell,wood}.mp3` (same-origin, licence: in-house or CC0 with the source recorded in `licences.ts`)

**Interfaces:**

- Produces:
  - Notifications: an opt-in toggle requests `Notification.requestPermission()`; on session end, `new Notification(...)` when the tab is hidden; denied permission gives an inline notice.
  - Sound choice (3) and volume.
  - `drawFaviconRing(progress, theme): string` (data URL from an `OffscreenCanvas` or kit `BitmapCanvas`, set on the `link[rel=icon]` element via a kit `useFavicon` hook added to `src/shared/ui/use-favicon.ts`)
  - `recordSession(history, { date, kind, minutes }, cap = 365)`
  - `HistoryPanel`: weekly bars and a 12-week heatmap (kit `Chart`), CSV export
  - `PresetBar` (25/5, 50/10, 90/20)
  - `FocusView` (kit `FocusOverlay`)
- Consumes: A2-9, A2-15.

- [ ] **Tests:**
  - `recordSession` aggregates per day and caps at 365 days (the oldest dropped).
  - The CSV export header is `date,work_sessions,work_minutes,breaks`.
  - `drawFaviconRing(0.5)` returns a `data:image/png` URL (mocked canvas).
  - The notification is only shown when `document.hidden` (component with mocks).
  - Settings guard (history counts only, allowed with a reason).
- [ ] **Commit:** `feat(pomodoro): notifications, sound choice, favicon progress, history heatmap with CSV, presets and focus view`.

### Task F-17: Part F e2e, visual, gate

**Files:**

- Create: `test/e2e/tools/{calculator,number-converter,unit-converter,date-calculator,epoch-converter}.spec.ts` (P0 calculator spec folded in); `pomodoro.spec.ts` updated

- [ ] **Calculator:** the sheet with variables; units `5 km to mi`; programmer `0xFF + 1` wraps at 8-bit; the grapher shows two roots for `x^2 - 2`; the share link round-trip; keyboard typing still works.
- [ ] **Number:** edit hex `FFFFFFFFFFFFFFFF` and dec shows `18446744073709551615`; invalid input clears the other fields.
- [ ] **Units:** the all-units edit; free text `72F`; the eV value is not 0.
- [ ] **Date:** the Jan 31 + 1 month clamp; business days with a pasted holiday; a zone change.
- [ ] **Epoch:** paste `1700000000000` shows "Detected: Unix milliseconds" and the ISO output; the meeting planner shading.
- [ ] **Pomodoro:** a long break after 4 (fast-forward via `page.clock`); Space toggles.
- [ ] **Visual:** all seven pages in both themes on desktop; Calculator on phone.
- [ ] Run the merge gate.
- [ ] Open the PR "6-F: math and time tools (Calculator & Grapher, Number Base, Units, Date & Time, Epoch & Time Zone, Cron, Pomodoro)".

---

# Part 6-G1: media (Image Compressor, Color, Rive, EXIF, Favicon)

**Branch:** `feat/p6-g1-media`. **Boundary:** the five tool folders and `src/shared/workers/image.worker.ts` plus `image-client.ts`. **Spec:** §8.7, §9.8, §9.9.

### Task G1-1: Image worker pipeline (decode, resize, encode, target size)

**Files:**

- Create: `src/shared/workers/image.worker.ts`, `src/shared/workers/image-client.ts`, `src/shared/lib/image/{pipeline,target-size}.ts` plus tests

**Interfaces:**

- Produces:
  - `ImageJob = { encoding: 'jpeg' | 'webp' | 'png' | 'png-palette' | 'avif'; quality; background; resize?: { maxWidth?; maxHeight?; percent? }; targetBytes?: number }`
  - `processImage(file, job, ctx): Promise<{ bytes; mime; width; height; qualityUsed?; targetMet?: boolean; note?: string }>` (`createImageBitmap(file, { imageOrientation: 'from-image', resizeWidth, resizeHeight, resizeQuality: 'high' })`; `OffscreenCanvas.convertToBlob`; JPEG fills the background first; `png-palette` via the P0 `encodePalettePng`)
  - `searchQuality(encodeAt: (q) => Promise<number>, target, { min = 0.3, max = 0.95, maxIter = 8 }): Promise<{ quality; bytes; met: boolean }>` (binary search)
  - `computeResize(w, h, resize): { width; height }` (keeps aspect, never upscales)
  - `imageClient()` (killable, cancel per job)
- Consumes: P0 png-palette, A1 killable client.

- [ ] **Tests:**
  - `computeResize(4000, 3000, { maxWidth: 1000 })` gives 1000x750; `percent: 50` gives 2000x1500; no upscaling.
  - `searchQuality` with a synthetic monotone size function finds the largest quality under the target in at most 8 iterations; an impossible target gives `met: false` with the minimum quality.
  - The pipeline itself is tested in e2e (a real browser), because `OffscreenCanvas` is not in Node.
- [ ] **Commit:** `feat(image): worker pipeline with high-quality resize, background fill and target-size quality search`.

### Task G1-2: AVIF and the format estimate card

**Files:**

- Create: `src/shared/lib/image/avif.ts`, `src/tools/image-optimizer/components/EstimateCard.tsx`
- Modify: `package.json` (`@jsquash/avif`; licence Apache-2.0 recorded), `image.worker.ts`

**Interfaces:**

- Produces:
  - `encodeAvif(imageData, { quality }): Promise<Uint8Array>` (feature check: `OffscreenCanvas.convertToBlob({ type: 'image/avif' })` first; if the blob type is not `image/avif`, the lazy `@jsquash/avif` WASM, served same-origin through Vite `?url` asset handling)
  - `EstimateCard`: encodes a 512px-max downscaled sample in each format and shows the estimated full-size bytes (scaled by the pixel ratio, labelled "estimate"), highlighting the smallest
- Consumes: G1-1.

- [ ] **Tests:** unit-level: the feature check falls back when the blob type mismatches (mocked).
- [ ] **E2E** (in G1-14): AVIF output decodes in the browser (`createImageBitmap` on the result succeeds) and the request log shows the wasm from the same origin only.
- [ ] **Commit:** `feat(image): AVIF output via canvas or lazy same-origin WASM, and a per-format size estimate`.

### Task G1-3: Image Compressor UI (batch, ZIP, compare, badges, hand-offs)

**Files:**

- Modify: `src/tools/image-optimizer/Tool.tsx` (rewrite; split `components/{BatchTable,PresetPanel,ComparePanel}.tsx`), `index.ts` (name "Image Compressor & Resizer"; keywords "image converter", "compress jpg", "resize image", "webp", "avif"), `settings.ts`

**Interfaces:**

- Produces:
  - Drop many files; one preset (format, quality, background, resize, target size)
  - `BatchTable` (`DataGrid`: name, dimensions before and after, size before and after, saving %, status with per-row progress; concurrency 2; cancel all)
  - A total row
  - Download all as ZIP (`saveZip`) and per row
  - `ComparePanel` (`CompareSlider`, zoom 1:1)
  - The "Metadata removed (EXIF, GPS)" `Badge`
  - "Not smaller" rows offer Keep original
  - Send to: Images to PDF (files), Favicon Generator (first file), EXIF Viewer (originals), Color "Extract palette" (first file)
  - Settings `{ encoding, quality, background, resize, targetKB }`
- Consumes: G1-1, G1-2, A2 kit, A1-3.

- [ ] **Tests** (component, image client mocked): a two-file batch shows the totals; cancel stops pending jobs; Keep original for a not-smaller row; settings guard.
- [ ] **Commit:** `feat(image): batch compression with resize and target size, ZIP download, compare slider and hand-offs`.

### Task G1-4: Color input, outputs, EyeDropper, nearest name; psychology removed

**Files:**

- Modify: `src/tools/color-tester/Tool.tsx` (rewrite; split `components/{ColorInput,FormatList}.tsx`), `src/tools/color-tester/lib/*` (heuristic name and psychology removed), `index.ts` (name "Color & Contrast")

**Interfaces:**

- Produces:
  - `ColorInput` (kit `ColorPicker` plus the universal text field)
  - `FormatList` (hex, rgb, hsl, hwb, lab, lch, oklab and oklch, each with copy)
  - The nearest named colour with its distance ("close to tomato")
  - The psychology tab and the YIQ heuristic are deleted
- Consumes: A1-8, A2-10.

- [ ] **Tests** (component): typing `hsl(120 100% 25%)` gives hex `#008000` and the name `green`; every format copy button writes its string; `grep -rn "psychology" src/tools/color-tester` is empty.
- [ ] **Commit:** `feat(color): universal colour input, every output format, EyeDropper and nearest named colour; remove psychology`.

### Task G1-5: Color contrast checker (WCAG and APCA, suggestion)

**Files:**

- Create: `src/tools/color-tester/components/ContrastPanel.tsx`, `lib/contrast-view.ts`, `lib/contrast-view.test.ts`

**Interfaces:**

- Produces:
  - `contrastSummary(fg, bg): { ratio; levels; apca: number; apcaHint: string }` (the APCA hint: the minimum font size and weight for body text from the APCA lookup at Lc 75, 60, 45 and 30)
  - `ContrastPanel`: foreground and background pickers (with alpha composited), swap, pass/fail `Badge`s for AA/AAA normal, large and UI, the APCA Lc, "Suggest passing foreground" or "background" for a chosen target (calls `suggestPassing`, applies on click), and a live preview card with real text sizes
- Consumes: A1-8.

- [ ] **Tests:**
  - `contrastSummary('#777', '#fff')` gives ratio 4.48 with `normalAA` false and `largeAA` true.
  - A suggestion for `#999` on white with target 4.5 passes.
  - Semi-transparent fg compositing changes the ratio as expected.
- [ ] **Commit:** `feat(color): foreground/background contrast with WCAG 2.2 levels, APCA and nearest passing suggestions`.

### Task G1-6: Color palette scale, harmonies, export, persistence, CVD, share

**Files:**

- Create: `src/tools/color-tester/components/{PalettePanel,CvdToggle}.tsx`, `lib/palette-export.ts`, `lib/palette-export.test.ts`, `settings.ts`, `share.ts`

**Interfaces:**

- Produces:
  - `PalettePanel`: an OKLCH scale 50–950 (hue shift and chroma curve sliders) plus harmonies (complementary, analogous, triadic, split, tetradic) shown as `Swatch`es with copy; named palettes saved in settings
  - `exportPalette(palette, fmt: 'css' | 'tailwind' | 'json' | 'svg'): string` (CSS: `--name-50: #...;`; Tailwind v4: `@theme { --color-name-50: ... }`; JSON tokens; an SVG swatch sheet with labels)
  - `CvdToggle` (`SegmentedControl` none, protan, deutan, tritan, achroma) applies `simulateCvd` to the preview, palette and contrast pair
  - Share `{ v: 1; colors; palette; scale }`; settings `{ palettes, lastColors, scale }`
- Consumes: A1-8, A1-4.

- [ ] **Tests:**
  - The CSS export lines for a 3-step palette.
  - The SVG export parses (DOMParser) and contains 11 `rect`s for a full scale.
  - The share validator.
  - Settings guard (`palettes` are configuration).
- [ ] **Commit:** `feat(color): OKLCH scales and harmonies with CSS, Tailwind, JSON and SVG export; CVD simulation; share`.

### Task G1-7: Color image palette extraction and QR hand-off

**Files:**

- Create: `src/shared/lib/image/kmeans.ts`, `kmeans.test.ts`, `src/tools/color-tester/components/ExtractPanel.tsx`
- Modify: `image.worker.ts` (`extractPalette` handler)

**Interfaces:**

- Produces:
  - `kmeansOklab(pixels: Uint8ClampedArray, k: 3..12, { seed = 1; maxIter = 20 }): { color: Color; share: number }[]` (k-means++ init seeded; pixels downsampled to at most 100k; alpha below 128 skipped)
  - Worker `extractPalette(file, k)`
  - `ExtractPanel` (drop an image or accept the hand-off, a k slider, swatches with share %, "Add to palette")
  - "Use colours in QR" sends `application/vnd.tools.colors+json` `{ fg, bg }` (the darkest and lightest with contrast of at least 4)
- Consumes: G1-1, A1-8.

- [ ] **Tests:**
  - A synthetic two-colour image (60% red, 40% blue) gives k=2 centres within 2/255 and shares of 0.6 and 0.4.
  - Deterministic with the seed.
  - Transparent pixels are ignored.
- [ ] **Commit:** `feat(color): extract palettes from images with seeded OKLab k-means; hand colours to the QR generator`.

### Task G1-8: Rive timeline, info and events

**Files:**

- Modify: `src/tools/rive-animation-player/**` (the restyle onto the P5 `RivePlayer` adapter; split `components/{Timeline,EventsLog,InfoPanel}.tsx`), the `RivePlayer` adapter (additive props: `speed`, `onEvent`, `onAdvance`, `scrubTo(t)`, `artboards()`)

**Interfaces:**

- Produces:
  - `Timeline`: speed (0.25, 0.5, 1, 1.5, 2), a scrub `Slider` (linear animations), loop, ping-pong or once, frame step (`,` and `.`; 1/60 s), time and duration readout
  - `EventsLog` (`VirtualList`: name, properties, time; clear)
  - `InfoPanel` (the real artboard count, names and sizes from the runtime; the fps and version only when the runtime exposes them, otherwise "Not stored in this file", never "Unknown")
- Consumes: the P5 `RivePlayer` adapter.

- [ ] **Tests:** component with a mocked adapter: speed changes call `setSpeed`; `.` steps 1/60 s; events append; the info panel lists 3 artboards from the mock.
- [ ] **Commit:** `feat(rive): playback speed, scrubbing, loop modes, frame stepping, events log and real file info`.

### Task G1-9: Rive stage, export, text runs, data binding, embed snippet

**Files:**

- Create: `src/tools/rive-animation-player/components/{StagePanel,ExportPanel,TextRunsPanel,BindingPanel,EmbedSnippet}.tsx`, `lib/snippet.ts`, `lib/snippet.test.ts`, `lib/record.ts`

**Interfaces:**

- Produces:
  - `StagePanel` (background `ColorPicker` plus checkerboard, `DeviceFrame` presets)
  - `ExportPanel` (PNG of the current frame from the adapter canvas via `toBlob`; WebM recording: `recordCanvas(canvas, seconds, fps = 60): Promise<Blob>` via `MediaRecorder` when `MediaRecorder.isTypeSupported('video/webm')`, else `UNSUPPORTED_FEATURE`)
  - `TextRunsPanel` (lists text runs; edits call the adapter `setTextRunValue`)
  - `BindingPanel` (view-model properties: number, string, boolean, color, trigger, enum, when exposed by the runtime; the panel is hidden otherwise with "This file has no data bindings")
  - `embedSnippet({ runtime: 'react' | 'web'; src; artboard; stateMachine }): string`
- Consumes: G1-8, A2-10, A2-15.

- [ ] **Tests:**
  - `embedSnippet` for React includes `useRive({ src: '...', artboard: 'Main', stateMachines: 'SM', autoplay: true })`.
  - `recordCanvas` with a mocked `MediaRecorder` returns a webm blob after the timer.
  - The unsupported case.
- [ ] **Commit:** `feat(rive): stage backgrounds and device frames, PNG and WebM export, text runs, data binding and embed snippets`.

### Task G1-10: EXIF reading and the grouped view

**Files:**

- Create: `src/tools/exif-tool/{index.ts,Tool.tsx}`, `lib/read.ts`, `lib/read.test.ts`, `lib/risk.ts`, `lib/risk.test.ts`, `components/{MetaTables,RiskSummary}.tsx`
- Modify: `package.json` (`exifr`; licence MIT recorded); `scripts/gen-fixtures.ts` (JPEG with EXIF GPS and serial, PNG with eXIf and tEXt, WebP with EXIF and XMP: built byte-wise in the script from a tiny base image)

**Interfaces:**

- Produces:
  - Manifest `{ id: 'exif-tool', slug: 'exif', category: 'media', alsoIn: ['security'], name: 'EXIF Viewer & Remover', keywords: ['exif', 'metadata', 'gps', 'remove exif', 'photo metadata'], accepts: [{ kinds: ['jpeg', 'png', 'webp'], multiple: true }] }`
  - `readMetadata(bytes): Promise<{ groups: Record<'camera' | 'exposure' | 'image' | 'dates' | 'gps' | 'software' | 'iptc' | 'xmp' | 'icc' | 'other', [string, string][]>; thumbnail?: Uint8Array; gps?: { lat; lon } }>` (lazy `exifr.parse` with all segments; HEIC, AVIF and TIFF read-only)
  - `assessRisk(meta): { level: 'none' | 'low' | 'high'; reasons: string[] }` (GPS gives high; serial numbers or owner names give low)
- Consumes: A2 kit.

- [ ] **Tests** (Node, exifr runs in Node): the JPEG fixture gives GPS lat and lon to 4 decimal places, a serial reason and high risk; the PNG fixture reads the `tEXt` key; the WebP fixture reads EXIF.
- [ ] **Commit:** `feat(exif): new EXIF Viewer with grouped metadata, thumbnail and privacy risk summary`.

### Task G1-11: EXIF lossless stripping, verification, batch ZIP

**Files:**

- Create: `src/tools/exif-tool/lib/strip/{jpeg,png,webp,index}.ts` plus tests, `components/StripPanel.tsx`, `test/e2e/tools/exif-tool.spec.ts`

**Interfaces:**

- Produces:
  - `stripJpeg(bytes, { keepIcc = true; keepOrientation = false }): Uint8Array` (walks the markers; drops APP1 (Exif and XMP), APP13, COM; with `keepOrientation` writes a minimal APP1 TIFF with only tag 0x0112; never touches scan data)
  - `stripPng(bytes, { keepIcc })` (drops `eXIf`, `tEXt`, `zTXt`, `iTXt`, `tIME`; CRCs untouched for the kept chunks)
  - `stripWebp(bytes)` (drops `EXIF` and `XMP ` chunks, clears the VP8X flags, fixes the RIFF size)
  - `stripMetadata(file, opts): Promise<{ bytes; removed: string[] }>` (HEIC, AVIF and TIFF give `UNSUPPORTED_FEATURE` with the Image Compressor hint)
  - Verification: re-read with `readMetadata`; any remaining GPS or EXIF gives `VERIFICATION_FAILED` "Metadata could not be fully removed from <name>", and no download
  - `StripPanel`: options; batch `DataGrid` (name, risks, before and after size, status); ZIP download; Send to Image Compressor
- Consumes: G1-10, `saveZip`.

- [ ] **Tests:**
  - After `stripJpeg` on the fixture, exifr finds no GPS or EXIF, and the decoded pixels are identical (compare jpeg-js decodes of the input and output: byte-equal pixel arrays).
  - `keepOrientation` keeps Orientation 6 only.
  - `stripPng` output is a valid PNG (UPNG decode) without `tEXt`.
  - `stripWebp` gives a valid RIFF size and no EXIF chunk.
  - Verification failure path (mock `readMetadata` to still report GPS) gives `VERIFICATION_FAILED`.
- [ ] **E2E:** drop the three fixtures, strip, download the ZIP, unzip in Node, exifr shows no GPS in any file.
- [ ] **Commit:** `feat(exif): lossless metadata removal for JPEG, PNG and WebP with verification and batch ZIP`.

### Task G1-12: Favicon sources, SVG sanitising, rendering, ICO writer

**Files:**

- Create: `src/tools/favicon-generator/lib/{sanitize-svg,render,ico}.ts` plus tests

**Interfaces:**

- Produces:
  - `sanitizeSvg(text): { svg: string; removed: string[] }` (DOMParser; removes `script`, `foreignObject`, `on*` attributes, `href` or `xlink:href` not starting with `#` or `data:image/`, `<style>` containing `@import` or `url(` with an external URL; reports what was removed)
  - `renderIcon(source: { kind: 'image'; bitmap } | { kind: 'svg'; svg } | { kind: 'text'; text; font: 'Inter' | 'JetBrains Mono'; fg; bg; shape: 'square' | 'rounded' | 'circle'; padding }, size, { maskablePadding?: number }): Promise<Blob>` (a kit-owned offscreen canvas)
  - `writeIco(pngs: { size: 16 | 32 | 48; bytes: Uint8Array }[]): Uint8Array` (ICONDIR plus entries with PNG payloads)
- Consumes: A2 kit, `color/*`.

- [ ] **Tests:**
  - `sanitizeSvg('<svg onload="x()"><script>1</script><image href="https://x/y.png"/><rect/></svg>')` removes 3 items and keeps `rect`.
  - `writeIco` header: reserved 0, type 1, count 3; entry widths 16, 32 and 48; data offsets point at PNG signatures.
- [ ] **Commit:** `feat(favicon): SVG sanitiser, icon renderer for image, SVG and text sources, and an ICO writer`.

### Task G1-13: Favicon outputs, previews, manifest, ZIP

**Files:**

- Create: `src/tools/favicon-generator/{index.ts,Tool.tsx,settings.ts}`, `lib/manifest.ts`, `lib/manifest.test.ts`, `components/{SourcePanel,PreviewPanel}.tsx`, `test/e2e/tools/favicon-generator.spec.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'favicon-generator', slug: 'favicon', category: 'media', alsoIn: ['web'], name: 'Favicon & App Icon Generator', keywords: ['favicon', 'ico', 'apple touch icon', 'pwa icons', 'webmanifest'], accepts: [{ kinds: ['png', 'jpeg', 'webp', 'svg'], multiple: false }] }`
  - `buildManifest({ name; shortName; themeColor; backgroundColor }): string` (`site.webmanifest` with the 192 and 512 icons and the maskable purpose)
  - `htmlSnippet(): string`
  - Outputs exactly as spec §9.9
  - `PreviewPanel` (browser tab mock, iOS home, Android masks via kit shape clipping; actual pixel sizes)
  - ZIP via `saveZip` named `favicons.zip`
  - Settings `{ font, shape, padding, fg, bg, themeColor, backgroundColor }`
- Consumes: G1-12.

- [ ] **Tests:** the manifest JSON validity and its icon entries; the snippet contains `rel="icon"` for `favicon.ico` and `favicon.svg` and `apple-touch-icon`.
- [ ] **E2E:** a text source "T", download the ZIP, unzip in Node: it contains the seven files, `favicon.ico` parses (header check), and `icon-512.png` is 512x512 (UPNG decode).
- [ ] **Commit:** `feat(favicon): new Favicon & App Icon Generator with previews, web manifest, HTML snippet and ZIP`.

### Task G1-14: Part G1 e2e, visual, gate

**Files:**

- Create: `test/e2e/tools/{image-optimizer,color-tester,rive-animation-player}.spec.ts` (the P0 image spec and the legacy colour export test folded in)

- [ ] **Image:** a batch of three files with resize to 800 px wide and WebP gives a ZIP with three WebP files of width 800; target size 50 KB reports met or not; AVIF decodes; the request log is same-origin only; Send to Images to PDF opens `/pdf/images-to-pdf` with the files listed.
- [ ] **Color:** contrast `#777` on white shows "AA large: pass" and "AA normal: fail"; suggest makes it pass; the Tailwind export; extract a palette from a fixture; CVD toggle changes the preview (screenshot diff not required; assert the attribute).
- [ ] **Rive:** a fixture `.riv` plays; speed 2x; the PNG frame download.
- [ ] **Visual:** all five pages in both themes on desktop; Image Compressor and Color on phone.
- [ ] Run the merge gate.
- [ ] Open the PR "6-G1: media tools (Image Compressor & Resizer, Color & Contrast, Rive, EXIF Viewer & Remover, Favicon Generator)".

---

# Part 6-G2: web (HTTP Client, QR Generator, QR Scanner, URL Inspector)

**Branch:** `feat/p6-g2-web`. **Boundary:** the four tool folders, `src/shared/lib/qr-decode.ts`, and the removal of `crypto-js`. **Spec:** §8.8, §9.10.

### Task G2-1: HTTP Client rename, slug and request bug fixes

**Files:**

- Modify: `src/tools/api-request/index.ts` (name "HTTP Client", slug `http-client`, keywords "api request", "rest client", "postman", "curl", "graphql"), `src/tools/api-request/lib/request.ts` (+ tests), the store migration (collections kept)

**Interfaces:**

- Produces:
  - `buildRequest(req: HttpRequest, env: Record<string, string>): { url: string; init: RequestInit; unresolved: string[] }` (query params applied for **every** method; body kinds `none | json | form-data | urlencoded | raw | binary`; form-data built from enabled rows with text and file fields, letting the browser set the boundary)
  - `readResponse(res): Promise<{ status; statusText; headers: [string, string][]; bytes: Uint8Array; text?: string; json?: unknown; size: number; contentType }>` (reads bytes, decodes text by charset, parses JSON only when the content type is JSON **and** parsing succeeds; empty or 204 bodies handled; the real status always kept)
- Consumes: A1-1 (settings migration of `api-request` collections).

- [ ] **Tests:**
  - POST with params gives a URL with the query string.
  - The form-data body contains the text and file parts (inspect the `FormData` entries).
  - urlencoded encoding.
  - `readResponse` on a mocked `Response` with `application/json` and an empty body gives status 204 with no `json` and no error.
  - Invalid JSON with a JSON content type gives `json` undefined plus `text` present and the status kept.
  - The collections migration snapshot is preserved.
- [ ] **Commit:** `fix(http-client): rename, send form-data and params for every method, keep the real status on bad JSON`.

### Task G2-2: HTTP request editor, auth, body kinds, timeout, cURL import

**Files:**

- Create: `src/tools/api-request/lib/curl.ts`, `lib/curl.test.ts`, `lib/auth.ts`, `lib/auth.test.ts`, `components/{RequestBar,ParamsTab,HeadersTab,AuthTab,BodyTab}.tsx`
- Modify: `Tool.tsx` (split)

**Interfaces:**

- Produces:
  - `parseCurl(cmd): HttpRequest` (handles `-X`, `-H`, `-d`, `--data-raw`, `--data-binary`, `--data-urlencode`, `-F`, `-u`, `--url`, `-G`, quoting with single and double quotes and backslash continuations; unknown flags listed in `warnings`)
  - `applyAuth(req, auth: { kind: 'none' } | { kind: 'bearer'; token } | { kind: 'basic'; user; pass } | { kind: 'apikey'; name; value; in: 'header' | 'query' })`
  - The editor uses `KeyValueEditor` for params, headers and form-data; JSON body in `CodeSurface` with markers; GraphQL kept; timeout via `AbortSignal.timeout(ms)` mapped to `TIMEOUT`; Cancel
  - Pasting a cURL command into the URL bar imports it (detected by the `curl ` prefix) with a toast "Imported from cURL"
- Consumes: A2-12, A2-2.

- [ ] **Tests:**
  - `parseCurl("curl -X POST 'https://a.b/c?x=1' -H 'Content-Type: application/json' -d '{\"a\":1}'")` gives method POST, the URL with the param, the header and the JSON body.
  - `-F 'f=@file.txt'` gives a form-data row with a file placeholder and the warning "Choose the file for f".
  - `-u user:pass` gives basic auth.
  - Backslash line continuations.
  - `applyAuth` basic is Base64 of `user:pass` via the UTF-8 encoder.
- [ ] **Commit:** `feat(http-client): request editor with auth helpers, every body kind, timeout and cURL import`.

### Task G2-3: Environments and history

**Files:**

- Create: `src/tools/api-request/lib/env.ts`, `lib/env.test.ts`, `components/{EnvironmentMenu,HistoryPanel}.tsx`, `settings.ts`

**Interfaces:**

- Produces:
  - `interpolate(text, vars): { output; unresolved: string[] }` (`{{name}}`; `{{ name }}` trimmed; escaping `\{{` keeps it literal)
  - Environments `{ id; name; vars: { key; value; secret: boolean }[]; rememberSecrets: boolean }`; secret values are kept in a memory map unless `rememberSecrets` (a warning dialog when enabling)
  - History: the last 50 in memory, an opt-in persisted toggle (request plus status, duration and size, never bodies)
  - Settings `{ environments (secrets stripped unless remembered), activeEnv, historyPersist, timeoutMs }`
- Consumes: A1-1.

- [ ] **Tests:**
  - `interpolate('{{base}}/u/{{ id }}', { base: 'https://x', id: '7' })` gives `https://x/u/7`; a missing var is listed.
  - The settings serialiser strips secret values when `rememberSecrets` is false (assert the stored JSON has an empty value).
  - The history cap is 50.
  - Persisted history entries have no `body` field.
- [ ] **Commit:** `feat(http-client): environments with variables and opt-in secret storage; request history`.

### Task G2-4: Response viewer and CORS explainer

**Files:**

- Create: `src/tools/api-request/components/{ResponsePanel,BodyViews,CorsHelp}.tsx`, `lib/errors.ts`, `lib/errors.test.ts`

**Interfaces:**

- Produces:
  - `classifyFetchError(e, url): ToolError` (`TypeError` on fetch to a cross-origin URL gives `NETWORK` "The browser blocked or could not reach this URL" with `cause`; mixed content when the page is https and the URL is http; an invalid URL gives `INVALID_INPUT`; abort gives `CANCELLED`; a timeout gives `TIMEOUT`)
  - `ResponsePanel`: status with reason phrase, time (total plus a Resource Timing breakdown when available), size, a headers table, and body views Pretty (JSON `CodeTree`, XML pretty, text `CodeSurface`), Raw, Preview (image via kit `Image`, HTML via `SandboxedHtml` with remote resources blocked), Hex (`BytesView`); search in the body; Download body
  - `CorsHelp` (an `ErrorState` with the explanation and recovery steps; it never offers a proxy)
  - The `PrivacyNote` network variant is always visible
- Consumes: A2-11, A2-13, A2-15.

- [ ] **Tests:** `classifyFetchError` cases (cross-origin TypeError gives NETWORK, http from https gives a mixed-content message, a bad URL); component: a JSON response renders the tree; an HTML preview uses `SandboxedHtml` without `https:` in the CSP.
- [ ] **Commit:** `feat(http-client): rich response viewer and an honest CORS and network error explainer`.

### Task G2-5: Code snippets, collections import/export, hand-offs

**Files:**

- Create: `src/tools/api-request/lib/{snippets,postman}.ts` plus tests, `components/{SnippetDialog,CollectionsIO}.tsx`, `test/e2e/tools/api-request.spec.ts`

**Interfaces:**

- Produces:
  - `toSnippet(req, lang: 'curl' | 'fetch' | 'axios' | 'python' | 'httpie' | 'node')` (correct quoting; secrets interpolated only on explicit "Include variable values")
  - `importPostman(json): Collection[]` (v2.1 folders, requests, variables; unsupported features listed)
  - `exportPostman(collections): string`
  - Native JSON import and export
  - Send to: the JSON Viewer (response JSON), Text Diff ("Compare with previous response": the last two responses for the same request), JWT (tokens detected by regex in the body and headers), URL Inspector ("Inspect URL")
  - Accepts `application/vnd.tools.http-request+json` and `application/x-curl`
- Consumes: A1-3, A2-16.

- [ ] **Tests:**
  - The cURL snippet round-trips through `parseCurl` to an equal request.
  - The Python snippet uses `requests.post(url, json=...)` for JSON bodies.
  - The Postman import of a fixture collection gives the folder and request counts.
  - Export then import is equal.
- [ ] **E2E** (requests are route-mocked by Playwright on a test origin):
  1. GET with params shows a 200 JSON tree.
  2. POST form-data reaches the mock with both parts.
  3. A 204 empty body shows status 204, not 0.
  4. A blocked request (route abort) shows the CORS explainer.
  5. Paste a cURL command and the fields fill.
  6. "Open response in JSON Viewer" works.
- [ ] **Commit:** `feat(http-client): code snippets, Postman import/export and hand-offs`.

### Task G2-6: `qr-decode` shared library (BarcodeDetector, zxing-wasm same-origin)

**Files:**

- Create: `src/shared/lib/qr-decode.ts`, `qr-decode.test.ts`
- Modify: `package.json` (`zxing-wasm`; licence MIT recorded)

**Interfaces:**

- Produces:
  - `decodeBarcodes(source: ImageBitmap | ImageData | Blob, { formats?: BarcodeFormat[] }): Promise<{ format; text; bytes?: Uint8Array; box: { x; y; w; h }; corners? }[]>` (`BarcodeDetector` when `getSupportedFormats()` includes the formats; else lazy `zxing-wasm/reader` with `prepareZXingModule({ overrides: { locateFile: (p) => wasmUrl } })` where `wasmUrl` is imported via Vite `?url` so it is same-origin; never the CDN default)
  - `isBarcodeDetectorUsable()`
- Consumes: none.

- [ ] **Tests:**
  - Node unit with a `zxing-wasm` mock: the wasm URL passed to `locateFile` is the imported asset (not containing `jsdelivr` or `http`); BarcodeDetector is preferred when available (mocked `globalThis.BarcodeDetector`); the box mapping.
  - The real decode is covered by G2-7 e2e (Chromium has BarcodeDetector on some platforms only; the test forces the zxing path via a query flag `?decoder=zxing` read by the lib in dev builds only).
- [ ] **Commit:** `feat(shared): barcode decoding via BarcodeDetector or same-origin zxing-wasm`.

### Task G2-7: QR & Barcode Scanner tool

**Files:**

- Create: `src/tools/qr-scanner/{index.ts,Tool.tsx}`, `lib/interpret.ts`, `lib/interpret.test.ts`, `components/{ScanSources,ResultCard}.tsx`, `test/e2e/tools/qr-scanner.spec.ts`

**Interfaces:**

- Produces:
  - Manifest `{ id: 'qr-scanner', slug: 'qr-scan', category: 'web', name: 'QR & Barcode Scanner', keywords: ['qr scanner', 'qr reader', 'barcode scanner', 'scan qr from image'], accepts: [{ kinds: ['png', 'jpeg', 'webp', 'gif'], multiple: false }] }`
  - `interpret(text): { kind: 'url' | 'wifi' | 'vcard' | 'mecard' | 'email' | 'sms' | 'tel' | 'geo' | 'event' | 'crypto' | 'text'; fields: [label, value][]; actions: ('copy' | 'open' | 'url-inspector' | 'text-encoder' | 'vcf' | 'ics')[] }` (WiFi parser honours the escaping; vCard and VEVENT unfolded)
  - Sources: file or drop, paste (the clipboard image), camera (`CameraCapture` at 8 fps; stops on the first hit; Continue resumes)
  - Overlay boxes on the image (kit `OverlayLayer` plus `ShapeLayer`)
  - `ResultCard`: the WiFi password is a `SecretText`; Open link shows the full URL in a confirm `Dialog` first
  - `PrivacyNote`
- Consumes: G2-6, A2-14, A2-15.

- [ ] **Tests:**
  - `interpret('WIFI:T:WPA;S:my\\;net;P:p\\"w;;')` gives SSID `my;net` and password `p"w`.
  - The vCard fields.
  - `bitcoin:bc1...?amount=0.1` gives crypto with an amount.
  - `BEGIN:VEVENT` gives event fields.
- [ ] **E2E:**
  1. Upload a QR fixture PNG generated by the QR generator at test time (or committed under `test/fixtures/qr-url.png`) with `?decoder=zxing` and see the URL result.
  2. The request log has only same-origin requests (the wasm is local).
  3. A WiFi QR keeps the password masked until revealed.
- [ ] **Commit:** `feat(qr-scanner): new QR & Barcode Scanner for images, clipboard and camera with smart actions`.

### Task G2-8: QR generator payloads; encryption, mask and remote logo removed; crypto-js removed

**Files:**

- Modify: `src/tools/qr-code-generator/lib/qr-content.ts` (+ tests; rewrite into `lib/payloads/{url,wifi,vcard,mecard,email,sms,tel,geo,event,crypto,app}.ts`), `Tool.tsx`, `hooks/*`, `package.json` (remove `crypto-js`, `@types/crypto-js` once `grep -rn "crypto-js" src` is empty)

**Interfaces:**

- Produces:
  - `buildPayload(type, fields): string` per type:
    - WiFi: `WIFI:T:WPA;S:<esc>;P:<esc>;H:true;;` with `\ ; , : "` escaped; T is `WPA`/`WEP`/`nopass`, and WPA3 is written as `T:WPA` plus the `R:` hint when supported
    - vCard 3.0: `BEGIN:VCARD`, `VERSION:3.0`, `N:last;first;;;`, `FN:`, `TEL`, `EMAIL`, `ORG`, `URL`, `ADR`, with escaping `\, \; \\` and newlines as `\n`
    - MeCard
    - `mailto:` with an encoded subject and body
    - `SMSTO:`
    - `tel:`
    - `geo:lat,lon`
    - event: `BEGIN:VEVENT` with UTC `DTSTART`/`DTEND` `YYYYMMDDTHHMMSSZ`
    - crypto: the table `{ BTC: 'bitcoin', ETH: 'ethereum', LTC: 'litecoin', DOGE: 'dogecoin', BCH: 'bitcoincash' }` with BIP-21 `amount`, `label` and `message` query; Ethereum `ethereum:<address>@<chainId>?value=<wei>`
    - app-store link
  - The encryption UI, the crypto-js usage and the mask input are deleted; the remote logo URL field is replaced in G2-9.
- Consumes: none.

- [ ] **Tests:**
  - The WiFi escaping table.
  - A vCard with a comma in the org is escaped, and the `N` and `FN` lines are present.
  - `bitcoin:` (not `btc:`) with the amount.
  - Ethereum with the chain id.
  - The VEVENT UTC format.
  - `grep -rn "crypto-js\|encrypt" src/tools/qr-code-generator` is empty.
  - `pnpm why crypto-js` reports nothing.
- [ ] **Commit:** `fix(qr): correct payloads for wallets, WiFi and vCard, more payload types; remove encryption, mask input and crypto-js`.

### Task G2-9: QR generator style, local logo, exports, scannability, batch

**Files:**

- Create: `src/tools/qr-code-generator/lib/scannability.ts`, `lib/scannability.test.ts`, `lib/batch.ts`, `lib/batch.test.ts`, `components/{StylePanel,ExportPanel,ScanCheck,BatchPanel}.tsx`, `settings.ts`, `share.ts`

**Interfaces:**

- Produces:
  - `StylePanel` (fg and bg `ColorPicker`, size, ECC, margin, a **local** logo file read as a data URL with size and excavate; accepts the colours hand-off)
  - `ExportPanel` (PNG at a size preset, including print at 300 dpi with a physical size in mm; SVG; Copy image via `ClipboardItem`; the render mode is independent of the export)
  - `assessScannability({ fg, bg, ecc, margin, logoFraction }): { warnings: string[] }` (contrast below 4:1; inverted when fg is lighter than bg; margin below 4 modules; logo area beyond the ECC capacity: L 7%, M 15%, Q 25%, H 30%, with a 0.8 safety factor)
  - `ScanCheck`: renders to an image, decodes with `qr-decode`, and shows "Decodes correctly" or "Could not decode: <reason>"
  - `batchFromCsv(text, column, { format: 'png' | 'svg'; nameColumn }): Promise<{ name; bytes }[]>` (a ZIP via `saveZip`)
  - Share `{ v: 1; type; fields; style }` (the `ShareButton` hides for types with a password field)
  - Settings (style)
- Consumes: G2-6, G2-8, A1-8, A2-10, `QrCode` adapter.

- [ ] **Tests:**
  - `assessScannability` with fg `#777` on `#888` warns about contrast; an inverted pair warns; a logo of 0.3 with ECC M warns.
  - `batchFromCsv` makes 3 files named from the column with unique names.
  - The share validator refuses WiFi types (the hook is never called for them).
- [ ] **Commit:** `feat(qr): local logo, PNG/SVG/clipboard export, scannability checks with self-decode, CSV batch and share`.

### Task G2-10: URL Inspector anatomy, builder and extras

**Files:**

- Create: `src/tools/url-parser/lib/{model,build,idn}.ts` plus tests, `components/{AnatomyStrip,PartsEditor,ParamsEditor}.tsx`
- Modify: `Tool.tsx` (rewrite; the two duplicate tabs are removed), `index.ts` (name "URL Inspector & Builder")

**Interfaces:**

- Produces:
  - `parseUrlModel(input, base?): UrlModel` (`{ protocol; username; password; hostname; port; pathname; params: KeyValueRow[]; hash; origin; defaultPort: boolean; hostnameUnicode; hostnamePunycode; isRelative }`; errors give `INVALID_INPUT` "Not a valid URL; add a base URL for relative paths")
  - `buildUrl(model): string` (correct encoding for each part; params preserve order and duplicates; disabled rows are omitted)
  - `toUnicodeHost`/`toAsciiHost` (in-house punycode from E-7, or `URL` for ASCII)
  - `AnatomyStrip` (coloured segments, click to copy, keyed by part id)
  - `PartsEditor` (each part editable)
  - `ParamsEditor` (`KeyValueEditor`; copy state keyed by row id)
- Consumes: A2-12, E-7 punycode (if E has not merged, G2 imports from `src/tools/url-encoder-decoder/lib/codecs/punycode.ts` after E merges; otherwise it uses `new URL()` for ASCII conversion and a minimal decoder added at `src/shared/lib/punycode.ts`. Whoever merges second moves the codec to `src/shared/lib/punycode.ts`.)

- [ ] **Tests:**
  - `parseUrlModel('https://user:pw@münchen.de:443/a b?x=1&x=2#h')` gives `hostnamePunycode` `xn--mnchen-3ya.de`, `defaultPort` true, two `x` params in order, and a decoded path `/a b`.
  - `buildUrl` round-trips and encodes the space as `%20`.
  - A relative input with a base resolves.
  - Disabled params are omitted.
- [ ] **Commit:** `feat(url-inspector): editable URL builder with an anatomy strip, ordered params, IDN and base URLs`.

### Task G2-11: URL Inspector domain split, Clean URL, actions, share

**Files:**

- Create: `src/tools/url-parser/lib/{domain,clean}.ts` plus tests, `components/{DomainPanel,CleanPanel}.tsx`, `settings.ts`, `share.ts`, `test/e2e/tools/url-parser.spec.ts`
- Modify: `package.json` (`tldts`; the licence note in `licences.ts` mentions the PSL under MPL-2.0)

**Interfaces:**

- Produces:
  - `domainParts(hostname): Promise<{ subdomain; domain; publicSuffix; isIcann: boolean } | null>` (lazy `tldts`)
  - `DEFAULT_TRACKING = ['utm_*', 'fbclid', 'gclid', 'dclid', 'msclkid', 'mc_eid', 'igshid', 'yclid', '_hsenc', '_hsmi', 'ref_src']`
  - `cleanUrl(url, patterns): { url; removed: string[] }` (`*` suffix wildcard)
  - Actions: Send to HTTP Client (`application/vnd.tools.http-request+json`), Make QR (`text/uri-list`), Open in Text Encoder
  - Share `{ v: 1; url }` (the password is stripped; a warning `Alert` lists secret-looking query keys before sharing)
  - Settings `{ tracking, base }`
- Consumes: A1-3, A1-4, A2-16.

- [ ] **Tests:**
  - `domainParts('a.b.example.co.uk')` gives subdomain `a.b`, domain `example.co.uk`, suffix `co.uk`.
  - `cleanUrl('https://x/?utm_source=a&id=1&fbclid=2', DEFAULT_TRACKING)` gives `https://x/?id=1` with removed `['utm_source', 'fbclid']`.
  - The share encoder strips the userinfo password.
  - Secret-key detection flags `token` and `sig`.
- [ ] **E2E:**
  1. Paste a URL and edit a param; the URL rebuilds.
  2. Clean URL removes `utm_*`.
  3. Send to HTTP Client prefills the GET with params (the HTTP Client tasks are in the same Part).
  4. Make QR opens the generator with the URL.
  5. The share link round-trip.
- [ ] **Commit:** `feat(url-inspector): registrable domain split, Clean URL, actions to HTTP Client, QR and encoder, share`.

### Task G2-12: Part G2 e2e, visual, gate

**Files:**

- Create: `test/e2e/tools/qr-code-generator.spec.ts` (the legacy QR download test folded in)

- [ ] **QR generator:** a WiFi payload with `;` in the SSID decodes back via the self-check ("Decodes correctly"); the share button is hidden for WiFi; a CSV batch ZIP with 3 PNGs; a local logo upload works with no network request.
- [ ] **Scanner:** the no-network assertion (wasm same-origin).
- [ ] **HTTP Client:** `/web/api-request` gives NotFound whose search finds "HTTP Client" (clean break; keywords).
- [ ] **Visual:** all four pages in both themes on desktop; HTTP Client on phone.
- [ ] Run the merge gate.
- [ ] Open the PR "6-G2: web tools (HTTP Client, QR Code Generator, QR & Barcode Scanner, URL Inspector & Builder); crypto-js removed".

---

# Part 6-H: finish (workflows, no-network suite, dependency sweep, visual matrix, docs)

**Branch:** `feat/p6-h-finish` (after every Part above). **Boundary:** tests, docs, and cleanup only. Behaviour fixes found here go in as small commits with tests.

### Task H-1: Workflow matrix e2e

**Files:**

- Create: `test/e2e/workflows.spec.ts`
- Modify: every `test.skip` added for cross-Part hand-offs in B-12, C-17, D-12 and D-13 (remove the skips)

- [ ] One test per row of spec §10. Each starts at the source tool, triggers the Send to action by its accessible name, and asserts the target route plus the filled state (for example: Mock Data, then "Open in CSV Viewer", then the grid shows n rows; Password, then "Use for PDF Protect", then the protect quick task's password field is filled).
- [ ] Mod+K "Send result to…" commands exist for every source (assert the command palette lists them).
- [ ] **Commit:** `test(workflows): end-to-end coverage of every cross-tool hand-off`.

### Task H-2: No-network suite and a PR-blocking long-task gate

**Files:**

- Create: `test/e2e/no-network.spec.ts`
- Modify: `playwright.config.ts` (a `perf` project kept; long-task assertions in the B, C and D large-input tests flipped from logged to failing)

- [ ] Visit every registered tool route (from the registry route helper), exercise its sample action (load sample or generate), and assert every request URL is same-origin. Exclusions are explicit:
  - HTTP Client is skipped;
  - Markdown asserts blocked by default and allowed only after the opt-in.
- [ ] The long-task gate: the large-input flows fail on any main-thread task over 100 ms (except the documented page-load warm-up).
- [ ] **Commit:** `test(e2e): no third-party requests from any tool, and long-task budgets enforced`.

### Task H-3: Dependency sweep, licence report, bundle budget test

**Files:**

- Create: `test/bundle-budget.test.ts`, `scripts/licence-report.ts`
- Modify: `package.json` (any leftover removals), `src/app/licences.ts`

- [ ] Assert `package.json` no longer contains `plotly.js`, `react-plotly.js`, `@xyflow/react`, `dagre`, `@uiw/react-textarea-code-editor`, `rehype-prism-plus`, `rehype-rewrite`, `crypto-js`, `lodash` or their `@types`.
- [ ] `scripts/licence-report.ts` reads `pnpm licenses list --json` and fails on any licence outside MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, OFL-1.1, CC-BY-3.0 (EFF data) and MPL-2.0 (the PSL data in tldts, explicitly allowed for that package only).
- [ ] `test/bundle-budget.test.ts` reads `dist/.vite/manifest.json`. Each tool route entry chunk is at most 120 KB gzip; JSON viewer at most 150 KB; Prettier, zxcvbn, exifr, `@jsquash/avif` and zxing-wasm appear only in lazy chunks, never in an entry's static imports.
- [ ] **Commit:** `chore(deps): verify removals, licence allow-list and bundle budgets`.

### Task H-4: Full visual matrix and axe sweep

- [ ] Run `pnpm test:visual` across every tool page: both themes at desktop, plus phone for the flagship list in spec §12.5. Fill any missing baselines and review each image for glyphs (R3).
- [ ] Run axe on every tool page: 0 serious or critical. Fix findings in small commits with component tests.
- [ ] **Commit:** `test(visual): complete phase-6 visual baselines and accessibility sweep`.

### Task H-5: Docs, share allow-list equality, dead code

**Files:**

- Modify: `README.md` (tool list, 32 non-PDF tools, privacy and network notes for HTTP Client and the Markdown opt-in), `docs/superpowers/specs/2026-10-01-pdf-workspace-and-redesign-design.md` (criterion 6: "30" becomes "32"), `test/share-allowlist.test.ts` (subset becomes equality), the licences dialog completeness test (every `licences.ts` entry rendered)

- [ ] Run the dead-code sweep: remove unused exports via `pnpm exec ts-prune` (devDependency, MIT) or a manual grep, and record the list in the PR.
- [ ] **Commit:** `docs: phase-6 tool list and counts; enforce the share allow-list exactly; remove dead code`.

### Task H-6: Final verification and PR

- [ ] Run the merge gate in full (steps 1–6).
- [ ] Check every spec §1 success criterion with evidence (a test name or a measurement).
- [ ] Open the PR "6-H: phase-6 finish (workflows, no-network suite, budgets, visual matrix, docs)".
- [ ] Update the controller log with the phase-6 completion notes.
