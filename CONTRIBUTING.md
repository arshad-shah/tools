# Contributing

Thanks for considering a contribution. This document covers the dev setup, the design-system rules and the conventions used in this codebase.

## Prerequisites

- Node 22 or newer
- pnpm 10 (the lockfile is pnpm; npm and yarn are not accepted in PRs)

## Setup

```bash
pnpm install        # also installs the husky pre-commit hook
pnpm fixtures       # generates the PDF, image and text test fixtures
pnpm dev            # local dev server
```

The pre-commit hook runs `eslint --fix` and `prettier --write` on staged files.

## Useful scripts

| Script                    | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                | Vite dev server with hot reload                                       |
| `pnpm build`              | Type-check (`tsc -b`) and production build                            |
| `pnpm lint`               | ESLint over the whole repo, zero warnings allowed                     |
| `pnpm typecheck`          | `tsc -b`                                                              |
| `pnpm test`               | Vitest unit and component tests (`src/**/*.test.ts(x)`, `test/*.ts`)  |
| `pnpm test:e2e`           | Playwright end-to-end tests in `test/e2e` (starts its own dev server) |
| `pnpm test:visual`        | Visual regression and axe in both themes (`test/visual`)              |
| `pnpm test:visual:docker` | The visual suite in the pinned Playwright container                   |
| `pnpm format`             | Prettier write                                                        |

`pnpm test:e2e` starts a dev server on port 5174. Set `E2E_PORT` to run several checkouts side by side, for example `E2E_PORT=5193 pnpm test:e2e`. The built-asset tests (`test/dist-glyphs.test.ts`, `test/bundle-size.test.ts`) skip locally until `pnpm build` has produced `dist/`.

## Project layout

```
src/
  app/          router, category routes, tool registry, pages (Home, hubs,
                PDF hub, tool page), shell (navigation, Mod+K, shortcut sheet)
  shared/
    surfaces/   drawing surfaces: canvases, the sandboxed HTML frame, the
                code tree, the virtual list, the logo, the PDF page layers
                (page/, pdf/) (raw elements allowed)
    editor/     CodeMirror 6, themed from Cynosure
    charts/     swift-chart, themed from Cynosure
    lib/        browser plumbing: download, clipboard, files, format, errors,
                notify, id, hotkeys, commands, worker-rpc, grid sort/filters
    state/      createToolStore (persisted zustand stores) and useJob
  pdf/
    doc/        the workspace document model (no React)
    workspace/  the workspace UI and its modes
    render/     pdf.js in a worker: open, bitmaps, text, geometry
    edit/       pdf-lib in a worker: materialisation and page edits
    detect/ redact/ ocr/ sign/ compress/ qpdf/ convert/   domain modules
    components/ shared PDF UI used by the quick tasks
  theme/        app.css (Cynosure's styles and font) and the generated
                Cynosure theme (cynosure-theme.css)
  tools/<id>/   one folder per tool
eslint-rules/   the local design-system ESLint plugin
test/           e2e, visual, fixtures and build-level tests
docs/           mode-authoring.md and the design documents
```

Everything is client-side: document bytes never leave the browser.

## Design-system rules

These rules are enforced by lint and tests; a PR that breaks them fails CI.

- Compose Cynosure. Pages and tools use `@arshad-shah/cynosure` components only: `Container`, `Section`, `Stack`, `Inline`, `Grid` for layout, `Heading`, `Text`, `Link`, `List` for text. No raw element (`div`, `span`, `p`, `ul`, `button`, `input`, `a`, `svg`...), no `className`, no `style` prop and no imperative style write outside `src/shared/surfaces/` and the editor and chart mount points (`local/no-raw-ui`).
- When Cynosure lacks something, write it down in `docs/cynosure-gaps.md` and use the closest Cynosure composition; it is fixed in Cynosure, never patched here. A genuine drawing surface goes in `src/shared/surfaces/`, styled by its own CSS from `--cy-*` tokens.
- Icons are Facet icons from `@arshad-shah/cynosure/icons` (tool and category manifests carry Facet `IconData`), drawn with Cynosure's `Icon`, `IconTile` or a component's `icon` prop. No icon package (`lucide-react` and the like) anywhere (rule c).
- No glyphs in product text: no emoji, pictographs, dingbats, arrows, geometric shapes, box drawing or technical symbols in strings, JSX text, toasts, labels or test names in `src` (rule a). Use icons, the `Kbd` component for keys, `MetaList` for separated values, or plain words ("to", "and", "Copyright"). Code that must recognise such characters builds them from code points, for example `String.fromCodePoint(0x2192)`.
- Colours come from Cynosure's tokens (`--cy-color-*`) through components and their `tone`s, never literals. Every page works in the light and dark themes and with reduced motion.
- The design-system rules are never disabled inline; `test/no-inline-disable.test.ts` fails on any such comment.
- WCAG 2.2 AA: every control has an accessible name, every pointer action has a keyboard path, and the visual suite's axe check reports no serious or critical findings.

