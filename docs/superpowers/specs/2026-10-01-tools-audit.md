# Non-PDF tools audit (functional / UX)

**Date:** 2026-10-01 · **Branch:** master (`d7c64bb`) · **Scope:** every `src/tools/<id>/` except `pdf-*` (23 folders; `images-to-pdf` is included briefly because it is not `pdf-*`-prefixed, though the spec treats it as a PDF quick task).
**Read-only audit.** Visual restyle is assumed to come from the phase-5 kit (spec `docs/superpowers/specs/2026-10-01-pdf-workspace-and-redesign-design.md`); this document covers functional and UX upgrades on top of it.

Effort tags: **[S]** under a day · **[M]** 1–3 days · **[L]** about a week or more.
Note: spec §1 success criterion 6 says "30 non-PDF tools"; the repo has 22 non-PDF tools plus `images-to-pdf`. The spec count needs correcting.

---

## 0. Summary table

| Tool (id)                                   | Hub              | Top 3 upgrades                                                                                                                                                                   | Effort |
| ------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| API Request (`api-request`)                 | web              | Fix body/params/JSON-error bugs; cURL import/export + code snippets; environments `{{vars}}` + history                                                                           | M–L    |
| Base64 (`base64-converter`)                 | encoding         | UTF-8-safe + URL-safe variants; file to/from Base64 / data URI (the manifest already promises this); auto-detect what was decoded (image, JSON, JWT)                             | S–M    |
| Calculator (`calculator`)                   | math             | Fix keyboard handling + angle units in expressions; proper expression engine with variables/live result; programmer mode (absorbs number base) + fixed grapher                   | M–L    |
| Color Tester (`color-tester`)               | media            | Free fg/bg contrast checker (WCAG + APCA) with fix suggestions; hex/HSL/OKLCH inputs and outputs, eyedropper; persisted palettes + CSS/Tailwind export, colour-blindness preview | M      |
| CSV/TSV Viewer (`csv-viewer`)               | data             | Worker parse with delimiter/encoding auto-detect and tolerant errors; virtualised grid with multi-column filter/sort; profile stats + export CSV/JSON/SQL/Markdown               | M–L    |
| Date Calculator (`date-calculator`)         | time             | Fix difference maths (calendar-accurate); business days + time zones; live results, epoch/ISO input                                                                              | M      |
| Hash Generator (`hash-generator`)           | security         | Fix HMAC (hard-coded key `'key'`) and SHA-3 label; file hashing in a worker with progress; verify/compare mode + hex/Base64 output                                               | M      |
| Image Optimizer (`image-optimizer`)         | media            | Batch + ZIP; resize/target-size + AVIF; worker/OffscreenCanvas, before/after slider; fix transparent-to-JPEG black background                                                    | M–L    |
| Images to PDF (`images-to-pdf`)             | pdf (quick task) | Per-image rotate/crop; JPEG re-encode quality for smaller PDFs; "Open result in workspace"                                                                                       | S–M    |
| JSON & XML Viewer (`json-and-xml-viewer`)   | data             | Live parse with exact error line/column; JSONPath/jq-style query + copy path; convert JSON/XML/YAML/CSV, file drop, guard network graph size                                     | M–L    |
| JWT Decoder (`jwt-decode`)                  | encoding         | Signature verification (HS/RS/ES/PS via WebCrypto); UTF-8 decode fix + honest status (exp/nbf/iat, live); JWT builder/signer                                                     | M      |
| Log Parser (`log-parser`)                   | text             | File open + worker parse + virtualised list; multi-line stack grouping, JSON logs, access logs, custom regex formats; timeline histogram + regex search                          | L      |
| Number Converter (`number-converter`)       | math             | BigInt precision + all fields editable; signed widths/two's complement, bit toggles; any base 2–36, prefixes, fractions                                                          | M      |
| Password Generator (`password-generator`)   | security         | Entropy-based strength + passphrase mode; exclude ambiguous/custom sets, bulk; strength checker for an existing password                                                         | M      |
| Pomodoro (`pomodoro`)                       | time             | Long break every N sessions + Skip not counted; system notifications + shortcuts; optional task, history heatmap/export                                                          | M      |
| QR Code Generator (`qr-code-generator`)     | web              | Fix crypto URI schemes, WiFi/vCard escaping, silent-fallback encryption; local logo file, PNG+SVG+copy, scannability check; more types (email/SMS/tel/geo/event) + QR scanner    | M      |
| Random Data (`random-data-generator`)       | data             | Seeded deterministic output + crypto IDs, Luhn-valid cards, no external avatar URLs; CSV/SQL/NDJSON/TS export; schema persist, import from sample JSON, locales                  | M–L    |
| Regex Tester (`regex-tester`)               | text             | Worker execution with timeout (catastrophic backtracking freezes tab today); replace/split + multi-case tests; token explanation, share URL, safe code export                    | M      |
| Rive Player (`rive-animation-player`)       | media            | Speed/scrub timeline + events log; custom background, frame/WebM export; real artboard info, text runs and data-binding inputs                                                   | M      |
| Text Diff (`text-diff-checker`)             | text             | Implement unused context-lines (collapse unchanged) + next/prev change nav; worker diff + unified patch export; JSON/semantic and folder-free multi-file diff                    | M      |
| Unit Converter (`unit-converter`)           | math             | Fix data units (KB vs KiB) and precision loss of tiny values; all-units-at-once view with bidirectional edit; more categories + persisted history/favourites                     | M      |
| URL Encoder/Decoder (`url-encoder-decoder`) | encoding         | Component vs full-URI vs form (`+`) modes; batch per-line; widen into a multi-codec "Text Encoder" (HTML entities, Unicode escapes, Punycode, hex)                               | S–M    |
| URL Parser (`url-parser`)                   | web              | Editable URL builder (edit any part / param, rebuild live); decode/normalise, punycode/IDN, domain parts; send to API Request / QR                                               | M      |

---

## 1. Cross-cutting findings (apply to many tools)

1. **No tool runs heavy work off the main thread** except Pomodoro's timer. Regex, CSV, log, diff, JSON graph, image encoding and hashing all block the UI on big input. `src/shared/lib/worker-rpc.ts` + `useJob` already exist. Make **one shared `text-worker`** (regex exec, diff, CSV/log parse, hashing) behind `worker-rpc`, with `CANCELLED` and a timeout mapped to `ToolError`.
2. **No URL-shareable state anywhere** (`useSearchParams`/hash: zero hits). Add a kit hook `useShareableState(schema, {secret: false})` that writes compressed state to the URL **hash** (never sent to a server). Opt in only for non-secret tools: regex, diff (small), unit/number/date, colour, QR (non-WiFi), random-data schema, URL parser. Never for password, JWT, hash input, API headers, WiFi QR.
3. **No common "source panel".** Every text tool re-implements textarea + clear, and only some have paste/open/drop/sample. Build a kit `SourceInput` (paste, Open file, drop, sample, clear, char/line/byte count, size warning via `SOFT_SIZE_LIMIT`, handoff read). Use it in base64, hash, URL, JWT, JSON, CSV, log, diff, regex.
4. **No cross-tool "Send to".** The spec's `shared/lib/handoff.ts` is `File[]`-only. Extend it to `{kind:'text', mime, text}` so outputs can open in another tool (`Open in JSON viewer`, `Decode as JWT`, `Make QR`, `Send to API Request`). See section 4.
5. **Settings are mostly not persisted.** Only calculator, api-request, pomodoro and images-to-pdf use `createToolStore`. Persist settings (never data) for diff options, password options, hash algorithm selection, unit history/favourites, colour palette, QR style, random-data schema, regex flags, CSV page size.
6. **UTF-8 bugs from `btoa`/`atob`** in Base64 and JWT. Add `shared/lib/encoding.ts` (UTF-8 ↔ bytes, Base64/Base64url with and without padding, hex) and use it everywhere.
7. **Error model drift.** Several tools hold `error` strings in local state or `console.error` (hash) instead of `ToolError` + `ErrorState`. QR encryption silently falls back to plaintext. API Request reports a JSON parse failure as "Network error / status 0". Fix these as part of the restyle.
8. **Keyboard.** Only the calculator listens to keys, and it is broken (see below). Each tool should register commands with the spec's `useCommands` (Mod+K): "Copy result", "Swap", "Clear", "Load sample", "Download". Common shortcuts: Mod+Enter run, Mod+Shift+C copy output.
9. **R2/R3 debt to clear in P5-A2** (spotted while reading): raw `<input type="color">` (colour), raw `<img>` (image optimizer), the hand-rolled SVG chart (CSV), inline `style` (password, colour, JSON editor), the bullet character `'•'` used to mask passwords, em dashes as empty-value placeholders (number converter `'—'`, regex flags `'—'`), CSS modules (JSON viewer, regex).

