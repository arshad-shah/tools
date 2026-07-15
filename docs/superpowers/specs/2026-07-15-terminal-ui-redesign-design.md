# Design: Terminal Precision UI Redesign

**Date:** 2026-07-15
**Status:** Approved (foundation + dashboard); tool layers roadmapped
**Branch:** `claude/rebuild-dashboard-cynosure-hUCMB` (single branch, layer by layer)

## Goal

Replace the current cynosure-based UI with a fresh, distinctive **"Terminal Precision"** design language, built on Tailwind + a small hand-rolled reusable component kit. Styling is centralized in that kit — **no ad-hoc styling in individual tools**. Migrate layer by layer (foundation → dashboard → tools), keeping every feature's behavior intact; only the UI changes. Cynosure and other now-unnecessary dependencies are removed as the migration retires their last usages.

Non-goals: changing tool functionality, adding new tools, or altering routing/state internals. This is a UI/styling migration.

## Locked design decisions

| Decision         | Choice                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual direction | **Terminal Precision** — dark, technical, dense; monospace for chrome/labels; sharp-ish corners (6–9px); single vivid accent                                                             |
| Accent           | **lime `#a3e635`**                                                                                                                                                                       |
| Theme modes      | **Dark-only.** No light mode. Theme toggle removed; theme provider / `useTheme` wiring deleted                                                                                           |
| Component stack  | **Tailwind CSS v4 + hand-rolled components (no Radix).** Variants via `class-variance-authority` + `clsx` + `tailwind-merge`. `lucide-react` icons stay. `sonner` toasts stay (restyled) |
| Styling rule     | All styling lives in the reusable kit under `src/components/ui`. Tools compose the kit; they do not write bespoke Tailwind layouts except thin, tool-specific arrangement                |
| Approach         | One branch, incremental. Build the kit, migrate the dashboard + shell, then migrate tools in batches. Cynosure coexists until its last usage is gone, then is uninstalled                |

### Aesthetic details (from approved mockups)

- **Surfaces:** canvas `#0b0e14`, card/surface `#12161f`, subtle `#161b26`; borders `#1e2430` (default) / `#232a38` (strong).
- **Foreground:** default `#e5e9f0`, muted `#8b93a7`, subtle `#6b7385`, faint `#5a6373`.
- **Accent:** lime `#a3e635` for icons, focus rings, active filter, favorite star, hover borders, caret/cursor, `NEW` badge. Accent-on-lime text is `#0b0e14`.
- **Type:** system sans for body/descriptions; **monospace** (`ui-monospace`) for the header prompt, search line, category filters, badges, section labels, versions, icon-chip glyphs.
- **Motifs:** blinking caret in header + search; `$ grep tools…` command-line search; CLI-style pill category filters; section labels with count chip + hairline rule; cards lift + border-to-lime on hover.

## Architecture

### Token layer

A single Tailwind v4 theme (CSS variables via `@theme` / `:root`) defines the terminal palette, radii, mono/sans font stacks, and the lime accent. Because it's dark-only there is one token set — no `.dark` variant, no theme switching. This replaces `src/theme/dashboard-theme.css` and the cynosure token imports.

### Reusable component kit (`src/components/ui/`)

Each component is a small, self-contained, typed React file exporting a themed primitive. Consumers import from a single barrel (`src/components/ui/index.ts`). Variants use `cva`; class merging uses a `cn()` helper (`clsx` + `tailwind-merge`). The kit mirrors the primitives the app already depends on, so migration is a mechanical import-swap plus prop adaptation:

- **Layout:** `Stack`, `Inline`, `Grid`, `Box`, `Container`, `Center`, `Section`, `Divider`
- **Typography:** `Heading`, `Text`, `Label`, `Code`
- **Actions:** `Button`, `IconButton`, `ButtonGroup`
- **Card:** `Card`, `CardHeader`, `CardBody`, `CardFooter`, `CardTitle`, `CardDescription`
- **Feedback:** `Alert` (+ `AlertTitle`, `AlertDescription`), `Badge`, `Spinner`, `EmptyState` (+ `Title`/`Description`/`Icon`/`Actions`), `Tooltip`
- **Inputs:** `Input`, `Textarea`, `SearchInput`, `Select`, `Switch`, `Slider`, `NumberInput`, `FileUpload`
- **Navigation:** `Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`)
- **Data:** `Table` (+ `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`)
- **Overlay (hand-rolled a11y — focus trap, `Esc`, `aria`):** `Dialog`/`Modal`, `DropdownMenu`
- **Toast:** keep `sonner`, themed to terminal tokens

