# GitHub Copilot Instructions for Tools Dashboard

## Architecture Overview

A fully client-side React 19 + TypeScript utility dashboard with a **plugin-style architecture**: every tool is a self-contained folder under `src/tools/`, discovered automatically.

- **Vite** build, **pnpm** package manager
- **React Router** with one lazy route per tool
- **Tailwind CSS v4** theme tokens and the in-repo UI kit (`@/shared/ui`)
- **zustand** stores via `createToolStore` for persisted state
- No document bytes leave the browser

## Adding a Tool

Create one folder; nothing else needs registering.

```
src/tools/<tool-id>/
├── index.ts       # manifest: default-exports defineTool({...})
├── Tool.tsx       # main component
├── types.ts       # co-located types (optional)
├── store.ts       # createToolStore (optional)
├── components/    # PascalCase .tsx sub-components
├── hooks/         # useX.ts hooks
└── lib/           # kebab-case pure .ts helpers, tests alongside
```

The folder name **must equal** the manifest `id`. It is also the URL (`/<tool-id>`). `src/app/registry.ts` discovers manifests with `import.meta.glob('../tools/*/index.ts')` and throws if:

- a folder name differs from its manifest id;
- two tools share an id;
- a manifest is malformed.

```ts
// src/tools/your-tool/index.ts
import { Calculator } from 'lucide-react';
import { defineTool } from '@/app/tool';

export default defineTool({
  id: 'your-tool',
  name: 'Your Tool',
  description: 'One-line description',
  icon: Calculator,
  category: 'data', // ToolCategory in src/app/tool.ts
  enabled: true,
  load: () => import('./Tool'),
});
```

```tsx
// src/tools/your-tool/Tool.tsx
import type { ToolProps } from '@/app/tool';
import { Stack, Text } from '@/shared/ui';

export default function YourTool({ definition }: ToolProps) {
  return (
    <Stack gap="4">
      <Text>{definition.description}</Text>
    </Stack>
  );
}
```

`ToolLayout` renders the header and back button around the tool and wraps it in `ToolErrorBoundary`.

## Shared Code

- `src/app/`: router, `Dashboard`, `ToolLayout`, error boundaries, `registry.ts`, `tool.ts`.
- `src/shared/ui/`: the UI kit (Button, Card, Tabs, Select, FileUpload, FilePicker, Alert, …).
- `src/shared/lib/`:
  - downloads: `saveBlob`, `saveZip`, `deriveFilename`
  - clipboard: `useClipboard`, `copyText`, `readClipboardText`
  - files: `loadFile`, `readBytes`, `loadTextFile`
  - also `formatBytes`, `notify`, `ToolError`/`toToolError`, `newId` and `worker-rpc`
- `src/shared/state/`:
  - `createToolStore`: persisted under `kit:store:tool:<id>`, with a one-time import of legacy keys.
  - `useJob`: async work with progress and cancellation.
- `src/pdf/`:
  - `edit/`: pdf-lib.
  - `render/`: pdf.js worker, thumbnails, text.
  - `qpdf/` and `compress/`: added with the PDF security tools.
  - `components/`: shared PDF UI.

## Conventions

- Use `@/` imports. Relative imports never climb out of a tool folder (no `../../`).
- Non-JSX files are `.ts`.
- Use kit components and Tailwind tokens: `bg-surface`, `text-fg`, `text-fg-muted`, `border-line`, `text-danger`, and so on.
  - No CSS modules and no JS style objects.
  - Inline `style` only for data-driven values, each with a `// data-driven:` comment.
- Never hand-roll download anchors, `navigator.clipboard`, `FileReader`, size formatting, per-tool toasts, or raw `<input type="file">`. Use the shared helpers.
- No silent failures: report through `notify.error(...)` or an inline `Alert`.
- Icons come from **lucide-react** only.

### Persisted data keys

Existing users' data must survive changes:

- `favoriteTools`: dashboard favourites, read and written directly in `Dashboard.tsx`.
- `apiTesterCollections`: api-request. Imported once into its `createToolStore` key.
- `calcHistory`, `savedCalculations`, `memories`: calculator. Imported once into its store.
- `persist:pomodoro-store`: pomodoro. Imported once into its store.

## Testing

- `pnpm test`: Vitest. Unit and component tests sit next to the code (`lib/x.test.ts`).
- `pnpm test:e2e`: Playwright specs in `test/e2e/`.
  - `smoke.spec.ts` visits every enabled tool and fails on any console error.
  - It starts a dev server on port 5174. Set `E2E_PORT` to run several checkouts side by side.
- The merge gate is `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm test:e2e`.
