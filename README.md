# Tools Dashboard

A curated collection of developer & productivity utilities — all client-side, no tracking, no server. Built with React, [Cynosure](https://github.com/arshad-shah/cynosure), and Vite; deployed to Cloudflare.

![CI](https://github.com/arshad-shah/tools/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

## Tools

| Category     | Tool                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Design       | Color Tester                                                                                                 |
| Security     | Password Generator                                                                                           |
| Development  | Regex Tester · Number Converter · QR Code Generator · JSON / XML Viewer · Unit Converter · Text Diff Checker |
| Productivity | Pomodoro                                                                                                     |
| Science      | Periodic Table                                                                                               |

Every tool runs entirely in your browser — no input ever leaves the page.

## Quick start

```bash
pnpm install
pnpm dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

## Scripts

| Command          | Purpose                                       |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Hot-reloading dev server                      |
| `pnpm build`     | Type-check + production build                 |
| `pnpm lint`      | ESLint                                        |
| `pnpm typecheck` | `tsc --noEmit`                                |
| `pnpm format`    | Prettier write                                |
| `pnpm preview`   | Build + serve via Wrangler (Cloudflare local) |
| `pnpm deploy`    | Build + deploy to Cloudflare                  |

## Tech

- **React 19** + **TypeScript** with strict mode
- **[Cynosure](https://github.com/arshad-shah/cynosure)** for every UI primitive — two custom themes (`dashboard-light` / `dashboard-dark`) defined in `src/theme/dashboard-theme.css`
- **Vite 6** + **pnpm**
- **Cloudflare Workers** (Wrangler) for hosting
- ESLint, Prettier, Husky + lint-staged for guardrails

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, conventions, and how to add a new tool.

## Security

Vulnerability reports: see [SECURITY.md](./SECURITY.md). **Please do not open a public issue for security reports** — use GitHub's private vulnerability reporting.

## License

[MIT](./LICENSE) © Arshad Shah
