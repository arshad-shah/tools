# Phase 4 — App-wide Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all 21 legacy tools onto the shared foundation from phase 1. That covers the shared lib, notify, `useJob`, `createToolStore` and the kit. Pomodoro moves from Redux to store-kit and the Redux packages are removed. Tool folders are renamed to kebab-case with `Tool.tsx` entries, types move next to their tools, CSS modules and inline styles are replaced by kit + Tailwind, files over ~400 lines are split, and dead code and the phase-1 shims are deleted. Every tool keeps its id, URL and behaviour.

**Architecture:**

- Tools import only from `@/shared/ui`, `@/shared/lib/*`, `@/shared/state/*`, `@/app/tool` and their own folder.
- Every tool folder looks like `src/tools/<id>/{index.ts, Tool.tsx, types.ts?, store.ts?, components/, hooks/, lib/}`.
- Pure logic lives in `lib/*.ts` and has unit tests. Components stay thin.
- Persisted tool data goes through `createToolStore`. A new `legacy` option imports each tool's old localStorage key once, so existing users keep their data.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind v4 kit, @arshad-shah/store-kit + zustand 5, sonner (single global Toaster), fflate, Vitest 5 + Testing Library, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-10-01-pdf-suite-and-modular-architecture-design.md`. The relevant sections are §3.1 (layout and naming), §3.3 (shared lib, "Replaces" column), §3.4 (state, Redux removal), §8 item 4 (phase 4 scope) and §9 (dependencies to remove). The 2026-07-15 terminal-UI spec covers AnimatedBackground and dead-code cleanup.

**Phase-1 controller log:** `.superpowers/sdd/2026-10-01-phase-1-foundation/progress.md`. Rulings R1–R19 still apply. In particular:

- R1: tests may import `test/fixtures/*` relatively.
- R2: `typecheck` = `tsc -b`.
- R13: keyboard model.

## Global Constraints

**Platform**

- Fully client-side. No document bytes leave the browser.
  - The **API Request** tool sends the user's own HTTP requests by design; that is its function and it is unchanged.
  - The **Random Data Generator** emits `randomuser.me` avatar URLs as data; nothing is fetched.
- Stay MIT-compatible. Never add `mupdf`, Ghostscript, Comlink, `@dnd-kit` or `cynosure-*`.

**Behaviour**

- Every tool keeps its **id and URL**:
  - `api-request`, `base64-converter`, `calculator`, `color-tester`, `csv-viewer`, `date-calculator`, `hash-generator`
  - `image-optimizer`, `json-and-xml-viewer`, `jwt-decode`, `log-parser`, `number-converter`, `password-generator`, `pomodoro`
  - `qr-code-generator`, `random-data-generator`, `regex-tester`, `rive-animation-player`, `text-diff-checker`, `unit-converter`, `url-encoder-decoder`, `url-parser`
  - plus the PDF tools and the disabled `pdf-compressor`.
- Every tool keeps its **behaviour**.
  - The only allowed deviations are listed under **Approved behaviour changes** below. An executor who finds another bug notes it in the task report and does not fix it silently.
  - The exception: a bug that makes a smoke/e2e test fail (console error or page error) must be fixed. Report the fix.
- Existing persisted user data survives:
  - Pomodoro: redux-persist key `persist:pomodoro-store`
  - API Request: `apiTesterCollections`
  - Calculator: `calcHistory`, `savedCalculations`, `memories`
  - Dashboard: `favoriteTools`
- No silent failures. User-visible failures go through `notify.error(...)` or an inline kit `Alert`, never `window.alert` or a bare `console.error`.

**Code conventions**

- Use `@/` imports. Relative imports never climb out of the tool folder: `./x` and `../lib/x` inside the tool are fine, `../../` is not.
- Folder names:
  - Tool folders are kebab-case and equal the tool id.
  - Entry file is `Tool.tsx`.
  - Sub-folders: `components/` (PascalCase `.tsx`), `hooks/` (`useX.ts`/`.tsx`), `lib/` (kebab-case pure `.ts`).
  - Types go in `types.ts`, the store in `store.ts`.
- Non-JSX files use `.ts`.
- All UI comes from the kit (`@/shared/ui`) plus Tailwind theme tokens: `bg-surface`, `bg-surface-subtle`, `bg-surface-strong`, `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-line`, `border-line-strong`, `text-success`, `text-info`, `text-warning`, `text-danger`, `text-accent`, `bg-canvas`, `font-mono`, …
  - No CSS modules.
  - No JS style objects.
  - Inline `style` only for **data-driven** values: user-picked colours, computed depth indents, chart geometry. Each such `style` gets a one-line `// data-driven: …` comment.
- Never hand-roll download anchors, `navigator.clipboard`, `FileReader`, size formatting, per-tool toasts or raw `<input type="file">`. Use `saveBlob`/`saveZip`/`deriveFilename`, `useClipboard`/`copyText`/`readClipboardText`, `loadFile`/`readBytes`/`loadTextFile`, `formatBytes`, `notify`, and the kit's `FileUpload`/`FilePicker`.
- Ids come from `newId()` (`@/shared/lib/id`), never `crypto.randomUUID()` or `Date.now().toString()`.

**Concurrency note (read at every task start)**

- Phase-1 final-review fixes were being committed on this branch while this plan was written, so shared signatures may have shifted slightly.
- This plan names consumers by **exported name**:
  - `saveBlob`, `deriveFilename`, `saveZip`
  - `useClipboard`, `copyText`
  - `loadFile`, `readBytes`
  - `formatBytes`, `formatSizeChange`
  - `notify`
  - `useJob`, `createToolStore`
  - `toToolError`, `ToolError`
  - `newId`
- **Step 0 of every task:** open the shared module(s) the task uses and confirm the signature. If it differs from this plan, adapt the call sites to the real signature and note the difference in the task report. Do not change shared modules except in the tasks that say so (Tasks 2, 3, 19).

**Windows / git**

- The repo lives on a case-insensitive filesystem. A rename that only changes case (`Calculator` → `calculator`) must go through a temporary name:

  ```bash
  git mv src/tools/Calculator src/tools/calculator-tmp && git mv src/tools/calculator-tmp src/tools/calculator
  ```

- Package manager: `pnpm` 10.11.0, never npm.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `--no-verify`.

**Merge gate (every PR)**

Run, in order:

1. `pnpm lint` (0 errors; 0 warnings in files the PR touched)
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. `pnpm test:e2e`, **three consecutive green runs**

Investigate any flake; never add retries or sleeps (phase-1 note N3).

## PR boundaries

| PR       | Branch (cut from `master` after the previous PR merges) | Tasks | Theme                                                                                                                     |
| -------- | ------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| **PR A** | `feat/phase4-shared-lib`                                | 1–10  | Smoke e2e first, shared-lib additions, every legacy tool on download/clipboard/files/format/notify/useJob/createToolStore |
| **PR B** | `feat/phase4-pomodoro`                                  | 11–14 | Pomodoro → store-kit with legacy migration; Redux packages removed                                                        |
| **PR C** | `feat/phase4-naming`                                    | 15–18 | Kebab-case folders + `Tool.tsx`; registry folder=id check; types co-located; `src/types/` and phase-1 shims deleted       |
| **PR D** | `feat/phase4-styling`                                   | 19–22 | `cn` → `@/shared/lib/cn`; dead code; CSS modules, inline styles and JS style tokens → kit + Tailwind                      |
| **PR E** | `feat/phase4-splits`                                    | 23–34 | Split files > ~400 lines; derived-state refactors; lint warnings → 0 and `--max-warnings 0`; phase verification           |

Ordering:

- PR A must land before PR C, because PR C deletes the shims that PR A stops using.
- PR C must land before PR D and PR E, because they use the new paths.
- PR B depends on PR A only through Task 3 (`createToolStore` `legacy`). Land it after PR A.

**Paths in PR A and PR B use the legacy folder names** (e.g. `src/tools/ColorTester/ColorTester.tsx`). **PR C onwards uses the new names** (e.g. `src/tools/color-tester/Tool.tsx`). Line numbers are from the audit at plan time (HEAD `35b7e2e`); re-locate by the quoted code if they have drifted.

## Review Focus

1. **Existing users keep their data.** Each legacy key is imported exactly once into the store-kit key `kit:store:tool:<id>`, and the legacy key is removed afterwards. Malformed legacy JSON never crashes a tool; it falls back to defaults and warns. Covered by:
   - Task 3: `createToolStore` legacy tests.
   - Task 12: pomodoro redux-persist parse tests.
   - Task 13: e2e that seeds `persist:pomodoro-store` and checks the UI.
   - Task 8: api-request tests.
   - Task 9: calculator tests.
2. **Pomodoro timer parity.** The timer covers start/pause/reset/skip, auto-start breaks and pomodoros, completion stats, task progress, day rollover, the sound toggle, and resuming after reload. Covered by Task 11's `lib/session.test.ts` table and the Task 13 e2e.
3. **No tool regresses after renames and splits.** The smoke e2e (Task 1) visits every enabled tool and fails on any console error, page error or error-boundary render. Targeted flows check downloads and uploads (Tasks 4, 6, 7). It runs in every PR.
4. **No hand-rolled browser plumbing remains.** The Task 34 grep gate must return nothing for:
   - `createElement('a')`
   - `navigator.clipboard`
   - `FileReader`
   - `formatFileSize`
   - `from 'sonner'` outside `src/app` and `src/shared`
   - `type="file"` outside `src/shared/ui`
   - `\.module\.css`
   - `redux`
   - `components/ui`
   - `types/`
5. **Renames on Windows.** Renames are case-safe (two-step `git mv`). `git log --follow` still finds history. The registry rejects a folder whose name differs from its manifest id (Task 16).

## Approved behaviour changes

These are the only intended behaviour differences. Each is a fix of an audited defect or a direct consequence of adopting the shared lib.

| #   | Tool                                                                                                           | Before                                                                                                                                                                                                                                                                                        | After                                                                                                                                                                                                           | Why                                                     |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| B1  | all exports                                                                                                    | Hand-rolled anchors; LogParser used a never-revoked data URI and RandomData revoked after 100 ms                                                                                                                                                                                              | `saveBlob` (always revoked, after 30 s)                                                                                                                                                                         | spec §3.3                                               |
| B2  | image-optimizer, csv-viewer                                                                                    | Fixed names `converted-image.<fmt>` / `exported_<base>.csv`                                                                                                                                                                                                                                   | `deriveFilename(input, 'optimized', fmt)` → `photo.optimized.jpeg`; `deriveFilename(input, 'exported', 'csv')` → `data.exported.csv`                                                                            | spec §3.3 `deriveFilename`                              |
| B3  | text-diff-checker, rive-animation-player, api-request                                                          | In-page alert banner / per-tool sonner `<Toaster/>` / `window.alert`                                                                                                                                                                                                                          | `notify.success/info/error` on the global Toaster                                                                                                                                                               | spec §3.3 `notify`                                      |
| B4  | color-tester, number-converter, url-parser, url-encoder-decoder, regex-tester, json viewer, password-generator | Copy and paste failures ignored or only logged                                                                                                                                                                                                                                                | `useClipboard`/`readClipboardText` report failures via `notify.error`                                                                                                                                           | spec §6 no silent failures                              |
| B5  | pomodoro                                                                                                       | A completed work session was counted by both the Redux listener and the component, the sound could play twice, task progress also advanced when a **break** finished, auto-start never restarted the worker, and the streak never incremented (`lastUpdate` was rewritten in the same action) | One count per completed or skipped work session, one sound, task progress only for work sessions, auto-start actually counts down, streak +1 on the first pomodoro of a day and −1 on rollover after a zero day | Fix of audited defects (Task 11 notes)                  |
| B6  | api-request                                                                                                    | Deleting a request only searched the first collection                                                                                                                                                                                                                                         | Deletes the request wherever it is in the tree                                                                                                                                                                  | Fix of audited defect                                   |
| B7  | number-converter                                                                                               | Invalid input showed the error **and** kept stale results                                                                                                                                                                                                                                     | Error shown, results cleared                                                                                                                                                                                    | Consequence of deriving state with `useMemo` (lint fix) |
| B8  | log-parser                                                                                                     | A hidden `darkMode` state toggled `<html class="dark">` from `localStorage.darkMode`/`prefers-color-scheme`                                                                                                                                                                                   | Removed. The app is dark-only (2026-07-15 spec) and no UI exposed it                                                                                                                                            | Dead code with a global side effect                     |
| B9  | dashboard                                                                                                      | Grid backdrop rendered by `AnimatedBackground.tsx` with inline styles                                                                                                                                                                                                                         | Same visuals via a `bg-terminal-grid` utility in `src/theme/terminal.css` on the dashboard root; component deleted                                                                                              | 2026-07-15 spec; no inline styles                       |
| B10 | jwt-decode, log-parser                                                                                         | One shared `copied` flag, so every Copy button (JWT header/payload/signature/token; every log row) showed "Copied" at once                                                                                                                                                                    | Keyed feedback: only the button pressed shows "Copied"                                                                                                                                                          | Consequence of keyed `useClipboard` (T2)                |

---

## File Structure (phase 4 end state)

```
src/
  app/            App.tsx · registry.ts (+ folder=id check) · tool.ts · Dashboard.tsx · ToolLayout.tsx · ErrorBoundary.tsx · ToolErrorBoundary.tsx · Footer.tsx · footerUtils.ts · NotFound.tsx
  shared/
    lib/          cn.ts · clipboard.ts · download.ts · errors.ts · files.ts · format.ts · id.ts · notify.ts · worker-rpc.ts · *.test.ts(x)
    state/        createToolStore.ts (+ legacy import) · useJob.ts · *.test.ts(x)
    ui/           kit (+ FilePicker in file-upload.tsx; buttonVariants in button-variants.ts, badgeVariants in badge-variants.ts)
  theme/terminal.css   (+ bg-terminal-grid utility)
  pdf/            unchanged except the cn import path
  tools/
    api-request/            index.ts Tool.tsx types.ts store.ts components/{CollectionTree,RequestForm,KeyValueEditor,ResponsePanel,SaveRequestDialog,NewCollectionDialog}.tsx lib/{request,collections}.ts (+tests)
    base64-converter/       index.ts Tool.tsx lib/base64.ts (+test)
    calculator/             index.ts Tool.tsx types.ts store.ts components/{CalcKey,Keypad,HistoryPanel,MemoryPanel,GraphDisplay}.tsx hooks/{useCalculator,useCalculatorKeyboard}.ts lib/{scientific,expression,display}.ts (+tests)
    color-tester/           index.ts Tool.tsx types.ts components/{Swatch,PreviewTab,AccessibilityTab,HarmonyTab,PsychologyTab,SavedPalette}.tsx lib/{color-convert,color-analysis,palette}.ts (+tests)
    csv-viewer/             index.ts Tool.tsx types.ts components/{LineChart,DataTable,StatisticsPanel,ColumnControls}.tsx lib/{parse,stats,table}.ts (+tests)
    date-calculator/        index.ts Tool.tsx
    hash-generator/         index.ts Tool.tsx lib/hash.ts (+test)
    image-optimizer/        index.ts Tool.tsx lib/convert.ts (+test)
    json-and-xml-viewer/    index.ts Tool.tsx components/{TreeView,DataNode,EditorPane,ViewerPane}.tsx components/treeview/{DataFlow,CustomNode}.tsx components/treeview/{layoutManager,useDataProcessor,types}.ts lib/xml.ts (+test)
    jwt-decode/             index.ts Tool.tsx types.ts components/{ClaimCard,ValueRenderer,HeaderSection,PayloadSection,SignatureSection}.tsx hooks/useJwtDecoder.ts lib/{claims.ts,claim-icon.tsx,categorize.ts} (+tests)
    log-parser/             index.ts Tool.tsx types.ts components/{LogRow,InputPanel,FilterBar}.tsx hooks/useLogParser.ts lib/{parse,filter,levels}.ts (+tests)
    number-converter/       index.ts Tool.tsx lib/convert.ts (+test)
    password-generator/     index.ts Tool.tsx types.ts components/{HighlightedPassword,CharLegend,CharacterTypeOption,PasswordDisplay}.tsx lib/{secure-random,strength}.ts (+tests)
    pomodoro/               index.ts Tool.tsx types.ts store.ts assets/complete.wav components/{ModeSelector,TimerCard,CurrentTaskCard,TaskList,TaskRow,StatsPanel,SettingsPanel,MenuDrawer}.tsx hooks/useTimerWorker.ts lib/{session,legacy,time}.ts (+tests) workers/timer.worker.ts
    qr-code-generator/      index.ts Tool.tsx types.ts components/{TextUrlForm,ContactForm,WifiForm,CryptoForm,StylePanel,QrPreview}.tsx hooks/useQrCode.ts lib/{qr-content.ts,qr-export.ts,options.tsx} (+tests)
    random-data-generator/  index.ts Tool.tsx types.ts components/{FieldEditor,DataPreview}.tsx lib/{field-types,generate,schema}.ts (+tests)
    regex-tester/           index.ts Tool.tsx types.ts components/{MatchItem,LivePreview,FlagToggles,TemplatePicker}.tsx lib/{match,templates,flags}.ts (+tests)
    rive-animation-player/  index.ts Tool.tsx types.ts components/{Stage,PlaybackControls,LayoutControls,InputsPanel,DebugLog,FileInfo}.tsx hooks/useRivePlayer.ts lib/{rive-file,layout}.ts (+tests)
    text-diff-checker/      index.ts Tool.tsx types.ts components/{DiffTextArea,DiffToolbar,DiffResults}.tsx hooks/{useDiffSettings,useIntelligentDiff}.ts lib/export.ts (+test)
    unit-converter/         index.ts Tool.tsx types.ts components/{ConversionCard,HistoryList}.tsx lib/{categories.tsx,convert.ts} (+tests)
    url-encoder-decoder/    index.ts Tool.tsx lib/codec.ts (+test)
    url-parser/             index.ts Tool.tsx lib/parse-url.ts (+test)
    pdf-compressor/         renamed from PdfCompressor ONLY if phase 3 has not already replaced it; types co-located; otherwise untouched
    pdf-merger/ pdf-splitter/ pdf-organize/   unchanged
test/
  e2e/  tool-routes.ts · smoke.spec.ts (all tools) · legacy-tools.spec.ts · pomodoro.spec.ts · global-setup.ts (warms every route)
```

Deleted by the end of phase 4:

- `src/components/` entirely: `Loadingfallback.tsx` and `ui/index.ts` (shim).
- `src/hooks/` entirely: `useClipboard.tsx` (shim) and `useLocalStorage.hook.tsx`.
- `src/types/` entirely, including the shim `ToolTypes.ts`.
- `src/lib/utils.ts` (moved to `src/shared/lib/cn.ts`).
- `src/app/AnimatedBackground.tsx`.
- CSS modules:
  - `regexTester/LivePreview.module.css`
  - `JsonViewer/components/DataNode.module.css`
  - `JsonViewer/components/treeview/CustomNode.module.css`
- Dead JSON-viewer files: `JsonViewer/hooks/{useLineInteractions,useLineTracking,useScrollSync,useSyntaxHighlighting}.tsx` and `JsonViewer/globalStyles.tsx` (zero importers).
- Duplicate or replaced hooks:
  - `JWTDecoder/hooks/useClipboard.tsx` (zero importers)
  - `TextDiffChecker/hooks/useNotification.tsx`
  - LogParser's `useCopyToClipboard`, plus `exportLogsAsJson` and `copyLogsToClipboard` (zero importers)
- Redux:
  - the whole `pomodoro/store/` directory
  - `pomodoro/hook.ts`
  - `pomodoro/hooks/usePomodoro.tsx`
  - `pomodoro/Audio.ts` (a 2,070,364-byte base64 string → `assets/complete.wav`)
- Dependencies:
  - `@reduxjs/toolkit`, `react-redux`, `redux-persist`
  - `dompurify` (sole importer is the dead `useSyntaxHighlighting`) and its `pnpm.overrides` entry
  - duplicate `@types/react` and `@types/react-dom` in `dependencies` (they stay in `devDependencies`)
  - `@types/crypto-js` and `@types/lodash` move to `devDependencies`

---

# PR A — Shared-lib adoption (`feat/phase4-shared-lib`)

### Task 1: Smoke e2e over every tool route

**Files:**

- Create: `test/e2e/tool-routes.ts`
- Modify: `test/e2e/smoke.spec.ts` (append), `test/e2e/global-setup.ts` (warm every route)

**Interfaces:**

- Produces: `toolRoutes(): ToolRoute[]` with `{ folder, id, name, enabled }`. It reads `src/tools/*/index.ts` from disk, because Node cannot evaluate `import.meta.glob`. Tasks 13 and 16 reuse it.

- [ ] **Step 0:** Read `test/e2e/global-setup.ts` and `test/e2e/smoke.spec.ts` as they are now.

- [ ] **Step 1: Route reader** — `test/e2e/tool-routes.ts`

```ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ToolRoute {
  folder: string;
  id: string;
  name: string;
  enabled: boolean;
}

const TOOLS_DIR = 'src/tools';

/** Reads every manifest from disk (Node can't run import.meta.glob). */
export function toolRoutes(): ToolRoute[] {
  return readdirSync(TOOLS_DIR, { withFileTypes: true })
    .filter(
      (d) => d.isDirectory() && existsSync(join(TOOLS_DIR, d.name, 'index.ts')),
    )
    .map((d) => {
      const src = readFileSync(join(TOOLS_DIR, d.name, 'index.ts'), 'utf8');
      const id = /\bid:\s*'([^']+)'/.exec(src)?.[1];
      const name = /\bname:\s*'([^']+)'/.exec(src)?.[1];
      if (!id || !name) {
        throw new Error(`Cannot read id/name from ${d.name}/index.ts`);
      }
      return {
        folder: d.name,
        id,
        name,
        enabled: /\benabled:\s*true\b/.test(src),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 2: Smoke tests** — append to `test/e2e/smoke.spec.ts` and keep the existing three tests.

```ts
import { toolRoutes } from './tool-routes';

const ENABLED = toolRoutes().filter((t) => t.enabled);

test('every enabled tool is discovered', () => {
  // 21 legacy tools + pdf-merger, pdf-splitter, pdf-organize (+ phase-3 tools).
  expect(ENABLED.length).toBeGreaterThanOrEqual(24);
});

for (const tool of ENABLED) {
  test(`${tool.id} renders with no console or page errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });

    await page.goto(`/${tool.id}`);
    await expect(
      page.getByRole('heading', { level: 1, name: tool.name }),
    ).toBeVisible();
    // The lazy chunk resolved and the tool did not hit its error boundary.
    await expect(page.getByText(`Loading ${tool.name}…`)).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(
      page.getByText(`${tool.name} encountered an error`),
    ).toHaveCount(0);
    await expect(page.locator('main')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
}
```

- [ ] **Step 3: Warm every route in global setup.** In `warmUp()` in `test/e2e/global-setup.ts`, add a load-only visit of every enabled route right after `await page.goto('/', …)` and before the PDF loop. A cold Vite dependency optimisation (plotly, xyflow, rive) would otherwise reload pages mid-test (phase-1 note N3).

```ts
import { toolRoutes } from './tool-routes';
// …
for (const tool of toolRoutes().filter((t) => t.enabled)) {
  await page.goto(`/${tool.id}`, { waitUntil: 'load', timeout: COLD_TIMEOUT });
  await page
    .getByText(`Loading ${tool.name}…`)
    .waitFor({ state: 'detached', timeout: COLD_TIMEOUT });
}
```

- [ ] **Step 4: Run and fix real failures.**
  1. Run `pnpm test:e2e test/e2e/smoke.spec.ts`. Expected: PASS for every tool.
  2. If a tool logs a `console.error` (for example a React key warning or a third-party error), **fix the cause** in that tool with the smallest change and record it in the task report.
  3. An error you cannot fix may go into an allow-list only if it comes from a third-party package and cannot be avoided. The allow-list is a `const ALLOWED: RegExp[]` at the top of the spec, with a comment naming the package and the reason. The default is an empty allow-list.

- [ ] **Step 5: Commit**

```bash
git add test/e2e
git commit -m "test(e2e): smoke-test every tool route for console and page errors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared additions — text files, keyed clipboard, paste, `FilePicker`

**Files:**

- Modify: `src/shared/lib/files.ts`, `src/shared/lib/files.test.ts`, `src/shared/lib/clipboard.ts`, `src/shared/lib/clipboard.test.tsx`, `src/shared/ui/file-upload.tsx`, `src/shared/ui/index.ts`
- Create: `src/shared/ui/file-upload.test.tsx`

**Interfaces:**

- Produces:
  - `readText(file: Blob): Promise<string>`
  - `loadTextFile(file: File, opts?: { maxBytes?: number; extensions?: readonly string[] }): Promise<{ name: string; size: number; text: string }>`
    - Throws `ToolError('INVALID_FILE', '<name> is not a supported text file (.a, .b)')`.
    - Throws `ToolError('TOO_LARGE', '<name> is larger than <formatBytes(max)>')`.
    - Throws `ToolError('INVALID_FILE', "Couldn't read <name>")`.
  - `useClipboard(resetMs = 2000)` now returns `{ copied: boolean; copiedKey: string | null; copy(text: string, key?: string): Promise<boolean> }`.
    - `copiedKey` is the key of the last successful copy (`'default'` when none is given) until the reset timer clears it.
    - Existing callers that only use `copied`/`copy(text)` are unaffected.
  - `readClipboardText(): Promise<string>`, which throws `ToolError('UNKNOWN', 'Could not read from clipboard')`.
  - Kit `FilePicker({ onFiles, accept?, multiple?, children: (open) => ReactNode })`. The kit owns the only hidden `<input type="file">`, for icon-button style pickers.

- [ ] **Step 0:** Read the current `files.ts`, `clipboard.ts` and `file-upload.tsx`; phase-1 fixes may have changed them. Keep every existing export and behaviour. In particular, keep `useClipboard`'s `notify.error` on failure.

- [ ] **Step 1: Failing tests.** Append to `src/shared/lib/files.test.ts` (merge imports):

```ts
import { loadTextFile, readText } from './files';

describe('readText / loadTextFile', () => {
  const file = (text: string, name: string) => new File([text], name);

  it('reads UTF-8 text', async () => {
    expect(await readText(file('héllo', 'a.txt'))).toBe('héllo');
  });
  it('returns name, size and text', async () => {
    const r = await loadTextFile(file('a,b\n1,2', 'data.csv'), {
      extensions: ['csv', 'tsv'],
    });
    expect(r).toEqual({ name: 'data.csv', size: 7, text: 'a,b\n1,2' });
  });
  it('matches extensions case-insensitively, with or without a dot', async () => {
    await expect(
      loadTextFile(file('x', 'LOG.TXT'), { extensions: ['.txt'] }),
    ).resolves.toMatchObject({ text: 'x' });
  });
  it('rejects a wrong extension with INVALID_FILE naming the file', async () => {
    await expect(
      loadTextFile(file('x', 'pic.png'), { extensions: ['csv'] }),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE',
      message: expect.stringContaining('pic.png'),
    });
  });
  it('rejects oversize files with TOO_LARGE', async () => {
    await expect(
      loadTextFile(file('12345', 'big.txt'), { maxBytes: 4 }),
    ).rejects.toMatchObject({ code: 'TOO_LARGE' });
  });
});
```

Append to `src/shared/lib/clipboard.test.tsx` (merge imports):

```tsx
import { readClipboardText } from './clipboard';

it('tracks the key of the last copy', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
  const { result } = renderHook(() => useClipboard());
  await act(async () => {
    await result.current.copy('#ff0000', 'hex');
  });
  expect(result.current.copiedKey).toBe('hex');
  expect(result.current.copied).toBe(true);
});

