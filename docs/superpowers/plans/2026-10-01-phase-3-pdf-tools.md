# Phase 3 — Remaining PDF Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the eleven remaining PDF tools as three independently shippable PRs, and make encrypted input work in every PDF tool:

- **Part A, Convert:** PDF → Images, Images → PDF, PDF → Text.
- **Part B, Mark up:** Watermark, Page Numbers, Sign / Stamp, Fill Form.
- **Part C, Security & optimise:** Metadata, Protect, Unlock, PDF Compressor (re-enabled), plus the real password flow (spec §6) for all PDF tools, Merger, Splitter and Organize included.

**Architecture:**

- Tools stay thin. Each tool has `src/tools/<id>/` with `index.ts` (manifest), `Tool.tsx`, an optional `store.ts` (settings only), and `lib/` for pure logic with unit tests. The real work lives in `src/pdf`.
- `src/pdf/edit` gains pure pdf-lib operations: `imagesToPdf`, `watermark`, `pageNumbers`, `stamp`, `listFormFields` / `fillForm`, and `get/set/stripMetadata`. A shared `geometry.ts` maps "visual" positions (what the user sees, rotation applied) to PDF user space, so markup lands correctly on rotated and cropped pages.
- `src/pdf/render` (the existing pdf.js worker) gains `renderPageImage`, which renders at a requested DPI under the canvas area cap and encodes PNG/JPEG inside the worker.
- `src/pdf/qpdf` runs `@arshad-shah/qpdf-wasm` in its own module worker through `@/shared/lib/worker-rpc`. Its wasm is served from the app origin via a Vite `?url` import. `unlock.ts` holds the encrypted-input logic, and `PdfDropzone` uses it to prompt for passwords (spec §3.5: "PdfDropzone … handles the password prompt").
- `src/pdf/compress` implements spec §3.5's pipeline:
  1. Inventory image XObjects and their effective placement DPI (a content-stream walker).
  2. Recompress eligible images in a compress worker (OffscreenCanvas codec, pure-JS resampling, SMask kept and resampled).
  3. Run `qpdf.optimize`.
  4. Report per stage, and keep the original if the result is not smaller.

**Tech Stack:**

- Existing: React 19, Vite 8, TypeScript 6, Tailwind v4 kit, pdf-lib 1.17, pdfjs-dist 6.3, fflate, @arshad-shah/store-kit, detent-react 0.3, Vitest 5, Playwright 1.63.
- Added:
  - `@pdf-lib/fontkit` 1.1 (MIT).
  - `@fontsource/dancing-script`, `@fontsource/great-vibes` and `@fontsource/caveat` 5.x (OFL-1.1, font files only).
  - `@arshad-shah/qpdf-wasm` 0.1, moved from devDependencies to dependencies.
  - dev: `jpeg-js` 0.4 (BSD-3-Clause). It is a pure-JS JPEG codec used only by tests and fixture generation, and plays the role of spec §7's "Node canvas shim".

**Spec:** `docs/superpowers/specs/2026-10-01-pdf-suite-and-modular-architecture-design.md` (§3.5, §4, §6, §7). Phase 1 decision log: `.superpowers/sdd/2026-10-01-phase-1-foundation/progress.md` (rulings R1–R19 still apply).

## Global Constraints

**Platform**

- Fully client-side. No document bytes leave the browser. The only network requests are same-origin static assets: pdf.js assets, `qpdf.wasm`, signature fonts and worker chunks.
- Stay MIT-compatible. Never add `mupdf`, Ghostscript, Comlink, `@dnd-kit` or `cynosure-*`. `jpeg-js` is a devDependency only and must never be imported from `src/`.
- Prefer `@arshad-shah/*` packages: detent-react for placement drag/resize, store-kit via `createToolStore`, qpdf-wasm for encryption and optimisation.

**Behaviour**

- Nothing faked. Every operation does the real thing or throws a `ToolError` whose `message` is user-facing.
- Documents, bytes, passwords and results are never persisted. Only small settings go through `createToolStore`.
- Files never leave the browser. Every tool says so in its dropzone hint (the `PdfDropzone` default).
- Any change to a setting or the input calls `job.reset()`. Settings are snapshotted into `job.run(...)` arguments, never read from the closure (R16).
- A tool that saves directly (without `ResultFiles`) checks `ctx.signal.throwIfAborted()` immediately before `saveBlob` (R17).
- Encrypted input:
  - Until Task 15, Parts A and B tools inherit phase 1 behaviour: `PdfDropzone`/`loadPdf`/`pdfRender.open` reject with `ENCRYPTED`.
  - From Task 15, `PdfDropzone` prompts for the password, decrypts in a qpdf worker, and hands tools plaintext bytes with `wasEncrypted: true`. Each tool then shows `UNENCRYPTED_NOTE` with its result.
- Single-file tools follow the phase 1 pattern. Before a file is chosen they show `PdfDropzone`. After that they show `<Text weight="semibold">{file.name}</Text>` and a ghost `Button` labelled `Choose another file`. Task 15's e2e relies on the file name being visible.

**Keyboard and accessibility**

- R13 keyboard model applies. Lists reorder with Alt+ArrowUp/Down (SortableFileList already does this). Nested controls work natively. Custom interactive surfaces get an `aria-label` that describes their keys.
- R9 applies: file lists show visual previews. Images → PDF uses `SortableFileList`'s `renderPreview` with an `<img>` thumbnail, and the object URL is revoked on unmount.
- Every form control has a visible `Label` with `htmlFor`. E2E tests locate controls by those exact label texts.

**Code conventions**

- Use `@/` imports. App code never uses relative imports that climb out of its own module folder. Tests may import `test/fixtures/*` relatively (R1).
- Tool folders are kebab-case and match the tool id. Manifests use `defineTool({ ..., category: 'pdf', isNew: true, enabled: true, version: '1.0.0', load: () => import('./Tool') })`. The compressor uses `version: '2.0.0'`.
- Non-JSX files use `.ts`. A `.tsx` file exports components only (react-refresh lint), so constants go in `.ts` files.
- All UI comes from the kit (`@/shared/ui`) plus Tailwind tokens. No new CSS modules. Inline `style` is allowed only for data-driven geometry: preview sizes, placement overlay, font-family previews.
- Results use `JobPanel` + `ResultFiles` + `deriveFilename`. `ResultFile.mime` is set for every non-PDF output.
- Workers are created only through `createRpcClient` / `exposeRpc`. Bytes sent to a worker are copied (`bytes.slice()`) and the copy is transferred. Bytes sent back are wrapped in `Transferred` and must own their buffer (`ownBuffer`).

**Testing**

- Unit tests are TDD for every pure function and edit operation: write the failing test, run it, implement, run it again, commit.
- Edit outputs are verified by reloading with pdf-lib, and with pdf.js text extraction or text positions (`test/fixtures/builders.ts`).
- E2E:
  - One spec per tool. It downloads the output and verifies it by reopening the file.
  - Locators are scoped and exact (`getByLabel('…', { exact: true })`, `getByRole(…, { name })`).
  - No `waitForTimeout`, no sleeps; use `expect.poll` or web-first assertions.
  - Every new route is added to `TOOL_ROUTES` in `test/e2e/global-setup.ts`, so the warm-up covers it.
- Fixtures are generated by builders in `test/fixtures/` and written by `scripts/gen-fixtures.ts` (run by Playwright global setup).

**Package manager and git**

- Package manager: `pnpm` 10.11.0. Never npm.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `--no-verify`.
- Each Part is developed on its own branch cut from an up-to-date `master` after the previous Part's PR has merged: `feat/pdf-tools-convert`, `feat/pdf-tools-markup`, `feat/pdf-tools-security`.

**PR gate (end of each Part).** All of these pass locally:

- `pnpm lint` (0 errors)
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e`, run 3 times in a row with no flake

## Review Focus

1. **An encrypted PDF dropped into any PDF tool** (Merger, Splitter, Organize and every Part A/B/C tool).
   - The user is prompted for the password. A wrong password re-prompts with "That password is not correct. Try again."; the right one continues.
   - The output is unencrypted and says so.
   - Owner-only (permissions-only) PDFs open without a prompt.
   - Pinned by Task 15: `unlock.test.ts` (real qpdf, AES-256 fixture) and `test/e2e/encrypted.spec.ts` (every route, plus a full download on PDF → Text).
2. **Compression that breaks a document.** Failure modes: transparency flattened, CMYK images recoloured, or a file that ends up bigger.
   - SMasks are kept and resampled. CMYK/1-bit images are byte-identical after compression.
   - A result that is not smaller returns the original and says so.
   - Pinned by Task 19 (`recompress.test.ts`: SMask dimensions, CMYK stream unchanged, JPEG decodable) and Task 20 (`pipeline.test.ts`: kept-original branch, `qpdf check` on output).
3. **Markup on rotated or cropped pages lands in the wrong place or sideways.** Affects watermark, page numbers and signature.
   - Pinned by Task 6 (`geometry.test.ts`: rotation table, plus a pdf.js position check on a `/Rotate 90` page).
   - Task 8 (page numbers bottom-centre on rotated pages) and Task 10 (typed signature inside its box on a rotated page).
4. **Text the built-in font cannot draw** (`№`, Cyrillic, emoji) in a watermark, page-number template, typed signature or form value.
   - A precise `INVALID_INPUT` names the characters, never a crash or silent box glyphs.
   - XFA forms report `UNSUPPORTED_FEATURE` rather than silently losing data.
   - Pinned by Task 6 (`fonts.test.ts`), Task 7 (watermark `№`), Task 10 (typed `Ада`) and Task 12 (form value `№`, XFA fixture detected before pdf-lib strips it).
5. **PDF → Images at 300 DPI on a large page** (A3 and up).
   - The render is capped at the canvas area limit, and the result states the reduced DPI. There is no blank image, crash or hung worker.
   - Pinned by Task 2 (`render-scale.test.ts` `exportScale` cases).

---

## File Structure (phase 3 end state; ★ = new, ✎ = modified)

```
src/
  shared/lib/
    bytes.ts ★                 ownBuffer
    image-convert.ts ★         convertToPng (browser canvas: WebP/GIF/any → PNG)
    object-url.ts ★            useObjectUrl (+ object-url.test.tsx)
  pdf/
    edit/
      ops.ts ✎                 export assertIndices
      load.ts ✎  messages.ts ★ ENCRYPTED_MESSAGE (Task 15)
      geometry.ts ★            visual↔PDF mapping, anchors, page selection
      fonts.ts ★  color.ts ★   unsupportedChars/assertDrawable, hexToRgb
      images.ts ★              layoutImagePage, imagesToPdf
      markup.ts ★              watermark, pageNumbers, formatPageNumber
      stamp.ts ★               stamp (image or fontkit text)
      forms.ts ★               listFormFields, fillForm
      metadata.ts ★            getMetadata, setMetadata, stripMetadata(+InPlace), buildXmp
      index.ts ✎
    render/
      render-scale.ts ✎        exportScale
      types.ts ✎               ImageFormat, PageImageOptions, PageImage
      render.worker.ts ✎       drawPage helper, renderPageImage
      client.ts ✎  index.ts ✎
    qpdf/ ★                    errors.ts handlers.ts qpdf.worker.ts client.ts unlock.ts index.ts (+tests)
    compress/ ★                content-ops.ts inventory.ts pixels.ts codec.ts recompress.ts prepare.ts
                               pipeline.ts canvas-codec.ts compress.worker.ts client.ts index.ts (+tests)
    components/
      ResultFiles.tsx ✎        ResultFile.mime, note prop
      notes.ts ★               UNENCRYPTED_NOTE
      PdfDropzone.tsx ✎        password flow, PdfInputFile
      PasswordPrompt.tsx ★
      PdfPagePreview.tsx ★  usePreviewBytes.ts ★
      index.ts ✎
  tools/
    pdf-to-images/ ★   index.ts Tool.tsx store.ts lib/plan.ts
    images-to-pdf/ ★   index.ts Tool.tsx store.ts components/ImageThumb.tsx
    pdf-to-text/ ★     index.ts Tool.tsx store.ts lib/output.ts
    pdf-watermark/ ★   index.ts Tool.tsx store.ts
    pdf-page-numbers/ ★ index.ts Tool.tsx store.ts
    pdf-sign/ ★        index.ts Tool.tsx lib/{stroke,pixels,fonts,placement,signature}.ts
                       components/{SignatureDraw,SignatureUpload,SignatureType,PlacementEditor}.tsx
    pdf-fill-form/ ★   index.ts Tool.tsx components/FieldControl.tsx
    pdf-metadata/ ★    index.ts Tool.tsx
    pdf-protect/ ★     index.ts Tool.tsx store.ts lib/permissions.ts
    pdf-unlock/ ★      index.ts Tool.tsx
    pdf-compressor/ ★  index.ts Tool.tsx store.ts lib/settings.ts components/CompressReportView.tsx
    pdf-merger/ ✎  pdf-splitter/ ✎  pdf-organize/ ✎   (UNENCRYPTED_NOTE, PdfInputFile; Task 15)
test/
  fixtures/images.ts ★  fixtures/jpeg-codec.ts ★  fixtures/builders.ts ✎  fixtures/builders.test.ts ✎
  e2e/{pdf-to-images,images-to-pdf,pdf-to-text,pdf-watermark,pdf-page-numbers,pdf-sign,
       pdf-fill-form,pdf-metadata,pdf-protect-unlock,pdf-compressor}.spec.ts ★
  e2e/encrypted.spec.ts ✎  e2e/global-setup.ts ✎
scripts/gen-fixtures.ts ✎
vite.config.ts ✎   (worker.format 'es'; Task 14)
```

Deleted in Task 21:

- `src/tools/PdfCompressor/`
- `src/types/PdfCompressorTypes.ts`

---

# Part A — Convert (PR 1: `feat/pdf-tools-convert`)

**Branch:** after the phase 1 PR (`feat/pdf-suite-foundation`) has merged, run `git switch master && git pull && git switch -c feat/pdf-tools-convert`.

### Task 1: Group A groundwork — typed result downloads and image fixtures

**Files:**

- Modify: `package.json` (dev dependency `jpeg-js`)
- Modify: `src/pdf/components/ResultFiles.tsx`, `src/pdf/components/ResultFiles.test.tsx`
- Create: `test/fixtures/images.ts`
- Modify: `test/fixtures/builders.test.ts`, `scripts/gen-fixtures.ts`

**Interfaces:**

- Consumes: `ResultFiles`, `saveBlob` (phase 1); `zlibSync` from fflate.
- Produces:
  - `interface ResultFile { name: string; bytes: Uint8Array; detail?: string; mime?: string }`. `mime` defaults to `'application/pdf'` when downloading.
  - `test/fixtures/images.ts`:
    - `encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array` (8-bit RGBA)
    - `encodeGif(width: number, height: number, indices: Uint8Array, palette: [number, number, number][]): Uint8Array` (≤ 4 colours)
    - `encodeJpeg(width: number, height: number, rgba: Uint8Array, quality?: number): Uint8Array`
    - `noiseImage(width: number, height: number, channels: 1 | 3 | 4, seed?: number): Uint8Array`
    - `radialAlpha(width: number, height: number): Uint8Array`
    - `pngDimensions(bytes: Uint8Array): { width: number; height: number }`
  - Generated fixtures: `photo.png` (320×200 RGBA, transparent top-left quadrant), `photo.jpg` (400×300), `tiny.gif` (40×30, 3 colours).

- [ ] **Step 1: Install**

```bash
pnpm add -D jpeg-js@^0.4.4
```

- [ ] **Step 2: Write the failing ResultFiles test.** Append to `src/pdf/components/ResultFiles.test.tsx` (it already mocks `@/shared/lib/download`):

```tsx
import { saveBlob } from '@/shared/lib/download';

it('downloads each file with its own MIME type (PDF by default)', () => {
  render(
    <ResultFiles
      files={[
        { name: 'a.png', bytes: new Uint8Array(2), mime: 'image/png' },
        { name: 'b.pdf', bytes: new Uint8Array(3) },
      ]}
    />,
  );
  const buttons = screen.getAllByRole('button', { name: 'Download' });
  fireEvent.click(buttons[0]);
  fireEvent.click(buttons[1]);
  expect(vi.mocked(saveBlob).mock.calls.map((c) => [c[1], c[2]])).toEqual([
    ['a.png', 'image/png'],
    ['b.pdf', 'application/pdf'],
  ]);
});
```

Run: `pnpm test src/pdf/components/ResultFiles` → Expected: FAIL (both calls use `application/pdf`).

- [ ] **Step 3: Implement.** In `ResultFiles.tsx` add `mime?: string;` to `ResultFile` (doc comment: "MIME type used for the download; defaults to application/pdf"). Change the per-file button's handler to `onClick={() => saveBlob(f.bytes, f.name, f.mime ?? 'application/pdf')}`.

Run: `pnpm test src/pdf/components/ResultFiles` → Expected: PASS.

- [ ] **Step 4: Write failing tests for the image encoders.** Append to `test/fixtures/builders.test.ts`:

```ts
import { detectKind } from '@/shared/lib/files';
import {
  encodeGif,
  encodeJpeg,
  encodePng,
  noiseImage,
  pngDimensions,
} from './images';

describe('image encoders', () => {
  it('encodePng writes a real PNG that pdf-lib can embed', async () => {
    const png = encodePng(7, 5, noiseImage(7, 5, 4));
    expect(detectKind(png)).toBe('png');
    expect(pngDimensions(png)).toEqual({ width: 7, height: 5 });
    const doc = await PDFDocument.create();
    const img = await doc.embedPng(png);
    expect([img.width, img.height]).toEqual([7, 5]);
  });
  it('encodeJpeg writes a JPEG that pdf-lib can embed', async () => {
    const jpg = encodeJpeg(9, 4, noiseImage(9, 4, 4));
    expect(detectKind(jpg)).toBe('jpeg');
    const img = await (await PDFDocument.create()).embedJpg(jpg);
    expect([img.width, img.height]).toEqual([9, 4]);
  });
  it('encodeGif writes a GIF89a with the given size', () => {
    const gif = encodeGif(3, 2, Uint8Array.from([0, 1, 2, 2, 1, 0]), [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
    expect(detectKind(gif)).toBe('gif');
    expect(new TextDecoder().decode(gif.subarray(0, 6))).toBe('GIF89a');
    expect([gif[6] | (gif[7] << 8), gif[8] | (gif[9] << 8)]).toEqual([3, 2]);
    expect(gif[gif.length - 1]).toBe(0x3b);
  });
});
```

Run: `pnpm test test/fixtures` → Expected: FAIL (module `./images` not found).

- [ ] **Step 5: Implement `test/fixtures/images.ts`**

```ts
import jpeg from 'jpeg-js';
import { zlibSync } from 'fflate';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Minimal valid PNG: 8-bit RGBA, filter 0 on every row, one IDAT. */
export function encodePng(
  width: number,
  height: number,
  rgba: Uint8Array,
): Uint8Array {
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return concat([
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlibSync(raw)),
    pngChunk('IEND', new Uint8Array()),
  ]);
}

export function pngDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}

/**
 * Valid GIF89a with up to 4 colours. Emitting an LZW CLEAR code before every
 * pixel keeps the code width fixed at 3 bits, so no dictionary is needed.
 */
export function encodeGif(
  width: number,
  height: number,
  indices: Uint8Array,
  palette: [number, number, number][],
): Uint8Array {
  if (palette.length > 4) throw new Error('encodeGif supports up to 4 colours');
  const out: number[] = [];
  const u16 = (n: number) => out.push(n & 0xff, (n >> 8) & 0xff);
  for (const ch of 'GIF89a') out.push(ch.charCodeAt(0));
  u16(width);
  u16(height);
  out.push(0b1000_0001, 0, 0); // global colour table of 2^(1+1) = 4 entries
  for (let i = 0; i < 4; i++) out.push(...(palette[i] ?? [0, 0, 0]));
  out.push(0x2c);
  u16(0);
  u16(0);
  u16(width);
  u16(height);
  out.push(0); // image descriptor: no local table, not interlaced
  out.push(2); // LZW minimum code size
  const codes: number[] = [];
  for (const px of indices) codes.push(4, px); // CLEAR, pixel
  codes.push(5); // END
  const data: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const code of codes) {
    acc |= code << bits;
    bits += 3;
    while (bits >= 8) {
      data.push(acc & 0xff);
      acc >>= 8;
      bits -= 8;
    }
  }
  if (bits > 0) data.push(acc & 0xff);
  for (let i = 0; i < data.length; i += 255) {
    const block = data.slice(i, i + 255);
    out.push(block.length, ...block);
  }
  out.push(0, 0x3b);
  return Uint8Array.from(out);
}

export function encodeJpeg(
  width: number,
  height: number,
  rgba: Uint8Array,
  quality = 90,
): Uint8Array {
  return new Uint8Array(
    jpeg.encode({ data: rgba, width, height }, quality).data,
  );
}

/** Deterministic "photo-like" pixels: a gradient plus noise (JPEG wins, Flate doesn't). */
export function noiseImage(
  width: number,
  height: number,
  channels: 1 | 3 | 4,
  seed = 1,
): Uint8Array {
  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const out = new Uint8Array(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      for (let c = 0; c < channels; c++) {
        if (channels === 4 && c === 3) {
          out[o + c] = 255;
          continue;
        }
        const base = ((x / width) * 160 + (y / height) * 60 + c * 30) % 256;
        out[o + c] = Math.max(
          0,
          Math.min(255, Math.round(base + (rand() - 0.5) * 48)),
        );
      }
    }
  }
  return out;
}

/** 8-bit alpha: opaque centre fading to transparent edges. */
export function radialAlpha(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      out[y * width + x] = Math.round(255 * Math.max(0, Math.min(1, 1.2 - d)));
    }
  }
  return out;
}
```

Run: `pnpm test test/fixtures` → Expected: PASS.

- [ ] **Step 6: Generate the image fixtures.** In `scripts/gen-fixtures.ts`, import `encodeGif`, `encodeJpeg`, `encodePng` and `noiseImage` from `'../test/fixtures/images'`. Add a helper and three entries to `files`:

```ts
function photoRgba(width: number, height: number): Uint8Array {
  const rgba = noiseImage(width, height, 4, 7);
  // Transparent top-left quadrant, so PNG alpha handling is observable.
  for (let y = 0; y < height / 2; y++)
    for (let x = 0; x < width / 2; x++) rgba[(y * width + x) * 4 + 3] = 0;
  return rgba;
}
```

```ts
  'photo.png': encodePng(320, 200, photoRgba(320, 200)),
  'photo.jpg': encodeJpeg(400, 300, noiseImage(400, 300, 4, 8)),
  'tiny.gif': encodeGif(
    40,
    30,
    Uint8Array.from({ length: 1200 }, (_, i) => (i % 40 < 20 ? 1 : 2)),
    [[255, 255, 255], [200, 30, 30], [30, 30, 200]],
  ),
```

Run: `pnpm fixtures` → Expected: `wrote 8 fixtures to test/fixtures/generated`.

- [ ] **Step 7: Verify and commit**

```bash
pnpm typecheck && pnpm test
git add package.json pnpm-lock.yaml src/pdf/components/ResultFiles.tsx src/pdf/components/ResultFiles.test.tsx test/fixtures/images.ts test/fixtures/builders.test.ts scripts/gen-fixtures.ts
git commit -m "test(fixtures): image encoders and typed result downloads

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: PDF → Images (`pdf-to-images`)

**Files:**

- Modify: `src/pdf/render/render-scale.ts`, `src/pdf/render/render-scale.test.ts`, `src/pdf/render/types.ts`, `src/pdf/render/render.worker.ts`, `src/pdf/render/client.ts`, `src/pdf/render/index.ts`
- Create: `src/tools/pdf-to-images/index.ts`, `Tool.tsx`, `store.ts`, `lib/plan.ts`, `lib/plan.test.ts`
- Create: `test/e2e/pdf-to-images.spec.ts`
- Modify: `test/e2e/global-setup.ts`

**Interfaces:**

- Consumes: `renderScale`, `MAX_CANVAS_PIXELS`, `pdfRender`, `usePdfDocument` (phase 1); `parsePageRanges`, `rangesToIndices`; `deriveFilename`; `createToolStore`; Task 1 `ResultFile.mime`.
- Produces:
  - `MIN_EXPORT_DPI = 72`, `MAX_EXPORT_DPI = 300`
  - `exportScale(baseWidth: number, baseHeight: number, dpi: number): { scale: number; dpi: number; capped: boolean }`
  - `type ImageFormat = 'png' | 'jpeg'`
  - `interface PageImageOptions { dpi: number; format: ImageFormat; quality: number }`
  - `interface PageImage { bytes: Uint8Array; width: number; height: number; dpi: number; capped: boolean }`
  - `pdfRender.renderPageImage(docId: string, pageIndex: number, opts: PageImageOptions, signal?: AbortSignal): Promise<PageImage>`
  - Tool lib:
    - `pagesToExport(text: string, pageCount: number): number[]`
    - `imageFileName(source: string, pageIndex: number, pageCount: number, format: ImageFormat): string`
    - `IMAGE_MIME: Record<ImageFormat, string>`

- [ ] **Step 1: Failing test for `exportScale`.** Append to `src/pdf/render/render-scale.test.ts`:

```ts
import { exportScale, MAX_CANVAS_PIXELS } from './render-scale';

describe('exportScale', () => {
  it('maps DPI to a pdf.js scale (1 = 72 DPI)', () => {
    expect(exportScale(612, 792, 150)).toEqual({
      scale: 150 / 72,
      dpi: 150,
      capped: false,
    });
  });
  it('caps large pages at the canvas area limit and reports the real DPI', () => {
    const r = exportScale(842, 1191, 300); // A3 at 300 DPI = 17.4 MP
    expect(r.capped).toBe(true);
    expect(r.dpi).toBeLessThan(300);
    expect(r.dpi).toBeGreaterThan(280);
    expect(
      Math.ceil(842 * r.scale) * Math.ceil(1191 * r.scale),
    ).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
  });
  it.each([71, 301, 150.5, Number.NaN])('rejects %s DPI', (dpi) => {
    expect(() => exportScale(612, 792, dpi)).toThrow(
      'Resolution must be a whole number from 72 to 300 DPI',
    );
  });
});
```

Run: `pnpm test src/pdf/render/render-scale` → Expected: FAIL.

- [ ] **Step 2: Implement.** Append to `src/pdf/render/render-scale.ts`:

```ts
export const MIN_EXPORT_DPI = 72;
export const MAX_EXPORT_DPI = 300;

/**
 * Scale for exporting a page at `dpi` (pdf.js scale 1 = 72 DPI). Pages too
 * large for the canvas cap are scaled down to fit it; the DPI actually used
 * is reported so the UI can say so.
 */
export function exportScale(
  baseWidth: number,
  baseHeight: number,
  dpi: number,
): { scale: number; dpi: number; capped: boolean } {
  if (!Number.isInteger(dpi) || dpi < MIN_EXPORT_DPI || dpi > MAX_EXPORT_DPI) {
    throw new ToolError(
      'INVALID_INPUT',
      `Resolution must be a whole number from ${MIN_EXPORT_DPI} to ${MAX_EXPORT_DPI} DPI`,
    );
  }
  const area = (s: number) =>
    Math.ceil(baseWidth * s) * Math.ceil(baseHeight * s);
  let scale = dpi / 72;
  if (area(scale) <= MAX_CANVAS_PIXELS) return { scale, dpi, capped: false };
  scale = Math.sqrt(MAX_CANVAS_PIXELS / (baseWidth * baseHeight));
  while (area(scale) > MAX_CANVAS_PIXELS) scale *= 0.999;
  return { scale, dpi: Math.floor(scale * 72), capped: true };
}
```

Run: `pnpm test src/pdf/render/render-scale` → Expected: PASS.

- [ ] **Step 3: Types.** Append to `src/pdf/render/types.ts`:

```ts
export type ImageFormat = 'png' | 'jpeg';

export interface PageImageOptions {
  /** 72–300. */
  dpi: number;
  format: ImageFormat;
  /** JPEG quality 0–1 (ignored for PNG). */
  quality: number;
}

export interface PageImage {
  bytes: Uint8Array;
  width: number;
  height: number;
  /** DPI actually rendered (lower than requested when `capped`). */
  dpi: number;
  capped: boolean;
}
```

Export `ImageFormat`, `PageImageOptions` and `PageImage` from `src/pdf/render/index.ts`, alongside the existing type exports.

- [ ] **Step 4: Worker.** In `src/pdf/render/render.worker.ts`:

1. Move the body of `renderPage` into a shared helper, so both handlers render the same way:

```ts
/** Renders one page onto a fresh OffscreenCanvas at the scale `scaleFor` picks. */
async function drawPage(
  ctx: RpcContext,
  docId: string,
  pageIndex: number,
  scaleFor: (baseWidth: number, baseHeight: number) => number,
): Promise<OffscreenCanvas> {
  const page = await getDoc(docId).getPage(pageIndex + 1);
  if (ctx.signal.aborted) throw cancelled();
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({
    scale: scaleFor(base.width, base.height),
  });
  const canvas = new OffscreenCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  const task = page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: canvas.getContext(
      '2d',
    ) as unknown as CanvasRenderingContext2D,
    viewport,
    background: '#ffffff',
  });
  const onAbort = () => task.cancel();
  ctx.signal.addEventListener('abort', onAbort, { once: true });
  try {
    await task.promise;
  } finally {
    ctx.signal.removeEventListener('abort', onAbort);
    page.cleanup();
  }
  return canvas;
}
```

2. Replace `renderPage`'s body:

```ts
  async renderPage(ctx: RpcContext, docId: string, pageIndex: number, widthPx: number) {
    const canvas = await drawPage(ctx, docId, pageIndex, (w, h) =>
      renderScale(w, h, widthPx),
    );
    const bitmap = canvas.transferToImageBitmap();
    return new Transferred(bitmap, [bitmap]);
  },
```

3. Add the handler (import `exportScale` from `./render-scale` and `PageImage`, `PageImageOptions` from `./types`):

```ts
  async renderPageImage(
    ctx: RpcContext,
    docId: string,
    pageIndex: number,
    opts: PageImageOptions,
  ): Promise<Transferred<PageImage>> {
    if (opts.format !== 'png' && opts.format !== 'jpeg') {
      throw new ToolError('INVALID_INPUT', 'Choose PNG or JPEG');
    }
    if (!(opts.quality > 0 && opts.quality <= 1)) {
      throw new ToolError('INVALID_INPUT', 'JPEG quality must be between 1% and 100%');
    }
    let plan = { scale: 1, dpi: opts.dpi, capped: false };
    const canvas = await drawPage(ctx, docId, pageIndex, (w, h) => {
      plan = exportScale(w, h, opts.dpi);
      return plan.scale;
    });
    try {
      const blob = await canvas.convertToBlob(
        opts.format === 'png'
          ? { type: 'image/png' }
          : { type: 'image/jpeg', quality: opts.quality },
      );
      if (ctx.signal.aborted) throw cancelled();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return new Transferred(
        { bytes, width: canvas.width, height: canvas.height, dpi: plan.dpi, capped: plan.capped },
        [bytes.buffer],
      );
    } finally {
      // Free the backing store now; large exports would otherwise pile up.
      canvas.width = 0;
      canvas.height = 0;
    }
  },
```

- [ ] **Step 5: Client.** Add to `pdfRender` in `src/pdf/render/client.ts` (import `PageImageOptions` type from `./types`):

```ts
  /** Encoded PNG/JPEG of one page at `opts.dpi` (capped to the canvas limit). */
  renderPageImage(
    docId: string,
    pageIndex: number,
    opts: PageImageOptions,
    signal?: AbortSignal,
  ) {
    return withSlot(
      () => client.call('renderPageImage', [docId, pageIndex, opts], { signal }),
      signal,
    );
  },
```

Run: `pnpm typecheck` → Expected: PASS.

- [ ] **Step 6: Failing test for the tool lib** — `src/tools/pdf-to-images/lib/plan.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { imageFileName, pagesToExport } from './plan';

describe('pdf-to-images plan', () => {
  it('exports every page when the field is blank', () => {
    expect(pagesToExport('  ', 3)).toEqual([0, 1, 2]);
  });
  it('dedupes and sorts ranges', () => {
    expect(pagesToExport('3, 1-2, 2', 3)).toEqual([0, 1, 2]);
  });
  it('reports range errors precisely', () => {
    expect(() => pagesToExport('5', 3)).toThrow('Page 5 is out of range (1–3)');
  });
  it('pads page numbers to the document width and uses .jpg for JPEG', () => {
    expect(imageFileName('report.pdf', 0, 12, 'png')).toBe(
      'report.page-01.png',
    );
    expect(imageFileName('report.pdf', 11, 12, 'jpeg')).toBe(
      'report.page-12.jpg',
    );
  });
});
```

Run: `pnpm test src/tools/pdf-to-images` → Expected: FAIL.

- [ ] **Step 7: Implement** — `src/tools/pdf-to-images/lib/plan.ts`

```ts
import { parsePageRanges, rangesToIndices } from '@/pdf/edit';
import type { ImageFormat } from '@/pdf/render';
import { deriveFilename } from '@/shared/lib/download';

export const IMAGE_MIME: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
};

/** 0-based page indices, in document order. Blank = all pages. */
export function pagesToExport(text: string, pageCount: number): number[] {
  if (!text.trim()) return Array.from({ length: pageCount }, (_, i) => i);
  return [...new Set(rangesToIndices(parsePageRanges(text, pageCount)))].sort(
    (a, b) => a - b,
  );
}

export function imageFileName(
  source: string,
  pageIndex: number,
  pageCount: number,
  format: ImageFormat,
): string {
  const n = String(pageIndex + 1).padStart(String(pageCount).length, '0');
  return deriveFilename(source, `page-${n}`, format === 'png' ? 'png' : 'jpg');
}
```

Run: `pnpm test src/tools/pdf-to-images` → Expected: PASS.

- [ ] **Step 8: Store and manifest**

`src/tools/pdf-to-images/store.ts`:

```ts
import { createToolStore } from '@/shared/state/createToolStore';
import type { ImageFormat } from '@/pdf/render';

export const useImageExportSettings = createToolStore({
  toolId: 'pdf-to-images',
  initial: { format: 'png' as ImageFormat, dpi: 150, quality: 0.85 },
  actions: (set) => ({
    setFormat: (format: ImageFormat) => set({ format }),
    setDpi: (dpi: number) => set({ dpi }),
    setQuality: (quality: number) => set({ quality }),
  }),
});
```

`src/tools/pdf-to-images/index.ts`:

```ts
import { FileImage } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-to-images',
  name: 'PDF to Images',
  description: 'Convert PDF pages to PNG or JPEG images at up to 300 DPI',
  icon: FileImage,
  category: 'pdf',
  version: '1.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
```

- [ ] **Step 9: Tool** — `src/tools/pdf-to-images/Tool.tsx`

```tsx
import React, { useState } from 'react';
import { Images } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  NumberInput,
  Slider,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import type { ToolProps } from '@/app/tool';
import type { LoadedFile } from '@/shared/lib/files';
import { deriveFilename } from '@/shared/lib/download';
import { useJob } from '@/shared/state/useJob';
import {
  pdfRender,
  usePdfDocument,
  type DocInfo,
  type ImageFormat,
} from '@/pdf/render';
import {
  FileThumb,
  JobPanel,
  PdfDropzone,
  ResultFiles,
  type ResultFile,
} from '@/pdf/components';
import { IMAGE_MIME, imageFileName, pagesToExport } from './lib/plan';
import { useImageExportSettings } from './store';

interface Snapshot {
  pages: string;
  format: ImageFormat;
  dpi: number;
  quality: number;
}

const PdfToImagesTool: React.FC<ToolProps> = () => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [pages, setPages] = useState('');
  const { format, dpi, quality, setFormat, setDpi, setQuality } =
    useImageExportSettings();
  const { doc, loading, error } = usePdfDocument(file);

  const job = useJob(
    async (
      ctx,
      source: LoadedFile,
      info: DocInfo,
      snap: Snapshot,
    ): Promise<ResultFile[]> => {
      const indices = pagesToExport(snap.pages, info.pageCount);
      const out: ResultFile[] = [];
      // Sequential on purpose: one full-size canvas in the worker at a time.
      for (const [i, pageIndex] of indices.entries()) {
        ctx.progress({
          done: i,
          total: indices.length,
          label: 'Rendering pages',
        });
        const img = await pdfRender.renderPageImage(
          info.docId,
          pageIndex,
          { dpi: snap.dpi, format: snap.format, quality: snap.quality },
          ctx.signal,
        );
        out.push({
          name: imageFileName(
            source.name,
            pageIndex,
            info.pageCount,
            snap.format,
          ),
          bytes: img.bytes,
          mime: IMAGE_MIME[snap.format],
          detail: `${img.width}×${img.height} px · ${img.dpi} DPI${
            img.capped ? ' (reduced to fit the size limit)' : ''
          }`,
        });
      }
      return out;
    },
  );

  const changed =
    <T,>(apply: (v: T) => void) =>
    (v: T) => {
      job.reset();
      apply(v);
    };
  const pick = (files: LoadedFile[]) => {
    job.reset();
    setPages('');
    setFile(files[0]);
  };

  return (
    <Card>
      <CardBody>
        <Stack gap="5">
          {!file ? (
            <PdfDropzone onFiles={pick} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileThumb bytes={file.bytes} name={file.name} />
                <div>
                  <Text weight="semibold">{file.name}</Text>
                  {doc && (
                    <Text size="sm" tone="muted">
                      {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                    </Text>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  job.reset();
                  setFile(null);
                }}
              >
                Choose another file
              </Button>
            </div>
          )}
          {loading && <Text tone="muted">Opening…</Text>}
          {error && (
            <Alert status="danger">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          {file && doc && (
            <>
              <Stack gap="2">
                <Label>Format</Label>
                <Tabs
                  value={format}
                  onValueChange={(v) => changed(setFormat)(v as ImageFormat)}
                  variant="soft"
                >
                  <TabsList>
                    <TabsTrigger value="png">PNG</TabsTrigger>
                    <TabsTrigger value="jpeg">JPEG</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Stack>
              <Stack gap="2">
                <Label htmlFor="img-dpi">Resolution (DPI)</Label>
                <NumberInput
                  id="img-dpi"
                  value={dpi}
                  min={72}
                  max={300}
                  step={1}
                  onValueChange={(n) => {
                    if (!Number.isFinite(n)) return;
                    changed(setDpi)(Math.min(300, Math.max(72, Math.round(n))));
                  }}
                />
              </Stack>
              {format === 'jpeg' && (
                <Stack gap="2">
                  <Label htmlFor="img-quality">JPEG quality</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      id="img-quality"
                      value={quality}
                      min={0.5}
                      max={1}
                      step={0.05}
                      onValueChange={changed(setQuality)}
                    />
                    <Text size="sm" className="w-12 font-mono">
                      {Math.round(quality * 100)}%
                    </Text>
                  </div>
                </Stack>
              )}
              <Stack gap="2">
                <Label htmlFor="img-pages">Pages</Label>
                <Input
                  id="img-pages"
                  value={pages}
                  onChange={changed(setPages)}
                  placeholder={`All ${doc.pageCount} pages (or e.g. 1-3, 5)`}
                />
              </Stack>
              <div>
                <Button
                  variant="solid"
                  leftIcon={<Images size={16} />}
                  disabled={job.status === 'running'}
                  onClick={() =>
                    job.run(file, doc, { pages, format, dpi, quality })
                  }
                >
                  Convert to images
                </Button>
              </div>
            </>
          )}
          <JobPanel
            job={job}
            onCancel={job.cancel}
            runningLabel="Rendering pages"
          >
            {job.result && file && (
              <ResultFiles
                files={job.result}
                zipName={deriveFilename(file.name, 'images', 'zip')}
              />
            )}
          </JobPanel>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default PdfToImagesTool;
```