## When Cynosure lacks something

Add a row to `docs/cynosure-gaps.md` (what, where, what tools does meanwhile) and compose the closest Cynosure components. Only a drawing surface (a canvas, a frame, a virtualised scroller Cynosure does not have yet) is written here, in `src/shared/surfaces/<name>/`, with a test and its own stylesheet that reads `--cy-*` tokens. When Facet has no icon that fits, it is drawn in Cynosure first (list it in `GAPS-icons.md`).

## Code conventions

- Imports use `@/` paths. Relative imports stay inside their module folder.
- Files stay under 400 lines; split before a file grows past it.
- Browser plumbing goes through the shared helpers: `saveBlob`, `saveZip` and `deriveFilename` for downloads, `copyText` for the clipboard, `loadFile` and `readBytes` for files, `formatBytes` for sizes, `notify` for toasts, `newId()` for ids.
- No silent failures and no silent fallbacks. Errors are `ToolError`s with a plain message, shown through `ErrorState`, `Alert` or `notify.error`; any fallback (kept original, rasterised page, skipped page) is reported in the UI.
- Settings that survive a reload go in a store built with `createToolStore`; async work with progress and cancel uses `useJob`; workers are reached through `worker-rpc`.
- Tests prefer `getByRole` with an accessible name; `data-testid` only where there is no role (canvas overlays, page slots).
- Never write literals that look like credentials in tests; build them from parts at runtime.

## Adding a new tool

A tool is one folder whose name is the tool id:

```
src/tools/<tool-id>/
  index.ts      manifest: default-exports defineTool({...})
  Tool.tsx      the tool component (lazy-loaded)
  settings.ts   persisted settings via createToolStore (optional)
  components/   PascalCase .tsx sub-components (optional)
  hooks/        useX.ts hooks (optional)
  lib/          kebab-case pure .ts helpers, with tests next to them (optional)
```

### 1. The manifest

```ts
// src/tools/your-tool/index.ts
import { calculator } from '@arshad-shah/cynosure/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'your-tool', // must equal the folder name
  name: 'Your Tool',
  description: 'One-line description shown on cards and in search',
  icon: calculator, // a Facet icon
  category: 'math', // see ToolCategory in src/app/tool.ts
  slug: 'your-tool', // the route is /<category>/<slug>
  kind: 'tool',
  keywords: ['plain', 'search', 'words'],
  enabled: true,
  load: () => import('./Tool'),
});
```

`src/app/registry.ts` discovers every `src/tools/*/index.ts`. It throws at startup if a manifest is malformed, if two tools share an id or a route, or if the folder name differs from the id. Nothing else needs registering: the hub card, route, search and favourites pick the tool up. Add `accepts` to take files dropped on a hub or handed off from another tool.

### 2. The component

```tsx
// src/tools/your-tool/Tool.tsx
import type { ToolProps } from '@/app/tool';
import { Card, Stack, Text } from '@arshad-shah/cynosure';

export default function YourTool({ definition }: ToolProps) {
  return (
    <Stack gap="4">
      <Card title="Input">
        <Text>{definition.description}</Text>
      </Card>
    </Stack>
  );
}
```

The tool page already renders the breadcrumb, the header and an error boundary around your component; don't render those yourself.

### 3. Tests

- Unit tests sit next to the code (`lib/parse.test.ts`) and run with `pnpm test`.
- `test/e2e/route-table.spec.ts` and `test/e2e/smoke.spec.ts` visit every enabled tool and fail on console errors, so a new tool is covered automatically. Add a focused spec in `test/e2e/` for flows such as uploads and downloads.

## Adding a workspace mode

See [docs/mode-authoring.md](./docs/mode-authoring.md).

## Before you open a PR

- [ ] `pnpm lint` clean (0 errors, 0 warnings)
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test:e2e` passes
- [ ] `pnpm test:visual` passes for UI changes (baselines updated only for intended changes)
- [ ] Checked at phone, tablet and desktop widths, in both themes
- [ ] No new dependencies without discussion in the PR (MIT-compatible licences only)

## Reporting bugs and security issues

- Functional bugs: open an issue with the GitHub bug-report template.
- Security issues: do not open a public issue. See [SECURITY.md](./SECURITY.md).