it('readClipboardText wraps failures as ToolError', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { readText: vi.fn().mockRejectedValue(new Error('denied')) },
    configurable: true,
  });
  await expect(readClipboardText()).rejects.toMatchObject({ code: 'UNKNOWN' });
});
```

Create `src/shared/ui/file-upload.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilePicker } from './file-upload';

describe('FilePicker', () => {
  it('opens the hidden input, reports chosen files and resets the input', () => {
    const onFiles = vi.fn();
    const { container } = render(
      <FilePicker accept=".txt" onFiles={onFiles}>
        {(open) => <button onClick={open}>Pick</button>}
      </FilePicker>,
    );
    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    expect(input.accept).toBe('.txt');
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByText('Pick'));
    expect(click).toHaveBeenCalled();
    const f = new File(['x'], 'a.txt');
    fireEvent.change(input, { target: { files: [f] } });
    expect(onFiles).toHaveBeenCalledWith([f]);
    expect(input.value).toBe('');
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/shared` → Expected: the new tests FAIL.

- [ ] **Step 3: Implement.** Add to `src/shared/lib/files.ts`, importing `formatBytes` from `./format`:

```ts
export async function readText(file: Blob): Promise<string> {
  return file.text();
}

const extOf = (name: string) =>
  name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';

export async function loadTextFile(
  file: File,
  opts: { maxBytes?: number; extensions?: readonly string[] } = {},
): Promise<{ name: string; size: number; text: string }> {
  const exts = opts.extensions?.map((e) => e.replace(/^\./, '').toLowerCase());
  if (exts && !exts.includes(extOf(file.name))) {
    throw new ToolError(
      'INVALID_FILE',
      `${file.name} is not a supported text file (${exts.map((e) => `.${e}`).join(', ')})`,
    );
  }
  if (opts.maxBytes !== undefined && file.size > opts.maxBytes) {
    throw new ToolError(
      'TOO_LARGE',
      `${file.name} is larger than ${formatBytes(opts.maxBytes)}`,
    );
  }
  try {
    return { name: file.name, size: file.size, text: await readText(file) };
  } catch (cause) {
    throw new ToolError('INVALID_FILE', `Couldn't read ${file.name}`, {
      cause,
    });
  }
}
```

In `src/shared/lib/clipboard.ts`, add `readClipboardText` and make `useClipboard` keyed:

```ts
export async function readClipboardText(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch (cause) {
    throw new ToolError('UNKNOWN', 'Could not read from clipboard', { cause });
  }
}

export function useClipboard(resetMs = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, key = 'default'): Promise<boolean> => {
      try {
        await copyText(text);
      } catch (e) {
        notify.error(
          e instanceof ToolError ? e : 'Could not copy to clipboard',
        );
        setCopiedKey(null);
        return false;
      }
      setCopiedKey(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied: copiedKey !== null, copiedKey, copy };
}
```

In `src/shared/ui/file-upload.tsx`, add the following and export `FilePicker` from `src/shared/ui/index.ts` next to `FileUpload`:

```tsx
interface FilePickerProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  /** Render the trigger; call `open()` to show the file dialog. */
  children: (open: () => void) => React.ReactNode;
}

export function FilePicker({
  onFiles,
  accept,
  multiple,
  children,
}: FilePickerProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      {children(() => ref.current?.click())}
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}
```

- [ ] **Step 4:** Run `pnpm test src/shared && pnpm typecheck` → Expected: PASS.

- [ ] **Step 5: Commit** — `feat(shared): text-file loading, keyed clipboard, paste and FilePicker` (trailer).

---

### Task 3: `createToolStore` — one-time import of legacy localStorage keys

**Files:**

- Modify: `src/shared/state/createToolStore.ts`, `src/shared/state/createToolStore.test.ts`

**Interfaces:**

- Produces a new optional config field on `createToolStore`:

  ```ts
  legacy?: {
    keys: readonly string[];
    /** Raw legacy strings (null when absent) → state to import; null = nothing to import. May throw. */
    read: (raw: Record<string, string | null>) => Partial<S> | null;
  };
  ```

- Semantics, applied only when persistence is on:
  1. At creation, if `localStorage['kit:store:tool:<id>']` is absent **and** at least one legacy key is present, call `read`.
  2. Apply a non-null result with `store.setState(partial)`, never by changing `initial`. That way store-kit persists it, and `reset()` still returns to defaults.
  3. Remove every legacy key.
  4. If `read` throws, `console.warn('[tool:<id>:legacy]', err)`, keep the legacy keys and use the defaults.
- Consumed by: api-request (Task 8), calculator (Task 9), pomodoro (Task 12).

- [ ] **Step 0:** Read `createToolStore.ts` and store-kit's `createStore` in `node_modules/@arshad-shah/store-kit/dist/index.mjs`. Confirm three things:
  - The key prefix is `kit:store:`.
  - Hydration is synchronous.
  - The persist subscriber skips writes whose serialization equals the initial snapshot. That is why the import must use `setState`.

- [ ] **Step 1: Failing tests** — append to `createToolStore.test.ts`. Add `/** @vitest-environment jsdom */` at the top if the file does not already run with a DOM `localStorage`.

```ts
describe('createToolStore legacy import', () => {
  beforeEach(() => localStorage.clear());

  const kitKeyFor = (id: string) => `kit:store:tool:${id}`;
  let n = 0;
  const make = (
    read = (raw: Record<string, string | null>) =>
      raw.old ? { items: JSON.parse(raw.old) as string[] } : null,
  ) => {
    const toolId = `legacy-${++n}`;
    return {
      toolId,
      store: createToolStore<{ items: string[] }>({
        toolId,
        initial: { items: [] },
        legacy: { keys: ['old'], read },
      }),
    };
  };

  it('imports once, persists under the kit key and removes the legacy key', () => {
    localStorage.setItem('old', JSON.stringify(['a', 'b']));
    const { store, toolId } = make();
    expect(store.getState().items).toEqual(['a', 'b']);
    expect(localStorage.getItem('old')).toBeNull();
    expect(
      JSON.parse(localStorage.getItem(kitKeyFor(toolId))!).state.items,
    ).toEqual(['a', 'b']);
  });

  it('ignores legacy data when the kit key already exists', () => {
    localStorage.setItem(
      kitKeyFor('legacy-existing'),
      JSON.stringify({ version: 1, state: { items: ['kept'] } }),
    );
    localStorage.setItem('old', JSON.stringify(['stale']));
    const store = createToolStore<{ items: string[] }>({
      toolId: 'legacy-existing',
      initial: { items: [] },
      legacy: {
        keys: ['old'],
        read: (raw) => ({ items: JSON.parse(raw.old!) }),
      },
    });
    expect(store.getState().items).toEqual(['kept']);
    expect(localStorage.getItem('old')).not.toBeNull();
  });

  it('falls back to defaults and keeps the legacy key when read throws', () => {
    localStorage.setItem('old', '{not json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = make((raw) => ({ items: JSON.parse(raw.old!) }));
    expect(store.getState().items).toEqual([]);
    expect(localStorage.getItem('old')).toBe('{not json');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(':legacy]'),
      expect.anything(),
    );
  });

  it('reset() returns to defaults, not to the imported data', () => {
    localStorage.setItem('old', JSON.stringify(['a']));
    const { store } = make();
    store.reset();
    expect(store.getState().items).toEqual([]);
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/shared/state/createToolStore` → Expected: FAIL.

- [ ] **Step 3: Implement.** Add `legacy` to `ToolStoreConfig`, then assign `createStore(...)` to `const store`, run the import, and return `store`:

```ts
export function createToolStore<S extends object, A extends object = object>(
  config: ToolStoreConfig<S, A>,
) {
  const store = createStore<S, A>({
    /* …existing options unchanged… */
  });
  if (config.persist !== false && config.legacy) {
    importLegacy<S>(store, config.toolId, config.legacy);
  }
  return store;
}

function importLegacy<S extends object>(
  store: { setState: (partial: Partial<S>) => void },
  toolId: string,
  legacy: NonNullable<ToolStoreConfig<S, object>['legacy']>,
): void {
  let ls: Storage;
  try {
    ls = globalThis.localStorage;
    if (!ls || ls.getItem(`kit:store:tool:${toolId}`) !== null) return;
  } catch {
    return; // storage blocked (private mode): nothing to import
  }
  const raw = Object.fromEntries(legacy.keys.map((k) => [k, ls.getItem(k)]));
  if (Object.values(raw).every((v) => v === null)) return;
  try {
    const partial = legacy.read(raw);
    if (partial) store.setState(partial);
    legacy.keys.forEach((k) => ls.removeItem(k));
  } catch (error) {
    console.warn(`[tool:${toolId}:legacy]`, error);
  }
}
```

- [ ] **Step 4:** Run `pnpm test src/shared/state && pnpm typecheck` → Expected: PASS.

- [ ] **Step 5: Commit** — `feat(state): createToolStore imports legacy localStorage keys once` (trailer).

---

### Task 4: Downloads → `saveBlob` (text and QR exports)

**Files:**

- Modify:
  - `src/tools/ColorTester/ColorTester.tsx`
  - `src/tools/CSVViewer/Csv-Tsv-viewer.tsx`
  - `src/tools/JsonViewer/components/JsonViewer.tsx`
  - `src/tools/LogParser/LogParser.tsx`
  - `src/tools/LogParser/utils/utils.ts`
  - `src/tools/RandomDataGenerator/utils.tsx`
  - `src/tools/TextDiffChecker/TextDiffChecker.tsx`
  - `src/tools/QrCodeGenerator/utils/qrUtils.ts`
  - `src/tools/QrCodeGenerator/hooks/useQrCode.ts`
- Create: `src/tools/QrCodeGenerator/utils/qrExport.ts`, `src/tools/QrCodeGenerator/utils/qrExport.test.ts`, `test/e2e/legacy-tools.spec.ts`

**Interfaces:**

- Consumes: `saveBlob(data: Blob | Uint8Array, filename: string, mime?)` and `deriveFilename(input, suffix, ext)`, both from `@/shared/lib/download`.
- Produces:
  - `qrToBlob(container: HTMLElement, renderAs: 'canvas' | 'svg'): Promise<Blob>`, which throws `ToolError('UNKNOWN', …)` when nothing is rendered or encoding fails.
  - `qrFilename(qrType: string, renderAs: 'canvas' | 'svg', now?: number): string`.
  - Both are in `utils/qrExport.ts`. Task 24 moves the file to `lib/qr-export.ts`.

**Replacement pattern.** Every hand-rolled block of this shape is replaced by a single `saveBlob` call with the same filename and MIME type. The exceptions are B1 and B2.

```ts
// before
const blob = new Blob([text], { type: MIME });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = NAME;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
// after
saveBlob(new Blob([text], { type: MIME }), NAME);
```

| Site (legacy path:line)                                                      | After                                                                                                                                              |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ColorTester/ColorTester.tsx:229-240` `exportPalette`                        | `saveBlob(new Blob([JSON.stringify(savedColors, null, 2)], { type: 'application/json' }), 'color-palette.json')`                                   |
| `CSVViewer/Csv-Tsv-viewer.tsx:339-361` `exportData`                          | `saveBlob(new Blob([Papa.unparse(dataToExport)], { type: 'text/csv;charset=utf-8' }), deriveFilename(dataState.fileName, 'exported', 'csv'))` (B2) |
| `JsonViewer/components/JsonViewer.tsx:196-208` `handleDownload`              | `saveBlob(new Blob([inputText], { type: format === 'json' ? 'application/json' : 'text/xml' }), \`data.${format}\`)`                               |
| `LogParser/LogParser.tsx:215-227` `downloadFiltered`                         | `saveBlob(new Blob([filteredLogs.map((l) => l.raw).join('\n')], { type: 'text/plain' }), \`logs*filtered*${Date.now()}.txt\`)`                     |
| `LogParser/utils/utils.ts:304-321` `exportLogsAsJson`, `copyLogsToClipboard` | **delete both** (zero importers: `grep -rn "exportLogsAsJson\|copyLogsToClipboard" src` → only the definitions)                                    |
| `RandomDataGenerator/utils.tsx:554-568` `downloadJson`                       | body becomes `if (!data) return; saveBlob(dataToJsonBlob(data), filename);` (B1)                                                                   |
| `TextDiffChecker/TextDiffChecker.tsx:249-258` in `exportResults`             | `saveBlob(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }), \`diff-results-${Date.now()}.json\`)`                     |
| `QrCodeGenerator/utils/qrUtils.ts:150-177` `downloadQRCode`                  | **delete**; replaced by `qrExport.ts` below. `useQrCode.ts:259-261` `handleDownloadQRCode` becomes async (below)                                   |

The `ImageOptimiser` download is handled in Task 6.

- [ ] **Step 0:** Confirm the `saveBlob`/`deriveFilename` signatures in `src/shared/lib/download.ts`.

- [ ] **Step 1: Failing test** — `src/tools/QrCodeGenerator/utils/qrExport.test.ts`

```ts
/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { qrFilename, qrToBlob } from './qrExport';

describe('qrExport', () => {
  it('names files by type, timestamp and format', () => {
    expect(qrFilename('url', 'canvas', 1700000000000)).toBe(
      'qrcode-url-1700000000000.png',
    );
    expect(qrFilename('wifi', 'svg', 1)).toBe('qrcode-wifi-1.svg');
  });
  it('serialises an SVG QR code', async () => {
    const div = document.createElement('div');
    div.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
    const blob = await qrToBlob(div, 'svg');
    expect(blob.type).toBe('image/svg+xml;charset=utf-8');
    expect(await blob.text()).toContain('<rect');
  });
  it('rejects with ToolError when nothing is rendered', async () => {
    await expect(
      qrToBlob(document.createElement('div'), 'svg'),
    ).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/tools/QrCodeGenerator` → Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `src/tools/QrCodeGenerator/utils/qrExport.ts`

```ts
import { ToolError } from '@/shared/lib/errors';

export const qrFilename = (
  qrType: string,
  renderAs: 'canvas' | 'svg',
  now = Date.now(),
) => `qrcode-${qrType}-${now}.${renderAs === 'canvas' ? 'png' : 'svg'}`;

export async function qrToBlob(
  container: HTMLElement,
  renderAs: 'canvas' | 'svg',
): Promise<Blob> {
  if (renderAs === 'canvas') {
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new ToolError('UNKNOWN', 'The QR code is not ready yet');
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!blob) throw new ToolError('UNKNOWN', 'Could not export the QR code');
    return blob;
  }
  const svg = container.querySelector('svg');
  if (!svg) throw new ToolError('UNKNOWN', 'The QR code is not ready yet');
  return new Blob([new XMLSerializer().serializeToString(svg)], {
    type: 'image/svg+xml;charset=utf-8',
  });
}
```

In `useQrCode.ts`:

- Drop `downloadQRCode` from the import list (line 18).
- Replace `handleDownloadQRCode` with:

```ts
const handleDownloadQRCode = async () => {
  if (!qrRef.current) return;
  try {
    const blob = await qrToBlob(qrRef.current, state.renderAs);
    saveBlob(blob, qrFilename(state.qrType, state.renderAs));
  } catch (e) {
    notify.error(toToolError(e, 'Could not export the QR code'));
  }
};
```

Then apply every row of the table above, adding `import { saveBlob, deriveFilename } from '@/shared/lib/download';` where needed.

- [ ] **Step 4: Targeted e2e** — create `test/e2e/legacy-tools.spec.ts`. Tasks 6 and 7 add more flows to this file.

```ts
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('color-tester exports the palette as JSON', async ({ page }) => {
  await page.goto('/color-tester');
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: /export/i })
    .first()
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('color-palette.json');
  const body: unknown = JSON.parse(await readFile(await file.path(), 'utf8'));
  expect(Array.isArray(body)).toBe(true);
});

test('qr-code-generator downloads a PNG', async ({ page }) => {
  await page.goto('/qr-code-generator');
  await page.getByRole('textbox').first().fill('https://example.com');
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: /download/i })
    .first()
    .click();
  expect((await download).suggestedFilename()).toMatch(
    /^qrcode-[a-z]+-\d+\.(png|svg)$/,
  );
});
```

If a button's accessible name differs, use the exact visible label from the component: read it, never guess. The export button is in the saved-palette card of `ColorTester.tsx`.

- [ ] **Step 5:** Run `pnpm test src/tools && pnpm typecheck && pnpm test:e2e test/e2e/legacy-tools.spec.ts test/e2e/smoke.spec.ts` → Expected: PASS. Then run `grep -rn "createElement('a')\|createElement(\"a\")" src/tools --include=*.ts* | grep -v PdfCompressor` → Expected: only `ImageOptimiser.tsx` remains (Task 6).

- [ ] **Step 6: Commit** — `refactor(tools): route every export through saveBlob` (trailer).

---

### Task 5: Clipboard → `useClipboard` / `copyText` / `readClipboardText`

**Files:**

- Modify:
  - `src/tools/Base64Convertor/Base64Convertor.tsx`
  - `src/tools/HashGenerator/HashGenerator.tsx`
  - `src/tools/JWTDecoder/JwtDecoder.tsx`
  - `src/tools/ColorTester/ColorTester.tsx`
  - `src/tools/JsonViewer/components/TreeView.tsx`
  - `src/tools/LogParser/LogParser.tsx`
  - `src/tools/LogParser/hooks/useLogParser.ts`
  - `src/tools/NumberConverter/NumberConverter.tsx`
  - `src/tools/PasswordGenerator/Generator.tsx`
  - `src/tools/regexTester/RegexStudio.tsx`
  - `src/tools/TextDiffChecker/TextDiffChecker.tsx`
  - `src/tools/URLEncoderDecoder/URLEncoderDecoder.tsx`
  - `src/tools/UrlParser/UrlParser.tsx`
- Delete: `src/tools/JWTDecoder/hooks/useClipboard.tsx` (duplicate; zero importers, since JwtDecoder imports the global shim)

**Interfaces:**

- Consumes: `useClipboard()` → `{ copied, copiedKey, copy(text, key?) }` and `readClipboardText()` from `@/shared/lib/clipboard` (Task 2).

**Replacement pattern.**

```tsx
// before
const [copiedKey, setCopiedKey] = useState<string | null>(null);
const handleCopy = (text: string, key: string) => {
  navigator.clipboard.writeText(text);
  setCopiedKey(key);
  setTimeout(() => setCopiedKey(null), 2000);
};
// after
const { copiedKey, copy } = useClipboard();
const handleCopy = (text: string, key: string) => {
  if (text) void copy(text, key);
};
```

| Site                                                           | Change                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Base64Convertor.tsx:21`                                       | `import { useClipboard } from '@/shared/lib/clipboard';` (was the default import from the shim `../../hooks/useClipboard`). Usage unchanged.                                                                                                                                                       |
| `HashGenerator.tsx:20,67-68,99-103`                            | Import as above. Delete `copiedId` state and its `setTimeout`. `const { copiedKey, copy } = useClipboard();` `handleCopy = (text, id) => void copy(text, id)`. Line 161: `isCopied = copiedKey === id`.                                                                                            |
| `JwtDecoder.tsx:55,212,229,332,534,593,628`                    | Import as above. Pass keys `'jwt'`, `'header'`, `'payload'`, `'signature'` and read `copiedKey === '<key>'` per button, so only the button pressed shows "Copied" (B10).                                                                                                                           |
| `ColorTester.tsx:147,177-182`                                  | Delete the `copiedKey` state and `copyToClipboard`. `const { copiedKey, copy } = useClipboard();` Call sites at 471/494 etc. become `copy(hexCode, 'hex')` / `copy(rgbString, 'rgb')`.                                                                                                             |
| `JsonViewer/components/TreeView.tsx:84-86`                     | `const { copy } = useClipboard(); const copyToClipboard = (text: string) => void copy(text);`                                                                                                                                                                                                      |
| `LogParser/hooks/useLogParser.ts:183-196` `useCopyToClipboard` | **Delete.** In `LogParser.tsx:55,213,347-348`: `const { copiedKey, copy } = useClipboard();`. Pass `copied={copiedKey === String(log.id)}` and `onCopy={(text) => copy(text, String(log.id))}`. `LogEntry.id` is `number \| string`. Read `LogRow`'s `onCopy` signature and adapt the arrow to it. |
| `NumberConverter.tsx:119-124`                                  | `const { copiedKey, copy } = useClipboard();` `handleCopy = (value, key) => { if (value) void copy(value, key); }`. Delete the `copied` state and use `copiedKey`.                                                                                                                                 |
| `Generator.tsx:248,301-310`                                    | `const { copied, copy } = useClipboard();` `copyToClipboard = () => void copy(password);`. Delete the `copied` state.                                                                                                                                                                              |
| `RegexStudio.tsx:299,361-365`                                  | `const { copied, copy } = useClipboard();` `copyToClipboard = useCallback((t: string) => void copy(t), [copy]);`. Delete the `copied` state.                                                                                                                                                       |
| `TextDiffChecker.tsx:167-175`                                  | `const { copy } = useClipboard();` `copyToClipboard = useCallback(async (t: string) => { if (await copy(t)) notify.success('Copied to clipboard!'); }, [copy]);` (failure toast comes from `useClipboard`)                                                                                         |
| `URLEncoderDecoder.tsx:28-33,54-59`                            | `const { copied, copy } = useClipboard();` `handleCopy = () => { if (outputText) void copy(outputText); };`. Delete the `copied` state.                                                                                                                                                            |
| `UrlParser.tsx:57,83-97`                                       | Copy as in the pattern. `handlePaste = async () => { try { setUrl(await readClipboardText()); } catch (e) { notify.error(toToolError(e)); } };`                                                                                                                                                    |

- [ ] **Step 0:** Confirm the `useClipboard` return shape (Task 2).

- [ ] **Step 1:** Apply the table. Delete `src/tools/JWTDecoder/hooks/useClipboard.tsx`.

- [ ] **Step 2: Verify**

```bash
grep -rn "navigator.clipboard" src/tools src/app | grep -v "PdfCompressor"
grep -rn "hooks/useClipboard" src
```

Expected: both return nothing. (`src/hooks/useClipboard.tsx` itself stays until Task 18 deletes it.)

- [ ] **Step 3:** Run `pnpm typecheck && pnpm test && pnpm test:e2e test/e2e/smoke.spec.ts` → Expected: PASS. In `test/e2e/legacy-tools.spec.ts`, add:

```ts
test('url-encoder-decoder copies output', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/url-encoder-decoder');
  await page.getByRole('textbox').first().fill('a b&c');
  await page.getByRole('button', { name: /copy/i }).first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'a%20b%26c',
  );
});
```

- [ ] **Step 4: Commit** — `refactor(tools): one clipboard implementation; drop JWT's duplicate hook` (trailer).

---

### Task 6: Image Optimizer — file loading, conversion pipeline, `useJob`, `formatBytes`, download

**Files:**

- Create: `src/tools/ImageOptimiser/convert.ts`, `src/tools/ImageOptimiser/convert.test.ts` (Task 17 moves these to `lib/`)
- Modify: `src/tools/ImageOptimiser/ImageOptimiser.tsx`, `test/e2e/legacy-tools.spec.ts`

**Interfaces:**

- Produces (pure or near-pure):
  - `type OutputFormat = 'jpeg' | 'png' | 'webp'`
  - `mimeFor(f: OutputFormat): string`
  - `aspectRatio(w: number, h: number): string` (moved unchanged from `calculateAspectRatio`, lines 39-44)
  - `reductionLabel(before: number, after: number): string`. Same outputs as `calculateReduction` (lines 46-66), computed from byte counts instead of re-parsing formatted strings: `'N/A'` when `before <= 0`, `'No reduction'` when the reduction is `<= 0`, else `'<r.toFixed(1)>%'`.
  - `assertImageFile(file: File): void`. Throws `ToolError('INVALID_FILE', '<name> is not an image')` unless `file.type.startsWith('image/')`, which is the same accept rule as today (line 86).
  - `convertImage(file: Blob, opts: { format: OutputFormat; quality: number }, signal?: AbortSignal): Promise<{ blob: Blob; width: number; height: number }>`
- Consumes: `useJob`, `saveBlob`, `deriveFilename`, `formatBytes`, `notify`, `toToolError`.

- [ ] **Step 0:** Confirm the `useJob` API (`run` returns `R | undefined`; `status`, `error`, `result`, `cancel`, `reset`).

- [ ] **Step 1: Failing test** — `src/tools/ImageOptimiser/convert.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  aspectRatio,
  assertImageFile,
  mimeFor,
  reductionLabel,
} from './convert';

describe('image-optimizer helpers', () => {
  it('maps formats to MIME types', () => {
    expect(mimeFor('jpeg')).toBe('image/jpeg');
    expect(mimeFor('png')).toBe('image/png');
    expect(mimeFor('webp')).toBe('image/webp');
  });
  it('reduces aspect ratios', () => {
    expect(aspectRatio(1920, 1080)).toBe('16:9');
    expect(aspectRatio(0, 10)).toBe('Unknown');
  });
  it('labels size reduction like the old string-based version', () => {
    expect(reductionLabel(1000, 400)).toBe('60.0%');
    expect(reductionLabel(1000, 1000)).toBe('No reduction');
    expect(reductionLabel(1000, 1200)).toBe('No reduction');
    expect(reductionLabel(0, 10)).toBe('N/A');
  });
  it('rejects non-images with INVALID_FILE naming the file', () => {
    expect(() =>
      assertImageFile(new File(['x'], 'a.txt', { type: 'text/plain' })),
    ).toThrow(expect.objectContaining({ code: 'INVALID_FILE' }));
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/tools/ImageOptimiser` → Expected: FAIL.

- [ ] **Step 3: Implement** `convert.ts`

```ts
import { ToolError } from '@/shared/lib/errors';

export type OutputFormat = 'jpeg' | 'png' | 'webp';
export const mimeFor = (f: OutputFormat) => `image/${f}`;

export function aspectRatio(w: number, h: number): string {
  if (!w || !h) return 'Unknown';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

export function reductionLabel(before: number, after: number): string {
  if (!(before > 0)) return 'N/A';
  const r = ((before - after) / before) * 100;
  return r <= 0 ? 'No reduction' : `${r.toFixed(1)}%`;
}

export function assertImageFile(file: File): void {
  if (!file.type.startsWith('image/'))
    throw new ToolError('INVALID_FILE', `${file.name} is not an image`);
}

export async function convertImage(
  file: Blob,
  opts: { format: OutputFormat; quality: number },
  signal?: AbortSignal,
): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (cause) {
    throw new ToolError('INVALID_FILE', 'This image could not be decoded', {
      cause,
    });
  }
  try {
    if (signal?.aborted) throw new ToolError('CANCELLED', 'Cancelled');
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ToolError('UNKNOWN', 'Unable to get canvas context');
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        mimeFor(opts.format),
        opts.format === 'png' ? undefined : opts.quality,
      ),
    );
    if (!blob)
      throw new ToolError(
        'UNSUPPORTED_FEATURE',
        `This browser cannot encode ${opts.format.toUpperCase()}`,
      );
    return { blob, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
```

Rewire `ImageOptimiser.tsx`:

- Delete `formatFileSize` (34-38), `calculateAspectRatio`, `calculateReduction`, the `FileReader` block (96-111), `processImage`'s `Image`/canvas code (114-158), `downloadImage` (160-168), `canvasRef` and the `<canvas ref={canvasRef} />` at line 374.
- Store numbers, not strings: `selectedFile: File | null`, `preview: string | null` (object URL), `dimensions`, `metadata`.
- `handleFiles`:
  1. `assertImageFile(file)` inside try/catch. On failure call `setErrorMessage(toToolError(e).message)`; this keeps today's inline error.
  2. Set the preview with `URL.createObjectURL(file)`.
  3. Read dimensions with `createImageBitmap(file)` (then `.close()`). Map a decode failure to `setErrorMessage('Failed to load the image')`.
- Revoke the preview URL in an effect cleanup keyed on `preview`, and on unmount.
- Run the job:
  - `const job = useJob((ctx, file: File, format: OutputFormat, quality: number) => convertImage(file, { format, quality }, ctx.signal));`
  - The "Optimize" button calls `job.run(selectedFile, outputFormat, compressionLevel / 100)`.
  - `isProcessing` → `job.status === 'running'`. The error alert shows `job.error?.message`.
  - The processed preview comes from an object URL of `job.result.blob`, revoked on change or unmount.
  - Call `job.reset()` when the file, format or quality changes. This mirrors R16.
- Sizes: `formatBytes(selectedFile.size)` and `formatBytes(job.result.blob.size)`. The reduction label is `reductionLabel(selectedFile.size, job.result.blob.size)`.
- Download: `saveBlob(job.result.blob, deriveFilename(selectedFile.name, 'optimized', outputFormat))` (B2).

- [ ] **Step 4: e2e** — append to `test/e2e/legacy-tools.spec.ts`

```ts
const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test('image-optimizer converts and downloads', async ({ page }) => {
  await page.goto('/image-optimizer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'dot.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_1PX, 'base64'),
  });
  await page
    .getByRole('button', { name: /optimi[sz]e|convert|process/i })
    .click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /download/i }).click();
  expect((await download).suggestedFilename()).toBe('dot.optimized.jpeg');
});

test('image-optimizer rejects non-images inline', async ({ page }) => {
  await page.goto('/image-optimizer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hi'),
  });
  await expect(page.getByText('notes.txt is not an image')).toBeVisible();
});
```

Read the actual button labels in the component and use them exactly.

- [ ] **Step 5:** Run `pnpm test src/tools/ImageOptimiser && pnpm typecheck && pnpm test:e2e test/e2e/legacy-tools.spec.ts` → Expected: PASS.

- [ ] **Step 6: Commit** — `refactor(image-optimizer): useJob conversion pipeline over shared files/format/download` (trailer).

---

### Task 7: Text and binary file reading — CSV viewer, Text Diff, Rive player (+ notify)

**Files:**

- Modify:
  - `src/tools/CSVViewer/Csv-Tsv-viewer.tsx`
  - `src/tools/TextDiffChecker/TextDiffChecker.tsx`
  - `src/tools/RiveAnimationPlayer/RiveAnimationPlayer.tsx`
  - `test/e2e/legacy-tools.spec.ts`
- Create:
  - `src/tools/CSVViewer/parse.ts`, `src/tools/CSVViewer/parse.test.ts`
  - `src/tools/RiveAnimationPlayer/riveFile.ts`, `src/tools/RiveAnimationPlayer/riveFile.test.ts`
- Delete: `src/tools/TextDiffChecker/hooks/useNotification.tsx`

**Interfaces:**

- Produces:
  - `parseDelimited(content: string, delimiter: ',' | '\t'): { data: ParsedData[]; columns: string[] }`.
    - Papa options are the same as today (lines 196-221): `header`, `dynamicTyping`, `skipEmptyLines`.
    - The first Papa error becomes `ToolError('INVALID_INPUT', 'Parsing error: <message>')`.
  - `delimiterFor(fileName: string): ',' | '\t'`: `.tsv` → tab, everything else → comma (same as line 227).
  - `assertRiveFile(name: string, bytes: Uint8Array): void`. Throws `ToolError('INVALID_FILE', '<name> is not a Rive (.riv) file')` unless the bytes start with ASCII `RIVE` (`52 49 56 45`), the Rive runtime file signature.
- Consumes: `loadTextFile`, `readBytes`, `formatBytes`, `notify`, `useJob`, `toToolError`, kit `FilePicker`.

- [ ] **Step 0:** Confirm `loadTextFile`/`FilePicker` (Task 2), `readBytes` and `useJob`. Confirm the Rive signature: open the `@rive-app/canvas` runtime source (`node_modules/@rive-app/canvas/rive.js`, search for the `RIVE` header check). If the runtime does not require it, drop `assertRiveFile` and rely on the runtime's own load error mapped to `INVALID_FILE`. Note which way you went in the task report.

- [ ] **Step 1: Failing tests**

`src/tools/CSVViewer/parse.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { delimiterFor, parseDelimited } from './parse';

describe('csv parse', () => {
  it('picks the delimiter from the extension', () => {
    expect(delimiterFor('a.tsv')).toBe('\t');
    expect(delimiterFor('A.TSV')).toBe('\t');
    expect(delimiterFor('a.csv')).toBe(',');
  });
  it('parses headers with dynamic typing and skips empty lines', () => {
    expect(parseDelimited('name,age\nAda,36\n\nBob,7\n', ',')).toEqual({
      columns: ['name', 'age'],
      data: [
        { name: 'Ada', age: 36 },
        { name: 'Bob', age: 7 },
      ],
    });
  });
  it('parses TSV', () => {
    expect(parseDelimited('a\tb\n1\t2', '\t').data).toEqual([{ a: 1, b: 2 }]);
  });
  it('reports the first Papa error as INVALID_INPUT', () => {
    expect(() => parseDelimited('a,b\n"1,2', ',')).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: expect.stringMatching(/^Parsing error: /),
      }),
    );
  });
});
```

`src/tools/RiveAnimationPlayer/riveFile.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assertRiveFile } from './riveFile';

describe('assertRiveFile', () => {
  it('accepts the RIVE signature', () => {
    expect(() =>
      assertRiveFile('a.riv', new Uint8Array([0x52, 0x49, 0x56, 0x45, 7])),
    ).not.toThrow();
  });
  it('rejects anything else naming the file', () => {
    expect(() => assertRiveFile('a.png', new Uint8Array([0x89, 0x50]))).toThrow(
      expect.objectContaining({
        code: 'INVALID_FILE',
        message: 'a.png is not a Rive (.riv) file',
      }),
    );
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/tools/CSVViewer src/tools/RiveAnimationPlayer` → Expected: FAIL.

- [ ] **Step 3: Implement**

`parse.ts`:

```ts
import Papa from 'papaparse';
import { ToolError } from '@/shared/lib/errors';
import type { ParsedData } from '../../types/CsvTsvTypes'; // PR C moves this to ./types

export const delimiterFor = (fileName: string): ',' | '\t' =>
  fileName.toLowerCase().endsWith('.tsv') ? '\t' : ',';

export function parseDelimited(
  content: string,
  delimiter: ',' | '\t',
): { data: ParsedData[]; columns: string[] } {
  const r = Papa.parse<ParsedData>(content, {
    delimiter,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (r.errors.length > 0) {
    throw new ToolError(
      'INVALID_INPUT',
      `Parsing error: ${r.errors[0].message}`,
    );
  }
  return { data: r.data, columns: r.meta.fields ?? [] };
}
```

The `../../types` import is the one allowed temporary climb. Task 17 rewrites it to `./types`.

`riveFile.ts`:

```ts
import { ToolError } from '@/shared/lib/errors';

const SIG = [0x52, 0x49, 0x56, 0x45]; // "RIVE"
export function assertRiveFile(name: string, bytes: Uint8Array): void {
  if (!SIG.every((b, i) => bytes[i] === b))
    throw new ToolError('INVALID_FILE', `${name} is not a Rive (.riv) file`);
}
```

Rewire **CSV** (`Csv-Tsv-viewer.tsx`):

- Delete `parseFile` (196-222) and the `FileReader` block in `processFile` (224-239).
- Add a job:

  ```ts
  const loadJob = useJob(async (_ctx, file: File) => {
    const { name, text } = await loadTextFile(file, {
      extensions: ['csv', 'tsv'],
    });
    return { ...parseDelimited(text, delimiterFor(name)), fileName: name };
  });
  const processFile = async (file: File) => {
    const r = await loadJob.run(file);
    if (r) {
      setDataState(r);
      setSelectedColumns(r.columns);
    }
  };
  ```

- `loading` → `loadJob.status === 'running'`. `parseError` → `loadJob.error?.message`.
- `loadSample` keeps its in-memory string and calls `parseDelimited(sample, ',')` directly inside try/catch, which sets the same alert.
- Keep the kit `FileUpload` at line 427.

Rewire **Text Diff** (`TextDiffChecker.tsx`):

- Delete the `useNotification` import (41) and hook (139), and the alert banner (832-843). Every `showNotification(msg, type)` → `notify.success(msg)` / `notify.info(msg)` / `notify.error(msg)` with the **same message text** (B3).
- Delete both raw `<input type="file">` (522-533) and their refs (151-152).
- Wrap each `DiffTextArea` in a kit `FilePicker`:

  ```tsx
  <FilePicker accept={TEXT_ACCEPT} onFiles={(f) => void loadSide('left', f[0])}>
    {(open) => <DiffTextArea /* …existing props… */ onFileUpload={open} />}
  </FilePicker>
  ```

- Define the accept list and the loader:

  ```ts
  const TEXT_EXTS = [
    'txt',
    'md',
    'json',
    'html',
    'css',
    'js',
    'ts',
    'jsx',
    'tsx',
    'xml',
    'yaml',
    'yml',
    'log',
  ];
  const TEXT_ACCEPT = TEXT_EXTS.map((e) => `.${e}`).join(',');
  const loadJob = useJob((_ctx, file: File) =>
    loadTextFile(file, { maxBytes: 10 * 1024 * 1024, extensions: TEXT_EXTS }),
  );
  const loadSide = async (side: 'left' | 'right', file: File) => {
    const r = await loadJob.run(file);
    if (!r) return; // error surfaced below
    (side === 'left' ? setLeftText : setRightText)(r.text);
    notify.success(`${r.name} loaded successfully`);
  };
  useEffect(() => {
    if (loadJob.error) notify.error(loadJob.error);
  }, [loadJob.error]);
  ```

- Behaviour difference: the extension list replaces the old "MIME in allowlist OR extension matches" check. Every allowlisted MIME (`text/plain`, `text/csv`, `application/json`, `text/html`, `text/css`, `text/javascript`) corresponds to an extension in the list except `.csv`. Add `'csv'` to `TEXT_EXTS` to keep parity.

Rewire **Rive** (`RiveAnimationPlayer.tsx`):

- Delete `formatFileSize` (132-136), the `sonner` import (61) and `<Toaster … />` (811). `toast.error(x)` (330, 462) → `notify.error(x)`.
- Replace `load` (408-427) with a job:

  ```ts
  const loadJob = useJob(async (_ctx, file: File) => {
    const bytes = await readBytes(file);
    assertRiveFile(file.name, bytes);
    return { file, bytes };
  });
  const load = async (file: File) => {
    setFilename(file.name);
    setFileSize(formatBytes(file.size));
    addDebugLog(
      `File selected: ${file.name} (${formatBytes(file.size)})`,
      'info',
    );
    const r = await loadJob.run(file);
    if (!r) return;
    setAnimationWithBuffer(r.bytes.buffer as ArrayBuffer);
    setRiveInfo({
      version: 'Unknown',
      fileSize: file.size,
      fps: 'Unknown',
      artboardCount: 0,
    });
  };
  useEffect(() => {
    if (loadJob.error) {
      notify.error(loadJob.error);
      addDebugLog(loadJob.error.message, 'error');
    }
  }, [loadJob.error]); // addDebugLog: read its definition; include it if stable
  ```

- Read `setAnimationWithBuffer`'s parameter type and pass exactly what it expects. Today it receives `reader.result` (an `ArrayBuffer`). `readBytes` returns a fresh `Uint8Array` over a whole `ArrayBuffer`, so `.buffer` is that buffer.

- [ ] **Step 4: e2e** — append to `test/e2e/legacy-tools.spec.ts`

```ts
test('csv-viewer loads a CSV and exports it', async ({ page }) => {
  await page.goto('/csv-viewer');
  await page.locator('input[type=file]').setInputFiles({
    name: 'people.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,age\nAda,36\nBob,7\n'),
  });
  await expect(page.getByText('Ada')).toBeVisible();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: /export/i })
    .first()
    .click();
  expect((await download).suggestedFilename()).toBe('people.exported.csv');
});

test('text-diff-checker loads a file into the left pane', async ({ page }) => {
  await page.goto('/text-diff-checker');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'left.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello left'),
    });
  await expect(page.getByText('left.txt loaded successfully')).toBeVisible();
  await expect(page.getByRole('textbox').first()).toHaveValue('hello left');
});

test('rive-animation-player rejects a non-Rive file with a toast', async ({
  page,
}) => {
  await page.goto('/rive-animation-player');
  await page.locator('input[type=file]').setInputFiles({
    name: 'fake.riv',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('nope'),
  });
  await expect(
    page.getByText('fake.riv is not a Rive (.riv) file'),
  ).toBeVisible();
});
```

Adjust the textbox locator to the Text Diff left `Textarea`'s accessible name if `first()` is ambiguous. Read `DiffTextArea`.

- [ ] **Step 5: Verify**

```bash
grep -rn "FileReader\|formatFileSize\|from 'sonner'\|useNotification" src/tools | grep -v PdfCompressor
grep -rn 'type="file"' src/tools | grep -v PdfCompressor
```

Both must return nothing. Then run `pnpm typecheck && pnpm test && pnpm test:e2e test/e2e/legacy-tools.spec.ts test/e2e/smoke.spec.ts` → Expected: PASS.

- [ ] **Step 6: Commit** — `refactor(tools): shared file loading and notify in CSV, Text Diff and Rive` (trailer).

---

### Task 8: API Request — `useJob`, `notify`, request builder, collections store

**Files:**

- Create:
  - `src/tools/ApiTester/request.ts`, `src/tools/ApiTester/request.test.ts`
  - `src/tools/ApiTester/collections.ts`, `src/tools/ApiTester/collections.test.ts`
  - `src/tools/ApiTester/store.ts`, `src/tools/ApiTester/store.test.ts`
- Modify: `src/tools/ApiTester/ApiTester.tsx`
- Delete: `src/hooks/useLocalStorage.hook.tsx` (sole importer is `ApiTester.tsx:60`)

**Interfaces:**

- Produces in `request.ts` (pure, except `sendRequest`):
  - `buildUrl(url: string, params: ParamType[]): string`. Appends enabled params with a non-blank key; on an invalid URL it returns `url` unchanged (as at 291-301).
  - `buildRestInit(input: { method: string; headers: HeaderType[]; bodyType: BodyType; body: string }): { headers: Record<string,string>; body?: BodyInit }`. Throws `ToolError('INVALID_INPUT', 'Invalid JSON in request body')`.
  - `buildGraphqlInit(input: { headers: HeaderType[]; query: string; variables: string }): { headers: Record<string,string>; body: string }`. Throws `ToolError('INVALID_INPUT', 'Invalid JSON in GraphQL variables')`.
  - `sendRequest(input: RequestInput, signal: AbortSignal, now = () => performance.now()): Promise<ResponseType>`.
    - A network failure resolves to `{ status: 0, statusText: 'Network error', … data: { error } }`, as today (lines 403-414).
    - An abort rejects with `CANCELLED`.
    - A missing URL rejects with `ToolError('INVALID_INPUT', 'Please enter a URL')`.
- Produces in `collections.ts` (pure, immutable):
  - `addRequest(cols: CollectionType[], targetId: string | null, req: RequestItemType): CollectionType[]`. Inserts into the folder with `targetId` anywhere in the tree, else the first collection, as today (452-482). Throws `ToolError('INVALID_INPUT', 'No collection available. Create one first.')` when there are no collections.
  - `addCollection(cols, name: string): CollectionType[]`
  - `deleteNode(cols, id: string): CollectionType[]`. Removes a folder or a request at any depth (B6).
  - `DEFAULT_COLLECTIONS: CollectionType[]` (the seed at 237-262).
- Produces in `store.ts`:
  - `useApiCollections`, built with `createToolStore<{ collections: CollectionType[] }, { setCollections(c: CollectionType[]): void }>`.
  - Options: `toolId: 'api-request'`, `initial: { collections: DEFAULT_COLLECTIONS }`, `legacy: { keys: ['apiTesterCollections'], read: (raw) => raw.apiTesterCollections ? { collections: JSON.parse(raw.apiTesterCollections) } : null }`.
- Ids: `newId()` replaces `Date.now().toString()`.

- [ ] **Step 0:** Confirm the `createToolStore` `legacy` option (Task 3), `useJob` and `newId`.

- [ ] **Step 1: Failing tests**

`request.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  buildGraphqlInit,
  buildRestInit,
  buildUrl,
  sendRequest,
} from './request';

describe('api-request builder', () => {
  it('appends only enabled params with keys', () => {
    expect(
      buildUrl('https://x.test/a?z=1', [
        { key: 'q', value: 'a b', enabled: true },
        { key: 'off', value: '1', enabled: false },
        { key: ' ', value: 'blank', enabled: true },
      ]),
    ).toBe('https://x.test/a?z=1&q=a+b');
  });
  it('returns the raw string for an invalid URL', () => {
    expect(
      buildUrl('not a url', [{ key: 'a', value: '1', enabled: true }]),
    ).toBe('not a url');
  });
  it('trims headers and drops blank ones; JSON body sets content type', () => {
    const init = buildRestInit({
      method: 'POST',
      headers: [
        { key: ' X-A ', value: ' 1 ' },
        { key: '', value: 'x' },
      ],
      bodyType: 'json',
      body: '{"a":1}',
    });
    expect(init.headers).toEqual({
      'X-A': '1',
      'Content-Type': 'application/json',
    });
    expect(init.body).toBe('{"a":1}');
  });
  it('rejects invalid JSON bodies', () => {
    expect(() =>
      buildRestInit({
        method: 'POST',
        headers: [],
        bodyType: 'json',
        body: '{',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
  it('builds x-www-form-urlencoded bodies', () => {
    const init = buildRestInit({
      method: 'POST',
      headers: [],
      bodyType: 'x-www-form-urlencoded',
      body: 'a=1&b=&c',
    });
    expect(String(init.body)).toBe('a=1&b=&c=');
    expect(init.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });
  it('sends no body for GET', () => {
    expect(
      buildRestInit({
        method: 'GET',
        headers: [],
        bodyType: 'json',
        body: '{"a":1}',
      }).body,
    ).toBeUndefined();
  });
  it('wraps GraphQL query and variables', () => {
    const init = buildGraphqlInit({
      headers: [],
      query: '{ me }',
      variables: '{"id":1}',
    });
    expect(JSON.parse(init.body)).toEqual({
      query: '{ me }',
      variables: { id: 1 },
    });
    expect(init.headers['Content-Type']).toBe('application/json');
  });
  it('maps network failures to a status-0 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    const r = await sendRequest(
      {
        requestType: 'rest',
        method: 'GET',
        url: 'https://x.test',
        params: [],
        headers: [],
        bodyType: 'none',
        body: '',
        graphqlQuery: '',
        graphqlVariables: '',
      },
      new AbortController().signal,
    );
    expect(r.status).toBe(0);
    expect(r.statusText).toBe('Network error');
    expect(r.data).toEqual({ error: 'Failed to fetch' });
    vi.unstubAllGlobals();
  });
});
```

`collections.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addCollection, addRequest, deleteNode } from './collections';
import type {
  CollectionType,
  RequestItemType,
} from '../../types/ApiTesterTypes';

const req = (id: string): RequestItemType => ({
  id,
  type: 'request',
  name: id,
  method: 'GET',
  url: '',
});
const tree = (): CollectionType[] => [
  {
    id: 'f1',
    type: 'folder',
    name: 'One',
    children: [
      req('r1'),
      { id: 'f2', type: 'folder', name: 'Nested', children: [req('r2')] },
    ],
  },
  { id: 'f3', type: 'folder', name: 'Two', children: [req('r3')] },
];

describe('collections', () => {
  it('adds to a nested folder without mutating the input', () => {
    const before = tree();
    const after = addRequest(before, 'f2', req('new'));
    expect(JSON.stringify(before)).toBe(JSON.stringify(tree()));
    expect(JSON.stringify(after)).toContain('"new"');
  });
  it('falls back to the first collection for an unknown target', () => {
    const after = addRequest(tree(), 'missing', req('n'));
    expect(after[0].children.at(-1)!.id).toBe('n');
  });
  it('throws when there is no collection', () => {
    expect(() => addRequest([], null, req('n'))).toThrow(/Create one first/);
  });
  it('deletes requests at any depth and in any collection (B6)', () => {
    expect(JSON.stringify(deleteNode(tree(), 'r2'))).not.toContain('"r2"');
    expect(JSON.stringify(deleteNode(tree(), 'r3'))).not.toContain('"r3"');
  });
  it('deletes folders', () => {
    expect(deleteNode(tree(), 'f3').map((c) => c.id)).toEqual(['f1']);
  });
  it('adds a named collection', () => {
    expect(addCollection([], ' New ').at(-1)).toMatchObject({
      type: 'folder',
      name: 'New',
      children: [],
    });
  });
});
```

`store.test.ts` (jsdom):

```ts
/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('api-request store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });
  it('imports apiTesterCollections once', async () => {
    const saved = [{ id: 'x', type: 'folder', name: 'Mine', children: [] }];
    localStorage.setItem('apiTesterCollections', JSON.stringify(saved));
    const { useApiCollections } = await import('./store');
    expect(useApiCollections.getState().collections).toEqual(saved);
    expect(localStorage.getItem('apiTesterCollections')).toBeNull();
  });
  it('seeds the default collection for new users', async () => {
    const { useApiCollections } = await import('./store');
    expect(useApiCollections.getState().collections[0].name).toBe(
      'My Collection',
    );
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/tools/ApiTester` → Expected: FAIL.

- [ ] **Step 3: Implement** `request.ts`, `collections.ts` and `store.ts` to the interfaces above. Move the logic verbatim from `ApiTester.tsx:291-416` and `:440-544`, but make it immutable (map/filter, no `splice` or assignment into children). `sendRequest` steps:
  1. Validate the URL.
  2. Build the init.
  3. `fetch(url, { method, headers, body, signal })`.
  4. Read the headers.
  5. Parse JSON when the content type includes `application/json`, else text. GraphQL always parses JSON, as today.
  6. In `catch`: if `signal.aborted`, throw `new ToolError('CANCELLED', 'Cancelled')`. Otherwise return the status-0 response with `err.message`.

Rewire `ApiTester.tsx`:

- Replace `useLocalStorage` (60, 237-262) with `const collections = useApiCollections((s) => s.collections); const { setCollections } = useApiCollections.getState();`.
- Replace `response`/`isLoading` and `sendRequest` (303-416) with:

  ```ts
  const job = useJob((ctx, input: RequestInput) =>
    sendRequest(input, ctx.signal),
  );
  ```

- The send button calls `job.run({ requestType, method, url, params, headers, bodyType, body, graphqlQuery, graphqlVariables })`.
- While running, show a **Cancel** button (kit `Button variant="soft"`) that calls `job.cancel()`.
- `response` → `job.result`. `isLoading` → `job.status === 'running'`.
- If `job.error`, an effect calls `notify.error(job.error)`. This covers the INVALID_INPUT messages that were `window.alert` before.
- Handlers:
  - `handleSaveRequest`: `if (!saveName) return notify.error('Please enter a name');`. Then `try { setCollections(addRequest(collections, selectedCollectionId || null, newReq)); … } catch (e) { notify.error(toToolError(e)); }`.
  - `handleCreateCollection` → `addCollection`.
  - `handleDelete(id)` → `deleteNode` (B6).
  - `handleCreateNewRequest` → `addRequest(collections, collections[0]?.id ?? null, newReq)` when collections exist.
- Delete `src/hooks/useLocalStorage.hook.tsx`.

- [ ] **Step 4: Verify.** `grep -rn "window.alert\|useLocalStorage" src` → Expected: nothing. Run `pnpm typecheck && pnpm test && pnpm test:e2e test/e2e/smoke.spec.ts` → Expected: PASS.

- [ ] **Step 5: Commit** — `refactor(api-request): useJob requests, notify errors, store-kit collections with legacy import` (trailer).

---

### Task 9: Calculator store, Log Parser dead `darkMode`, Dashboard favorites

**Files:**

- Create: `src/tools/Calculator/store.ts`, `src/tools/Calculator/store.test.ts`
- Modify:
  - `src/tools/Calculator/hooks/useCalculator.ts`
  - `src/tools/LogParser/hooks/useLogParser.ts`
  - `src/app/Dashboard.tsx`
  - `src/app/ToolLayout.tsx`

**Interfaces:**

- Produces `useCalculatorStore = createToolStore<CalculatorPersisted, CalculatorPersistActions>`, where:
  - `CalculatorPersisted = { history: CalculationHistoryItem[]; saved: SavedCalculation[]; memories: MemoryRegister[] }`
  - The actions are `setHistory`, `setSaved` and `setMemories`. Each accepts a value or an updater `(prev) => next`, mirroring React `setState`, so the call sites in `useCalculator` stay unchanged.
  - `toolId: 'calculator'`.
  - Initial memories: `[{label:'M1',value:null},{label:'M2',value:null},{label:'M3',value:null}]`.
  - `legacy`: keys `['calcHistory', 'savedCalculations', 'memories']`. `read` parses each non-null key into its field and returns `null` if all three are null.

- [ ] **Step 0:** Confirm `createToolStore` with `legacy`.

- [ ] **Step 1: Failing test** — `src/tools/Calculator/store.test.ts`

```ts
/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('calculator store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });
  it('imports the three legacy keys and removes them', async () => {
    localStorage.setItem('calcHistory', JSON.stringify(['1+1=2']));
    localStorage.setItem(
      'savedCalculations',
      JSON.stringify([{ calculation: '2*3=6', isFavorite: true }]),
    );
    localStorage.setItem(
      'memories',
      JSON.stringify([
        { label: 'M1', value: 5 },
        { label: 'M2', value: null },
        { label: 'M3', value: null },
      ]),
    );
    const { useCalculatorStore } = await import('./store');
    const s = useCalculatorStore.getState();
    expect(s.history).toEqual(['1+1=2']);
    expect(s.saved[0].calculation).toBe('2*3=6');
    expect(s.memories[0].value).toBe(5);
    ['calcHistory', 'savedCalculations', 'memories'].forEach((k) =>
      expect(localStorage.getItem(k)).toBeNull(),
    );
  });
  it('keeps defaults for fields whose key is absent', async () => {
    localStorage.setItem('calcHistory', JSON.stringify(['x']));
    const { useCalculatorStore } = await import('./store');
    expect(useCalculatorStore.getState().memories).toHaveLength(3);
  });
  it('updater form works like setState', async () => {
    const { useCalculatorStore } = await import('./store');
    useCalculatorStore.getState().setHistory((h) => [...h, 'a']);
    expect(useCalculatorStore.getState().history).toEqual(['a']);
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/tools/Calculator` → Expected: FAIL.

- [ ] **Step 3: Implement** `store.ts` to the interface. In `useCalculator.ts`:
  - Replace the `calculationHistory`, `savedCalculations` and `memories` `useState`s (31-47) with selectors on `useCalculatorStore`. Keep the local names via aliases so the rest of the hook is unchanged: `const calculationHistory = useCalculatorStore((s) => s.history); const setCalculationHistory = useCalculatorStore.getState().setHistory;` and the same for the other two.
  - Delete the four localStorage effects (79-104). This fixes the `set-state-in-effect` warning at `useCalculator.ts:82`.

**Log Parser** (`hooks/useLogParser.ts`):

- Delete the `darkMode` state (23-31) and its effect (66-74), and remove `darkMode`/`setDarkMode` from the returned object (152). B8.
- Remove the then-unused imports.
- `grep -n "darkMode" src/tools/LogParser` → Expected: nothing.

**Dashboard** (`src/app/Dashboard.tsx:47,55-58`):

- Keep the key `favoriteTools` for data continuity. Replace the load effect with a lazy initialiser; this fixes the `set-state-in-effect` warning at line 57:

  ```ts
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('favoriteTools');
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  });
  ```

**ToolLayout** (`src/app/ToolLayout.tsx:59-61`): replace `useState<number>(Date.now())` with a counter. This fixes `react-hooks/purity` at line 59.

```ts
const [key, setKey] = useState(0);
const handleRetry = () => setKey((k) => k + 1);
```

- [ ] **Step 4:** Run `pnpm test && pnpm typecheck && pnpm lint 2>&1 | grep -E "Dashboard|ToolLayout|useCalculator.ts:82"` → Expected: tests pass and none of those three warnings remain.

- [ ] **Step 5: Commit** — `refactor: calculator store-kit with legacy keys; drop LogParser darkMode; dashboard/layout lint fixes` (trailer).

---

### Task 10: PR A verification

- [ ] **Step 1: Grep gates**

```bash
grep -rn "createElement('a')\|createElement(\"a\")\|navigator.clipboard\|FileReader\|formatFileSize\|window.alert\|useLocalStorage" src/tools src/app | grep -v PdfCompressor
grep -rn "from 'sonner'" src | grep -v "src/shared/lib/notify.ts\|src/app/App.tsx"
grep -rn 'type="file"' src | grep -v "src/shared/ui"
```

Expected: each returns nothing. PdfCompressor is phase-3 territory: it is disabled and the phase-3 Security PR rebuilds it.

- [ ] **Step 2: Merge gate.** Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then `pnpm test:e2e` three times. Expected: all green, and lint has 0 warnings in files touched by Tasks 1–9.

- [ ] **Step 3:** Open PR A into `master`. Body: summary, the B1–B4, B6, B8 and B10 rows, the test counts, and this trailer:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Merge it after the gate.

---

# PR B — Pomodoro → store-kit, Redux removed (`feat/phase4-pomodoro`)

**Audit summary of the current pomodoro**

- **Files.** `src/tools/pomodoro/`:
  - `main.tsx` (938 lines; `Provider` + `PersistGate` at 911-934)
  - `store/index.ts` (redux-persist key `pomodoro-store`, stored as `persist:pomodoro-store`, with an inline WebStorage adapter)
  - 4 slices
  - 2 listener middlewares (`pomodoro-middleware.ts` 153 lines, `task-middleware.ts` 86 lines)
  - `hook.ts`
  - `hooks/usePomodoro.tsx` (worker wiring)
  - `hooks/timerWorker.ts` (logs every tick with `console.log`)
  - `Audio.ts` (a 2 MB base64 WAV in the JS chunk)
- **Defects behind B5.**
  1. The work-completion path runs twice. `pomodoro-middleware.ts:34-90` increments stats and task on `timeLeft → 0`, and `main.tsx:233-278` (`handleTimerComplete`) increments them again from a stale closure. Both play the sound.
  2. `handleTimerComplete` increments the current task even after a **break** (`main.tsx:258-269`, outside the `mode === 'work'` branch).
  3. Auto-start never actually counts down. After completion `isActive` stays `true`, so the `[timer.isActive]` effect (`usePomodoro.tsx:39-47`) never re-posts `START`, while the worker is recreated on the `mode` change.
  4. The streak never increments. `pomodoro-middleware.ts:132-153` checks "new day" against a `lastUpdate` that the same `updateStats` just set to now.
  5. The day-rollover listener (`:94-114`) never updates `lastUpdate` when yesterday had pomodoros, so it fires on every action until a decrement happens.
- **Semantics this plan keeps.** Durations come from settings. A completed or skipped work session moves to a short break (never automatically to a long break, as today); a break moves to work. The auto-start flags are kept. The Start guard is kept: work mode needs a current task. Changing settings while paused resets `timeLeft` for the current mode. Selecting a mode resets and pauses. Reset restores the current mode's duration and pauses. Completing the current task (manually or by pomodoros) moves `currentTask` to the next incomplete task. Deleting the current task does the same. The weekly counter never resets (as today). The timer state, including `isActive`, is persisted, so a running timer resumes after reload (as today).

### Task 11: Pomodoro types and pure session logic

**Files:**

- Create: `src/tools/pomodoro/types.ts`, `src/tools/pomodoro/lib/session.ts`, `src/tools/pomodoro/lib/session.test.ts`, `src/tools/pomodoro/lib/time.ts`, `src/tools/pomodoro/lib/time.test.ts`

**Interfaces:**

- `types.ts` carries `Task`, `Settings`, `TimerState`, `Stats` (moved verbatim from `src/types/PomodoroTypes.ts`, minus the unused `Store` interface), plus:
  - `TimerMode = TimerState['mode']`
  - `PomodoroState = { timer: TimerState; settings: Settings; tasks: Task[]; stats: Stats }`
- `lib/time.ts`:
  - `formatTime(seconds: number): string` (moved from `main.tsx:104-108`)
  - `isSameDay(a: number, b: number): boolean` (local calendar day)
- `lib/session.ts` contains pure functions. Each returns only the slices it changes, so callers can `set(fn(state))`:
  - `DEFAULT_SETTINGS: Settings`, which is the defaults from `settingsSlice.ts`.
  - `defaultState(now: number): PomodoroState`. The timer is `{ mode: 'work', timeLeft: 1500, isActive: false, currentTask: null }`. Stats are zeros with `lastUpdate: now`. Tasks are `[]`.
  - `durationFor(mode, settings): number` (seconds)
  - `canStart(timer): boolean`, which is `!(timer.mode === 'work' && !timer.currentTask)`
  - `nextIncompleteTaskId(tasks): string | null`
  - `rolloverDay(stats, now): Stats`
  - `completeSession(s: PomodoroState, now: number): Pick<PomodoroState, 'timer' | 'stats' | 'tasks'>`
  - `applySettings(s, patch): Pick<PomodoroState, 'settings' | 'timer'>`
  - `selectMode(s, mode): Pick<PomodoroState, 'timer'>`
  - `resetTimer(s): Pick<PomodoroState, 'timer'>`
  - `addTask(s, title, id): Pick<PomodoroState, 'tasks'>`
  - `toggleTask(s, id): Pick<PomodoroState, 'tasks' | 'timer'>`
  - `deleteTask(s, id): Pick<PomodoroState, 'tasks' | 'timer'>`

- [ ] **Step 0:** Re-read `main.tsx:203-300,447-530`, `store/slices/*.ts` and `store/middleware/*.ts` to confirm the semantics listed above.

- [ ] **Step 1: Failing tests** — `lib/time.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { formatTime, isSameDay } from './time';

describe('time', () => {
  it('formats mm:ss', () => {
    expect(formatTime(1500)).toBe('25:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(0)).toBe('00:00');
  });
  it('compares local calendar days', () => {
    const d = new Date(2026, 9, 1, 23, 59).getTime();
    expect(isSameDay(d, new Date(2026, 9, 1, 0, 1).getTime())).toBe(true);
    expect(isSameDay(d, new Date(2026, 9, 2, 0, 0).getTime())).toBe(false);
  });
});
```

Confirm `formatTime`'s exact output format against `main.tsx:104-108` before asserting. If it does not zero-pad minutes, change the expectations to match the current function. The function moves verbatim.

`lib/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addTask,
  applySettings,
  canStart,
  completeSession,
  defaultState,
  deleteTask,
  durationFor,
  resetTimer,
  rolloverDay,
  selectMode,
  toggleTask,
} from './session';
import type { PomodoroState, Task } from '../types';

const DAY1 = new Date(2026, 9, 1, 10).getTime();
const DAY1_LATER = new Date(2026, 9, 1, 18).getTime();
const DAY2 = new Date(2026, 9, 2, 9).getTime();

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  completed: false,
  pomodoros: 2,
  completedPomodoros: 0,
  ...over,
});
const state = (over: Partial<PomodoroState> = {}): PomodoroState => ({
  ...defaultState(DAY1),
  ...over,
});

describe('durations and guards', () => {
  it('derives seconds from settings', () => {
    const s = state();
    expect(durationFor('work', s.settings)).toBe(25 * 60);
    expect(durationFor('shortBreak', s.settings)).toBe(5 * 60);
    expect(durationFor('longBreak', s.settings)).toBe(15 * 60);
  });
  it('needs a current task to start work, not a break', () => {
    const s = state();
    expect(canStart(s.timer)).toBe(false);
    expect(canStart({ ...s.timer, currentTask: 't' })).toBe(true);
    expect(canStart({ ...s.timer, mode: 'shortBreak' })).toBe(true);
  });
});

describe('completeSession', () => {
  it('work → short break: +1 daily/weekly, focus += workDuration, task +1, streak +1 on first of day', () => {
    const s = state({
      tasks: [task('a')],
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: 'a' },
    });
    const r = completeSession(s, DAY1_LATER);
    expect(r.stats).toMatchObject({
      dailyPomodoros: 1,
      weeklyPomodoros: 1,
      totalFocusTime: 25,
      currentStreak: 1,
      lastUpdate: DAY1_LATER,
    });
    expect(r.tasks[0]).toMatchObject({
      completedPomodoros: 1,
      completed: false,
    });
    expect(r.timer).toEqual({
      mode: 'shortBreak',
      timeLeft: 300,
      isActive: true, // autoStartBreaks default true
      currentTask: 'a',
    });
  });
  it('second work session the same day does not bump the streak again', () => {
    const s = state({
      stats: {
        dailyPomodoros: 1,
        weeklyPomodoros: 1,
        totalFocusTime: 25,
        currentStreak: 1,
        lastUpdate: DAY1,
      },
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: null },
    });
    expect(completeSession(s, DAY1_LATER).stats.currentStreak).toBe(1);
  });
  it('finishing the last pomodoro completes the task and moves to the next incomplete one', () => {
    const s = state({
      tasks: [
        task('a', { completedPomodoros: 1 }),
        task('b', { completed: true }),
        task('c'),
      ],
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: 'a' },
    });
    const r = completeSession(s, DAY1);
    expect(r.tasks[0]).toMatchObject({
      completed: true,
      completedPomodoros: 2,
    });
    expect(r.timer.currentTask).toBe('c');
  });
  it('break → work does NOT touch tasks or stats (B5)', () => {
    const s = state({
      tasks: [task('a')],
      timer: {
        mode: 'shortBreak',
        timeLeft: 0,
        isActive: true,
        currentTask: 'a',
      },
    });
    const r = completeSession(s, DAY1);
    expect(r.tasks).toBe(s.tasks);
    expect(r.stats.dailyPomodoros).toBe(0);
    expect(r.timer).toEqual({
      mode: 'work',
      timeLeft: 1500,
      isActive: false, // autoStartPomodoros default false
      currentTask: 'a',
    });
  });
  it('rolls the day over before counting', () => {
    const s = state({
      stats: {
        dailyPomodoros: 3,
        weeklyPomodoros: 3,
        totalFocusTime: 75,
        currentStreak: 2,
        lastUpdate: DAY1,
      },
      timer: { mode: 'work', timeLeft: 0, isActive: true, currentTask: null },
    });
    expect(completeSession(s, DAY2).stats).toMatchObject({
      dailyPomodoros: 1,
      weeklyPomodoros: 4,
      currentStreak: 3,
    });
  });
});

describe('rolloverDay', () => {
  const base = {
    dailyPomodoros: 0,
    weeklyPomodoros: 5,
    totalFocusTime: 100,
    currentStreak: 3,
    lastUpdate: DAY1,
  };
  it('is a no-op on the same day', () => {
    expect(rolloverDay(base, DAY1_LATER)).toBe(base);
  });
  it('after a zero day: reset daily, streak −1, lastUpdate = now', () => {
    expect(rolloverDay(base, DAY2)).toEqual({
      ...base,
      currentStreak: 2,
      lastUpdate: DAY2,
    });
  });
  it('after a productive day: reset daily, keep streak', () => {
    expect(rolloverDay({ ...base, dailyPomodoros: 4 }, DAY2)).toEqual({
      ...base,
      dailyPomodoros: 0,
      lastUpdate: DAY2,
    });
  });
  it('never goes below zero', () => {
    expect(rolloverDay({ ...base, currentStreak: 0 }, DAY2).currentStreak).toBe(
      0,
    );
  });
});

describe('settings, mode, reset', () => {
  it('settings change while paused resets timeLeft for the current mode', () => {
    const r = applySettings(state(), { workDuration: 30 });
    expect(r.settings.workDuration).toBe(30);
    expect(r.timer.timeLeft).toBe(1800);
  });
  it('settings change while running keeps timeLeft', () => {
    const s = state({
      timer: { mode: 'work', timeLeft: 42, isActive: true, currentTask: 't' },
    });
    expect(applySettings(s, { workDuration: 30 }).timer.timeLeft).toBe(42);
  });
  it('selecting a mode pauses and loads its duration', () => {
    const s = state({
      timer: { mode: 'work', timeLeft: 42, isActive: true, currentTask: 't' },
    });
    expect(selectMode(s, 'longBreak').timer).toEqual({
      mode: 'longBreak',
      timeLeft: 900,
      isActive: false,
      currentTask: 't',
    });
  });
  it('reset restores the current mode duration and pauses', () => {
    const s = state({
      timer: {
        mode: 'shortBreak',
        timeLeft: 7,
        isActive: true,
        currentTask: null,
      },
    });
    expect(resetTimer(s).timer).toMatchObject({
      timeLeft: 300,
      isActive: false,
      mode: 'shortBreak',
    });
  });
});

describe('tasks', () => {
  it('adds a task with defaults', () => {
    expect(addTask(state(), 'Write', 'id1').tasks).toEqual([
      {
        id: 'id1',
        title: 'Write',
        completed: false,
        pomodoros: 1,
        completedPomodoros: 0,
      },
    ]);
  });
  it('completing the current task moves currentTask to the next incomplete', () => {
    const s = state({
      tasks: [task('a'), task('b')],
      timer: {
        mode: 'work',
        timeLeft: 1500,
        isActive: false,
        currentTask: 'a',
      },
    });
    const r = toggleTask(s, 'a');
    expect(r.tasks[0].completed).toBe(true);
    expect(r.timer.currentTask).toBe('b');
  });
  it('un-completing a task leaves currentTask alone', () => {
    const s = state({
      tasks: [task('a', { completed: true }), task('b')],
      timer: {
        mode: 'work',
        timeLeft: 1500,
        isActive: false,
        currentTask: 'b',
      },
    });
    expect(toggleTask(s, 'a').timer.currentTask).toBe('b');
  });
  it('deleting the current task moves to the next incomplete (or null)', () => {
    const s = state({
      tasks: [task('a')],
      timer: {
        mode: 'work',
        timeLeft: 1500,
        isActive: false,
        currentTask: 'a',
      },
    });
    const r = deleteTask(s, 'a');
    expect(r.tasks).toEqual([]);
    expect(r.timer.currentTask).toBeNull();
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/tools/pomodoro` → Expected: FAIL.

- [ ] **Step 3: Implement** `lib/time.ts` (move `formatTime` verbatim, add `isSameDay`) and `lib/session.ts`:

```ts
import type {
  PomodoroState,
  Settings,
  Stats,
  Task,
  TimerMode,
  TimerState,
} from '../types';
import { isSameDay } from './time';

export const DEFAULT_SETTINGS: Settings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: true,
  autoStartPomodoros: false,
  soundEnabled: true,
};

export const defaultState = (now: number): PomodoroState => ({
  timer: {
    mode: 'work',
    timeLeft: 25 * 60,
    isActive: false,
    currentTask: null,
  },
  settings: DEFAULT_SETTINGS,
  tasks: [],
  stats: {
    dailyPomodoros: 0,
    weeklyPomodoros: 0,
    totalFocusTime: 0,
    currentStreak: 0,
    lastUpdate: now,
  },
});

export const durationFor = (mode: TimerMode, s: Settings): number =>
  ({
    work: s.workDuration,
    shortBreak: s.shortBreakDuration,
    longBreak: s.longBreakDuration,
  })[mode] * 60;

export const canStart = (t: TimerState) =>
  !(t.mode === 'work' && !t.currentTask);

export const nextIncompleteTaskId = (tasks: Task[]): string | null =>
  tasks.find((t) => !t.completed)?.id ?? null;

export function rolloverDay(stats: Stats, now: number): Stats {
  if (isSameDay(stats.lastUpdate, now)) return stats;
  return {
    ...stats,
    dailyPomodoros: 0,
    currentStreak:
      stats.dailyPomodoros === 0
        ? Math.max(0, stats.currentStreak - 1)
        : stats.currentStreak,
    lastUpdate: now,
  };
}

export function completeSession(
  s: PomodoroState,
  now: number,
): Pick<PomodoroState, 'timer' | 'stats' | 'tasks'> {
  const day = rolloverDay(s.stats, now);
  if (s.timer.mode !== 'work') {
    return {
      stats: day,
      tasks: s.tasks,
      timer: {
        ...s.timer,
        mode: 'work',
        timeLeft: durationFor('work', s.settings),
        isActive: s.settings.autoStartPomodoros,
      },
    };
  }
  const stats: Stats = {
    ...day,
    dailyPomodoros: day.dailyPomodoros + 1,
    weeklyPomodoros: day.weeklyPomodoros + 1,
    totalFocusTime: day.totalFocusTime + s.settings.workDuration,
    currentStreak:
      day.dailyPomodoros === 0 ? day.currentStreak + 1 : day.currentStreak,
    lastUpdate: now,
  };
  let tasks = s.tasks;
  let currentTask = s.timer.currentTask;
  const current = tasks.find((t) => t.id === currentTask);
  if (current) {
    const done = current.completedPomodoros + 1;
    const completed = done >= current.pomodoros;
    tasks = tasks.map((t) =>
      t.id === current.id ? { ...t, completedPomodoros: done, completed } : t,
    );
    if (completed) currentTask = nextIncompleteTaskId(tasks);
  }
  return {
    stats,
    tasks,
    timer: {
      ...s.timer,
      currentTask,
      mode: 'shortBreak',
      timeLeft: durationFor('shortBreak', s.settings),
      isActive: s.settings.autoStartBreaks,
    },
  };
}

export function applySettings(
  s: PomodoroState,
  patch: Partial<Settings>,
): Pick<PomodoroState, 'settings' | 'timer'> {
  const settings = { ...s.settings, ...patch };
  return {
    settings,
    timer: s.timer.isActive
      ? s.timer
      : { ...s.timer, timeLeft: durationFor(s.timer.mode, settings) },
  };
}

export const selectMode = (
  s: PomodoroState,
  mode: TimerMode,
): Pick<PomodoroState, 'timer'> => ({
  timer: {
    ...s.timer,
    mode,
    timeLeft: durationFor(mode, s.settings),
    isActive: false,
  },
});

export const resetTimer = (s: PomodoroState): Pick<PomodoroState, 'timer'> => ({
  timer: {
    ...s.timer,
    timeLeft: durationFor(s.timer.mode, s.settings),
    isActive: false,
  },
});

export const addTask = (
  s: PomodoroState,
  title: string,
  id: string,
): Pick<PomodoroState, 'tasks'> => ({
  tasks: [
    ...s.tasks,
    { id, title, completed: false, pomodoros: 1, completedPomodoros: 0 },
  ],
});

export function toggleTask(
  s: PomodoroState,
  id: string,
): Pick<PomodoroState, 'tasks' | 'timer'> {
  const tasks = s.tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t,
  );
  const nowCompleted = tasks.find((t) => t.id === id)?.completed;
  const timer =
    nowCompleted && s.timer.currentTask === id
      ? { ...s.timer, currentTask: nextIncompleteTaskId(tasks) }
      : s.timer;
  return { tasks, timer };
}

export function deleteTask(
  s: PomodoroState,
  id: string,
): Pick<PomodoroState, 'tasks' | 'timer'> {
  const tasks = s.tasks.filter((t) => t.id !== id);
  const timer =
    s.timer.currentTask === id
      ? { ...s.timer, currentTask: nextIncompleteTaskId(tasks) }
      : s.timer;
  return { tasks, timer };
}
```

`types.ts` moves `Task`, `Settings`, `TimerState` and `Stats` from `src/types/PomodoroTypes.ts` and adds `TimerMode` and `PomodoroState`. Do **not** delete `src/types/PomodoroTypes.ts` yet; Task 13 rewires its importers.

- [ ] **Step 4:** Run `pnpm test src/tools/pomodoro` → Expected: PASS.

- [ ] **Step 5: Commit** — `feat(pomodoro): pure session logic with tests` (trailer).

---

### Task 12: Pomodoro store with redux-persist migration

**Files:**

- Create: `src/tools/pomodoro/lib/legacy.ts`, `src/tools/pomodoro/lib/legacy.test.ts`, `src/tools/pomodoro/store.ts`, `src/tools/pomodoro/store.test.ts`

**Interfaces:**

- `LEGACY_KEY = 'persist:pomodoro-store'`
- `parseLegacyPomodoro(raw: string | null, now: number): PomodoroState | null`. redux-persist v6 stores `JSON.stringify({ timer: JSON.stringify(timer), settings: JSON.stringify(settings), tasks: JSON.stringify(tasks), stats: JSON.stringify(stats), _persist: JSON.stringify({ version: -1, rehydrated: true }) })`. The parser:
  1. Decodes each slice.
  2. Merges each over `defaultState(now)` field by field, so missing fields take defaults.
  3. Drops invalid slices: tasks not an array, a timer `mode` that is not one of the three, non-numeric numbers.
  4. Returns `null` when no slice survives.
- `usePomodoroStore`. It is created with `createToolStore<PomodoroState, PomodoroActions>({ toolId: 'pomodoro', initial: defaultState(Date.now()), actions, persist: { version: 1 }, legacy: { keys: [LEGACY_KEY], read: (raw) => parseLegacyPomodoro(raw[LEGACY_KEY], Date.now()) } })`.
- `PomodoroActions` is a set of thin wrappers over `lib/session`:
  - `tick(timeLeft: number, now?: number)`: sets `timer.timeLeft` and applies `rolloverDay`.
  - `complete(now?: number)`
  - `toggle()`: no-op when starting and `!canStart`.
  - `selectMode(mode)`, `resetTimer()`, `updateSettings(patch)`
  - `addTask(title)`: id from `newId()`.
  - `toggleTask(id)`, `deleteTask(id)`, `setCurrentTask(id | null)`
  - `rollover(now?: number)`

- [ ] **Step 1: Failing tests** — `lib/legacy.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { parseLegacyPomodoro } from './legacy';

const NOW = new Date(2026, 9, 1, 12).getTime();
const persisted = (slices: Record<string, unknown>) =>
  JSON.stringify({
    ...Object.fromEntries(
      Object.entries(slices).map(([k, v]) => [k, JSON.stringify(v)]),
    ),
    _persist: JSON.stringify({ version: -1, rehydrated: true }),
  });

describe('parseLegacyPomodoro', () => {
  it('decodes redux-persist double-encoded slices', () => {
    const r = parseLegacyPomodoro(
      persisted({
        timer: {
          mode: 'shortBreak',
          timeLeft: 120,
          isActive: false,
          currentTask: 't1',
        },
        settings: {
          workDuration: 50,
          shortBreakDuration: 10,
          longBreakDuration: 20,
          autoStartBreaks: false,
          autoStartPomodoros: true,
          soundEnabled: false,
        },
        tasks: [
          {
            id: 't1',
            title: 'Write',
            completed: false,
            pomodoros: 3,
            completedPomodoros: 1,
          },
        ],
        stats: {
          dailyPomodoros: 2,
          weeklyPomodoros: 9,
          totalFocusTime: 300,
          currentStreak: 4,
          lastUpdate: NOW - 1000,
        },
      }),
      NOW,
    );
    expect(r?.timer).toEqual({
      mode: 'shortBreak',
      timeLeft: 120,
      isActive: false,
      currentTask: 't1',
    });
    expect(r?.settings.workDuration).toBe(50);
    expect(r?.tasks[0].title).toBe('Write');
    expect(r?.stats.currentStreak).toBe(4);
  });
  it('fills missing fields from defaults', () => {
    const r = parseLegacyPomodoro(
      persisted({ settings: { workDuration: 40 } }),
      NOW,
    );
    expect(r?.settings).toMatchObject({
      workDuration: 40,
      shortBreakDuration: 5,
      soundEnabled: true,
    });
    expect(r?.tasks).toEqual([]);
  });
  it('drops invalid slices', () => {
    const r = parseLegacyPomodoro(
      persisted({
        tasks: 'nope',
        timer: { mode: 'party', timeLeft: 1 },
        settings: { workDuration: 30 },
      }),
      NOW,
    );
    expect(r?.tasks).toEqual([]);
    expect(r?.timer.mode).toBe('work');
    expect(r?.settings.workDuration).toBe(30);
  });
  it('returns null for absent data and throws on malformed JSON', () => {
    expect(parseLegacyPomodoro(null, NOW)).toBeNull();
    expect(
      parseLegacyPomodoro(JSON.stringify({ _persist: '{}' }), NOW),
    ).toBeNull();
    expect(() => parseLegacyPomodoro('{oops', NOW)).toThrow();
  });
});
```

The malformed case throws on purpose. `createToolStore`'s `legacy` handling catches it, warns, and keeps the legacy key (Task 3).

`store.test.ts`:

```ts
/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('pomodoro store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('migrates persist:pomodoro-store into kit:store:tool:pomodoro', async () => {
    localStorage.setItem(
      'persist:pomodoro-store',
      JSON.stringify({
        tasks: JSON.stringify([
          {
            id: 'a',
            title: 'Keep me',
            completed: false,
            pomodoros: 1,
            completedPomodoros: 0,
          },
        ]),
        _persist: JSON.stringify({ version: -1, rehydrated: true }),
      }),
    );
    const { usePomodoroStore } = await import('./store');
    expect(usePomodoroStore.getState().tasks[0].title).toBe('Keep me');
    expect(localStorage.getItem('persist:pomodoro-store')).toBeNull();
    expect(localStorage.getItem('kit:store:tool:pomodoro')).toContain(
      'Keep me',
    );
  });

  it('toggle refuses to start work without a task, then starts once a task is current', async () => {
    const { usePomodoroStore } = await import('./store');
    const s = usePomodoroStore.getState();
    s.toggle();
    expect(usePomodoroStore.getState().timer.isActive).toBe(false);
    s.addTask('T');
    s.setCurrentTask(usePomodoroStore.getState().tasks[0].id);
    usePomodoroStore.getState().toggle();
    expect(usePomodoroStore.getState().timer.isActive).toBe(true);
  });

  it('complete() applies the session transition', async () => {
    const { usePomodoroStore } = await import('./store');
    usePomodoroStore.getState().complete();
    expect(usePomodoroStore.getState().stats.dailyPomodoros).toBe(1);
    expect(usePomodoroStore.getState().timer.mode).toBe('shortBreak');
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/tools/pomodoro` → Expected: FAIL.

- [ ] **Step 3: Implement** `lib/legacy.ts` and `store.ts` to the interfaces. In `legacy.ts`, validate with small type guards (`isObject`, `num`, `bool`, `isMode`) and merge over `defaultState(now)`. Do not swallow `JSON.parse` errors.

- [ ] **Step 4:** Run `pnpm test src/tools/pomodoro && pnpm typecheck` → Expected: PASS.

- [ ] **Step 5: Commit** — `feat(pomodoro): store-kit store with one-time redux-persist migration` (trailer).

---

### Task 13: Pomodoro UI on the store; split `main.tsx`; worker hook; audio asset

**Files:**

- Create:
  - `src/tools/pomodoro/Tool.tsx`
  - `src/tools/pomodoro/components/ModeSelector.tsx`
  - `src/tools/pomodoro/components/TimerCard.tsx`
  - `src/tools/pomodoro/components/CurrentTaskCard.tsx`
  - `src/tools/pomodoro/components/TaskList.tsx`
  - `src/tools/pomodoro/components/TaskRow.tsx`
  - `src/tools/pomodoro/components/StatsPanel.tsx`
  - `src/tools/pomodoro/components/SettingsPanel.tsx`
  - `src/tools/pomodoro/components/MenuDrawer.tsx`
  - `src/tools/pomodoro/hooks/useTimerWorker.ts`
  - `src/tools/pomodoro/workers/timer.worker.ts`
  - `src/tools/pomodoro/assets/complete.wav`
  - `src/tools/pomodoro/lib/stats.ts`, `src/tools/pomodoro/lib/stats.test.ts`
  - `test/e2e/pomodoro.spec.ts`
- Modify: `src/tools/pomodoro/index.ts` (`load: () => import('./Tool')`)
- Delete:
  - `src/tools/pomodoro/main.tsx`
  - `src/tools/pomodoro/hook.ts`
  - `src/tools/pomodoro/hooks/usePomodoro.tsx`
  - `src/tools/pomodoro/hooks/timerWorker.ts`
  - `src/tools/pomodoro/store/` (all)
  - `src/tools/pomodoro/Audio.ts`
  - `src/types/PomodoroTypes.ts`

**Interfaces:**

- `useTimerWorker(): { skip(): void }` owns the worker:
  - Create the worker **once**, with `new Worker(new URL('../workers/timer.worker.ts', import.meta.url), { type: 'module' })`.
  - `TICK` → `usePomodoroStore.getState().tick(timeLeft)`, and set `document.title = \`Pomodoro - ${mode === 'work' ? 'Work' : 'Break'} - ${formatTime(timeLeft)}\``.
  - `COMPLETE` → `finish()`.
  - An effect on `[isActive, mode]` posts `STOP`, then `START { timeLeft }` when active. This fixes auto-start (B5).
  - `finish()` reads `soundEnabled` **before** `complete()`, calls `complete()`, then plays `new Audio(completeSoundUrl)` once if enabled. A `play()` rejection goes through `logToolError(toToolError(e))`: dev-only, never user-facing, since autoplay can be blocked by the browser.
  - `skip()` = `finish()`, as the old Skip button called `handleTimerComplete`, which also played the sound.
  - On unmount: terminate the worker and restore the original `document.title`.
  - On mount: call `rollover()` once.
- `lib/stats.ts` holds the pure derivations moved out of `main.tsx:561-590`:
  - `DAILY_GOAL = 8`
  - `focusScore(stats): number`
  - `averageDaily(stats): string`
  - `timePeriod(hour: number): 'morning' | 'afternoon' | 'evening'`
  - `progressToGoal(stats): number`

- [ ] **Step 0:** Confirm `logToolError`/`toToolError` exports in `@/shared/lib/errors`.

- [ ] **Step 1: Failing test** — `lib/stats.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { averageDaily, focusScore, progressToGoal, timePeriod } from './stats';

const s = (o = {}) => ({
  dailyPomodoros: 4,
  weeklyPomodoros: 20,
  totalFocusTime: 100,
  currentStreak: 2,
  lastUpdate: 0,
  ...o,
});

describe('pomodoro stats', () => {
  it('focus score = daily% + streak bonus (≤25) + weekly bonus (≤50), capped at 100', () => {
    expect(focusScore(s())).toBe(Math.min(Math.floor(50 + 10 + 20), 100));
    expect(
      focusScore(
        s({ dailyPomodoros: 8, currentStreak: 9, weeklyPomodoros: 80 }),
      ),
    ).toBe(100);
  });
  it('average daily over min(streak, 7) days, "0" without a streak', () => {
    expect(averageDaily(s())).toBe('10.0');
    expect(averageDaily(s({ currentStreak: 0 }))).toBe('0');
  });
  it('progress to the daily goal of 8', () => {
    expect(progressToGoal(s())).toBe(50);
  });
  it('time period by hour', () => {
    expect(timePeriod(9)).toBe('morning');
    expect(timePeriod(13)).toBe('afternoon');
    expect(timePeriod(20)).toBe('evening');
  });
});
```

- [ ] **Step 2:** Run `pnpm test src/tools/pomodoro/lib/stats` → Expected: FAIL. Then implement `lib/stats.ts` by moving the expressions verbatim. → PASS.

- [ ] **Step 3: Audio asset.** Decode the base64 WAV once:

```bash
mkdir -p src/tools/pomodoro/assets
node -e "const fs=require('fs');const s=fs.readFileSync('src/tools/pomodoro/Audio.ts','utf8');const b=s.slice(s.indexOf('base64,')+7,s.lastIndexOf('\"'));fs.writeFileSync('src/tools/pomodoro/assets/complete.wav',Buffer.from(b,'base64'))"
node -e "const b=require('fs').readFileSync('src/tools/pomodoro/assets/complete.wav');console.log(b.subarray(0,4).toString(),b.subarray(8,12).toString(),b.length)"
```

Expected output: `RIFF WAVE <~1.55 MB>`. Import it with `import completeSoundUrl from '../assets/complete.wav';`. Vite's `vite/client` types (already referenced in `src/vite-env.d.ts`) type `.wav` imports as URL strings.

- [ ] **Step 4: Worker.** Move `hooks/timerWorker.ts` → `workers/timer.worker.ts` with `git mv`. Delete the `log` helper and every `log(...)` call, because they print on every tick. Keep the START/STOP/TICK/COMPLETE protocol byte-for-byte.

- [ ] **Step 5: Split `main.tsx` into components.** Move each block verbatim, then replace Redux with store selectors:

| From `main.tsx`                                | To                               | Store usage                                                                                                                                                                                                                             |
| ---------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MODE_INFO` (75-102), `ModeSelector` (110-133) | `components/ModeSelector.tsx`    | props only (`currentMode`, `onChange`)                                                                                                                                                                                                  |
| `CurrentTaskCard` (135-201)                    | `components/CurrentTaskCard.tsx` | `usePomodoroStore((s) => s.timer.currentTask)`, `(s) => s.tasks`, `getState().setCurrentTask`                                                                                                                                           |
| `Timer` (203-390)                              | `components/TimerCard.tsx`       | selectors for `timer`, `settings`, `stats`, `currentTask`; actions `selectMode`, `toggle`, `resetTimer`; `const { skip } = useTimerWorker()`; progress `((durationFor(mode, settings) - timeLeft) / durationFor(mode, settings)) * 100` |
| `TaskRow` (392-445)                            | `components/TaskRow.tsx`         | props only                                                                                                                                                                                                                              |
| `TaskList` (447-531)                           | `components/TaskList.tsx`        | `(s) => s.tasks`; actions `addTask(title)`, `toggleTask(id)`, `deleteTask(id)`                                                                                                                                                          |
| `StatTile` (533-559), `Stats` (561-686)        | `components/StatsPanel.tsx`      | `(s) => s.stats`, `(s) => s.settings`; derived via `lib/stats.ts`                                                                                                                                                                       |
| `Settings` (688-848)                           | `components/SettingsPanel.tsx`   | `(s) => s.settings`; `update = getState().updateSettings`                                                                                                                                                                               |
| `MenuDrawer` (850-906)                         | `components/MenuDrawer.tsx`      | renders `TaskList`, `StatsPanel`, `SettingsPanel`                                                                                                                                                                                       |
| `Main` (908-938)                               | `Tool.tsx` (default export)      | no `Provider` or `PersistGate`: the store hydrates synchronously                                                                                                                                                                        |

Selector rule: never return a fresh object from a selector, or zustand loops. Use one selector per slice, e.g. `const timer = usePomodoroStore((s) => s.timer);`, or `useShallow` from `zustand/react/shallow`.

Inline styles from the audit, fixed here:

- `main.tsx:327` `style={{ fontVariantNumeric: 'tabular-nums' }}` → `className="tabular-nums"`.
- `main.tsx:413-417` → `className={task.completed ? 'line-through opacity-60' : undefined}`.

Confirm the kit `Heading`/`Text` forward `className` (read `src/shared/ui/typography.tsx`).

- [ ] **Step 6: Rewire the manifest and delete Redux files.** In `index.ts`, set `load: () => import('./Tool')`. Delete `main.tsx`, `hook.ts`, `hooks/usePomodoro.tsx`, `store/`, `Audio.ts` and `src/types/PomodoroTypes.ts`. Then run:

```bash
grep -rn "redux\|useAppSelector\|useAppDispatch\|PomodoroTypes\|AUDIO_BASE_64" src
```

Expected: nothing.

- [ ] **Step 7: e2e** — `test/e2e/pomodoro.spec.ts`

```ts
import { expect, test } from '@playwright/test';

const legacy = JSON.stringify({
  timer: JSON.stringify({
    mode: 'work',
    timeLeft: 1800,
    isActive: false,
    currentTask: 't1',
  }),
  settings: JSON.stringify({
    workDuration: 30,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: true,
    autoStartPomodoros: false,
    soundEnabled: false,
  }),
  tasks: JSON.stringify([
    {
      id: 't1',
      title: 'Write report',
      completed: false,
      pomodoros: 2,
      completedPomodoros: 1,
    },
  ]),
  stats: JSON.stringify({
    dailyPomodoros: 0,
    weeklyPomodoros: 3,
    totalFocusTime: 90,
    currentStreak: 1,
    lastUpdate: Date.now(),
  }),
  _persist: JSON.stringify({ version: -1, rehydrated: true }),
});

test('existing redux-persist data survives the migration', async ({ page }) => {
  await page.addInitScript((value) => {
    if (!localStorage.getItem('kit:store:tool:pomodoro')) {
      localStorage.setItem('persist:pomodoro-store', value);
    }
  }, legacy);
  await page.goto('/pomodoro');
  await expect(page.getByText('30:00')).toBeVisible();
  await expect(page.getByText('Write report')).toBeVisible();
  await expect(page.getByText('1/2 pomodoros')).toBeVisible();
  const keys = await page.evaluate(() => ({
    legacy: localStorage.getItem('persist:pomodoro-store'),
    kit: localStorage.getItem('kit:store:tool:pomodoro'),
  }));
  expect(keys.legacy).toBeNull();
  expect(keys.kit).toContain('Write report');
});

test('start counts down and pause stops; state persists across reload', async ({
  page,
}) => {
  await page.addInitScript((value) => {
    if (!localStorage.getItem('kit:store:tool:pomodoro')) {
      localStorage.setItem('persist:pomodoro-store', value);
    }
  }, legacy);
  await page.goto('/pomodoro');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('30:00')).toHaveCount(0, { timeout: 5_000 });
  await page.getByRole('button', { name: 'Pause' }).click();
  const shown = await page
    .getByRole('heading', { level: 1 })
    .last()
    .textContent();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 }).last()).toHaveText(
    shown!,
  );
});
```

The timer heading is a second `h1` inside the tool; ToolLayout renders the first. Read `TimerCard.tsx` and use the locator that matches.

- [ ] **Step 8:** Run `pnpm typecheck && pnpm test && pnpm test:e2e test/e2e/pomodoro.spec.ts test/e2e/smoke.spec.ts` → Expected: PASS. Then run a manual pass with `pnpm dev`: start, wait for a 1-minute work session (set work = 1), confirm the break auto-starts and counts down, the sound plays once, and the task progress increments once.

- [ ] **Step 9: Commit** — `refactor(pomodoro): store-kit store, split components, worker hook and audio asset` (trailer).

---

### Task 14: Remove Redux packages; PR B verification

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Prove no usage**

```bash
grep -rn "@reduxjs/toolkit\|react-redux\|redux-persist" src test scripts *.ts
```

Expected: nothing.

- [ ] **Step 2: Remove.** Run `pnpm remove @reduxjs/toolkit react-redux redux-persist`.

- [ ] **Step 3: Merge gate.** Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then `pnpm test:e2e` three times. Also check that the build output no longer contains the base64 WAV in JS:

```bash
grep -l "UklGRlaxFwBXQVZF" dist/assets/*.js
```

Expected: nothing.

- [ ] **Step 4: Commit** — `chore(deps): remove Redux Toolkit, react-redux and redux-persist` (trailer). Then open PR B (body: the B5 row, the migration description, test counts, Claude Code trailer) and merge after the gate.

---

# PR C — Naming, types co-location, shims removed (`feat/phase4-naming`)

### Task 15: Rename tool folders to their ids; entry file `Tool.tsx`

**Files:** `git mv` only, plus each `index.ts` `load` line. History must follow, so do not copy and delete.

**Rename table** (folder → id folder, old entry → `Tool.tsx`):

| Legacy folder                           | New folder                           | Old entry file                                                                                          | Case-only?         |
| --------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------ |
| `ApiTester`                             | `api-request`                        | `ApiTester.tsx`                                                                                         | no                 |
| `Base64Convertor`                       | `base64-converter`                   | `Base64Convertor.tsx`                                                                                   | no                 |
| `CSVViewer`                             | `csv-viewer`                         | `Csv-Tsv-viewer.tsx`                                                                                    | no                 |
| `Calculator`                            | `calculator`                         | `Calculator.tsx`                                                                                        | **yes** → two-step |
| `ColorTester`                           | `color-tester`                       | `ColorTester.tsx`                                                                                       | no                 |
| `DateCalculator`                        | `date-calculator`                    | `DateCalculator.tsx`                                                                                    | no                 |
| `HashGenerator`                         | `hash-generator`                     | `HashGenerator.tsx`                                                                                     | no                 |
| `ImageOptimiser`                        | `image-optimizer`                    | `ImageOptimiser.tsx`                                                                                    | no                 |
| `JWTDecoder`                            | `jwt-decode`                         | `JwtDecoder.tsx`                                                                                        | no                 |
| `JsonViewer`                            | `json-and-xml-viewer`                | `components/JsonViewer.tsx` → `Tool.tsx` at the folder root (fix its `./X` imports to `./components/X`) | no                 |
| `LogParser`                             | `log-parser`                         | `LogParser.tsx`                                                                                         | no                 |
| `NumberConverter`                       | `number-converter`                   | `NumberConverter.tsx`                                                                                   | no                 |
| `PasswordGenerator`                     | `password-generator`                 | `Generator.tsx`                                                                                         | no                 |
| `QrCodeGenerator`                       | `qr-code-generator`                  | `QRCodeGenerator.tsx`                                                                                   | no                 |
| `RandomDataGenerator`                   | `random-data-generator`              | `RandomDataGenerator.tsx`                                                                               | no                 |
| `RiveAnimationPlayer`                   | `rive-animation-player`              | `RiveAnimationPlayer.tsx`                                                                               | no                 |
| `TextDiffChecker`                       | `text-diff-checker`                  | `TextDiffChecker.tsx`                                                                                   | no                 |
| `URLEncoderDecoder`                     | `url-encoder-decoder`                | `URLEncoderDecoder.tsx`                                                                                 | no                 |
| `UnitConverter`                         | `unit-converter`                     | `UnitConverter.tsx`                                                                                     | no                 |
| `UrlParser`                             | `url-parser`                         | `UrlParser.tsx`                                                                                         | no                 |
| `regexTester`                           | `regex-tester`                       | `RegexStudio.tsx`                                                                                       | no                 |
| `PdfCompressor` (only if still present) | `pdf-compressor`                     | `PdfCompressor.tsx`                                                                                     | no                 |
| `pomodoro`                              | unchanged (`Tool.tsx` since Task 13) | —                                                                                                       | —                  |

**PdfCompressor ruling.** Phase 3 (Security & optimise PR) rebuilds the compressor at `src/tools/pdf-compressor/`.

- If phase 3 has merged, the legacy folder no longer exists; skip the row.
- If not, rename it here so the Task 16 registry check passes. Change only its folder, entry, types import (Task 17) and `ToolProps` import (Task 18). Phase 3 then rebuilds the folder in place.

- [ ] **Step 0:** Run `git status` (clean tree) and `ls src/tools` to confirm the folder list matches the table.

- [ ] **Step 1: Rename.** For each row, run `git mv src/tools/<Legacy> src/tools/<new>` and then `git mv src/tools/<new>/<OldEntry> src/tools/<new>/Tool.tsx`. For `Calculator`:

```bash
git mv src/tools/Calculator src/tools/calculator-tmp
git mv src/tools/calculator-tmp src/tools/calculator
git mv src/tools/calculator/Calculator.tsx src/tools/calculator/Tool.tsx
```

For `JsonViewer`:

```bash
git mv src/tools/JsonViewer src/tools/json-and-xml-viewer
git mv src/tools/json-and-xml-viewer/components/JsonViewer.tsx src/tools/json-and-xml-viewer/Tool.tsx
```

Then fix `Tool.tsx` imports: `./TreeView` → `./components/TreeView`, `./treeview/DataFlow` → `./components/treeview/DataFlow`.

- [ ] **Step 2: Manifests.** In every renamed `index.ts`, set `load: () => import('./Tool')`. Do not change `id`, `name` or anything else.

- [ ] **Step 3: Fix imports broken by the move.** Relative `../../types/…`, `../../hooks/…` and `../../components/ui` stay valid because the depth is unchanged; Tasks 17–18 remove them. Run `pnpm typecheck` and fix only what the move broke.

- [ ] **Step 4: Verify ids and URLs are unchanged**

```bash
pnpm tsx -e "import('./test/e2e/tool-routes.ts').then(m=>console.log(m.toolRoutes().map(r=>r.folder===r.id?'ok '+r.id:'MISMATCH '+r.folder+' '+r.id).join('\n')))"
```

Expected: every line `ok <id>`. Then run `pnpm test && pnpm test:e2e test/e2e/smoke.spec.ts` → PASS. Also run `git log --follow --oneline src/tools/color-tester/Tool.tsx | head -3`; it must show pre-rename history.

- [ ] **Step 5: Commit** — `refactor(tools): kebab-case folders matching tool ids; Tool.tsx entries` (trailer).

---

### Task 16: Registry enforces folder name = tool id

**Files:**

- Modify: `src/app/registry.ts`, `src/app/registry.test.ts`

**Interfaces:**

- `buildRegistry` additionally throws `Tool folder "<folder>" must match its id "<id>" (<path>)` when a manifest path `…/tools/<folder>/index.ts` has `folder !== manifest.id`. This implements spec §3.2: "validates … that IDs are unique and match folder names".

- [ ] **Step 1: Failing test** — in `registry.test.ts`:

```ts
it('rejects a folder whose name differs from the id', () => {
  expect(() =>
    buildRegistry({
      '../tools/ColorTester/index.ts': { default: fake('color-tester') },
    }),
  ).toThrow(/Tool folder "ColorTester" must match its id "color-tester"/);
});
```

Update the duplicate-id test so both paths use the folder `dup`. It then still exercises the duplicate check, not the folder check:

```ts
buildRegistry({
  '../tools/dup/index.ts': { default: fake('dup') },
  './tools/dup/index.ts': { default: fake('dup') },
});
// expect: /Duplicate tool id "dup".*\.\/tools\/dup\/index\.ts.*\.\.\/tools\/dup\/index\.ts/
```

Also tighten `discovers every existing tool exactly once`: replace `arrayContaining` with an exact count check, `expect(ids).toHaveLength(<n>)`. `<n>` is the number of `src/tools/*/index.ts` files at this commit; count them with `ls src/tools/*/index.ts | wc -l`. This closes the phase-1 deferred minor (Task 9 log).

- [ ] **Step 2:** Run `pnpm test src/app/registry` → Expected: FAIL (new test).

- [ ] **Step 3: Implement** — in the `buildRegistry` loop, after the manifest check:

```ts
const folder = /\/tools\/([^/]+)\/index\.ts$/.exec(path)?.[1];
if (folder !== undefined && folder !== manifest.id) {
  throw new Error(
    `Tool folder "${folder}" must match its id "${manifest.id}" (${path})`,
  );
}
```

- [ ] **Step 4:** Run `pnpm test src/app && pnpm build` → Expected: PASS. The real `TOOLS` builds because Task 15 renamed everything.

- [ ] **Step 5: Commit** — `feat(registry): enforce tool folder = id` (trailer).

---

### Task 17: Co-locate types; delete `src/types/`; `.tsx` → `.ts`; `utils/` → `lib/`; no climbing imports

**Files:** per the tables below.

**Types mapping** (move the used declarations verbatim; then delete unused ones):

| From `src/types/`             | To                                                                                                                             | Delete as unused (verify with `grep -rnw <Name> src` → only its own declaration, and nothing in the same file references it)                                                                                                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApiTesterTypes.ts`           | `src/tools/api-request/types.ts`                                                                                               | `TabProps`, `HeaderInputProps`, `ParamInputProps`, `CodeEditorProps`, `ResponseSectionProps`, `SaveRequestModalProps`, `NewCollectionModalProps`, `ErrorBoundaryProps`, `ErrorBoundaryState`, `SidebarProps`, `RequestPanelProps`, `EnvironmentVariable`, `Environment`, `HeaderProps`, `CollectionItemProps` (the component defines its own). `HttpMethod` and `RequestTypeMode` only if no kept type references them. |
| `CalculatorTypes.ts`          | `src/tools/calculator/types.ts`                                                                                                | none (`CalculationWithTimestamp` is referenced by `CalculationHistoryItem`)                                                                                                                                                                                                                                                                                                                                             |
| `ColorTesterTypes.ts`         | `src/tools/color-tester/types.ts`                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `CsvTsvTypes.ts`              | `src/tools/csv-viewer/types.ts`                                                                                                | `ChartDataPoint`, `FileParserProps`, `DataViewerProps`, `TabOption`, `DataTableProps`, `StatisticsPanelProps`, `ChartPanelProps`, `ControlPanelProps`                                                                                                                                                                                                                                                                   |
| `DataViewerTypes.ts`          | **delete** (only the dead `JsonViewer/hooks/useSyntaxHighlighting.tsx` and `globalStyles.tsx` use it; delete those too, below) | —                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `JwtTypes.ts`                 | `src/tools/jwt-decode/types.ts`                                                                                                | —                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `LogParserTypes.ts`           | `src/tools/log-parser/types.ts`                                                                                                | `LogLevelConfig`, `AnimationVariants`, `FilterPanelProps`, `LogContentProps`, `LogEntryCardProps`, `EmptyStateProps`, `StatsCardProps`                                                                                                                                                                                                                                                                                  |
| `NumberConverterTypes.ts`     | **delete** (zero importers)                                                                                                    | —                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PasswordGeneratorTypes.ts`   | `src/tools/password-generator/types.ts`                                                                                        | `PasswordMetrics`, `GuessesPerSecond`                                                                                                                                                                                                                                                                                                                                                                                   |
| `PdfCompressorTypes.ts`       | `src/tools/pdf-compressor/types.ts` if the folder exists, else delete                                                          | `CompressionSettings`, `PdfCompressorError`                                                                                                                                                                                                                                                                                                                                                                             |
| `PeriodicTableTypes.ts`       | **delete** (zero importers; no such tool)                                                                                      | —                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `RandomDataGeneratorTypes.ts` | `src/tools/random-data-generator/types.ts`                                                                                     | `FlattenedDataItem`                                                                                                                                                                                                                                                                                                                                                                                                     |
| `RiveAnimationPlayerTypes.ts` | **delete** (zero importers; the tool declares its own local types at `Tool.tsx:63-96`, which move to `types.ts`)               | —                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `TextDiffCheckerTypes.ts`     | `src/tools/text-diff-checker/types.ts`                                                                                         | `NotificationProps` (its hook was deleted in Task 7)                                                                                                                                                                                                                                                                                                                                                                    |
| `UnitConverterTypes.ts`       | `src/tools/unit-converter/types.ts`                                                                                            | —                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `qrTypes.ts`                  | `src/tools/qr-code-generator/types.ts`                                                                                         | `QRCodeProps`                                                                                                                                                                                                                                                                                                                                                                                                           |
| `ToolTypes.ts`                | shim, removed in Task 18                                                                                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                       |

The unused list came from a grep at plan time. Re-run before deleting:

```bash
for f in src/types/*.ts; do for n in $(grep -oE "^export (interface|type|enum|const|class) \w+" $f | awk '{print $3}'); do c=$(grep -rlw "$n" src --include=*.ts* | grep -v "^$f$" | wc -l); [ "$c" = "0" ] && echo "UNUSED $f $n"; done; done
```

**Also delete** these dead JSON-viewer files (zero importers; verify with `grep -rn "useLineInteractions\|useLineTracking\|useScrollSync\|useSyntaxHighlighting\|globalStyles" src` → only self-references):

- `json-and-xml-viewer/hooks/useLineInteractions.tsx`
- `json-and-xml-viewer/hooks/useLineTracking.tsx`
- `json-and-xml-viewer/hooks/useScrollSync.tsx`
- `json-and-xml-viewer/hooks/useSyntaxHighlighting.tsx`
- `json-and-xml-viewer/globalStyles.tsx`

Then:

- `grep -rn "dompurify" src` → nothing.
- `pnpm remove dompurify`.
- Remove the `"dompurify@<3.4.3": "^3.4.3"` line from `pnpm.overrides` in `package.json`.
- `pnpm install` → the lockfile no longer lists dompurify. The three lockfile hits at plan time were all from the direct dependency.

These deletions also clear lint warnings `useLineTracking.tsx:35` and `useScrollSync.tsx:27`.

**Internal file moves** (`git mv`; update imports):

| From                                                                    | To                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `api-request/request.ts`, `collections.ts` (+tests)                     | `api-request/lib/request.ts`, `lib/collections.ts` (+tests)        |
| `calculator/GraphDisplay.tsx`                                           | `calculator/components/GraphDisplay.tsx`                           |
| `color-tester/utils/ColorConverters.ts`                                 | `color-tester/lib/color-convert.ts`                                |
| `color-tester/utils/CalculationUtils.ts`                                | `color-tester/lib/color-analysis.ts`                               |
| `csv-viewer/parse.ts` (+test)                                           | `csv-viewer/lib/parse.ts` (+test)                                  |
| `image-optimizer/convert.ts` (+test)                                    | `image-optimizer/lib/convert.ts` (+test)                           |
| `json-and-xml-viewer/components/treeview/layoutManager.tsx`             | `…/treeview/layoutManager.ts`                                      |
| `json-and-xml-viewer/components/treeview/useDataProcessor.tsx`          | `…/treeview/useDataProcessor.ts`                                   |
| `jwt-decode/hooks/useJWTDecoder.tsx`                                    | `jwt-decode/hooks/useJwtDecoder.ts`                                |
| `jwt-decode/utils/utils.tsx`                                            | `jwt-decode/lib/claims.tsx` (has JSX; Task 28 splits out the icon) |
| `log-parser/utils/utils.ts`                                             | `log-parser/lib/parse.ts` (Task 33 splits it further)              |
| `password-generator/utils/utils.ts`                                     | `password-generator/lib/secure-random.ts`                          |
| `qr-code-generator/utils/qrUtils.ts`                                    | `qr-code-generator/lib/qr-content.ts`                              |
| `qr-code-generator/utils/qrExport.ts` (+test)                           | `qr-code-generator/lib/qr-export.ts` (+test)                       |
| `random-data-generator/utils.tsx`                                       | `random-data-generator/lib/schema.ts` (no JSX; Task 33 splits it)  |
| `rive-animation-player/riveFile.ts` (+test)                             | `rive-animation-player/lib/rive-file.ts` (+test)                   |
| `text-diff-checker/hooks/useDiffSettings.tsx`, `useIntelligentDiff.tsx` | `…/hooks/useDiffSettings.ts`, `useIntelligentDiff.ts`              |

- [ ] **Step 1:** Move the types per the table. Every importer switches to `./types` or `../types` (inside the tool folder). That includes the test files and lib files from PR A that temporarily import `../../types/…`: `csv-viewer/parse.ts`, `api-request/collections.test.ts` and any other hit from `grep -rn "types/" src/tools`. For `rive-animation-player`, move its local types (`PlayerState`/`PlayerError` enums and the `type` aliases at `Tool.tsx:63-96`) into `types.ts`.

- [ ] **Step 2:** Do the internal moves and update imports.

- [ ] **Step 3: Gates**

```bash
ls src/types 2>&1 | grep -c "No such file"                     # expect 1 (after Task 18 removes ToolTypes; until then only ToolTypes.ts remains)
grep -rnE "from ['\"](\.\./){2,}" src/tools                     # expect nothing: no import climbs out of a tool folder
for f in $(find src -name "*.tsx" -not -name "*.test.tsx"); do grep -qE "/>|</[A-Za-z]" $f || echo "NO JSX: $f"; done   # expect nothing
```

- [ ] **Step 4:** Run `pnpm typecheck && pnpm test && pnpm test:e2e test/e2e/smoke.spec.ts` → Expected: PASS.

- [ ] **Step 5: Commit** — `refactor(tools): co-locate types, lib/ folders, .ts for non-JSX; delete dead JSON-viewer hooks and dompurify` (trailer).

---

### Task 18: Remove the phase-1 shims and dead `Loadingfallback`; PR C verification

**Files:**

- Delete: `src/components/ui/index.ts`, `src/components/Loadingfallback.tsx`, `src/hooks/useClipboard.tsx`, `src/types/ToolTypes.ts`. After these, the `src/components`, `src/hooks` and `src/types` directories are gone.
- Modify:
  - `src/tools/base64-converter/Tool.tsx:20`
  - `src/tools/hash-generator/Tool.tsx:19`
  - `src/tools/url-encoder-decoder/Tool.tsx:24`
  - `src/tools/url-parser/Tool.tsx:27`
  - `src/tools/pdf-compressor/Tool.tsx:40` (only if it exists)

- [ ] **Step 1: Repoint shim importers**

| File                                                                         | Before                                               | After                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| base64-converter, hash-generator, url-encoder-decoder, url-parser `Tool.tsx` | `} from '../../components/ui';`                      | `} from '@/shared/ui';`                        |
| pdf-compressor `Tool.tsx:40`                                                 | `import { ToolProps } from '../../types/ToolTypes';` | `import type { ToolProps } from '@/app/tool';` |

`Loadingfallback.tsx` is dead: `grep -rn "Loadingfallback\|LoadingFallback" src` shows only its own file. `App.tsx` and `ToolLayout.tsx` define their own fallbacks. Delete it.

- [ ] **Step 2: Delete** the four files, then run:

```bash
grep -rn "components/ui\|hooks/useClipboard\|types/ToolTypes\|Loadingfallback\|@/types\|@/hooks\|@/components" src test
ls src/components src/hooks src/types 2>&1 | grep -c "No such file"
```

Expected: nothing, then `3`.

- [ ] **Step 3: Merge gate.** Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then `pnpm test:e2e` three times. All green.

- [ ] **Step 4: Commit** — `chore: remove phase-1 shims and dead Loadingfallback` (trailer). Open PR C (rename table, registry rule, test counts, Claude Code trailer) and merge after the gate.

---

# PR D — `cn`, dead code, styling (`feat/phase4-styling`)

### Task 19: Move `cn` to `@/shared/lib/cn`; split `buttonVariants` out of the component file

**Files:**

- Create: `src/shared/lib/cn.ts`, `src/shared/lib/cn.test.ts`, `src/shared/ui/button-variants.ts`
- Modify: every importer of `@/lib/utils`:
  - `src/app/Dashboard.tsx`
  - `src/pdf/components/PageGrid.tsx`, `src/pdf/components/PageThumb.tsx`
  - all 24 `src/shared/ui/*.tsx` files that import it (list: `grep -rln "@/lib/utils" src`)
  - `src/tools/calculator/components/GraphDisplay.tsx`
- Also modify: `src/shared/ui/button.tsx`, `src/shared/ui/index.ts`
- Delete: `src/lib/utils.ts` (and `src/lib/`)

- [ ] **Step 1: Failing test** — `src/shared/lib/cn.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins conditionals and resolves Tailwind conflicts last-wins', () => {
    expect(cn('px-2', false && 'hidden', 'px-4', { 'text-fg': true })).toBe(
      'px-4 text-fg',
    );
  });
});
```

- [ ] **Step 2:** `git mv src/lib/utils.ts src/shared/lib/cn.ts` (the content is unchanged). Then:

```bash
grep -rln "@/lib/utils" src | xargs sed -i "s#@/lib/utils#@/shared/lib/cn#g"
grep -rn "@/lib/utils\|src/lib" src
```

The second command should print nothing.

- [ ] **Step 3: `buttonVariants`.** This fixes the `react-refresh/only-export-components` warning at `button.tsx:29`.
  - Move the `cva(...)` definition (`button.tsx:29-…`) and the `iconButtonSize` map, if it is used by `buttonVariants` consumers, into `src/shared/ui/button-variants.ts`, exported as `buttonVariants`.
  - `button.tsx` imports it.
  - `index.ts` exports `buttonVariants` from `./button-variants`.
  - Check `grep -rn "buttonVariants" src`: today only `button.tsx` and the barrel use it.

- [ ] **Step 4:** Run `pnpm test src/shared && pnpm typecheck && pnpm lint 2>&1 | grep -c "only-export-components"` → Expected: PASS and `0`.

- [ ] **Step 5: Commit** — `refactor(shared): cn lives in shared/lib; buttonVariants in its own module` (trailer).

---

### Task 20: Dead code and dependency hygiene — `AnimatedBackground`, stray `@types` in dependencies

**Files:**

- Delete: `src/app/AnimatedBackground.tsx`
- Modify: `src/theme/terminal.css`, `src/app/Dashboard.tsx` (22, 149), `package.json`

- [ ] **Step 1: `bg-terminal-grid` utility (B9).** Append to `src/theme/terminal.css`:

```css
/* Static terminal "graph paper" backdrop with a soft accent glow at the top
   (replaces AnimatedBackground.tsx; 2026-07-15 spec, no inline styles). */