(If `Text` does not accept `className`, wrap the percentage in `<span className="w-12 font-mono text-sm">` instead. Check `src/shared/ui/typography.tsx`.)

- [ ] **Step 10: Failing e2e** — `test/e2e/pdf-to-images.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { pngDimensions } from '../fixtures/images';

test('exports selected pages as PNGs in a ZIP at the requested DPI', async ({
  page,
}) => {
  await page.goto('/pdf-to-images');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(page.getByText('3 pages', { exact: true })).toBeVisible();
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('150');
  await page.getByLabel('Pages', { exact: true }).fill('1, 3');
  await page.getByRole('button', { name: 'Convert to images' }).click();
  await expect(page.getByText('2 files ready', { exact: false })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all (ZIP)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.images.zip');
  const entries = unzipSync(readFileSync((await download.path())!));
  expect(Object.keys(entries).sort()).toEqual([
    'text-3.page-1.png',
    'text-3.page-3.png',
  ]);
  for (const bytes of Object.values(entries)) {
    expect(pngDimensions(bytes)).toEqual({ width: 1275, height: 1650 }); // 612×792 pt at 150 DPI
  }
});

test('exports a single page as JPEG', async ({ page }) => {
  await page.goto('/pdf-to-images');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'JPEG' }).click();
  await page.getByLabel('Resolution (DPI)', { exact: true }).fill('72');
  await page.getByLabel('Pages', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Convert to images' }).click();
  await expect(page.getByText('612×792 px · 72 DPI')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.page-2.jpg');
  const bytes = readFileSync((await download.path())!);
  expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
});
```

Add `'/pdf-to-images'` to `TOOL_ROUTES` in `test/e2e/global-setup.ts`.

Run: `pnpm test:e2e test/e2e/pdf-to-images.spec.ts` → Expected: PASS. If the NumberInput commits on blur, press `Tab` after `fill`.

- [ ] **Step 11: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/pdf/render src/tools/pdf-to-images test/e2e/pdf-to-images.spec.ts test/e2e/global-setup.ts
git commit -m "feat(pdf-to-images): export pages as PNG/JPEG at a chosen DPI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `imagesToPdf` core and browser image conversion

**Files:**

- Create: `src/pdf/edit/images.ts`, `src/pdf/edit/images.test.ts`, `src/shared/lib/image-convert.ts`
- Modify: `src/pdf/edit/index.ts`

**Interfaces:**

- Consumes: `ToolError`; `FileKind` from `@/shared/lib/files`; Task 1 encoders (tests).
- Produces (from `@/pdf/edit`):
  - `PAGE_SIZES: { a4: [number, number]; letter: [number, number] }`
  - `PX_TO_PT = 0.75`
  - `type PageSizeName = 'a4' | 'letter' | 'fit'`
  - `type Orientation = 'auto' | 'portrait' | 'landscape'`
  - `interface ImagesToPdfOptions { pageSize: PageSizeName; orientation: Orientation; marginPt: number }`
  - `interface ImagePageLayout { pageWidth: number; pageHeight: number; x: number; y: number; width: number; height: number }`
  - `interface ImageInput { bytes: Uint8Array; kind: 'png' | 'jpeg'; name: string }`
  - `layoutImagePage(imgW: number, imgH: number, opts: ImagesToPdfOptions): ImagePageLayout`
  - `imagesToPdf(images: ImageInput[], opts: ImagesToPdfOptions): Promise<Uint8Array>`
- Produces (from `@/shared/lib/image-convert`, browser only): `convertToPng(bytes: Uint8Array, kind: FileKind, name: string): Promise<Uint8Array>`

- [ ] **Step 1: Failing tests** — `src/pdf/edit/images.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import {
  encodeJpeg,
  encodePng,
  noiseImage,
} from '../../../test/fixtures/images';
import { imagesToPdf, layoutImagePage, PAGE_SIZES } from './images';

const opts = {
  pageSize: 'a4' as const,
  orientation: 'auto' as const,
  marginPt: 0,
};

describe('layoutImagePage', () => {
  it('fits a portrait image inside A4 portrait, centred', () => {
    const l = layoutImagePage(1000, 2000, opts);
    expect([l.pageWidth, l.pageHeight]).toEqual(PAGE_SIZES.a4);
    expect(l.height).toBeCloseTo(841.89);
    expect(l.width).toBeCloseTo(420.945);
    expect(l.x).toBeCloseTo((595.28 - 420.945) / 2);
    expect(l.y).toBeCloseTo(0);
  });
  it('turns the page landscape for wide images in auto mode', () => {
    const l = layoutImagePage(2000, 1000, opts);
    expect([l.pageWidth, l.pageHeight]).toEqual([841.89, 595.28]);
  });
  it('honours a forced orientation and the margin', () => {
    const l = layoutImagePage(2000, 1000, {
      pageSize: 'letter',
      orientation: 'portrait',
      marginPt: 36,
    });
    expect([l.pageWidth, l.pageHeight]).toEqual([612, 792]);
    expect(l.width).toBeCloseTo(540);
    expect(l.x).toBeCloseTo(36);
  });
  it('sizes fit-to-image pages at 96 DPI plus the margin', () => {
    expect(
      layoutImagePage(400, 300, {
        pageSize: 'fit',
        orientation: 'auto',
        marginPt: 10,
      }),
    ).toEqual({
      pageWidth: 320,
      pageHeight: 245,
      x: 10,
      y: 10,
      width: 300,
      height: 225,
    });
  });
  it('rejects a margin that leaves no room', () => {
    expect(() => layoutImagePage(10, 10, { ...opts, marginPt: 300 })).toThrow(
      'The margin is too large for this page size',
    );
  });
});

describe('imagesToPdf', () => {
  it('builds one page per image, in order, keeping PNG alpha as an SMask', async () => {
    const rgba = noiseImage(8, 6, 4);
    rgba[3] = 0; // one transparent pixel
    const bytes = await imagesToPdf(
      [
        { bytes: encodePng(8, 6, rgba), kind: 'png', name: 'a.png' },
        {
          bytes: encodeJpeg(5, 9, noiseImage(5, 9, 4)),
          kind: 'jpeg',
          name: 'b.jpg',
        },
      ],
      opts,
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getSize()).toEqual({ width: 841.89, height: 595.28 }); // wide → landscape
    expect(doc.getPage(1).getSize()).toEqual({ width: 595.28, height: 841.89 });
    const xobjects = (i: number) =>
      doc.getPage(i).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    const first = xobjects(0).lookup(xobjects(0).keys()[0]) as PDFRawStream;
    expect(first.dict.has(PDFName.of('SMask'))).toBe(true);
    const second = xobjects(1).lookup(xobjects(1).keys()[0]) as PDFRawStream;
    expect(second.dict.lookup(PDFName.of('Filter'))).toEqual(
      PDFName.of('DCTDecode'),
    );
  });
  it('names the file that cannot be embedded', async () => {
    await expect(
      imagesToPdf(
        [
          {
            bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
            kind: 'png',
            name: 'broken.png',
          },
        ],
        opts,
      ),
    ).rejects.toThrow('broken.png could not be read as an image');
  });
  it('needs at least one image', async () => {
    await expect(imagesToPdf([], opts)).rejects.toThrow(
      'Add at least one image',
    );
  });
});
```

Run: `pnpm test src/pdf/edit/images` → Expected: FAIL.

- [ ] **Step 2: Implement** — `src/pdf/edit/images.ts`

```ts
import { PDFDocument, type PDFImage } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';

export const PAGE_SIZES = {
  a4: [595.28, 841.89] as [number, number],
  letter: [612, 792] as [number, number],
};
/** Fit-to-image pages treat image pixels as CSS pixels (96 DPI). */
export const PX_TO_PT = 0.75;

export type PageSizeName = 'a4' | 'letter' | 'fit';
export type Orientation = 'auto' | 'portrait' | 'landscape';

export interface ImagesToPdfOptions {
  pageSize: PageSizeName;
  /** Ignored for `fit`. */
  orientation: Orientation;
  marginPt: number;
}

export interface ImagePageLayout {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageInput {
  bytes: Uint8Array;
  kind: 'png' | 'jpeg';
  name: string;
}

export function layoutImagePage(
  imgW: number,
  imgH: number,
  opts: ImagesToPdfOptions,
): ImagePageLayout {
  const m = Math.max(0, opts.marginPt);
  if (opts.pageSize === 'fit') {
    const width = imgW * PX_TO_PT;
    const height = imgH * PX_TO_PT;
    return {
      pageWidth: width + 2 * m,
      pageHeight: height + 2 * m,
      x: m,
      y: m,
      width,
      height,
    };
  }
  let [pw, ph] = PAGE_SIZES[opts.pageSize];
  const landscape =
    opts.orientation === 'landscape' ||
    (opts.orientation === 'auto' && imgW > imgH);
  if (landscape) [pw, ph] = [ph, pw];
  const boxW = pw - 2 * m;
  const boxH = ph - 2 * m;
  if (boxW <= 0 || boxH <= 0) {
    throw new ToolError(
      'INVALID_INPUT',
      'The margin is too large for this page size',
    );
  }
  const s = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * s;
  const height = imgH * s;
  return {
    pageWidth: pw,
    pageHeight: ph,
    x: (pw - width) / 2,
    y: (ph - height) / 2,
    width,
    height,
  };
}

/** PNG and JPEG are embedded natively (PNG alpha becomes an SMask). */
export async function imagesToPdf(
  images: ImageInput[],
  opts: ImagesToPdfOptions,
): Promise<Uint8Array> {
  if (images.length === 0)
    throw new ToolError('INVALID_INPUT', 'Add at least one image');
  const doc = await PDFDocument.create();
  for (const img of images) {
    let embedded: PDFImage;
    try {
      embedded =
        img.kind === 'png'
          ? await doc.embedPng(img.bytes)
          : await doc.embedJpg(img.bytes);
    } catch (cause) {
      throw new ToolError(
        'INVALID_FILE',
        `${img.name} could not be read as an image`,
        { cause },
      );
    }
    const l = layoutImagePage(embedded.width, embedded.height, opts);
    doc.addPage([l.pageWidth, l.pageHeight]).drawImage(embedded, {
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
    });
  }
  return doc.save({ useObjectStreams: true });
}
```

Export from `src/pdf/edit/index.ts`:

```ts
export {
  imagesToPdf,
  layoutImagePage,
  PAGE_SIZES,
  PX_TO_PT,
  type ImageInput,
  type ImagePageLayout,
  type ImagesToPdfOptions,
  type Orientation,
  type PageSizeName,
} from './images';
```

Run: `pnpm test src/pdf/edit/images` → Expected: PASS.

- [ ] **Step 3: Browser conversion** — `src/shared/lib/image-convert.ts`. This file has no unit test, because jsdom has no image decoding. It is covered by Task 4's e2e, which uploads a real WebP and GIF.

```ts
import { ToolError } from './errors';
import type { FileKind } from './files';

const MIME: Partial<Record<FileKind, string>> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * Decodes an image with the browser's own decoder (GIF: first frame) and
 * re-encodes it losslessly as PNG, keeping transparency. Browser only.
 */
export async function convertToPng(
  bytes: Uint8Array,
  kind: FileKind,
  name: string,
): Promise<Uint8Array> {
  const type = MIME[kind];
  if (!type) throw new ToolError('INVALID_FILE', `${name} is not an image`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(
      new Blob([bytes as Uint8Array<ArrayBuffer>], { type }),
    );
  } catch (cause) {
    throw new ToolError(
      'INVALID_FILE',
      `${name} could not be decoded as an image`,
      { cause },
    );
  }
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx)
      throw new ToolError('UNKNOWN', 'Canvas is not available in this browser');
    ctx.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm test
git add src/pdf/edit/images.ts src/pdf/edit/images.test.ts src/pdf/edit/index.ts src/shared/lib/image-convert.ts
git commit -m "feat(pdf-edit): imagesToPdf with page layout; browser PNG conversion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Images → PDF (`images-to-pdf`)

**Files:**

- Create: `src/shared/lib/object-url.ts`, `src/shared/lib/object-url.test.tsx`
- Create: `src/tools/images-to-pdf/index.ts`, `Tool.tsx`, `store.ts`, `components/ImageThumb.tsx`
- Create: `test/e2e/images-to-pdf.spec.ts`
- Modify: `test/e2e/global-setup.ts`

**Interfaces:**

- Consumes: Task 3 (`imagesToPdf`, `convertToPng`); `PdfDropzone` (with `accept`), `SortableFileList` (`renderPreview`), `JobPanel`, `ResultFiles`; `createToolStore`.
- Produces:
  - `useObjectUrl(bytes: Uint8Array | null, mime: string): string | null`. It creates the object URL in an effect and revokes it on change or unmount, which is StrictMode-safe.
  - `ImageThumb` props: `{ bytes: Uint8Array; mime: string; name: string }`. Renders `<img alt={name}>`, at most 56×56 with `object-contain`.

- [ ] **Step 1: Failing test** — `src/shared/lib/object-url.test.tsx`

```tsx
/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useObjectUrl } from './object-url';

describe('useObjectUrl', () => {
  const create = vi.fn(() => 'blob:1');
  const revoke = vi.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  afterEach(() => vi.clearAllMocks());

  it('creates a URL for the bytes and revokes it on unmount', () => {
    const bytes = new Uint8Array([1, 2]);
    const { result, unmount } = renderHook(() =>
      useObjectUrl(bytes, 'image/png'),
    );
    expect(result.current).toBe('blob:1');
    expect(create).toHaveBeenCalledOnce();
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:1');
  });
  it('returns null without bytes', () => {
    const { result } = renderHook(() => useObjectUrl(null, 'image/png'));
    expect(result.current).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test src/shared/lib/object-url` → Expected: FAIL.

- [ ] **Step 2: Implement** — `src/shared/lib/object-url.ts`

```ts
import { useEffect, useState } from 'react';

/** An object URL for `bytes`, revoked when the bytes change or on unmount. */
export function useObjectUrl(
  bytes: Uint8Array | null,
  mime: string,
): string | null {
  const [entry, setEntry] = useState<{ bytes: Uint8Array; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!bytes) return;
    const url = URL.createObjectURL(
      new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }),
    );
    setEntry({ bytes, url });
    return () => URL.revokeObjectURL(url);
  }, [bytes, mime]);
  return bytes && entry?.bytes === bytes ? entry.url : null;
}
```

Run: `pnpm test src/shared/lib/object-url` → Expected: PASS.

- [ ] **Step 3: Store, manifest, thumbnail**

`store.ts`:

```ts
import { createToolStore } from '@/shared/state/createToolStore';
import type { Orientation, PageSizeName } from '@/pdf/edit';

export const useImagesToPdfSettings = createToolStore({
  toolId: 'images-to-pdf',
  initial: {
    pageSize: 'a4' as PageSizeName,
    orientation: 'auto' as Orientation,
    marginMm: 10,
  },
  actions: (set) => ({
    setPageSize: (pageSize: PageSizeName) => set({ pageSize }),
    setOrientation: (orientation: Orientation) => set({ orientation }),
    setMarginMm: (marginMm: number) => set({ marginMm }),
  }),
});
```

`index.ts`: `defineTool({ id: 'images-to-pdf', name: 'Images to PDF', description: 'Combine PNG, JPEG, WebP and GIF images into one PDF', icon: Images, category: 'pdf', version: '1.0.0', isNew: true, enabled: true, load: () => import('./Tool') })`.

`components/ImageThumb.tsx`:

```tsx
import React from 'react';
import { Spinner } from '@/shared/ui';
import { useObjectUrl } from '@/shared/lib/object-url';

interface ImageThumbProps {
  bytes: Uint8Array;
  mime: string;
  name: string;
}

export const ImageThumb: React.FC<ImageThumbProps> = ({
  bytes,
  mime,
  name,
}) => {
  const url = useObjectUrl(bytes, mime);
  if (!url)
    return (
      <span aria-hidden>
        <Spinner size="sm" />
      </span>
    );
  return (
    <img
      src={url}
      alt={name}
      className="max-h-14 max-w-14 rounded-sm border border-line object-contain"
    />
  );
};
```

- [ ] **Step 4: Tool** — `src/tools/images-to-pdf/Tool.tsx`. Spec:

- **State:** `items: LoadedFile[]`. Add-errors are shown by `PdfDropzone` itself.
- **`PdfDropzone`:**
  - Props: `multiple`, `accept={['png', 'jpeg', 'webp', 'gif']}`, `label="Drop images (PNG, JPEG, WebP or GIF) or click to browse"`.
  - `onFiles` appends to `items` and calls `job.reset()`.
- **`SortableFileList`:**
  - `items`, plus `onReorder` and `onRemove`, which both call `job.reset()`.
  - `renderPreview={(item) => <ImageThumb bytes={item.bytes} mime={MIME[item.kind]} name={item.name} />}`, where `MIME` is a `Record<FileKind, string>` with `pdf: 'application/pdf'` for completeness.
  - `renderExtra` shows the kind as an uppercase `Badge` (`PNG`, `JPEG`, `WEBP`, `GIF`).
- **Settings:** each label has its own `htmlFor`.
  - `Label` "Page size" + `Select` id `i2p-size`, items `[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }, { value: 'fit', label: 'Fit to image' }]`.
  - `Label` "Orientation" + `Select` id `i2p-orientation`, items Auto / Portrait / Landscape. It is `disabled` when page size is `fit`.
  - `Label` "Margin (mm)" + `NumberInput` id `i2p-margin`, min 0, max 50, step 1.
- **Help text** (`Text size="sm" tone="muted"`): "Drag images, or focus one and press Alt + Up/Down, to set the page order. WebP and GIF images are converted to PNG; animated GIFs use their first frame."
- **Buttons:**
  - `Create PDF` (solid, `FileStack` icon). Disabled when `items.length === 0` or the job is running. It runs `job.run(items, { pageSize, orientation, marginPt: (marginMm * 72) / 25.4 })`.
  - `Clear` (ghost).
- **Job:**

```ts
const job = useJob(
  async (
    ctx,
    list: LoadedFile[],
    opts: ImagesToPdfOptions,
  ): Promise<ResultFile> => {
    const images: ImageInput[] = [];
    for (const [i, item] of list.entries()) {
      ctx.progress({ done: i, total: list.length, label: 'Preparing images' });
      ctx.signal.throwIfAborted();
      images.push(
        item.kind === 'png' || item.kind === 'jpeg'
          ? { bytes: item.bytes, kind: item.kind, name: item.name }
          : {
              bytes: await convertToPng(item.bytes, item.kind, item.name),
              kind: 'png',
              name: item.name,
            },
      );
    }
    ctx.progress({
      done: list.length,
      total: list.length,
      label: 'Building PDF',
    });
    const bytes = await imagesToPdf(images, opts);
    return {
      name: deriveFilename(list[0].name, '', 'pdf'),
      bytes,
      detail: `${list.length} ${list.length === 1 ? 'page' : 'pages'}`,
    };
  },
);
```

- **Result:** `JobPanel` (`runningLabel="Building PDF"`) containing `ResultFiles files={[job.result]}`.

- [ ] **Step 5: Failing e2e** — `test/e2e/images-to-pdf.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';

const fixture = (name: string, mimeType: string) => ({
  name,
  mimeType,
  buffer: readFileSync(`test/fixtures/generated/${name}`),
});

