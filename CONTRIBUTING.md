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

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Vite dev server with HMR                                  |
| `pnpm build`        | Type-check (`tsc -b`) + production build                  |
| `pnpm lint`         | ESLint over the whole repo                                |
| `pnpm typecheck`    | `tsc --noEmit` (faster than `build` for type-only checks) |
| `pnpm format`       | Prettier-write everything                                 |
| `pnpm format:check` | CI-style Prettier check                                   |
| `pnpm preview`      | Build + run via Wrangler (Cloudflare local)               |

## Project conventions

- **UI components**: use `@arshad-shah/cynosure-react` primitives (`Stack`, `Inline`, `Card`, `Button`, …). Don't introduce Tailwind, CSS-in-JS, or styled-components — Cynosure tokens cover spacing, colors, and theming.
- **Theming**: two custom themes (`dashboard-light` / `dashboard-dark`) defined in `src/theme/dashboard-theme.css`. Always go through Cynosure semantic tokens (`color="accent.solid"`, `background="bg.surface"`) so changes track both themes automatically.
- **Icons**: `lucide-react`.
- **State**: local `useState` first. Reach for `@reduxjs/toolkit` only when state needs to cross tool boundaries.
- **Routing**: each tool registers itself once; the router picks it up automatically (see below).

## Adding a new tool

### 1. Build the tool component

Create `src/tools/YourTool/YourTool.tsx`. Keep tool-internal pieces (`utils/`, sub-components) inside the tool's folder.

```tsx
// src/tools/YourTool/YourTool.tsx
import React from 'react';
import {
  Card,
  CardBody,
  Stack,
  Heading,
  Text,
} from '@arshad-shah/cynosure-react';
import { ToolProps } from '../../types/ToolTypes';

const YourTool: React.FC<ToolProps> = ({ definition }) => (
  <Stack gap="4">
    <Card variant="elevated" size="md">
      <CardBody>
        <Stack gap="2">
          <Heading level={2} size="lg">
            {definition.name}
          </Heading>
          <Text variant="caption">{definition.description}</Text>
        </Stack>
      </CardBody>
    </Card>
  </Stack>
);

export default YourTool;
```

`ToolLayout` already renders the back button, header, and theme toggle around your component — don't render those yourself.

### 2. Register the tool definition

Add an entry to `TOOL_DEFINITIONS` in `src/data/ToolDefinitions.ts`:

```ts
import { Calculator } from 'lucide-react';

{
  id: 'your-tool-id',          // URL slug
  name: 'Your Tool',
  description: 'One-line description shown on the dashboard card',
  icon: Calculator,            // lucide-react icon
  enabled: true,
  category: 'development',     // or 'design' | 'security' | 'productivity' | …
  version: '1.0.0',
  isNew: true,                 // shows the "New" badge
}
```

### 3. Register the component

In `src/registry/ToolRegistry.ts`, register your component:

```ts
import YourTool from '../tools/YourTool/YourTool';

toolRegistry.register('your-tool-id', YourTool);
```

That's it — the dashboard card, route (`/your-tool-id`), search index, and favorites integration all light up automatically.

## Before you open a PR

- [ ] `pnpm lint` clean
- [ ] `pnpm typecheck` clean
- [ ] `pnpm build` succeeds
- [ ] Tested in both light and dark themes
- [ ] Tested at mobile, tablet, and desktop widths
- [ ] No new dependencies added without discussion in the PR

## Reporting bugs / security issues

- Functional bugs → open an issue via the GitHub bug-report template.
- Security issues → do **not** open a public issue. See [SECURITY.md](./SECURITY.md).