@utility bg-terminal-grid {
  background-color: var(--color-canvas);
  background-image:
    radial-gradient(
      60% 100% at 50% 0%,
      color-mix(in oklab, var(--color-accent) 10%, transparent),
      transparent 70%
    ),
    linear-gradient(
      to right,
      color-mix(in oklab, var(--color-fg) 4%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in oklab, var(--color-fg) 4%, transparent) 1px,
      transparent 1px
    );
  background-size:
    100% 20rem,
    32px 32px,
    32px 32px;
  background-repeat: no-repeat, repeat, repeat;
}
```

In `Dashboard.tsx`, delete the import (22) and replace `<AnimatedBackground />` (149) with:

```tsx
<div
  aria-hidden
  className="pointer-events-none fixed inset-0 -z-10 bg-terminal-grid"
/>
```

Delete `src/app/AnimatedBackground.tsx`. Then `grep -rn "AnimatedBackground" src` → nothing.

- [ ] **Step 2: Visual parity check.**
  1. Run `pnpm dev`.
  2. Screenshot `/` at 1280×800 before (on `master`) and after.
  3. The grid (32px, ~4% fg) and the top glow must look the same. The old grid used `opacity-[0.04]` on full-strength lines; `color-mix` at 4% is the equivalent.
  4. Attach both screenshots to the PR.

- [ ] **Step 3: `package.json` hygiene.** Each change is verified first:
  - `@types/react` and `@types/react-dom` appear in both `dependencies` and `devDependencies`. Remove them from `dependencies`, keep the `devDependencies` entries, and bump those to the higher of the two ranges (`^19.2.15` / `^19.2.3`).
  - `@types/crypto-js` and `@types/lodash` are type-only. Move them to `devDependencies` with `pnpm remove @types/crypto-js @types/lodash && pnpm add -D @types/crypto-js @types/lodash`.
  - For each runtime dependency, confirm it still has an importer. All must print at least one file (as at plan time). Do **not** remove any of them:

    ```bash
    for d in @internationalized/date @rive-app/react-canvas @uiw/react-textarea-code-editor @xyflow/react class-variance-authority clsx crypto-js dagre diff fflate lodash mathjs papaparse pdf-lib pdfjs-dist qrcode.react react-plotly.js react-router-dom rehype-prism-plus rehype-rewrite sonner tailwind-merge zustand @arshad-shah/store-kit @arshad-shah/detent @arshad-shah/detent-react; do printf "%s: " $d; grep -rlE "from ['\"]$d" src | head -1 || true; echo; done
    ```

    `plotly.js` has no direct importer: it is the required peer of `react-plotly.js`. `@arshad-shah/detent` is the peer of `detent-react`. Keep both.

- [ ] **Step 4:** Run `pnpm install && pnpm typecheck && pnpm build && pnpm test:e2e test/e2e/smoke.spec.ts` → Expected: PASS.

- [ ] **Step 5: Commit** — `chore: dashboard backdrop as a theme utility; dependency hygiene` (trailer).

---

### Task 21: CSS modules → Tailwind

**Files:**

- Modify:
  - `src/tools/regex-tester/Tool.tsx` (40, 393, 705-715)
  - `src/tools/json-and-xml-viewer/components/DataNode.tsx` (5, 31-148)
  - `src/tools/json-and-xml-viewer/components/treeview/CustomNode.tsx` (5, 25-75)
- Delete:
  - `src/tools/regex-tester/LivePreview.module.css`
  - `src/tools/json-and-xml-viewer/components/DataNode.module.css`
  - `src/tools/json-and-xml-viewer/components/treeview/CustomNode.module.css`

Each class translates 1:1 to theme-token utilities. Put the strings in a `const` map at module top (static class strings, not JS style objects).

**`LivePreview.module.css` → `regex-tester/Tool.tsx`**

| Class         | Tailwind                                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.preview`    | `relative grid max-h-[420px] grid-cols-[auto_1fr] overflow-auto rounded-lg border border-line bg-surface font-mono text-sm leading-[1.7] text-fg shadow-[inset_3px_0_0_0_var(--color-accent)]` |
| `.gutter`     | `sticky left-0 select-none border-r border-line bg-surface-subtle py-3 pr-3 pl-[18px] text-right text-fg-subtle tabular-nums`                                                                  |
| `.gutterLine` | `block text-[0.85em] opacity-70`                                                                                                                                                               |
| `.content`    | `min-w-0 px-4 py-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere]`                                                                                                                   |
| `.mark`       | `rounded-[3px] bg-warning px-[3px] py-px text-canvas [box-decoration-break:clone]`                                                                                                             |