---

## 2. Per-tool sections

### API Request — `api-request` (hub: web, rename "HTTP Client")

**Today.** Postman-style REST/GraphQL client: method, URL, params, headers, body (none/json/form-data/urlencoded), response panel with status/time/headers. Saved collections and folders are persisted through `createToolStore` (with legacy import). Requests go out through `fetch` with an AbortSignal.

**Gaps / bugs.**

- `form-data` body type is offered but `buildRestInit` returns no body for it, so the request is sent without the body and no error is shown (`lib/request.ts`).
- Query params are applied only to `GET` (comment: "As before…"), so POST/PUT/DELETE silently drop them.
- If the server labels a response `application/json` but the body is empty or invalid (204, HEAD, a broken API), `res.json()` throws. The catch then reports **status 0 "Network error"** and the real status is lost.
- CORS failures appear as a generic "Failed to fetch", with no explanation that a browser cannot reach APIs without CORS headers.
- No response size, no binary/image/HTML preview, no pretty/raw toggle in the lib, no timing beyond the total.
- Default collections ship sample requests. Fine, but there is no import/export of collections (Postman/Insomnia/HAR).

**Upgrades.**

1. **[S]** Fix the form-data body (build `FormData` from key/value rows plus file fields), params for all methods, and response parsing (read text, then try JSON; keep status). Benefit: requests do what the UI says.
2. **[M]** **cURL import/export plus code snippets** (fetch, axios, Python requests, HTTPie). Paste a cURL command into the URL bar and it is parsed. Benefit: moves requests between the terminal, docs and the tool in one paste.
3. **[M]** **Environments and `{{variables}}`** (persisted, secrets masked) plus **request history** (last 50, in memory or opt-in persisted). Benefit: switch dev/prod without editing every request.
4. **[M]** Auth helpers (Bearer, Basic, API key in header/query) and a CORS explainer `ErrorState` with recovery hints. Benefit: fewer dead ends on the most common failure.
5. **[M]** Response viewer: size, pretty/raw/preview (image, HTML in a sandboxed iframe), search, **Open in JSON viewer**, **Compare with previous** (Text Diff), copy as cURL. Benefit: one-click debugging flow.
6. **[S]** Import/export collections as JSON (Postman v2.1 subset). Benefit: portability.

**Merge/rename.** Keep. Rename "HTTP Client" (keywords: api, rest, graphql, curl, postman). Add a privacy note: "Requests go directly from your browser to the URL you enter."

---

### Base64 — `base64-converter` (hub: encoding)

**Today.** Encode/decode tabs over a textarea using `btoa`/`atob`, with a live result, a swap button and copy.

**Gaps / bugs.**

- **Unicode breaks:** `btoa('café')` succeeds only for Latin-1, and `btoa('€')` or emoji throws the "invalid characters" error. Decoding returns Latin-1 mojibake for UTF-8 data.
- Manifest says "Convert **text and files**", and the spec route table says "accepts any file", but there is no file support at all.
- No URL-safe alphabet, no padding control, no line wrapping (MIME 76), whitespace and newlines in the input make decode fail.
- No detection of what decoded bytes are (image, PDF, JSON, JWT).

**Upgrades.**

1. **[S]** UTF-8-safe encode/decode via `shared/lib/encoding.ts`, with a variants control: standard / URL-safe, padding on/off, wrap at 76; whitespace ignored on decode. Benefit: works for every language.
2. **[M]** **File mode:** drop any file, get Base64 or a `data:` URI (copy / download .txt). Decode Base64 or a data URI into a downloadable file with the sniffed type (`detectKind`) and an image preview. Benefit: delivers what the tool's description already promises.
3. **[S]** Smart output hints: if the decoded result is JSON, offer "Open in JSON viewer"; if the input looks like a JWT, offer "Open in JWT decoder"; for image bytes, show a preview. Benefit: fewer tool hops.
4. **[S]** Hex and binary views of decoded bytes (shared with Hash). Benefit: inspect non-text payloads.
5. **[S]** Persist variant settings; Mod+K commands "Encode clipboard" / "Decode clipboard". Benefit: speed.

**Merge/rename.** Keep separate (file mode makes it distinct). Possibly rename "Base64 Encoder / Decoder".

---

### Calculator — `calculator` (hub: math)

**Today.** Standard (immediate-execution), scientific (sin/cos/…, deg/rad, x², √, n!) and expression modes (mathjs `evaluate`). Expression mode can plot with Plotly. Persisted history, favourites and three memory registers.

**Gaps / bugs.**

- **Keyboard handling is a stub.** The comment in `useCalculator.ts` reads "For brevity, only a few examples"; only digits and Escape are mapped (no operators, Enter, Backspace, `.`). The listener is on `document`, has **no focus-target check** and calls `preventDefault()`. Digits typed into the expression **textarea are swallowed** and appended to the end of the display regardless of the caret. Escape anywhere clears the calculator.
- Expression mode ignores the deg/rad toggle: the UI hint suggests `sin(30)`, but mathjs evaluates radians, so the result is -0.988, not 0.5.
- The grapher substitutes with `expression.replace(/x/g, …)`, which breaks `exp`, `max` and `xor`. The default step of 1 gives a jagged polyline. Plotly is a very heavy dependency for a single line plot.
- Standard mode starts with `calculationValue === 0 && !pendingOperator`, so starting a chain with 0 misbehaves. There is no float clean-up (0.1+0.2 shows 0.30000000000000004). History is unbounded.
- The manifest description is "A simple calculator".

**Upgrades.**

1. **[S]** Full keyboard map (digits, `+-*/^%`, Enter/=, Backspace, Delete, `.`, parentheses, Escape) that ignores events from editable targets, plus a `?` help sheet via `Kbd`. Benefit: usable without a mouse, and no swallowed keystrokes.
2. **[M]** **Expression-first engine**: a single input with live result preview, variables (`a = 5`), `ans`, unit-aware maths (mathjs units: `5 km to mi`), angle mode honoured (configure mathjs or wrap trig functions), precision setting / BigNumber for exact decimals. Benefit: matches the best calculators (Numi/Soulver-like).
3. **[M]** **Programmer mode** (hex/dec/oct/bin side by side, bitwise ops, word size). This absorbs Number Converter logic as a shared lib. Benefit: one place for dev maths.
4. **[M]** Grapher rewrite: compile once (`math.compile(expr).evaluate({x})`), adaptive sampling, multiple functions, zoom/pan, roots/intersections. Draw through the kit `Chart` adapter, consider a lighter renderer (uPlot or kit SVG) instead of Plotly. Benefit: correct plots and a much smaller bundle.
5. **[S]** History cap and search, copy result, tape export. Benefit: tidy, useful history.
6. **[S]** Share expression via URL hash. Benefit: send a calculation to someone.

