# PDF Suite & Modular Architecture — Design

**Date:** 2026-10-01
**Branch:** `feat/pdf-suite-foundation`
**Status:** Phases 1–3 implemented; phase 4 in progress

## 1. Intent

**Stated by owner**

- Add a full set of PDF tools: page operations, conversion, annotation, security/metadata, and compression.
- Nothing may be faked or hacked. Use a real third-party package where needed, or our own implementation.
- Prefer the owner's `@arshad-shah/*` packages over third-party ones wherever they fit.
- Clean up the architecture and components into a modular design with one shared, reusable core.
- Stay MIT-licensed (decision recorded: Option 1, the permissive engine stack; AGPL MuPDF was rejected).

**Assumptions (confirmed in review)**

- Fully client-side. No document ever leaves the browser.
- The site stays a single Vite + React 19 SPA deployed via Cloudflare (wrangler).
- Existing tool IDs and URLs are preserved.

**Success criteria**

1. 14 PDF tools work end-to-end on the fixture corpus, with no simulated output.
2. No tool contains its own download, clipboard, file-read or file-size-format code.
3. Adding a tool means adding one folder.
4. Lint, typecheck, unit tests, e2e tests and the build all pass in CI.

## 2. Current state (summary of audit)

- **Registration.** Tools are registered in three places: `src/constants.ts` (TOOL_IDS), `src/data/ToolDefinitions.ts` (metadata) and `src/registry/ToolRegistry.ts` (loaders). `App.tsx` calls `lazy()` inside a render-time `.map`.
- **PDF tools.** There are three, all using pdf-lib only: `PdfMerger` (325 lines), `PdfSplitter` (935) and `PdfCompressor` (834, disabled).
  - The Splitter fakes thumbnails with one-page PDFs in iframes, capped at 50 pages.
  - Object URLs are never revoked.
  - Size formatting, download, file-load and error code is copied in each tool.
- **Repeated code elsewhere.**
  - 12 hand-rolled download anchors.
  - Raw `navigator.clipboard` in ~10 tools, plus a duplicate `useClipboard`.
  - No global toast system. `sonner` is used only by Rive.
  - Ad-hoc `FileReader` calls.
- **State.** Redux Toolkit is used only by pomodoro.
- **Housekeeping.**
  - No tests.
  - Inconsistent folder and file naming.
  - Dead code: `Loadingfallback.tsx`, unused type files, legacy `color` fields.
- **Kit.** The UI kit (`src/components/ui`, 24 files) is in good shape and is kept.

## 3. Architecture

### 3.1 Folder layout (target)

```
src/
  app/              App shell, router, ToolLayout, Dashboard, ErrorBoundaries, global <Toaster/>
  tools/<tool-id>/  index.ts (manifest) · Tool.tsx · components/ · store.ts · lib/ · *.test.ts(x)
  shared/
    ui/             the existing kit (moved from src/components/ui; barrel `@/shared/ui`)
    lib/            files · download · format · clipboard · notify · worker-rpc · errors
    state/          createToolStore, job state machine, useJob
  pdf/
    render/         pdf.js worker + client
    edit/           pure pdf-lib operations (bytes in → bytes out)
    qpdf/           adapter over @arshad-shah/qpdf-wasm (worker)
    compress/       image recompression worker + pipeline orchestration
    components/     PdfDropzone, PageGrid, PageThumb, SortableFileList, JobPanel, PasswordPrompt
test/
  fixtures/         generated + committed sample PDFs/images
  e2e/              Playwright specs
scripts/
  gen-fixtures.ts   fixture generator
```

**Naming and conventions**

- `<tool-id>` folders are kebab-case and match the route (e.g. `pdf-merger`).
- Every tool's entry file is `Tool.tsx`.
- Non-JSX files use `.ts`.
- Types live next to their code. The global `src/types/` is removed in phase 4.
- `@/` aliases are used everywhere; relative imports never reach outside the tool folder.