test('combines PNG, JPEG, WebP and GIF into one PDF in the chosen order', async ({
  page,
}) => {
  await page.goto('/images-to-pdf');
  // Chromium can encode WebP; build a real one in the page.
  const webp = await page.evaluate(async () => {
    const c = new OffscreenCanvas(60, 40);
    const g = c.getContext('2d')!;
    g.fillStyle = '#c33';
    g.fillRect(0, 0, 60, 40);
    const blob = await c.convertToBlob({ type: 'image/webp' });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page
    .locator('input[type=file]')
    .setInputFiles([
      fixture('photo.png', 'image/png'),
      fixture('photo.jpg', 'image/jpeg'),
      fixture('tiny.gif', 'image/gif'),
      { name: 'red.webp', mimeType: 'image/webp', buffer: Buffer.from(webp) },
    ]);
  const rows = page.locator('li[data-sortable-item]');
  await expect(rows).toHaveCount(4);
  for (const name of ['photo.png', 'photo.jpg', 'tiny.gif', 'red.webp']) {
    await expect(page.getByRole('img', { name, exact: true })).toBeVisible();
  }

  // Move red.webp to the top with the keyboard.
  const webpRow = page.locator('li[data-sortable-item]', {
    hasText: 'red.webp',
  });
  for (let i = 0; i < 3; i++) {
    await webpRow.focus();
    await page.keyboard.press('Alt+ArrowUp');
  }
  await expect(rows.first()).toContainText('red.webp');

  await page.getByLabel('Page size', { exact: true }).selectOption('fit');
  await page.getByLabel('Margin (mm)', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Create PDF' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('red.pdf');

  const doc = await PDFDocument.load(readFileSync((await download.path())!));
  // Fit to image at 96 DPI: px × 0.75 = pt.
  expect(doc.getPages().map((p) => [p.getWidth(), p.getHeight()])).toEqual([
    [45, 30],
    [240, 150],
    [300, 225],
    [30, 22.5],
  ]);
  const imageOf = (i: number) => {
    const xo = doc
      .getPage(i)
      .node.Resources()!
      .lookup(PDFName.of('XObject'), PDFDict);
    return xo.lookup(xo.keys()[0]) as PDFRawStream;
  };
  // WebP and GIF were really converted to PNG (Flate), JPEG passed through (DCT).
  expect(imageOf(0).dict.lookup(PDFName.of('Filter'))).toEqual(
    PDFName.of('FlateDecode'),
  );
  expect(imageOf(2).dict.lookup(PDFName.of('Filter'))).toEqual(
    PDFName.of('DCTDecode'),
  );
  expect(imageOf(3).dict.lookup(PDFName.of('Filter'))).toEqual(
    PDFName.of('FlateDecode'),
  );
  // The transparent PNG keeps its alpha.
  expect(imageOf(1).dict.has(PDFName.of('SMask'))).toBe(true);
});
```

Add `'/images-to-pdf'` to `TOOL_ROUTES`.

Run: `pnpm test:e2e test/e2e/images-to-pdf.spec.ts` → Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/shared/lib/object-url.ts src/shared/lib/object-url.test.tsx src/tools/images-to-pdf test/e2e/images-to-pdf.spec.ts test/e2e/global-setup.ts
git commit -m "feat(images-to-pdf): combine images into a PDF with page layout options

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: PDF → Text (`pdf-to-text`)

**Files:**

- Create: `src/tools/pdf-to-text/index.ts`, `Tool.tsx`, `store.ts`, `lib/output.ts`, `lib/output.test.ts`
- Create: `test/e2e/pdf-to-text.spec.ts`
- Modify: `test/e2e/global-setup.ts`

**Interfaces:**

- Consumes: `pdfRender.extractText`, `usePdfDocument`, `PageText` (phase 1); `useClipboard`; `ResultFile.mime`.
- Produces:
  - `type TextMode = 'combined' | 'per-page'`
  - `TEXT_MIME = 'text/plain;charset=utf-8'`
  - `combinedText(pages: PageText[]): string`
  - `pagesWithoutText(pages: PageText[]): number[]` (1-based)
  - `textOutputs(sourceName: string, pages: PageText[], mode: TextMode): ResultFile[]`

- [ ] **Step 1: Failing test** — `src/tools/pdf-to-text/lib/output.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { combinedText, pagesWithoutText, textOutputs } from './output';

const pages = [
  { text: 'Alpha 1', hasTextLayer: true },
  { text: '', hasTextLayer: false },
  { text: 'Alpha 3\nmore', hasTextLayer: true },
];
const decode = (b: Uint8Array) => new TextDecoder().decode(b);

describe('pdf-to-text output', () => {
  it('joins pages with headers and flags pages without a text layer', () => {
    expect(combinedText(pages)).toBe(
      '--- Page 1 ---\nAlpha 1\n\n--- Page 2 (no text layer) ---\n\n\n--- Page 3 ---\nAlpha 3\nmore\n',
    );
    expect(pagesWithoutText(pages)).toEqual([2]);
  });
  it('makes one combined .txt', () => {
    const [file] = textOutputs('scan.pdf', pages, 'combined');
    expect(file.name).toBe('scan.txt');
    expect(file.mime).toBe('text/plain;charset=utf-8');
    expect(decode(file.bytes)).toBe(combinedText(pages));
  });
  it('makes one padded .txt per page and marks empty ones', () => {
    const files = textOutputs('scan.pdf', pages, 'per-page');
    expect(files.map((f) => f.name)).toEqual([
      'scan.page-1.txt',
      'scan.page-2.txt',
      'scan.page-3.txt',
    ]);
    expect(decode(files[2].bytes)).toBe('Alpha 3\nmore\n');
    expect(files[1].detail).toBe('no text layer');
  });
});
```

Run: `pnpm test src/tools/pdf-to-text` → Expected: FAIL.

- [ ] **Step 2: Implement** — `src/tools/pdf-to-text/lib/output.ts`

```ts
import type { PageText } from '@/pdf/render';
import type { ResultFile } from '@/pdf/components';
import { deriveFilename } from '@/shared/lib/download';

export type TextMode = 'combined' | 'per-page';
export const TEXT_MIME = 'text/plain;charset=utf-8';

const encoder = new TextEncoder();

export function combinedText(pages: PageText[]): string {
  return (
    pages
      .map(
        (p, i) =>
          `--- Page ${i + 1}${p.hasTextLayer ? '' : ' (no text layer)'} ---\n${p.text}`,
      )
      .join('\n\n') + '\n'
  );
}

export function pagesWithoutText(pages: PageText[]): number[] {
  return pages.flatMap((p, i) => (p.hasTextLayer ? [] : [i + 1]));
}

export function textOutputs(
  sourceName: string,
  pages: PageText[],
  mode: TextMode,
): ResultFile[] {
  if (mode === 'combined') {
    return [
      {
        name: deriveFilename(sourceName, '', 'txt'),
        bytes: encoder.encode(combinedText(pages)),
        mime: TEXT_MIME,
        detail: `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`,
      },
    ];
  }
  const digits = String(pages.length).length;
  return pages.map((p, i) => ({
    name: deriveFilename(
      sourceName,
      `page-${String(i + 1).padStart(digits, '0')}`,
      'txt',
    ),
    bytes: encoder.encode(p.text ? `${p.text}\n` : ''),
    mime: TEXT_MIME,
    detail: p.hasTextLayer ? undefined : 'no text layer',
  }));
}
```

Run: `pnpm test src/tools/pdf-to-text` → Expected: PASS.

- [ ] **Step 3: Store, manifest, Tool**

- `store.ts`: `createToolStore({ toolId: 'pdf-to-text', initial: { mode: 'combined' as TextMode }, actions: (set) => ({ setMode: (mode: TextMode) => set({ mode }) }) })`, exported as `useTextSettings`.
- `index.ts`: id `pdf-to-text`, name `PDF to Text`, description `Extract the text layer of a PDF as plain text (no OCR)`, icon `FileText`.
- `Tool.tsx` spec:
  - Single-file pattern (Global Constraints) with `usePdfDocument(file)`.
  - Job, which extracts every page sequentially:

```ts
const job = useJob(async (ctx, info: DocInfo): Promise<PageText[]> => {
  const pages: PageText[] = [];
  for (let i = 0; i < info.pageCount; i++) {
    ctx.progress({ done: i, total: info.pageCount, label: 'Reading pages' });
    pages.push(await pdfRender.extractText(info.docId, i, ctx.signal));
  }
  return pages;
});
```

- Outputs are derived, so changing the mode does **not** re-extract: `const outputs = useMemo(() => (job.result && file ? textOutputs(file.name, job.result, mode) : []), [job.result, file, mode]);`.
- Controls when `doc` is ready:
  - `Label` "Output" + `Tabs` (`TabsTrigger value="combined"` "One file", `value="per-page"` "One file per page").
  - `Button` "Extract text" (solid, `FileText` icon), which runs `job.run(doc)`.
- Inside `JobPanel` (`runningLabel="Reading pages"`) when `job.result`:
  - If `pagesWithoutText(job.result).length > 0`: `Alert status="warning"` with `AlertTitle` "Some pages have no text" and `AlertDescription` `No text layer on page(s) ${list.join(', ')}. They are probably scanned images; OCR is not supported.`
  - `Label htmlFor="text-preview"` "Extracted text" + `Textarea id="text-preview" readOnly rows={12}`. Its value is `combinedText(job.result)`, truncated to 100 000 characters, with `…` and a muted note "Preview truncated; the download has everything" when cut.
  - `Button` "Copy text" (soft). It uses `useClipboard().copy(combinedText(...))`, then `notify.success('Copied')`, or `notify.error('Could not copy to clipboard')` on `false`. The label switches to "Copied" while `copied`.
  - `ResultFiles files={outputs} zipName={deriveFilename(file.name, 'text', 'zip')}`.

- [ ] **Step 4: Failing e2e** — `test/e2e/pdf-to-text.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('extracts text into one file', async ({ page }) => {
  await page.goto('/pdf-to-text');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('button', { name: 'Extract text' }).click();
  await expect(page.getByLabel('Extracted text', { exact: true })).toHaveValue(
    /Alpha 3/,
  );
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.txt');
  expect(readFileSync((await download.path())!, 'utf8')).toBe(
    '--- Page 1 ---\nAlpha 1\n\n--- Page 2 ---\nAlpha 2\n\n--- Page 3 ---\nAlpha 3\n',
  );
});

test('flags pages without a text layer and offers per-page files', async ({
  page,
}) => {
  await page.goto('/pdf-to-text');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/shapes-2.pdf');
  await page.getByRole('button', { name: 'Extract text' }).click();
  await expect(
    page.getByText('No text layer on page(s) 1, 2.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'One file per page' }).click();
  await expect(page.getByText('2 files ready', { exact: false })).toBeVisible();
});
```

Add `'/pdf-to-text'` to `TOOL_ROUTES`.

Run: `pnpm test:e2e test/e2e/pdf-to-text.spec.ts` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/tools/pdf-to-text test/e2e/pdf-to-text.spec.ts test/e2e/global-setup.ts
git commit -m "feat(pdf-to-text): extract text per page or combined, flag pages without text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## PR boundary A — Convert

- [ ] Run the gate. Each command must pass:
  - `pnpm lint` (0 errors)
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm test:e2e` three times in a row. Investigate any flake; never add retries or sleeps.
- [ ] Scripted browser pass, one-off and not committed:
  - Visit `/`, `/pdf-to-images`, `/images-to-pdf` and `/pdf-to-text`. Confirm no console errors and no page errors.
  - Confirm the dashboard shows all three tools with a NEW badge.
- [ ] `git push -u origin feat/pdf-tools-convert` and open a PR into `master`.
  - Title: "PDF tools: Convert (PDF→Images, Images→PDF, PDF→Text)".
  - Body: summary, test evidence, and the line "Encrypted input still shows the phase 1 ENCRYPTED message; Part C adds the password flow."
  - End the body with the Claude Code attribution line. Merge once green locally (owner authorization 2026-10-01).

---

# Part B — Mark up (PR 2: `feat/pdf-tools-markup`)

**Branch:** after PR A has merged, run `git switch master && git pull && git switch -c feat/pdf-tools-markup`.

### Task 6: Markup groundwork — page geometry, font checks, live preview

**Files:**

- Create: `src/pdf/edit/geometry.ts`, `src/pdf/edit/geometry.test.ts`, `src/pdf/edit/fonts.ts`, `src/pdf/edit/fonts.test.ts`, `src/pdf/edit/color.ts`
- Modify: `src/pdf/edit/ops.ts` (export `assertIndices`), `src/pdf/edit/index.ts`
- Create: `src/pdf/components/usePreviewBytes.ts`, `src/pdf/components/usePreviewBytes.test.tsx`, `src/pdf/components/PdfPagePreview.tsx`
- Modify: `src/pdf/components/index.ts`
- Modify: `test/fixtures/builders.ts`, `test/fixtures/builders.test.ts`

**Interfaces:**

- Consumes: `parsePageRanges`, `rangesToIndices`, `Rotation`, `extract`, `usePdfDocument`, `PageThumb`.
- Produces (from `@/pdf/edit`):
  - Types:
    - `interface PageFrame { x0: number; y0: number; width: number; height: number; rotation: Rotation }`. The crop box, in PDF space.
    - `interface Size { width: number; height: number }`, `interface Point { x: number; y: number }`.
    - `interface Placement { x: number; y: number; rotate: number }`. A PDF-space origin plus pdf-lib `rotate` degrees.
    - `type Anchor = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'`
    - `type EdgeAnchor = Exclude<Anchor, 'middle-left' | 'center' | 'middle-right'>`
    - `type PageSelection = { mode: 'all' } | { mode: 'ranges'; text: string }`
  - `ANCHOR_OPTIONS: { value: Anchor; label: string }[]`, `EDGE_ANCHOR_OPTIONS: { value: EdgeAnchor; label: string }[]`
  - `normalizeRotation(angle: number): Rotation`
  - `pageFrame(page: PDFPage): PageFrame`
  - `visualSize(frame: PageFrame): Size`
  - `visualToPdf(frame: PageFrame, p: Point): Point`. Visual space has its origin at the bottom-left of the page as displayed, y up, in points.
  - `toPdfPlacement(frame: PageFrame, origin: Point, visualAngle?: number): Placement`
  - `placeBox(visual: Size, anchor: Anchor, box: Size, margin: number): Point`
  - `rotatedBounds(box: Size, deg: number): Size`
  - `rotatedOrigin(center: Point, box: Size, deg: number): Point`
  - `anchoredOrigin(visual: Size, anchor: Anchor, box: Size, deg: number, margin: number): Point`
  - `selectPages(selection: PageSelection, pageCount: number): number[]`
  - `unsupportedChars(font: PDFFont, text: string): string[]`
  - `assertDrawable(font: PDFFont, text: string, what: string): void`
  - `hexToRgb(hex: string): { r: number; g: number; b: number }` (0–1 channels)
  - `assertIndices(indices: number[], pageCount: number): void`, exported from `ops.ts`
- Produces (from `@/pdf/components`):
  - `usePreviewBytes(source: Uint8Array | null, pageIndex: number, settingsKey: string, build: (page: Uint8Array) => Promise<Uint8Array>, delayMs?: number): { bytes: Uint8Array | null; error: ToolError | null; pending: boolean }`
  - `PdfPagePreview` props: `{ bytes: Uint8Array | null; width: number; label: string; caption: string; pending?: boolean; error?: ToolError | null }`
- Produces (test fixtures):
  - `makeRotatedPdf(): Promise<Uint8Array>`. Page 1 is 612×792 with no rotation. Page 2 is 612×792 with `/Rotate 90`. Page 3 is 595×842 with `/Rotate 270` and crop box `[20, 30, 575, 812]`.
  - `textPositions(bytes: Uint8Array, pageIndex: number): Promise<TextPosition[]>`, where `TextPosition = { str: string; x: number; y: number; upright: boolean; viewport: Size }`. Coordinates are in the pdf.js viewport at scale 1, rotation applied, with the origin at the top-left and y down.

- [ ] **Step 1: Fixtures first.** In `test/fixtures/builders.ts`, add `degrees` to the existing `pdf-lib` import and `Util` to the existing pdf.js import (`import { getDocument, Util } from 'pdfjs-dist/legacy/build/pdf.mjs'`). Then append:

```ts
export async function makeRotatedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const specs: {
    size: [number, number];
    rotate: number;
    crop?: [number, number, number, number];
  }[] = [
    { size: [612, 792], rotate: 0 },
    { size: [612, 792], rotate: 90 },
    { size: [595, 842], rotate: 270, crop: [20, 30, 555, 782] },
  ];
  specs.forEach((s, i) => {
    const page = doc.addPage(s.size);
    page.setRotation(degrees(s.rotate));
    if (s.crop) page.setCropBox(...s.crop);
    page.drawText(`Rotated ${i + 1}`, { x: 100, y: 400, size: 14, font });
  });
  return doc.save();
}

export interface TextPosition {
  str: string;
  /** pdf.js viewport (scale 1, rotation applied): origin top-left, y down. */
  x: number;
  y: number;
  /** Reads left-to-right on screen. */
  upright: boolean;
  viewport: { width: number; height: number };
}

export async function textPositions(
  bytes: Uint8Array,
  pageIndex: number,
): Promise<TextPosition[]> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const { items } = await page.getTextContent();
    return items
      .filter(
        (i): i is typeof i & { str: string; transform: number[] } =>
          'str' in i && i.str.trim() !== '',
      )
      .map((i) => {
        const [a, b, , , e, f] = Util.transform(
          viewport.transform,
          i.transform,
        );
        return {
          str: i.str,
          x: e,
          y: f,
          upright: a > 0 && Math.abs(b) < 1e-3,
          viewport: { width: viewport.width, height: viewport.height },
        };
      });
  } finally {
    await task.destroy();
  }
}
```

Add a builder test: `makeRotatedPdf` reports rotations `[0, 90, 270]` via pdf-lib. Its text on page 2 is found by `textPositions` with `upright === false`, because the text was drawn in unrotated space, so on screen it is sideways.

Run: `pnpm test test/fixtures` → Expected: PASS.

- [ ] **Step 2: Failing geometry tests** — `src/pdf/edit/geometry.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { degrees, PDFDocument, StandardFonts } from 'pdf-lib';
import { makeRotatedPdf, textPositions } from '../../../test/fixtures/builders';
import {
  anchoredOrigin,
  normalizeRotation,
  pageFrame,
  placeBox,
  rotatedOrigin,
  selectPages,
  toPdfPlacement,
  visualSize,
  visualToPdf,
  type PageFrame,
} from './geometry';

const frame = (rotation: 0 | 90 | 180 | 270): PageFrame => ({
  x0: 10,
  y0: 20,
  width: 600,
  height: 800,
  rotation,
});

describe('visualToPdf', () => {
  it.each([
    [0, { x: 10, y: 20 }],
    [90, { x: 610, y: 20 }],
    [180, { x: 610, y: 820 }],
    [270, { x: 10, y: 820 }],
  ] as const)(
    'maps the visual bottom-left corner at /Rotate %i',
    (r, expected) => {
      expect(visualToPdf(frame(r), { x: 0, y: 0 })).toEqual(expected);
    },
  );
  it('maps visual +x along the displayed page width', () => {
    expect(visualToPdf(frame(90), { x: 100, y: 0 })).toEqual({
      x: 610,
      y: 120,
    });
    expect(visualToPdf(frame(270), { x: 100, y: 0 })).toEqual({
      x: 10,
      y: 720,
    });
  });
  it('swaps the visual size for quarter turns', () => {
    expect(visualSize(frame(90))).toEqual({ width: 800, height: 600 });
    expect(visualSize(frame(180))).toEqual({ width: 600, height: 800 });
  });
  it('normalises odd rotations', () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
  });
});

describe('anchors', () => {
  it('places boxes at anchors with a margin', () => {
    const v = { width: 600, height: 800 };
    const box = { width: 100, height: 20 };
    expect(placeBox(v, 'bottom-center', box, 10)).toEqual({ x: 250, y: 10 });
    expect(placeBox(v, 'top-right', box, 10)).toEqual({ x: 490, y: 770 });
    expect(placeBox(v, 'center', box, 10)).toEqual({ x: 250, y: 390 });
  });
  it('centres a rotated box on its anchor', () => {
    const o = rotatedOrigin({ x: 300, y: 400 }, { width: 100, height: 20 }, 90);
    expect(o.x).toBeCloseTo(310);
    expect(o.y).toBeCloseTo(350);
    expect(
      anchoredOrigin(
        { width: 600, height: 800 },
        'center',
        { width: 100, height: 20 },
        0,
        0,
      ),
    ).toEqual({ x: 250, y: 390 });
  });
});

describe('selectPages', () => {
  it('selects all or parsed ranges, sorted and unique', () => {
    expect(selectPages({ mode: 'all' }, 3)).toEqual([0, 1, 2]);
    expect(selectPages({ mode: 'ranges', text: '3, 1-2, 2' }, 3)).toEqual([
      0, 1, 2,
    ]);
    expect(() => selectPages({ mode: 'ranges', text: '' }, 3)).toThrow(
      'Enter at least one page or range',
    );
  });
});

describe('toPdfPlacement on real rotated pages', () => {
  it('draws upright text at the visual bottom-left of a /Rotate 90 page', async () => {
    const doc = await PDFDocument.load(await makeRotatedPdf());
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.getPage(1);
    const f = pageFrame(page);
    const at = toPdfPlacement(
      f,
      anchoredOrigin(
        visualSize(f),
        'bottom-left',
        { width: 30, height: 14 },
        0,
        20,
      ),
      0,
    );
    page.drawText('Mark', {
      x: at.x,
      y: at.y,
      size: 20,
      font,
      rotate: degrees(at.rotate),
    });
    const items = await textPositions(await doc.save(), 1);
    const mark = items.find((i) => i.str === 'Mark')!;
    expect(mark.upright).toBe(true);
    expect(mark.x).toBeCloseTo(20, 0);
    expect(mark.y).toBeCloseTo(mark.viewport.height - 20, 0); // baseline 20pt above the visual bottom
  });
  it('respects the crop box on a /Rotate 270 page', async () => {
    const doc = await PDFDocument.load(await makeRotatedPdf());
    const f = pageFrame(doc.getPage(2));
    expect(f).toEqual({
      x0: 20,
      y0: 30,
      width: 555,
      height: 782,
      rotation: 270,
    });
    expect(visualSize(f)).toEqual({ width: 782, height: 555 });
  });
});
```

Run: `pnpm test src/pdf/edit/geometry` → Expected: FAIL.

- [ ] **Step 3: Implement** — `src/pdf/edit/geometry.ts`

```ts
import type { PDFPage } from 'pdf-lib';
import type { Rotation } from './ops';
import { parsePageRanges, rangesToIndices } from './ranges';

export interface PageFrame {
  x0: number;
  y0: number;
  width: number;
  height: number;
  rotation: Rotation;
}
export interface Size {
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface Placement {
  x: number;
  y: number;
  rotate: number;
}

export type Anchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
export type EdgeAnchor = Exclude<
  Anchor,
  'middle-left' | 'center' | 'middle-right'
>;
export type PageSelection = { mode: 'all' } | { mode: 'ranges'; text: string };

const LABELS: Record<Anchor, string> = {
  'top-left': 'Top left',
  'top-center': 'Top centre',
  'top-right': 'Top right',
  'middle-left': 'Middle left',
  center: 'Centre',
  'middle-right': 'Middle right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom centre',
  'bottom-right': 'Bottom right',
};
export const ANCHOR_OPTIONS = (Object.keys(LABELS) as Anchor[]).map(
  (value) => ({ value, label: LABELS[value] }),
);
export const EDGE_ANCHOR_OPTIONS = ANCHOR_OPTIONS.filter(
  (o): o is { value: EdgeAnchor; label: string } =>
    !['middle-left', 'center', 'middle-right'].includes(o.value),
);

export function normalizeRotation(angle: number): Rotation {
  return ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as Rotation;
}

export function pageFrame(page: PDFPage): PageFrame {
  const box = page.getCropBox();
  return {
    x0: box.x,
    y0: box.y,
    width: box.width,
    height: box.height,
    rotation: normalizeRotation(page.getRotation().angle),
  };
}

export function visualSize(f: PageFrame): Size {
  return f.rotation % 180 === 0
    ? { width: f.width, height: f.height }
    : { width: f.height, height: f.width };
}

/** Visual (as displayed, origin bottom-left, y up) → PDF user space. */
export function visualToPdf(f: PageFrame, p: Point): Point {
  switch (f.rotation) {
    case 0:
      return { x: f.x0 + p.x, y: f.y0 + p.y };
    case 90: // displayed turned clockwise
      return { x: f.x0 + f.width - p.y, y: f.y0 + p.x };
    case 180:
      return { x: f.x0 + f.width - p.x, y: f.y0 + f.height - p.y };
    case 270:
      return { x: f.x0 + p.y, y: f.y0 + f.height - p.x };
  }
}

/**
 * Origin and pdf-lib rotation for content whose visual origin (bottom-left,
 * before its own rotation) is `origin`, turned `visualAngle` degrees
 * counter-clockwise on screen. Adding the page rotation keeps it upright.
 */
export function toPdfPlacement(
  f: PageFrame,
  origin: Point,
  visualAngle = 0,
): Placement {
  return {
    ...visualToPdf(f, origin),
    rotate: (((visualAngle + f.rotation) % 360) + 360) % 360,
  };
}

export function placeBox(
  visual: Size,
  anchor: Anchor,
  box: Size,
  margin: number,
): Point {
  const [v, h] = anchor === 'center' ? ['middle', 'center'] : anchor.split('-');
  const x =
    h === 'left'
      ? margin
      : h === 'right'
        ? visual.width - margin - box.width
        : (visual.width - box.width) / 2;
  const y =
    v === 'bottom'
      ? margin
      : v === 'top'
        ? visual.height - margin - box.height
        : (visual.height - box.height) / 2;
  return { x, y };
}

const rad = (deg: number) => (deg * Math.PI) / 180;

export function rotatedBounds(box: Size, deg: number): Size {
  const c = Math.abs(Math.cos(rad(deg)));
  const s = Math.abs(Math.sin(rad(deg)));
  return {
    width: box.width * c + box.height * s,
    height: box.width * s + box.height * c,
  };
}

/** Origin (bottom-left before rotation) that puts the rotated box's centre at `center`. */
export function rotatedOrigin(center: Point, box: Size, deg: number): Point {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return {
    x: center.x - ((box.width / 2) * c - (box.height / 2) * s),
    y: center.y - ((box.width / 2) * s + (box.height / 2) * c),
  };
}

/** Visual origin for a box rotated `deg` whose bounding box sits at `anchor`. */
export function anchoredOrigin(
  visual: Size,
  anchor: Anchor,
  box: Size,
  deg: number,
  margin: number,
): Point {
  const bounds = rotatedBounds(box, deg);
  const at = placeBox(visual, anchor, bounds, margin);
  return rotatedOrigin(
    { x: at.x + bounds.width / 2, y: at.y + bounds.height / 2 },
    box,
    deg,
  );
}

export function selectPages(
  selection: PageSelection,
  pageCount: number,
): number[] {
  if (selection.mode === 'all')
    return Array.from({ length: pageCount }, (_, i) => i);
  return [
    ...new Set(rangesToIndices(parsePageRanges(selection.text, pageCount))),
  ].sort((a, b) => a - b);
}
```

Run: `pnpm test src/pdf/edit/geometry` → Expected: PASS. (The `anchoredOrigin` `center` case returns exact numbers at 0°: `cos(0) = 1`, `sin(0) = 0`.)

- [ ] **Step 4: Failing font and colour tests** — `src/pdf/edit/fonts.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { assertDrawable, unsupportedChars } from './fonts';
import { hexToRgb } from './color';

describe('font checks', () => {
  it('lists characters outside the font, once each', async () => {
    const font = await (
      await PDFDocument.create()
    ).embedFont(StandardFonts.Helvetica);
    expect(unsupportedChars(font, 'Página 1')).toEqual([]);
    expect(unsupportedChars(font, 'Página № №1 🙂')).toEqual(['№', '🙂']);
    expect(() => assertDrawable(font, 'Seite №', 'The watermark text')).toThrow(
      "The watermark text contains characters the font can't draw: №",
    );
  });
});

describe('hexToRgb', () => {
  it('parses #rrggbb into 0–1 channels', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 1, g: 128 / 255, b: 0 });
    expect(() => hexToRgb('red')).toThrow('"red" is not a colour like #336699');
  });
});
```

Run: `pnpm test src/pdf/edit/fonts` → Expected: FAIL.

- [ ] **Step 5: Implement**

`src/pdf/edit/fonts.ts`:

```ts
import type { PDFFont } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';

/** Characters in `text` that `font` has no glyph/encoding for (unique, in order). */
export function unsupportedChars(font: PDFFont, text: string): string[] {
  const supported = new Set(font.getCharacterSet());
  return [...new Set(Array.from(text))].filter(
    (ch) => !supported.has(ch.codePointAt(0)!),
  );
}

export function assertDrawable(
  font: PDFFont,
  text: string,
  what: string,
): void {
  const bad = unsupportedChars(font, text);
  if (bad.length > 0) {
    throw new ToolError(
      'INVALID_INPUT',
      `${what} contains characters the font can't draw: ${bad.join(' ')}`,
    );
  }
}
```

`src/pdf/edit/color.ts`:

```ts
import { ToolError } from '@/shared/lib/errors';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m)
    throw new ToolError(
      'INVALID_INPUT',
      `"${hex}" is not a colour like #336699`,
    );
  const n = parseInt(m[1], 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}
```

In `ops.ts`, change `function assertIndices` to `export function assertIndices`. In `src/pdf/edit/index.ts`, export everything from `./geometry`, plus `unsupportedChars`, `assertDrawable`, `hexToRgb` and `assertIndices`.

Run: `pnpm test src/pdf/edit` → Expected: PASS.

- [ ] **Step 6: Failing preview-hook test** — `src/pdf/components/usePreviewBytes.test.tsx`

```tsx
/** @vitest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { makeTextPdf } from '../../../test/fixtures/builders';
import { usePreviewBytes } from './usePreviewBytes';

describe('usePreviewBytes', () => {
  it('builds from a one-page extract, debounced to the latest settings', async () => {
    const source = await makeTextPdf({ pages: 3 });
    const build = vi.fn(async (page: Uint8Array) => page);
    const { result, rerender } = renderHook(
      ({ key }) => usePreviewBytes(source, 1, key, build, 60),
      {
        initialProps: { key: 'a' },
      },
    );
    rerender({ key: 'b' });
    rerender({ key: 'c' });
    await waitFor(() => expect(result.current.bytes).not.toBeNull());
    expect(build).toHaveBeenCalledOnce();
    expect(result.current.pending).toBe(false);
    expect((await PDFDocument.load(result.current.bytes!)).getPageCount()).toBe(
      1,
    );
  });
  it('surfaces build errors as ToolErrors', async () => {
    const source = await makeTextPdf({ pages: 1 });
    const build = vi.fn(async () => {
      throw new ToolError('INVALID_INPUT', 'bad text');
    });
    const { result } = renderHook(() =>
      usePreviewBytes(source, 0, 'k', build, 10),
    );
    await waitFor(() => expect(result.current.error?.message).toBe('bad text'));
    expect(result.current.bytes).toBeNull();
  });
});
```

Run: `pnpm test src/pdf/components/usePreviewBytes` → Expected: FAIL.

- [ ] **Step 7: Implement** — `src/pdf/components/usePreviewBytes.ts`

```ts
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { extract } from '@/pdf/edit';

interface Built {
  from: Uint8Array;
  key: string;
  bytes: Uint8Array | null;
  error: ToolError | null;
}

/**
 * Live preview bytes: one page of `source` run through `build`, debounced by
 * `settingsKey` (serialise the settings that affect the output). The last
 * good preview stays visible while a newer one is pending.
 */
export function usePreviewBytes(
  source: Uint8Array | null,
  pageIndex: number,
  settingsKey: string,
  build: (page: Uint8Array) => Promise<Uint8Array>,
  delayMs = 250,
): { bytes: Uint8Array | null; error: ToolError | null; pending: boolean } {
  const buildRef = useRef(build);
  useLayoutEffect(() => {
    buildRef.current = build;
  });
  const [page, setPage] = useState<{
    source: Uint8Array;
    pageIndex: number;
    bytes: Uint8Array | null;
    error: ToolError | null;
  } | null>(null);
  const [built, setBuilt] = useState<Built | null>(null);

  useEffect(() => {
    if (!source) return;
    let alive = true;
    extract(source, [pageIndex]).then(
      (bytes) => alive && setPage({ source, pageIndex, bytes, error: null }),
      (e) =>
        alive &&
        setPage({ source, pageIndex, bytes: null, error: toToolError(e) }),
    );
    return () => {
      alive = false;
    };
  }, [source, pageIndex]);

  const current =
    page && page.source === source && page.pageIndex === pageIndex
      ? page
      : null;
  const from = current?.bytes ?? null;

  useEffect(() => {
    if (!from) return;
    let alive = true;
    const timer = setTimeout(() => {
      buildRef.current(from).then(
        (bytes) =>
          alive && setBuilt({ from, key: settingsKey, bytes, error: null }),
        (e) =>
          alive &&
          setBuilt({
            from,
            key: settingsKey,
            bytes: null,
            error: toToolError(e),
          }),
      );
    }, delayMs);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [from, settingsKey, delayMs]);

  if (current?.error)
    return { bytes: null, error: current.error, pending: false };
  const mine = built && built.from === from ? built : null;
  return {
    bytes: mine?.bytes ?? null,
    error: mine?.key === settingsKey ? mine.error : null,
    pending: !mine || mine.key !== settingsKey,
  };
}
```

Run: `pnpm test src/pdf/components/usePreviewBytes` → Expected: PASS.

- [ ] **Step 8: `PdfPagePreview`** — `src/pdf/components/PdfPagePreview.tsx`

```tsx
import React, { useMemo } from 'react';
import { Alert, AlertDescription, Spinner } from '@/shared/ui';
import type { ToolError } from '@/shared/lib/errors';
import { usePdfDocument } from '@/pdf/render';
import { PageThumb } from './PageThumb';

interface PdfPagePreviewProps {
  bytes: Uint8Array | null;
  /** CSS px. */
  width: number;
  /** Accessible name of the rendered page image. */
  label: string;
  caption: string;
  pending?: boolean;
  error?: ToolError | null;
}

/** Renders page 1 of `bytes` (a real output preview, not a CSS mock-up). */
export const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({
  bytes,
  width,
  label,
  caption,
  pending,
  error,
}) => {
  const file = useMemo(() => (bytes ? { bytes } : null), [bytes]);
  const { doc, error: openError } = usePdfDocument(file);
  const problem = error ?? openError;
  return (
    <figure
      className="flex flex-col items-center gap-2"
      aria-busy={pending || undefined}
    >
      {problem ? (
        <Alert status="danger">
          <AlertDescription>{problem.message}</AlertDescription>
        </Alert>
      ) : doc ? (
        <PageThumb
          docId={doc.docId}
          pageIndex={0}
          page={doc.pages[0]}
          width={width}
          label={label}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-sm border border-line bg-surface-subtle"
          style={{ width, height: Math.round(width * Math.SQRT2) }}
        >
          <Spinner size="sm" label="Rendering preview" />
        </div>
      )}
      <figcaption className="text-xs text-fg-muted">
        {pending ? 'Updating preview…' : caption}
      </figcaption>
    </figure>
  );
};
```

Export `PdfPagePreview` and `usePreviewBytes` from `src/pdf/components/index.ts`.

- [ ] **Step 9: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/pdf/edit src/pdf/components test/fixtures
git commit -m "feat(pdf-edit): rotation-aware page geometry, font checks, live preview hook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Watermark (`pdf-watermark`)

**Files:**

- Create: `src/pdf/edit/markup.ts`, `src/pdf/edit/markup.test.ts`
- Modify: `src/pdf/edit/index.ts`
- Create: `src/tools/pdf-watermark/index.ts`, `Tool.tsx`, `store.ts`
- Create: `test/e2e/pdf-watermark.spec.ts`
- Modify: `test/e2e/global-setup.ts`

**Interfaces:**

- Consumes: Task 6 (geometry, `assertDrawable`, `hexToRgb`, `assertIndices`, `usePreviewBytes`, `PdfPagePreview`); `loadPdf`.
- Produces (from `@/pdf/edit`):
  - `type WatermarkContent = { kind: 'text'; text: string; fontSize: number; color: string } | { kind: 'image'; bytes: Uint8Array; format: 'png' | 'jpeg'; widthFraction: number }`
  - `interface WatermarkOptions { content: WatermarkContent; opacity: number; rotation: number; position: Anchor; margin: number; pages: number[] }`. `opacity` is in (0, 1]. `rotation` is in degrees, counter-clockwise on screen. `pages` are 0-based.
  - `watermark(bytes: Uint8Array, opts: WatermarkOptions): Promise<Uint8Array>`

- [ ] **Step 1: Failing tests** — `src/pdf/edit/markup.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFNumber } from 'pdf-lib';
import {
  makeRotatedPdf,
  makeTextPdf,
  pdfPageTexts,
  textPositions,
} from '../../../test/fixtures/builders';
import { encodePng, noiseImage } from '../../../test/fixtures/images';
import { watermark, type WatermarkOptions } from './markup';

const text = (over: Partial<WatermarkOptions> = {}): WatermarkOptions => ({
  content: { kind: 'text', text: 'DRAFT', fontSize: 48, color: '#888888' },
  opacity: 0.3,
  rotation: 0,
  position: 'center',
  margin: 24,
  pages: [0],
  ...over,
});

describe('watermark', () => {
  it('draws text only on the selected pages, at the requested opacity', async () => {
    const out = await watermark(
      await makeTextPdf({ pages: 3 }),
      text({ pages: [0, 2] }),
    );
    const texts = await pdfPageTexts(out);
    expect(texts[0]).toContain('DRAFT');
    expect(texts[1]).not.toContain('DRAFT');
    expect(texts[2]).toContain('DRAFT');
    const gs = (await PDFDocument.load(out))
      .getPage(0)
      .node.Resources()!
      .lookup(PDFName.of('ExtGState'), PDFDict);
    const alphas = gs
      .keys()
      .map((k) =>
        (
          gs.lookup(k, PDFDict).lookup(PDFName.of('ca')) as
            | PDFNumber
            | undefined
        )?.asNumber(),
      );
    expect(alphas).toContain(0.3);
  });
  it('centres upright text on a /Rotate 90 page', async () => {
    const out = await watermark(await makeRotatedPdf(), text({ pages: [1] }));
    const mark = (await textPositions(out, 1)).find((i) => i.str === 'DRAFT')!;
    expect(mark.upright).toBe(true);
    expect(mark.viewport).toEqual({ width: 792, height: 612 });
    // Helvetica-Bold "DRAFT" at 48pt is ~150pt wide → starts ~ (792 - 150) / 2.
    expect(mark.x).toBeGreaterThan(300);
    expect(mark.x).toBeLessThan(345);
  });
  it('stamps an image (keeping PNG alpha) on each selected page', async () => {
    const rgba = noiseImage(20, 10, 4);
    rgba[3] = 0;
    const out = await watermark(await makeTextPdf({ pages: 2 }), {
      ...text({ pages: [1] }),
      content: {
        kind: 'image',
        bytes: encodePng(20, 10, rgba),
        format: 'png',
        widthFraction: 0.5,
      },
    });
    const doc = await PDFDocument.load(out);
    const xo = (i: number) =>
      doc.getPage(i).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
    expect(doc.getPage(0).node.Resources()!.has(PDFName.of('XObject'))).toBe(
      false,
    );
    expect(xo(1).keys()).toHaveLength(1);
  });
  it('rejects characters the font cannot draw, naming them', async () => {
    await expect(
      watermark(
        await makeTextPdf({ pages: 1 }),
        text({
          content: {
            kind: 'text',
            text: 'Entwurf №1',
            fontSize: 40,
            color: '#000000',
          },
        }),
      ),
    ).rejects.toThrow(
      "The watermark text contains characters the font can't draw: №",
    );
  });
  it('validates opacity, text and pages', async () => {
    const pdf = await makeTextPdf({ pages: 1 });
    await expect(watermark(pdf, text({ opacity: 0 }))).rejects.toThrow(
      'Opacity must be between 1% and 100%',
    );
    await expect(
      watermark(
        pdf,
        text({
          content: { kind: 'text', text: '  ', fontSize: 40, color: '#000000' },
        }),
      ),
    ).rejects.toThrow('Enter the watermark text');
    await expect(watermark(pdf, text({ pages: [] }))).rejects.toThrow(
      'Select at least one page',
    );
  });
});
```

Run: `pnpm test src/pdf/edit/markup` → Expected: FAIL.

- [ ] **Step 2: Implement** — `src/pdf/edit/markup.ts` (the watermark half; Task 8 appends page numbers)

```ts
import { degrees, rgb, StandardFonts, type PDFImage } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { hexToRgb } from './color';
import { assertDrawable } from './fonts';
import {
  anchoredOrigin,
  pageFrame,
  toPdfPlacement,
  visualSize,
  type Anchor,
} from './geometry';
import { loadPdf } from './load';
import { assertIndices } from './ops';

const invalid = (m: string) => new ToolError('INVALID_INPUT', m);

export type WatermarkContent =
  | { kind: 'text'; text: string; fontSize: number; color: string }
  | {
      kind: 'image';
      bytes: Uint8Array;
      format: 'png' | 'jpeg';
      widthFraction: number;
    };

export interface WatermarkOptions {
  content: WatermarkContent;
  opacity: number;
  /** Degrees, counter-clockwise as seen on screen. */
  rotation: number;
  position: Anchor;
  margin: number;
  pages: number[];
}

export async function watermark(
  bytes: Uint8Array,
  opts: WatermarkOptions,
): Promise<Uint8Array> {
  if (!(opts.opacity > 0 && opts.opacity <= 1))
    throw invalid('Opacity must be between 1% and 100%');
  const doc = await loadPdf(bytes);
  assertIndices(opts.pages, doc.getPageCount());
  const c = opts.content;
  if (c.kind === 'text') {
    const label = c.text.replace(/\s+/g, ' ').trim();
    if (!label) throw invalid('Enter the watermark text');
    if (!(c.fontSize >= 6 && c.fontSize <= 400))
      throw invalid('Font size must be between 6 and 400');
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    assertDrawable(font, label, 'The watermark text');
    const color = hexToRgb(c.color);
    const box = {
      width: font.widthOfTextAtSize(label, c.fontSize),
      height: font.heightAtSize(c.fontSize, { descender: false }),
    };
    for (const i of opts.pages) {
      const page = doc.getPage(i);
      const frame = pageFrame(page);
      const at = toPdfPlacement(
        frame,
        anchoredOrigin(
          visualSize(frame),
          opts.position,
          box,
          opts.rotation,
          opts.margin,
        ),
        opts.rotation,
      );
      page.drawText(label, {
        x: at.x,
        y: at.y,
        size: c.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: opts.opacity,
        rotate: degrees(at.rotate),
      });
    }
  } else {
    if (!(c.widthFraction > 0 && c.widthFraction <= 1))
      throw invalid('Image width must be between 1% and 100% of the page');
    let image: PDFImage;
    try {
      image =
        c.format === 'png'
          ? await doc.embedPng(c.bytes)
          : await doc.embedJpg(c.bytes);
    } catch (cause) {
      throw new ToolError(
        'INVALID_FILE',
        'The watermark image could not be read',
        { cause },
      );
    }
    for (const i of opts.pages) {
      const page = doc.getPage(i);
      const frame = pageFrame(page);
      const visual = visualSize(frame);
      const width = visual.width * c.widthFraction;
      const box = { width, height: (width * image.height) / image.width };
      const at = toPdfPlacement(
        frame,
        anchoredOrigin(visual, opts.position, box, opts.rotation, opts.margin),
        opts.rotation,
      );
      page.drawImage(image, {
        x: at.x,
        y: at.y,
        width: box.width,
        height: box.height,
        opacity: opts.opacity,
        rotate: degrees(at.rotate),
      });
    }
  }
  return doc.save({ useObjectStreams: true });
}
```

Export `watermark`, `WatermarkContent` and `WatermarkOptions` from the edit index.

Run: `pnpm test src/pdf/edit/markup` → Expected: PASS.

- [ ] **Step 3: Store and manifest**

- `store.ts`, `useWatermarkSettings`, `toolId: 'pdf-watermark'`. Initial settings: `{ mode: 'text' as 'text' | 'image', text: 'CONFIDENTIAL', fontSize: 48, color: '#9ca3af', widthPercent: 40, opacityPercent: 30, rotation: 45, position: 'center' as Anchor }`. Add one setter per field: `setMode`, `setText`, `setFontSize`, `setColor`, `setWidthPercent`, `setOpacityPercent`, `setRotation`, `setPosition`. Image bytes are not persisted.
- `index.ts`: id `pdf-watermark`, name `Watermark PDF`, description `Add a text or image watermark to PDF pages`, icon `Droplets`.

- [ ] **Step 4: Tool** — `src/tools/pdf-watermark/Tool.tsx`. Spec:

- **State:**
  - `file: LoadedFile | null`
  - `image: LoadedFile | null` (PNG/JPEG)
  - `pageMode: 'all' | 'ranges'`
  - `rangeText`
  - the settings store
- **Derived:**
  - `content`: built from the store (text mode), or from `image` (image mode; `null` when no image yet). For text: `{ kind: 'text', text, fontSize, color }`. For image: `{ kind: 'image', bytes: image.bytes, format: image.kind as 'png' | 'jpeg', widthFraction: widthPercent / 100 }`.
  - `options` (omitting `pages`): `{ content, opacity: opacityPercent / 100, rotation, position, margin: 24 }`.
  - `previewKey = JSON.stringify({ ...options, content: content?.kind === 'image' ? image!.id : content })`
  - `const preview = usePreviewBytes(file?.bytes ?? null, 0, previewKey, (page) => (content ? watermark(page, { ...options, content, pages: [0] }) : Promise.resolve(page)))`
- **Layout:** two columns on `md`: controls on the left, `PdfPagePreview` on the right. The preview has `width={260}`, `label="Watermark preview"`, `caption="Preview on page 1"`, and passes `pending`/`error` from `preview`.
- **Controls** (labels exact):
  - `Label` "Watermark type" + `Tabs` with `TabsTrigger` "Text" / "Image".
  - Text mode:
    - `Label htmlFor="wm-text"` "Watermark text" + `Input`.
    - `Label htmlFor="wm-size"` "Font size" + `NumberInput` (6–400).
    - `Label htmlFor="wm-color"` "Colour" + `Input type="color"`.
  - Image mode:
    - `PdfDropzone accept={['png', 'jpeg']} label="Drop a PNG or JPEG for the watermark"`. Once chosen, show the image name and a ghost `Button` "Remove image".
    - `Label htmlFor="wm-width"` "Image width (% of page)" + `Slider` 5–100.
  - `Label htmlFor="wm-opacity"` "Opacity" + `Slider` 5–100 step 5, with a `%` readout.
  - `Label htmlFor="wm-rotation"` "Rotation" + `Slider` −90–90 step 5, with a `°` readout.
  - `Label htmlFor="wm-position"` "Position" + `Select items={ANCHOR_OPTIONS}`.
  - `Label` "Pages" + `Tabs` ("All pages" / "Some pages"). In "Some pages", show `Input` with `aria-label="Page ranges"` and placeholder `e.g. 1-3, 5`.
- **Apply:**
  - `Button` "Add watermark" (solid). Disabled while running, or when `content === null`.
  - `job.run(file, { ...options, content, pages: selectPages(pageSelection, doc.pageCount) })`. The page count comes from `getPageCount(file.bytes)`, resolved once when the file is picked and stored next to `file`.
  - Range errors are thrown inside the job, so they show in `JobPanel`.
- **Job:** `watermark(source.bytes, opts)` → `{ name: deriveFilename(source.name, 'watermarked', 'pdf'), bytes, detail: `${opts.pages.length} pages` }`.
- Every control change calls `job.reset()`.

- [ ] **Step 5: Failing e2e** — `test/e2e/pdf-watermark.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';

test('adds a text watermark to the chosen pages with a live preview', async ({
  page,
}) => {
  await page.goto('/pdf-watermark');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByLabel('Watermark text', { exact: true }).fill('TOP SECRET');
  await expect(
    page.getByRole('img', { name: 'Watermark preview' }),
  ).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('tab', { name: 'Some pages' }).click();
  await page.getByLabel('Page ranges', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Add watermark' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.watermarked.pdf');
  const texts = await pdfPageTexts(readFileSync((await download.path())!));
  expect(texts[0]).not.toContain('TOP SECRET');
  expect(texts[1]).toContain('TOP SECRET');
});

test('adds an image watermark', async ({ page }) => {
  await page.goto('/pdf-watermark');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByRole('tab', { name: 'Image' }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/photo.png');
  await expect(page.getByText('photo.png', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add watermark' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const doc = await PDFDocument.load(
    readFileSync((await (await downloadPromise).path())!),
  );
  for (const p of doc.getPages()) {
    expect(
      p.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict).keys(),
    ).toHaveLength(1);
  }
});
```

Add `'/pdf-watermark'` to `TOOL_ROUTES`. Run: `pnpm test:e2e test/e2e/pdf-watermark.spec.ts` → Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/pdf/edit src/tools/pdf-watermark test/e2e/pdf-watermark.spec.ts test/e2e/global-setup.ts
git commit -m "feat(pdf-watermark): text or image watermark with live preview

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Page Numbers (`pdf-page-numbers`)

**Files:**

- Modify: `src/pdf/edit/markup.ts`, `src/pdf/edit/markup.test.ts`, `src/pdf/edit/index.ts`
- Create: `src/tools/pdf-page-numbers/index.ts`, `Tool.tsx`, `store.ts`
- Create: `test/e2e/pdf-page-numbers.spec.ts`
- Modify: `test/e2e/global-setup.ts`

**Interfaces:**

- Consumes: Task 6 and Task 7 helpers.
- Produces:
  - `type PageNumberFormat = 'n' | 'n-of-total' | 'page-n'`
  - `PAGE_NUMBER_FORMATS: Record<PageNumberFormat, string>`, which is `{ n: '{n}', 'n-of-total': '{n} / {total}', 'page-n': 'Page {n}' }`
  - `formatPageNumber(format: PageNumberFormat, n: number, total: number): string`
  - `interface PageNumberOptions { format: PageNumberFormat; position: EdgeAnchor; startAt: number; pages: number[]; fontSize: number; margin: number; total?: number }`
    - Selected pages are numbered consecutively in document order, from `startAt`.
    - `total` defaults to `startAt + pages.length − 1`, i.e. the last number. Previews pass it explicitly.
  - `pageNumbers(bytes: Uint8Array, opts: PageNumberOptions): Promise<Uint8Array>`

- [ ] **Step 1: Failing tests.** Append to `markup.test.ts`:

```ts
import {
  formatPageNumber,
  pageNumbers,
  type PageNumberOptions,
} from './markup';

const numbers = (over: Partial<PageNumberOptions> = {}): PageNumberOptions => ({
  format: 'n',
  position: 'bottom-center',
  startAt: 1,
  pages: [0, 1, 2],
  fontSize: 11,
  margin: 28,
  ...over,
});

describe('page numbers', () => {
  it('formats', () => {
    expect(formatPageNumber('n', 3, 9)).toBe('3');
    expect(formatPageNumber('n-of-total', 3, 9)).toBe('3 / 9');
    expect(formatPageNumber('page-n', 3, 9)).toBe('Page 3');
  });
  it('numbers selected pages consecutively from startAt, total = last number', async () => {
    const out = await pageNumbers(
      await makeTextPdf({ pages: 3 }),
      numbers({ format: 'n-of-total', pages: [1, 2], startAt: 1 }),
    );
    // Join items: pdf.js may split a run at spaces.
    const line = async (i: number) =>
      (await textPositions(out, i)).map((t) => t.str).join(' ');
    expect(await line(0)).not.toContain('/');
    expect(await line(1)).toContain('1 / 2');
    expect(await line(2)).toContain('2 / 2');
  });
  it('honours an explicit total (used by previews)', async () => {
    const out = await pageNumbers(
      await makeTextPdf({ pages: 1 }),
      numbers({ format: 'n-of-total', pages: [0], startAt: 4, total: 9 }),
    );
    expect((await textPositions(out, 0)).map((t) => t.str).join(' ')).toContain(
      '4 / 9',
    );
  });
  it('lands bottom-centre and upright on rotated and cropped pages', async () => {
    const out = await pageNumbers(
      await makeRotatedPdf(),
      numbers({ format: 'page-n' }),
    );
    for (const i of [0, 1, 2]) {
      const label = (await textPositions(out, i)).find((t) =>
        t.str.startsWith('Page'),
      )!;
      expect(label.upright).toBe(true);
      expect(Math.abs(label.x + 16 - label.viewport.width / 2)).toBeLessThan(6); // "Page n" at 11pt ≈ 32pt wide
      expect(label.y).toBeCloseTo(label.viewport.height - 28, 0);
    }
  });
  it('validates startAt and font size', async () => {
    const pdf = await makeTextPdf({ pages: 1 });
    await expect(
      pageNumbers(pdf, numbers({ startAt: -1, pages: [0] })),
    ).rejects.toThrow('Start number must be a whole number of 0 or more');
    await expect(
      pageNumbers(pdf, numbers({ fontSize: 2, pages: [0] })),
    ).rejects.toThrow('Font size must be between 6 and 72');
  });
});
```

Run: `pnpm test src/pdf/edit/markup` → Expected: FAIL.

- [ ] **Step 2: Implement.** Append to `markup.ts` (add `EdgeAnchor` to the geometry import):

```ts
export type PageNumberFormat = 'n' | 'n-of-total' | 'page-n';
export const PAGE_NUMBER_FORMATS: Record<PageNumberFormat, string> = {
  n: '{n}',
  'n-of-total': '{n} / {total}',
  'page-n': 'Page {n}',
};

export function formatPageNumber(
  format: PageNumberFormat,
  n: number,
  total: number,
): string {
  return PAGE_NUMBER_FORMATS[format]
    .replace('{n}', String(n))
    .replace('{total}', String(total));
}

export interface PageNumberOptions {
  format: PageNumberFormat;
  position: EdgeAnchor;
  startAt: number;
  pages: number[];
  fontSize: number;
  margin: number;
  /** Defaults to the last number drawn (startAt + pages − 1). */
  total?: number;
}

export async function pageNumbers(
  bytes: Uint8Array,
  opts: PageNumberOptions,
): Promise<Uint8Array> {
  if (!Number.isInteger(opts.startAt) || opts.startAt < 0)
    throw invalid('Start number must be a whole number of 0 or more');
  if (!(opts.fontSize >= 6 && opts.fontSize <= 72))
    throw invalid('Font size must be between 6 and 72');
  const doc = await loadPdf(bytes);
  assertIndices(opts.pages, doc.getPageCount());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = [...new Set(opts.pages)].sort((a, b) => a - b);
  const total = opts.total ?? opts.startAt + pages.length - 1;
  pages.forEach((pageIndex, k) => {
    const label = formatPageNumber(opts.format, opts.startAt + k, total);
    const page = doc.getPage(pageIndex);
    const frame = pageFrame(page);
    const box = {
      width: font.widthOfTextAtSize(label, opts.fontSize),
      height: font.heightAtSize(opts.fontSize, { descender: false }),
    };
    const at = toPdfPlacement(
      frame,
      anchoredOrigin(visualSize(frame), opts.position, box, 0, opts.margin),
      0,
    );
    page.drawText(label, {
      x: at.x,
      y: at.y,
      size: opts.fontSize,
      font,
      color: rgb(0, 0, 0),
      rotate: degrees(at.rotate),
    });
  });
  return doc.save({ useObjectStreams: true });
}
```

Export from the edit index. Run: `pnpm test src/pdf/edit/markup` → Expected: PASS.

- [ ] **Step 3: Store, manifest, Tool**

- `store.ts`, `usePageNumberSettings`. Initial settings: `{ format: 'n' as PageNumberFormat, position: 'bottom-center' as EdgeAnchor, startAt: 1, fontSize: 11 }`, with setters for each.
- `index.ts`: id `pdf-page-numbers`, name `Add Page Numbers`, description `Number the pages of a PDF in your chosen style and position`, icon `ListOrdered`.
- `Tool.tsx` spec:
  - Same layout as the watermark tool.
  - Controls:
    - `Label htmlFor="pn-format"` "Format" + `Select`, items `[{ value: 'n', label: '1, 2, 3' }, { value: 'n-of-total', label: '1 / 10' }, { value: 'page-n', label: 'Page 1' }]`.
    - `Label htmlFor="pn-position"` "Position" + `Select items={EDGE_ANCHOR_OPTIONS}`.
    - `Label htmlFor="pn-start"` "Start at" + `NumberInput` (0–9999).
    - `Label htmlFor="pn-size"` "Font size" + `NumberInput` (6–72).
    - "Pages" tabs with `aria-label="Page ranges"`, as in the watermark tool.
  - Selection: `selectPages(...)` runs in a `useMemo` with try/catch. On error, render `Alert status="danger"` with the message and disable the button.
  - Preview: on the first selected page, `usePreviewBytes(file.bytes, selected[0] ?? 0, key, (p) => pageNumbers(p, { ...opts, pages: [0], total: startAt + selected.length - 1 }))`. Caption `Preview on page ${selected[0] + 1}`. Label "Page number preview".
  - `Button` "Add page numbers". Output name: `deriveFilename(name, 'numbered', 'pdf')`.

- [ ] **Step 4: Failing e2e** — `test/e2e/pdf-page-numbers.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { textPositions } from '../fixtures/builders';

test('numbers the selected pages as "n / total"', async ({ page }) => {
  await page.goto('/pdf-page-numbers');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByLabel('Format', { exact: true }).selectOption('n-of-total');
  await page.getByRole('tab', { name: 'Some pages' }).click();
  await page.getByLabel('Page ranges', { exact: true }).fill('2-3');
  await expect(page.getByText('Preview on page 2')).toBeVisible();
  await page.getByRole('button', { name: 'Add page numbers' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('text-3.numbered.pdf');
  const bytes = readFileSync((await download.path())!);
  const line = async (i: number) =>
    (await textPositions(bytes, i)).map((t) => t.str).join(' ');
  expect(await line(0)).toBe('Alpha 1');
  expect(await line(1)).toContain('1 / 2');
  expect(await line(2)).toContain('2 / 2');
});
```

Add `'/pdf-page-numbers'` to `TOOL_ROUTES`. Run the spec → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/pdf/edit src/tools/pdf-page-numbers test/e2e/pdf-page-numbers.spec.ts test/e2e/global-setup.ts
git commit -m "feat(pdf-page-numbers): numbered pages in three formats, rotation-aware

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Signature sources — draw, upload, type

**Files:**

- Modify: `package.json` (add `@fontsource/dancing-script@^5.3.0`, `@fontsource/great-vibes@^5.3.0`, `@fontsource/caveat@^5.3.0`)
- Create: `src/tools/pdf-sign/lib/stroke.ts`, `lib/stroke.test.ts`, `lib/pixels.ts`, `lib/pixels.test.ts`, `lib/fonts.ts`, `lib/signature.ts`
- Create: `src/tools/pdf-sign/components/SignatureDraw.tsx`, `SignatureUpload.tsx`, `SignatureType.tsx`

**Interfaces:**

- Consumes: `PdfDropzone`, `useObjectUrl`, the kit.
- Produces:
  - `lib/stroke.ts`:
    - `interface Point { x: number; y: number }`, `type Stroke = Point[]`
    - `strokePath(points: Stroke): string` (SVG path data)
    - `addPoint(stroke: Stroke, p: Point, minDistance?: number): Stroke`
    - `strokesBounds(strokes: Stroke[], pad: number): { x: number; y: number; width: number; height: number } | null`
  - `lib/pixels.ts`:
    - `removeWhiteBackground(rgba: Uint8ClampedArray, threshold?: number): Uint8ClampedArray`
    - `opaqueBounds(rgba: Uint8ClampedArray, width: number, height: number, minAlpha?: number): { x: number; y: number; width: number; height: number } | null`
  - `lib/fonts.ts`:
    - `SIGNATURE_FONTS: readonly { id: SignatureFontId; label: string; family: string; url: string }[]`
    - `type SignatureFontId = 'dancing-script' | 'great-vibes' | 'caveat'`
    - `ensureFontFace(id): Promise<void>`
    - `fetchFontBytes(id): Promise<Uint8Array>`
    - `measureTextAspect(text: string, id: SignatureFontId): number`
  - `lib/signature.ts`: `type SignatureSource = { kind: 'image'; bytes: Uint8Array; format: 'png' | 'jpeg'; width: number; height: number } | { kind: 'text'; text: string; fontId: SignatureFontId; color: string }`
  - Components share the props `{ onChange: (source: SignatureSource | null) => void; disabled?: boolean }`.

- [ ] **Step 1: Install.**

```bash
pnpm add @fontsource/dancing-script@^5.3.0 @fontsource/great-vibes@^5.3.0 @fontsource/caveat@^5.3.0
```

Confirm the files exist: `ls node_modules/@fontsource/{dancing-script,great-vibes,caveat}/files/*-latin-400-normal.woff`.

- [ ] **Step 2: Failing tests** — `lib/stroke.test.ts` and `lib/pixels.test.ts`

```ts
// lib/stroke.test.ts
import { describe, expect, it } from 'vitest';
import { addPoint, strokePath, strokesBounds } from './stroke';

describe('stroke', () => {
  it('draws a dot, a line, and quadratic curves through midpoints', () => {
    expect(strokePath([{ x: 1, y: 2 }])).toBe('M1 2L1.01 2');
    expect(
      strokePath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toBe('M0 0L10 0');
    expect(
      strokePath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
      ]),
    ).toBe('M0 0Q10 10 15 5L20 0');
    expect(strokePath([])).toBe('');
  });
  it('drops jittery samples closer than minDistance', () => {
    const s = addPoint(addPoint([], { x: 0, y: 0 }), { x: 0.5, y: 0.5 });
    expect(s).toEqual([{ x: 0, y: 0 }]);
    expect(addPoint(s, { x: 3, y: 0 })).toHaveLength(2);
  });
  it('bounds all strokes with padding', () => {
    expect(
      strokesBounds(
        [
          [
            { x: 10, y: 20 },
            { x: 30, y: 25 },
          ],
          [{ x: 5, y: 40 }],
        ],
        2,
      ),
    ).toEqual({ x: 3, y: 18, width: 29, height: 24 });
    expect(strokesBounds([], 2)).toBeNull();
  });
});
```

```ts
// lib/pixels.test.ts
import { describe, expect, it } from 'vitest';
import { opaqueBounds, removeWhiteBackground } from './pixels';

const px = (...rgba: number[]) => Uint8ClampedArray.from(rgba);

describe('pixels', () => {
  it('makes near-white transparent, fades the edge, keeps ink', () => {
    const out = removeWhiteBackground(
      px(255, 255, 255, 255, 220, 230, 240, 255, 20, 20, 30, 255),
    );
    expect(out[3]).toBe(0);
    expect(out[7]).toBe(Math.round((255 * (235 - 220)) / 24));
    expect(out[11]).toBe(255);
  });
  it('finds the bounding box of visible pixels', () => {
    const w = 4,
      h = 3;
    const rgba = new Uint8ClampedArray(w * h * 4);
    rgba[(1 * w + 2) * 4 + 3] = 255;
    rgba[(2 * w + 1) * 4 + 3] = 255;
    expect(opaqueBounds(rgba, w, h)).toEqual({
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    });
    expect(opaqueBounds(new Uint8ClampedArray(16), 2, 2)).toBeNull();
  });
});
```

Run: `pnpm test src/tools/pdf-sign` → Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/stroke.ts`:

```ts
export interface Point {
  x: number;
  y: number;
}
export type Stroke = Point[];

const f = (n: number) => Math.round(n * 100) / 100;

/** Smooth path: quadratic curves through midpoints, ending at the last sample. */
export function strokePath(points: Stroke): string {
  if (points.length === 0) return '';
  const [p0] = points;
  if (points.length === 1)
    return `M${f(p0.x)} ${f(p0.y)}L${f(p0.x + 0.01)} ${f(p0.y)}`;
  if (points.length === 2)
    return `M${f(p0.x)} ${f(p0.y)}L${f(points[1].x)} ${f(points[1].y)}`;
  let d = `M${f(p0.x)} ${f(p0.y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const n = points[i + 1];
    d += `Q${f(p.x)} ${f(p.y)} ${f((p.x + n.x) / 2)} ${f((p.y + n.y) / 2)}`;
  }
  const last = points[points.length - 1];
  return `${d}L${f(last.x)} ${f(last.y)}`;
}

export function addPoint(stroke: Stroke, p: Point, minDistance = 1.5): Stroke {
  const last = stroke[stroke.length - 1];
  if (last && Math.hypot(p.x - last.x, p.y - last.y) < minDistance)
    return stroke;
  return [...stroke, p];
}

export function strokesBounds(strokes: Stroke[], pad: number) {
  const pts = strokes.flat();
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return {
    x,
    y,
    width: Math.max(...xs) + pad - x,
    height: Math.max(...ys) + pad - y,
  };
}
```

`lib/pixels.ts`:

```ts
/** Near-white → transparent; a 24-level ramp below `threshold` avoids halos. */
export function removeWhiteBackground(
  rgba: Uint8ClampedArray,
  threshold = 235,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  const ramp = 24;
  for (let i = 0; i < out.length; i += 4) {
    const m = Math.min(out[i], out[i + 1], out[i + 2]);
    if (m >= threshold) out[i + 3] = 0;
    else if (m > threshold - ramp)
      out[i + 3] = Math.round((out[i + 3] * (threshold - m)) / ramp);
  }
  return out;
}

export function opaqueBounds(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  minAlpha = 8,
) {
  let x0 = width,
    y0 = height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] < minAlpha) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0
    ? null
    : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}
```

Run: `pnpm test src/tools/pdf-sign` → Expected: PASS.

- [ ] **Step 4: Fonts and the source type**

`lib/signature.ts`:

```ts
import type { SignatureFontId } from './fonts';

export type SignatureSource =
  | {
      kind: 'image';
      bytes: Uint8Array;
      format: 'png' | 'jpeg';
      width: number;
      height: number;
    }
  | { kind: 'text'; text: string; fontId: SignatureFontId; color: string };
```

`lib/fonts.ts`:

```ts
import dancingScript from '@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff?url';
import greatVibes from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url';
import caveat from '@fontsource/caveat/files/caveat-latin-400-normal.woff?url';
import { ToolError } from '@/shared/lib/errors';

export type SignatureFontId = 'dancing-script' | 'great-vibes' | 'caveat';

/** OFL-1.1 script fonts, served from our own origin. */
export const SIGNATURE_FONTS: readonly {
  id: SignatureFontId;
  label: string;
  family: string;
  url: string;
}[] = [
  {
    id: 'dancing-script',
    label: 'Dancing Script',
    family: 'Sign Dancing Script',
    url: dancingScript,
  },
  {
    id: 'great-vibes',
    label: 'Great Vibes',
    family: 'Sign Great Vibes',
    url: greatVibes,
  },
  { id: 'caveat', label: 'Caveat', family: 'Sign Caveat', url: caveat },
];

export const fontById = (id: SignatureFontId) =>
  SIGNATURE_FONTS.find((f) => f.id === id)!;

const faces = new Map<SignatureFontId, Promise<void>>();

/** Loads the font for on-screen previews (once per font). */
export function ensureFontFace(id: SignatureFontId): Promise<void> {
  let p = faces.get(id);
  if (!p) {
    const f = fontById(id);
    p = new FontFace(f.family, `url(${f.url})`).load().then((face) => {
      document.fonts.add(face);
    });
    p.catch(() => faces.delete(id));
    faces.set(id, p);
  }
  return p;
}

/** The same font file, for embedding with fontkit. */
export async function fetchFontBytes(id: SignatureFontId): Promise<Uint8Array> {
  const res = await fetch(fontById(id).url);
  if (!res.ok)
    throw new ToolError('UNKNOWN', 'Could not load the signature font');
  return new Uint8Array(await res.arrayBuffer());
}

/** Width ÷ height of `text` set in the font (call after ensureFontFace). */
export function measureTextAspect(text: string, id: SignatureFontId): number {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return 3;
  ctx.font = `100px "${fontById(id).family}"`;
  return Math.max(0.5, ctx.measureText(text).width / 125);
}
```

- [ ] **Step 5: Components.** These are covered by Task 11's e2e; jsdom has no canvas.

`SignatureDraw.tsx`:

- Renders a `<canvas>` with `aria-label="Draw your signature"`. Classes: `h-44 w-full touch-none rounded-md border border-line bg-white`.
- Sizing: `canvas.width = clientWidth * dpr`, height likewise, set in a `ResizeObserver` callback that also redraws.
- Pointer handling:
  - `onPointerDown`: only `e.button === 0` or non-mouse pointers. Call `e.currentTarget.setPointerCapture(e.pointerId)` and start a new stroke at the CSS-px point relative to the canvas.
  - `onPointerMove` (while drawing): `addPoint`.
  - `onPointerUp` / `onPointerCancel`: finish the stroke.
- Strokes are kept in `useState<Stroke[]>`. An effect redraws all of them on every change: clear, then `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, `lineWidth 2.5`, `lineCap/lineJoin 'round'`, `strokeStyle = ink`, and `ctx.stroke(new Path2D(strokePath(s)))` for each stroke.
- `Label htmlFor="sig-ink"` "Ink colour" + `Select` (`#111827` "Black", `#1e3a8a` "Blue").
- Buttons:
  - `Undo stroke`: removes the last stroke; disabled when there are none.
  - `Clear`: removes all strokes.
- Export after every finished stroke and after undo/clear:
  - `strokesBounds(strokes, 6)`; `null` → `onChange(null)`.
  - Otherwise render the strokes at 3× onto an `OffscreenCanvas(bounds.width * 3, bounds.height * 3)`, translated by `-bounds.x, -bounds.y`. `convertToBlob({ type: 'image/png' })`, then `onChange({ kind: 'image', bytes, format: 'png', width, height })`.
  - Guard with a run counter, so a stale export never overwrites a newer one.

`SignatureUpload.tsx`:

- `PdfDropzone accept={['png', 'jpeg']} label="Drop a PNG or JPEG of your signature"`.
- `Label htmlFor="sig-remove-bg"` "Remove white background" + `Switch id="sig-remove-bg"`.
- On a file or a toggle change:
  - If removal is on: `createImageBitmap(blob)`, draw it on an `OffscreenCanvas`, `getImageData`, `removeWhiteBackground`, then crop to `opaqueBounds` (`null` → `onChange(null)` and the inline error "The image is blank after removing the background"). `putImageData` onto a canvas of the cropped size and `convertToBlob('image/png')` → `{ kind: 'image', format: 'png', … }`.
  - If removal is off: pass the original bytes with `format` from `file.kind`, plus width/height from `createImageBitmap`.
- Preview: `<img alt="Signature preview">` using `useObjectUrl`.

`SignatureType.tsx`:

- `Label htmlFor="sig-name"` "Your name" + `Input`.
- `Label htmlFor="sig-font"` "Font" + `Select` built from `SIGNATURE_FONTS`.
- `Label htmlFor="sig-type-ink"` "Ink colour" + the same `Select` as Draw.
- Preview: a `<p aria-label="Typed signature preview">` with `style={{ fontFamily: `"${family}"`, color }}` and class `text-4xl`. Call `ensureFontFace(fontId)` in an effect when the font changes.
- `onChange(trimmed ? { kind: 'text', text: trimmed, fontId, color } : null)`.

- [ ] **Step 6: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add package.json pnpm-lock.yaml src/tools/pdf-sign
git commit -m "feat(pdf-sign): draw, upload and type signature sources

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`pdf-sign` has no `index.ts` yet, so the registry does not pick it up until Task 11.)

---

### Task 10: `stamp` operation (image or embedded-font text)

**Files:**

- Modify: `package.json` (`@pdf-lib/fontkit@^1.1.1`)
- Create: `src/pdf/edit/stamp.ts`, `src/pdf/edit/stamp.test.ts`
- Modify: `src/pdf/edit/index.ts`

**Interfaces:**

- Consumes: Task 6 geometry and font checks; `hexToRgb`; `loadPdf`; `assertIndices`.
- Produces (from `@/pdf/edit`):
  - `interface VisualRect { x: number; y: number; width: number; height: number }`. In points, relative to the page as displayed, with the origin at the top-left and y down. This matches the on-screen preview.
  - `type StampContent = { kind: 'image'; bytes: Uint8Array; format: 'png' | 'jpeg' } | { kind: 'text'; text: string; fontBytes: Uint8Array; color: string }`
  - `interface StampOptions { pageIndex: number; rect: VisualRect; content: StampContent }`
  - `stamp(bytes: Uint8Array, opts: StampOptions): Promise<Uint8Array>`

- [ ] **Step 1: Install.** `pnpm add @pdf-lib/fontkit@^1.1.1`

- [ ] **Step 2: Failing tests** — `src/pdf/edit/stamp.test.ts`. The first test doubles as the probe that pdf-lib + fontkit embed WOFF. If it fails with a font-parsing error, stop and report BLOCKED; do not substitute another font or rasterise.

```ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import {
  makeRotatedPdf,
  makeTextPdf,
  pdfPageTexts,
  textPositions,
} from '../../../test/fixtures/builders';
import { encodePng, noiseImage } from '../../../test/fixtures/images';
import { stamp } from './stamp';

const font = new Uint8Array(
  readFileSync(
    createRequire(import.meta.url).resolve(
      '@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff',
    ),
  ),
);
const typed = (text = 'Ada Lovelace') => ({
  kind: 'text' as const,
  text,
  fontBytes: font,
  color: '#1e3a8a',
});

describe('stamp', () => {
  it('embeds a WOFF script font (subset) and the name is extractable', async () => {
    const out = await stamp(await makeTextPdf({ pages: 2 }), {
      pageIndex: 1,
      rect: { x: 300, y: 600, width: 200, height: 60 },
      content: typed(),
    });
    const texts = await pdfPageTexts(out);
    expect(texts[1]).toContain('Ada Lovelace');
    expect(texts[0]).not.toContain('Ada');
  });
  it('fits typed text inside its box on a /Rotate 90 page, upright', async () => {
    const rect = { x: 500, y: 450, width: 220, height: 70 };
    const out = await stamp(await makeRotatedPdf(), {
      pageIndex: 1,
      rect,
      content: typed(),
    });
    const t = (await textPositions(out, 1)).find((i) =>
      i.str.startsWith('Ada'),
    )!;
    expect(t.upright).toBe(true);
    expect(t.x).toBeGreaterThanOrEqual(rect.x - 1);
    expect(t.x).toBeLessThan(rect.x + rect.width);
    expect(t.y).toBeGreaterThan(rect.y);
    expect(t.y).toBeLessThanOrEqual(rect.y + rect.height + 1);
  });
  it('places a PNG keeping its alpha as an SMask', async () => {
    const rgba = noiseImage(30, 10, 4);
    rgba[3] = 0;
    const out = await stamp(await makeTextPdf({ pages: 1 }), {
      pageIndex: 0,
      rect: { x: 72, y: 600, width: 150, height: 50 },
      content: { kind: 'image', bytes: encodePng(30, 10, rgba), format: 'png' },
    });
    const doc = await PDFDocument.load(out);
    const xo = doc
      .getPage(0)
      .node.Resources()!
      .lookup(PDFName.of('XObject'), PDFDict);
    const img = xo.lookup(xo.keys()[0]) as PDFRawStream;
    expect(img.dict.has(PDFName.of('SMask'))).toBe(true);
  });
  it('rejects boxes outside the page, empty boxes and undrawable names', async () => {
    const pdf = await makeTextPdf({ pages: 1 });
    await expect(
      stamp(pdf, {
        pageIndex: 0,
        rect: { x: 500, y: 10, width: 200, height: 50 },
        content: typed(),
      }),
    ).rejects.toThrow('The signature must sit inside the page');
    await expect(
      stamp(pdf, {
        pageIndex: 0,
        rect: { x: 10, y: 10, width: 0, height: 50 },
        content: typed(),
      }),
    ).rejects.toThrow('The signature box is empty');
    await expect(
      stamp(pdf, {
        pageIndex: 0,
        rect: { x: 10, y: 10, width: 100, height: 50 },
        content: typed('Ада'),
      }),
    ).rejects.toThrow("Your name contains characters the font can't draw");
  });
});
```

Run: `pnpm test src/pdf/edit/stamp` → Expected: FAIL (module missing).

- [ ] **Step 3: Implement** — `src/pdf/edit/stamp.ts`

```ts
import fontkit from '@pdf-lib/fontkit';
import { degrees, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { hexToRgb } from './color';
import { assertDrawable } from './fonts';
import { pageFrame, toPdfPlacement, visualSize } from './geometry';
import { loadPdf } from './load';
import { assertIndices } from './ops';

/** Points, on the page as displayed; origin top-left, y down (like the preview). */
export interface VisualRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type StampContent =
  | { kind: 'image'; bytes: Uint8Array; format: 'png' | 'jpeg' }
  | { kind: 'text'; text: string; fontBytes: Uint8Array; color: string };

export interface StampOptions {
  pageIndex: number;
  rect: VisualRect;
  content: StampContent;
}

const invalid = (m: string) => new ToolError('INVALID_INPUT', m);

export async function stamp(
  bytes: Uint8Array,
  opts: StampOptions,
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  assertIndices([opts.pageIndex], doc.getPageCount());
  const page = doc.getPage(opts.pageIndex);
  const frame = pageFrame(page);
  const visual = visualSize(frame);
  const r = opts.rect;
  if (!(r.width > 0 && r.height > 0))
    throw invalid('The signature box is empty');
  const eps = 0.5;
  if (
    r.x < -eps ||
    r.y < -eps ||
    r.x + r.width > visual.width + eps ||
    r.y + r.height > visual.height + eps
  ) {
    throw invalid('The signature must sit inside the page');
  }
  const bottom = visual.height - r.y - r.height; // visual, y up
  const c = opts.content;
  if (c.kind === 'image') {
    let image: PDFImage;
    try {
      image =
        c.format === 'png'
          ? await doc.embedPng(c.bytes)
          : await doc.embedJpg(c.bytes);
    } catch (cause) {
      throw new ToolError(
        'INVALID_FILE',
        'The signature image could not be read',
        { cause },
      );
    }
    const at = toPdfPlacement(frame, { x: r.x, y: bottom }, 0);
    page.drawImage(image, {
      x: at.x,
      y: at.y,
      width: r.width,
      height: r.height,
      rotate: degrees(at.rotate),
    });
  } else {
    const text = c.text.trim();
    if (!text) throw invalid('Type your name');
    doc.registerFontkit(fontkit);
    let font: PDFFont;
    try {
      font = await doc.embedFont(c.fontBytes, { subset: true });
    } catch (cause) {
      throw new ToolError(
        'INVALID_FILE',
        'The signature font could not be embedded',
        { cause },
      );
    }
    assertDrawable(font, text, 'Your name');
    const unitW = font.widthOfTextAtSize(text, 1);
    const unitH = font.heightAtSize(1); // ascender to descender
    const size = Math.min(r.width / unitW, r.height / unitH);
    const w = unitW * size;
    const h = unitH * size;
    const descent = h - font.heightAtSize(size, { descender: false });
    const at = toPdfPlacement(
      frame,
      { x: r.x + (r.width - w) / 2, y: bottom + (r.height - h) / 2 + descent },
      0,
    );
    const color = hexToRgb(c.color);
    page.drawText(text, {
      x: at.x,
      y: at.y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
      rotate: degrees(at.rotate),
    });
  }
  return doc.save({ useObjectStreams: true });
}
```

Export `stamp`, `VisualRect`, `StampContent` and `StampOptions` from the edit index.

Run: `pnpm test src/pdf/edit/stamp` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm test
git add package.json pnpm-lock.yaml src/pdf/edit/stamp.ts src/pdf/edit/stamp.test.ts src/pdf/edit/index.ts
git commit -m "feat(pdf-edit): stamp an image or embedded-font text into a visual box

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Sign / Stamp tool (`pdf-sign`)

**Files:**

- Create: `src/tools/pdf-sign/lib/placement.ts`, `lib/placement.test.ts`, `components/PlacementEditor.tsx`, `Tool.tsx`, `index.ts`
- Modify: `test/fixtures/builders.ts` is not needed. `scripts/gen-fixtures.ts` gains `signature.jpg`.
- Create: `test/e2e/pdf-sign.spec.ts`
- Modify: `test/e2e/global-setup.ts`

**Interfaces:**

- Consumes: Task 9 (sources, fonts), Task 10 (`stamp`, `VisualRect`), `usePdfDocument`, `PageThumb`; `useDraggable` and `useResizable` from `@arshad-shah/detent-react`.
- Produces:
  - `lib/placement.ts`:
    - `MIN_SIZE_PT = 12`
    - `defaultRect(page: PageInfo, aspect: number): VisualRect`
    - `clampRect(r: VisualRect, page: PageInfo): VisualRect`
    - `moveRect(r, dx, dy, page): VisualRect`
    - `scaleRect(r, factor, page): VisualRect`
    - `rectToPixels(r, scale): { left: number; top: number; width: number; height: number }`
    - `rectFromPixels(px, scale, page): VisualRect`
  - `PlacementEditor` props: `{ doc: DocInfo; pageIndex: number; rect: VisualRect; onRectChange: (r: VisualRect) => void; preview: React.ReactNode; width: number; disabled?: boolean }`

- [ ] **Step 1: Failing test** — `lib/placement.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  clampRect,
  defaultRect,
  moveRect,
  rectFromPixels,
  rectToPixels,
  scaleRect,
} from './placement';

const page = { width: 612, height: 792 };

describe('placement', () => {
  it('starts bottom-right, 30% of the page wide (≤ 220pt), keeping the aspect', () => {
    expect(defaultRect(page, 4)).toEqual({
      x: 612 - 36 - 183.6,
      y: 792 - 36 - 45.9,
      width: 183.6,
      height: 45.9,
    });
  });
  it('clamps inside the page, shrinking uniformly when too big', () => {
    expect(clampRect({ x: -10, y: 780, width: 100, height: 50 }, page)).toEqual(
      { x: 0, y: 742, width: 100, height: 50 },
    );
    const big = clampRect({ x: 0, y: 0, width: 1224, height: 100 }, page);
    expect(big.width).toBe(612);
    expect(big.height).toBe(50);
  });
  it('moves and scales around the centre, staying inside', () => {
    const r = { x: 100, y: 100, width: 100, height: 50 };
    expect(moveRect(r, -200, 0, page).x).toBe(0);
    expect(scaleRect(r, 1.1, page)).toEqual({
      x: 95,
      y: 97.5,
      width: 110,
      height: 55,
    });
  });
  it('converts between preview pixels and points', () => {
    const r = { x: 100, y: 200, width: 50, height: 20 };
    expect(rectToPixels(r, 0.5)).toEqual({
      left: 50,
      top: 100,
      width: 25,
      height: 10,
    });
    expect(
      rectFromPixels({ left: 50, top: 100, width: 25, height: 10 }, 0.5, page),
    ).toEqual(r);
  });
});
```

Run: `pnpm test src/tools/pdf-sign` → Expected: FAIL.

- [ ] **Step 2: Implement** — `lib/placement.ts`

```ts
import type { VisualRect } from '@/pdf/edit';
import type { PageInfo } from '@/pdf/render';

export const MIN_SIZE_PT = 12;
const MARGIN = 36;

export function clampRect(r: VisualRect, page: PageInfo): VisualRect {
  const s = Math.min(1, page.width / r.width, page.height / r.height);
  const width = Math.max(MIN_SIZE_PT, r.width * s);
  const height = Math.max(MIN_SIZE_PT, r.height * s);
  return {
    width,
    height,
    x: Math.min(Math.max(r.x, 0), page.width - width),
    y: Math.min(Math.max(r.y, 0), page.height - height),
  };
}

export function defaultRect(page: PageInfo, aspect: number): VisualRect {
  const width = Math.min(page.width * 0.3, 220);
  const height = width / aspect;
  return clampRect(
    {
      x: page.width - MARGIN - width,
      y: page.height - MARGIN - height,
      width,
      height,
    },
    page,
  );
}

export const moveRect = (
  r: VisualRect,
  dx: number,
  dy: number,
  page: PageInfo,
) => clampRect({ ...r, x: r.x + dx, y: r.y + dy }, page);

export function scaleRect(
  r: VisualRect,
  factor: number,
  page: PageInfo,
): VisualRect {
  const width = r.width * factor;
  const height = r.height * factor;
  return clampRect(
    {
      x: r.x - (width - r.width) / 2,
      y: r.y - (height - r.height) / 2,
      width,
      height,
    },
    page,
  );
}

export const rectToPixels = (r: VisualRect, scale: number) => ({
  left: r.x * scale,
  top: r.y * scale,
  width: r.width * scale,
  height: r.height * scale,
});

export const rectFromPixels = (
  px: { left: number; top: number; width: number; height: number },
  scale: number,
  page: PageInfo,
) =>
  clampRect(
    {
      x: px.left / scale,
      y: px.top / scale,
      width: px.width / scale,
      height: px.height / scale,
    },
    page,
  );
```

Run: `pnpm test src/tools/pdf-sign` → Expected: PASS.

- [ ] **Step 3: `PlacementEditor`** — `components/PlacementEditor.tsx`. Spec:

- `scale = width / page.width`, where `page = doc.pages[pageIndex]`, which is the visual size in points (pdf.js applies `/Rotate`).
- Container: `<div ref={frameRef} className="relative inline-block" data-testid="placement-frame">` holding `<PageThumb docId pageIndex page width label={`Page ${pageIndex + 1}`} />` and the overlay box.
- React owns the geometry; detent handles only the in-progress gesture. The box renders with `style={rectToPixels(rect, scale)}` (absolute `left`/`top`/`width`/`height`) and `key={revision}`, where `revision` is local state.
- On each gesture end, measure, call `onRectChange`, and bump `revision`. The remount gives the box fresh detent state, so detent's leftover `translate3d`/size never doubles up with React's `left`/`top`.

```tsx
const [revision, setRevision] = useState(0);
const commit = (el: HTMLElement) => {
  const f = frameRef.current!.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  onRectChange(
    rectFromPixels(
      {
        left: b.left - f.left,
        top: b.top - f.top,
        width: b.width,
        height: b.height,
      },
      scale,
      page,
    ),
  );
  setRevision((n) => n + 1);
};
const dragRef = useDraggable({
  bounds: 'parent',
  cancel: '[data-handle]',
  disabled,
  onEnd: (e, cancelled) => {
    if (!cancelled) commit(e.element);
  },
});
const resizeRef = useResizable({
  handles: {
    nw: '[data-handle="nw"]',
    ne: '[data-handle="ne"]',
    sw: '[data-handle="sw"]',
    se: '[data-handle="se"]',
  },
  aspectRatio: true,
  minWidth: MIN_SIZE_PT * scale,
  minHeight: MIN_SIZE_PT * scale,
  bounds: 'parent',
  disabled,
  onEnd: (e, cancelled) => {
    if (!cancelled) commit(e.element);
  },
});
const boxRef = useCallback(
  (node: HTMLElement | null) => {
    dragRef(node);
    resizeRef(node);
  },
  [dragRef, resizeRef],
);
```

- Box element:
  - Attributes: `tabIndex={0}`, `role="group"`, `aria-label="Signature placement. Arrow keys move it; plus and minus resize it."`.
  - Classes: `absolute cursor-move outline-dashed outline-2 outline-accent focus-visible:ring-2`.
  - `onKeyDown`:
    - Arrow keys → `moveRect(rect, ±step, …)`, with `step = e.shiftKey ? 10 : 2` points.
    - `+`/`=` → `scaleRect(rect, 1.05)`; `-` → `scaleRect(rect, 0.95)`.
    - `preventDefault` for each handled key. Keyboard moves update via `onRectChange` only; no remount is needed, because detent has no leftover state from keyboard moves.
- Children:
  - `preview` (filling the box), plus four `<span data-handle="nw|ne|sw|se" aria-hidden className="absolute size-3 rounded-full bg-accent …" />` corner handles with matching `cursor-*-resize` classes.
- Under the frame: `<Text size="sm" tone="muted" aria-live="polite">Position: {round(rect.x)}, {round(rect.y)} pt · Size: {round(rect.width)} × {round(rect.height)} pt</Text>`.

- [ ] **Step 4: Tool** — `Tool.tsx` and `index.ts`

- `index.ts`: id `pdf-sign`, name `Sign PDF`, description `Draw, upload or type a signature and place it on a page`, icon `Signature`.
- `Tool.tsx`:
  - **State:** `file`, `source: SignatureSource | null`, `tab: 'draw' | 'upload' | 'type'`, `pageIndex`, `rect: VisualRect | null`, `aspect: number`.
  - **Source changes** (`onChange` from the active source component):
    - Image source: `aspect = width / height`.
    - Text source: `await ensureFontFace(fontId)`, then `aspect = measureTextAspect(text, fontId)`.
    - Then `setRect(defaultRect(doc.pages[pageIndex], aspect))` and `job.reset()`.
  - **Page changes:** reset `rect` to `defaultRect` for the new page.
  - **Notice:** `Alert status="info"` with `AlertTitle` "Visual signature" and `AlertDescription` "This places an image of your signature on the page. It is not a digital (certificate-based) signature and does not prove who signed."
  - **Source picker:** `Tabs` "Draw" / "Upload" / "Type" over the three components. Switching tabs sets `source` to `null`.
  - **Placement**, when `doc && source && rect`:
    - Page navigation: `IconButton label="Previous page"` / `IconButton label="Next page"` around `Text` `Page {n} of {count}`.
    - `PlacementEditor width={480}`.
    - Preview node:
      - Image: at the top level of the component (hooks never go inside JSX), call `const imageUrl = useObjectUrl(source?.kind === 'image' ? source.bytes : null, source?.kind === 'image' && source.format === 'jpeg' ? 'image/jpeg' : 'image/png')`. Render `<img src={imageUrl ?? undefined} alt="" className="size-full object-contain" />`.
      - Text: `<span style={{ fontFamily: `"${fontById(source.fontId).family}"`, color: source.color, fontSize: rectToPixels(rect, 480 / page.width).height * 0.6 }} className="flex size-full items-center justify-center whitespace-nowrap">{source.text}</span>`.
  - **Apply:** `Button` "Apply signature" (solid), disabled unless `file && source && rect`. The job:

```ts
const job = useJob(
  async (
    _ctx,
    input: LoadedFile,
    at: { pageIndex: number; rect: VisualRect },
    src: SignatureSource,
  ): Promise<ResultFile> => {
    const content: StampContent =
      src.kind === 'image'
        ? { kind: 'image', bytes: src.bytes, format: src.format }
        : {
            kind: 'text',
            text: src.text,
            fontBytes: await fetchFontBytes(src.fontId),
            color: src.color,
          };
    const bytes = await stamp(input.bytes, {
      pageIndex: at.pageIndex,
      rect: at.rect,
      content,
    });
    return {
      name: deriveFilename(input.name, 'signed', 'pdf'),
      bytes,
      detail: `Signed on page ${at.pageIndex + 1}`,
    };
  },
);
```

- [ ] **Step 5: Fixture for the upload path.** In `scripts/gen-fixtures.ts`, add `signature.jpg`: 300×100, white background, with a dark diagonal band. Build an RGBA buffer filled with 255, then set pixels where `Math.abs(y - x / 3) < 6` to `[20, 20, 40, 255]`, and pass it to `encodeJpeg(300, 100, rgba, 92)`.

- [ ] **Step 6: Failing e2e** — `test/e2e/pdf-sign.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';

async function open(page: Page) {
  await page.goto('/pdf-sign');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(page.getByText('text-3.pdf', { exact: true })).toBeVisible();
  await expect(
    page.getByText('not a digital (certificate-based) signature', {
      exact: false,
    }),
  ).toBeVisible();
}

async function download(page: Page) {
  await page.getByRole('button', { name: 'Apply signature' }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const d = await promise;
  expect(d.suggestedFilename()).toBe('text-3.signed.pdf');
  return readFileSync((await d.path())!);
}

const pageImages = (doc: PDFDocument, i: number) => {
  const res = doc.getPage(i).node.Resources()!;
  const xo = res.lookupMaybe(PDFName.of('XObject'), PDFDict);
  return xo ? xo.keys().map((k) => xo.lookup(k) as PDFRawStream) : [];
};

test('draws a signature, nudges it with the keyboard, and stamps it', async ({
  page,
}) => {
  await open(page);
  const pad = page.getByLabel('Draw your signature', { exact: true });
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 100);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++)
    await page.mouse.move(
      box.x + 30 + i * 12,
      box.y + 100 + Math.sin(i / 2) * 30,
    );
  await page.mouse.up();
  const placement = page.getByRole('group', { name: /Signature placement/ });
  await expect(placement).toBeVisible();
  const before = await page.getByText(/^Position:/).textContent();
  await placement.focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(page.getByText(/^Position:/)).not.toHaveText(before!);
  const doc = await PDFDocument.load(await download(page));
  const [img] = pageImages(doc, 0);
  expect(img.dict.has(PDFName.of('SMask'))).toBe(true); // transparent ink PNG
  expect(pageImages(doc, 1)).toHaveLength(0);
});

test('types a name in a script font on page 2', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Type' }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Ada Lovelace');
  await page.getByLabel('Font', { exact: true }).selectOption('great-vibes');
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  const texts = await pdfPageTexts(await download(page));
  expect(texts[1]).toContain('Ada Lovelace');
  expect(texts[0]).not.toContain('Ada');
});

test('uploads a JPEG and removes its white background', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Upload' }).click();
  await page.getByRole('switch', { name: 'Remove white background' }).click();
  await page
    .locator('input[type=file]')
    .last()
    .setInputFiles('test/fixtures/generated/signature.jpg');
  await expect(
    page.getByRole('img', { name: 'Signature preview' }),
  ).toBeVisible();
  const doc = await PDFDocument.load(await download(page));
  const [img] = pageImages(doc, 0);
  expect(img.dict.has(PDFName.of('SMask'))).toBe(true); // converted to PNG with alpha
});
```

Add `'/pdf-sign'` to `TOOL_ROUTES`. Run the spec → Expected: PASS. If the `Switch` has no accessible name from its `Label`, pass `aria-label="Remove white background"` as well.

- [ ] **Step 7: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/tools/pdf-sign scripts/gen-fixtures.ts test/e2e/pdf-sign.spec.ts test/e2e/global-setup.ts
git commit -m "feat(pdf-sign): place a drawn, uploaded or typed signature by drag/resize

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Form operations — `listFormFields` and `fillForm`

**Files:**

- Create: `src/pdf/edit/forms.ts`, `src/pdf/edit/forms.test.ts`
- Modify: `src/pdf/edit/index.ts`, `test/fixtures/builders.ts`, `test/fixtures/builders.test.ts`, `scripts/gen-fixtures.ts`

**Interfaces:**

- Consumes: `loadPdf`; `unsupportedChars`.
- Produces (from `@/pdf/edit`):
  - `type FormField =`
    - `| { kind: 'text'; name: string; value: string; multiline: boolean; maxLength: number | null; readOnly: boolean }`
    - `| { kind: 'checkbox'; name: string; checked: boolean; readOnly: boolean }`
    - `| { kind: 'radio'; name: string; options: string[]; selected: string | null; readOnly: boolean }`
    - `| { kind: 'dropdown'; name: string; options: string[]; selected: string[]; multiSelect: boolean; editable: boolean; readOnly: boolean }`
    - `| { kind: 'optionlist'; name: string; options: string[]; selected: string[]; multiSelect: boolean; readOnly: boolean }`
    - `| { kind: 'unsupported'; name: string; type: 'button' | 'signature' | 'unknown' }`
  - `type FormValue = string | boolean | string[]`
  - `XFA_MESSAGE: string`
  - `listFormFields(bytes: Uint8Array): Promise<FormField[]>`
  - `fillForm(bytes: Uint8Array, values: Record<string, FormValue>, opts: { flatten: boolean }): Promise<Uint8Array>`
- Fixtures:
  - `makeFormPdf(): Promise<Uint8Array>`, with fields `name`, `notes` (multiline), `zip` (max 5), `agree` (checkbox), `size` (radio S/M/L), `country` (dropdown Ireland/France/Spain), `toppings` (multi-select list Cheese/Olives/Peppers) and `ref` (read-only, "R-1").
  - `makeXfaPdf(): Promise<Uint8Array>`
  - Generated files `form.pdf` and `xfa-form.pdf`.

**Important:** `PDFDocument.getForm()` in pdf-lib 1.17 **silently deletes** XFA data (it logs "Removing XFA form data…"). Detect XFA from the catalog _before_ calling `getForm()`.

- [ ] **Step 1: Fixtures.** Append to `builders.ts` (add `PDFDict` to the pdf-lib import):

```ts
export async function makeFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  form
    .createTextField('name')
    .addToPage(page, { x: 72, y: 700, width: 240, height: 24 });
  const notes = form.createTextField('notes');
  notes.enableMultiline();
  notes.addToPage(page, { x: 72, y: 600, width: 240, height: 80 });
  const zip = form.createTextField('zip');
  zip.setMaxLength(5);
  zip.addToPage(page, { x: 72, y: 560, width: 80, height: 24 });
  form
    .createCheckBox('agree')
    .addToPage(page, { x: 72, y: 520, width: 16, height: 16 });
  const size = form.createRadioGroup('size');
  ['S', 'M', 'L'].forEach((opt, i) =>
    size.addOptionToPage(opt, page, {
      x: 72 + i * 40,
      y: 480,
      width: 16,
      height: 16,
    }),
  );
  const country = form.createDropdown('country');
  country.addOptions(['Ireland', 'France', 'Spain']);
  country.addToPage(page, { x: 72, y: 440, width: 160, height: 24 });
  const toppings = form.createOptionList('toppings');
  toppings.addOptions(['Cheese', 'Olives', 'Peppers']);
  toppings.enableMultiselect();
  toppings.addToPage(page, { x: 72, y: 340, width: 160, height: 80 });
  const ref = form.createTextField('ref');
  ref.setText('R-1');
  ref.enableReadOnly();
  ref.addToPage(page, { x: 320, y: 700, width: 120, height: 24 });
  return doc.save();
}

/** An AcroForm that also carries XFA (pdf-lib cannot fill XFA). */
export async function makeXfaPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await makeFormPdf());
  const acro = doc.catalog.lookup(PDFName.of('AcroForm'), PDFDict);
  acro.set(
    PDFName.of('XFA'),
    doc.context.register(
      doc.context.stream('<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"/>'),
    ),
  );
  return doc.save();
}
```

Add to `gen-fixtures.ts`: `'form.pdf': await makeFormPdf(), 'xfa-form.pdf': await makeXfaPdf(),`.

- [ ] **Step 2: Failing tests** — `src/pdf/edit/forms.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  makeFormPdf,
  makeTextPdf,
  makeXfaPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import { fillForm, listFormFields } from './forms';

describe('listFormFields', () => {
  it('describes every AcroForm field', async () => {
    const fields = await listFormFields(await makeFormPdf());
    expect(fields.map((f) => [f.kind, f.name])).toEqual([
      ['text', 'name'],
      ['text', 'notes'],
      ['text', 'zip'],
      ['checkbox', 'agree'],
      ['radio', 'size'],
      ['dropdown', 'country'],
      ['optionlist', 'toppings'],
      ['text', 'ref'],
    ]);
    expect(fields[1]).toMatchObject({ multiline: true });
    expect(fields[2]).toMatchObject({ maxLength: 5 });
    expect(fields[4]).toMatchObject({
      options: ['S', 'M', 'L'],
      selected: null,
    });
    expect(fields[6]).toMatchObject({ multiSelect: true, selected: [] });
    expect(fields[7]).toMatchObject({ value: 'R-1', readOnly: true });
  });
  it('returns an empty list for a PDF without a form', async () => {
    expect(await listFormFields(await makeTextPdf({ pages: 1 }))).toEqual([]);
  });
  it('rejects XFA forms as unsupported (detected before pdf-lib strips them)', async () => {
    await expect(listFormFields(await makeXfaPdf())).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
      message:
        'This PDF uses an XFA form, which is not supported. Only standard (AcroForm) forms can be filled.',
    });
  });
});

describe('fillForm', () => {
  const values = {
    name: 'Ada Lovelace',
    notes: 'Line one\nLine two',
    zip: 'D02',
    agree: true,
    size: 'M',
    country: 'France',
    toppings: ['Cheese', 'Olives'],
  };
  it('fills every field kind and keeps the form editable', async () => {
    const out = await fillForm(await makeFormPdf(), values, { flatten: false });
    const form = (await PDFDocument.load(out)).getForm();
    expect(form.getTextField('name').getText()).toBe('Ada Lovelace');
    expect(form.getTextField('notes').getText()).toBe('Line one\nLine two');
    expect(form.getCheckBox('agree').isChecked()).toBe(true);
    expect(form.getRadioGroup('size').getSelected()).toBe('M');
    expect(form.getDropdown('country').getSelected()).toEqual(['France']);
    expect(form.getOptionList('toppings').getSelected()).toEqual([
      'Cheese',
      'Olives',
    ]);
  });
  it('flattens: no fields remain and the values are page text', async () => {
    const out = await fillForm(await makeFormPdf(), values, { flatten: true });
    expect((await PDFDocument.load(out)).getForm().getFields()).toHaveLength(0);
    expect((await pdfPageTexts(out))[0]).toContain('Ada Lovelace');
  });
  it('leaves read-only fields alone', async () => {
    const out = await fillForm(
      await makeFormPdf(),
      { ref: 'changed' },
      { flatten: false },
    );
    expect(
      (await PDFDocument.load(out)).getForm().getTextField('ref').getText(),
    ).toBe('R-1');
  });
  it.each([
    [{ zip: '123456' }, '"zip": at most 5 characters'],
    [{ size: 'XL' }, '"size": "XL" is not one of the options'],
    [{ name: 'Nº №' }, `"name": the form font can't draw №`],
    [{ agree: 'yes' }, '"agree": expected checked or unchecked'],
    [{ missing: 'x' }, 'There is no form field called "missing"'],
  ])('rejects %j', async (vals, message) => {
    await expect(
      fillForm(await makeFormPdf(), vals, { flatten: false }),
    ).rejects.toThrow(message);
  });
});
```

Run: `pnpm test src/pdf/edit/forms` → Expected: FAIL.

- [ ] **Step 3: Implement** — `src/pdf/edit/forms.ts`

```ts
import {
  PDFButton,
  PDFCheckBox,
  PDFDict,
  PDFDropdown,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  StandardFonts,
  type PDFDocument,
  type PDFField,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { unsupportedChars } from './fonts';
import { loadPdf } from './load';

export type FormField =
  | {
      kind: 'text';
      name: string;
      value: string;
      multiline: boolean;
      maxLength: number | null;
      readOnly: boolean;
    }
  | { kind: 'checkbox'; name: string; checked: boolean; readOnly: boolean }
  | {
      kind: 'radio';
      name: string;
      options: string[];
      selected: string | null;
      readOnly: boolean;
    }
  | {
      kind: 'dropdown';
      name: string;
      options: string[];
      selected: string[];
      multiSelect: boolean;
      editable: boolean;
      readOnly: boolean;
    }
  | {
      kind: 'optionlist';
      name: string;
      options: string[];
      selected: string[];
      multiSelect: boolean;
      readOnly: boolean;
    }
  | {
      kind: 'unsupported';
      name: string;
      type: 'button' | 'signature' | 'unknown';
    };

export type FormValue = string | boolean | string[];

export const XFA_MESSAGE =
  'This PDF uses an XFA form, which is not supported. Only standard (AcroForm) forms can be filled.';

/** Must run before doc.getForm(): pdf-lib deletes XFA data when it builds the form. */
function hasXfa(doc: PDFDocument): boolean {
  return (
    doc.catalog
      .lookupMaybe(PDFName.of('AcroForm'), PDFDict)
      ?.has(PDFName.of('XFA')) ?? false
  );
}

async function loadForm(bytes: Uint8Array) {
  const doc = await loadPdf(bytes);
  if (hasXfa(doc)) throw new ToolError('UNSUPPORTED_FEATURE', XFA_MESSAGE);
  return { doc, form: doc.getForm() };
}

function describe(field: PDFField): FormField {
  const name = field.getName();
  const readOnly = field.isReadOnly();
  if (field instanceof PDFTextField)
    return {
      kind: 'text',
      name,
      value: field.getText() ?? '',
      multiline: field.isMultiline(),
      maxLength: field.getMaxLength() ?? null,
      readOnly,
    };
  if (field instanceof PDFCheckBox)
    return { kind: 'checkbox', name, checked: field.isChecked(), readOnly };
  if (field instanceof PDFRadioGroup)
    return {
      kind: 'radio',
      name,
      options: field.getOptions(),
      selected: field.getSelected() ?? null,
      readOnly,
    };
  if (field instanceof PDFDropdown)
    return {
      kind: 'dropdown',
      name,
      options: field.getOptions(),
      selected: field.getSelected(),
      multiSelect: field.isMultiselect(),
      editable: field.isEditable(),
      readOnly,
    };
  if (field instanceof PDFOptionList)
    return {
      kind: 'optionlist',
      name,
      options: field.getOptions(),
      selected: field.getSelected(),
      multiSelect: field.isMultiselect(),
      readOnly,
    };
  return {
    kind: 'unsupported',
    name,
    type:
      field instanceof PDFButton
        ? 'button'
        : field instanceof PDFSignature
          ? 'signature'
          : 'unknown',
  };
}

export async function listFormFields(bytes: Uint8Array): Promise<FormField[]> {
  const { form } = await loadForm(bytes);
  return form.getFields().map(describe);
}

export async function fillForm(
  bytes: Uint8Array,
  values: Record<string, FormValue>,
  { flatten }: { flatten: boolean },
): Promise<Uint8Array> {
  const { doc, form } = await loadForm(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const byName = new Map(form.getFields().map((f) => [f.getName(), f]));
  for (const [name, value] of Object.entries(values)) {
    const field = byName.get(name);
    if (!field)
      throw new ToolError(
        'INVALID_INPUT',
        `There is no form field called "${name}"`,
      );
    if (field.isReadOnly()) continue;
    const fail = (m: string) =>
      new ToolError('INVALID_INPUT', `"${name}": ${m}`);
    const checkChars = (s: string) => {
      const bad = unsupportedChars(font, s.replace(/[\r\n]/g, ''));
      if (bad.length) throw fail(`the form font can't draw ${bad.join(' ')}`);
    };
    const asList = (v: FormValue): string[] => {
      if (typeof v === 'string') return v ? [v] : [];
      if (Array.isArray(v)) return v;
      throw fail('expected a choice');
    };
    if (field instanceof PDFTextField) {
      if (typeof value !== 'string') throw fail('expected text');
      const max = field.getMaxLength();
      if (max !== undefined && value.length > max)
        throw fail(`at most ${max} characters`);
      checkChars(value);
      field.setText(value || undefined);
    } else if (field instanceof PDFCheckBox) {
      if (typeof value !== 'boolean')
        throw fail('expected checked or unchecked');
      if (value) field.check();
      else field.uncheck();
    } else if (field instanceof PDFRadioGroup) {
      if (typeof value !== 'string') throw fail('expected one option');
      if (!value) field.clear();
      else if (!field.getOptions().includes(value))
        throw fail(`"${value}" is not one of the options`);
      else field.select(value);
    } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      const list = asList(value);
      const editable = field instanceof PDFDropdown && field.isEditable();
      for (const v of list) {
        if (!editable && !field.getOptions().includes(v))
          throw fail(`"${v}" is not one of the options`);
        checkChars(v);
      }
      if (list.length > 1 && !field.isMultiselect())
        throw fail('only one choice is allowed');
      if (list.length === 0) field.clear();
      else field.select(list.length === 1 ? list[0] : list);
    } else {
      throw fail('this kind of field cannot be filled here');
    }
  }
  form.updateFieldAppearances(font);
  if (flatten) form.flatten({ updateFieldAppearances: false });
  return doc.save({ useObjectStreams: true });
}
```

Export `listFormFields`, `fillForm`, `XFA_MESSAGE`, `FormField` and `FormValue` from the edit index.

Run: `pnpm test src/pdf/edit/forms` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm test && pnpm fixtures
git add src/pdf/edit test/fixtures scripts/gen-fixtures.ts
git commit -m "feat(pdf-edit): list and fill AcroForm fields; detect XFA

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Fill Form tool (`pdf-fill-form`)

**Files:**

- Create: `src/tools/pdf-fill-form/index.ts`, `Tool.tsx`, `components/FieldControl.tsx`
- Create: `test/e2e/pdf-fill-form.spec.ts`
- Modify: `test/e2e/global-setup.ts`

**Interfaces:**

- Consumes: Task 12.
- Produces: `FieldControl` props: `{ field: FormField; value: FormValue; onChange: (v: FormValue) => void; id: string; disabled?: boolean }`.

- [ ] **Step 1: `FieldControl`.** Spec, one control per field kind. Every visible label text is exactly `field.name`.

- `text`: `Label htmlFor={id}` + `Input` (`maxLength` set when there is one); multiline → `Textarea rows={4}`. Read-only → `disabled`, with a muted `<span>(read-only)</span>` placed _outside_ the `Label` element, so the accessible name stays exactly `field.name`.
- `checkbox`: `Checkbox id={id}` + `Label htmlFor={id}`.
- `radio`, or `dropdown`/`optionlist` with single-select: `Label htmlFor={id}` + `Select` with items `[{ value: '', label: '— None —' }, ...options]`. The value is the selected string, or `''`.
- Editable single dropdown: `Input` with `list={`${id}-options`}` plus a `<datalist>` of options.
- Multi-select (dropdown or option list): `<div role="group" aria-label={field.name}>` with a `Text` heading of the name, and one `Checkbox` per option with `aria-label={`${field.name}: ${option}`}`. The value is a `string[]`.
- `unsupported`: rendered by the Tool, not here.

- [ ] **Step 2: Tool.** Spec:

- `index.ts`: id `pdf-fill-form`, name `Fill PDF Form`, description `Fill in text fields, checkboxes, radio buttons and lists in a PDF form`, icon `FormInput`.
- Single-file pattern. On pick:
  - `listFormFields(file.bytes)` runs in an effect, with an `alive` guard.
  - `fields` and initial `values` are built from current field values: text → value, checkbox → checked, radio → `selected ?? ''`, single dropdown/list → `selected[0] ?? ''`, multi → `selected`.
  - Errors (`UNSUPPORTED_FEATURE` for XFA, `INVALID_FILE`, …) show as `Alert status="danger"`.
- No fillable fields: `Alert status="info"` "This PDF has no fillable form fields."
- Unsupported fields, if any: muted `Text` "Not fillable here: " followed by the names and their types.
- Form layout: `Grid` of `FieldControl`s, with ids `field-${index}`.
- `Label htmlFor="ff-flatten"` "Flatten form (fields become part of the page and can't be edited)" + `Switch id="ff-flatten"`.
- `Button` "Fill & download" (solid):
  - Runs `job.run(file, changedValues(values, initial), flatten)`. Only fields whose value changed are sent; read-only fields are never sent.
  - Output `deriveFilename(name, 'filled', 'pdf')`, with detail `${Object.keys(changes).length} fields changed${flatten ? ' · flattened' : ''}`.
- Editing any field calls `job.reset()`.

- [ ] **Step 3: Failing e2e** — `test/e2e/pdf-fill-form.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { pdfPageTexts } from '../fixtures/builders';

async function fill(page: Page) {
  await page.goto('/pdf-fill-form');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/form.pdf');
  await page.getByLabel('name', { exact: true }).fill('Ada Lovelace');
  await page.getByLabel('notes', { exact: true }).fill('Line one\nLine two');
  await page.getByRole('checkbox', { name: 'agree', exact: true }).click();
  await page.getByLabel('size', { exact: true }).selectOption('M');
  await page.getByLabel('country', { exact: true }).selectOption('France');
  await page.getByRole('checkbox', { name: 'toppings: Cheese' }).click();
  await page.getByRole('checkbox', { name: 'toppings: Olives' }).click();
  await expect(page.getByLabel('ref', { exact: true })).toBeDisabled();
}

async function download(page: Page) {
  await page.getByRole('button', { name: 'Fill & download' }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const d = await promise;
  expect(d.suggestedFilename()).toBe('form.filled.pdf');
  return readFileSync((await d.path())!);
}

test('fills every field kind', async ({ page }) => {
  await fill(page);
  const form = (await PDFDocument.load(await download(page))).getForm();
  expect(form.getTextField('name').getText()).toBe('Ada Lovelace');
  expect(form.getCheckBox('agree').isChecked()).toBe(true);
  expect(form.getRadioGroup('size').getSelected()).toBe('M');
  expect(form.getDropdown('country').getSelected()).toEqual(['France']);
  expect(form.getOptionList('toppings').getSelected()).toEqual([
    'Cheese',
    'Olives',
  ]);
});

test('flattens the filled form', async ({ page }) => {
  await fill(page);
  await page.getByRole('switch', { name: /Flatten form/ }).click();
  const bytes = await download(page);
  expect((await PDFDocument.load(bytes)).getForm().getFields()).toHaveLength(0);
  expect((await pdfPageTexts(bytes))[0]).toContain('Ada Lovelace');
});

test('explains that XFA forms are not supported', async ({ page }) => {
  await page.goto('/pdf-fill-form');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/xfa-form.pdf');
  await expect(
    page
      .getByRole('alert')
      .getByText('This PDF uses an XFA form, which is not supported.', {
        exact: false,
      }),
  ).toBeVisible();
});
```

Add `'/pdf-fill-form'` to `TOOL_ROUTES`. Run the spec → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/tools/pdf-fill-form test/e2e/pdf-fill-form.spec.ts test/e2e/global-setup.ts
git commit -m "feat(pdf-fill-form): fill AcroForm fields with optional flattening

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## PR boundary B — Mark up

- [ ] Run the gate. Each command must pass:
  - `pnpm lint` (0 errors)
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`. Confirm the three `.woff` signature fonts are emitted under `dist/**/assets`: `find dist -name '*latin-400-normal*.woff'` lists 3 files.
  - `pnpm test:e2e` three times in a row, with no flake.
- [ ] Scripted browser pass: visit the four new routes with no console or page errors (the pdf.js "fake worker" warning is known).
- [ ] Push, then open the PR "PDF tools: Mark up (Watermark, Page Numbers, Sign, Fill Form)".
  - The body notes: "visual signature only, not a certificate signature" and "XFA forms are reported as unsupported".
  - Merge once green locally.

---

# Part C — Security & optimise (PR 3: `feat/pdf-tools-security`)

**Branch:** after PR B has merged, run `git switch master && git pull && git switch -c feat/pdf-tools-security`.

### Task 14: qpdf worker and client

**Files:**

- Modify: `package.json` (move `@arshad-shah/qpdf-wasm` to `dependencies`), `vite.config.ts`
- Create: `src/shared/lib/bytes.ts`, `src/shared/lib/bytes.test.ts`
- Create: `src/pdf/qpdf/errors.ts`, `src/pdf/qpdf/handlers.ts`, `src/pdf/qpdf/handlers.test.ts`, `src/pdf/qpdf/qpdf.worker.ts`, `src/pdf/qpdf/client.ts`, `src/pdf/qpdf/index.ts`

**Interfaces:**

- Consumes: `createRpcClient`, `exposeRpc`, `Transferred`, `RpcContext`, `RpcEndpoint`; `ToolError`, `toToolError`; qpdf-wasm `optimize`, `encrypt`, `decrypt`, `inspect`, `configure`, `QpdfError` codes.
- Produces:
  - `ownBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer>`. Returns `bytes` when it spans its whole buffer, else a copy (safe to transfer).
  - `qpdfToToolError(e: unknown): ToolError`:
    - `WRONG_PASSWORD` → `WRONG_PASSWORD` "That password is not correct."
    - `INVALID_ARGUMENT` → `INVALID_INPUT` (qpdf's message)
    - `QPDF_ERROR` → `INVALID_FILE` "This file could not be processed as a PDF. It may be damaged."
    - `WASM_ERROR` → `UNKNOWN` "The PDF engine failed to start. Reload the page and try again."
    - anything else → `toToolError`
  - `interface PdfInspection { encrypted: boolean; needsPassword: boolean; pdfVersion: string; pageCount: number | null; warnings: string[] }`
  - `interface QpdfPdfResult { bytes: Uint8Array; warnings: string[] }`
  - `qpdfHandlers` (`inspect`, `optimize`, `encrypt`, `decrypt`) and `type QpdfHandlers`. These are pure handlers, also callable in Node tests.
  - `qpdf` client (from `@/pdf/qpdf`):
    - `qpdf.inspect(bytes, password?, signal?): Promise<PdfInspection>`
    - `qpdf.optimize(bytes, options: OptimizeOptions, signal?): Promise<QpdfPdfResult>`
    - `qpdf.encrypt(bytes, options: EncryptOptions, signal?): Promise<QpdfPdfResult>`
    - `qpdf.decrypt(bytes, password: string, signal?): Promise<QpdfPdfResult>`
  - Re-exported types: `EncryptOptions`, `OptimizeOptions`, `Permissions`.

- [ ] **Step 1: Dependency and build config**

```bash
pnpm remove -D @arshad-shah/qpdf-wasm
pnpm add @arshad-shah/qpdf-wasm@^0.1.0
```

In `vite.config.ts`, add `worker: { format: 'es' },` to the config object. Module workers are created with `{ type: 'module' }` everywhere. qpdf-wasm's Node branch uses dynamic `import()`, which the default IIFE worker format cannot code-split.

- [ ] **Step 2: Failing tests** — `src/shared/lib/bytes.test.ts` and `src/pdf/qpdf/handlers.test.ts`

```ts
// bytes.test.ts
import { describe, expect, it } from 'vitest';
import { ownBuffer } from './bytes';

describe('ownBuffer', () => {
  it('returns whole-buffer views as-is and copies partial views', () => {
    const whole = new Uint8Array([1, 2, 3]);
    expect(ownBuffer(whole)).toBe(whole);
    const part = new Uint8Array(new ArrayBuffer(8), 2, 3);
    const copy = ownBuffer(part);
    expect(copy).not.toBe(part);
    expect(copy.buffer.byteLength).toBe(3);
  });
});
```

```ts
// handlers.test.ts
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  makeAesEncryptedPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { qpdfToToolError } from './errors';
import { qpdfHandlers } from './handlers';

const ctx = { signal: new AbortController().signal, progress: () => {} };

describe('qpdf handlers (real wasm in Node)', () => {
  it('inspects plain and encrypted files', async () => {
    expect(
      await qpdfHandlers.inspect(ctx, await makeTextPdf({ pages: 3 })),
    ).toMatchObject({ encrypted: false, needsPassword: false, pageCount: 3 });
    expect(
      await qpdfHandlers.inspect(ctx, await makeAesEncryptedPdf()),
    ).toMatchObject({ encrypted: true, needsPassword: true, pageCount: null });
  });
  it('decrypts with the right password and maps a wrong one', async () => {
    const locked = await makeAesEncryptedPdf();
    await expect(
      qpdfHandlers.decrypt(ctx, locked, 'nope'),
    ).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
      message: 'That password is not correct.',
    });
    const out = (await qpdfHandlers.decrypt(ctx, locked, 'user-pw')).value;
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(2);
  });
  it('encrypts and optimises, returning transferable bytes', async () => {
    const plain = await makeTextPdf({ pages: 2 });
    const enc = await qpdfHandlers.encrypt(ctx, plain, {
      userPassword: 'a',
      ownerPassword: 'b',
    });
    expect(enc.transfer).toEqual([enc.value.bytes.buffer]);
    expect(await qpdfHandlers.inspect(ctx, enc.value.bytes)).toMatchObject({
      needsPassword: true,
    });
    const opt = (
      await qpdfHandlers.optimize(ctx, plain, { objectStreams: 'generate' })
    ).value;
    expect((await PDFDocument.load(opt.bytes)).getPageCount()).toBe(2);
  });
  it('maps damaged input and bad arguments', async () => {
    await expect(
      qpdfHandlers.optimize(
        ctx,
        new TextEncoder().encode('%PDF-1.7 garbage'),
        {},
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FILE' });
    await expect(
      qpdfHandlers.encrypt(ctx, await makeTextPdf({ pages: 1 }), {
        userPassword: 'a',
        ownerPassword: '',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('maps every qpdf error code', () => {
    const err = (code: string) => Object.assign(new Error('raw'), { code });
    expect(qpdfToToolError(err('WASM_ERROR'))).toMatchObject({
      code: 'UNKNOWN',
      message: 'The PDF engine failed to start. Reload the page and try again.',
    });
    expect(qpdfToToolError(err('QPDF_ERROR')).code).toBe('INVALID_FILE');
    expect(qpdfToToolError(new Error('plain')).code).toBe('UNKNOWN');
  });
});
```

Run: `pnpm test src/shared/lib/bytes src/pdf/qpdf` → Expected: FAIL.

- [ ] **Step 3: Implement**

`src/shared/lib/bytes.ts`:

```ts
/** A view that owns its whole ArrayBuffer, so the buffer can be transferred. */
export function ownBuffer(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength &&
    bytes.buffer instanceof ArrayBuffer
    ? (bytes as Uint8Array<ArrayBuffer>)
    : bytes.slice();
}
```

`src/pdf/qpdf/errors.ts`:

```ts
import { ToolError, toToolError } from '@/shared/lib/errors';

export function qpdfToToolError(e: unknown): ToolError {
  if (e instanceof ToolError) return e;
  const code =
    typeof e === 'object' && e !== null && 'code' in e
      ? (e as { code: unknown }).code
      : undefined;
  const message = e instanceof Error ? e.message : String(e);
  switch (code) {
    case 'WRONG_PASSWORD':
      return new ToolError('WRONG_PASSWORD', 'That password is not correct.', {
        cause: e,
      });
    case 'INVALID_ARGUMENT':
      return new ToolError('INVALID_INPUT', message, { cause: e });
    case 'QPDF_ERROR':
      return new ToolError(
        'INVALID_FILE',
        'This file could not be processed as a PDF. It may be damaged.',
        { cause: e },
      );
    case 'WASM_ERROR':
      return new ToolError(
        'UNKNOWN',
        'The PDF engine failed to start. Reload the page and try again.',
        { cause: e },
      );
    default:
      return toToolError(e);
  }
}
```

`src/pdf/qpdf/handlers.ts`:

```ts
import {
  decrypt,
  encrypt,
  inspect,
  optimize,
  type EncryptOptions,
  type OptimizeOptions,
} from '@arshad-shah/qpdf-wasm';
import { ownBuffer } from '@/shared/lib/bytes';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';
import { qpdfToToolError } from './errors';

export interface PdfInspection {
  encrypted: boolean;
  needsPassword: boolean;
  pdfVersion: string;
  pageCount: number | null;
  warnings: string[];
}
export interface QpdfPdfResult {
  bytes: Uint8Array;
  warnings: string[];
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw qpdfToToolError(e);
  }
}

function out(r: {
  bytes: Uint8Array;
  warnings: string[];
}): Transferred<QpdfPdfResult> {
  const bytes = ownBuffer(r.bytes);
  return new Transferred({ bytes, warnings: r.warnings }, [bytes.buffer]);
}

// qpdf calls are synchronous wasm: an abort cannot interrupt one, but the RPC
// client rejects with CANCELLED immediately and drops the late result.
export const qpdfHandlers = {
  inspect: (
    _ctx: RpcContext,
    bytes: Uint8Array,
    password?: string,
  ): Promise<PdfInspection> =>
    guard(async () => {
      const r = await inspect(bytes, password);
      return {
        encrypted: r.encrypted,
        needsPassword: r.needsPassword,
        pdfVersion: r.pdfVersion,
        pageCount: r.pageCount,
        warnings: r.warnings,
      };
    }),
  optimize: (_ctx: RpcContext, bytes: Uint8Array, options: OptimizeOptions) =>
    guard(async () => out(await optimize(bytes, options))),
  encrypt: (_ctx: RpcContext, bytes: Uint8Array, options: EncryptOptions) =>
    guard(async () => out(await encrypt(bytes, options))),
  decrypt: (_ctx: RpcContext, bytes: Uint8Array, password: string) =>
    guard(async () => out(await decrypt(bytes, password))),
};

export type QpdfHandlers = typeof qpdfHandlers;
```

`src/pdf/qpdf/qpdf.worker.ts`:

```ts
import wasmUrl from '@arshad-shah/qpdf-wasm/qpdf.wasm?url';
import { configure } from '@arshad-shah/qpdf-wasm';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { qpdfHandlers } from './handlers';

// Served from our own origin (Vite emits the asset); never a CDN.
configure({ wasmUrl });
exposeRpc(qpdfHandlers, self as unknown as RpcEndpoint);
```

`src/pdf/qpdf/client.ts`:

```ts
import type { EncryptOptions, OptimizeOptions } from '@arshad-shah/qpdf-wasm';
import { createRpcClient } from '@/shared/lib/worker-rpc';
import type { QpdfHandlers } from './handlers';

const client = createRpcClient<QpdfHandlers>(
  () =>
    new Worker(new URL('./qpdf.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

/** Callers keep their bytes: a copy is transferred to the worker. */
const send = (bytes: Uint8Array) => {
  const copy = bytes.slice();
  return { copy, transfer: [copy.buffer] };
};

export const qpdf = {
  inspect(bytes: Uint8Array, password?: string, signal?: AbortSignal) {
    const { copy, transfer } = send(bytes);
    return client.call('inspect', [copy, password], { signal, transfer });
  },
  optimize(bytes: Uint8Array, options: OptimizeOptions, signal?: AbortSignal) {
    const { copy, transfer } = send(bytes);
    return client.call('optimize', [copy, options], { signal, transfer });
  },
  encrypt(bytes: Uint8Array, options: EncryptOptions, signal?: AbortSignal) {
    const { copy, transfer } = send(bytes);
    return client.call('encrypt', [copy, options], { signal, transfer });
  },
  decrypt(bytes: Uint8Array, password: string, signal?: AbortSignal) {
    const { copy, transfer } = send(bytes);
    return client.call('decrypt', [copy, password], { signal, transfer });
  },
};
```

`src/pdf/qpdf/index.ts`:

```ts
export { qpdf } from './client';
export { qpdfToToolError } from './errors';
export type { PdfInspection, QpdfPdfResult } from './handlers';
export type {
  EncryptOptions,
  OptimizeOptions,
  Permissions,
} from '@arshad-shah/qpdf-wasm';
```

Run: `pnpm test src/shared/lib/bytes src/pdf/qpdf` → Expected: PASS.

- [ ] **Step 4: Build check.** Run `pnpm typecheck && pnpm build`, then `find dist -name '*.wasm' | grep -i qpdf` → Expected: one emitted `qpdf-*.wasm`. (The worker is not imported anywhere yet; Task 15 wires it in. Until then the build check confirms the config only.)

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts src/shared/lib/bytes.ts src/shared/lib/bytes.test.ts src/pdf/qpdf
git commit -m "feat(pdf-qpdf): qpdf-wasm in a module worker with typed errors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Encrypted-input flow for every PDF tool

**Files:**

- Create: `src/pdf/qpdf/unlock.ts`, `src/pdf/qpdf/unlock.test.ts`
- Modify: `src/pdf/qpdf/index.ts`
- Create: `src/pdf/components/PasswordPrompt.tsx`, `src/pdf/components/PasswordPrompt.test.tsx`, `src/pdf/components/notes.ts`
- Modify: `src/pdf/components/PdfDropzone.tsx`, `PdfDropzone.test.tsx`, `ResultFiles.tsx`, `ResultFiles.test.tsx`, `index.ts`
- Create: `src/pdf/edit/messages.ts`
- Modify: `src/pdf/edit/load.ts`, `src/pdf/edit/load.test.ts`, `src/pdf/render/render.worker.ts`
- Modify tools: `src/tools/{pdf-merger,pdf-splitter,pdf-organize,pdf-to-images,pdf-to-text,pdf-watermark,pdf-page-numbers,pdf-sign,pdf-fill-form}/Tool.tsx`
- Modify: `test/fixtures/builders.ts`, `test/fixtures/builders.test.ts`, `test/e2e/encrypted.spec.ts`

**Interfaces:**

- Consumes: Task 14 (`qpdf`, `qpdfHandlers`).
- Produces:
  - `mayBeEncrypted(bytes: Uint8Array): boolean`. A cheap scan for an `/Encrypt` name token. Encryption dictionaries are never inside compressed object streams, so a real one is always visible.
  - `interface UnlockEngine { inspect(bytes: Uint8Array, password?: string, signal?: AbortSignal): Promise<{ encrypted: boolean; needsPassword: boolean }>; decrypt(bytes: Uint8Array, password: string, signal?: AbortSignal): Promise<{ bytes: Uint8Array }> }`. The `qpdf` client satisfies it.
  - `type PreparedPdf = { status: 'ready'; bytes: Uint8Array; wasEncrypted: boolean } | { status: 'locked' }`
  - `preparePdf(bytes, engine, signal?): Promise<PreparedPdf>`:
    - Not encrypted → `ready` as-is.
    - Owner-only (no open password) → decrypted with `''` → `ready`, `wasEncrypted: true`.
    - Open password required → `locked`.
  - `unlockWithPassword(bytes, password, engine, signal?): Promise<Uint8Array>`
  - `ENCRYPTED_MESSAGE = 'This PDF is password-protected and must be unlocked first.'`, in `src/pdf/edit/messages.ts` and re-exported from `@/pdf/edit`. `loadPdf` and the render worker use it as the safety net.
  - `interface PdfInputFile extends LoadedFile { wasEncrypted: boolean }`. `PdfDropzone`'s `onFiles` now receives `PdfInputFile[]`.
  - New `PdfDropzone` prop `unlock?: boolean` (default `true`).
  - `PasswordPrompt` props: `{ fileName: string; error?: string | null; busy?: boolean; onSubmit: (password: string) => void; onCancel?: () => void; submitLabel?: string; description?: string }`
  - `ResultFiles` prop `note?: React.ReactNode`
  - `UNENCRYPTED_NOTE = 'The original was password-protected. This file is not.'`
  - Fixture `makeOwnerOnlyEncryptedPdf(): Promise<Uint8Array>`. Its user password is empty and its owner password is `'owner-pw'`.

- [ ] **Step 1: Fixture.** Append to `builders.ts`:

```ts
/** AES-256 with permissions only: opens without a password. */
export async function makeOwnerOnlyEncryptedPdf(): Promise<Uint8Array> {
  const bytes = await makeTextPdf({ pages: 1, label: 'Restricted' });
  return (
    await encrypt(bytes, {
      userPassword: '',
      ownerPassword: 'owner-pw',
      permissions: { extract: false },
    })
  ).bytes;
}
```

Add a builder test asserting `inspect(bytes)` returns `{ encrypted: true, needsPassword: false }`.

- [ ] **Step 2: Failing tests** — `src/pdf/qpdf/unlock.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  makeAesEncryptedPdf,
  makeOwnerOnlyEncryptedPdf,
  makeTextPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import { qpdfHandlers } from './handlers';
import {
  mayBeEncrypted,
  preparePdf,
  unlockWithPassword,
  type UnlockEngine,
} from './unlock';

const ctx = { signal: new AbortController().signal, progress: () => {} };
const engine = (): UnlockEngine => ({
  inspect: vi.fn((b: Uint8Array, p?: string) =>
    qpdfHandlers.inspect(ctx, b, p),
  ),
  decrypt: vi.fn(
    async (b: Uint8Array, p: string) =>
      (await qpdfHandlers.decrypt(ctx, b, p)).value,
  ),
});
const enc = (s: string) => new TextEncoder().encode(s);

describe('mayBeEncrypted', () => {
  it('finds a real /Encrypt name but not look-alikes', async () => {
    expect(mayBeEncrypted(await makeTextPdf({ pages: 1 }))).toBe(false);
    expect(mayBeEncrypted(await makeAesEncryptedPdf())).toBe(true);
    expect(mayBeEncrypted(enc('%PDF-1.7 /Encrypt 5 0 R'))).toBe(true);
    expect(mayBeEncrypted(enc('%PDF-1.7 /EncryptMetadata false'))).toBe(false);
  });
});

describe('preparePdf', () => {
  it('passes plain PDFs through without starting qpdf', async () => {
    const e = engine();
    const bytes = await makeTextPdf({ pages: 1 });
    expect(await preparePdf(bytes, e)).toEqual({
      status: 'ready',
      bytes,
      wasEncrypted: false,
    });
    expect(e.inspect).not.toHaveBeenCalled();
  });
  it('reports password-protected PDFs as locked', async () => {
    expect(await preparePdf(await makeAesEncryptedPdf(), engine())).toEqual({
      status: 'locked',
    });
  });
  it('opens permissions-only PDFs without asking', async () => {
    const r = await preparePdf(await makeOwnerOnlyEncryptedPdf(), engine());
    expect(r).toMatchObject({ status: 'ready', wasEncrypted: true });
    if (r.status !== 'ready') throw new Error('unreachable');
    expect(await pdfPageTexts(r.bytes)).toEqual(['Restricted 1']);
  });
});

describe('unlockWithPassword', () => {
  it('decrypts with the right password; wrong and empty ones fail precisely', async () => {
    const locked = await makeAesEncryptedPdf();
    await expect(
      unlockWithPassword(locked, 'nope', engine()),
    ).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
    await expect(unlockWithPassword(locked, '', engine())).rejects.toThrow(
      'Enter the password',
    );
    const plain = await unlockWithPassword(locked, 'user-pw', engine());
    expect((await PDFDocument.load(plain)).getPageCount()).toBe(2);
  });
});
```

Run: `pnpm test src/pdf/qpdf/unlock` → Expected: FAIL.

- [ ] **Step 3: Implement** — `src/pdf/qpdf/unlock.ts`

```ts
import { ToolError } from '@/shared/lib/errors';

export interface UnlockEngine {
  inspect(
    bytes: Uint8Array,
    password?: string,
    signal?: AbortSignal,
  ): Promise<{ encrypted: boolean; needsPassword: boolean }>;
  decrypt(
    bytes: Uint8Array,
    password: string,
    signal?: AbortSignal,
  ): Promise<{ bytes: Uint8Array }>;
}

export type PreparedPdf =
  | { status: 'ready'; bytes: Uint8Array; wasEncrypted: boolean }
  | { status: 'locked' };

const TOKEN = Array.from('/Encrypt', (c) => c.charCodeAt(0));
const isNameChar = (c: number) =>
  (c >= 0x30 && c <= 0x39) ||
  (c >= 0x41 && c <= 0x5a) ||
  (c >= 0x61 && c <= 0x7a);

/** Cheap pre-check; a hit is confirmed by qpdf. */
export function mayBeEncrypted(bytes: Uint8Array): boolean {
  outer: for (let i = 0; i <= bytes.length - TOKEN.length; i++) {
    if (bytes[i] !== 0x2f) continue;
    for (let k = 1; k < TOKEN.length; k++)
      if (bytes[i + k] !== TOKEN[k]) continue outer;
    if (!isNameChar(bytes[i + TOKEN.length] ?? 0x20)) return true;
  }
  return false;
}

export async function preparePdf(
  bytes: Uint8Array,
  engine: UnlockEngine,
  signal?: AbortSignal,
): Promise<PreparedPdf> {
  if (!mayBeEncrypted(bytes))
    return { status: 'ready', bytes, wasEncrypted: false };
  const info = await engine.inspect(bytes, undefined, signal);
  if (!info.encrypted) return { status: 'ready', bytes, wasEncrypted: false };
  if (info.needsPassword) return { status: 'locked' };
  // Permissions-only encryption: readers open these without a password too.
  const out = await engine.decrypt(bytes, '', signal);
  return { status: 'ready', bytes: out.bytes, wasEncrypted: true };
}

export async function unlockWithPassword(
  bytes: Uint8Array,
  password: string,
  engine: UnlockEngine,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (!password) throw new ToolError('INVALID_INPUT', 'Enter the password');
  return (await engine.decrypt(bytes, password, signal)).bytes;
}
```

Export `mayBeEncrypted`, `preparePdf`, `unlockWithPassword`, `PreparedPdf` and `UnlockEngine` from `src/pdf/qpdf/index.ts`.

Run: `pnpm test src/pdf/qpdf/unlock` → Expected: PASS.

- [ ] **Step 4: Failing component tests**

`PasswordPrompt.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordPrompt } from './PasswordPrompt';

describe('PasswordPrompt', () => {
  it('submits the typed password, shows errors, and can be skipped', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <PasswordPrompt
        fileName="a.pdf"
        error="That password is not correct. Try again."
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );
    const input = screen.getByLabelText('Password for a.pdf');
    expect(input.getAttribute('type')).toBe('password');
    expect(screen.getByRole('alert').textContent).toContain('not correct');
    fireEvent.change(input, { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(onSubmit).toHaveBeenCalledWith('secret');
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(input.getAttribute('type')).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Skip this file' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

Append to `PdfDropzone.test.tsx`:

```tsx
import { ToolError } from '@/shared/lib/errors';
import { qpdf } from '@/pdf/qpdf/client';

vi.mock('@/pdf/qpdf/client', () => ({
  qpdf: { inspect: vi.fn(), decrypt: vi.fn() },
}));

const locked = (name: string) =>
  new File(
    [new TextEncoder().encode('%PDF-1.7\n/Encrypt 9 0 R\n%%EOF')],
    name,
    { type: 'application/pdf' },
  );

it('prompts for a password, re-prompts when wrong, then hands over plaintext', async () => {
  vi.mocked(qpdf.inspect).mockResolvedValue({
    encrypted: true,
    needsPassword: true,
    pdfVersion: '1.7',
    pageCount: null,
    warnings: [],
  });
  vi.mocked(qpdf.decrypt)
    .mockRejectedValueOnce(
      new ToolError('WRONG_PASSWORD', 'That password is not correct.'),
    )
    .mockResolvedValueOnce({ bytes: new Uint8Array([1, 2, 3]), warnings: [] });
  const onFiles = vi.fn();
  const { container } = render(<PdfDropzone onFiles={onFiles} />);
  fireEvent.change(container.querySelector('input[type=file]')!, {
    target: { files: [locked('s.pdf')] },
  });
  const input = await screen.findByLabelText('Password for s.pdf');
  fireEvent.change(input, { target: { value: 'bad' } });
  fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
  expect(
    await screen.findByText('That password is not correct. Try again.'),
  ).toBeTruthy();
  expect(onFiles).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'good' } });
  fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
  await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
  expect(onFiles.mock.calls[0][0][0]).toMatchObject({
    name: 's.pdf',
    wasEncrypted: true,
    bytes: new Uint8Array([1, 2, 3]),
  });
  expect(screen.queryByLabelText('Password for s.pdf')).toBeNull();
});