**Merge/rename.** Rename "Calculator & Grapher". Share code with Number Converter through programmer mode, but keep Number Converter as a separate page for SEO and discoverability.

---

### Color Tester — `color-tester` (hub: media)

**Today.** RGB(A) sliders plus a native colour input; hex/rgb copy; harmony swatches (complementary, analogous, triadic, lighter, darker); heuristic name; "psychology" mood text; preview card; contrast against white and black only; saved palette with JSON export.

**Gaps / bugs.**

- No hex/HSL text input (picker or sliders only). No HSL/OKLCH/CMYK output.
- Contrast is only measured against white and black. You cannot test **your own** text/background pair, which is the main reason people open a contrast tool. Alpha is ignored in contrast.
- Preview text colour uses a YIQ luminance heuristic (`0.299r…`), not the WCAG ratio, so the "auto" pick can fail AA.
- The saved palette is `useState`: it is lost on reload, while the default palette reloads every time.
- The "psychology" tab is pseudo-science filler. It weakens the "professional" goal.
- Random colour uses `Math.random` (fine). Raw `<input type="color">` and inline styles (R2).

**Upgrades.**

1. **[M]** **Contrast checker** with foreground and background inputs, WCAG 2.2 AA/AAA for normal, large and UI text, plus **APCA Lc**. "Suggest nearest passing colour" nudges lightness in OKLCH. Benefit: answers the accessibility question directly.
2. **[M]** Universal colour input (paste `#hex`, `rgb()`, `hsl()`, `oklch()`, a CSS name) with outputs in all formats, each copyable. Add **EyeDropper API** where supported. Benefit: works with whatever the user has.
3. **[M]** Palette generator: tints/shades scale (50–950, Tailwind-style) built in OKLCH, plus harmonies; export as CSS variables / Tailwind config / JSON / SVG swatch sheet; persist palettes in `createToolStore`. Benefit: production-ready design tokens.
4. **[M]** Colour-vision deficiency simulation (protan/deutan/tritan/achromatopsia) on the preview and the palette. Benefit: inclusive design check.
5. **[M]** Extract a palette from a dropped image (k-means in a worker). Benefit: brand colours from a logo or photo.
6. **[S]** Share colour/palette via URL hash. Benefit: easy hand-off to teammates.

**Merge/rename.** Rename "Color & Contrast" (or "Color Studio"). Remove the psychology tab.

---

### CSV/TSV Viewer — `csv-viewer` (hub: data)

**Today.** Loads a .csv/.tsv (or sample) through PapaParse (header, dynamic typing) inside `useJob`. Paginated table with single-column text filter, click-to-sort (lodash `orderBy`), column visibility, min/max/avg/sum stats for numeric columns, a hand-drawn SVG line chart of the first 50 rows, and export of the filtered data as CSV.

**Gaps / bugs.**

- The delimiter is chosen **only by extension** (`.tsv`, otherwise `,`). Semicolon CSVs (Excel in most of Europe) and pipe-separated files load as one column. No encoding choice (Windows-1252 files garble).
- **Any** Papa error aborts the whole load (`r.errors.length > 0` throws). One ragged row (`TooFewFields`) rejects a 100k-row file.
- `dynamicTyping` turns ZIP codes or IDs like `00123` into `123`, and large IDs lose precision.
- Parsing is synchronous on the main thread even though it sits inside `useJob`.
- `Math.min(...values)` in the chart overflows the call stack on large columns. The chart shows only the first 50 rows and is line-only.
- No paste input; one filter only; no global search; no column type detection; no row count of filtered vs total in the export name.

**Upgrades.**

1. **[M]** **Worker parse** (Papa worker mode or `worker-rpc`) with delimiter auto-detect (`,` `;` `\t` `|`), encoding picker, header-row toggle, "keep as text" per column, and **tolerant errors** (load anyway, list bad rows). Benefit: opens real-world files instead of rejecting them.
2. **[L]** **Virtualised data grid** (kit `DataGrid` built on the existing Table): sticky header, resizable columns, multi-column sort, per-column filters (text/number range/empty), global search, cell copy, row details. Benefit: spreadsheet-like browsing of 1M rows.
3. **[M]** **Column profile**: type inference, null/unique counts, top values, histogram, median/percentiles. Charts through the kit `Chart` adapter (bar/line/scatter over the full filtered data, downsampled). Benefit: instant understanding of a dataset.
4. **[M]** Export filtered/visible data as **CSV / TSV / JSON / NDJSON / SQL INSERT / Markdown table / XLSX** (SheetJS lazy-loaded). Add "Open as JSON in JSON viewer". Benefit: it becomes a converter too.
5. **[S]** Paste-from-clipboard source (from Excel or Sheets: TSV) via `SourceInput`. Benefit: no file needed.
6. **[M]** Light editing: edit cell, add/delete row/column, rename header, dedupe rows, then export. Benefit: quick clean-ups without Excel.

**Merge/rename.** Rename "CSV Viewer & Converter". Pairs with JSON viewer and Random data (section 4).

---

### Date Calculator — `date-calculator` (hub: time)

**Today.** Two tabs. "Difference" between two `datetime-local` values; "Add/Subtract" N minutes/hours/days/months/years from a base date. Both need a button click.

**Gaps / bugs.**

- **The difference maths is wrong.** It uses `months = floor(days/30)` and `years = floor(days/365)` and prints `${years} years, ${months % 12} months, ${days % 30} days`. Example: 400 days gives "1 year, 1 month, 10 days" (should be 1 year, 1 month, ~4 days depending on the dates). Leap years and month lengths are ignored.
- The direction is lost (`Math.abs`), and there are no totals (total days, weeks, hours, business days).
- Not live (button), there is no "now" button for the difference, and no time zones. It imports `@internationalized/date` but then does maths on JS `Date`.
- Month arithmetic overflow: Jan 31 + 1 month gives Mar 3 via `setMonth`. Users expect Feb 28/29.

**Upgrades.**

1. **[S]** Calendar-accurate difference with `@internationalized/date` (or Temporal polyfill): Y/M/D/H/M breakdown, signed, plus totals in each unit and weeks+days. Live update, no button. Benefit: correct answers.
2. **[M]** **Business days**: exclude weekends (configurable workweek) and optional holiday list (paste dates, or a bundled public-holiday set per country as static JSON). Benefit: deadlines and SLAs.
3. **[M]** **Time zones**: base date in zone A, show in zones B/C… (Intl), meeting-planner strip. Benefit: replaces a separate world-clock site.
4. **[S]** Inputs accept ISO 8601, Unix seconds/ms, RFC 2822, "now", "today + 3w". Output in ISO, Unix, relative ("in 3 days"), week number, day of year. Benefit: dev-friendly.
5. **[S]** Clamp end-of-month behaviour (with a toggle) and chain operations (+1 month, then +3 days). Benefit: predictable date maths.
6. **[S]** Share via URL hash. Benefit: send "days until launch".

**Merge/rename.** Rename "Date & Time Calculator". Either absorb the proposed Epoch/Timezone converter as tabs, or build that separately and cross-link (section 3).

---

### Hash Generator — `hash-generator` (hub: security)

**Today.** Text input, select one or all algorithms (crypto-js): MD5, SHA-1/224/256/384/512, "SHA-3", RIPEMD-160 and four HMACs. Each result is shown in a card with copy.

**Gaps / bugs.**

- **HMACs use a hard-coded key `'key'`** (`CryptoJS.HmacSHA256(i, 'key')`). There is no key input, so every HMAC shown is useless or misleading. This is the most serious correctness bug in the audit.
- **"SHA-3" is crypto-js `SHA3`, which is Keccak-512 with the pre-standard padding**, not FIPS-202 SHA3-512/256. Results will not match `sha3sum` or other tools.
- No file hashing (the spec says "accepts any file"; checksum verification is the main real-world use).
- No compare/verify field, no uppercase/Base64 output, no CRC32/xxHash/BLAKE.
- Input encoding is implicit (UTF-8). Errors go to `console.error` as strings.