**`DataNode.module.css` → `DataNode.tsx`**

| Class                                        | Tailwind                                                                                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.row`                                       | `group relative flex min-w-0 items-center gap-1.5 rounded py-0.5 pr-2 font-mono text-sm leading-[1.6] hover:bg-surface-subtle`                                              |
| `.row.matched`                               | add `bg-warning` when matched                                                                                                                                               |
| `.indentGuide`                               | `ml-[7px] w-4 border-l border-line`                                                                                                                                         |
| `.chevron`                                   | `inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[3px] border-0 bg-transparent p-0 text-fg-muted hover:bg-surface-strong hover:text-fg` |
| `.chevronSpacer`                             | `w-[18px] shrink-0`                                                                                                                                                         |
| `.key`                                       | `font-medium whitespace-nowrap text-fg`                                                                                                                                     |
| `.colon`                                     | `mr-0.5 text-fg-subtle`                                                                                                                                                     |
| `.value`                                     | `min-w-0 flex-auto truncate`                                                                                                                                                |
| `.string` / `.number` / `.boolean` / `.null` | `text-success` / `text-info` / `font-semibold text-warning` / `italic text-fg-subtle`                                                                                       |
| `.summary`                                   | `text-[0.9em] italic text-fg-subtle`                                                                                                                                        |
| `.bracket`                                   | `font-bold text-fg-muted`                                                                                                                                                   |
| `.actions`                                   | `ml-auto flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-within:opacity-100`                                        |
| `.actionBtn`                                 | `inline-flex size-[22px] cursor-pointer items-center justify-center rounded-[3px] border-0 bg-transparent p-0 text-fg-subtle hover:bg-surface-strong hover:text-fg`         |

`.indent` is declared but unused. Confirm with `grep -n "styles.indent\b" DataNode.tsx` and drop it.

**`CustomNode.module.css` → `CustomNode.tsx`**

| Class                                        | Tailwind                                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.node`                                      | `max-w-[280px] min-w-[180px] overflow-hidden rounded-lg border border-line bg-surface font-sans text-xs text-fg shadow-[0_2px_6px_rgba(0,0,0,0.06)]` |
| `.node.object` / `.array` / `.primitive`     | `border-t-[3px] border-t-accent` / `border-t-[3px] border-t-warning` / `border-t-[3px] border-t-success`                                             |
| `.header`                                    | `flex items-center gap-1.5 border-b border-line bg-surface-subtle px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-fg-muted uppercase` |
| `.label`                                     | `min-w-0 flex-1 truncate font-mono text-xs font-semibold tracking-normal text-fg normal-case`                                                        |
| `.body`                                      | `max-h-[220px] overflow-auto px-2.5 py-1.5 font-mono text-xs`                                                                                        |
| `.row` (+ `.row + .row`)                     | `flex min-w-0 items-baseline justify-between gap-3 py-0.5 [&+&]:border-t [&+&]:border-dashed [&+&]:border-line`                                      |
| `.key`                                       | `max-w-[60%] truncate font-medium text-fg-muted`                                                                                                     |
| `.val`                                       | `min-w-0 truncate text-right`                                                                                                                        |
| `.string` / `.number` / `.boolean` / `.null` | as in DataNode                                                                                                                                       |
| `.primitiveVal`                              | `py-1 break-all whitespace-normal`                                                                                                                   |
| `.handle`                                    | `!size-2 !border-2 !border-surface !bg-accent`                                                                                                       |

