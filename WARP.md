# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

A fully client-side React 19 + TypeScript tools dashboard: developer and productivity utilities plus a set of PDF tools, each a self-contained folder under `src/tools/`. Built with Vite and styled with Tailwind CSS v4 through a small in-repo UI kit. No document bytes leave the browser.

## Key Development Commands

- **Install**: `pnpm install` (pnpm only)
- **Dev server**: `pnpm dev`
- **Build**: `pnpm build` (`tsc -b` then `vite build`)
- **Type check**: `pnpm typecheck`
- **Lint**: `pnpm lint`
- **Unit tests**: `pnpm test` (Vitest; `pnpm test:watch` to watch)
- **E2E tests**: `pnpm test:e2e` (Playwright; starts its own dev server on port 5174, override with `E2E_PORT=<port>`)
- **Regenerate test fixtures**: `pnpm fixtures`
- **Preview / deploy (Cloudflare)**: `pnpm preview` / `pnpm deploy`

## Architecture Overview

### Tool discovery

- Each tool lives in `src/tools/<id>/`, and the folder name **is** the tool id and URL slug (`/<id>`).
- `index.ts` default-exports `defineTool({ id, name, description, icon, category, enabled, load })` from `@/app/tool`, where `load: () => import('./Tool')`.
- `src/app/registry.ts` collects every `src/tools/*/index.ts` with `import.meta.glob`. It validates each manifest, rejects duplicate ids, and throws if a folder name differs from its id.
- `App.tsx` builds a lazy route per enabled tool, and `ToolLayout.tsx` wraps each tool in the shared header and an error boundary.

There is no central list to edit: adding the folder is enough.

### Tool folder layout

```
src/tools/<tool-id>/
├── index.ts       # manifest (defineTool)
├── Tool.tsx       # main component, receives { definition }: ToolProps
├── types.ts       # co-located types
├── store.ts       # persisted state via createToolStore (if needed)
├── components/    # PascalCase .tsx sub-components
├── hooks/         # useX.ts hooks
└── lib/           # kebab-case pure .ts helpers + *.test.ts next to them
```

### Shared code

- `src/app/`: router (`App.tsx`), `Dashboard.tsx`, `ToolLayout.tsx`, error boundaries, `registry.ts`, `tool.ts` (`defineTool`, `ToolProps`, `ToolCategory`).
- `src/shared/ui/`: the UI kit (`@/shared/ui`), built on Tailwind theme tokens.
- `src/shared/lib/`: `download` (`saveBlob`, `saveZip`, `deriveFilename`), `clipboard`, `files` (`loadFile`, `readBytes`), `format` (`formatBytes`), `errors` (`ToolError`), `notify`, `id` (`newId`), `worker-rpc`.
- `src/shared/state/`: `createToolStore` (zustand + persistence under `kit:store:tool:<id>`) and `useJob` (async work with progress and cancel).
- `src/pdf/`, shared by the PDF tools:
  - `edit/`: pdf-lib editing.
  - `render/`: pdf.js in a worker, thumbnails, text extraction.
  - `qpdf/`: qpdf-wasm encrypt, unlock and optimise. It arrives with the PDF security tools.
  - `compress/`: the compression pipeline. It also arrives with the PDF security tools.
  - `components/`: dropzone, page grid, job panel, result files.
- `src/theme/terminal.css`: Tailwind v4 theme tokens. The app is dark-only.

### State

- Local React state by default.
- Anything that must survive a reload uses a tool `store.ts` built with `createToolStore`. Legacy localStorage keys are imported once.

### Error handling

- Global `ErrorBoundary` plus a per-tool `ToolErrorBoundary`.
- User-visible failures go through `notify.error(...)` or an inline kit `Alert`, never silently.

## Testing

- **Vitest** (`vitest.config.ts`) runs `src/**/*.test.{ts,tsx}` and `test/**/*.test.ts`. Tests sit next to the code they cover.
- **Playwright** (`playwright.config.ts`) runs `test/e2e/*.spec.ts`.
  - `smoke.spec.ts` visits every enabled tool and fails on console errors.
  - The other specs cover individual tools.
  - `E2E_PORT` lets several worktrees run e2e in parallel.

## Technology Stack

React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, zustand, pdf-lib, pdfjs-dist, qpdf-wasm, lucide-react, Vitest, Playwright, pnpm.

## CI/CD

GitHub Actions (`.github/workflows/`): `ci.yml` runs lint, typecheck, build, unit tests and Playwright e2e. `main.yml` builds and publishes on pushes to `master`, and `gitleaks.yml` scans for secrets.