**Upgrades.**

1. **[S]** Fix HMAC: key input (text/hex/Base64), with the algorithm selectable. Rename or replace SHA-3 with real SHA3-256/512 (`@noble/hashes`) and keep Keccak-256 as a labelled option for Ethereum users. Benefit: correct output.
2. **[M]** **File hashing in a worker** (streamed chunks, progress, cancel via `useJob`; WebCrypto for SHA family, `@noble/hashes` for others), multiple files in a table. Benefit: verify downloads and ISOs privately.
3. **[S]** **Verify mode:** paste the expected hash, and every result shows match / no match (case-insensitive, whitespace-tolerant). Benefit: one-glance checksum check.
4. **[S]** Output format: hex lower/upper, Base64, Base64url. Input as text (UTF-8) / hex / Base64. Benefit: interop with APIs and specs.
5. **[S]** Add CRC32, BLAKE2b/BLAKE3, xxHash64; show "broken for security" badges on MD5/SHA-1. Benefit: complete and honest.
6. **[S]** Persist the selected algorithms. Benefit: less clicking.

**Merge/rename.** Rename "Hash & Checksum". Drop crypto-js (also used by QR encryption) in favour of WebCrypto + `@noble/hashes`.

---

### Image Optimizer — `image-optimizer` (hub: media)

**Today.** One image at a time: decode via `<img>`, re-encode on a canvas to JPEG/PNG/WebP with a quality slider, show sizes, reduction % and preview, then download.

**Gaps / bugs.**

- **Transparent PNG/WebP to JPEG gives a black background** (canvas transparent pixels encode as black). No background colour option.
- The PNG "quality" slider is ignored (`toBlob` has no PNG quality), so PNG output is often **larger** than the input. The UI does not say so.
- Single file only; no resize (the biggest real saving); no AVIF; main-thread canvas; raw `<img>` (R2).
- No before/after comparison beyond two images; no metadata info (EXIF stripping happens implicitly but is not stated, although it is a privacy feature).

**Upgrades.**

1. **[S]** Background colour for formats without alpha (default white). Hide or relabel quality for PNG, and offer "PNG (lossless)" plus "PNG (quantised, 256 colours)" via a WASM quantiser (libimagequant / `image-q`). Benefit: no ugly or bigger surprises.
2. **[M]** **Resize**: max width/height, percentage, or **target file size** (binary search on quality). Keep aspect ratio, high-quality downscale (`createImageBitmap` `resizeQuality: 'high'` / pica). Benefit: the largest byte savings for web use.
3. **[M]** **Batch**: drop many files, apply one preset, show a per-file table with savings and a total, download all as ZIP (`fflate` already in `download.ts`). Run in a worker via OffscreenCanvas. Benefit: optimise a whole folder.
4. **[M]** AVIF output where `canvas` supports it, otherwise a WASM encoder (lazy). A comparison card shows estimated sizes for each format. Benefit: picks the best format automatically.
5. **[S]** Before/after **swipe slider** with zoom to 1:1. Benefit: judge quality loss properly.
6. **[S]** "Metadata removed (EXIF/GPS)" badge, with an option to keep orientation only. Benefit: makes the privacy value visible.

**Merge/rename.** Rename "Image Compressor & Resizer". Optionally add an "Image converter" keyword. Hand-off: "Send to Images to PDF".

---

### Images to PDF — `images-to-pdf` (hub: pdf quick task)

**Today.** Drop PNG/JPEG/WebP/GIF, reorder thumbnails, choose page size (A4/Letter/fit), orientation and margin (persisted), then build one PDF in a job.

**Gaps.** No per-image rotation or crop; images are embedded at full size (PDFs can be huge); GIF uses the first frame only (fine, but say so); no HEIC (needs a decoder).

**Upgrades.** 1. **[S]** Per-image rotate 90 and remove; fit/fill/centre per page. 2. **[M]** Optional "Reduce size": downscale to N DPI + JPEG quality (share logic with Image Optimizer). 3. **[S]** "Open result in workspace" (already in spec P5-E). 4. **[S]** Accept a hand-off from Image Optimizer batch.

**Merge/rename.** Keep as a PDF quick task (`/pdf/images-to-pdf`).

---

### JSON & XML Viewer — `json-and-xml-viewer` (hub: data)

**Today.** Code editor (react-textarea-code-editor + Prism) on the left, and a tree view or React-Flow "network" graph on the right. JSON or XML (XML converted to a JSON-ish object). Format (pretty), download, line highlighting on search, split/single layout.

**Gaps / bugs.**

- **Tree search builds `new RegExp(searchTerm, 'i')` from raw input.** Typing `(` or `[` throws inside a `useEffect`, so the tool crashes into the error boundary.
- Parse needs a click (`handleParse`), and errors give only the engine message, with no line/column pointer.
- `formatXML` is a regex splitter on `>\s*<`. It mangles comments, CDATA, mixed content and `<?xml ?>`. `xmlToJson` drops interleaved text.
- No file open/drop (the spec route says accepts json/xml), no minify, no copy-path, no sort keys, no conversion.
- The network graph builds one node per value with no limit. A few-MB JSON freezes the tab.
- Name casing "Json and Xml Viewer", description "View Json and Xml".

**Upgrades.**

1. **[S]** Live parse (debounced, in a worker for large input) with **exact error line:column** and a gutter marker; escape the search term (or offer a regex toggle with try/catch). Benefit: no crash, and errors you can fix.
2. **[M]** **Query bar**: JSONPath (and optionally a jq subset via `jq-web` lazy-loaded) with result tree; click any node to **copy its path** (`$.a[3].b` / JS accessor) or value. Benefit: find data in huge payloads.
3. **[M]** **Convert**: JSON ↔ YAML ↔ XML ↔ CSV (array of objects) ↔ TOML, plus minify, sort keys, escape/unescape string, and "generate TypeScript types / JSON Schema". Benefit: a full data-format workbench.
4. **[S]** `SourceInput` with file drop/open, sample, size display, and download as .json/.xml/.yaml. Benefit: works with files.
5. **[M]** Graph view guarded: collapse beyond depth N / node cap with "expand", or switch to a lazy tree map. Virtualised tree for big documents. Benefit: no freezes.
6. **[S]** XML: use a real pretty-printer (DOM serialisation with indentation) and an XPath query. Benefit: correct XML formatting.

**Merge/rename.** Rename "JSON & XML Viewer" (fix casing), or "JSON / XML Studio". The proposed YAML/TOML converter (section 3) can live here as a tab rather than as a separate tool.

---

### JWT Decoder — `jwt-decode` (hub: encoding)

**Today.** Paste a token, and header and payload are decoded with `atob`. Claims explained with icons, timing claims formatted, expiry banner, signature shown with an explanation (not verified).

**Gaps / bugs.**

- `atob` + `JSON.parse` breaks on **UTF-8** claims (names with accents or CJK turn into mojibake or a parse error).
- The banner says **"Token valid"** whenever `exp` is in the future, even though the signature was never checked and `nbf` is ignored. That is misleading for a security tool.
- The expiry countdown is computed once (not live). A `Bearer ` prefix or surrounding quotes make the token "invalid". JWE (5 parts) gives a generic error.
- No verification, no encoding/signing.

**Upgrades.**

