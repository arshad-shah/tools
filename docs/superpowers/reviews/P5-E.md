# PR #70 review: P5-E content engine, Redact, Protect, Optimize, Convert, quick-task handoff

Reviewer: independent (read-only). Branch `origin/feat/p5-e-redact-protect` (b274d96a). The diff is in `review-p5e.diff`.
Method: I read the redaction core myself. A sub-review covered Protect, Optimize, Convert, the checkpoint wiring and the UI. I proved findings with throwaway vitest files in a temporary worktree against the real engines (`nodeRedactServices`: pdf.js, qpdf-wasm and the edit handlers), then removed the worktree. I ran no e2e, visual or full suite.

## Strengths

- **Fail-closed pipeline.**
  - Raster reasons abort editing the whole page, and the page is turned into an image.
  - Verification covers glyph geometry, pixel coverage, document strings and raw qdf bytes (latin1 and UTF-16BE).
  - Any page that fails verification is turned into an image and checked again; if it still fails, the job throws `VERIFICATION_FAILED` and nothing is committed (`checkpoints/redact.ts:153-221`).
- **Text removal is exact.**
  - Removed glyphs are replaced by TJ numeric compensation, so surviving glyphs and the text matrix after the op are unchanged (`text.ts:38-90`).
  - `'` and `"` are expanded correctly.
  - Marked-content `/ActualText`, `/Alt` and `/E` are stripped when glyphs go.
  - `Tr 3` (invisible OCR text) is removed by geometry. `Tr 4-7` and pattern-filled text become images.
- **Shared Form XObjects and images are copy-on-write.** The new XObject goes under a fresh `/RdN` name in cloned resources (`content.ts:57-77`, `xobjects.ts:107-114`), and a test proves the shared original is untouched.
- **Image patching is conservative.** Anything but 8-bit Gray/RGB with Flate or DCT and a default `/Decode` becomes an image. The SMask under the mark is made opaque.
- **Full rewrite, then sweep.** pdf-lib `save` is followed by qpdf with `--remove-unreferenced-resources=yes`, and qpdf writes only reachable objects. My optional-content proof (hidden OCG text under a mark) passed: the text was gone from the qdf bytes.
- **The adversarial suite (E-8) is real.** It extracts text with pdf.js, checks raw qdf bytes, breaks the glyph remover, then also breaks rasterising.
- **Protect:**
  - AES-256 only (R6/AESv3, qpdf `--bits=256`).
  - A blank owner password becomes 192 random bits; an owner password equal to the open password is rejected.
  - Passwords never reach the log, autosave or stores, and are cleared after export (G25).
  - Owner restrictions are enforced (`assertUnrestricted`, decrypt with the real password).
  - Signature plus protection is refused (G14).
- **Checkpoint jobs** (redact, sanitise, compress, repair) all go through `runCheckpoint`, which holds `beginJob()` and refuses to commit over changes. `registerCoreRunners()` also fixes a latent master bug: the OCR runner was never registered.
- **Clean `pdf-metadata` removal**, and the smoke e2e asserts NotFound.

## Issues

### Critical

**C1. Text drawn inside a tiling pattern survives redaction, and the job still reports "Verified". Proven.**

- Where: `src/pdf/redact/paths.ts:17-36`, `src/pdf/edit/content/interpreter.ts:343-386`, `src/pdf/redact/content.ts:137-193`.
- Cause:
  - Pattern-filled text triggers `pattern-text`, but a **path** filled with a tiling pattern (`/Pattern cs /P0 scn … re f`) is treated as an ordinary path.
  - If the path only partly overlaps the mark, it stays, and with it the pattern's content stream, including any text, images or forms in the cell. The pattern content is never interpreted or redacted.
  - If the path is fully covered, it is dropped, and the pattern disappears only thanks to the qpdf sweep.
  - pdf.js `getTextContent` does not extract pattern text, and the fill hides the pixels. Verification therefore passes, as does the raw-byte check when the mark has no search term (area marks).
- Proof: one page with a 300×30 tiling cell (PaintType 1, single tile at `Matrix [1 0 0 1 60 700]`) whose content is `(PATSECRET) Tj`. A path `50 650 500 100 re f` is filled with it, and an area mark covers x 40..240, y 640..760, so the text is entirely under the mark. `runRedaction` resolved successfully, and `qpdf --qdf` of the output still contained `PATSECRET`.
- Why it is Critical: the product claims "Verified: no content remains under the marks", the request names patterns explicitly, and spec §10.2 lists pattern-painted content as a reason to turn the page into an image.
- Fix:
  - In the interpreter, record `fillPattern`/`strokePattern` on painted paths (and on `sh` ops). In `redactStream`, when a painted path that uses a PatternType 1 (tiling) pattern intersects a mark, return `fail(['pattern-text'])`, or add a new `'pattern-content'` reason with wording.
  - Optionally recurse into the tiling pattern's content and copy it like forms. Turning the page into an image is the simple, safe choice.
  - Do the same for ExtGState `/SMask` groups (`/G` form) drawn over a mark. These are rarer, but their content is also never visited.
  - Add an adversarial case: tiling-pattern text under an area mark, asserting the qdf bytes lack the text.