it('does not prompt when unlock is off', async () => {
  const onFiles = vi.fn();
  const { container } = render(
    <PdfDropzone onFiles={onFiles} unlock={false} />,
  );
  fireEvent.change(container.querySelector('input[type=file]')!, {
    target: { files: [locked('raw.pdf')] },
  });
  await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
  expect(onFiles.mock.calls[0][0][0]).toMatchObject({
    name: 'raw.pdf',
    wasEncrypted: false,
  });
  expect(qpdf.inspect).not.toHaveBeenCalled();
});
```

Append to `ResultFiles.test.tsx`: `render(<ResultFiles files={files} note="The original was password-protected. This file is not." />)` → `screen.getByText(...)` is present.

Run: `pnpm test src/pdf/components` → Expected: FAIL.

- [ ] **Step 5: Implement the components**

`src/pdf/components/notes.ts`:

```ts
export const UNENCRYPTED_NOTE =
  'The original was password-protected. This file is not.';
```

`ResultFiles.tsx`: add `note?: React.ReactNode` to the props. Render `{note && <p className="text-sm text-fg-muted">{note}</p>}` directly under the header row.

`PasswordPrompt.tsx`:

```tsx
import React, { useId, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
  Text,
} from '@/shared/ui';

interface PasswordPromptProps {
  fileName: string;
  error?: string | null;
  busy?: boolean;
  onSubmit: (password: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
  description?: string;
}

export const PasswordPrompt: React.FC<PasswordPromptProps> = ({
  fileName,
  error,
  busy,
  onSubmit,
  onCancel,
  submitLabel = 'Unlock',
  description = 'Enter its password to open it. It is decrypted in your browser and never uploaded.',
}) => {
  const id = useId();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  return (
    <form
      aria-label={`Unlock ${fileName}`}
      className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (password) onSubmit(password);
      }}
    >
      <Text size="sm" weight="semibold">
        {fileName} is password-protected
      </Text>
      <Text size="sm" tone="muted">
        {description}
      </Text>
      <Label htmlFor={id}>Password for {fileName}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete="off"
          value={password}
          onChange={setPassword}
          invalid={!!error}
          disabled={busy}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? 'Hide' : 'Show'}
        </Button>
      </div>
      {error && (
        <Alert status="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="solid"
          loading={busy}
          disabled={!password || busy}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Skip this file
          </Button>
        )}
      </div>
    </form>
  );
};
```

`PdfDropzone.tsx`:

- Export `interface PdfInputFile extends LoadedFile { wasEncrypted: boolean }`.
- Change `onFiles: (files: PdfInputFile[]) => void` and add `unlock?: boolean` (default `true`).
- Import `qpdf` from `'@/pdf/qpdf/client'` and `preparePdf`, `unlockWithPassword` from `'@/pdf/qpdf/unlock'`. Use the module paths, not the barrel, so tests can mock the client.
- Add `interface LockedEntry { file: LoadedFile; error: string | null; busy: boolean }` and state `const [locked, setLocked] = useState<LockedEntry[]>([])`.
- `handle(files)` becomes:

```tsx
const handle = async (files: File[]) => {
  setBusy(true);
  const loaded = await Promise.allSettled(
    files.map((f) => loadFile(f, accept)),
  );
  const errors: string[] = [];
  const candidates: LoadedFile[] = [];
  for (const r of loaded) {
    if (r.status === 'fulfilled') candidates.push(r.value);
    else errors.push(toToolError(r.reason).message);
  }
  const prepared = await Promise.allSettled(
    candidates.map((f) =>
      unlock && f.kind === 'pdf'
        ? preparePdf(f.bytes, qpdf)
        : Promise.resolve({
            status: 'ready' as const,
            bytes: f.bytes,
            wasEncrypted: false,
          }),
    ),
  );
  const ready: PdfInputFile[] = [];
  const newlyLocked: LockedEntry[] = [];
  prepared.forEach((r, i) => {
    const f = candidates[i];
    if (r.status === 'rejected')
      errors.push(`${f.name}: ${toToolError(r.reason).message}`);
    else if (r.value.status === 'locked')
      newlyLocked.push({ file: f, error: null, busy: false });
    else
      ready.push({
        ...f,
        bytes: r.value.bytes,
        wasEncrypted: r.value.wasEncrypted,
      });
  });
  setBusy(false);
  setRejected(errors);
  setLocked((prev) => (multiple ? [...prev, ...newlyLocked] : newlyLocked));
  for (const f of ready)
    if (isOverSoftLimit(f.size))
      notify.info(
        `${f.name} is ${formatBytes(f.size)}. Large files may be slow.`,
      );
  if (ready.length) onFiles(ready);
};