### 3.2 Tool registration

```ts
// src/tools/pdf-merger/index.ts
export default defineTool({
  id: 'pdf-merger',
  name: 'PDF Merger',
  description: '…',
  category: 'pdf',
  icon: FileStack, // lucide component
  version: '2.0.0',
  isNew: false,
  enabled: true,
  load: () => import('./Tool'),
});
```

- **Discovery.** `src/app/registry.ts` collects all manifests with `import.meta.glob('../tools/*/index.ts', { eager: true })`. Manifests are tiny, so eager loading is fine; the tool UI stays lazy via `load`. The registry validates at startup (in dev) that IDs are unique and match folder names.
- **Lazy components.** The router builds one `React.lazy` per tool **once, at module scope**, keyed by ID. That removes the in-render `lazy()` and the double-lazy layering.
- **Removed.** `constants.ts`, `data/ToolDefinitions.ts` and `registry/ToolRegistry.ts` are deleted once every tool has a manifest. The legacy `color` field is dropped. Categories become a typed union in `src/app/categories.ts`.

### 3.3 Shared library (`src/shared/lib`)

| Module       | API (sketch)                                                                                                                                                                                                  | Replaces                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `format`     | `formatBytes(n, {decimals})`, `formatPercent(delta)`, `formatDuration(ms)`                                                                                                                                    | 5+ local `formatFileSize` copies                          |
| `files`      | `readBytes(file)`, `readText(file)`, `detectKind(bytes)` (magic-number sniff: PDF, PNG, JPEG, WebP, GIF), `assertKind(file, kinds, {maxBytes})` → `ToolError`                                                 | ad-hoc FileReader, type checks                            |
| `download`   | `saveBlob(data: Blob\|Uint8Array, filename, mime?)`, `deriveFilename(input, suffix, ext)` (e.g. `report.pdf` → `report.watermarked.pdf`), `saveZip(entries, name)`                                            | 12 hand-rolled anchors; object URLs always revoked        |
| `clipboard`  | `useClipboard()` → `{ copy, copied }`; `copyText(s)`                                                                                                                                                          | 10 raw `navigator.clipboard` sites and the duplicate hook |
| `notify`     | `notify.success/error/info(msg)` over a single global `<Toaster/>` (sonner)                                                                                                                                   | per-tool notification hooks                               |
| `errors`     | `ToolError { code, message, cause }`; codes `INVALID_FILE`, `TOO_LARGE`, `ENCRYPTED`, `WRONG_PASSWORD`, `UNSUPPORTED_FEATURE`, `WORKER_CRASHED`, `CANCELLED`, `UNKNOWN`; `toToolError(unknown)`               | ad-hoc string errors                                      |
| `worker-rpc` | `createWorkerClient<Api>(factory)` and `exposeWorker<Api>(impl)`: typed request/response, `AbortSignal` cancellation, transferable support, progress events, one auto-restart on crash, then `WORKER_CRASHED` | (new; in-house instead of Comlink)                        |

ZIP output (multi-file results such as split or PDF→images) needs a ZIP writer. It uses `fflate` (MIT) unless an `@arshad-shah` package covers it at implementation time.

### 3.4 State (`src/shared/state`)

- **`createToolStore`.** A thin wrapper over `@arshad-shah/store-kit` `createStore`. It fixes the naming convention (`tool:<id>`) and defaults `persist` to `{ storage: 'local', version: 1 }` for settings only. Documents, bytes and results are **never** persisted; they live in non-persisted slices or in component/job state.
- **`useJob(fn)`.** Tracks `{ status: 'idle'|'running'|'done'|'error'|'cancelled', progress?: {done,total,label}, result?, error?: ToolError }`.
  - It exposes `run(...args)`, `cancel()` and `reset()`.
  - It owns an `AbortController` per run and ignores stale completions.
  - All PDF tools use it; other tools adopt it in phase 4 when they have async work.