### Important

**I1. A search term in places the scrub does not touch makes redaction fail with `VERIFICATION_FAILED`. Proven, fail-safe but unusable.**

- Where: `src/pdf/redact/scrub.ts:113-153`, `src/pdf/redact/verify.ts:136-157`, `checkpoints/redact.ts:195-214`.
- Untouched places:
  - document JavaScript (`/Names /JavaScript`, `/OpenAction`, `/AA`);
  - link `/URI` actions outside the mark;
  - annotation `/Contents` of annotations not under a mark (comments, sticky notes);
  - attachment **contents** (only names and descriptions are scrubbed);
  - per-object XMP on pages or images;
  - field `/TU` tooltips and named destinations.
- Effect:
  - The raw-byte or document-string check fails, which marks it document-level, so **every** marked page is turned into an image needlessly.
  - It then fails again and throws.
  - Users who redact a name that also appears in a comment or link cannot redact at all, and the error does not say why.
- Proof: a term in a `/Names /JavaScript` action plus a link URI outside the mark gave "Redaction could not be verified…".
- Fix:
  - Extend `scrubDocument`. When a term matches, drop the JS name-tree entries, `/OpenAction` and `/AA` JS, URI actions (or blank the annotation `/Contents`), and embedded-file streams whose decoded bytes contain the term. Report each removal.
  - Do not turn pages into images for document-level problems that a page image cannot fix. Throw straight away with a message naming the place, e.g. "A search term remains in a link address".
  - Add tests for each place.

**I2. With Fast web view and password protection both on, the exported file is not linearized (sub-review).**

- Where: `src/pdf/doc/export-stages.ts:70-71` (linearize at order 20, encrypt at 30), `export-stages/encrypt.ts`.
- Cause: qpdf-wasm `encrypt()` rewrites the file without `--linearize`, so the encrypt stage undoes the linearize stage, and the user is not told.
- Fix: linearize inside the encrypt pass (`--linearize` with the encrypt arguments), or linearize after encrypting with the password. Add a combined test that checks `--check-linearization` and `needsPassword`.

**I3. Sanitise "Hidden layers" can reveal hidden content (sub-review).**

- Where: `src/pdf/edit/sanitize.ts:265-331`.
- Cause: hidden OCGs are always removed from `/OCProperties`, but their content is stripped only from page-level streams. Content survives in four cases:
  - `/OC` blocks inside Form XObjects;
  - OCMD membership dicts;
  - inline `BDC` property dicts;
  - unparseable pages (only a note is added).
- Viewers, pdf.js included, treat an `/OC` that points at a group missing from `/OCGs` as **visible**, so sanitising can show exactly what the user meant to hide.
- Fix:
  - Recurse into forms, copying them on write.
  - Resolve OCMDs.
  - Keep a group in `/OFF` unless nothing reachable still references it.
  - Add tests: hidden content inside a form, an OCMD case and an unparseable page.

**I4. Sanitise "Scripts" overclaims (sub-review).**

- Where: `src/pdf/edit/sanitize.ts:116-199`.
- Missed:
  - outline-item `/A` actions (JavaScript or Launch on bookmarks);
  - `Rendition` actions carrying `/JS`;
  - `SubmitForm`/`ImportData` on widget buttons (only Link annotations are checked).
- Fix: walk `/Outlines` (`First`/`Next`, depth-guarded), add the Rendition `/JS` check, and remove submit actions from widgets too.

### Minor