1. **[S]** Shared Base64url + UTF-8 decode; strip `Bearer `/quotes/whitespace; detect JWE and say "encrypted token, cannot decode payload". Benefit: decodes every real token.
2. **[M]** **Signature verification** with WebCrypto: HS256/384/512 (secret as text/Base64), RS/PS/ES (PEM public key, JWK, or JWKS JSON pasted). Show verified / invalid / not checked as distinct states. Benefit: answers "is this token genuine?" without uploading secrets.
3. **[S]** Honest status row: signature state + `exp`/`nbf`/`iat` checks with clock-skew setting, with **live** countdown and relative times. Benefit: no false "valid".
4. **[M]** **Builder/signer tab**: edit header and payload JSON, sign with HS\* secret or a generated key pair (exportable), and copy the token. Benefit: create test tokens locally.
5. **[S]** "Open payload in JSON viewer", "Compare with another token" (diff of claims). Benefit: debugging auth flows.

**Merge/rename.** Keep. Never share-via-URL (tokens are secrets). Show a privacy note that nothing leaves the browser.

---

### Log Parser — `log-parser` (hub: text, rename "Log Viewer")

**Today.** Paste logs, then auto-detect or choose a format (Spring, Django, Node, log4j, SQL, webpack, generic). Line-by-line regex parsing into level/timestamp/component/message, level chips with counts, text/component/time-range filters, expandable rows, export of filtered raw lines.

**Gaps / bugs.**

- **No file open or drop** (spec: accepts `.log`/text); paste only.
- Re-parses the whole text on every keystroke on the main thread and renders every row (no virtualisation). Large logs hang.
- Every physical line is its own entry, so **Java/Python stack traces are split** into dozens of "info"/"error" rows.
- Generic level detection is substring-based: a line containing "errors=0" or "no failures" counts as an error.
- No JSON/structured logs (pino, bunyan, ECS, Serilog), no nginx/Apache access logs, no syslog, no Docker/K8s prefixes, no custom format.
- Search is substring only. The component filter lets entries without a component through.

**Upgrades.**

1. **[M]** File open/drop (multi-GB via streaming `File.stream()` in a worker), parse in the worker, **virtualised list**, and a line-number gutter. Benefit: handles real production logs.
2. **[M]** **Multi-line grouping** (continuation lines and stack frames attach to the previous entry) plus **structured parsers**: JSON lines (auto-map `level/msg/time`), nginx/Apache combined, syslog RFC 5424, logfmt. Benefit: correct entries for the most common formats.
3. **[M]** **Custom format** defined by a regex with named groups (`(?<ts>…) (?<level>…)`), tested live using Regex Tester components, then saved (persisted). Benefit: any in-house format.
4. **[M]** **Timeline histogram** by level (brush to filter time range), "jump to next error", regex search with highlights, exclude filters, and click a field value to filter on it. Benefit: triage in seconds.
5. **[S]** Export filtered entries as text / JSON / CSV. Benefit: share findings.

**Merge/rename.** Rename "Log Viewer". Keep in Text.

---

### Number Converter — `number-converter` (hub: math)

**Today.** Choose the input base (bin/dec/hex/oct), type a number, and see the other bases with copy, a bit-length badge, a per-bit badge visualisation, and an info tab with a static table.

**Gaps / bugs.**

- `parseInt` loses precision above 2^53: 64-bit values (hashes, IDs, masks) come out wrong.
- On invalid input the error shows but **the previous results stay visible** (stale and misleading).
- Negative numbers, fractions, prefixes (`0x`, `0b`), separators (`_`, spaces) are all rejected.
- Only one editable field; you must pick the "input type" first. The info tab is mostly filler.
- Bit visualisation renders 64 badges; there is no grouping by nibble/byte.

**Upgrades.**