const submit = async (id: string, password: string) => {
  const entry = locked.find((l) => l.file.id === id);
  if (!entry) return;
  const patch = (p: Partial<LockedEntry>) =>
    setLocked((prev) =>
      prev.map((l) => (l.file.id === id ? { ...l, ...p } : l)),
    );
  patch({ busy: true, error: null });
  try {
    const bytes = await unlockWithPassword(entry.file.bytes, password, qpdf);
    setLocked((prev) => prev.filter((l) => l.file.id !== id));
    onFiles([{ ...entry.file, bytes, wasEncrypted: true }]);
  } catch (e) {
    const err = toToolError(e);
    patch({
      busy: false,
      error:
        err.code === 'WRONG_PASSWORD'
          ? 'That password is not correct. Try again.'
          : err.message,
    });
  }
};
```

- Below the upload and the rejected-files alert, render `locked.map((l) => <PasswordPrompt key={l.file.id} fileName={l.file.name} error={l.error} busy={l.busy} onSubmit={(pw) => void submit(l.file.id, pw)} onCancel={() => setLocked((prev) => prev.filter((x) => x.file.id !== l.file.id))} />)`.

Export `PasswordPrompt`, `type PdfInputFile` and `UNENCRYPTED_NOTE` from `src/pdf/components/index.ts`.

Run: `pnpm test src/pdf/components` → Expected: PASS.

- [ ] **Step 6: Safety-net message.**
  - Create `src/pdf/edit/messages.ts` with `export const ENCRYPTED_MESSAGE = 'This PDF is password-protected and must be unlocked first.';`. It lives in its own module so the render worker does not pull pdf-lib into its bundle.
  - `load.ts` uses it for the `ENCRYPTED` error.
  - In `render.worker.ts`, import it from `@/pdf/edit/messages` and use it in the `PasswordException` branch.
  - Update `load.test.ts` to expect `ENCRYPTED_MESSAGE`.
  - Export `ENCRYPTED_MESSAGE` from `src/pdf/edit/index.ts`.
  - Check: `grep -rn "not supported by this tool yet" src test` → no matches (encrypted.spec.ts is rewritten in Step 8).

- [ ] **Step 7: Tools show that the output is unencrypted.** For each tool, change the file state type from `LoadedFile` to `PdfInputFile` (items for Merger), then:
  - Merger: `<ResultFiles files={[job.result]} note={items.some((i) => i.wasEncrypted) ? UNENCRYPTED_NOTE : undefined} />`. `MergeItem` now extends `PdfInputFile`.
  - Splitter, PDF → Images, PDF → Text, Watermark, Page Numbers, Sign, Fill Form: `note={file?.wasEncrypted ? UNENCRYPTED_NOTE : undefined}` on their `ResultFiles`.
  - Organize (saves directly): `notify.success(`Saved ${name}${source.wasEncrypted ? ' (not password-protected)' : ''}`)`.
  - `pnpm typecheck` must pass. `LoadedFile`-typed `onFiles` handlers stay assignable, because `PdfInputFile` extends `LoadedFile`, but the state types must change for `wasEncrypted` to be readable.

- [ ] **Step 8: Rewrite `test/e2e/encrypted.spec.ts`**

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const FILE = 'test/fixtures/generated/encrypted-aes.pdf';
const ROUTES = [
  '/pdf-merger',
  '/pdf-splitter',
  '/pdf-organize',
  '/pdf-to-images',
  '/pdf-to-text',
  '/pdf-watermark',
  '/pdf-page-numbers',
  '/pdf-sign',
  '/pdf-fill-form',
];

for (const route of ROUTES) {
  test(`${route} asks for the password of an AES-256 PDF and opens it`, async ({
    page,
  }) => {
    await page.goto(route);
    await page.locator('input[type=file]').first().setInputFiles(FILE);
    const password = page.getByLabel('Password for encrypted-aes.pdf', {
      exact: true,
    });
    await password.fill('wrong');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(
      page
        .getByRole('alert')
        .getByText('That password is not correct. Try again.'),
    ).toBeVisible();
    await password.fill('user-pw');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect(password).toHaveCount(0);
    await expect(
      page.getByText('encrypted-aes.pdf', { exact: true }).first(),
    ).toBeVisible();
  });
}

test('the decrypted output is real and says it is unencrypted', async ({
  page,
}) => {
  await page.goto('/pdf-to-text');
  await page.locator('input[type=file]').setInputFiles(FILE);
  await page
    .getByLabel('Password for encrypted-aes.pdf', { exact: true })
    .fill('user-pw');
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Extract text' }).click();
  await expect(
    page.getByText('The original was password-protected. This file is not.'),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  expect(
    readFileSync((await (await downloadPromise).path())!, 'utf8'),
  ).toContain('Locked 1');
});

test('a locked file can be skipped', async ({ page }) => {
  await page.goto('/pdf-merger');
  await page
    .locator('input[type=file]')
    .setInputFiles([FILE, 'test/fixtures/generated/text-3.pdf']);
  await expect(page.locator('li[data-sortable-item]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Skip this file' }).click();
  await expect(
    page.getByLabel('Password for encrypted-aes.pdf', { exact: true }),
  ).toHaveCount(0);
});
```