- **M1. One fill colour per page for image patches** (`src/pdf/redact/apply.ts:63`): `ctx.fill = marks[0].fill`. A second mark with a different fill paints its image pixels in the first mark's colour. Pixel verification still passes because the vector fill is drawn on top, but the image bytes hold the wrong colour. Pass the fill per mark into `paintCovered`/`patchInline`.
- **M2. Pixel-centre test** (`src/pdf/redact/images.ts:~203`): for very low-resolution images scaled up, a mark smaller than one image pixel changes no pixel, so the original colour of that block stays in the file. Paint any pixel whose footprint intersects the mark (conservative dilation).
- **M3. Kept terms skip the raw-byte check** (`verify.ts:141-150`): when a term is left unmarked on another page, the raw-byte check is skipped for that term everywhere, so hidden copies on the _marked_ page go unchecked by raw bytes. Geometry and pixel checks still apply. This is documented as a deviation; state it in the report line too.
- **M4. A multi-widget field keeps its value** (`annots.ts:46-63`): when one widget is redacted and another remains on an unmarked page, the parent field keeps `/V`. That is arguably right, since the value is visible elsewhere, but the report should say so.
- **M5. Test gaps for priority-1 cases.** No test covers:
  - incremental-update leftovers (an older revision's unreferenced object);
  - JavaScript or links (I1);
  - tiling patterns (C1);
  - optional content (I checked this ad hoc: it passes);
  - a pipeline-level assertion that a partly covered image's original pixels are absent from the **final** output, after the sweep. `images.test.ts` asserts only at the `redactStream` level, before the sweep.
- **M6. Rasterising renders annotations** (`rasterisePage`, `checkpoints/redact.ts:62-82`): the page image comes from the original document. If `renderBurned` paints annotation appearances, annotations outside the marks end up baked into the image and also stay as live annotations, so they appear twice. Render with annotations off.
- **M7. Insert-images orphan source** (`modes/convert/actions.ts:152-205`): if `addSource` succeeds but the dispatch fails or is cancelled, the source stays in the model and blob store with no op referencing it. Dispatch inside the job, or remove the source when the dispatch returns `[]`.
- **M8. Pages-to-images memory** (`convert/exports.ts:154-173`): every page image is held in memory and the zip is built in memory, so peak memory is about twice the total image bytes. DPI is clamped and rendering is one canvas at a time, but large documents at 300 DPI can still use gigabytes. Stream into an fflate `Zip`, or warn above a page×DPI budget.
- **M9. Protect export section** (`ProtectExportSection.tsx:70-74`): the red "Enter a password…" error shows in an `aria-live` region as soon as the dialog opens. Show it only after the first edit or an export attempt.
- **M10. Duplicate DOM ids** (`SizeBreakdown.tsx:67,105`): fixed ids `opt-largest-images` and `opt-fonts` duplicate if the panel mounts twice. Use `useId()`.
- **M11. Size breakdown cost** (`SizeBreakdown.tsx:146-158`): it materialises the whole document on every log change. Debounce, or measure only on demand.
- **M12. Sanitise preview cost** (`protect-ui.ts:57-67`): the preview runs five full pdf-lib loads (one dry run per kind). One dry run that reports per kind would be about five times cheaper.
- **M13. Repair rewrites more than needed** (`checkpoints/optimize.ts:57`): qpdf-wasm defaults add flate recompression and `--remove-unreferenced-resources=yes`. Pass `recompressFlate: false, removeUnreferenced: false` for a minimal rewrite.
- **M14. Encrypt test gaps:**
  - a user-supplied owner password giving `passwordRole === 'owner'`;
  - the random owner password not lifting restrictions;
  - linearize plus encrypt (I2).
- **M15. E-13 "quick tasks restyle"**: the quick-task `Tool.tsx` diffs are one to four lines each. Either the restyle landed earlier or it is missing; please confirm.

## Plan coverage

| Task                                                  | Status      | Notes                                                                                           |
| ----------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| E-1 Lexer and serialiser                              | Done        | Round-trip tests; inline images with a validated EI heuristic                                   |
| E-2 Font metrics and interpreter                      | Done        | Standard 14, /Widths, CID /W, Type 3 FontMatrix; glyph quads                                    |
| E-3 Marks and search                                  | Done        | Presets with Luhn and mod-97                                                                    |
| E-4 Text and vector removal                           | Done, gap   | TJ compensation exact; C1 (paths filled with tiling patterns)                                   |
| E-5 Images and Form XObjects                          | Done        | Copy-on-write, SMask, inline; M1, M2                                                            |
| E-6 Apply, annotations, fill, scrub, rasterise        | Partly done | Scrub misses JS, URI, comments and attachment contents (I1)                                     |
| E-7 Verification                                      | Done        | Fails safe; documentLevel retry wastes work (I1)                                                |
| E-8 Adversarial suite                                 | Done, gaps  | 10 cases plus broken-step tests; no pattern, JS, incremental or OC cases (M5)                   |
| E-9 Redact mode UI                                    | Done        | Not exercised in a browser; e2e and visual not run                                              |
| E-10 Protect, metadata, sanitise, delete pdf-metadata | Done, gaps  | I3, I4; encryption itself sound                                                                 |
| E-11 Optimize                                         | Done        | I2 (linearize with encrypt), M13                                                                |
| E-12 Convert and Markdown                             | Done        | Tables deferred to P5-C as allowed; M7, M8                                                      |
| E-13 Quick tasks, handoff, e2e, visual                | Partly done | Handoff done; e2e and visual specs written but **not run** (no Chromium); restyle unclear (M15) |

## Verdict

**Changes requested.** 1 Critical, 4 Important, 15 Minor.

The redaction pipeline is well built and fails safe in most cases, but C1 is a proven case where the job reports "Verified" and leaves text under a mark. Fix C1 and I1 before merging. I2 to I4 are contained in Protect and Optimize and should also land before merge, or be explicitly moved to the backlog with a ruling. The e2e and visual specs still need a controller run.
