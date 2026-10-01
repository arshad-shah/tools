# Contributing

Thanks for considering a contribution. This document covers the dev setup and the conventions used in this codebase.

## Prerequisites

- **Node** 20.x or newer
- **pnpm** (the lockfile is pnpm; npm/yarn won't be accepted in PRs)

## Setup

```bash
pnpm install        # runs husky prepare automatically
pnpm dev            # local dev server
```

The first install wires up the pre-commit hook (`pnpm exec lint-staged`), which runs `eslint --fix` and `prettier --write` on staged files.

## Useful scripts

| Script              | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm dev`          | Vite dev server with HMR                                              |
| `pnpm build`        | Type-check (`tsc -b`) + production build                              |
| `pnpm lint`         | ESLint over the whole repo                                            |
| `pnpm typecheck`    | `tsc -b` (faster than `build` for type-only checks)                   |
| `pnpm test`         | Vitest unit and component tests (`src/**/*.test.ts(x)`, `test/*.ts`)  |
| `pnpm test:e2e`     | Playwright end-to-end tests in `test/e2e` (starts its own dev server) |
| `pnpm format`       | Prettier-write everything                                             |
| `pnpm format:check` | CI-style Prettier check                                               |
| `pnpm preview`      | Build + run via Wrangler (Cloudflare local)                           |

## Project layout

```
src/
  app/        App shell: router, Dashboard, ToolLayout, error boundaries,
              registry.ts (tool discovery) and tool.ts (defineTool, ToolProps)
  shared/
    ui/       the UI kit (Button, Card, Tabs, FileUpload, …), imported from '@/shared/ui'
    lib/      browser plumbing: download, clipboard, files, format, errors, notify, id, worker-rpc
    state/    createToolStore (persisted zustand stores) and useJob (async work with progress/cancel)
  pdf/
    edit/        pdf-lib based editing (load, page ops, stamps, forms, markup)
    render/      pdf.js rendering in a worker, thumbnails and text extraction
    qpdf/        qpdf-wasm wrapper (encrypt, unlock, optimise) — arrives with the PDF security tools
    compress/    the PDF compression pipeline — arrives with the PDF security tools
    components/  shared PDF UI (dropzone, page grid, thumbnails, job panel, result files)
  theme/      terminal.css: Tailwind v4 theme tokens (dark-only)
  tools/<id>/ one folder per tool (see below)
test/
  e2e/        Playwright specs; smoke.spec.ts visits every enabled tool
  fixtures/   generated PDF/image fixtures (`pnpm fixtures`)
```

Everything is client-side: no document bytes leave the browser.

## Project conventions

- **Imports**: use `@/` paths. Relative imports stay inside the tool folder (`./x`, `../lib/x`); never `../../`.
- **UI**: build from the kit in `@/shared/ui` and Tailwind theme tokens (`bg-surface`, `text-fg-muted`, `border-line`, `text-danger`, …). No CSS modules or JS style objects; inline `style` only for data-driven values.
- **Browser plumbing**: use the shared helpers, never hand-rolled versions — `saveBlob`/`saveZip`/`deriveFilename` for downloads, `useClipboard`/`copyText` for the clipboard, `loadFile`/`readBytes` and the kit's `FileUpload`/`FilePicker` for files, `formatBytes` for sizes, `notify` for toasts, `newId()` for ids.
- **Errors**: no silent failures. User-visible failures go through `notify.error(...)` or an inline kit `Alert`.
- **State**: local `useState` first. Settings or data that must survive a reload go in a `store.ts` built with `createToolStore` (stored under `kit:store:tool:<id>`).
- **Icons**: `lucide-react`.

## Adding a new tool

A tool is one folder whose name is the tool id, which is also its URL (`/<id>`):

```
src/tools/<tool-id>/
  index.ts      manifest: default-exports defineTool({...})
  Tool.tsx      the tool component (lazy-loaded)
  types.ts      the tool's types (optional)
  store.ts      persisted state via createToolStore (optional)
  components/   PascalCase .tsx sub-components (optional)
  hooks/        useX.ts hooks (optional)
  lib/          kebab-case pure .ts helpers, with tests next to them (optional)
```

### 1. The manifest

```ts
// src/tools/your-tool/index.ts
import { Calculator } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'your-tool', // must equal the folder name
  name: 'Your Tool',
  description: 'One-line description shown on the dashboard card',
  icon: Calculator,
  category: 'data', // see ToolCategory in src/app/tool.ts
  version: '1.0.0',
  enabled: true,
  isNew: true, // shows the "New" badge
  load: () => import('./Tool'),
});
```

`src/app/registry.ts` discovers every `src/tools/*/index.ts` with `import.meta.glob`. It throws at startup if a manifest is malformed, if two tools share an id, or if the folder name differs from the id. There is nothing else to register: the dashboard card, route, search and favourites pick the tool up automatically.

### 2. The component

```tsx
// src/tools/your-tool/Tool.tsx
import type { ToolProps } from '@/app/tool';
import { Card, CardBody, Stack, Text } from '@/shared/ui';

export default function YourTool({ definition }: ToolProps) {
  return (
    <Stack gap="4">
      <Card>
        <CardBody>
          <Text>{definition.description}</Text>
        </CardBody>
      </Card>
    </Stack>
  );
}
```

`ToolLayout` already renders the back button and header around your component, and wraps it in an error boundary; don't render those yourself.

### 3. Tests

- Put unit tests next to the code (`lib/parse.test.ts`). Vitest runs them with `pnpm test`.
- The Playwright smoke test (`test/e2e/smoke.spec.ts`) visits every enabled tool and fails on any console error, so a new tool is covered automatically. Add a focused spec in `test/e2e/` for flows such as uploads and downloads.
- `pnpm test:e2e` starts a dev server on port 5174. Set `E2E_PORT` to run several checkouts side by side, e.g. `E2E_PORT=5193 pnpm test:e2e`.

## Before you open a PR

- [ ] `pnpm lint` clean
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test:e2e` passes
- [ ] Tested at mobile, tablet, and desktop widths
- [ ] No new dependencies added without discussion in the PR

## Reporting bugs / security issues

- Functional bugs → open an issue via the GitHub bug-report template.
- Security issues → do **not** open a public issue. See [SECURITY.md](./SECURITY.md).