Run: `pnpm test:e2e test/e2e/encrypted.spec.ts` → Expected: PASS.

- [ ] **Step 9: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/pdf src/tools test/fixtures test/e2e/encrypted.spec.ts
git commit -m "feat(pdf): password prompt and in-browser decryption for encrypted input

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Metadata (`pdf-metadata`) — operations and tool

**Files:**

- Create: `src/pdf/edit/metadata.ts`, `src/pdf/edit/metadata.test.ts`
- Modify: `src/pdf/edit/index.ts`, `test/fixtures/builders.ts`, `scripts/gen-fixtures.ts`
- Create: `src/tools/pdf-metadata/index.ts`, `Tool.tsx`
- Create: `test/e2e/pdf-metadata.spec.ts`
- Modify: `test/e2e/global-setup.ts`, `test/e2e/encrypted.spec.ts` (add `/pdf-metadata` to `ROUTES`)

**Interfaces:**

- Consumes: `loadPdf`.
- Produces (from `@/pdf/edit`):
  - `METADATA_FIELDS = ['title', 'author', 'subject', 'keywords', 'creator', 'producer'] as const`
  - `type MetadataField = (typeof METADATA_FIELDS)[number]`
  - `interface PdfMetadata extends Record<MetadataField, string> { creationDate: Date | null; modificationDate: Date | null; hasXmp: boolean }`
  - `type MetadataPatch = Partial<Record<MetadataField, string>>`. A blank value removes the entry.
  - `getMetadata(bytes): Promise<PdfMetadata>`
  - `setMetadata(bytes, patch, now?: Date): Promise<Uint8Array>`. It sets ModDate to `now`. An existing XMP packet is regenerated to match the Info fields, and a `pdfaid` part/conformance is carried over.
  - `stripMetadata(bytes): Promise<Uint8Array>`
  - `stripMetadataInPlace(doc: PDFDocument): void`. Removes the Info dictionary and the catalog `/Metadata` (document-level XMP).
  - `buildXmp(meta: PdfMetadata, extras?: { part?: string; conformance?: string }): string`
- Fixture: `makeMetadataPdf(): Promise<Uint8Array>`. Title "Quarterly report", author "Ada", subject "Numbers", keywords "q3 finance", creator "Writer", producer "Fixture", creation date `2024-01-02T03:04:05Z`, plus an XMP packet with dc:title and `pdfaid:part 2`/`conformance B`. Generated as `metadata.pdf`.

- [ ] **Step 1: Fixture.** Append to `builders.ts`:

```ts
export async function makeMetadataPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.addPage([612, 792]);
  doc.setTitle('Quarterly report');
  doc.setAuthor('Ada');
  doc.setSubject('Numbers');
  doc.setKeywords(['q3 finance']);
  doc.setCreator('Writer');
  doc.setProducer('Fixture');
  doc.setCreationDate(new Date('2024-01-02T03:04:05Z'));
  const xmp = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Quarterly report</rdf:li></rdf:Alt></dc:title><pdfaid:part>2</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  const ref = doc.context.register(
    doc.context.stream(new TextEncoder().encode(xmp), {
      Type: 'Metadata',
      Subtype: 'XML',
    }),
  );
  doc.catalog.set(PDFName.of('Metadata'), ref);
  return doc.save();
}
```

Add `'metadata.pdf': await makeMetadataPdf()` to `gen-fixtures.ts`.

- [ ] **Step 2: Failing tests** — `src/pdf/edit/metadata.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  decodePDFRawStream,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import { makeMetadataPdf, makeTextPdf } from '../../../test/fixtures/builders';
import { getMetadata, setMetadata, stripMetadata } from './metadata';

const xmpOf = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  const s = doc.catalog.lookupMaybe(PDFName.of('Metadata'), PDFRawStream);
  return s ? new TextDecoder().decode(decodePDFRawStream(s).decode()) : null;
};

describe('metadata', () => {
  it('reads Info fields, dates and XMP presence', async () => {
    expect(await getMetadata(await makeMetadataPdf())).toEqual({
      title: 'Quarterly report',
      author: 'Ada',
      subject: 'Numbers',
      keywords: 'q3 finance',
      creator: 'Writer',
      producer: 'Fixture',
      creationDate: new Date('2024-01-02T03:04:05Z'),
      modificationDate: null,
      hasXmp: true,
    });
  });
  it('edits, removes blanks, stamps ModDate and keeps XMP in sync (with PDF/A id)', async () => {
    const now = new Date('2026-10-01T12:00:00Z');
    const out = await setMetadata(
      await makeMetadataPdf(),
      { title: 'Annual <report> & more', author: '' },
      now,
    );
    const meta = await getMetadata(out);
    expect(meta).toMatchObject({
      title: 'Annual <report> & more',
      author: '',
      subject: 'Numbers',
      modificationDate: now,
    });
    const xmp = (await xmpOf(out))!;
    expect(xmp).toContain(
      '<rdf:li xml:lang="x-default">Annual &lt;report&gt; &amp; more</rdf:li>',
    );
    expect(xmp).not.toContain('<dc:creator>');
    expect(xmp).toContain(
      '<xmp:ModifyDate>2026-10-01T12:00:00.000Z</xmp:ModifyDate>',
    );
    expect(xmp).toContain('<pdfaid:part>2</pdfaid:part>');
    expect(xmp).toContain('<pdfaid:conformance>B</pdfaid:conformance>');
  });
  it('does not invent XMP for files without it', async () => {
    const out = await setMetadata(await makeTextPdf({ pages: 1 }), {
      title: 'x',
    });
    expect(await xmpOf(out)).toBeNull();
  });
  it('strips Info and XMP completely', async () => {
    const out = await stripMetadata(await makeMetadataPdf());
    expect(await xmpOf(out)).toBeNull();
    expect(await getMetadata(out)).toMatchObject({
      title: '',
      author: '',
      producer: '',
      creationDate: null,
      hasXmp: false,
    });
    expect(Buffer.from(out).toString('latin1')).not.toContain(
      'Quarterly report',
    );
  });
});
```

Run: `pnpm test src/pdf/edit/metadata` → Expected: FAIL.

- [ ] **Step 3: Implement** — `src/pdf/edit/metadata.ts`

```ts
import {
  decodePDFRawStream,
  PDFName,
  PDFRawStream,
  PDFRef,
  type PDFDocument,
} from 'pdf-lib';
import { loadPdf } from './load';

export const METADATA_FIELDS = [
  'title',
  'author',
  'subject',
  'keywords',
  'creator',
  'producer',
] as const;
export type MetadataField = (typeof METADATA_FIELDS)[number];
export interface PdfMetadata extends Record<MetadataField, string> {
  creationDate: Date | null;
  modificationDate: Date | null;
  hasXmp: boolean;
}
export type MetadataPatch = Partial<Record<MetadataField, string>>;

const INFO_KEY: Record<MetadataField, string> = {
  title: 'Title',
  author: 'Author',
  subject: 'Subject',
  keywords: 'Keywords',
  creator: 'Creator',
  producer: 'Producer',
};

const xmpRef = (doc: PDFDocument): PDFRef | null => {
  const v = doc.catalog.get(PDFName.of('Metadata'));
  return v instanceof PDFRef ? v : null;
};

function readXmp(doc: PDFDocument, ref: PDFRef): string {
  const s = doc.context.lookup(ref);
  if (!(s instanceof PDFRawStream)) return '';
  try {
    return new TextDecoder().decode(decodePDFRawStream(s).decode());
  } catch {
    return '';
  }
}

function readMeta(doc: PDFDocument): PdfMetadata {
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    creationDate: doc.getCreationDate() ?? null,
    modificationDate: doc.getModificationDate() ?? null,
    hasXmp: xmpRef(doc) !== null,
  };
}

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function buildXmp(
  m: PdfMetadata,
  extras: { part?: string; conformance?: string } = {},
): string {
  const lines: string[] = [];
  if (m.title)
    lines.push(
      `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${esc(m.title)}</rdf:li></rdf:Alt></dc:title>`,
    );
  if (m.author)
    lines.push(
      `<dc:creator><rdf:Seq><rdf:li>${esc(m.author)}</rdf:li></rdf:Seq></dc:creator>`,
    );
  if (m.subject)
    lines.push(
      `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${esc(m.subject)}</rdf:li></rdf:Alt></dc:description>`,
    );
  if (m.keywords) lines.push(`<pdf:Keywords>${esc(m.keywords)}</pdf:Keywords>`);
  if (m.producer) lines.push(`<pdf:Producer>${esc(m.producer)}</pdf:Producer>`);
  if (m.creator)
    lines.push(`<xmp:CreatorTool>${esc(m.creator)}</xmp:CreatorTool>`);
  if (m.creationDate)
    lines.push(
      `<xmp:CreateDate>${m.creationDate.toISOString()}</xmp:CreateDate>`,
    );
  if (m.modificationDate) {
    lines.push(
      `<xmp:ModifyDate>${m.modificationDate.toISOString()}</xmp:ModifyDate>`,
    );
    lines.push(
      `<xmp:MetadataDate>${m.modificationDate.toISOString()}</xmp:MetadataDate>`,
    );
  }
  if (extras.part) lines.push(`<pdfaid:part>${esc(extras.part)}</pdfaid:part>`);
  if (extras.conformance)
    lines.push(
      `<pdfaid:conformance>${esc(extras.conformance)}</pdfaid:conformance>`,
    );
  return [
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">',
    ...lines,
    '</rdf:Description>',
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('\n');
}

function pdfaIdentity(xmp: string): { part?: string; conformance?: string } {
  const part = /pdfaid:part(?:="|>)\s*(\d)/.exec(xmp)?.[1];
  const conformance = /pdfaid:conformance(?:="|>)\s*([ABUabu])/
    .exec(xmp)?.[1]
    ?.toUpperCase();
  return { part, conformance };
}

export async function getMetadata(bytes: Uint8Array): Promise<PdfMetadata> {
  return readMeta(await loadPdf(bytes));
}

export async function setMetadata(
  bytes: Uint8Array,
  patch: MetadataPatch,
  now = new Date(),
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const info = doc.getInfoDict();
  for (const field of METADATA_FIELDS) {
    const raw = patch[field];
    if (raw === undefined) continue;
    const value = raw.trim();
    if (!value) {
      info.delete(PDFName.of(INFO_KEY[field]));
      continue;
    }
    if (field === 'title') doc.setTitle(value);
    else if (field === 'author') doc.setAuthor(value);
    else if (field === 'subject') doc.setSubject(value);
    else if (field === 'keywords') doc.setKeywords([value]);
    else if (field === 'creator') doc.setCreator(value);
    else doc.setProducer(value);
  }
  doc.setModificationDate(now);
  const ref = xmpRef(doc);
  if (ref) {
    const xml = buildXmp(readMeta(doc), pdfaIdentity(readXmp(doc, ref)));
    doc.context.assign(
      ref,
      doc.context.stream(new TextEncoder().encode(xml), {
        Type: 'Metadata',
        Subtype: 'XML',
      }),
    );
  }
  return doc.save({ useObjectStreams: true });
}

export function stripMetadataInPlace(doc: PDFDocument): void {
  const info = doc.context.trailerInfo.Info;
  if (info instanceof PDFRef) doc.context.delete(info);
  doc.context.trailerInfo.Info = undefined;
  const ref = xmpRef(doc);
  doc.catalog.delete(PDFName.of('Metadata'));
  if (ref) doc.context.delete(ref);
}

export async function stripMetadata(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  stripMetadataInPlace(doc);
  return doc.save({ useObjectStreams: true });
}
```

Export everything from the edit index.

Run: `pnpm test src/pdf/edit/metadata` → Expected: PASS. (Verified while planning: with `trailerInfo.Info = undefined`, pdf-lib writes no `/Info`.)

- [ ] **Step 4: Tool.** Spec:

- `index.ts`: id `pdf-metadata`, name `PDF Metadata`, description `View, edit or remove a PDF's title, author and other document properties`, icon `Tags`.
- Single-file pattern. On pick, `getMetadata(file.bytes)` runs in an effect with an `alive` guard. It fills `values: Record<MetadataField, string>` and shows errors inline.
- Fields: `Label htmlFor` + `Input` for each, with labels exactly "Title", "Author", "Subject", "Keywords", "Creator (application)", "Producer".
- Read-only lines: "Created: …" and "Modified: …", using `toLocaleString()`, or "—".
- When `hasXmp`: `Badge` "XMP metadata present", with a muted line "It will be updated to match."
- Buttons:
  - `Save metadata` (solid) → `job.run({ kind: 'save', patch: changedFields })` → `setMetadata` → `deriveFilename(name, 'metadata', 'pdf')`.
  - `Remove all metadata` (ghost, danger tone) → `job.run({ kind: 'strip' })` → `stripMetadata` → `deriveFilename(name, 'no-metadata', 'pdf')`.
- `ResultFiles` carries the `UNENCRYPTED_NOTE` rule from Task 15.

- [ ] **Step 5: Failing e2e** — `test/e2e/pdf-metadata.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDocument, PDFName } from 'pdf-lib';

test('edits the title and keeps XMP in sync', async ({ page }) => {
  await page.goto('/pdf-metadata');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/metadata.pdf');
  const title = page.getByLabel('Title', { exact: true });
  await expect(title).toHaveValue('Quarterly report');
  await expect(page.getByText('XMP metadata present')).toBeVisible();
  await title.fill('Annual report');
  await page.getByRole('button', { name: 'Save metadata' }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const d = await promise;
  expect(d.suggestedFilename()).toBe('metadata.metadata.pdf');
  const bytes = readFileSync((await d.path())!);
  expect((await PDFDocument.load(bytes)).getTitle()).toBe('Annual report');
  expect(bytes.toString('latin1')).toContain(
    '<rdf:li xml:lang="x-default">Annual report</rdf:li>',
  );
});

test('removes all metadata', async ({ page }) => {
  await page.goto('/pdf-metadata');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/metadata.pdf');
  await page.getByRole('button', { name: 'Remove all metadata' }).click();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const doc = await PDFDocument.load(
    readFileSync((await (await promise).path())!),
  );
  expect(doc.getTitle()).toBeUndefined();
  expect(doc.catalog.has(PDFName.of('Metadata'))).toBe(false);
});
```

Add `'/pdf-metadata'` to `TOOL_ROUTES` and to `ROUTES` in `encrypted.spec.ts`. Run both specs → Expected: PASS. (`setMetadata` saves with object streams, but the XMP stream is never inside one, so the `latin1` check sees it.)

- [ ] **Step 6: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/pdf/edit src/tools/pdf-metadata test/fixtures scripts/gen-fixtures.ts test/e2e
git commit -m "feat(pdf-metadata): view, edit and strip Info with XMP kept in sync

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Protect (`pdf-protect`) and Unlock (`pdf-unlock`)

**Files:**

- Create: `src/tools/pdf-protect/index.ts`, `Tool.tsx`, `store.ts`, `lib/permissions.ts`, `lib/permissions.test.ts`
- Create: `src/tools/pdf-unlock/index.ts`, `Tool.tsx`
- Create: `test/e2e/pdf-protect-unlock.spec.ts`
- Modify: `test/e2e/global-setup.ts`

**Interfaces:**

- Consumes: Task 14 (`qpdf`, `EncryptOptions`, `Permissions`, `qpdfHandlers` in tests), Task 15 (`PasswordPrompt`, `PdfDropzone` `unlock`).
- Produces (`lib/permissions.ts`):
  - `interface PermissionChoices { printing: 'none' | 'low' | 'full'; modify: boolean; copy: boolean; annotate: boolean; fillForms: boolean; assemble: boolean }`
  - `DEFAULT_PERMISSIONS: PermissionChoices`
  - `toQpdfPermissions(c: PermissionChoices): Permissions`
  - `interface PasswordInput { userPassword: string; confirmPassword: string; ownerPassword: string }`
  - `validatePasswords(p: PasswordInput): ToolError | null`
  - `randomOwnerPassword(): string` (48 hex chars from `crypto.getRandomValues`)
  - `buildEncryptOptions(p: PasswordInput, c: PermissionChoices, random?: () => string): EncryptOptions`

- [ ] **Step 1: Failing tests** — `lib/permissions.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { run } from '@arshad-shah/qpdf-wasm';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { qpdfHandlers } from '@/pdf/qpdf/handlers';
import {
  buildEncryptOptions,
  DEFAULT_PERMISSIONS,
  randomOwnerPassword,
  toQpdfPermissions,
  validatePasswords,
} from './permissions';

const ctx = { signal: new AbortController().signal, progress: () => {} };
const pw = (over = {}) => ({
  userPassword: 'open-pw',
  confirmPassword: 'open-pw',
  ownerPassword: '',
  ...over,
});

describe('protect permissions', () => {
  it('maps choices to qpdf flags', () => {
    expect(toQpdfPermissions(DEFAULT_PERMISSIONS)).toEqual({
      print: 'full',
      modify: 'none',
      extract: false,
      annotate: true,
      form: true,
      assemble: false,
    });
  });
  it('validates passwords', () => {
    expect(
      validatePasswords(pw({ userPassword: '', confirmPassword: '' }))?.message,
    ).toBe('Enter a password to open the file');
    expect(validatePasswords(pw({ confirmPassword: 'x' }))?.message).toBe(
      'The passwords do not match',
    );
    expect(validatePasswords(pw({ ownerPassword: 'open-pw' }))?.message).toBe(
      'The permissions password must be different from the open password',
    );
    expect(validatePasswords(pw())).toBeNull();
  });
  it('uses a random owner password when none is given', () => {
    expect(
      buildEncryptOptions(pw(), DEFAULT_PERMISSIONS, () => 'R').ownerPassword,
    ).toBe('R');
    expect(randomOwnerPassword()).toMatch(/^[0-9a-f]{48}$/);
    expect(() =>
      buildEncryptOptions(pw({ confirmPassword: 'x' }), DEFAULT_PERMISSIONS),
    ).toThrow('The passwords do not match');
  });
  it('produces real AES-256 encryption with the chosen permissions', async () => {
    const enc = (
      await qpdfHandlers.encrypt(
        ctx,
        await makeTextPdf({ pages: 1 }),
        buildEncryptOptions(pw(), DEFAULT_PERMISSIONS),
      )
    ).value.bytes;
    const r = await run(['--show-encryption', '--password=open-pw', 'in.pdf'], {
      'in.pdf': enc,
    });
    expect(r.stdout).toContain('R = 6');
    expect(r.stdout).toContain('file encryption method: AESv3');
    expect(r.stdout).toContain('extract for any purpose: not allowed');
    expect(r.stdout).toContain('print high resolution: allowed');
    expect(r.stdout).toContain('modify annotations: allowed');
    expect(r.stdout).toContain('modify forms: allowed');
  });
  it('unlock needs a real password even for permissions-only files (no cracking)', async () => {
    const enc = (
      await qpdfHandlers.encrypt(ctx, await makeTextPdf({ pages: 1 }), {
        userPassword: '',
        ownerPassword: 'owner',
      })
    ).value.bytes;
    await expect(qpdfHandlers.decrypt(ctx, enc, 'guess')).rejects.toMatchObject(
      { code: 'WRONG_PASSWORD' },
    );
    expect(
      (await qpdfHandlers.decrypt(ctx, enc, 'owner')).value.bytes.length,
    ).toBeGreaterThan(0);
  });
});
```

Run: `pnpm test src/tools/pdf-protect` → Expected: FAIL.

- [ ] **Step 2: Implement** — `lib/permissions.ts`

```ts
import type { EncryptOptions, Permissions } from '@/pdf/qpdf';
import { ToolError } from '@/shared/lib/errors';

export interface PermissionChoices {
  printing: 'none' | 'low' | 'full';
  modify: boolean;
  copy: boolean;
  annotate: boolean;
  fillForms: boolean;
  assemble: boolean;
}

export const DEFAULT_PERMISSIONS: PermissionChoices = {
  printing: 'full',
  modify: false,
  copy: false,
  annotate: true,
  fillForms: true,
  assemble: false,
};

export function toQpdfPermissions(c: PermissionChoices): Permissions {
  return {
    print: c.printing,
    modify: c.modify ? 'all' : 'none',
    extract: c.copy,
    annotate: c.annotate,
    form: c.fillForms,
    assemble: c.assemble,
  };
}

export interface PasswordInput {
  userPassword: string;
  confirmPassword: string;
  ownerPassword: string;
}

export function validatePasswords(p: PasswordInput): ToolError | null {
  const bad = (m: string) => new ToolError('INVALID_INPUT', m);
  if (!p.userPassword) return bad('Enter a password to open the file');
  if (p.userPassword !== p.confirmPassword)
    return bad('The passwords do not match');
  if (p.ownerPassword && p.ownerPassword === p.userPassword)
    return bad(
      'The permissions password must be different from the open password',
    );
  return null;
}

export function randomOwnerPassword(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** A blank permissions password becomes a random one: permissions stay locked for everyone. */
export function buildEncryptOptions(
  p: PasswordInput,
  c: PermissionChoices,
  random = randomOwnerPassword,
): EncryptOptions {
  const err = validatePasswords(p);
  if (err) throw err;
  return {
    userPassword: p.userPassword,
    ownerPassword: p.ownerPassword || random(),
    permissions: toQpdfPermissions(c),
  };
}
```

Run: `pnpm test src/tools/pdf-protect` → Expected: PASS.

- [ ] **Step 3: Protect tool.** Spec:

- `index.ts`: id `pdf-protect`, name `Protect PDF`, description `Add a password and permission restrictions to a PDF (AES-256)`, icon `Lock`.
- `store.ts`: `usePermissionSettings`, `toolId: 'pdf-protect'`, `initial: { ...DEFAULT_PERMISSIONS }`, with a `setPermissions(patch: Partial<PermissionChoices>)` action. Passwords are **never** stored; they live in component state only.
- Single-file pattern (the unlock flow defaults on, so an encrypted input is decrypted first and re-protected with the new password).
- Password inputs (`Input type="password"`, `autoComplete="new-password"`):
  - "Password to open"
  - "Confirm password"
  - "Permissions password (optional)", with the muted hint "Leave blank to lock the permissions with a random password nobody knows."
- Permissions:
  - `Label htmlFor="pp-print"` "Printing" + `Select`: `none` "Not allowed", `low` "Low resolution", `full` "High resolution".
  - `Checkbox` + `Label` for each: "Allow editing", "Allow copying text and images", "Allow comments", "Allow filling forms", "Allow page assembly".
- Note (`Text size="sm" tone="muted"`): "Uses AES-256. PDF readers enforce the permissions; the file itself cannot stop a determined user from ignoring them."
- `Button` "Protect PDF". `validatePasswords` runs live; its message shows under the inputs and disables the button.
- Job: `qpdf.encrypt(file.bytes, buildEncryptOptions(...), ctx.signal)` → `{ name: deriveFilename(name, 'protected', 'pdf'), bytes, detail: 'AES-256' }`. Any qpdf warnings go into `detail`.

- [ ] **Step 4: Unlock tool.** Spec:

- `index.ts`: id `pdf-unlock`, name `Unlock PDF`, description `Remove the password from a PDF you have the password for`, icon `LockOpen`.
- `PdfDropzone unlock={false}`, single-file pattern.
- On pick, `qpdf.inspect(file.bytes)` runs in an effect with an `alive` guard, giving `info`.
  - `!info.encrypted`: `Alert status="info"` "This PDF isn't password-protected. There is nothing to unlock."
  - Otherwise render `PasswordPrompt` with `fileName={file.name}`, `submitLabel="Unlock PDF"`, `busy={job.status === 'running'}`, and:
    - `description`: `info.needsPassword ? 'Enter the password to open this file.' : 'This file opens without a password but has permission restrictions. Enter its permissions password to remove them.'`
    - `error`: `job.error?.code === 'WRONG_PASSWORD' ? 'That password is not correct. Try again.' : null`
    - `onSubmit`: `(pw) => job.run(file, pw)`
- Job: `qpdf.decrypt(source.bytes, password, ctx.signal)` → `{ name: deriveFilename(name, 'unlocked', 'pdf'), bytes, detail: 'Password removed' }`.
- `JobPanel` renders for every status except a `WRONG_PASSWORD` error, which the prompt already shows.
- `PasswordPrompt` never submits an empty password, so permissions-only files still need the real permissions password ("no cracking", pinned by the Step 1 test).

- [ ] **Step 5: Failing e2e** — `test/e2e/pdf-protect-unlock.spec.ts`

```ts
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { inspect } from '@arshad-shah/qpdf-wasm';
import { PDFDocument } from 'pdf-lib';

test('protects a PDF and unlocks it again (round trip)', async ({ page }) => {
  await page.goto('/pdf-protect');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await page.getByLabel('Password to open', { exact: true }).fill('s3cret');
  await page.getByLabel('Confirm password', { exact: true }).fill('s3cret');
  await page
    .getByRole('checkbox', { name: 'Allow copying text and images' })
    .click();
  await page.getByRole('button', { name: 'Protect PDF' }).click();
  let promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  let d = await promise;
  expect(d.suggestedFilename()).toBe('text-3.protected.pdf');
  const protectedPath = (await d.path())!;
  expect(
    await inspect(new Uint8Array(readFileSync(protectedPath))),
  ).toMatchObject({ encrypted: true, needsPassword: true });

  await page.goto('/pdf-unlock');
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'text-3.protected.pdf',
      mimeType: 'application/pdf',
      buffer: readFileSync(protectedPath),
    });
  const password = page.getByLabel('Password for text-3.protected.pdf', {
    exact: true,
  });
  await password.fill('wrong');
  await page.getByRole('button', { name: 'Unlock PDF' }).click();
  await expect(
    page.getByText('That password is not correct. Try again.'),
  ).toBeVisible();
  await password.fill('s3cret');
  await page.getByRole('button', { name: 'Unlock PDF' }).click();
  promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  d = await promise;
  expect(d.suggestedFilename()).toBe('text-3.protected.unlocked.pdf');
  const plain = new Uint8Array(readFileSync((await d.path())!));
  expect(await inspect(plain)).toMatchObject({ encrypted: false });
  expect((await PDFDocument.load(plain)).getPageCount()).toBe(3);
});

test('unlock explains when there is nothing to unlock', async ({ page }) => {
  await page.goto('/pdf-unlock');
  await page
    .locator('input[type=file]')
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(
    page.getByText(
      "This PDF isn't password-protected. There is nothing to unlock.",
    ),
  ).toBeVisible();
});
```