- **Redux.** Redux Toolkit and redux-persist are removed in phase 4, when pomodoro migrates to store-kit.

### 3.5 PDF core (`src/pdf`)

**Engines (all permissive)**

| Concern                                                      | Engine                                                               | License                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------- |
| Rendering, text extraction                                   | `pdfjs-dist` (worker)                                                | Apache-2.0                      |
| Structural editing, forms, drawing, image embedding          | `pdf-lib` (+ `@pdf-lib/fontkit` for custom fonts)                    | MIT                             |
| Lossless restructuring, encryption/decryption, linearization | `@arshad-shah/qpdf-wasm` (own package, §5)                           | Apache-2.0 (qpdf) / MIT wrapper |
| Image recompression                                          | in-house worker (OffscreenCanvas + `createImageBitmap`, JPEG encode) | MIT                             |
| Drag reorder                                                 | `@arshad-shah/detent-react`                                          | MIT                             |

**`render/`** runs in a worker and is consumed via `worker-rpc`.

- `open(source, {password?}) → DocHandle { id, pageCount, encrypted, hasForms, isXfa }`
  - Throws `ENCRYPTED` if a password is needed, or `WRONG_PASSWORD` if the one given is wrong.
- `renderPage(docId, pageIndex, {scale|maxWidth}) → ImageBitmap`
  - Runs on OffscreenCanvas and is transferred to the page without copying.
- `extractText(docId, pageIndex) → { text, hasTextLayer }`
- `close(docId)`
- **Main-thread thumbnail cache.** An LRU keyed `(docId, page, width)` with a default cap of 150 bitmaps. Bitmaps are `.close()`d on eviction and when the document closes.

**`edit/`** holds pure functions over `Uint8Array`. They are unit-testable in Node and run in an edit worker if profiling shows over 300ms main-thread blocking on a 100-page fixture.