- [ ] **Step 1:** Apply the three tables. The `DataNode.tsx:100` `style={{ paddingLeft: 4 + depth * 16 }}` stays; it is data-driven (depth). Add `// data-driven: indent by tree depth`.

- [ ] **Step 2:** Delete the three `.module.css` files. Then `grep -rn "module.css" src` → nothing.

- [ ] **Step 3: Visual parity.** Screenshot, before and after:
  - `/regex-tester` with the email template.
  - `/json-and-xml-viewer` with sample JSON, in tree view and network view.

  They must match: colours, spacing, hover actions on tree rows, node header colours.

- [ ] **Step 4:** Run `pnpm typecheck && pnpm test:e2e test/e2e/smoke.spec.ts` → PASS.

- [ ] **Step 5: Commit** — `refactor(styles): replace CSS modules with kit tokens and Tailwind` (trailer).

---

### Task 22: Inline styles and JS style tokens → Tailwind (data-driven ones documented)

**Files:** listed per row. Line numbers are legacy-audit positions; re-locate by content.

| Site                                                                                                                                                          | Today                                       | After                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api-request/Tool.tsx:127` `style={{ paddingLeft: depth * 12 }}`, `:173` `style={{ marginLeft: depth * 12 }}`                                                 | depth indent                                | **keep** (data-driven), add `// data-driven: tree depth`                                                                                                                                                                                                                                                                                                                         |
| `calculator/components/GraphDisplay.tsx:131` `style={{ width: '100%', height: '400px' }}`                                                                     | static                                      | Plotly needs a style object for its root, so pass `className="h-[400px] w-full"` and `useResizeHandler` / `style={{ width: '100%', height: '100%' }}` on `<Plot>`, inside a wrapper `div` with `h-[400px] w-full`. Read `react-plotly.js` props: if `className` sizes it, drop `style` entirely.                                                                                 |
| `color-tester/Tool.tsx:128-135` `Swatch`                                                                                                                      | size, colour, radius, border                | `className={cn('shrink-0 border border-black/10', size === 'sm' ? 'size-8' : size === 'lg' ? 'size-16' : 'size-12', rounded ? 'rounded-full' : 'rounded-lg')}` + `style={{ background: color }}` (data-driven: user colour)                                                                                                                                                      |
| `color-tester/Tool.tsx:316,323,330,419,423,426` `style={{ background: rgbString, color: textColor }}`                                                         | user colour                                 | **keep** (data-driven). Add the comment. `textColor` stays computed from luminance.                                                                                                                                                                                                                                                                                              |
| `color-tester/Tool.tsx:358,375` `style={{ background: rgbString }}`                                                                                           | user colour                                 | keep + comment                                                                                                                                                                                                                                                                                                                                                                   |
| `color-tester/Tool.tsx:361,364` `style={{ color: '#ffffff' }}`; `:378,381` `style={{ color: '#000000' }}`                                                     | static                                      | `className="text-white"` / `className="text-black"` (these previews show contrast against pure white/black by design)                                                                                                                                                                                                                                                            |
| `csv-viewer/Tool.tsx:87` `style={{ height }}` (chart SVG)                                                                                                     | prop                                        | keep (data-driven: chart height prop) + comment                                                                                                                                                                                                                                                                                                                                  |
| `csv-viewer/Tool.tsx:617` `style={{ cursor: 'pointer' }}`                                                                                                     | static                                      | `className="cursor-pointer"`                                                                                                                                                                                                                                                                                                                                                     |
| `json-and-xml-viewer/Tool.tsx:82-89,238` `editorStyles` object                                                                                                | static JS style tokens                      | `@uiw/react-textarea-code-editor` accepts `className`. Use `className="min-h-96 rounded-lg pb-8 font-mono text-sm"` and delete `editorStyles`. If the editor's own CSS overrides `font-family`, keep `style={{ fontFamily: 'inherit' }}` with the comment `// override editor default font`.                                                                                     |
| `json-and-xml-viewer/components/treeview/DataFlow.tsx:53-60` wrapper                                                                                          | static                                      | `className="h-full min-h-[400px] w-full overflow-hidden rounded-lg bg-surface-subtle"`                                                                                                                                                                                                                                                                                           |
| `json-and-xml-viewer/components/treeview/DataFlow.tsx:86-91` `<Controls style>`                                                                               | static                                      | `className="!rounded-lg !border !border-line !bg-surface !shadow-[0_4px_12px_rgba(0,0,0,0.4)]"` (xyflow `Controls` accepts `className`)                                                                                                                                                                                                                                          |
| `json-and-xml-viewer/components/treeview/DataFlow.tsx:29-32,40,82` `accent`/`surface`/`subtle`/`muted` CSS-var strings passed to xyflow edge/background props | library props, not DOM styles               | keep (xyflow takes colours as props). Rename to a `const FLOW_COLORS = { accent: 'var(--color-accent)', … } as const` at module top.                                                                                                                                                                                                                                             |
| `json-and-xml-viewer/components/treeview/layoutManager.ts:40` `stroke: '#60A5FA'`                                                                             | hard-coded colour                           | `stroke: 'var(--color-info)'` (token; same blue family)                                                                                                                                                                                                                                                                                                                          |
| `jwt-decode/Tool.tsx:766` `<ArrowRight … style={{ display: 'none' }} />`                                                                                      | dead hidden icon                            | **delete the element** (it never renders). Verify nothing references it.                                                                                                                                                                                                                                                                                                         |
| `log-parser/Tool.tsx:154-157` chevron `transform`/`transition`                                                                                                | state-driven static classes                 | `className={cn('transition-transform duration-150', expanded && 'rotate-90')}`                                                                                                                                                                                                                                                                                                   |
| `password-generator/Tool.tsx:40-45` `CHAR_CSS_VARS` + `:58-64`, `:73`, `:95-98`                                                                               | JS style tokens                             | `const CHAR_CLASS: Record<CharType, string> = { uppercase: '<token class>', … }`, taking the same tokens `CHAR_CSS_VARS` maps to (read lines 40-45; e.g. `var(--color-info)` → `text-info`). Spans get `className={cn('font-bold', CHAR_CLASS[type])}`. The `Box` style at 58-64 → `className="… leading-[1.6] break-all [overflow-wrap:anywhere] whitespace-pre-wrap min-w-0"`. |
| `pomodoro`                                                                                                                                                    | done in Task 13                             | —                                                                                                                                                                                                                                                                                                                                                                                |
| `regex-tester/Tool.tsx:471` `style={{ minWidth: 220 }}`                                                                                                       | static                                      | `className="relative min-w-[220px]"`                                                                                                                                                                                                                                                                                                                                             |
| `rive-animation-player/Tool.tsx:890-897` stage box                                                                                                            | static                                      | `className="relative h-[60vh] min-h-[400px] w-full overflow-hidden rounded-lg"`                                                                                                                                                                                                                                                                                                  |
| `rive-animation-player/Tool.tsx:901-909` canvas display/background                                                                                            | state-driven                                | `className={cn(shouldDisplayCanvas() ? 'block' : 'hidden', background === 'white' ? 'bg-white' : background === 'black' ? 'bg-black' : 'bg-transparent')}`                                                                                                                                                                                                                       |
| `rive-animation-player/Tool.tsx:932-934` loading overlay `rgba(0,0,0,0.4)`                                                                                    | static                                      | `className="absolute inset-0 bg-black/40"`                                                                                                                                                                                                                                                                                                                                       |
| `rive-animation-player/Tool.tsx:941` `style={{ color: '#fff' }}`                                                                                              | static                                      | `className="text-white"`                                                                                                                                                                                                                                                                                                                                                         |
| `qr-code-generator` colour presets and defaults (`QRCodeGenerator.tsx:330-335`, `useQrCode.ts:25-26`)                                                         | data (QR colours the user picks or applies) | keep; these are **data** passed to `qrcode.react`, not styles                                                                                                                                                                                                                                                                                                                    |
| `color-tester/Tool.tsx:53-108` `INITIAL_PALETTE` hex values                                                                                                   | data                                        | keep                                                                                                                                                                                                                                                                                                                                                                             |

