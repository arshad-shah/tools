# Phase 3 PDF tools: verification and handoff notes

Phase 3 shipped as three PRs:

- Part A, Convert: PDF to Images, Images to PDF, PDF to Text.
- Part B, Mark up (#52): Watermark, Page Numbers, Sign, Fill Form.
- Part C, Security & optimise (`feat/pdf-tools-security`): Metadata, Protect, Unlock, the re-enabled Compressor, and the password flow for every PDF tool.

Parts A and B recorded their gates in their own PRs. These notes cover Part C, rebased onto master after Phase 4 PRs A–C.

## Gate (Part C, final)

- `pnpm lint`: 0 errors and 31 warnings. All 31 are in untouched legacy tools and `src/shared/ui/button.tsx`; files this branch changed have none.
- `pnpm typecheck`: clean.
- `pnpm test`: 94 files, 682 tests passed.
- `pnpm build`: succeeds.
  - Emits `qpdf-*.wasm`, `qpdf.worker`, `compress.worker` and `render.worker`.
  - No qpdf, font or pdf.js asset is loaded from another origin.
- `pnpm test:e2e`: 127 passed on each of three consecutive runs.
  - The runs used `E2E_PORT=5196`, because another worktree's dev server was holding 5194.
  - Playwright reuses an existing server on its port, so running on 5194 would have tested the wrong code.
- Scripted browser pass:
  - All 14 PDF routes load with no console warnings or errors and no page errors. The pdf.js "fake worker" warning is gone: pdf.js now gets a real port.
  - While a file is being protected, every request is same-origin: the app, the worker chunks and `qpdf.wasm`.

## Deviations from the plan, with reasons

- **Single-file tools use `PdfFileHeader`** (added in Part A) rather than a hand-built header.
  - `PdfFileHeader` is typed with `PdfInputFile`, so every tool must carry `wasEncrypted`.
  - It passes an `unlock` prop through, so Unlock receives the encrypted file as it is.
- **`PdfInputFile` also carries a drop `order`.** Merger uses it to put a file unlocked after its siblings back where it was dropped.
- **Compression:**
  - The replacement image keeps `/Mask` (a stencil mask), `/OC`, `/StructParent` and `/Name`.
  - JPEGs are decoded with EXIF removed (`stripJpegExif`) and `imageOrientation: 'none'`. `ImageDecoder` is not used, because it applies EXIF orientation.
  - A JPEG that is being downsampled is decoded straight to the target size.
  - Images over 40 MP are skipped as "too large to recompress safely".
  - DCT images with `/DecodeParms` are skipped.
  - Gray images become RGB JPEG (a canvas cannot write gray), and the report says so.
  - A PDF/A-1 input keeps its object-stream layout.
  - Cancelling a qpdf call replaces the qpdf worker, which holds no state.
- **Metadata:**
  - The XMP packet is rewritten from the six Info fields, keeping the `pdfaid` and `pdfuaid` identification. Other XMP properties are removed, and the UI says so.
  - Patching the existing packet in place is a possible follow-up.
  - A PDF/A-1 file is saved without object streams.
- **Protect:**
  - "Allow comments" implies form filling, because that is how readers treat the annotate bit. The forms box is shown as on and locked while comments are allowed.
  - Passwords are cleared after a successful protect and when the file changes.
- **Registry:** the `LEGACY_FOLDERS` exception and the last shim (`src/types/ToolTypes.ts`) are removed, so a folder name must now always match its tool id.

## Product decisions recorded

- Permissions-only (owner-password) PDFs open without a prompt in non-security tools, so their output is unrestricted. The output says it is not password-protected.
- Unlock always needs a real password, owner or user. There is no cracking.
- Protect decrypts an encrypted input first and protects it again with the new password.

## Upstream issues

None opened. `@arshad-shah/qpdf-wasm` 0.1.0 worked as documented.
