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
                PDF hub, tool page), shell (top bar, Mod+K, shortcut sheet),
                gallery/ (the dev-only kit gallery at /__kit)
  shared/
    ui/         the UI kit, imported from '@/shared/ui'; icons/ and adapters/
    lib/        browser plumbing: download, clipboard, files, format, errors,
                notify, id, hotkeys, commands, worker-rpc, theme
    state/      createToolStore (persisted zustand stores) and useJob
  pdf/
    doc/        the workspace document model (no React)
    workspace/  the workspace UI and its modes
    render/     pdf.js in a worker: open, bitmaps, text, geometry
    edit/       pdf-lib in a worker: materialisation and page edits
    detect/ redact/ ocr/ sign/ compress/ qpdf/ convert/   domain modules
    components/ shared PDF UI used by the quick tasks
  theme/        tokens.css: colour, type, spacing and motion tokens
  tools/<id>/   one folder per tool
eslint-rules/   the local design-system ESLint plugin
test/           e2e, visual, fixtures and build-level tests
docs/           mode-authoring.md and the design documents
```

Everything is client-side: document bytes never leave the browser.

## Design-system rules

These rules are enforced by lint and tests; a PR that breaks them fails CI.

- Compose the kit. Tools, modes, `src/app`, `src/pdf/components` and `src/pdf/workspace` use components from `@/shared/ui` only. Raw `button`, `input`, `select`, `textarea`, `svg`, `img`, `canvas`, `video`, `audio` and `iframe` elements, `style` props and imperative style writes (`element.style.left = ...`, `setAttribute('style', ...)`) are allowed only inside `src/shared/ui` (rule b).
- Icons are SVG only, from `@/shared/ui/icons`. Use an existing `Icon...` export; if none fits, add a custom icon (see below). Only the icon module imports `lucide-react` (rule c).
- No glyphs in product text: no emoji, pictographs, dingbats, arrows, geometric shapes, box drawing or technical symbols in strings, JSX text, toasts, labels or test names in `src` (rule a). Use icons, the `Kbd` component for keys, `MetaList` for separated values, or plain words ("to", "and", "Copyright"). Code that must recognise such characters builds them from code points, for example `String.fromCodePoint(0x2192)`.
- Colours come from tokens (`bg-surface`, `text-fg-muted`, `border-line`, `text-danger`), never literals. Every surface works in the light and dark themes and with reduced motion: animate with `motion-safe:` variants.
- The design-system rules are never disabled inline; `test/no-inline-disable.test.ts` fails on any such comment.
- WCAG 2.2 AA: every control has an accessible name, every pointer action has a keyboard path, and the visual suite's axe check reports no serious or critical findings.

## Add a kit component first

When a tool or mode needs something the kit does not have, add it to the kit before using it:

1. Create `src/shared/ui/<component-name>.tsx`. Build it from tokens and existing primitives. This is where raw elements and data-driven `style` values (positions, sizes) belong.
2. Add `src/shared/ui/<component-name>.test.tsx` next to it: roles and accessible names, keyboard behaviour, and every state it has.
3. Export it from `src/shared/ui/index.ts` with one added line (the barrel is append-only, so parallel work merges cleanly).
4. Add a gallery entry in `src/app/gallery/sections/` (an existing section, or a new one listed in `KitGallery.tsx`) showing each variant and state. Add the section to `test/visual/kit-gallery.visual.ts` so it gets a baseline in both themes.
5. Then use it from the tool or mode.

A custom icon goes in the matching `src/shared/ui/icons/custom/<group>.tsx` file, made with `defineIcon` on the 24px grid: stroke only (no `fill` or `strokeWidth` on the shapes; the component sets stroke, round caps and joins), every coordinate inside 0 to 24. Add its name to the list in `test/icons-grid.test.ts` and update the icon snapshot (`pnpm exec vitest run src/shared/ui/icons -u`). It then appears in the gallery's custom icon review at every size on surface, surface-2 and accent.

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
import { IconCalculator } from '@/shared/ui/icons';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'your-tool', // must equal the folder name
  name: 'Your Tool',
  description: 'One-line description shown on cards and in search',
  icon: IconCalculator,
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
