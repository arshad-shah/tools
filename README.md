# Tools Dashboard

Free, private browser tools: a PDF workspace and 32 everyday tools for text, data, encoding, security, maths, time, media and the web. Everything runs on your device; files and text never leave the browser. Built with React 19, TypeScript and Vite, and deployed to Cloudflare.

![CI](https://github.com/arshad-shah/tools/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

## Tools

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

### Privacy and network

- No tool uploads your data. The e2e suite (`test/e2e/no-network.spec.ts`) visits every tool and fails on any third-party request.
- Two features talk to other servers, and only when you ask: the **HTTP Client** sends the requests you build (that is its job), and the **Markdown Editor** loads remote images in a document only after you choose "Load for this document".
- Settings are remembered on your device; inputs, outputs, keys and documents are not stored, except the labelled opt-ins in the HTTP Client (secret values, history).
- Bundled libraries and their licences are listed under "licences" in the footer.

## Quick start

```bash
pnpm install
pnpm dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

## Scripts

| Command            | Purpose                                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| `pnpm dev`         | Hot-reloading dev server                                                    |
| `pnpm build`       | Type-check and production build                                             |
| `pnpm lint`        | ESLint (0 warnings allowed)                                                 |
| `pnpm typecheck`   | `tsc -b`                                                                    |
| `pnpm test`        | Unit and component tests (Vitest)                                           |
| `pnpm test:e2e`    | End-to-end tests (Playwright, Chromium)                                     |
| `pnpm test:visual` | Visual regression and axe checks (`test:visual:docker` for Linux baselines) |
| `pnpm licences`    | Fails on a production dependency outside the licence allow-list             |
| `pnpm format`      | Prettier write                                                              |
| `pnpm preview`     | Build and serve with Wrangler (Cloudflare local)                            |
| `pnpm deploy`      | Build and deploy to Cloudflare                                              |

## Tech

- **React 19** and **TypeScript 6** (strict), **Vite 8**, **Tailwind CSS 4**, pnpm
- An in-house UI kit (`src/shared/ui`) with light and dark themes from design tokens (`src/theme/tokens.css`), WCAG 2.2 AA
- Heavy work in Web Workers; pdf.js, qpdf-wasm and pdf-lib for PDFs
- **Cloudflare Workers** (Wrangler) for hosting
- Vitest, Playwright and axe; ESLint, Prettier, Husky and lint-staged for guardrails

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, conventions, and how to add a new tool.

## Security

Vulnerability reports: see [SECURITY.md](./SECURITY.md). **Please do not open a public issue for security reports** — use GitHub's private vulnerability reporting.

## License

[MIT](./LICENSE) © Arshad Shah