| Operation                                                              | Behaviour                                                                                                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merge(sources)`                                                       | Combine the files in order.                                                                                                                           |
| `extract(source, pageIndices)`                                         | Keep only the given pages.                                                                                                                            |
| `split(source, ranges)`                                                | Return several documents.                                                                                                                             |
| `rotate(source, {pageIndex: degrees})`                                 | Set each page's rotation.                                                                                                                             |
| `reorder(source, order)`                                               | Reorder pages; also handles deleting them.                                                                                                            |
| `watermark(source, {text\|image, opacity, rotation, position, pages})` | Draw a text or image watermark.                                                                                                                       |
| `pageNumbers(source, {format, position, startAt, pages, font})`        | Draw page numbers.                                                                                                                                    |
| `stamp(source, {image, pageIndex, rect})`                              | Place a signature or stamp image at the given position.                                                                                               |
| `fillForm(source, values, {flatten})`                                  | Fill AcroForm fields. XFA is detected and rejected with `UNSUPPORTED_FEATURE`.                                                                        |
| `listFormFields(source)`                                               | List the form fields.                                                                                                                                 |
| `getMetadata(source)` / `setMetadata(source, meta)`                    | Read or write Info dictionary fields. XMP is kept in sync when present.                                                                               |
| `imagesToPdf(images, {pageSize, margin, fit})`                         | Build a PDF from images. PNG and JPEG are embedded natively; WebP and GIF are decoded to PNG first via canvas (a real conversion, not a passthrough). |

**`qpdf/`** runs `@arshad-shah/qpdf-wasm` in its own worker.

- `optimize(bytes, {objectStreams: 'generate', compressStreams, recompressFlate, removeUnreferenced, linearize})`
- `encrypt(bytes, {userPassword, ownerPassword, permissions})`, using AES-256
- `decrypt(bytes, password)`
- `inspect(bytes) → { encrypted, version, pageCount }`

**`compress/`** is the pipeline orchestrator.

1. **Inspect.** Walk image XObjects with pdf-lib. Record filter, dimensions, colour space, bits per component, SMask, and the effective DPI from page placement.
2. **Recompress images.** Done in the image worker for eligible images:
   - **Eligible:** DeviceRGB, DeviceGray or ICCBased with N=1 or 3; 8 bits per component; filter DCTDecode, FlateDecode, or none.
   - **Process:** decode → downsample to the target DPI if the effective DPI is above target → JPEG-encode at the target quality → replace the stream only if the result is smaller.
   - **Transparency.** SMasks are preserved and downsampled to match. Images with alpha keep an SMask and are never flattened onto a colour.
   - **Ineligible images are left untouched and listed in the report:** CMYK/DeviceN/Indexed, JBIG2, JPX, CCITT, 1-bit and 16-bit.
3. **Restructure losslessly** with `qpdf.optimize`.
4. **Report** per-stage byte deltas and the counts of images processed and skipped. If the final output is ≥ the input, keep the original and say so.

**Presets** (with an advanced panel exposing every field)

| Preset   | Images               | qpdf                                                  | Metadata              |
| -------- | -------------------- | ----------------------------------------------------- | --------------------- |
| Lossless | not touched          | object streams, recompress Flate, remove unreferenced | kept                  |
| Balanced | 150 DPI, JPEG q=0.75 | same                                                  | kept                  |
| Strong   | 96 DPI, JPEG q=0.6   | same                                                  | stripped (Info + XMP) |

**`components/`**

- **`PdfDropzone`** is built on the kit's `FileUpload`. It validates with `assertKind`, accepts single or multiple files, and handles the password prompt.
- **`PageGrid`**
  - Virtualised: it renders only thumbnails in view, via IntersectionObserver.
  - Reorders with `useSortable` from `@arshad-shah/detent-react`.
  - Supports multi-select with shift/ctrl and per-page actions (rotate, delete), configurable per tool.
  - Keyboard accessible: arrow-key focus, Space to select, Alt+Arrow to move.
- **`PageThumb`** draws an `ImageBitmap` on a canvas, with a lazy-load placeholder.
- **`SortableFileList`** is a reorderable file list used by Merge and Images→PDF.
- **`JobPanel`** shows progress, cancel, errors, the result summary (input → output size, delta) and the download button.
- **`PasswordPrompt`** is an inline password field with retry.

**Limits**

- Files over 200MB raise a dismissible warning. They are not blocked.
- If a worker runs out of memory, the job fails with `WORKER_CRASHED` and a clear message. Nothing hangs.

## 4. PDF tools

There are 14 tools. The existing three keep their IDs.

| Group               | Tool (id)                                   | Core functions               | Notes                                                                                                                       |
| ------------------- | ------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Pages               | PDF Merger (`pdf-merger`, existing)         | `merge`                      | `SortableFileList`; page-range selection per file                                                                           |
|                     | PDF Splitter (`pdf-splitter`, existing)     | `split`, `extract`           | Range syntax `1-3,5,8-`; split every N pages; output one file per range, or a ZIP                                           |
|                     | Organize Pages (`pdf-organize`)             | `reorder`, `rotate`          | `PageGrid` with drag, rotate and delete                                                                                     |
| Convert             | PDF → Images (`pdf-to-images`)              | `render.renderPage`          | PNG/JPEG, DPI 72–300, page selection, ZIP output                                                                            |
|                     | Images → PDF (`images-to-pdf`)              | `imagesToPdf`                | Page size (A4, Letter, fit-to-image), margin, orientation                                                                   |
|                     | PDF → Text (`pdf-to-text`)                  | `render.extractText`         | Per-page or combined `.txt`; pages without a text layer are flagged; no OCR                                                 |
| Mark up             | Watermark (`pdf-watermark`)                 | `watermark`                  | Text or image; live preview on the first page                                                                               |
|                     | Page Numbers (`pdf-page-numbers`)           | `pageNumbers`                | Formats: `{n}`, `{n} / {total}`, `Page {n}`                                                                                 |
|                     | Sign / Stamp (`pdf-sign`)                   | `stamp`                      | Upload an image or draw a signature on canvas; place by drag on the page preview using detent `useDraggable`/`useResizable` |
|                     | Fill Form (`pdf-fill-form`)                 | `listFormFields`, `fillForm` | Text, checkbox, radio and dropdown fields; optional flatten                                                                 |
| Security & optimise | Protect (`pdf-protect`)                     | `qpdf.encrypt`               | AES-256, user and owner passwords, permission toggles                                                                       |
|                     | Unlock (`pdf-unlock`)                       | `qpdf.decrypt`               | Needs the correct password; no cracking                                                                                     |
|                     | Metadata (`pdf-metadata`)                   | `get/setMetadata`            | View, edit or strip                                                                                                         |
|                     | PDF Compressor (`pdf-compressor`, existing) | `compress` pipeline          | Presets and advanced panel; per-stage report; re-enabled                                                                    |

Every tool uses the same structure: `PdfDropzone` → options (kit components plus the tool store) → `JobPanel`. Tools are thin, and the logic lives in `src/pdf`.

## 5. `@arshad-shah/qpdf-wasm` (standalone repo)

- **Repo.** `github.com/arshad-shah/qpdf-wasm`, MIT wrapper.
  - qpdf is Apache-2.0, zlib is zlib-licensed, and libjpeg-turbo is BSD/IJG.
  - The package ships `THIRD_PARTY_LICENSES`.
- **Build.**
  - Emscripten (pinned version) in Docker, so builds are reproducible.
  - Pinned qpdf, zlib and libjpeg-turbo source tarballs, verified by checksum.
  - Outputs an ES module + `.wasm`, using `-sMODULARIZE -sEXPORT_ES6 -sALLOW_MEMORY_GROWTH` and filesystem `MEMFS`.
- **API.** Typed TypeScript. A low-level `run(args: string[], files: Record<string, Uint8Array>) → { exitCode, stdout, stderr, files }`, plus typed helpers: `optimize`, `encrypt`, `decrypt`, `inspect`, `check`.
  - Errors map qpdf exit codes to typed errors. Exit code 3 (warnings) is surfaced, not treated as failure.
- **Environments.** Works in browsers (workers included) and in Node ≥ 20, so it can be tested in Node.
- **Tests.** Vitest in Node: encrypt/decrypt round trip, wrong-password failure, optimize shrinks a fixture, and a structural validity check via `qpdf --check`.
- **CI.**
  - GitHub Actions builds the wasm, runs the tests, and checks bundle size.
  - Publishing happens on tag, with npm provenance.
- **Local integration.** Until it is published, this app consumes it via `pnpm link` or a `file:` dependency. Phase 3 security/compress tools are blocked on it.

## 6. Error handling (cross-cutting)

- Every failure surfaces as a `ToolError`. `JobPanel`, or the inline field, renders `message` through the kit's `Alert`. `cause` is logged to the console in dev.
- No silent fallbacks: an operation either does the real thing or reports why it could not.
- Per-route `ToolErrorBoundary` stays as the last line of defence.
- Encrypted input to a non-security tool:
  1. Prompt for the password.
  2. Decrypt in memory via qpdf (or pdf.js for render-only tools).
  3. Process.
  4. Never re-encrypt silently. The output notes that it is unencrypted.
- **Before qpdf-wasm lands (phase 1).** pdf-lib cannot edit encrypted files.
  - Edit tools reject encrypted input with an `ENCRYPTED` error explaining that it is not supported yet.
  - Render-only paths (thumbnails) may open it with pdf.js and the password.
  - The full flow above is enabled in phase 3.

## 7. Testing

- **Vitest (unit/integration, Node + jsdom).**
  - Covers `shared/lib`, `shared/state` and all `pdf/edit` functions.
  - Outputs are verified by reloading with pdf-lib: page count, rotation, metadata and form values.
  - pdf.js text extraction runs against fixtures in Node using the legacy build.
  - Compression runs against an image-heavy fixture and must produce smaller, valid output. The image-recompress unit uses a Node canvas shim only for decode/encode tests; the worker itself is covered by e2e.
- **Fixtures.**
  - `scripts/gen-fixtures.ts` generates text, multi-page, image-heavy, form (AcroForm), rotated and metadata samples with pdf-lib.
  - Encrypted fixtures are generated via qpdf-wasm once available.
  - A few small committed real-world files cover edge cases: a scanned no-text page, CMYK image and XFA form. Each is under 500KB and has a documented source and license.
- **Playwright (e2e).** Merge, Organize, Compress, Protect→Unlock round trip and PDF→Images. Each run checks downloads by reopening the file in the test.
- **CI.** `.github/workflows/ci.yml` gains `pnpm test` and `pnpm test:e2e` (Chromium) jobs.

## 8. Phases

Each phase gets its own implementation plan and leaves the app shippable.

1. **Foundation.**
   - Vitest + Playwright setup and fixture generator.
   - `shared/lib`, `shared/state`, global Toaster.
   - Manifest registry: all existing tools converted to manifests with no other changes; old registry files removed; kit moved to `shared/ui` with a temporary re-export from `components/ui`.
   - `pdf/render`, `pdf/edit` (page operations), `worker-rpc`.
   - PDF components.
   - Rebuilt **PDF Merger** and **PDF Splitter**; new **Organize Pages**.
2. **`@arshad-shah/qpdf-wasm`**, built in parallel with phase 1 in its own repo. A good candidate for delegation to Codex, with my review.
3. **Remaining PDF tools.**
   - Convert: PDF→Images, Images→PDF, PDF→Text.
   - Mark up: Watermark, Page Numbers, Sign/Stamp, Fill Form.
   - Security & optimise: Metadata, Protect, Unlock, Compressor. These need phase 2.
4. **App-wide cleanup.**
   - The other ~22 tools move to the shared lib, notify, `useJob` where they have async work, and store-kit.
   - Pomodoro moves from Redux to store-kit, and Redux deps are removed.
   - Kebab-case tool folders and `Tool.tsx` entries; types moved next to their tools and `src/types/` deleted.
   - CSS modules and inline styles replaced by the kit and Tailwind.
   - Dead code removed (`Loadingfallback.tsx`, unused types, `AnimatedBackground` per the 2026-07-15 spec).
   - Files over 400 lines split.
   - Temporary re-exports removed.

## 9. Dependencies

- **Add:**
  - `pdfjs-dist`, `@pdf-lib/fontkit`, `fflate`
  - `@arshad-shah/store-kit` + `zustand`, `@arshad-shah/detent` + `@arshad-shah/detent-react`, `@arshad-shah/qpdf-wasm`
  - dev: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@playwright/test`, `tsx`
- **Remove (phase 4):** `@reduxjs/toolkit`, `react-redux`, `redux-persist`, plus anything orphaned by the cleanup. Each removal is verified with a usage search.
- **Not used:**
  - `mupdf` and Ghostscript (AGPL)
  - Comlink, replaced by in-house `worker-rpc`
  - `@dnd-kit`, replaced by detent
  - `cynosure-*`, deliberately removed earlier

## 10. Out of scope

- OCR (a possible future tool).
- Server-side processing of any kind.
- Editing existing PDF text content, and redaction.
- XFA form filling (detected and reported as unsupported).
- Digital (certificate) signatures. Sign/Stamp places a visual signature image only, and the UI says so.

## 11. Collaboration

- Claude owns architecture, the foundation and review.
- Self-contained units are delegated to Codex: the qpdf-wasm repo and individual tool implementations against the finished core.
- Every delegated change is reviewed against this spec before merge.
