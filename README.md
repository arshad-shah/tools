# Tools

Free, private browser tools: a PDF workspace and 32 everyday tools for text, data, encoding, security, maths, time, media and the web. Everything runs on your device; files and text never leave the browser. Built with React 19, TypeScript and Vite, and deployed to Cloudflare.

![CI](https://github.com/arshad-shah/tools/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

## What is inside

| Category  | Tools                                                                                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF       | PDF workspace (organise, fill and sign, redact, convert, protect, optimise), PDF Merger, PDF Splitter, PDF Compressor, Images to PDF, PDF to Images, PDF to Text, Protect PDF, Unlock PDF, Watermark PDF, Add Page Numbers |
| Text      | Regex Tester, Text Diff, Log Viewer, Text Toolkit, Markdown Editor & Preview                                                                                                                                               |
| Data      | CSV Viewer & Converter, JSON & XML Viewer, Mock Data Generator                                                                                                                                                             |
| Encoding  | Base64 Encoder / Decoder, JWT Decoder, Text Encoder / Decoder                                                                                                                                                              |
| Security  | Hash & Checksum, Password Generator, Text & File Encrypt, UUID / ULID / NanoID Generator                                                                                                                                   |
| Math      | Calculator & Grapher, Number Base Converter, Unit Converter                                                                                                                                                                |
| Time      | Cron Expression Builder, Date & Time Calculator, Epoch & Time Zone Converter, Pomodoro Timer                                                                                                                               |
| Media     | Color & Contrast, EXIF Viewer & Remover, Favicon & App Icon Generator, Image Compressor & Resizer, Rive Animation Player                                                                                                   |
| Web & dev | HTTP Client, Code Formatter & Minifier, QR Code Generator, QR & Barcode Scanner, URL Inspector & Builder                                                                                                                   |

Tools hand results to each other ("Send to", and "Send result to" in the Mod+K palette), and several can share their state as a link (the state lives in the URL fragment, which browsers never send to a server).

Tools are grouped into category hubs, each at `/<category>`, with every tool at `/<category>/<slug>`:

- PDF: the document workspace at `/pdf/edit` (Organize, Edit, Annotate, Fill and Sign, Redact, Convert, Protect, Optimize, OCR) and quick tasks such as merge, split and compress
- Text, Data, Encoding, Web, Security, Math, Media and Time: formatters, viewers, converters, generators and inspectors

Press `Mod+K` (Command on macOS, Ctrl elsewhere) anywhere to search tools and actions, and `?` to see every keyboard shortcut.

### Privacy and network

- No tool uploads your data. The e2e suite (`test/e2e/no-network.spec.ts`) visits every tool and fails on any third-party request.
- Two features talk to other servers, and only when you ask: the **HTTP Client** sends the requests you build (that is its job), and the **Markdown Editor** loads remote images in a document only after you choose "Load for this document".
- Settings are remembered on your device; inputs, outputs, keys and documents are not stored, except the labelled opt-ins in the HTTP Client (secret values, history).
- Bundled libraries and their licences are listed under "licences" in the footer.
- PDF workspace: your files are processed on this device. Documents you edit are saved only in this browser (you can clear them in settings). Optional network use: OCR language data from this site, and a timestamp server you choose when signing.

## Quick start

```bash
pnpm install
pnpm dev
```

Then open the URL Vite prints (usually <http://localhost:5173>). The kit gallery, a dev-only page with every UI component in both themes, is at `/__kit`.

## Scripts

| Command                      | Purpose                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`                   | Dev server with hot reload                                             |
| `pnpm build`                 | Type-check and production build (also needed by the built-asset tests) |
| `pnpm lint`                  | ESLint with the design-system rules, zero warnings allowed             |
| `pnpm typecheck`             | `tsc -b`                                                               |
| `pnpm test`                  | Vitest unit and component tests                                        |
| `pnpm test:e2e`              | Playwright end-to-end tests (starts its own dev server)                |
| `pnpm test:e2e --grep @perf` | Workspace performance budgets on a 300-page PDF (nightly in CI)        |
| `pnpm test:visual`           | Visual regression and axe checks, both themes                          |
| `pnpm test:visual:docker`    | The visual suite in the pinned Playwright container (Linux baselines)  |
| `pnpm test:csp`              | Production build under the Content Security Policy                     |
| `pnpm fixtures`              | Regenerate the PDF, image and text test fixtures                       |
| `pnpm preview`               | Build and serve with Wrangler (Cloudflare local)                       |
| `pnpm licences`              | Fails on a production dependency outside the licence allow-list        |
| `pnpm format`                | Prettier write                                                         |
| `pnpm deploy`                | Build and deploy to Cloudflare                                         |

## Architecture

### Shell

`src/app` holds the router, the category routes (`categories.ts`, `routes.ts`), the tool registry and the pages: Home, the category hubs, the PDF hub and the tool page. `src/app/shell` is the frame around them: the top bar with breadcrumbs, the `Mod+K` command palette with its command sources, the keyboard shortcut sheet, the help menu and the toaster. The workspace route (`/pdf/edit/:mode?`) uses a slimmer frame because the workspace draws its own full-height shell.

Tools are discovered from `src/tools/<tool-id>/index.ts` manifests (`defineTool`). A manifest names the tool, its category and slug, its keywords for search and the file kinds it accepts from a hub drop or a hand-off. Each tool's component is lazy-loaded.

### Kit and enforcement rules

`src/shared/ui` is the UI kit and the only place that may use raw elements (`button`, `input`, `svg`, `canvas` and so on), inline styles or icons from lucide. Everything else composes kit components. Icons are SVG components from `@/shared/ui/icons`: lucide icons wrapped with the kit defaults, and custom icons drawn on the same 24px grid. Third-party visual libraries are reached through `src/shared/ui/adapters`. Colours, spacing and motion are tokens in `src/theme/tokens.css`, with light and dark themes and reduced motion.

The rules are enforced, not advisory:

- `eslint-rules/` is a local ESLint plugin: no pictographic, arrow or box-drawing glyphs in product text (rule a), no raw UI elements, `style` props or imperative style writes outside the kit (rule b), no `lucide-react` outside the icon module (rule c), and no inline disabling of these rules.
- `test/dist-glyphs.test.ts` scans the production build for glyphs.
- `test/icons-grid.test.ts` checks every custom icon against the 24px grid.
- The visual suite runs axe on every page and fails on serious or critical findings.

### Workspace document model

`src/pdf/doc` (no React) is the document model. An open document is an append-only log of operations with a cursor: undo and redo move the cursor, a new operation after an undo drops the later ones. The view (page order, rotation, crop, overlay objects) is a fold of the log over the source pages, so nothing is written to a PDF while you work. Operations come in three kinds:

- structure: page order and page properties
- overlay: objects drawn on pages (fields, annotations, text, marks)
- checkpoint: steps that need the real bytes (redaction, OCR, compression); a checkpoint stores its output as the new base and stays undoable

Export materialises the view in the edit worker: page ops, then each overlay writer by phase (form fields, flattened fields, page content, signatures, annotations, metadata), then the export stages (strip metadata when chosen, remove unreferenced objects after a redaction or sanitise, encrypt, linearize). The log, cursor, mode and viewport autosave to IndexedDB, so a reload restores the document and its history.

### Workers

Heavy work runs off the main thread through `worker-rpc`:

- the render worker (pdf.js): opening, page bitmaps, text and geometry
- the edit worker (pdf-lib): materialisation and page edits
- qpdf-wasm: encryption, unlocking, linearization and repair
- the compression pipeline
- the OCR pool (tesseract.js), loaded only after consent, with language data served from this site

Checkpoints are orchestrated on the main thread by checkpoint runners that call these services.

### Modes

Each workspace mode is a folder in `src/pdf/workspace/modes/<mode-id>/` with a manifest (`index.ts`) and a lazily loaded `ModeModule` (`Mode.tsx`): toolbar, optional inspector and page overlay, commands and shortcuts. Mode folders hold thin UI only; operation logic lives in `src/pdf/doc/ops` (view side), `src/pdf/doc/materialize` (worker side) and `src/pdf/doc/checkpoints` (runners). See [docs/mode-authoring.md](./docs/mode-authoring.md).

### Tech

- **React 19** and **TypeScript 6** (strict), **Vite 8**, **Tailwind CSS 4**, pnpm
- An in-house UI kit (`src/shared/ui`) with light and dark themes from design tokens (`src/theme/tokens.css`), WCAG 2.2 AA
- Heavy work in Web Workers; pdf.js, qpdf-wasm and pdf-lib for PDFs
- **Cloudflare Workers** (Wrangler) for hosting
- Vitest, Playwright and axe; ESLint, Prettier, Husky and lint-staged for guardrails

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, the design-system rules and how to add a tool or a kit component.

## Security

Vulnerability reports: see [SECURITY.md](./SECURITY.md). Please do not open a public issue for security reports; use GitHub's private vulnerability reporting.

## License

[MIT](./LICENSE), Copyright Arshad Shah