- [ ] **Step 1:** Apply every row.

- [ ] **Step 2: Gate.** List remaining inline styles and confirm each has a `data-driven` comment:

```bash
grep -rn "style={" src/tools src/app --include=*.tsx | grep -v "src/tools/pdf-"
```

Every remaining hit must be on a line directly preceded by a `// data-driven:` comment (or have one on the same JSX element). `grep -B1` makes this quick to review.

- [ ] **Step 3: Visual parity.** Screenshot color-tester (all tabs), password-generator, log-parser (expand a row), rive (empty stage) and calculator (expression mode with graph shown), before and after.

- [ ] **Step 4: Merge gate for PR D.** Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then `pnpm test:e2e` three times. All green.

- [ ] **Step 5: Commit** — `refactor(styles): inline styles and JS style tokens to Tailwind; keep only data-driven styles` (trailer). Open PR D (B9 row, before/after screenshots, test counts, Claude Code trailer) and merge after the gate.

---

# PR E — Splits, derived state, lint to zero (`feat/phase4-splits`)

**Rules for every split task (23–33)**

1. **Characterisation first.** Before moving logic, write the `lib/*.test.ts` against the **current** functions: import from the old location, or temporarily export the function. Watch it pass. Then move the code and keep it green. The test plays the role of the "failing test" step: it fails at the new import path until the move is done.
2. **Moves are verbatim.** JSX moves verbatim into the named components. Props are exactly the state and handlers the block reads. No visual change, no renaming of user-facing text.
3. **Size gate.** Every file in the tool folder is ≤ 400 lines after the task (target ≤ 300). Check with `wc -l src/tools/<id>/**/*.ts*`.
4. **Lint gate.** Every warning listed for the task is gone. `pnpm exec eslint src/tools/<id>` prints 0 problems.
5. **Derived state.** A value computed from other state inside a `useEffect` + `setState` becomes `useMemo` over a pure `lib` function. An effect that "resets B when A changes" moves into A's change handler. This is the pattern for every `react-hooks/set-state-in-effect` warning.
6. Each task ends with `pnpm typecheck && pnpm test && pnpm test:e2e test/e2e/smoke.spec.ts test/e2e/legacy-tools.spec.ts` green, then a commit `refactor(<id>): split into components/hooks/lib` (trailer).

### Task 23: Split `api-request/Tool.tsx` (1039 lines)

**Files:**

- Create:
  - `components/CollectionTree.tsx` (from `CollectionItem`, 108-199, plus `methodColor`, 79-96)
  - `components/KeyValueEditor.tsx` (the params and headers row editors in the request tabs, 677-760; one component with `rows`, `onAdd`, `onRemove`, `onChange` and an optional `enabled` column)
  - `components/RequestForm.tsx` (`requestForm`, 632-830: method/url bar + tabs; uses `KeyValueEditor`)
  - `components/ResponsePanel.tsx` (`renderResponse`, 546-630, plus `statusColor`, 98-106)
  - `components/SaveRequestDialog.tsx` (961-1001)
  - `components/NewCollectionDialog.tsx` (1003-1035)
  - `hooks/useRequestDraft.ts`. It holds the request draft state (lines 203-215) and the row helpers (265-289) as one `useState` object; helpers come from `lib/request.ts`. It exposes `load(req: RequestItemType)` (from `handleSelectRequest`, 418-438) and `reset()`.
  - `lib/draft.ts` (pure: `addRow`, `removeRow`, `updateRow`, `draftFromRequest`)
  - `lib/draft.test.ts`
- Modify: `Tool.tsx` (orchestration only: sidebar layout, the job from Task 8, dialogs open state)