Interactive components (`Select`, `Switch`, `Slider`, `Tabs`, `Tooltip`, `Dialog`, `DropdownMenu`) are hand-rolled for accessibility since Radix is intentionally excluded: keyboard nav, focus management, `Esc`-to-close, and ARIA roles are implemented explicitly and covered by the verification step.

### Kit build strategy (YAGNI)

Build primitives **when first needed**, not all upfront. The foundation + dashboard layer builds only the subset the dashboard and shared shell require (see below). Each subsequent tool layer adds any missing primitives to the kit as it hits them. This keeps every component real and used, while still centralizing all styling. (Alternative considered: build the entire kit upfront — rejected as speculative; many variants would be built before any consumer validates them.)

## Layering / roadmap

**This spec + its plan cover Layer 0 and Layer 1 only.** Later layers each get their own short plan in a follow-up session.

- **Layer 0 — Foundation.** Add Tailwind v4 + `cva`/`clsx`/`tailwind-merge`. Define terminal tokens. Add `cn()` helper. Build the core kit needed by the dashboard + shell: `Container`, `Section`, `Stack`, `Inline`, `Grid`, `Box`, `Center`, `Heading`, `Text`, `Label`, `Button`, `IconButton`, `Card` family, `Badge`, `Input`, `SearchInput`, `EmptyState`, `Spinner`, `Divider`. Cynosure stays installed (tools still use it).
- **Layer 1 — Dashboard + shared shell.** Rebuild `Dashboard.tsx`, `ToolLayout.tsx`, `Footer.tsx`, `NotFound.tsx`, `ErrorBoundary.tsx`, `ToolErrorBoundary.tsx`, loading fallbacks, and `App.tsx`/`main.tsx` on the new kit. Remove the theme toggle, theme provider, `useTheme`, and `AnimatedBackground` if it no longer fits the aesthetic (decide during implementation). Dashboard matches the approved mockup: prompt header, `grep` search, CLI filter chips, favorites section, tool grid with hover.
- **Layers 2…N — Tools.** Migrate tools off cynosure in batches (grouped by category or complexity), swapping cynosure imports for the kit and adding any new primitives to the kit as needed. Each tool's features must remain behavior-identical; verified per tool.
- **Final layer — Cleanup.** When no file imports cynosure, uninstall `@arshad-shah/cynosure-react` and `@arshad-shah/cynosure-tokens`. Audit and drop any other now-unused dependencies. Delete unused/unregistered/dead tool folders (see below).

## Tool audit (cleanup)

All 26 tool folders are currently registered in `ToolRegistry.ts` and defined in `ToolDefinitions.ts`, so there are no orphan folders today. Cleanup targets, to be confirmed during the final layer:

- **PDF Compressor** is `enabled: false` in `ToolDefinitions.ts` but still registered and present. Decision at cleanup: delete it, or finish/enable it.
- Any tool folder not referenced by the registry, or any dead code surfaced during migration, is removed.

## Success criteria

- No file imports `@arshad-shah/cynosure-*`; both packages uninstalled.
- No light/dark toggle; app is dark-only Terminal Precision.
- All styling flows through `src/components/ui`; tools contain no bespoke design CSS.
- Every tool behaves exactly as before (feature parity verified per tool).
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.
- Unused dependencies and dead/disabled tools removed.

## Risks

- **No Radix** means hand-rolled a11y for overlays/menus/sliders — the main correctness risk. Mitigation: explicit keyboard/ARIA implementation + verification per interactive primitive.
- **Long migration on one branch** — mitigated by strict layering: each layer keeps the app fully working (cynosure and the new kit coexist), so the branch is always shippable.
- **Behavior drift during UI swap** — mitigated by treating each tool as a UI-only refactor and verifying feature parity before moving on.