Add `'/pdf-protect'` and `'/pdf-unlock'` to `TOOL_ROUTES`. Run the spec → Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add src/tools/pdf-protect src/tools/pdf-unlock test/e2e/pdf-protect-unlock.spec.ts test/e2e/global-setup.ts
git commit -m "feat(pdf-protect, pdf-unlock): AES-256 protection and password removal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Compression — content-stream walker and image inventory

**Files:**

- Create: `src/pdf/compress/content-ops.ts`, `content-ops.test.ts`, `inventory.ts`, `inventory.test.ts`
- Modify: `test/fixtures/builders.ts`, `test/fixtures/builders.test.ts`, `scripts/gen-fixtures.ts`

**Interfaces:**

- Consumes: pdf-lib low-level API (`PDFRawStream`, `PDFDict`, `PDFArray`, `PDFName`, `PDFNumber`, `PDFRef`, `decodePDFRawStream`).
- Produces:
  - `type Operand = number | string | null`. Names come without the slash; strings, arrays and dicts collapse to `null`.
  - `interface Op { op: string; operands: Operand[] }`
  - `contentOps(bytes: Uint8Array): Generator<Op>`
  - `type Matrix = [number, number, number, number, number, number]`, `IDENTITY`, `multiply(m: Matrix, n: Matrix): Matrix`
  - `decodeStream(stream: PDFRawStream): Uint8Array | null`
  - `filtersOf(dict: PDFDict): string[]`, `predictorOf(dict: PDFDict): number`
  - `placementDpi(doc: PDFDocument): Map<string, number>`. Keyed by `ref.toString()`, it holds the **lowest** effective DPI over all placements (pages and nested form XObjects).
  - `interface ClassifyInput { filters: string[]; colorSpace: string; bitsPerComponent: number; imageMask: boolean; hasDecode: boolean; colorKeyMask: boolean; predictor: number; smask: 'none' | 'ok' | 'unsupported' | 'shared' }`
  - `classifyImage(i: ClassifyInput): string | null` (the reason it is ineligible, or `null`)
  - `interface ImageEntry { ref: PDFRef; key: string; width: number; height: number; bitsPerComponent: number; filter: string | null; colorSpace: string; components: number | null; smask: PDFRef | null; encodedBytes: number; effectiveDpi: number | null; eligible: boolean; reason: string | null }`
  - `inventoryImages(doc: PDFDocument): ImageEntry[]`. Excludes images that serve only as another image's SMask.
- Fixture: `makeImageHeavyPdf(): Promise<Uint8Array>` (4 pages, title "Heavy images"), generated as `images-heavy.pdf`:
  - Page 1: Flate RGB 1000×750 noise, drawn 240×180 pt (300 DPI).
  - Page 2: DCT RGB 1000×750 (q95), drawn 240×180 pt (300 DPI).
  - Page 3: Flate RGB 600×600 with a Flate gray SMask, drawn 144×144 pt (300 DPI).
  - Page 4: Flate DeviceCMYK 64×64 and a 1-bit DeviceGray 64×64.

- [ ] **Step 1: Fixture.** Append to `builders.ts` (import `pushGraphicsState`, `popGraphicsState`, `concatTransformationMatrix`, `drawObject`, `PDFPage`, `PDFRef` from pdf-lib; `encodeJpeg`, `noiseImage`, `radialAlpha` from `./images`):

```ts
function placeImage(
  page: PDFPage,
  ref: PDFRef,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const name = page.node.newXObject('Im', ref);
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(w, 0, 0, h, x, y),
    drawObject(name),
    popGraphicsState(),
  );
}

export async function makeImageHeavyPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Heavy images');
  const ctx = doc.context;
  const image = (
    contents: Uint8Array,
    dict: Record<string, unknown>,
    filter: 'flate' | 'raw',
  ) =>
    ctx.register(
      filter === 'flate'
        ? ctx.flateStream(contents, {
            Type: 'XObject',
            Subtype: 'Image',
            BitsPerComponent: 8,
            ...dict,
          } as never)
        : ctx.stream(contents, {
            Type: 'XObject',
            Subtype: 'Image',
            BitsPerComponent: 8,
            ...dict,
          } as never),
    );
  placeImage(
    doc.addPage([612, 792]),
    image(
      noiseImage(1000, 750, 3, 1),
      { Width: 1000, Height: 750, ColorSpace: 'DeviceRGB' },
      'flate',
    ),
    72,
    400,
    240,
    180,
  );
  placeImage(
    doc.addPage([612, 792]),
    image(
      encodeJpeg(1000, 750, noiseImage(1000, 750, 4, 2), 95),
      {
        Width: 1000,
        Height: 750,
        ColorSpace: 'DeviceRGB',
        Filter: 'DCTDecode',
      },
      'raw',
    ),
    72,
    400,
    240,
    180,
  );
  const mask = image(
    radialAlpha(600, 600),
    { Width: 600, Height: 600, ColorSpace: 'DeviceGray' },
    'flate',
  );
  placeImage(
    doc.addPage([612, 792]),
    image(
      noiseImage(600, 600, 3, 3),
      { Width: 600, Height: 600, ColorSpace: 'DeviceRGB', SMask: mask },
      'flate',
    ),
    72,
    400,
    144,
    144,
  );
  const p4 = doc.addPage([612, 792]);
  placeImage(
    p4,
    image(
      noiseImage(64, 64, 4, 4),
      { Width: 64, Height: 64, ColorSpace: 'DeviceCMYK' },
      'flate',
    ),
    72,
    600,
    72,
    72,
  );
  placeImage(
    p4,
    image(
      new Uint8Array(8 * 64).fill(0xaa),
      { Width: 64, Height: 64, ColorSpace: 'DeviceGray', BitsPerComponent: 1 },
      'flate',
    ),
    200,
    600,
    72,
    72,
  );
  return doc.save({ useObjectStreams: false });
}
```