**Test** — `lib/draft.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { addRow, draftFromRequest, removeRow, updateRow } from './draft';

describe('request draft', () => {
  it('row helpers are immutable', () => {
    const rows = [{ key: 'a', value: '1' }];
    expect(addRow(rows, { key: '', value: '' })).toHaveLength(2);
    expect(removeRow(rows, 0)).toEqual([]);
    expect(updateRow(rows, 0, 'value', '2')).toEqual([
      { key: 'a', value: '2' },
    ]);
    expect(rows).toEqual([{ key: 'a', value: '1' }]);
  });
  it('loads a saved request with blank-row fallbacks', () => {
    const d = draftFromRequest({
      id: 'r',
      type: 'request',
      name: 'n',
      method: 'POST',
      url: 'u',
    });
    expect(d).toMatchObject({
      method: 'POST',
      url: 'u',
      requestType: 'rest',
      headers: [{ key: '', value: '' }],
      params: [{ key: '', value: '', enabled: true }],
      bodyType: 'none',
      body: '',
    });
  });
});
```

`draftFromRequest` keeps the current behaviour: fields absent from the saved request keep the **current** draft value in `handleSelectRequest` (lines 433-437 only set when defined). So its signature is `draftFromRequest(req, current = EMPTY_DRAFT)`. Test both the empty-current and the populated-current cases; add a third `it` for the populated case.

**Warnings:** none listed for this tool. Remove the `any` uses (`updateParam` value, `reqBody`) by typing them; the three `eslint-disable`/`any` hits in the audit.

- [ ] Characterise → move → gates → commit.

---

### Task 24: Split `qr-code-generator/Tool.tsx` (1011) and fix `useQrCode.ts:73`

**Files:**

- Create:
  - `components/TextUrlForm.tsx` (124-181)
  - `components/ContactForm.tsx` (183-231)
  - `components/WifiForm.tsx` (233-288)
  - `components/CryptoForm.tsx` (290-327)
  - `components/StylePanel.tsx` (colour presets 329-336 plus the size, error-level, colour and render-as controls from the main JSX)
  - `components/QrPreview.tsx` (the preview card and download/copy actions)
  - `lib/options.tsx` (`.tsx` because `QR_TYPE_OPTIONS` carries icon elements: `QR_TYPE_OPTIONS`, `ENCRYPTION_OPTIONS`, `CRYPTO_OPTIONS`, `WIFI_ENCRYPTION_OPTIONS`, `ERROR_LEVELS`, `ERROR_LEVEL_PCT`, `COLOR_PRESETS`)
  - `lib/qr-content.test.ts`
- Modify: `Tool.tsx`, `hooks/useQrCode.ts`

**Test** — `lib/qr-content.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  generateCryptoFormat,
  generateQRContent,
  generateVCardFormat,
  generateWifiFormat,
} from './qr-content';

describe('qr content', () => {
  it('wifi', () => {
    expect(
      generateWifiFormat({
        ssid: 'Home',
        password: 'pw',
        encryption: 'WPA',
        isHidden: true,
      }),
    ).toBe('WIFI:S:Home;T:WPA;P:pw;H:true;;');
  });
  it('vcard', () => {
    expect(
      generateVCardFormat({
        name: 'Ada',
        phone: '1',
        email: 'a@x',
        company: 'X',
      }),
    ).toBe(
      'BEGIN:VCARD\nVERSION:3.0\nFN:Ada\nTEL:1\nEMAIL:a@x\nORG:X\nEND:VCARD',
    );
  });
  it('crypto with and without amount', () => {
    expect(
      generateCryptoFormat({
        currency: 'BTC' as never,
        publicKey: 'k',
        amount: '0.1',
      }),
    ).toBe('btc:k?amount=0.1');
    expect(
      generateCryptoFormat({
        currency: 'ETH' as never,
        publicKey: 'k',
        amount: '',
      }),
    ).toBe('eth:k');
  });
  it('url/text/custom pass text through', () => {
    const blank = { name: '', phone: '', email: '', company: '' };
    const wifi = { ssid: '', password: '', encryption: '', isHidden: false };
    const crypto = { currency: 'BTC' as never, publicKey: '', amount: '' };
    expect(generateQRContent('url', 'https://x', blank, wifi, crypto)).toBe(
      'https://x',
    );
  });
});
```

Check `CryptoType` members in `types.ts` and use real values instead of `as never`.

**Warning `useQrCode.ts:73` (set-state-in-effect).** Read the effect (66-…). Derive `finalData` with `useMemo(() => buildFinalData(state), [inputs…])`, where `buildFinalData` is a new pure `lib/qr-content.ts` function wrapping `generateQRContent` + `encryptContent`, with a test. Drop the `isProcessing` flag if it is only set and cleared synchronously inside that effect; it can never be observed as `true` by a render. If any UI reads `isProcessing`, keep that UI's behaviour, i.e. it was never shown.

- [ ] Characterise → move → gates → commit.

---

### Task 25: Split `rive-animation-player/Tool.tsx` (1006); fix `:329` and `:341`

**Files:**

- Create:
  - `hooks/useRivePlayer.ts`. It owns the Rive instance (keep it in a `useRef`, not `useState`, so assigning `layout` is not a state mutation; this fixes `react-hooks/immutability` at 341), plus the status, debug log, animation/state-machine/artboard lists and their effects (293-380), `setAnimationWithBuffer` (384-406), `load` (Task 7 version) and `handleInputChange` (429-466).
  - `lib/layout.ts`: `fitValues`, `alignValues` (98-118), `getFitValue`/`getAlignmentValue` (read their definitions in the component) as pure functions over `AlignFitIndex`.
  - `lib/layout.test.ts`
  - `components/Stage.tsx` (drop zone + canvas + loading overlay, 885-950)
  - `components/PlaybackControls.tsx`
  - `components/LayoutControls.tsx` (with `alignmentIcon`, 120-130)
  - `components/InputsPanel.tsx` (state-machine inputs)
  - `components/DebugLog.tsx`
  - `components/FileInfo.tsx`
- Modify: `Tool.tsx`

**Test** — `lib/layout.test.ts`: `getFitValue({ fit: i, alignment: j })` returns `Fit[fitValues[i]]` for every index, and the same for alignment. Assert the first and last entries explicitly against `@rive-app/react-canvas` `Fit`/`Alignment` enums.

**Warning `:329` (set-state-in-effect).** The effect reacts to `status` becoming Error by calling `reset()` and toasting. Move that into the place that sets the error status, inside `setAnimationWithBuffer`'s catch (400-406): call `reset()` and `notify.error('Your file has no animations.')` there. Keep the Active-branch list fetching as an effect, but make it compute lists from the instance ref without setting state that is derived. If lists must be state because they come from the Rive instance, set them in the instance `onLoad` callback rather than an effect.

- [ ] Characterise → move → gates → manual check: load a real `.riv` from https://rive.app/community (any free file, kept local and not committed). Play, pause, switch animation, toggle a state-machine input, change fit and alignment. Then commit.

---

### Task 26: Split `text-diff-checker/Tool.tsx` (849); fix `useIntelligentDiff.ts:257`

**Files:**

- Create:
  - `components/DiffTextArea.tsx` (51-125)
  - `components/DiffToolbar.tsx` (view-mode buttons `VIEW_MODES` 45-49 plus swap/clear/export/refresh/settings controls)
  - `components/DiffResults.tsx` (`renderInlineDifferences`, `renderDiffSegment`, `lineMarkerColor`, `lineMarker`, `renderSegmentRow`, `renderDiffContent`, 280-470)
  - `lib/export.ts` (`buildDiffExport(segments, stats, settings, now): object`, from `exportResults` 236-247)
  - `lib/export.test.ts`
- Modify: `Tool.tsx`, `hooks/useIntelligentDiff.ts`

**Test** — `lib/export.test.ts`: the type fallback `s.type || (s.added ? 'added' : s.removed ? 'removed' : 'unchanged')` for each case, and `timestamp === new Date(now).toISOString()`.

**Warning `useIntelligentDiff.ts:257` (preserve-caught-error).** Rethrow with `{ cause }`: `throw new Error('<same message>', { cause: err })`.

- [ ] Characterise → move → gates → commit.

---

### Task 27: Split `csv-viewer/Tool.tsx` (777); fix `:286`

**Files:**

- Create:
  - `components/LineChart.tsx` (75-170; keep `style={{ height }}` with the data-driven comment from Task 22)
  - `components/DataTable.tsx` (table + pagination)
  - `components/StatisticsPanel.tsx` (`renderStatCard`, 371-…)
  - `components/ColumnControls.tsx` (filter/sort/column toggles, `filterColumnItems`)
  - `lib/stats.ts`: `columnStatistics(data, columns): Statistics`, from the `statistics` memo (262-280; keeps lodash `min`/`max`/`sum`), plus `formatNumber`, 65-73
  - `lib/table.ts`: `filterRows(data, column, value)`, `sortRows(data, column, dir)` (lodash `orderBy`, from 290-305), `paginate(rows, page, perPage)`, `chartPoints(rows, column)` (363-369)
  - `lib/stats.test.ts`, `lib/table.test.ts`
- Modify: `Tool.tsx`

**Tests**

```ts
// lib/stats.test.ts
expect(
  columnStatistics(
    [
      { a: 1, b: 'x' },
      { a: 3, b: 'y' },
    ],
    ['a', 'b'],
  ),
).toEqual({
  a: expect.objectContaining({ min: 1, max: 3, avg: 2, sum: 4 }),
});
// lib/table.test.ts
expect(sortRows([{ n: 2 }, { n: 1 }], 'n', 'asc')).toEqual([
  { n: 1 },
  { n: 2 },
]);
expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
```

Read the memo for the exact `ColumnStatistics` fields (e.g. `count`, `median`) and assert all of them.

**Warning `:286`.** Delete the effect. Derive `const activeChartColumn = chartColumn || numericColumns[0] || '';` and use it wherever `chartColumn` was read.

- [ ] Characterise → move → gates → commit.

---

### Task 28: Split `jwt-decode/Tool.tsx` (772); fix `useJwtDecoder.ts:44` and `lib/claims.tsx:37`

**Files:**

- Create:
  - `lib/decode.ts` (pure `decodeJwt(token): { decoded: DecodedJWT | null; error: string }`, moved from `useJwtDecoder` `decode`, lines 8-37)
  - `lib/decode.test.ts`
  - `lib/categorize.ts` (`IDENTITY_KEYS`, `ACCESS_KEYS`, `TIMING_KEYS`, `ISSUER_KEYS`, `categorizeClaims(payload)` from 231-257)
  - `lib/categorize.test.ts`
  - `lib/claim-icon.tsx` (`getClaimIcon`, JSX)
  - `components/ValueRenderer.tsx` (79-178)
  - `components/ClaimCard.tsx` (180-208)
  - `components/HeaderSection.tsx` (259-343)
  - `components/PayloadSection.tsx` (345-545)
  - `components/SignatureSection.tsx` (547-…)
- Rename: `lib/claims.tsx` → `lib/claims.ts` once `getClaimIcon` has moved out (it keeps `formatTime`, `getExpiryInfo`, `getClaimLabel`).
- Modify: `Tool.tsx`, `hooks/useJwtDecoder.ts`

**Tests**

```ts
// lib/decode.test.ts
const b64u = (o: object) =>
  btoa(JSON.stringify(o))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const token = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: '1', exp: 1 })}.sig`;
expect(decodeJwt(token).decoded).toMatchObject({
  header: { alg: 'HS256' },
  payload: { sub: '1' },
  signature: 'sig',
});
expect(decodeJwt('a.b').error).toBe(
  'Invalid JWT format. Expected 3 parts separated by dots.',
);
expect(decodeJwt('').decoded).toBeNull();
expect(decodeJwt('x.y.z').error).toBe(
  'Failed to decode JWT: Invalid base64 encoding',
);
// lib/categorize.test.ts
expect(
  categorizeClaims({ sub: 1, scope: 'a', exp: 2, iss: 'i', foo: 3 }),
).toMatchObject({
  timing: [['exp', 2]],
  issuer: [['iss', 'i']],
  custom: [['foo', 3]],
});
```

Check which list `sub` and `scope` are in via `IDENTITY_KEYS`/`ACCESS_KEYS` (60-75) and assert those too. Also confirm the exact message for `x.y.z`: `atob('x')` may throw a different error first. Assert whatever the moved code returns today.

**Warnings:**

- `useJwtDecoder.ts:44`: delete the effect. `const { decoded, error } = useMemo(() => decodeJwt(jwt), [jwt]);`. `clear()` just sets `jwt` to `''`.
- `claims.ts:37` (no-useless-assignment): `let timeString: string;` with the existing branches assigning it.

The mount-time `setTimeout(() => setJwt(SAMPLE_JWT), 300)` effect (`Tool.tsx:222-226`) stays as is (behaviour: demo token appears after 300 ms). Drop its `eslint-disable` by listing no deps and not reading props (it already reads none).

- [ ] Characterise → move → gates → commit.

---

### Task 29: Split `regex-tester/Tool.tsx` (768); fix `:311`

**Files:**

- Create:
  - `lib/templates.ts` (`TEMPLATES`, `CATEGORY_LABEL`, the `RegexTemplate` type → `types.ts`)
  - `lib/flags.ts` (`FLAG_INFO`, `flagsString(flags)`)
  - `lib/match.ts` (`runRegex(pattern, flags: Flags, text): { matches: Match[]; isValid: boolean; errorMessage: string }`, moved from the effect at 309-358; `MAX_MATCHES = 1000`)
  - `lib/match.test.ts`
  - `components/MatchItem.tsx` (192-281)
  - `components/LivePreview.tsx` (`renderHighlighted` 378-404 + gutter/content block 705-720, with the Tailwind classes from Task 21)
  - `components/FlagToggles.tsx`
  - `components/TemplatePicker.tsx` (`groupedTemplates`, `handleTemplateSelect`)
- Modify: `Tool.tsx`

**Test** — `lib/match.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { runRegex } from './match';

const F = {
  global: true,
  ignoreCase: false,
  multiline: false,
  dotAll: false,
  unicode: false,
  sticky: false,
  hasIndices: false,
};

describe('runRegex', () => {
  it('finds all global matches with groups and named groups', () => {
    const r = runRegex('(?<d>\\d)(x)?', F, 'a1b2x');
    expect(r.isValid).toBe(true);
    expect(r.matches.map((m) => [m.text, m.index])).toEqual([
      ['1', 1],
      ['2x', 3],
    ]);
    expect(r.matches[1].groups).toEqual(['2', 'x']);
    expect(r.matches[0].namedGroups).toEqual({ d: '1' });
  });
  it('non-global returns the first match only', () => {
    expect(
      runRegex('\\d', { ...F, global: false }, 'a1b2').matches,
    ).toHaveLength(1);
  });
  it('advances on zero-length matches and caps at 1000', () => {
    expect(runRegex('(?:)', F, 'x'.repeat(5000)).matches).toHaveLength(1000);
  });
  it('reports invalid patterns', () => {
    const r = runRegex('(', F, 'a');
    expect(r.isValid).toBe(false);
    expect(r.matches).toEqual([]);
    expect(r.errorMessage).toMatch(/Invalid regular expression/);
  });
  it('empty pattern or empty text yields no matches and is valid', () => {
    expect(runRegex('', F, '')).toEqual({
      matches: [],
      isValid: true,
      errorMessage: '',
    });
    expect(runRegex('a', F, '')).toEqual({
      matches: [],
      isValid: true,
      errorMessage: '',
    });
  });
});
```

An empty pattern returns `{ matches: [], isValid: true, errorMessage: '' }` even when there is text, because the current effect short-circuits on `!pattern`. Keep that check first in `runRegex`. That is why the cap test uses the non-empty zero-length pattern `'(?:)'`.

**Warning `:311`.** `const { matches, isValid, errorMessage } = useMemo(() => runRegex(pattern, flags, testString), [pattern, flags, testString]);` and delete the three states and the effect.

- [ ] Characterise → move → gates → commit.

---

### Task 30: Split `color-tester/Tool.tsx` (706); fix `:168`, `lib/color-analysis.ts:43,79`, `lib/color-convert.ts:49`

**Files:**

- Create:
  - `components/Swatch.tsx` (119-138, Task 22 classes)
  - `components/PreviewTab.tsx` (`renderPreview`, 314-351)
  - `components/AccessibilityTab.tsx` (`renderAccessibility`, 353-…, plus `wcagLevel`, 110-117)
  - `components/HarmonyTab.tsx` (`renderHarmony`, 250-283)
  - `components/PsychologyTab.tsx` (285-312)
  - `components/SavedPalette.tsx` (saved colours list + export button)
  - `lib/palette.ts` (`INITIAL_PALETTE`, 53-108; `toHex(r,g,b)`; `luminance(r,g,b)`; `textColorFor(r,g,b)`, from 158-164)
  - `lib/palette.test.ts`, `lib/color-convert.test.ts`, `lib/color-analysis.test.ts`
- Modify: `Tool.tsx`, `lib/color-convert.ts`, `lib/color-analysis.ts`

**Tests**

```ts
// lib/color-convert.test.ts
expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
expect(calculateHSL(255, 0, 0)).toMatchObject({ h: 0, s: 100, l: 50 });
expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
// lib/color-analysis.test.ts
expect(calculateContrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 1);
expect(calculateContrastRatio([0, 0, 0], [0, 0, 0])).toBeCloseTo(1, 5);
// lib/palette.test.ts
expect(toHex(255, 105, 180)).toBe('#ff69b4');
expect(textColorFor(255, 255, 255)).toBe('#1a202c');
expect(textColorFor(0, 0, 0)).toBe('#ffffff');
```

Read `calculateHSL`/`hslToRgb` for their exact return shape (rounded? 0–1 or 0–100?) and adapt the expectations to the current code.

**Warnings:**

- `Tool.tsx:168` (set-state-in-effect): replace the effect and the four states it sets (`colorHarmony`, `colorNameSuggestion`, `colorMood`, `contrastRatios`) with one memo:

  ```ts
  const analysis = useMemo(() => {
    const hsl = calculateHSL(red, green, blue);
    return {
      harmony: generateHarmonyColors(hsl.h, hsl.s, hsl.l),
      name: determineColorName(hsl.h, hsl.s, hsl.l),
      mood: determineColorMood(hsl.h, hsl.s, hsl.l),
      contrast: {
        white: calculateContrastRatio([red, green, blue], [255, 255, 255]),
        black: calculateContrastRatio([red, green, blue], [0, 0, 0]),
      },
    };
  }, [red, green, blue]);
  ```

- `color-analysis.ts:43` (`name`) and `:79` (`mood`): declare without the dead initial value (`let name: string;`). Every branch assigns it.
- `color-convert.ts:49` (`r`, `g`, `b`): `let r: number, g: number, b: number;` with no dead initial values.

- [ ] Characterise → move → gates → commit.

---

### Task 31: Split `calculator` (`Tool.tsx` 655, `hooks/useCalculator.ts` 689); fix `useCalculator.ts:60,64`

**Files:**

- Create:
  - `lib/scientific.ts`: pure unary ops moved from the hook (279-491): `square`, `squareRoot`, `reciprocal`, `factorial`, `trig(fn, x, angleUnit)` covering sin/cos/tan/asin/acos/atan/sinh/cosh/tanh. Each returns `{ value: number } | { error: string }` with the hook's current error strings.
  - `lib/expression.ts`: `checkParenthesesBalance(expr)` (493-501), `evaluateExpression(expr, angleUnit)` over mathjs (503-520)
  - `lib/display.ts`: `formatDisplay(value)` (116-136), `applyOperator(a, b, op)` (from `performOperation`, 198-261)
  - `lib/scientific.test.ts`, `lib/expression.test.ts`, `lib/display.test.ts`
  - `hooks/useCalculatorKeyboard.ts`: `useCalculatorKeyboard(handlers: { inputDigit(n: number): void; clear(): void; … })`. Keep the latest handlers in a ref updated in a layout effect, and attach one `keydown` listener once. Declare it **after** the functions it calls; that fixes `react-hooks/immutability` at 60/64 and removes the `eslint-disable` at 67.
  - `components/CalcKey.tsx` (45-72)
  - `components/Keypad.tsx` (standard + scientific key grids)
  - `components/HistoryPanel.tsx` (history + favorites lists)
  - `components/MemoryPanel.tsx` (M1–M3 registers)
- Modify: `hooks/useCalculator.ts` (state machine only; ≤ 300 lines), `Tool.tsx`

**Tests** (examples; read the moved code for exact error strings and formatting)

```ts
// lib/scientific.test.ts
expect(factorial(5)).toEqual({ value: 120 });
expect(factorial(-1)).toEqual({ error: expect.any(String) });
expect(squareRoot(-4)).toEqual({ error: expect.any(String) });
expect((trig('sin', 90, 'deg') as { value: number }).value).toBeCloseTo(1, 10);
expect(
  (trig('sin', Math.PI / 2, 'rad') as { value: number }).value,
).toBeCloseTo(1, 10);
// lib/expression.test.ts
expect(checkParenthesesBalance('(1+(2*3))')).toBe(true);
expect(checkParenthesesBalance('(1+2')).toBe(false);
expect(checkParenthesesBalance(')(')).toBe(false);
// lib/display.test.ts
expect(applyOperator(6, 3, '/')).toBe(2);
expect(applyOperator(2, 3, '^')).toBe(8); // only if '^' is a supported operator in performOperation
```

The `useCalculator.ts:82` warning was fixed in Task 9.

- [ ] Characterise → move → gates → manual pass in standard, scientific and expression modes (with the graph). Then commit.

---

### Task 32: Small tools — derived state with pure libs; split `unit-converter` (602)

**Files and warnings:**

| Tool                  | Create                                                                                                                                                                                                                                            | Warning fixed          | Change                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base64-converter`    | `lib/base64.ts` + test                                                                                                                                                                                                                            | `Tool.tsx:34`          | `convertBase64(text, mode): { output: string; error: string }` (the effect body at 32-48); `useMemo` in the component                                                                                                                                                                    |
| `hash-generator`      | `lib/hash.ts` + test                                                                                                                                                                                                                              | `Tool.tsx:80`          | `ALGORITHMS` + `computeHashes(input, selected): Record<string,string>` (effect body 78-97, including the per-algorithm `Error generating <name>` fallback); `useMemo`                                                                                                                    |
| `number-converter`    | `lib/convert.ts` + test                                                                                                                                                                                                                           | `Tool.tsx:92`          | `NUMBER_TYPES` + `convertNumber(input, type): { results: Results; error: string }`. Invalid input → `error` set and results blank (B7). `useMemo`                                                                                                                                        |
| `url-encoder-decoder` | `lib/codec.ts` + test                                                                                                                                                                                                                             | `Tool.tsx:37`          | `codec(text, mode): { output: string; error: string }`, with the error from `(err as Error).message`                                                                                                                                                                                     |
| `url-parser`          | `lib/parse-url.ts` + test                                                                                                                                                                                                                         | `Tool.tsx:63`          | `parseUrl(url): { parsed: ParsedUrl \| null; isValid: boolean }` (effect body 62-80); `useMemo`                                                                                                                                                                                          |
| `unit-converter`      | `lib/categories.tsx` (`CATEGORIES`, 47-184; `.tsx` because each category carries a lucide icon element), `lib/convert.ts` (`convertUnits`, `formatNumber`, `getTimeSince`), `components/ConversionCard.tsx`, `components/HistoryList.tsx` + tests | `Tool.tsx:241`, `:246` | 241: do the unit reset inside the category change handler (`selectCategory(c)` sets the category, `fromUnit = c.units[0]` and `toUnit = c.units[1]`). 246: `const toValue = useMemo(() => convertUnits(fromValue, fromUnit, toUnit, selectedCategory), […])`; delete the `toValue` state |

**Tests** (exact, from the current code):

```ts
// base64
expect(convertBase64('hello', 'encode')).toEqual({
  output: 'aGVsbG8=',
  error: '',
});
expect(convertBase64('aGVsbG8=', 'decode')).toEqual({
  output: 'hello',
  error: '',
});
expect(convertBase64('%%%', 'decode').error).toBe(
  'Could not decode. Please ensure you entered valid Base64.',
);
expect(convertBase64('', 'encode')).toEqual({ output: '', error: '' });
// codec
expect(codec('a b&c', 'encode')).toEqual({ output: 'a%20b%26c', error: '' });
expect(codec('%E0%A4%A', 'decode').output).toBe('');
expect(codec('%E0%A4%A', 'decode').error).not.toBe('');
// number
expect(convertNumber('255', decimalType).results).toEqual({
  binary: '11111111',
  decimal: '255',
  hexadecimal: 'FF',
  octal: '377',
});
expect(convertNumber('12', binaryType)).toMatchObject({
  error: 'Invalid Binary format',
}); // label from NUMBER_TYPES
// unit-converter
expect(convertUnits('100', celsius, fahrenheit, temperature)).toBe('212');
expect(convertUnits('0', celsius, kelvin, temperature)).toBe('273.15');
expect(convertUnits('', m, km, length)).toBe('');
expect(formatNumber('1234567.89')).toBe('1,234,567.89');
// url
expect(parseUrl('https://u:p@x.test:8080/a?b=1#c')).toMatchObject({
  isValid: true,
  parsed: { protocol: 'https:', hostname: 'x.test', port: '8080' },
});
expect(parseUrl('nope').isValid).toBe(false);
// hash
expect(computeHashes('abc', 'md5')).toEqual({
  md5: '900150983cd24fb0d6963f7d28e17f72',
});
```

Define the fixtures at the top of each test file by looking them up in the moved constants:

```ts
const decimalType = NUMBER_TYPES.find((t) => t.value === 'decimal')!;
const binaryType = NUMBER_TYPES.find((t) => t.value === 'binary')!;
const temperature = CATEGORIES.find((c) => c.name === 'Temperature')!;
const celsius = temperature.units.find((u) => u.name === 'Celsius')!;
const fahrenheit = temperature.units.find((u) => u.name === 'Fahrenheit')!;
const kelvin = temperature.units.find((u) => u.name === 'Kelvin')!;
const length = CATEGORIES.find((c) => c.name === 'Length')!;
const m = length.units.find((u) => u.name === 'Meters')!;
const km = length.units.find((u) => u.name === 'Kilometers')!;
```

Before running, confirm the exact `value`/`name` strings ('decimal', 'Meters', …), the `md5` id in `ALGORITHMS`, and the `Invalid <label> format` label in the source. Correct the lookup strings to match the source; never change the source to match the test.

- [ ] Characterise → move → gates → commit, one commit per tool: `refactor(<id>): derive output with a pure lib`.

---

### Task 33: Split `random-data-generator` (463 + `lib/schema.ts` 568), `log-parser` (529), `json-and-xml-viewer` (482), `password-generator` (425)

**random-data-generator.** Warnings `lib/schema.ts:383`, `:461` (`nextIndex`, no-useless-assignment).

- `lib/field-types.ts`: `fieldTypes`, `fieldDescriptions`, `defaultSchema` (26-110).
- `lib/generate.ts`: `generateRandomValue`, `generateData`, `flattenData`, `getAllHeaders`, `dataToJsonBlob` (117-298, 548-552). Keep lodash.
- `lib/schema.ts`: `getFieldPath`, `addField`, `removeField`, `updateField`, `moveField` (112-116, 300-546). Fix `nextIndex` by declaring without a dead initial value.
- `downloadJson` → a two-line component handler, `saveBlob(dataToJsonBlob(data), 'generated-data.json')`. Delete it from lib.
- `components/FieldEditor.tsx` (54-257 of `Tool.tsx`), `components/DataPreview.tsx` (JSON/table preview).
- Tests in `lib/schema.test.ts`: add a root field; add a nested child under an object field via its path; `removeField` by path; `updateField` rename keeps position; `moveField` up/down swaps and is a no-op at the edges. In `lib/generate.test.ts`: `generateData(defaultSchema, 3)` has length 3 and every item has every top-level field name; `flattenData` of a nested object produces dotted keys (read the function for its separator).