1. **[S]** BigInt engine; **every base field editable** (type in hex, the others update); accept prefixes and separators; clear results on error. Benefit: correct for 64-bit and faster to use.
2. **[M]** **Signed/unsigned views** at 8/16/32/64 bits (two's complement), endianness byte view, and a clickable bit grid grouped by nibble (toggle bits). Benefit: an embedded/debugging staple.
3. **[S]** Any base 2–36 plus Base32/Base58 option; fractional conversion with precision. Benefit: covers edge uses.
4. **[S]** Extra readouts: ASCII/UTF-8 characters for the bytes, IEEE-754 float decode of a 32/64-bit pattern, Unix permission (octal to `rwx`). Benefit: one tool for "what is this number?".
5. **[S]** Share via URL; replace the info tab with an inline "how it works" disclosure. Benefit: leaner UI.

**Merge/rename.** Rename "Number Base Converter". Share a lib with calculator programmer mode.

---

### Password Generator — `password-generator` (hub: security)

**Today.** Length slider 8–64, four character-class toggles, guaranteed one-of-each, CSPRNG with Fisher-Yates shuffle, coloured character display, show/hide, copy, class counts, and a strength label based on **length only**.

**Gaps / bugs.**

- Strength ignores the character pool: 24 digits-only is labelled "Strong". It should use entropy bits (log2(pool^len)).
- `getSecureRandom()` floats are used for indexing (fine in practice). However, the unused `getSecureRandomInRange` has a broken rejection bound: `Math.floor((256^n / max) * max) - 1` equals `256^n - 1`, so nothing is ever rejected. With 4 bytes, `<< 8` also overflows to negative. Fix or delete it before anyone uses it.
- Options are not persisted and do not regenerate on change (a button is needed).
- No passphrase mode, no "exclude ambiguous (Il1O0)", no custom symbol set, no bulk, and the mask uses the `'•'` glyph (R3).

**Upgrades.**

1. **[S]** Entropy-based strength meter (bits, crack-time estimate at stated guess rates), auto-regenerate on option change, persist options. Benefit: honest, instant feedback.
2. **[M]** **Passphrase mode** (EFF large wordlist, about 7,776 words, bundled ~60 KB): word count, separator, capitalise, add number. Benefit: memorable strong passwords.
3. **[S]** Exclude ambiguous characters, custom include/exclude sets, "must not start with a symbol", PIN mode. Benefit: satisfies picky password policies.
4. **[S]** Bulk generate N (copy all / download .txt). Benefit: provisioning and testing.
5. **[M]** **Strength checker** tab: paste an existing password and get a zxcvbn-ts estimate and feedback, all local. Benefit: high-traffic use case with a privacy message.
6. **[S]** Hand-off: "Use for PDF Protect", "Hash this". Benefit: workflow glue.

**Merge/rename.** Keep. Never share via URL.

---

### Pomodoro — `pomodoro` (hub: time)

**Today.** Well-engineered timer: worker ticks, wall-clock resume after reload, sound, tab-title countdown, tasks with estimated pomodoros, current task, settings (durations, auto-start, sound), daily/weekly/total stats and streak. Everything persisted, with a legacy Redux import and good tests.

**Gaps / bugs.**

- **Long break never triggers automatically.** `completeSession` always goes work to short break; the long break is reachable only manually. There is no "long break every N" setting.
- **Starting a focus session requires a current task** (`toggle` is a no-op without one). That is friction for people who only want a timer.
- Skip counts as a completed pomodoro (inflates stats).
- No system notifications (Notification API), so the end of a session is missed when the tab is in the background with sound off. No keyboard shortcuts (Space start/pause, S skip, R reset).
- Stats are counters only; there is no history over time.

**Upgrades.**

1. **[S]** "Long break after N sessions" (default 4) with a session-dots indicator built from the kit `StatusDot`; Skip does not count. Benefit: the classic technique works.
2. **[S]** Task optional ("Just focus" default); Space/S/R shortcuts registered in Mod+K. Benefit: zero-friction start.
3. **[S]** Opt-in system notifications + choice of sounds and volume; optional favicon progress ring. Benefit: never miss a session end.
4. **[M]** History log (per-day sessions, persisted, capped) with a weekly chart and a 12-week heatmap; CSV export. Benefit: motivation and insight.
5. **[S]** Presets (25/5, 50/10, 90/20) via SegmentedControl; a distraction-free full-screen focus view. Benefit: quick set-up.

**Merge/rename.** Rename "Pomodoro Timer". Keep.

---

### QR Code Generator — `qr-code-generator` (hub: web)

**Today.** Types: URL/text/contact (vCard)/WiFi/crypto/custom; colours, size, error-correction level, margin, logo from an image URL with excavate, render as canvas or SVG, download PNG or SVG; an "encryption" option (AES/3DES/RC4/Rabbit via crypto-js); "version" and "mask pattern" inputs.

**Gaps / bugs.**

- **Crypto URIs are wrong.** It emits `btc:…`, `eth:…`, `ltc:…`, `doge:…` by lower-casing the ticker. Wallets expect `bitcoin:` (BIP-21), `ethereum:` (EIP-681), `litecoin:`, `dogecoin:` and so on, so these QR codes will not open in wallets.
- **WiFi and vCard fields are not escaped.** `;` `,` `:` `\` `"` in an SSID or password produce a broken `WIFI:` string, and vCard needs escaping and `N:` plus `FN:`.
- **Encryption silently falls back to plaintext** on error (catch returns `content`), which violates the ToolError model. Encrypted QR codes are unreadable by any scanner without a matching decryptor, and RC4/3DES/Rabbit are obsolete. Low value, high confusion.
- The **mask pattern input is a no-op**: `qrcode.react` receives no mask prop.
- The logo is loaded from a **remote URL**. This makes a third-party request, and a cross-origin image **taints the canvas**, so PNG export throws a SecurityError.
- The render mode (canvas/SVG) is coupled to the download format. No contrast/scannability warning when fg/bg are too similar or inverted.

**Upgrades.**

1. **[S]** Fix URI schemes (per-coin table plus BIP-21 `amount`/`label`), escape WiFi/vCard per spec, add WPA3/none options. Benefit: codes that actually work.
2. **[S]** Remove the encryption feature (or replace it with a "Text encrypt" tool link, see section 3) and remove the dead mask input; surface real errors. Benefit: honest, simpler UI.
3. **[S]** Logo from a **local file** (data URL, no network), with size/excavate. Always offer Download PNG / SVG / **Copy image**, plus a size presets (print DPI) option. Benefit: reliable export.
4. **[M]** **Scannability check**: contrast ratio fg/bg (shared with Color tool), quiet-zone and logo-coverage warnings vs ECC level, and a self-test decode (BarcodeDetector / `jsQR`) of the rendered code. Benefit: confidence before printing.
5. **[M]** More types: email (mailto), SMS, phone, geo, calendar event (iCal VEVENT), MeCard, app-store link; batch from CSV into a ZIP. Benefit: covers what competitors offer.
6. **[M]** **Scan tab**: decode a QR from an image, the clipboard or the camera locally. Benefit: one QR tool for both directions.

**Merge/rename.** Rename "QR Code Generator & Scanner" if the scan tab lands. Share-via-URL is fine for non-WiFi content only.

---

### Random Data Generator — `random-data-generator` (hub: data)

**Today.** Schema builder (nested objects/arrays, about 35 field types: names, email, address, uuid, dates, credit card, etc.) with lodash + `Math.random`. Count input; table or JSON view; JSON download.

**Gaps / bugs.**

- **No upper bound on count.** Typing 10,000,000 freezes or crashes the tab (generation is on the main thread).
- `uuid` is built from `Math.random` (not RFC-quality; use `crypto.randomUUID`). Credit cards are not Luhn-valid, and Amex prefixes get 16 digits (should be 15).
- `avatar` emits `https://randomuser.me/...` URLs. That is a third-party dependency in "nothing leaves your browser" output; if previewed it fetches externally.
- No seed (cannot reproduce a dataset), no locale, JSON export only (`flattenData` exists, but there is no CSV/SQL export), schema not persisted, no import of a schema from an example.

**Upgrades.**

1. **[S]** Count cap with a warning (for example 100k), generation in a worker with progress; `crypto.randomUUID`; Luhn-valid cards with correct lengths per network; avatars as locally generated SVG identicons or data URIs. Benefit: safe, valid, fully offline data.
2. **[M]** **Seeded PRNG** (seed field, "copy seed") so the same schema and seed give the same data. Benefit: reproducible fixtures for tests.
3. **[M]** Export as **CSV / TSV / NDJSON / SQL INSERT (table name, dialect) / TypeScript fixture / XML**; "Open in CSV viewer / JSON viewer". Benefit: drop-in test data for any stack.
4. **[M]** Schema persistence, presets (Users, Orders, Products), **infer schema from a pasted JSON sample**, and export/import the schema as JSON. Benefit: build once, reuse.
5. **[M]** Field options: nullable %, unique, ranges, regex-pattern strings, enum lists, relationships (foreign keys between tables), locale (names/addresses for several countries, bundled). Benefit: realistic data.
6. **[S]** Share the schema (not the data) via URL hash. Benefit: teammates regenerate the same data.

**Merge/rename.** Rename "Mock Data Generator". Could also host a "Lorem ipsum" and "UUID/ULID" mode instead of separate tools (section 3).

---

### Regex Tester — `regex-tester` (hub: text)

**Today.** Pattern input with flag toggles (g i m s u y d), test text with live highlighted preview, match list (first 100, capped at 1,000) with groups and named groups, templates (email, URL, phone, date…), copy `/re/flags`, copy as JS.

**Gaps / bugs.**

- **Runs `RegExp.exec` on the main thread on every keystroke.** A catastrophic-backtracking pattern such as `(a+)+$` on a long string hangs the tab with no way out. This is the most user-visible freeze in the audit.
- "Copy as JS" does not escape `/` in the pattern or newlines in the test text, so the generated code is often a syntax error.
- No replace or split mode, no explanation of the pattern, no multiple test cases, no share link, no flavour notes (JS only, which is fine but should be stated).

**Upgrades.**

1. **[M]** Execute in a **worker with a timeout** (for example 1 s): terminate and respawn on timeout, show an `ErrorState` "Pattern took too long (possible catastrophic backtracking)", and debounce input. Benefit: the tab never freezes.
2. **[M]** **Replace** tab (replacement string with `$1`/`$<name>`, live output, copy) and **Split** tab. Benefit: the other half of regex work.
3. **[M]** **Explain** panel: tokenise the pattern (`regexp-tree` or a hand-written parser) into a readable tree ("capture group 1: one or more digits"), hover to highlight. Benefit: learn and debug patterns.
4. **[S]** **Test cases list**: lines marked should-match / should-not-match with pass/fail badges. Benefit: regex unit tests.
5. **[S]** Share pattern+flags+text via URL hash; persist flags; correct code export (JS, Python, Go, PHP, Java with proper escaping). Benefit: hand-off to code and colleagues.
6. **[S]** Cheat sheet drawer and an expanded template library (search). Benefit: faster authoring.

**Merge/rename.** Keep. Its engine should be reused by the Log Viewer custom formats.

---

### Rive Animation Player — `rive-animation-player` (hub: media)

**Today.** Drop a `.riv` (header validated): play/pause, choose animation or state machine, artboard list, state-machine inputs (number/boolean/trigger), fit/alignment grid, background transparent/white/black, dimensions, debug log, file info.

**Gaps / bugs.** `artboardCount` hard-coded to 1 in the info panel; version/fps sometimes "Unknown"; no playback speed or scrubbing; no Rive events log (only internal debug log); no custom background colour; no export; text runs and view-model (data binding) inputs are not exposed.

**Upgrades.**

1. **[M]** Timeline: speed (0.25x–2x), scrub, loop/ping-pong, frame step for linear animations. Benefit: inspect motion precisely.
2. **[S]** Rive **events** listener panel (name, properties, time), plus correct artboard count and dimensions. Benefit: debugging interactive files.
3. **[S]** Custom background (colour picker plus checkerboard), device-frame previews (phone/tablet sizes). Benefit: see it in context.
4. **[M]** Export the current frame as PNG and record a WebM/GIF of N seconds (MediaRecorder on the canvas). Benefit: share previews without the Rive editor.
5. **[M]** Text-run editing and data-binding (view model) inputs; "copy embed snippet" (React / web runtime with the chosen artboard and state machine). Benefit: designer-developer hand-off.

**Merge/rename.** Keep (niche but differentiated).

---

### Text Diff Checker — `text-diff-checker` (hub: text)

**Today.** Two panes (paste or open file), `diff` library line diff with intraline highlighting, or word/character modes; split/unified/inline views; stats; settings (ignore whitespace/case, trim, etc.); swap.

**Gaps / bugs.**

- `contextLines` and `syntaxHighlighting` exist in `DiffSettings` and the reset defaults but **are never used**. Unchanged regions are never collapsed, so large files are unreadable.
- Diffing runs on the main thread (there is a performance warning, but no worker).
- No next/previous change navigation, no patch export, settings not persisted.
- `ignoreCase` and `ignoreEmptyLines` handling should be verified against output line numbers (preprocessing changes line numbering).

**Upgrades.**

1. **[S]** Implement **collapse unchanged** with N context lines ("Show 120 hidden lines") and **next/prev change** buttons (`n`/`p` keys). Benefit: readable diffs of long files.
2. **[M]** Worker diff with cancel; **export unified patch** (`createTwoFilesPatch`) and copy/download; persist settings. Benefit: big files, and output usable in git.
3. **[M]** **Semantic modes**: JSON (parse, sort keys, diff by path), CSV (by row key), and "ignore reorder" for lines. Benefit: meaningful diffs for data.
4. **[M]** Syntax highlighting (honour the dead setting) via the kit `CodeEditor` adapter, plus merge actions (take left/right per hunk, building a merged result). Benefit: resolve differences, not just view them.
5. **[S]** Share small diffs via URL (size-capped, compressed). Benefit: send a comparison link.

**Merge/rename.** Rename "Text Diff". Keep.

---

### Unit Converter — `unit-converter` (hub: math)

**Today.** Ten categories (length, weight, volume, temperature, area, speed, time, data, pressure, energy) as cards with search; from/to selects; one-way result; swap; last five conversions in history (in memory, added on blur).

**Gaps / bugs.**

- **Data units are binary but labelled SI** (`KB = 1024`, `MB = 1048576`). There is no KiB/MiB vs kB/MB distinction, and the result differs from what most OS/storage vendors show.
- `parseFloat(x.toFixed(10))` **erases tiny values**: eV to J gives `0`.
- Approximate factors (mile 1609.34; exact is 1609.344). Month = 2,628,000 s (30.42 days) is unlabelled.
- History is not persisted and only added on blur. The result is read-only (no reverse edit). No locale number parsing (`1,5`).

**Upgrades.**

1. **[S]** Exact factors; data units split into SI (kB, MB…) and IEC (KiB, MiB…) plus bits/bytes rates; precision via significant digits (and `toPrecision`/exponent display). Benefit: correct numbers.
2. **[M]** **All-units view**: type in any unit field and every other unit in the category updates (bidirectional), with copy on each. Benefit: one glance instead of select juggling.
3. **[M]** More categories: angle, frequency, power, force, torque, fuel economy (L/100km and mpg are inverse), data rate, density, cooking (cups/tbsp by ingredient optional), typography (px/pt/rem/em with base size), and number of shoes/clothes sizes as a stretch. Benefit: covers long-tail searches.
4. **[S]** Persisted history plus pinned favourite conversions; free-text input ("5 ft 3 in to cm", "72F") through mathjs units. Benefit: speed.
5. **[S]** Share via URL; Mod+K command "Convert…". Benefit: discoverability.

**Merge/rename.** Keep. The calculator's mathjs units can share the parsing layer.

---

### URL Encoder/Decoder — `url-encoder-decoder` (hub: encoding)

**Today.** Encode/decode tabs with `encodeURIComponent`/`decodeURIComponent`, live output, "use output as input", copy, and a static explainer card.

**Gaps / bugs.** Only component encoding (no `encodeURI` for full URLs, no `application/x-www-form-urlencoded` where space is `+`). "Use output as input" does not flip the mode, so the second press double-encodes. The Clear button duplicates the textarea's `clearable`. No per-line batch; the raw `URIError` message is shown. The explainer card is static filler.

**Upgrades.**

1. **[S]** Mode selector: component / full URI / form (`+`), plus "decode repeatedly until stable" for double-encoded strings. Benefit: correct for every context.
2. **[S]** Swap flips the mode; per-line batch mode; a friendly `ToolError` naming the bad `%` sequence position. Benefit: fewer mistakes.
3. **[M]** Widen into a **multi-codec "Text Encoder"**: URL, HTML entities, Unicode escapes (`\u`, `\x`, `&#x;`), JavaScript/JSON string escape, Punycode/IDN, hex, quoted-printable. Benefit: one page for every "escape this" job.
4. **[S]** "Open in URL parser" when the decoded text is a URL. Benefit: workflow.

**Merge/rename.** Recommend renaming to **"Text Encoder / Decoder"** (keep id `url-encoder-decoder` for stores, slug `encoding/url` could become `encoding/text`). Base64 stays separate because of file mode.

---

### URL Parser — `url-parser` (hub: web)

**Today.** Parses a URL with `new URL()` into protocol/user/password/host/port/path/query/hash; three tabs (visual breakdown, components list, query params) with copy buttons; paste from clipboard.

**Gaps / bugs.** Read-only (you cannot edit a part and rebuild). The "visual breakdown" and "components" tabs largely duplicate each other. Copy keys for repeated params collide (`param-${key}`), so both duplicates show "Copied". No relative URL support (base URL). No punycode/IDN display, no default-port note, no domain split (subdomain / registrable domain / TLD needs the Public Suffix List, which can be bundled). No tracking-parameter clean-up.

**Upgrades.**

1. **[M]** **Editable builder**: every part and query param (add/remove/reorder/toggle) is editable, and the URL rebuilds live with correct encoding. Benefit: construct URLs, not just read them.
2. **[S]** Merge the two duplicate tabs into one coloured "anatomy" strip (click a segment to copy) plus a params table; fix the duplicate-key copy state. Benefit: cleaner, faster UI.
3. **[S]** Extras: decoded vs raw values, IDN to punycode, default port, base URL for relative input, origin. Benefit: complete picture.
4. **[S]** **Clean URL**: strip `utm_*`, `fbclid`, `gclid` and similar (list editable), copy the clean link. Benefit: a popular privacy micro-task.
5. **[S]** Actions: Send to API Request, Make QR, Open encoder. Share via URL hash. Benefit: workflow glue.

**Merge/rename.** Rename "URL Inspector & Builder". Keep separate from the encoder (different hubs, different jobs), but cross-link.

---

## 3. Proposed new tools (all client-side)

| #   | Tool                                                                                                                                                          | Hub                     | Why it fits                                                             | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------- | ------ |
| 1   | **Epoch & Time Zone Converter**: Unix seconds/ms/µs, ISO, RFC 2822 in both directions; world-clock strip; "now" live                                          | time                    | Top-searched dev utility; pairs with JWT `exp` and Date calc            | S–M    |
| 2   | **Cron Expression Builder**: visual editor, human explanation, next N run times in a chosen zone, Quartz/crontab flavours                                     | time                    | Very common dev need; pure client logic                                 | M      |
| 3   | **UUID / ULID / NanoID Generator**: v4/v7, ULID, NanoID, bulk, decode v7/ULID timestamps                                                                      | security (alsoIn data)  | Tiny, high traffic; reuses CSPRNG lib                                   | S      |
| 4   | **Text Toolkit**: word/char/line counts, reading time, case conversions (camel/snake/kebab/Title), slugify, sort/dedupe/reverse lines, trim, find and replace | text                    | Highest-traffic category on tool sites; trivial offline                 | M      |
| 5   | **Markdown Editor & Preview**: live GFM preview, tables, export HTML / copy rich text / print to PDF                                                          | text                    | Common need; "Export PDF" can hand off to PDF hub                       | M      |
| 6   | **Code Formatter / Minifier**: JSON, HTML, CSS, JS/TS, SQL, YAML via Prettier standalone + sql-formatter (lazy-loaded)                                        | web                     | Natural partner to JSON viewer; fully offline                           | M      |
| 7   | **EXIF Viewer & Remover**: show camera/GPS metadata on a map-free table, strip metadata in batch, ZIP                                                         | media (alsoIn security) | Strong fit with the privacy promise; reuses image pipeline              | M      |
| 8   | **Favicon & App Icon Generator**: from image/SVG/text, all sizes, `.ico`, `manifest.json`, HTML snippet, ZIP                                                  | media                   | Frequently needed by builders; canvas + fflate already present          | M      |
| 9   | **QR & Barcode Scanner**: from image, clipboard or camera (BarcodeDetector, `zxing-wasm` fallback); detects URL/WiFi/vCard and offers actions                 | web                     | Completes QR; can be a tab of the QR tool instead of a page             | M      |
| 10  | **Text Encrypt / Decrypt**: AES-GCM with a PBKDF2/Argon2 passphrase via WebCrypto, armoured output, file mode                                                 | security                | Replaces the QR "encryption" misfeature with a correct, standalone tool | M      |

Considered but lower priority: SVG optimizer (SVGO browser build), YAML/TOML converter (better as a JSON viewer tab), chmod calculator (Number Converter readout), Lorem ipsum (Random data mode), HTML entity encoder (Text Encoder codec), Subnet/CIDR calculator (good "web" candidate if more breadth is wanted).

---

## 4. Cross-tool workflows

**Platform pieces:** (a) extend `shared/lib/handoff.ts` to carry text payloads `{kind:'text', mime, text, sourceTool}`; (b) a kit `SendToMenu` that lists target tools whose manifest declares `accepts` for that mime; (c) Mod+K commands such as "Send result to…". Hand-offs stay in memory and are never persisted.

| Workflow                   | Flow                                                                                                                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Data trio**              | Random data -> "Open in CSV viewer" / "Open in JSON viewer". CSV viewer -> "Export as JSON" -> JSON viewer. JSON viewer (array of objects) -> "Open as table" -> CSV viewer. JSON viewer -> "Infer schema" -> Random data (generate more rows like this).                                  |
| **Token / encoding chain** | Base64 decode detects JWT -> JWT decoder; detects JSON -> JSON viewer; detects image -> preview / Image optimizer. JWT payload -> JSON viewer. JWT HS\* verification uses the same HMAC core as the Hash tool. Hash and Base64 share one output-format control (hex / Base64 / Base64url). |
| **URL chain**              | URL parser -> "Send to API Request" (method GET, params pre-filled) / "Make QR" / "Clean URL" -> copy. URL encoder decoded output is a URL -> URL parser. API Request URL bar -> "Inspect URL".                                                                                            |
| **API debugging**          | API response -> JSON viewer (query), -> Text Diff ("Compare with previous response"), -> JWT (tokens detected in the response body or headers are offered for decoding). cURL pasted anywhere (Mod+K "Import cURL") -> API Request.                                                        |
| **Logs and patterns**      | Log Viewer "Custom format" opens an inline Regex Tester (named groups -> fields). Regex Tester "Use as log format" -> Log Viewer. Log Viewer selected entries -> Text Diff (compare two runs).                                                                                             |
| **Visual design**          | Color & Contrast palette -> QR colours (with the contrast check reused). Image optimizer -> "Extract palette" -> Color. Favicon generator <- Image optimizer output.                                                                                                                       |
| **Images to PDF**          | Image optimizer batch -> "Send to Images to PDF". EXIF remover -> Image optimizer -> Images to PDF. Markdown -> print or export -> PDF hub.                                                                                                                                                |
| **Security**               | Password generator -> "Use for PDF Protect" (hands the password to the quick task) / "Hash this". Text Encrypt <- Password generator (passphrase).                                                                                                                                         |
| **Numbers and time**       | Calculator programmer mode <-> Number converter (same lib, "Open in…" link). Unit converter and Calculator share the mathjs unit parsing. JWT `exp`/`iat` -> Epoch converter -> Date calculator ("days until expiry").                                                                     |

---

## 5. Recommended priority order

**P0: correctness fixes (small, ship first, about 1–2 weeks total; can go before or alongside P5-A2 because the logic is independent of styling)**

1. Hash: HMAC key input; real SHA-3 / labelled Keccak. [S]
2. Base64 + JWT: shared UTF-8/Base64url lib; JWT "Token valid" replaced by an honest status. [S]
3. Calculator: keyboard map with focus guard; angle mode in expressions; grapher `x` substitution. [S]
4. Regex: worker + timeout (no tab freezes); fix "Copy as JS" escaping. [M]
5. JSON viewer: escape search input (crash); live parse with line:col. [S]
6. Date calculator: calendar-accurate difference and end-of-month clamp. [S]
7. QR: crypto URI schemes, WiFi/vCard escaping, remove encryption fallback and dead mask input, local logo. [S]
8. API Request: form-data body, params for all methods, real status when the JSON body is invalid. [S]
9. Image optimizer: background for JPEG, honest PNG option. Unit converter: SI/IEC data units, tiny-value precision. Number converter: BigInt + clear stale results. CSV: delimiter detect + tolerant errors. Pomodoro: long break every N, Skip not counted. Random data: count cap, Luhn, `randomUUID`, no external avatars. [S each]

**P1: shared platform (with or right after P5-A2)** 10. Kit `SourceInput` (paste/open/drop/sample/size) + `useShareableState` (URL hash, non-secret tools only) + text hand-off and `SendToMenu` + per-tool `useCommands` registrations + settings persistence sweep. [M–L] 11. Shared `text-worker` on `worker-rpc` used by regex, diff, CSV, log, JSON, hash files. [M]

**P2: flagship upgrades (largest user-visible gains)** 12. CSV viewer: virtualised grid, multi-filter, profile, multi-format export. [L] 13. JSON/XML: query + copy path, conversions, graph guard. [M–L] 14. Hash: file hashing + verify. Base64: file / data-URI mode. [M] 15. JWT: signature verification + builder. [M] 16. Image optimizer: batch + resize + AVIF + compare slider. [M–L] 17. Regex: replace/split/explain/test cases. [M] 18. Calculator: expression-first engine + programmer mode + grapher rewrite (drop Plotly). [L]

**P3: breadth and polish** 19. Text Diff collapse/nav/patch/semantic; Log Viewer file + grouping + structured formats + timeline; Color contrast pair + palettes; URL builder/clean; Unit all-units view; Date business days + zones; Password passphrase + checker; Pomodoro notifications + history; QR scan + types; Random data seed + exports; API cURL + environments; Rive timeline/events/export. 20. New tools in this order: Text Toolkit, Epoch & Time Zone, UUID/ULID, Code Formatter, Cron Builder, EXIF Remover, Favicon Generator, Markdown, Text Encrypt, QR/Barcode Scanner (or as a QR tab).

**Renames to apply with the P5-A2 manifest migration** (ids unchanged): HTTP Client, Calculator & Grapher, Color & Contrast, CSV Viewer & Converter, Date & Time Calculator, Hash & Checksum, Image Compressor & Resizer, JSON & XML Viewer, Log Viewer, Number Base Converter, Pomodoro Timer, Mock Data Generator, Text Diff, Text Encoder / Decoder (from URL Encoder/Decoder), URL Inspector & Builder.