(`as never` bridges pdf-lib's `LiteralObject` typing for the spread. If `pnpm typecheck` accepts the literal without it, drop the cast.) Add `'images-heavy.pdf': await makeImageHeavyPdf()` to `gen-fixtures.ts`. Add a builder test: pdf-lib loads it with 4 pages, title "Heavy images".

- [ ] **Step 2: Failing tests** — `content-ops.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { contentOps } from './content-ops';

const enc = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const ops = (b: Uint8Array) => [...contentOps(b)];

describe('contentOps', () => {
  it('parses numbers, names and operators', () => {
    expect(ops(enc('q 100 0 0 50 10 20 cm /Im1 Do Q'))).toEqual([
      { op: 'q', operands: [] },
      { op: 'cm', operands: [100, 0, 0, 50, 10, 20] },
      { op: 'Do', operands: ['Im1'] },
      { op: 'Q', operands: [] },
    ]);
    expect(ops(enc('.5 -3 +2.25 0 0 1 cm'))[0].operands).toEqual([
      0.5, -3, 2.25, 0, 0, 1,
    ]);
  });
  it('skips strings (escapes, nesting), hex strings, arrays, dicts and comments', () => {
    const r = ops(
      enc(
        'BT (a\\)b(c)) Tj [(A) -120 (B)] TJ <00ff> Tj % note\n/P << /MCID 0 /N << /A 1 >> >> BDC EMC ET',
      ),
    );
    expect(r.map((o) => o.op)).toEqual([
      'BT',
      'Tj',
      'TJ',
      'Tj',
      'BDC',
      'EMC',
      'ET',
    ]);
    expect(r[2].operands).toEqual([null]);
    expect(r[4].operands).toEqual(['P', null]);
  });
  it('skips inline image data', () => {
    const b = new Uint8Array([
      ...enc('q BI /W 2 /H 1 /CS /G /BPC 8 ID '),
      0x01,
      0x45,
      0x49,
      0x02,
      ...enc(' EI Q'),
    ]);
    expect(ops(b).map((o) => o.op)).toEqual(['q', 'BI', 'Q']);
  });
});
```

`inventory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { concatTransformationMatrix, drawObject, PDFDocument } from 'pdf-lib';
import { makeImageHeavyPdf } from '../../../test/fixtures/builders';
import { noiseImage } from '../../../test/fixtures/images';
import {
  classifyImage,
  inventoryImages,
  multiply,
  placementDpi,
  type ClassifyInput,
} from './inventory';

const base: ClassifyInput = {
  filters: ['FlateDecode'],
  colorSpace: 'DeviceRGB',
  bitsPerComponent: 8,
  imageMask: false,
  hasDecode: false,
  colorKeyMask: false,
  predictor: 1,
  smask: 'none',
};

describe('classifyImage', () => {
  it.each([
    [{}, null],
    [{ filters: ['DCTDecode'], colorSpace: 'ICCBased(3)' }, null],
    [{ filters: [], colorSpace: 'DeviceGray' }, null],
    [{ colorSpace: 'DeviceCMYK' }, 'CMYK colour'],
    [{ colorSpace: 'ICCBased(4)' }, 'CMYK colour'],
    [{ colorSpace: 'Indexed' }, 'Indexed colour'],
    [{ colorSpace: 'Separation' }, 'DeviceN/Separation colour'],
    [{ filters: ['JBIG2Decode'] }, 'JBIG2'],
    [{ filters: ['JPXDecode'] }, 'JPEG 2000'],
    [{ filters: ['CCITTFaxDecode'] }, 'CCITT fax'],
    [{ bitsPerComponent: 1 }, '1-bit'],
    [{ bitsPerComponent: 16 }, '16-bit'],
    [{ imageMask: true }, 'image mask'],
    [{ predictor: 2 }, 'TIFF predictor'],
    [{ smask: 'unsupported' }, 'unsupported soft mask'],
    [{ smask: 'shared' }, 'shared soft mask'],
  ] as [Partial<ClassifyInput>, string | null][])('%j → %s', (over, reason) => {
    expect(classifyImage({ ...base, ...over })).toBe(reason);
  });
});

describe('inventory', () => {
  it('lists images with their effective DPI and eligibility', async () => {
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    const list = inventoryImages(doc);
    expect(list).toHaveLength(5); // the SMask is not listed on its own
    const [rgb, dct, masked, cmyk, oneBit] = list;
    expect(rgb).toMatchObject({
      width: 1000,
      filter: 'FlateDecode',
      colorSpace: 'DeviceRGB',
      eligible: true,
    });
    expect(rgb.effectiveDpi).toBeCloseTo(300, 0);
    expect(dct).toMatchObject({ filter: 'DCTDecode', eligible: true });
    expect(masked.smask).not.toBeNull();
    expect(masked.effectiveDpi).toBeCloseTo(300, 0);
    expect(cmyk).toMatchObject({ eligible: false, reason: 'CMYK colour' });
    expect(oneBit).toMatchObject({ eligible: false, reason: '1-bit' });
  });
  it('follows form XObjects and their /Matrix, keeping the lowest DPI', async () => {
    const doc = await PDFDocument.create();
    const img = doc.context.register(
      doc.context.flateStream(noiseImage(600, 450, 3), {
        Type: 'XObject',
        Subtype: 'Image',
        Width: 600,
        Height: 450,
        ColorSpace: 'DeviceRGB',
        BitsPerComponent: 8,
      }),
    );
    const form = doc.context.register(
      doc.context.stream('q 144 0 0 108 0 0 cm /Im0 Do Q', {
        Type: 'XObject',
        Subtype: 'Form',
        BBox: [0, 0, 612, 792],
        Matrix: [0.5, 0, 0, 0.5, 0, 0],
        Resources: { XObject: { Im0: img } },
      }),
    );
    const page = doc.addPage([612, 792]);
    page.pushOperators(drawObject(page.node.newXObject('Fm', form)));
    // Also drawn directly, larger (lower DPI): 600 px over 4 in = 150 DPI.
    page.pushOperators(
      concatTransformationMatrix(288, 0, 0, 216, 0, 0),
      drawObject(page.node.newXObject('Im', img)),
    );
    const dpi = placementDpi(await PDFDocument.load(await doc.save()));
    expect([...dpi.values()][0]).toBeCloseTo(150, 0);
  });
  it('multiplies matrices in PDF order', () => {
    expect(multiply([2, 0, 0, 2, 0, 0], [1, 0, 0, 1, 10, 20])).toEqual([
      2, 0, 0, 2, 10, 20,
    ]);
  });
});
```

Run: `pnpm test src/pdf/compress` → Expected: FAIL.

- [ ] **Step 3: Implement** — `src/pdf/compress/content-ops.ts`

```ts
export type Operand = number | string | null;
export interface Op {
  op: string;
  operands: Operand[];
}

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set([
  0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25,
]);
const isRegular = (c: number) => !WS.has(c) && !DELIM.has(c);
const text = (b: Uint8Array, s: number, e: number) =>
  String.fromCharCode(...b.subarray(s, e));
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

function skipString(b: Uint8Array, i: number): number {
  let depth = 0;
  for (; i < b.length; i++) {
    const c = b[i];
    if (c === 0x5c) {
      i++;
      continue;
    }
    if (c === 0x28) depth++;
    else if (c === 0x29 && --depth === 0) return i + 1;
  }
  return b.length;
}

function skipDict(b: Uint8Array, i: number): number {
  let depth = 0;
  while (i < b.length) {
    if (b[i] === 0x28) {
      i = skipString(b, i);
    } else if (b[i] === 0x3c && b[i + 1] === 0x3c) {
      depth++;
      i += 2;
    } else if (b[i] === 0x3e && b[i + 1] === 0x3e) {
      depth--;
      i += 2;
      if (depth === 0) return i;
    } else i++;
  }
  return b.length;
}

/** Inline image data ends at whitespace + "EI" + whitespace (or end). */
function skipInlineImage(b: Uint8Array, i: number): number {
  for (let j = i; j < b.length - 2; j++) {
    if (
      WS.has(b[j]) &&
      b[j + 1] === 0x45 &&
      b[j + 2] === 0x49 &&
      (j + 3 >= b.length || WS.has(b[j + 3]))
    )
      return j + 3;
  }
  return b.length;
}

/** Tokenises a content stream into operators with their (simplified) operands. */
export function* contentOps(b: Uint8Array): Generator<Op> {
  let i = 0;
  let operands: Operand[] = [];
  const arrays: number[] = [];
  while (i < b.length) {
    const c = b[i];
    if (WS.has(c)) {
      i++;
    } else if (c === 0x25) {
      while (i < b.length && b[i] !== 0x0a && b[i] !== 0x0d) i++;
    } else if (c === 0x2f) {
      let j = i + 1;
      while (j < b.length && isRegular(b[j])) j++;
      operands.push(text(b, i + 1, j));
      i = j;
    } else if (c === 0x28) {
      i = skipString(b, i);
      operands.push(null);
    } else if (c === 0x3c) {
      if (b[i + 1] === 0x3c) i = skipDict(b, i);
      else {
        while (i < b.length && b[i] !== 0x3e) i++;
        i++;
      }
      operands.push(null);
    } else if (c === 0x5b) {
      arrays.push(operands.length);
      i++;
    } else if (c === 0x5d) {
      operands.length = arrays.pop() ?? operands.length;
      operands.push(null);
      i++;
    } else if (!isRegular(c)) {
      i++; // stray ) > { }
    } else {
      let j = i;
      while (j < b.length && isRegular(b[j])) j++;
      const token = text(b, i, j);
      i = j;
      if (NUMBER.test(token)) operands.push(Number(token));
      else if (token === 'true' || token === 'false' || token === 'null')
        operands.push(null);
      else if (token === 'ID') {
        i = skipInlineImage(b, i);
        operands = [];
      } else {
        yield { op: token, operands };
        operands = [];
      }
    }
  }
}
```

`src/pdf/compress/inventory.ts`:

```ts
import {
  decodePDFRawStream,
  PDFArray,
  PDFBool,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
  type PDFDocument,
  type PDFObject,
  type PDFPage,
} from 'pdf-lib';
import { contentOps } from './content-ops';

export type Matrix = [number, number, number, number, number, number];
export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m then n (PDF row-vector convention: CTM' = m × CTM). */
export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

const nameOf = (o: PDFObject | undefined) =>
  o instanceof PDFName ? o.decodeText() : null;
const num = (d: PDFDict, key: string, fallback: number) => {
  const v = d.lookup(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : fallback;
};

export function decodeStream(stream: PDFRawStream): Uint8Array | null {
  try {
    return decodePDFRawStream(stream).decode();
  } catch {
    return null;
  }
}

export function filtersOf(dict: PDFDict): string[] {
  const f = dict.lookup(PDFName.of('Filter'));
  if (f instanceof PDFName) return [f.decodeText()];
  if (f instanceof PDFArray)
    return Array.from(
      { length: f.size() },
      (_, k) => nameOf(f.lookup(k)) ?? '?',
    );
  return [];
}

export function predictorOf(dict: PDFDict): number {
  let p = dict.lookup(PDFName.of('DecodeParms'));
  if (p instanceof PDFArray) p = p.lookup(0);
  return p instanceof PDFDict ? num(p, 'Predictor', 1) : 1;
}

function matrixOf(dict: PDFDict): Matrix {
  const m = dict.lookup(PDFName.of('Matrix'));
  if (m instanceof PDFArray && m.size() === 6) {
    const v = m
      .asArray()
      .map((x) => (x instanceof PDFNumber ? x.asNumber() : Number.NaN));
    if (v.every(Number.isFinite)) return v as Matrix;
  }
  return IDENTITY;
}

function pageContent(doc: PDFDocument, page: PDFPage): Uint8Array | null {
  const contents = page.node.Contents();
  if (!contents) return null;
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((r) => doc.context.lookup(r))
      : [contents];
  const parts: Uint8Array[] = [];
  for (const s of streams) {
    if (!(s instanceof PDFRawStream)) return null;
    const d = decodeStream(s);
    if (!d) return null;
    parts.push(d, Uint8Array.of(0x0a));
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const MAX_FORM_DEPTH = 8;

export function placementDpi(doc: PDFDocument): Map<string, number> {
  const best = new Map<string, number>();
  const record = (ref: PDFRef, ctm: Matrix, w: number, h: number) => {
    const wPt = Math.hypot(ctm[0], ctm[1]);
    const hPt = Math.hypot(ctm[2], ctm[3]);
    if (wPt < 1e-6 || hPt < 1e-6) return;
    const dpi = Math.min(w / (wPt / 72), h / (hPt / 72));
    const key = ref.toString();
    const prev = best.get(key);
    if (prev === undefined || dpi < prev) best.set(key, dpi);
  };
  const walk = (
    content: Uint8Array,
    resources: PDFDict | undefined,
    start: Matrix,
    depth: number,
    seen: ReadonlySet<string>,
  ) => {
    const xo = resources?.lookup(PDFName.of('XObject'));
    const xobjects = xo instanceof PDFDict ? xo : undefined;
    const stack: Matrix[] = [];
    let ctm = start;
    for (const { op, operands } of contentOps(content)) {
      if (op === 'q') stack.push(ctm);
      else if (op === 'Q') ctm = stack.pop() ?? start;
      else if (op === 'cm') {
        const m = operands.slice(-6);
        if (m.length === 6 && m.every((v) => typeof v === 'number'))
          ctm = multiply(m as Matrix, ctm);
      } else if (op === 'Do' && xobjects) {
        const name = operands[operands.length - 1];
        if (typeof name !== 'string') continue;
        const ref = xobjects.get(PDFName.of(name));
        if (!(ref instanceof PDFRef)) continue;
        const stream = doc.context.lookup(ref);
        if (!(stream instanceof PDFRawStream)) continue;
        const subtype = nameOf(stream.dict.lookup(PDFName.of('Subtype')));
        if (subtype === 'Image')
          record(
            ref,
            ctm,
            num(stream.dict, 'Width', 0),
            num(stream.dict, 'Height', 0),
          );
        else if (
          subtype === 'Form' &&
          depth < MAX_FORM_DEPTH &&
          !seen.has(ref.toString())
        ) {
          const inner = decodeStream(stream);
          const res = stream.dict.lookup(PDFName.of('Resources'));
          if (inner)
            walk(
              inner,
              res instanceof PDFDict ? res : resources,
              multiply(matrixOf(stream.dict), ctm),
              depth + 1,
              new Set([...seen, ref.toString()]),
            );
        }
      }
    }
  };
  for (const page of doc.getPages()) {
    const content = pageContent(doc, page);
    if (content) walk(content, page.node.Resources(), IDENTITY, 0, new Set());
  }
  return best;
}

export interface ClassifyInput {
  filters: string[];
  colorSpace: string;
  bitsPerComponent: number;
  imageMask: boolean;
  hasDecode: boolean;
  colorKeyMask: boolean;
  predictor: number;
  smask: 'none' | 'ok' | 'unsupported' | 'shared';
}

const FILTER_REASON: Record<string, string> = {
  JBIG2Decode: 'JBIG2',
  JPXDecode: 'JPEG 2000',
  CCITTFaxDecode: 'CCITT fax',
};
const OK_SPACES = new Set([
  'DeviceRGB',
  'DeviceGray',
  'ICCBased(1)',
  'ICCBased(3)',
]);

/** Why an image must be left untouched, or null when it can be recompressed. */
export function classifyImage(i: ClassifyInput): string | null {
  if (i.imageMask) return 'image mask';
  for (const f of i.filters) if (FILTER_REASON[f]) return FILTER_REASON[f];
  if (i.filters.length > 1) return 'multiple filters';
  const f = i.filters[0] ?? null;
  if (f !== null && f !== 'DCTDecode' && f !== 'FlateDecode')
    return `${f} filter`;
  if (i.colorSpace === 'DeviceCMYK' || i.colorSpace === 'ICCBased(4)')
    return 'CMYK colour';
  if (i.colorSpace === 'DeviceN' || i.colorSpace === 'Separation')
    return 'DeviceN/Separation colour';
  if (i.colorSpace === 'Indexed') return 'Indexed colour';
  if (i.bitsPerComponent === 1) return '1-bit';
  if (i.bitsPerComponent === 16) return '16-bit';
  if (i.bitsPerComponent !== 8) return `${i.bitsPerComponent}-bit`;
  if (!OK_SPACES.has(i.colorSpace)) return `${i.colorSpace} colour`;
  if (i.hasDecode) return 'custom decode array';
  if (i.colorKeyMask) return 'colour-key mask';
  if (f === 'FlateDecode' && i.predictor > 1 && i.predictor < 10)
    return 'TIFF predictor';
  if (i.smask === 'unsupported') return 'unsupported soft mask';
  if (i.smask === 'shared') return 'shared soft mask';
  return null;
}

function colorSpaceOf(
  doc: PDFDocument,
  dict: PDFDict,
): { label: string; components: number | null } {
  const raw = dict.get(PDFName.of('ColorSpace'));
  const cs = raw instanceof PDFRef ? doc.context.lookup(raw) : raw;
  const name = nameOf(cs);
  if (name)
    return {
      label: name,
      components:
        name === 'DeviceRGB'
          ? 3
          : name === 'DeviceGray'
            ? 1
            : name === 'DeviceCMYK'
              ? 4
              : null,
    };
  if (cs instanceof PDFArray) {
    const family = nameOf(cs.lookup(0));
    if (family === 'ICCBased') {
      const s = cs.lookup(1);
      const n =
        s instanceof PDFStream ? s.dict.lookup(PDFName.of('N')) : undefined;
      const count = n instanceof PDFNumber ? n.asNumber() : null;
      return { label: `ICCBased(${count ?? '?'})`, components: count };
    }
    return { label: family ?? 'unknown', components: null };
  }
  return { label: 'unknown', components: null };
}

export interface ImageEntry {
  ref: PDFRef;
  key: string;
  width: number;
  height: number;
  bitsPerComponent: number;
  filter: string | null;
  colorSpace: string;
  components: number | null;
  smask: PDFRef | null;
  encodedBytes: number;
  effectiveDpi: number | null;
  eligible: boolean;
  reason: string | null;
}

export function inventoryImages(doc: PDFDocument): ImageEntry[] {
  const dpi = placementDpi(doc);
  const images: [PDFRef, PDFRawStream][] = [];
  const smaskUse = new Map<string, number>();
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (
      !(obj instanceof PDFRawStream) ||
      nameOf(obj.dict.lookup(PDFName.of('Subtype'))) !== 'Image'
    )
      continue;
    images.push([ref, obj]);
    const sm = obj.dict.get(PDFName.of('SMask'));
    if (sm instanceof PDFRef)
      smaskUse.set(sm.toString(), (smaskUse.get(sm.toString()) ?? 0) + 1);
  }
  const smaskStatus = (ref: PDFRef | null): ClassifyInput['smask'] => {
    if (!ref) return 'none';
    if ((smaskUse.get(ref.toString()) ?? 0) > 1) return 'shared';
    const s = doc.context.lookup(ref);
    if (!(s instanceof PDFRawStream)) return 'unsupported';
    const f = filtersOf(s.dict);
    const p = predictorOf(s.dict);
    const okFilter =
      f.length === 0 ||
      (f.length === 1 && (f[0] === 'FlateDecode' || f[0] === 'DCTDecode'));
    return okFilter &&
      num(s.dict, 'BitsPerComponent', 8) === 8 &&
      !(p > 1 && p < 10)
      ? 'ok'
      : 'unsupported';
  };
  return images
    .filter(([ref]) => !smaskUse.has(ref.toString()))
    .map(([ref, s]) => {
      const d = s.dict;
      const filters = filtersOf(d);
      const cs = colorSpaceOf(doc, d);
      const smRaw = d.get(PDFName.of('SMask'));
      const smask = smRaw instanceof PDFRef ? smRaw : null;
      const mask = d.lookup(PDFName.of('Mask'));
      const reason = classifyImage({
        filters,
        colorSpace: cs.label,
        bitsPerComponent: num(d, 'BitsPerComponent', 8),
        imageMask: (() => {
          const v = d.lookup(PDFName.of('ImageMask'));
          return v instanceof PDFBool && v.asBoolean();
        })(),
        hasDecode: d.has(PDFName.of('Decode')),
        colorKeyMask: mask instanceof PDFArray,
        predictor: predictorOf(d),
        smask: smaskStatus(smask),
      });
      return {
        ref,
        key: ref.toString(),
        width: num(d, 'Width', 0),
        height: num(d, 'Height', 0),
        bitsPerComponent: num(d, 'BitsPerComponent', 8),
        filter: filters[0] ?? null,
        colorSpace: cs.label,
        components: cs.components,
        smask,
        encodedBytes: s.contents.length,
        effectiveDpi: dpi.get(ref.toString()) ?? null,
        eligible: reason === null,
        reason,
      };
    });
}
```

Run: `pnpm test src/pdf/compress` → Expected: PASS. The inventory order follows `enumerateIndirectObjects`, which is ascending object number, i.e. creation order in the fixture. If it differs, sort `list` by `ref.objectNumber` in the test.

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm test && pnpm fixtures
git add src/pdf/compress test/fixtures scripts/gen-fixtures.ts
git commit -m "feat(pdf-compress): content-stream walker, placement DPI and image inventory

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Compression — image recompression core

**Files:**

- Create: `src/pdf/compress/codec.ts`, `pixels.ts`, `pixels.test.ts`, `recompress.ts`, `recompress.test.ts`
- Create: `test/fixtures/jpeg-codec.ts`

**Interfaces:**

- Consumes: Task 18.
- Produces:
  - `interface RawImage { width: number; height: number; channels: 1 | 3; pixels: Uint8Array }`
  - `interface EncodedJpeg { bytes: Uint8Array; channels: 1 | 3 }`
  - `interface ImageCodec { decodeJpeg(bytes: Uint8Array): Promise<RawImage>; encodeJpeg(image: RawImage, quality: number): Promise<EncodedJpeg> }`
  - `resample(img: RawImage, width: number, height: number): RawImage` (area average; downscale)
  - `unpredictPng(data: Uint8Array, columns: number, colors: number, bitsPerComponent?: number): Uint8Array`
  - `toRgba(img: RawImage): Uint8ClampedArray<ArrayBuffer>`
  - `interface ImageSettings { targetDpi: number; quality: number }`
  - `interface ImageReport { total: number; processed: number; unchanged: number; skipped: { reason: string; count: number }[]; bytesBefore: number; bytesAfter: number }`
  - `recompressImages(doc: PDFDocument, settings: ImageSettings, codec: ImageCodec, ctx?: { signal?: AbortSignal; progress?: (p: JobProgress) => void }): Promise<ImageReport>`. It mutates `doc`; the caller saves.
  - `nodeJpegCodec: ImageCodec` (test fixture, jpeg-js)

- [ ] **Step 1: Codec types and Node codec**

`src/pdf/compress/codec.ts`:

```ts
export interface RawImage {
  width: number;
  height: number;
  channels: 1 | 3;
  pixels: Uint8Array;
}
export interface EncodedJpeg {
  bytes: Uint8Array;
  channels: 1 | 3;
}
/** Decode/encode only; resampling is pure JS so it is identical everywhere. */
export interface ImageCodec {
  decodeJpeg(bytes: Uint8Array): Promise<RawImage>;
  encodeJpeg(image: RawImage, quality: number): Promise<EncodedJpeg>;
}
```

`test/fixtures/jpeg-codec.ts`:

```ts
import jpeg from 'jpeg-js';
import type { ImageCodec } from '../../src/pdf/compress/codec';
import { toRgba } from '../../src/pdf/compress/pixels';

/** Pure-JS codec for Node tests (the browser uses OffscreenCanvas). */
export const nodeJpegCodec: ImageCodec = {
  async decodeJpeg(bytes) {
    const d = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: false });
    const channels = d.data.length / (d.width * d.height);
    if (channels !== 1 && channels !== 3)
      throw new Error(`unexpected ${channels} channels`);
    return { width: d.width, height: d.height, channels, pixels: d.data };
  },
  async encodeJpeg(img, quality) {
    const out = jpeg.encode(
      { data: toRgba(img), width: img.width, height: img.height },
      Math.round(quality * 100),
    );
    return { bytes: new Uint8Array(out.data), channels: 3 };
  },
};
```

(Use `@/pdf/compress/...` imports instead of the relative ones if `test/` resolves the alias in `tsconfig.test.json`. It extends the app config, so it should.)

- [ ] **Step 2: Failing tests** — `pixels.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { resample, toRgba, unpredictPng } from './pixels';

const paeth = (a: number, b: number, c: number) => {
  const p = a + b - c;
  const pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};
function predict(
  raw: Uint8Array,
  rowLen: number,
  bpp: number,
  types: number[],
) {
  const rows = raw.length / rowLen;
  const out = new Uint8Array(rows * (rowLen + 1));
  for (let r = 0; r < rows; r++) {
    const t = types[r % types.length];
    out[r * (rowLen + 1)] = t;
    for (let i = 0; i < rowLen; i++) {
      const a = i >= bpp ? raw[r * rowLen + i - bpp] : 0;
      const b = r > 0 ? raw[(r - 1) * rowLen + i] : 0;
      const c = r > 0 && i >= bpp ? raw[(r - 1) * rowLen + i - bpp] : 0;
      const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][t];
      out[r * (rowLen + 1) + 1 + i] = (raw[r * rowLen + i] - pred) & 0xff;
    }
  }
  return out;
}

describe('pixels', () => {
  it('area-averages when downscaling and is a no-op at the same size', () => {
    const g = {
      width: 4,
      height: 2,
      channels: 1 as const,
      pixels: Uint8Array.from([0, 0, 255, 255, 0, 0, 255, 255]),
    };
    expect(resample(g, 2, 1).pixels).toEqual(Uint8Array.from([0, 255]));
    expect(resample(g, 4, 2)).toBe(g);
    const flat = {
      width: 3,
      height: 3,
      channels: 3 as const,
      pixels: new Uint8Array(27).fill(90),
    };
    expect(resample(flat, 2, 2).pixels).toEqual(new Uint8Array(12).fill(90));
  });
  it('reverses every PNG predictor', () => {
    const raw = Uint8Array.from(
      { length: 4 * 3 * 5 },
      (_, i) => (i * 37) % 256,
    ); // 4 px RGB × 5 rows
    expect(unpredictPng(predict(raw, 12, 3, [0, 1, 2, 3, 4]), 4, 3)).toEqual(
      raw,
    );
  });
  it('expands gray and RGB to opaque RGBA', () => {
    expect([
      ...toRgba({ width: 1, height: 1, channels: 1, pixels: Uint8Array.of(7) }),
    ]).toEqual([7, 7, 7, 255]);
    expect([
      ...toRgba({
        width: 1,
        height: 1,
        channels: 3,
        pixels: Uint8Array.of(1, 2, 3),
      }),
    ]).toEqual([1, 2, 3, 255]);
  });
});
```

`recompress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import jpeg from 'jpeg-js';
import {
  concatTransformationMatrix,
  drawObject,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import { makeImageHeavyPdf } from '../../../test/fixtures/builders';
import { nodeJpegCodec } from '../../../test/fixtures/jpeg-codec';
import { recompressImages } from './recompress';

const firstImage = (doc: PDFDocument, page: number) => {
  const xo = doc
    .getPage(page)
    .node.Resources()!
    .lookup(PDFName.of('XObject'), PDFDict);
  return xo.lookup(xo.keys()[0]) as PDFRawStream;
};
const dim = (s: PDFRawStream, k: string) =>
  (s.dict.lookup(PDFName.of(k)) as { asNumber(): number }).asNumber();

describe('recompressImages', () => {
  it('downsamples to the target DPI, keeps SMasks, leaves ineligible images byte-identical', async () => {
    const original = await PDFDocument.load(await makeImageHeavyPdf());
    const cmykBefore = Uint8Array.from(firstImage(original, 3).contents);
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    const report = await recompressImages(
      doc,
      { targetDpi: 150, quality: 0.75 },
      nodeJpegCodec,
    );
    expect(report).toMatchObject({ total: 5, processed: 3, unchanged: 0 });
    expect(report.skipped).toEqual(
      expect.arrayContaining([
        { reason: 'CMYK colour', count: 1 },
        { reason: '1-bit', count: 1 },
      ]),
    );
    expect(report.bytesAfter).toBeLessThan(report.bytesBefore / 4);

    const out = await PDFDocument.load(await doc.save());
    const p1 = firstImage(out, 0);
    expect(p1.dict.lookup(PDFName.of('Filter'))).toEqual(
      PDFName.of('DCTDecode'),
    );
    expect([dim(p1, 'Width'), dim(p1, 'Height')]).toEqual([500, 375]);
    expect(jpeg.decode(p1.contents, { useTArray: true }).width).toBe(500);
    const p3 = firstImage(out, 2);
    const mask = out.context.lookup(
      p3.dict.get(PDFName.of('SMask')),
    ) as PDFRawStream;
    expect([dim(p3, 'Width'), dim(mask, 'Width'), dim(mask, 'Height')]).toEqual(
      [300, 300, 300],
    );
    expect(mask.dict.lookup(PDFName.of('ColorSpace'))).toEqual(
      PDFName.of('DeviceGray'),
    );
    expect(firstImage(out, 3).contents).toEqual(cmykBefore);
  });
  it('re-encodes without downsampling when already at or below the target', async () => {
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    await recompressImages(
      doc,
      { targetDpi: 600, quality: 0.75 },
      nodeJpegCodec,
    );
    expect(dim(firstImage(doc, 0), 'Width')).toBe(1000);
  });
  it('keeps an image when JPEG would be larger', async () => {
    const doc = await PDFDocument.create();
    const ref = doc.context.register(
      doc.context.flateStream(new Uint8Array(64).fill(128), {
        Type: 'XObject',
        Subtype: 'Image',
        Width: 8,
        Height: 8,
        ColorSpace: 'DeviceGray',
        BitsPerComponent: 8,
      }),
    );
    const page = doc.addPage([200, 200]);
    page.pushOperators(
      concatTransformationMatrix(8, 0, 0, 8, 0, 0),
      drawObject(page.node.newXObject('Im', ref)),
    );
    const before = Uint8Array.from(
      (doc.context.lookup(ref) as PDFRawStream).contents,
    );
    const report = await recompressImages(
      doc,
      { targetDpi: 150, quality: 0.75 },
      nodeJpegCodec,
    );
    expect(report).toMatchObject({ processed: 0, unchanged: 1 });
    expect((doc.context.lookup(ref) as PDFRawStream).contents).toEqual(before);
  });
  it('stops when cancelled', async () => {
    const doc = await PDFDocument.load(await makeImageHeavyPdf());
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      recompressImages(doc, { targetDpi: 150, quality: 0.75 }, nodeJpegCodec, {
        signal: ctrl.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('validates settings', async () => {
    const doc = await PDFDocument.create();
    await expect(
      recompressImages(doc, { targetDpi: 10, quality: 0.75 }, nodeJpegCodec),
    ).rejects.toThrow(
      'Target resolution must be a whole number from 36 to 1200 DPI',
    );
  });
});
```

Run: `pnpm test src/pdf/compress` → Expected: FAIL.

- [ ] **Step 3: Implement** — `src/pdf/compress/pixels.ts`

```ts
import { ToolError } from '@/shared/lib/errors';
import type { RawImage } from './codec';

/** Box-filter (area-average) resample; intended for downscaling. */
export function resample(
  img: RawImage,
  width: number,
  height: number,
): RawImage {
  if (width === img.width && height === img.height) return img;
  const { width: w, height: h, channels: c, pixels } = img;
  const out = new Uint8Array(width * height * c);
  const sx = w / width;
  const sy = h / height;
  const acc = new Float64Array(c);
  for (let y = 0; y < height; y++) {
    const y0 = y * sy;
    const y1 = y0 + sy;
    for (let x = 0; x < width; x++) {
      const x0 = x * sx;
      const x1 = x0 + sx;
      acc.fill(0);
      let area = 0;
      for (let yy = Math.floor(y0); yy < Math.min(h, Math.ceil(y1)); yy++) {
        const wy = Math.min(yy + 1, y1) - Math.max(yy, y0);
        for (let xx = Math.floor(x0); xx < Math.min(w, Math.ceil(x1)); xx++) {
          const wgt = (Math.min(xx + 1, x1) - Math.max(xx, x0)) * wy;
          const o = (yy * w + xx) * c;
          for (let k = 0; k < c; k++) acc[k] += pixels[o + k] * wgt;
          area += wgt;
        }
      }
      const p = (y * width + x) * c;
      for (let k = 0; k < c; k++) out[p + k] = Math.round(acc[k] / area);
    }
  }
  return { width, height, channels: c, pixels: out };
}

/** Reverses PNG row predictors (DecodeParms /Predictor ≥ 10). */
export function unpredictPng(
  data: Uint8Array,
  columns: number,
  colors: number,
  bitsPerComponent = 8,
): Uint8Array {
  const bpp = Math.max(1, (colors * bitsPerComponent) >> 3);
  const rowLen = (columns * colors * bitsPerComponent + 7) >> 3;
  const rows = Math.floor(data.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowLen + 1)];
    const src = r * (rowLen + 1) + 1;
    const dst = r * rowLen;
    for (let i = 0; i < rowLen; i++) {
      const x = data[src + i];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const b = r > 0 ? out[dst - rowLen + i] : 0;
      const c = r > 0 && i >= bpp ? out[dst - rowLen + i - bpp] : 0;
      let v: number;
      if (type === 0) v = x;
      else if (type === 1) v = x + a;
      else if (type === 2) v = x + b;
      else if (type === 3) v = x + ((a + b) >> 1);
      else if (type === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else
        throw new ToolError('INVALID_FILE', `Unknown PNG predictor ${type}`);
      out[dst + i] = v & 0xff;
    }
  }
  return out;
}

export function toRgba(img: RawImage): Uint8ClampedArray<ArrayBuffer> {
  const n = img.width * img.height;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (img.channels === 1) out[o] = out[o + 1] = out[o + 2] = img.pixels[i];
    else {
      out[o] = img.pixels[i * 3];
      out[o + 1] = img.pixels[i * 3 + 1];
      out[o + 2] = img.pixels[i * 3 + 2];
    }
    out[o + 3] = 255;
  }
  return out;
}
```

`src/pdf/compress/recompress.ts`:

```ts
import { PDFName, PDFRawStream, type PDFDocument, type PDFRef } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { JobProgress } from '@/shared/state/useJob';
import type { ImageCodec, RawImage } from './codec';
import {
  decodeStream,
  filtersOf,
  inventoryImages,
  predictorOf,
  type ImageEntry,
} from './inventory';
import { resample, unpredictPng } from './pixels';

export interface ImageSettings {
  targetDpi: number;
  quality: number;
}
export interface ImageReport {
  total: number;
  processed: number;
  unchanged: number;
  skipped: { reason: string; count: number }[];
  bytesBefore: number;
  bytesAfter: number;
}

/** Downsample only when meaningfully above target (5% tolerance). */
const DPI_TOLERANCE = 1.05;

const toGray = (img: RawImage): RawImage => {
  if (img.channels === 1) return img;
  const out = new Uint8Array(img.width * img.height);
  for (let i = 0; i < out.length; i++) out[i] = img.pixels[i * 3];
  return { ...img, channels: 1, pixels: out };
};

async function decodePixels(
  stream: PDFRawStream,
  channels: 1 | 3,
  width: number,
  height: number,
  codec: ImageCodec,
): Promise<RawImage | null> {
  const filter = filtersOf(stream.dict)[0] ?? null; // eligible images have at most one filter
  if (filter === 'DCTDecode') {
    const img = await codec.decodeJpeg(stream.contents);
    return img.width === width && img.height === height ? img : null;
  }
  let data = filter === 'FlateDecode' ? decodeStream(stream) : stream.contents;
  if (!data) return null;
  if (predictorOf(stream.dict) >= 10)
    data = unpredictPng(data, width, channels);
  const size = width * height * channels;
  return data.length < size
    ? null
    : { width, height, channels, pixels: data.subarray(0, size) };
}

type Outcome =
  | { before: number; after: number }
  | 'unchanged'
  | { skipped: string };

async function recompressOne(
  doc: PDFDocument,
  e: ImageEntry,
  s: ImageSettings,
  codec: ImageCodec,
): Promise<Outcome> {
  const stream = doc.context.lookup(e.ref) as PDFRawStream;
  const channels = e.components as 1 | 3;
  const image = await decodePixels(
    stream,
    channels,
    e.width,
    e.height,
    codec,
  ).catch(() => null);
  if (!image) return { skipped: 'unreadable image data' };
  let mask: { ref: PDFRef; stream: PDFRawStream; image: RawImage } | null =
    null;
  if (e.smask) {
    const ms = doc.context.lookup(e.smask) as PDFRawStream;
    const mw = (
      ms.dict.lookup(PDFName.of('Width')) as { asNumber(): number }
    ).asNumber();
    const mh = (
      ms.dict.lookup(PDFName.of('Height')) as { asNumber(): number }
    ).asNumber();
    const mi = await decodePixels(ms, 1, mw, mh, codec).catch(() => null);
    if (!mi) return { skipped: 'unreadable soft mask' };
    mask = { ref: e.smask, stream: ms, image: toGray(mi) };
  }
  const scale =
    e.effectiveDpi && e.effectiveDpi > s.targetDpi * DPI_TOLERANCE
      ? s.targetDpi / e.effectiveDpi
      : 1;
  const w = Math.max(1, Math.round(e.width * scale));
  const h = Math.max(1, Math.round(e.height * scale));
  const jpeg = await codec.encodeJpeg(resample(image, w, h), s.quality);
  const newMask = mask
    ? doc.context.flateStream(resample(mask.image, w, h).pixels, {
        Type: 'XObject',
        Subtype: 'Image',
        Width: w,
        Height: h,
        ColorSpace: 'DeviceGray',
        BitsPerComponent: 8,
      })
    : null;
  const before = stream.contents.length + (mask?.stream.contents.length ?? 0);
  const after = jpeg.bytes.length + (newMask?.contents.length ?? 0);
  if (after >= before) return 'unchanged';
  const replacement = doc.context.stream(jpeg.bytes, {
    Type: 'XObject',
    Subtype: 'Image',
    Width: w,
    Height: h,
    BitsPerComponent: 8,
    Filter: 'DCTDecode',
  });
  const keepSpace = jpeg.channels === 3 && e.components === 3;
  replacement.dict.set(
    PDFName.of('ColorSpace'),
    keepSpace
      ? stream.dict.get(PDFName.of('ColorSpace'))!
      : PDFName.of(jpeg.channels === 1 ? 'DeviceGray' : 'DeviceRGB'),
  );
  for (const key of ['Interpolate', 'Intent']) {
    const v = stream.dict.get(PDFName.of(key));
    if (v) replacement.dict.set(PDFName.of(key), v);
  }
  if (mask && newMask) {
    doc.context.assign(mask.ref, newMask); // same ref: no orphaned old mask
    replacement.dict.set(PDFName.of('SMask'), mask.ref);
  }
  doc.context.assign(e.ref, replacement);
  return { before, after };
}

export async function recompressImages(
  doc: PDFDocument,
  settings: ImageSettings,
  codec: ImageCodec,
  ctx: { signal?: AbortSignal; progress?: (p: JobProgress) => void } = {},
): Promise<ImageReport> {
  if (
    !Number.isInteger(settings.targetDpi) ||
    settings.targetDpi < 36 ||
    settings.targetDpi > 1200
  )
    throw new ToolError(
      'INVALID_INPUT',
      'Target resolution must be a whole number from 36 to 1200 DPI',
    );
  if (!(settings.quality >= 0.1 && settings.quality <= 1))
    throw new ToolError(
      'INVALID_INPUT',
      'JPEG quality must be between 10% and 100%',
    );
  const entries = inventoryImages(doc);
  const skipped = new Map<string, number>();
  const skip = (reason: string) =>
    skipped.set(reason, (skipped.get(reason) ?? 0) + 1);
  let processed = 0,
    unchanged = 0,
    bytesBefore = 0,
    bytesAfter = 0;
  const eligible = entries.filter((e) => e.eligible);
  for (const e of entries) if (!e.eligible) skip(e.reason!);
  for (const [i, entry] of eligible.entries()) {
    ctx.signal?.throwIfAborted();
    ctx.progress?.({
      done: i,
      total: eligible.length,
      label: 'Recompressing images',
    });
    const r = await recompressOne(doc, entry, settings, codec);
    if (r === 'unchanged') unchanged++;
    else if ('skipped' in r) skip(r.skipped);
    else {
      processed++;
      bytesBefore += r.before;
      bytesAfter += r.after;
    }
  }
  ctx.signal?.throwIfAborted();
  return {
    total: entries.length,
    processed,
    unchanged,
    skipped: [...skipped]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    bytesBefore,
    bytesAfter,
  };
}
```

Run: `pnpm test src/pdf/compress` → Expected: PASS. In the "cancelled" test, `throwIfAborted` throws a `DOMException` `AbortError`; `toToolError` maps it to `CANCELLED` higher up.

- [ ] **Step 4: Commit**

```bash
pnpm typecheck && pnpm test
git add src/pdf/compress test/fixtures/jpeg-codec.ts
git commit -m "feat(pdf-compress): recompress eligible images, resample SMasks, report per image

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Compression — worker, pipeline and presets

**Files:**

- Create: `src/pdf/compress/canvas-codec.ts`, `prepare.ts`, `pipeline.ts`, `pipeline.test.ts`, `compress.worker.ts`, `client.ts`, `index.ts`

**Interfaces:**

- Consumes: Tasks 14, 16 (`stripMetadataInPlace`), 18 and 19; `loadPdf`; `JobContext`.
- Produces:
  - `canvasCodec: ImageCodec` (browser/worker; `ImageDecoder` when available, else `createImageBitmap`; JPEG via `OffscreenCanvas.convertToBlob`)
  - `interface PrepareOptions { images: ImageSettings | null; stripMetadata: boolean }`
  - `interface PrepareResult { bytes: Uint8Array; images: ImageReport | null }`
  - `prepareForCompression(bytes, opts, codec, ctx?): Promise<PrepareResult>`
  - `interface QpdfSettings { objectStreams: boolean; recompressFlate: boolean; removeUnreferenced: boolean; linearize: boolean }`
  - `interface CompressSettings { images: ImageSettings | null; qpdf: QpdfSettings; stripMetadata: boolean }`
  - `type PresetId = 'lossless' | 'balanced' | 'strong'`, `PRESETS: Record<PresetId, CompressSettings>`
  - `interface StageReport { id: 'images' | 'restructure'; label: string; before: number; after: number }`
  - `interface CompressReport { inputSize: number; outputSize: number; stages: StageReport[]; images: ImageReport | null; warnings: string[]; keptOriginal: boolean }`
  - `interface CompressDeps { prepare(bytes: Uint8Array, opts: PrepareOptions, ctx: JobContext): Promise<PrepareResult>; optimize(bytes: Uint8Array, options: OptimizeOptions, signal: AbortSignal): Promise<{ bytes: Uint8Array; warnings: string[] }> }`
  - `compressPdf(bytes, settings, deps, ctx: JobContext): Promise<{ bytes: Uint8Array; report: CompressReport }>`
  - `browserCompressDeps: CompressDeps` (from `client.ts`)

- [ ] **Step 1: Failing tests** — `pipeline.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { check, optimize } from '@arshad-shah/qpdf-wasm';
import { PDFDocument, PDFName } from 'pdf-lib';
import {
  makeImageHeavyPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { nodeJpegCodec } from '../../../test/fixtures/jpeg-codec';
import { compressPdf, PRESETS, type CompressDeps } from './pipeline';
import { prepareForCompression } from './prepare';

const ctx = () => ({
  signal: new AbortController().signal,
  progress: () => {},
});
const deps: CompressDeps = {
  prepare: (b, o, c) => prepareForCompression(b, o, nodeJpegCodec, c),
  optimize: async (b, o) => {
    const r = await optimize(b, o);
    return { bytes: r.bytes, warnings: r.warnings };
  },
};

describe('compressPdf', () => {
  it('Balanced: much smaller, structurally valid, with a per-stage report', async () => {
    const input = await makeImageHeavyPdf();
    const { bytes, report } = await compressPdf(
      input,
      PRESETS.balanced,
      deps,
      ctx(),
    );
    expect(bytes.length).toBeLessThan(input.length * 0.5);
    expect(report).toMatchObject({
      inputSize: input.length,
      outputSize: bytes.length,
      keptOriginal: false,
    });
    expect(report.stages.map((s) => s.id)).toEqual(['images', 'restructure']);
    expect(report.stages[0].before).toBe(input.length);
    expect(report.images).toMatchObject({ processed: 3 });
    await check(bytes);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(4);
    expect(doc.getTitle()).toBe('Heavy images');
  });
  it('Strong: smaller still, and strips Info and XMP', async () => {
    const input = await makeImageHeavyPdf();
    const balanced = await compressPdf(input, PRESETS.balanced, deps, ctx());
    const strong = await compressPdf(input, PRESETS.strong, deps, ctx());
    expect(strong.bytes.length).toBeLessThan(balanced.bytes.length);
    expect(strong.report.stages[0].label).toBe('Images & metadata');
    const doc = await PDFDocument.load(strong.bytes);
    expect(doc.getTitle()).toBeUndefined();
    expect(doc.catalog.has(PDFName.of('Metadata'))).toBe(false);
  });
  it('Lossless: skips the image stage', async () => {
    const { report } = await compressPdf(
      await makeImageHeavyPdf(),
      PRESETS.lossless,
      deps,
      ctx(),
    );
    expect(report.stages.map((s) => s.id)).toEqual(['restructure']);
    expect(report.images).toBeNull();
  });
  it('keeps the original when the result is not smaller', async () => {
    const input = await makeTextPdf({ pages: 1 });
    const bigger: CompressDeps = {
      ...deps,
      optimize: async (b) => ({
        bytes: new Uint8Array(b.length + 10),
        warnings: ['w'],
      }),
    };
    const { bytes, report } = await compressPdf(
      input,
      PRESETS.lossless,
      bigger,
      ctx(),
    );
    expect(bytes).toBe(input);
    expect(report).toMatchObject({
      keptOriginal: true,
      outputSize: input.length,
      warnings: ['w'],
    });
  });
  it('stops when cancelled', async () => {
    const c = new AbortController();
    c.abort();
    await expect(
      compressPdf(await makeTextPdf({ pages: 1 }), PRESETS.lossless, deps, {
        signal: c.signal,
        progress: () => {},
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
```

Run: `pnpm test src/pdf/compress/pipeline` → Expected: FAIL.

- [ ] **Step 2: Implement**

`prepare.ts`:

```ts
import type { JobProgress } from '@/shared/state/useJob';
// Direct module imports keep fontkit and other edit ops out of the worker bundle.
import { loadPdf } from '@/pdf/edit/load';
import { stripMetadataInPlace } from '@/pdf/edit/metadata';
import type { ImageCodec } from './codec';
import {
  recompressImages,
  type ImageReport,
  type ImageSettings,
} from './recompress';

export interface PrepareOptions {
  images: ImageSettings | null;
  stripMetadata: boolean;
}
export interface PrepareResult {
  bytes: Uint8Array;
  images: ImageReport | null;
}

/** Stage 1 (pdf-lib): image recompression and/or metadata removal. */
export async function prepareForCompression(
  bytes: Uint8Array,
  opts: PrepareOptions,
  codec: ImageCodec,
  ctx: { signal?: AbortSignal; progress?: (p: JobProgress) => void } = {},
): Promise<PrepareResult> {
  if (!opts.images && !opts.stripMetadata) return { bytes, images: null };
  const doc = await loadPdf(bytes);
  const images = opts.images
    ? await recompressImages(doc, opts.images, codec, ctx)
    : null;
  if (opts.stripMetadata) stripMetadataInPlace(doc);
  ctx.signal?.throwIfAborted();
  // qpdf regenerates object streams next; skip pdf-lib's here.
  return { bytes: await doc.save({ useObjectStreams: false }), images };
}
```

`pipeline.ts`:

```ts
import type { OptimizeOptions } from '@arshad-shah/qpdf-wasm';
import type { JobContext } from '@/shared/state/useJob';
import type { PrepareOptions, PrepareResult } from './prepare';
import type { ImageReport, ImageSettings } from './recompress';

export interface QpdfSettings {
  objectStreams: boolean;
  recompressFlate: boolean;
  removeUnreferenced: boolean;
  linearize: boolean;
}
export interface CompressSettings {
  images: ImageSettings | null;
  qpdf: QpdfSettings;
  stripMetadata: boolean;
}
export type PresetId = 'lossless' | 'balanced' | 'strong';

const QPDF_DEFAULT: QpdfSettings = {
  objectStreams: true,
  recompressFlate: true,
  removeUnreferenced: true,
  linearize: false,
};
export const PRESETS: Record<PresetId, CompressSettings> = {
  lossless: { images: null, qpdf: QPDF_DEFAULT, stripMetadata: false },
  balanced: {
    images: { targetDpi: 150, quality: 0.75 },
    qpdf: QPDF_DEFAULT,
    stripMetadata: false,
  },
  strong: {
    images: { targetDpi: 96, quality: 0.6 },
    qpdf: QPDF_DEFAULT,
    stripMetadata: true,
  },
};

export interface StageReport {
  id: 'images' | 'restructure';
  label: string;
  before: number;
  after: number;
}
export interface CompressReport {
  inputSize: number;
  outputSize: number;
  stages: StageReport[];
  images: ImageReport | null;
  warnings: string[];
  keptOriginal: boolean;
}
export interface CompressDeps {
  prepare(
    bytes: Uint8Array,
    opts: PrepareOptions,
    ctx: JobContext,
  ): Promise<PrepareResult>;
  optimize(
    bytes: Uint8Array,
    options: OptimizeOptions,
    signal: AbortSignal,
  ): Promise<{ bytes: Uint8Array; warnings: string[] }>;
}

export async function compressPdf(
  bytes: Uint8Array,
  settings: CompressSettings,
  deps: CompressDeps,
  ctx: JobContext,
): Promise<{ bytes: Uint8Array; report: CompressReport }> {
  ctx.signal.throwIfAborted();
  const stages: StageReport[] = [];
  let current = bytes;
  let images: ImageReport | null = null;
  if (settings.images || settings.stripMetadata) {
    const label = settings.images
      ? settings.stripMetadata
        ? 'Images & metadata'
        : 'Images'
      : 'Metadata';
    ctx.progress({
      done: 0,
      total: 1,
      label: settings.images ? 'Recompressing images' : 'Removing metadata',
    });
    const r = await deps.prepare(
      current,
      { images: settings.images, stripMetadata: settings.stripMetadata },
      ctx,
    );
    stages.push({
      id: 'images',
      label,
      before: current.length,
      after: r.bytes.length,
    });
    current = r.bytes;
    images = r.images;
  }
  ctx.signal.throwIfAborted();
  ctx.progress({ done: 0, total: 1, label: 'Restructuring' });
  const q = settings.qpdf;
  const optimized = await deps.optimize(
    current,
    {
      objectStreams: q.objectStreams ? 'generate' : 'preserve',
      compressStreams: true,
      recompressFlate: q.recompressFlate,
      removeUnreferenced: q.removeUnreferenced,
      linearize: q.linearize,
    },
    ctx.signal,
  );
  stages.push({
    id: 'restructure',
    label: 'Restructure (qpdf)',
    before: current.length,
    after: optimized.bytes.length,
  });
  const keptOriginal = optimized.bytes.length >= bytes.length;
  const out = keptOriginal ? bytes : optimized.bytes;
  return {
    bytes: out,
    report: {
      inputSize: bytes.length,
      outputSize: out.length,
      stages,
      images,
      warnings: optimized.warnings,
      keptOriginal,
    },
  };
}
```

Run: `pnpm test src/pdf/compress/pipeline` → Expected: PASS.

- [ ] **Step 3: Worker, browser codec, client**

`canvas-codec.ts`:

```ts
import { ToolError } from '@/shared/lib/errors';
import type { ImageCodec } from './codec';
import { toRgba } from './pixels';

async function drawable(
  bytes: Uint8Array,
): Promise<{
  image: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
}> {
  const data = bytes as Uint8Array<ArrayBuffer>;
  if (typeof ImageDecoder !== 'undefined') {
    const decoder = new ImageDecoder({
      data,
      type: 'image/jpeg',
      colorSpaceConversion: 'none',
    });
    try {
      const { image } = await decoder.decode();
      return {
        image,
        width: image.displayWidth,
        height: image.displayHeight,
        close: () => {
          image.close();
          decoder.close();
        },
      };
    } catch {
      decoder.close(); // fall through to createImageBitmap
    }
  }
  const bitmap = await createImageBitmap(
    new Blob([data], { type: 'image/jpeg' }),
    { colorSpaceConversion: 'none', premultiplyAlpha: 'none' },
  );
  return {
    image: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

/** Exact pixels in, JPEG out; colour management off so values round-trip. */
export const canvasCodec: ImageCodec = {
  async decodeJpeg(bytes) {
    const src = await drawable(bytes);
    try {
      const canvas = new OffscreenCanvas(src.width, src.height);
      const g = canvas.getContext('2d', { willReadFrequently: true });
      if (!g) throw new ToolError('UNKNOWN', 'Canvas is not available');
      g.drawImage(src.image, 0, 0);
      const { data } = g.getImageData(0, 0, src.width, src.height);
      const rgb = new Uint8Array(src.width * src.height * 3);
      for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
        rgb[j] = data[i];
        rgb[j + 1] = data[i + 1];
        rgb[j + 2] = data[i + 2];
      }
      return { width: src.width, height: src.height, channels: 3, pixels: rgb };
    } finally {
      src.close();
    }
  },
  async encodeJpeg(img, quality) {
    const canvas = new OffscreenCanvas(img.width, img.height);
    const g = canvas.getContext('2d');
    if (!g) throw new ToolError('UNKNOWN', 'Canvas is not available');
    g.putImageData(new ImageData(toRgba(img), img.width, img.height), 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), channels: 3 };
  },
};
```

`compress.worker.ts`:

```ts
import { ownBuffer } from '@/shared/lib/bytes';
import {
  exposeRpc,
  Transferred,
  type RpcContext,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import { canvasCodec } from './canvas-codec';
import {
  prepareForCompression,
  type PrepareOptions,
  type PrepareResult,
} from './prepare';

const handlers = {
  async prepare(
    ctx: RpcContext,
    bytes: Uint8Array,
    opts: PrepareOptions,
  ): Promise<Transferred<PrepareResult>> {
    const r = await prepareForCompression(bytes, opts, canvasCodec, {
      signal: ctx.signal,
      progress: ctx.progress,
    });
    const out = ownBuffer(r.bytes);
    return new Transferred({ bytes: out, images: r.images }, [out.buffer]);
  },
};

export type CompressHandlers = typeof handlers;
exposeRpc(handlers, self as unknown as RpcEndpoint);
```

`client.ts`:

```ts
import { createRpcClient } from '@/shared/lib/worker-rpc';
import { qpdf } from '@/pdf/qpdf';
import type { CompressHandlers } from './compress.worker';
import type { CompressDeps } from './pipeline';

const client = createRpcClient<CompressHandlers>(
  () =>
    new Worker(new URL('./compress.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

export const browserCompressDeps: CompressDeps = {
  prepare(bytes, opts, ctx) {
    const copy = bytes.slice();
    return client.call('prepare', [copy, opts], {
      signal: ctx.signal,
      transfer: [copy.buffer],
      onProgress: ctx.progress,
    });
  },
  optimize: (bytes, options, signal) => qpdf.optimize(bytes, options, signal),
};
```

`index.ts`: export `compressPdf`, `PRESETS` and the types from `pipeline`; `ImageReport` and `ImageSettings` types from `recompress`; `browserCompressDeps` from `client`. Unit tests import the specific modules, never the barrel, so they never touch `Worker`.

Run: `pnpm typecheck` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
pnpm lint && pnpm test
git add src/pdf/compress
git commit -m "feat(pdf-compress): compress worker, qpdf restructure stage, presets, keep-original rule

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: PDF Compressor tool (`pdf-compressor`, re-enabled)

**Files:**

- Delete: `src/tools/PdfCompressor/PdfCompressor.tsx`, `src/tools/PdfCompressor/index.ts`, `src/types/PdfCompressorTypes.ts`
- Create: `src/tools/pdf-compressor/index.ts`, `Tool.tsx`, `store.ts`, `lib/settings.ts`, `lib/settings.test.ts`, `components/CompressReportView.tsx`
- Create: `test/e2e/pdf-compressor.spec.ts`
- Modify: `test/e2e/global-setup.ts`, `test/e2e/encrypted.spec.ts` (add `/pdf-compressor`)

**Interfaces:**

- Consumes: Task 20 (`compressPdf`, `PRESETS`, `browserCompressDeps`, `CompressReport`); `formatBytes`, `formatSizeChange`.
- Produces (`lib/settings.ts`):
  - `type PresetChoice = PresetId | 'custom'`
  - `interface AdvancedSettings { recompressImages: boolean; targetDpi: number; quality: number; objectStreams: boolean; recompressFlate: boolean; removeUnreferenced: boolean; linearize: boolean; stripMetadata: boolean }`
  - `toAdvanced(s: CompressSettings): AdvancedSettings`
  - `fromAdvanced(a: AdvancedSettings): CompressSettings`. DPI is clamped to an integer 50–600 and quality to 0.3–0.95.
  - `matchPreset(a: AdvancedSettings): PresetChoice`
  - `CompressReportView` props: `{ report: CompressReport }`

- [ ] **Step 1: Failing test** — `lib/settings.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { PRESETS } from '@/pdf/compress/pipeline';
import { fromAdvanced, matchPreset, toAdvanced } from './settings';

describe('compressor settings', () => {
  it('round-trips every preset and recognises it', () => {
    for (const id of ['lossless', 'balanced', 'strong'] as const) {
      expect(fromAdvanced(toAdvanced(PRESETS[id]))).toEqual(PRESETS[id]);
      expect(matchPreset(toAdvanced(PRESETS[id]))).toBe(id);
    }
  });
  it('becomes custom when any field differs', () => {
    expect(
      matchPreset({ ...toAdvanced(PRESETS.balanced), linearize: true }),
    ).toBe('custom');
    expect(
      matchPreset({ ...toAdvanced(PRESETS.balanced), targetDpi: 200 }),
    ).toBe('custom');
  });
  it('ignores DPI and quality when images are off, and clamps values', () => {
    expect(
      matchPreset({ ...toAdvanced(PRESETS.lossless), targetDpi: 300 }),
    ).toBe('lossless');
    expect(
      fromAdvanced({
        ...toAdvanced(PRESETS.balanced),
        targetDpi: 10.4,
        quality: 2,
      }).images,
    ).toEqual({ targetDpi: 50, quality: 0.95 });
  });
});
```

Run: `pnpm test src/tools/pdf-compressor` → Expected: FAIL.

- [ ] **Step 2: Implement** — `lib/settings.ts`

```ts
import {
  PRESETS,
  type CompressSettings,
  type PresetId,
} from '@/pdf/compress/pipeline';

export type PresetChoice = PresetId | 'custom';
export interface AdvancedSettings {
  recompressImages: boolean;
  targetDpi: number;
  quality: number;
  objectStreams: boolean;
  recompressFlate: boolean;
  removeUnreferenced: boolean;
  linearize: boolean;
  stripMetadata: boolean;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

export function toAdvanced(s: CompressSettings): AdvancedSettings {
  return {
    recompressImages: s.images !== null,
    targetDpi: s.images?.targetDpi ?? 150,
    quality: s.images?.quality ?? 0.75,
    ...s.qpdf,
    stripMetadata: s.stripMetadata,
  };
}

export function fromAdvanced(a: AdvancedSettings): CompressSettings {
  return {
    images: a.recompressImages
      ? {
          targetDpi: Math.round(clamp(a.targetDpi, 50, 600)),
          quality: clamp(a.quality, 0.3, 0.95),
        }
      : null,
    qpdf: {
      objectStreams: a.objectStreams,
      recompressFlate: a.recompressFlate,
      removeUnreferenced: a.removeUnreferenced,
      linearize: a.linearize,
    },
    stripMetadata: a.stripMetadata,
  };
}

export function matchPreset(a: AdvancedSettings): PresetChoice {
  const mine = JSON.stringify(fromAdvanced(a));
  return (
    (Object.keys(PRESETS) as PresetId[]).find(
      (id) => JSON.stringify(PRESETS[id]) === mine,
    ) ?? 'custom'
  );
}
```

Run: `pnpm test src/tools/pdf-compressor` → Expected: PASS. (`JSON.stringify` compares in key order, and both sides are built by the same object literals, so the key order matches.)

- [ ] **Step 3: Store, manifest, report view, Tool**

- **Delete the old tool:** `git rm -r src/tools/PdfCompressor src/types/PdfCompressorTypes.ts`. Then `grep -rn "PdfCompressor" src` → no matches.
- **`index.ts`:**

```ts
import { Minimize2 } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'pdf-compressor',
  name: 'PDF Compressor',
  description:
    'Shrink PDFs by recompressing images and restructuring the file, with a per-stage report',
  icon: Minimize2,
  category: 'pdf',
  version: '2.0.0',
  isNew: true,
  enabled: true,
  load: () => import('./Tool'),
});
```

- **`store.ts`:** `useCompressorSettings = createToolStore({ toolId: 'pdf-compressor', initial: { preset: 'balanced' as PresetChoice, advanced: toAdvanced(PRESETS.balanced) }, actions: (set, get) => ({ choosePreset: (id: PresetId) => set({ preset: id, advanced: toAdvanced(PRESETS[id]) }), updateAdvanced: (patch: Partial<AdvancedSettings>) => { const advanced = { ...get().advanced, ...patch }; set({ advanced, preset: matchPreset(advanced) }); } }) })`.
- **`CompressReportView`:**
  - A kit `Table` with columns "Stage", "Before", "After", "Change". One row per stage, using `formatBytes` and `formatSizeChange`.
  - If `report.images`:
    - `Text` `Images: ${processed} recompressed, ${unchanged} already optimal, ${skippedTotal} left untouched`.
    - When anything was skipped, a `List` headed "Left untouched" with one `ListItem` `${reason} (${count})` per reason.
  - If `report.warnings.length`: an `Accordion` item "qpdf warnings (n)" with a `<pre className="text-xs">` of the warnings.
- **`Tool.tsx`:**
  - Single-file pattern.
  - `Label` "Preset" + `Tabs value={preset === 'custom' ? '' : preset}` with `TabsTrigger` "Lossless" / "Balanced" / "Strong". When custom, a `Badge` "Custom" sits next to the tabs.
  - Descriptions per preset (`Text size="sm" tone="muted"`):
    - Lossless: "Restructures the file without touching images. Never lowers quality."
    - Balanced: "Downsamples images above 150 DPI and re-encodes them as JPEG at 75% quality. Good for sharing."
    - Strong: "Downsamples images above 96 DPI at 60% quality and removes document metadata. Smallest files."
  - `Accordion type="single"` with an item "Advanced settings". It holds a `Switch` + `Label` for each of: "Recompress images", "Generate object streams", "Recompress Flate streams", "Remove unreferenced objects", "Linearize for fast web view" and "Remove metadata (Info and XMP)". It also holds `Label htmlFor="cmp-dpi"` "Target resolution (DPI)" + `NumberInput` (50–600) and `Label htmlFor="cmp-quality"` "JPEG quality" + `Slider` (0.3–0.95 step 0.05, with a `%` readout); both are disabled when images are off.
  - `Button` "Compress PDF". It runs `job.run(file, fromAdvanced(advanced))` with the job `(ctx, source, settings) => compressPdf(source.bytes, settings, browserCompressDeps, ctx)`.
  - Result inside `JobPanel` (`runningLabel="Compressing"`):
    - If `report.keptOriginal`: `Alert status="info"`, `AlertTitle` "Already optimised", `AlertDescription` `The compressed version was not smaller (${formatBytes(input)} → ${formatBytes(optimizedSize)}), so your original is unchanged. There is nothing to download.` Here `optimizedSize` is the last stage's `after`.
    - Otherwise: `ResultFiles files={[{ name: deriveFilename(name, 'compressed', 'pdf'), bytes, detail: `${formatSizeChange(input, bytes.length)}` }]} inputSize={file.size}` plus the `UNENCRYPTED_NOTE` rule.
    - Then `CompressReportView`.

- [ ] **Step 4: Failing e2e** — `test/e2e/pdf-compressor.spec.ts`

```ts
import { readFileSync, statSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';

const FIXTURE = 'test/fixtures/generated/images-heavy.pdf';

test('Balanced compresses images for real and reports each stage', async ({
  page,
}) => {
  await page.goto('/pdf-compressor');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await page.getByRole('tab', { name: 'Balanced' }).click();
  await page.getByRole('button', { name: 'Compress PDF' }).click();
  await expect(
    page.getByText('Images: 3 recompressed', { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('CMYK colour (1)')).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Restructure (qpdf)' }),
  ).toBeVisible();
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const d = await promise;
  expect(d.suggestedFilename()).toBe('images-heavy.compressed.pdf');
  const bytes = readFileSync((await d.path())!);
  expect(bytes.length).toBeLessThan(statSync(FIXTURE).size * 0.5);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(4);
  const xo = doc
    .getPage(0)
    .node.Resources()!
    .lookup(PDFName.of('XObject'), PDFDict);
  const img = xo.lookup(xo.keys()[0]) as PDFRawStream;
  expect(img.dict.lookup(PDFName.of('Filter'))).toEqual(
    PDFName.of('DCTDecode'),
  );
  // Chromium itself decodes the new JPEG at the downsampled size.
  const size = await page.evaluate(async (arr) => {
    const b = await createImageBitmap(
      new Blob([new Uint8Array(arr)], { type: 'image/jpeg' }),
    );
    return [b.width, b.height];
  }, Array.from(img.contents));
  expect(size).toEqual([500, 375]);
});

test('changing an advanced setting switches the preset to Custom', async ({
  page,
}) => {
  await page.goto('/pdf-compressor');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await page.getByRole('tab', { name: 'Balanced' }).click();
  await page.getByRole('button', { name: 'Advanced settings' }).click();
  await page
    .getByRole('switch', { name: 'Linearize for fast web view' })
    .click();
  await expect(page.getByText('Custom', { exact: true })).toBeVisible();
});
```

Add `'/pdf-compressor'` to `TOOL_ROUTES` and to `ROUTES` in `encrypted.spec.ts`. Run both specs → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A src/tools/pdf-compressor src/tools/PdfCompressor src/types/PdfCompressorTypes.ts test/e2e
git commit -m "feat(pdf-compressor): re-enable with the real compression pipeline and report

Replaces the disabled legacy PdfCompressor.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## PR boundary C — Security & optimise

- [ ] Run the gate. Each command must pass:
  - `pnpm lint` (0 errors)
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`:
    - `find dist -name '*.wasm' | grep -i qpdf` → 1 file.
    - Grep the built JS for `cdn`/`unpkg` → no qpdf, font or pdf.js asset is loaded cross-origin.
  - `pnpm test:e2e` three times in a row, with no flake.
- [ ] Scripted browser pass (one-off):
  - All 14 PDF routes load with no console or page errors (the pdf.js "fake worker" warning is known).
  - In DevTools Network, while protecting a file, the only requests are same-origin (`qpdf-*.wasm`, worker chunks).
- [ ] Write `docs/superpowers/plans/2026-10-01-phase-3-pdf-tools.notes.md`, mirroring the phase 1 notes:
  - Gate results (test counts, three e2e runs).
  - Deviations from this plan, with reasons.
  - Upstream issues opened.
- [ ] Update the spec's **Status** line to "Phases 1 and 3 implemented; phase 4 pending". Commit both docs.
- [ ] Push, then open the PR "PDF tools: Security & optimise (Metadata, Protect, Unlock, Compressor) + password flow".
  - The body lists the encrypted-input behaviour, the compression report and the deletion of the legacy compressor.
  - Merge once green locally.

---

## Spec coverage

| Spec item                                                                                                                                                   | Task(s)                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| §3.5 edit: `imagesToPdf` (PNG/JPEG native; WebP/GIF → PNG via canvas)                                                                                       | 3, 4                                  |
| §3.5 edit: `watermark`, `pageNumbers`, `stamp`                                                                                                              | 7, 8, 10 (geometry 6)                 |
| §3.5 edit: `listFormFields`, `fillForm` (XFA → `UNSUPPORTED_FEATURE`)                                                                                       | 12, 13                                |
| §3.5 edit: `getMetadata` / `setMetadata` (XMP in sync)                                                                                                      | 16                                    |
| §3.5 render: per-page export at a DPI; `extractText`                                                                                                        | 2, 5                                  |
| §3.5 qpdf adapter in its own worker (`optimize`, `encrypt` AES-256, `decrypt`, `inspect`)                                                                   | 14                                    |
| §3.5 compress pipeline: inventory + effective DPI, eligible-image recompression with SMask, ineligible list, qpdf optimize, per-stage report, keep original | 18, 19, 20                            |
| §3.5 presets Lossless / Balanced / Strong + advanced panel                                                                                                  | 20, 21                                |
| §3.5 components: `PasswordPrompt`; `PdfDropzone` handles the password prompt                                                                                | 15                                    |
| §4 tools: pdf-to-images, images-to-pdf, pdf-to-text                                                                                                         | 2, 4, 5                               |
| §4 tools: pdf-watermark, pdf-page-numbers, pdf-sign, pdf-fill-form                                                                                          | 7, 8, 11, 13                          |
| §4 tools: pdf-protect, pdf-unlock, pdf-metadata, pdf-compressor (re-enabled)                                                                                | 17, 16, 21                            |
| §6 encrypted input: prompt, decrypt in memory, process, note that the output is unencrypted; Merger/Splitter/Organize upgraded                              | 15                                    |
| §7 fixtures: image-heavy, AcroForm, rotated, metadata, encrypted (AES + owner-only), XFA                                                                    | 6, 12, 15, 16, 18                     |
| §7 e2e: Compress, Protect→Unlock round trip, PDF→Images (+ every other new tool)                                                                            | 2, 4, 5, 7, 8, 11, 13, 15, 16, 17, 21 |
| §10 visual signature only; the UI says it is not a certificate signature                                                                                    | 11                                    |

## Decisions taken where the spec was silent

- **Owner-only (permissions-only) PDFs.** Non-security tools open these without a prompt, the same way every PDF reader does, and the output notes that it is unprotected. The Unlock tool always requires a real password, owner or user ("no cracking"). Pinned in Task 17.
- **Hybrid AcroForm + XFA documents** are rejected as XFA, per §3.5. pdf-lib would otherwise silently delete the XFA part.
- **Page numbering.** Selected pages are numbered consecutively from "Start at". `{total}` is the last number drawn.
- **Fit-to-image pages** in Images → PDF use 96 DPI (1 px = 0.75 pt).
- **Placement coordinates.** Watermark, page numbers and signature all use the page _as displayed_ (`/Rotate` and the crop box are applied), so they land where the user sees them.
- **Compression result not smaller.** The original is returned with an "Already optimised" message and no download.