**log-parser.** Warning `hooks/useLogParser.ts:60`.

- Split `lib/parse.ts` (393): `lib/parse.ts` (`detectLogType`, `parseLogsByType`, the per-format parsers), `lib/filter.ts` (`filterLogs`, `countLogsByLevel`), `lib/levels.ts` (`getLogLevelConfig`, `createSampleLogs`).
- `components/LogRow.tsx` (104-181), `components/InputPanel.tsx` (`inputPanel`), `components/FilterBar.tsx`.
- `useLogParser.ts:60`: `const parsedLogs = useMemo(() => (logText.trim() ? parseLogsByType(logText, logType) : []), [logText, logType]);` and delete the state and effect.
- Tests: `detectLogType` on one sample line per format (take them from `createSampleLogs`); `parseLogsByType` of the Spring sample returns entries with `level` and `message`; `filterLogs` by level, text and component; `countLogsByLevel`.

**json-and-xml-viewer.** Warnings `Tool.tsx:93`, `:172`, `:194`.

- `lib/xml.ts`: `xmlToJson(node)` (106-134) and `formatXML(xml)` (136-147) at module scope. This fixes the two `exhaustive-deps` warnings, because module functions are not dependencies.
- `lib/xml.test.ts`: `xmlToJson` of `<a x="1"><b>t</b></a>` parsed with `DOMParser` (jsdom) yields the current shape (read the function); `formatXML` indents nested tags.
- `components/EditorPane.tsx` (`renderEditor` + `editorPanel`), `components/ViewerPane.tsx` (`renderViewerBody` + `viewerPanel`).
- `:93`: `const highlightedLines = useMemo(() => (searchTerm ? matchingLines(inputText, searchTerm) : []), [inputText, searchTerm]);`, with `matchingLines` in `lib/xml.ts` or `lib/search.ts` plus a test. Delete the state and effect.
- Remove the 8 `any`s where a type is obvious (`XMLNode`, `unknown`). Keep any `eslint-disable` only where xyflow typing forces it, with a reason comment.

**password-generator.** Warning `Tool.tsx:312`.

- `components/HighlightedPassword.tsx`, `components/CharLegend.tsx`, `components/CharacterTypeOption.tsx`, `components/PasswordDisplay.tsx` (47-230).
- `lib/strength.ts`: `classifyChar` (33-38), `getSecurityLevel` (232-239), and the generation function. Read `generatePassword` in the component: it must use `lib/secure-random.ts`; move it as `generatePassword(options): string`.
- `:312`: initialise with `useState(() => generatePassword(DEFAULT_OPTIONS))` and delete the mount effect and its `eslint-disable`.
- Tests: `classifyChar('A')==='uppercase'`, `'a'`→`'lowercase'`, `'7'`→`'number'`, `'#'`→`'special'`. `generatePassword({ length: 32, uppercase: true, lowercase: false, number: false, special: false })` matches `/^[A-Z]{32}$/` (use the real option names). Every enabled class appears at least once if the current code guarantees that (read it; assert only what it guarantees).

- [ ] Characterise → move → gates → one commit per tool.

---

### Task 34: Lint to zero, guard it, final verification and handoff

**Files:**

- Modify: `src/pdf/edit/load.ts:32`, `package.json` (`lint` script), `docs/superpowers/specs/2026-10-01-pdf-suite-and-modular-architecture-design.md` (status line)
- Create: `docs/superpowers/plans/2026-10-01-phase-4-app-migration.notes.md`

- [ ] **Step 1:** `src/pdf/edit/load.ts:32` changes `let count = 0;` to `let count: number;`. The `try` assigns it and the `catch` throws.

- [ ] **Step 2:** Run `pnpm lint` → Expected: `0 problems`. If anything remains, fix it in place; Appendix B lists every warning and its task.

- [ ] **Step 3: Guard.** In `package.json`, set `"lint": "eslint . --max-warnings 0"`, so warnings can't creep back in. Leave the rule severities in `eslint.config.js` as they are.

- [ ] **Step 4: Grep gates**

```bash
grep -rn "createElement('a')\|createElement(\"a\")\|navigator.clipboard\|FileReader\|formatFileSize\|window.alert" src | grep -v "src/shared/"
grep -rn "from 'sonner'" src | grep -v "src/shared/lib/notify.ts\|src/app/App.tsx"
grep -rn 'type="file"' src | grep -v "src/shared/ui/"
grep -rn "module.css\|redux\|components/ui\|@/types\|types/\|@/lib/utils\|@/hooks" src --include=*.ts* | grep -v "src/tools/[a-z-]*/types"
grep -rnE "from ['\"](\.\./){2,}" src/tools
find src/tools -name "*.ts*" -not -name "*.test.*" -exec wc -l {} + | awk '$1>400 && $2!="total"'
ls src/components src/hooks src/types src/lib 2>&1 | grep -c "No such file"
```

Expected: the first six print nothing, and the last prints `4`. If a PdfCompressor (phase-3-owned) file trips a gate, note it and exclude it only if phase 3 has not yet replaced the tool.

- [ ] **Step 5: Merge gate.** Run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, then `pnpm test:e2e` three consecutive times. Record the counts.

- [ ] **Step 6: Manual browser pass** (`pnpm dev`). Open every tool from the dashboard. For each one, exercise its main action once:
  - encode/decode, hash, convert, generate
  - parse sample data (CSV, logs, JSON/XML, regex template)
  - pomodoro start/pause
  - API request GET `https://jsonplaceholder.typicode.com/users/1`
  - QR download
  - image convert
  - Rive load (local file)

  Confirm toasts appear bottom-right from the single Toaster, and that no per-tool banners or toasters remain.

- [ ] **Step 7: Notes file.** `docs/superpowers/plans/2026-10-01-phase-4-app-migration.notes.md` records:
  - test counts
  - deviations from this plan and why, including any Step 0 signature adjustments
  - the B1–B10 table as shipped
  - removed dependencies, with grep evidence
  - before/after line counts for each split file
  - any third-party console-error allow-list entries (expected: none)

- [ ] **Step 8:** Update the spec status line to `Phases 1 and 4 implemented; phase 3 …` (keep whatever phase-3 status is current). Commit:

```bash
git add -A
git commit -m "chore: lint at zero warnings, phase 4 verification notes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Open PR E (summary, test counts, notes link, Claude Code trailer) and merge after the gate.

---

## Appendix A — Audit: tool → issues found → fixing task

Audit at HEAD `35b7e2e`. Paths are legacy; line numbers come from the plan-time audit. Size = total lines in the tool folder (largest file in brackets).

| Tool (legacy folder → new)                                                | Size                                                | Issues found (file:line)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Fixed in                                                                                                                                        |
| ------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **API Request** `ApiTester` → `api-request`                               | 1052 [`ApiTester.tsx` 1039]                         | `useLocalStorage` (`../../hooks/useLocalStorage.hook`) for `apiTesterCollections` :60, :237-262; 5× `window.alert` :305, :328, :376, :442, :465; async `fetch` without cancel :303-416; ids `Date.now().toString()` :445, :494, :507; mutating tree ops :452-482, :532-544 (delete only searches first collection); `../../types/ApiTesterTypes` :59; 15 unused exported types; 3 `any`; depth inline styles :127, :173; file > 400                                                                                                                                                                                                                                              | T8 (store + legacy, notify, useJob, lib/request, lib/collections, newId, B6); T17 (types); T22 (styles kept as data-driven); T23 (split, `any`) |
| **Base64 Converter** `Base64Convertor` → `base64-converter`               | 154                                                 | shim imports `../../components/ui` :20, `../../hooks/useClipboard` :21; set-state-in-effect :34                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | T5; T18; T32                                                                                                                                    |
| **CSV/TSV Viewer** `CSVViewer` → `csv-viewer`                             | 790 [777]                                           | `FileReader` :229-238; hand-rolled CSV download anchor :339-361; parse via callback with ad-hoc errors :196-222; `../../types/CsvTsvTypes` :55; 8 unused types; inline `cursor: pointer` :617; set-state-in-effect :286; file > 400                                                                                                                                                                                                                                                                                                                                                                                                                                              | T4; T7 (loadTextFile + useJob + lib/parse); T17; T22; T27                                                                                       |
| **Calculator** `Calculator` → `calculator` (case-only rename)             | 1512 [`useCalculator.ts` 689, `Calculator.tsx` 655] | direct `localStorage` ×3 keys :81-103 (+ set-state-in-effect :82); immutability :60, :64 + `eslint-disable` :67; `@/lib/utils` in `GraphDisplay.tsx:5`; static inline style `GraphDisplay.tsx:131`; `../../../types/CalculatorTypes` :15; both files > 400                                                                                                                                                                                                                                                                                                                                                                                                                       | T9 (store + legacy); T15 (two-step rename); T17; T19; T22; T31                                                                                  |
| **Color Tester** `ColorTester` → `color-tester`                           | 987 [706]                                           | raw `navigator.clipboard` :178 with local `copiedKey` :147; hand-rolled JSON download :229-240; set-state-in-effect :168; useless assignments `CalculationUtils.ts:43,79`, `ColorConverters.ts:49` (r, g, b); static inline colours :361, :364, :378, :381; Swatch inline style :128-135; data-driven colour styles :316-426; `../../types/ColorTesterTypes` :40 and `utils/CalculationUtils.ts:1`; `utils/` naming; file > 400                                                                                                                                                                                                                                                  | T4; T5; T17; T22; T30                                                                                                                           |
| **Date Calculator** `DateCalculator` → `date-calculator`                  | 280                                                 | folder naming only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | T15                                                                                                                                             |
| **Hash Generator** `HashGenerator` → `hash-generator`                     | 211                                                 | shim imports :19-20; duplicate local `copiedId` + `setTimeout` :67, :99-103; set-state-in-effect :80                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | T5; T18; T32                                                                                                                                    |
| **Image Optimizer** `ImageOptimiser` → `image-optimizer`                  | 393                                                 | local `formatFileSize` :34-38; `FileReader.readAsDataURL` :96-111; DOM `<canvas ref>` pipeline with ad-hoc error strings :114-158; data-URL download anchor :160-168 (fixed name); size reduction by re-parsing formatted strings :46-66; no cancel or useJob                                                                                                                                                                                                                                                                                                                                                                                                                    | T6 (lib/convert, useJob, formatBytes, saveBlob + deriveFilename, B2)                                                                            |
| **JWT Decoder** `JWTDecoder` → `jwt-decode`                               | 933 [772]                                           | duplicate unused `hooks/useClipboard.tsx`; shim import :55; one shared `copied` across four buttons :212-628; set-state-in-effect `useJWTDecoder.tsx:44`; useless assignment `utils/utils.tsx:37`; dead hidden icon `style={{display:'none'}}` :766; `../../types/JwtTypes` :47, `hooks/useJWTDecoder.tsx:2`, `utils/utils.tsx:15`; `.tsx` hook without JSX; file > 400                                                                                                                                                                                                                                                                                                          | T5 (delete dup, keyed copy, B10); T17; T22; T28                                                                                                 |
| **Json and Xml Viewer** `JsonViewer` → `json-and-xml-viewer`              | 1682 [`JsonViewer.tsx` 482]                         | entry file in `components/`; hand-rolled download :196-208; raw clipboard `TreeView.tsx:85`; 2 CSS modules (`DataNode.module.css`, `treeview/CustomNode.module.css`); JS style object `editorStyles` :82-89 :238; static inline styles `treeview/DataFlow.tsx:53-60`, `:86-91`; hard-coded `#60A5FA` `layoutManager.tsx:40`; dead files `hooks/useLineInteractions`, `useLineTracking` (warning :35), `useScrollSync` (warning :27), `useSyntaxHighlighting`, `globalStyles.tsx` (sole users of `dompurify` and `DataViewerTypes`); set-state-in-effect :93; exhaustive-deps :172, :194; `.tsx` without JSX (`layoutManager`, `useDataProcessor`); 21 `any`/disables; file > 400 | T4; T5; T15 (entry → root `Tool.tsx`); T17 (dead files, dompurify, `.ts`); T21; T22; T33                                                        |
| **Log Parser** `LogParser` → `log-parser`                                 | 1191 [529]                                          | hand-rolled download :215-227; dead `exportLogsAsJson` (data-URI anchor) and `copyLogsToClipboard` `utils/utils.ts:304-321`; local `useCopyToClipboard` `hooks/useLogParser.ts:183-196`; one `copied` across all rows; hidden `darkMode` toggling `<html class="dark">` `useLogParser.ts:23-31`, `:66-74`; set-state-in-effect `useLogParser.ts:60`; inline transform :154-157; `../../types/LogParserTypes` :56 and others; 7 unused types; file > 400                                                                                                                                                                                                                          | T4; T5 (B10); T9 (B8); T17; T22; T33                                                                                                            |
| **Number Converter** `NumberConverter` → `number-converter`               | 394                                                 | raw clipboard :121 + local `copied`; set-state-in-effect :92 (stale results on invalid input)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | T5; T32 (B7)                                                                                                                                    |
| **Password Generator** `PasswordGenerator` → `password-generator`         | 611 [425]                                           | raw clipboard :303; JS style tokens `CHAR_CSS_VARS` :40-45 used in inline styles :58-64, :73, :95-98; set-state-in-effect :312 + `eslint-disable`; `../../../types/PasswordGeneratorTypes` `utils/utils.ts:1`; `utils/` naming; file > 400                                                                                                                                                                                                                                                                                                                                                                                                                                       | T5; T17; T22; T33                                                                                                                               |
| **PDF Compressor** `PdfCompressor` (disabled; **owned by phase 3**)       | 847 [834]                                           | local `formatFileSize` :476; object-URL plumbing :76-129, :374, :442-456; `../../types/ToolTypes` :40 (shim) and `PdfCompressorTypes` :46; `console.log` :387                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Phase 3 rebuild. If it is still present at PR C: T15 (rename only), T17 (types), T18 (ToolProps import)                                         |
| **Pomodoro** `pomodoro`                                                   | 1524 [`main.tsx` 938]                               | Redux Toolkit + react-redux + redux-persist (`store/`, `hook.ts`, `Provider`/`PersistGate` :911-934); double-counted completion and double sound (middleware :34-90 + `main.tsx:233-278`); task progress on break completion :258-269; auto-start never restarts the worker (`usePomodoro.tsx:39-47`); streak never increments (`pomodoro-middleware.ts:132-153`); `crypto.randomUUID` `tasksSlice.ts:13`; `console.log` per tick `timerWorker.ts:8`; 2 MB base64 WAV in JS `Audio.ts`; exhaustive-deps `usePomodoro.tsx:48`; inline styles :327, :413-417; `../../../../types/PomodoroTypes` ×8                                                                                 | T11–T14 (B5)                                                                                                                                    |
| **QR Code Generator** `QrCodeGenerator` → `qr-code-generator`             | 1486 [1011]                                         | canvas/SVG download anchor `utils/qrUtils.ts:150-177`; set-state-in-effect `useQrCode.ts:73`; `../../types/qrTypes` ×3; unused `QRCodeProps`; `utils/` naming; file > 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | T4 (qrExport + saveBlob); T17; T24                                                                                                              |
| **Random Data Generator** `RandomDataGenerator` → `random-data-generator` | 1044 [`utils.tsx` 568]                              | download anchor with 100 ms revoke `utils.tsx:554-568`; useless assignments `utils.tsx:383`, `:461`; `.tsx` without JSX; `../../types/RandomDataGeneratorTypes` :52; unused `FlattenedDataItem`; both files > 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                | T4 (B1); T17; T33                                                                                                                               |
| **Rive Animation Player** `RiveAnimationPlayer` → `rive-animation-player` | 1020 [1006]                                         | per-tool `<Toaster/>` :811 + `toast` :61, :330, :462; local `formatFileSize` :132-136; `FileReader.readAsArrayBuffer` :408-427 with no type check; set-state-in-effect :329; immutability :341 (mutating `useState` Rive instance); static inline styles :890-897, :901-909, :932-934, :941; unused `src/types/RiveAnimationPlayerTypes.ts`; local types in component :63-96; file > 400                                                                                                                                                                                                                                                                                         | T7 (readBytes + RIVE signature, notify, formatBytes, B3); T17; T22; T25                                                                         |
| **Regex Tester** `regexTester` → `regex-tester`                           | 831 [768]                                           | CSS module `LivePreview.module.css` :40, :393, :705-715; raw clipboard :362 + local `copied`; set-state-in-effect :311; static inline `minWidth` :471; file > 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | T5; T21; T22; T29                                                                                                                               |
| **Text Diff Checker** `TextDiffChecker` → `text-diff-checker`             | 1218 [849]                                          | local `useNotification` + in-page alert banner :41, :139, :832-843; two raw `<input type="file">` :522-533 with refs; `FileReader` :202-210; hand-rolled download :249-258; raw clipboard :169; preserve-caught-error `useIntelligentDiff.tsx:257`; `.tsx` hooks without JSX; `../../../types/TextDiffCheckerTypes` ×4; file > 400                                                                                                                                                                                                                                                                                                                                               | T4; T5; T7 (FilePicker + loadTextFile + notify, B3); T17; T26                                                                                   |
| **URL Encoder/Decoder** `URLEncoderDecoder` → `url-encoder-decoder`       | 224                                                 | shim import :24; raw clipboard :56 + local `copied`; set-state-in-effect :37                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | T5; T18; T32                                                                                                                                    |
| **Unit Converter** `UnitConverter` → `unit-converter`                     | 615 [602]                                           | set-state-in-effect :241, :246; `../../types/UnitConverterTypes` :45; file > 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | T17; T32                                                                                                                                        |
| **URL Parser** `UrlParser` → `url-parser`                                 | 344                                                 | shim import :27; raw clipboard :85 (copy) and :92 (paste, failure only logged); set-state-in-effect :63                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | T5 (readClipboardText, B4); T18; T32                                                                                                            |

**App shell and shared**

| Area                                                                                 | Issues found                                                                                                                                                                                        | Fixed in                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `src/app/Dashboard.tsx`                                                              | set-state-in-effect :57 (favorites load); `AnimatedBackground` with inline styles :22, :149; `@/lib/utils` :19                                                                                      | T9; T20 (B9); T19                             |
| `src/app/ToolLayout.tsx`                                                             | impure `Date.now()` in `useState` :59                                                                                                                                                               | T9                                            |
| `src/app/registry.ts`                                                                | does not validate folder = id (spec §3.2); test uses `arrayContaining` (phase-1 deferred minor)                                                                                                     | T16                                           |
| `src/components/Loadingfallback.tsx`                                                 | dead (zero importers; imports the shim)                                                                                                                                                             | T18                                           |
| `src/components/ui/index.ts`, `src/hooks/useClipboard.tsx`, `src/types/ToolTypes.ts` | phase-1 TEMP shims                                                                                                                                                                                  | T5 + T18 (importers repointed, files deleted) |
| `src/hooks/useLocalStorage.hook.tsx`                                                 | only API Request uses it                                                                                                                                                                            | T8                                            |
| `src/types/*` (18 files)                                                             | global types folder; 3 entirely unused files (`NumberConverterTypes`, `PeriodicTableTypes`, `RiveAnimationPlayerTypes`); `DataViewerTypes` used only by dead files; 44 unused exported declarations | T13 (`PomodoroTypes`), T17, T18               |
| `src/lib/utils.ts`                                                                   | `cn` outside `shared` (28 importers)                                                                                                                                                                | T19                                           |
| `src/shared/ui/button.tsx`                                                           | `react-refresh/only-export-components` :29 (`buttonVariants`)                                                                                                                                       | T19                                           |
| `src/pdf/edit/load.ts`                                                               | no-useless-assignment :32                                                                                                                                                                           | T34                                           |
| `package.json`                                                                       | Redux ×3; `dompurify` orphaned by dead code; `@types/react`/`@types/react-dom` duplicated in `dependencies`; `@types/crypto-js`/`@types/lodash` in `dependencies`                                   | T14; T17; T20                                 |

## Appendix B — The 38 pre-existing lint warnings → task

| #     | Location (legacy path:line)                         | Rule                   | Task               |
| ----- | --------------------------------------------------- | ---------------------- | ------------------ |
| 1     | `src/app/Dashboard.tsx:57`                          | set-state-in-effect    | T9                 |
| 2     | `src/app/ToolLayout.tsx:59`                         | purity                 | T9                 |
| 3     | `src/pdf/edit/load.ts:32`                           | no-useless-assignment  | T34                |
| 4     | `src/shared/ui/button.tsx:29`                       | only-export-components | T19                |
| 5     | `Base64Convertor/Base64Convertor.tsx:34`            | set-state-in-effect    | T32                |
| 6     | `CSVViewer/Csv-Tsv-viewer.tsx:286`                  | set-state-in-effect    | T27                |
| 7–8   | `Calculator/hooks/useCalculator.ts:60`, `:64`       | immutability           | T31                |
| 9     | `Calculator/hooks/useCalculator.ts:82`              | set-state-in-effect    | T9                 |
| 10    | `ColorTester/ColorTester.tsx:168`                   | set-state-in-effect    | T30                |
| 11–12 | `ColorTester/utils/CalculationUtils.ts:43`, `:79`   | no-useless-assignment  | T30                |
| 13–15 | `ColorTester/utils/ColorConverters.ts:49` (r, g, b) | no-useless-assignment  | T30                |
| 16    | `HashGenerator/HashGenerator.tsx:80`                | set-state-in-effect    | T32                |
| 17    | `JWTDecoder/hooks/useJWTDecoder.tsx:44`             | set-state-in-effect    | T28                |
| 18    | `JWTDecoder/utils/utils.tsx:37`                     | no-useless-assignment  | T28                |
| 19    | `JsonViewer/components/JsonViewer.tsx:93`           | set-state-in-effect    | T33                |
| 20–21 | `JsonViewer/components/JsonViewer.tsx:172`, `:194`  | exhaustive-deps        | T33                |
| 22    | `JsonViewer/hooks/useLineTracking.tsx:35`           | exhaustive-deps        | T17 (file deleted) |
| 23    | `JsonViewer/hooks/useScrollSync.tsx:27`             | exhaustive-deps        | T17 (file deleted) |
| 24    | `LogParser/hooks/useLogParser.ts:60`                | set-state-in-effect    | T33                |
| 25    | `NumberConverter/NumberConverter.tsx:92`            | set-state-in-effect    | T32                |
| 26    | `PasswordGenerator/Generator.tsx:312`               | set-state-in-effect    | T33                |
| 27    | `QrCodeGenerator/hooks/useQrCode.ts:73`             | set-state-in-effect    | T24                |
| 28–29 | `RandomDataGenerator/utils.tsx:383`, `:461`         | no-useless-assignment  | T33                |
| 30    | `RiveAnimationPlayer/RiveAnimationPlayer.tsx:329`   | set-state-in-effect    | T25                |
| 31    | `RiveAnimationPlayer/RiveAnimationPlayer.tsx:341`   | immutability           | T25                |
| 32    | `TextDiffChecker/hooks/useIntelligentDiff.tsx:257`  | preserve-caught-error  | T26                |
| 33    | `URLEncoderDecoder/URLEncoderDecoder.tsx:37`        | set-state-in-effect    | T32                |
| 34–35 | `UnitConverter/UnitConverter.tsx:241`, `:246`       | set-state-in-effect    | T32                |
| 36    | `UrlParser/UrlParser.tsx:63`                        | set-state-in-effect    | T32                |
| 37    | `pomodoro/hooks/usePomodoro.tsx:48`                 | exhaustive-deps        | T13 (file deleted) |
| 38    | `regexTester/RegexStudio.tsx:311`                   | set-state-in-effect    | T29                |

Lint must also stay clean for new warnings introduced while touching files. Task 34 adds `--max-warnings 0`.

## Appendix C — Dependency changes and their evidence

| Package                                                                                                                                                                                                                                                                                                                                                              | Action                                        | Evidence required before the change                                                                                                             | Task            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `@reduxjs/toolkit`, `react-redux`, `redux-persist`                                                                                                                                                                                                                                                                                                                   | remove                                        | `grep -rn "@reduxjs/toolkit\|react-redux\|redux-persist" src test scripts *.ts` → nothing                                                       | T14             |
| `dompurify` (+ `pnpm.overrides["dompurify@<3.4.3"]`)                                                                                                                                                                                                                                                                                                                 | remove                                        | `grep -rn dompurify src` → nothing after the dead `useSyntaxHighlighting.tsx` is deleted; lockfile has no other dependant                       | T17             |
| `@types/react`, `@types/react-dom` (in `dependencies`)                                                                                                                                                                                                                                                                                                               | remove the duplicates; keep `devDependencies` | present in both blocks of `package.json`                                                                                                        | T20             |
| `@types/crypto-js`, `@types/lodash`                                                                                                                                                                                                                                                                                                                                  | move to `devDependencies`                     | type-only packages                                                                                                                              | T20             |
| `lodash`, `crypto-js`, `papaparse`, `mathjs`, `diff`, `dagre`, `@xyflow/react`, `qrcode.react`, `react-plotly.js`, `plotly.js`, `@uiw/react-textarea-code-editor`, `rehype-prism-plus`, `rehype-rewrite`, `@internationalized/date`, `@rive-app/react-canvas`, `class-variance-authority`, `clsx`, `tailwind-merge`, `sonner`, `fflate`, `zustand`, `@arshad-shah/*` | **keep**                                      | each has at least one importer at plan time (`plotly.js` is the peer of `react-plotly.js`; `@arshad-shah/detent` is the peer of `detent-react`) | T20 re-verifies |

## Self-review notes (plan author)

- **Spec coverage.**
  - §8 item 4: shared lib (T2–T9), notify (T5, T7, T8), useJob (T6–T8), store-kit (T8, T9, T12), Redux removal (T11–T14).
  - Naming, `Tool.tsx` and types co-location (T15–T17).
  - CSS modules and inline styles (T21, T22, T13).
  - Dead code (T17, T18, T20).
  - Splits > 400 lines (T23–T33).
  - Temporary re-exports removed (T18).
  - §9 dependency removals (T14, T17, T20).
  - Success criterion 2, "no tool contains its own download, clipboard, file-read or file-size-format code", is checked by the T10 and T34 grep gates.
  - Criterion 3, "adding a tool means adding one folder", is reinforced by the T16 folder = id rule.
- **Type consistency.** These names are used identically across tasks:
  - `loadTextFile`, `readClipboardText`, `FilePicker`, `copiedKey` (T2)
  - `legacy: { keys, read }` (T3, used by T8, T9, T12)
  - `PomodoroState`, `completeSession`, `rolloverDay` (T11, used by T12, T13)
  - `qrToBlob`/`qrFilename` (T4, moved in T17)
  - `convertImage` (T6)
  - `parseDelimited`/`delimiterFor` (T7, moved in T17)
  - `assertRiveFile` (T7, moved in T17)
- **Known judgement calls**, flagged for the controller:
  - B5: pomodoro semantics fixes.
  - B9: AnimatedBackground becomes a CSS utility rather than staying a component. The scope said "remove", and it is not dead code: the dashboard renders it.
  - The PdfCompressor rename is conditional on phase-3 progress.
  - The Text Diff accept list now uses extensions only, with `csv` added to keep MIME parity.
