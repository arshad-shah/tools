# Cynosure Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move tools' UI onto `@arshad-shah/cynosure` so the product keeps no UI kit of its own, one phase at a time, with the app working and green after every task.

**Architecture:** Facade first. Each `src/shared/ui/<module>` keeps its export names and props but renders Cynosure inside, so the ~408 files importing `@/shared/ui` keep working while the kit hollows out; the module's own tests and the e2e suite prove behaviour is kept. Once every module is a facade, call sites move to Cynosure imports tool by tool and the kit is deleted. Tools' Tailwind colour roles (`--fg`, `--surface`, …) become aliases of Cynosure's `--cy-color-*` in Phase 0, so every untouched Tailwind class follows the Cynosure theme from day one.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, React Router 7, Vitest + Testing Library, Playwright (e2e, visual, csp); `@arshad-shah/cynosure` 0.5.0 (then 0.6.0).

**Spec:** arshad-shah/tools#104 "Move tools onto Cynosure" (the mapping table and Gaps list; every gap it lists now exists in Cynosure 0.5.0 or in cynosure PR #169, released as 0.6.0).

## Global Constraints

- Install `@arshad-shah/cynosure` from npm; never vendor or patch it. Anything missing goes into Cynosure first (with tests), never into this product.
- Theme: `createTheme({ accent: "#3ddc97" })`, `CynosureTheme target="document"`, `useColorMode({ key: "tools:theme" })`, `themeInitScript` **written to `public/theme-init.js`** (keep the file form: `test:csp` forbids inline scripts).
- The canvas bridges read `--cy-color-*` (or `useCynosureTheme().colors`) instead of tools' tokens.
- Drop `@floating-ui/react-dom` (Phase 1), `sonner` (Phase 0), `perfect-freehand` (Phase 2, once `src/pdf/sign/ink.ts` reads Cynosure's `InkStroke`).
- Stays in the product: `data-grid/*`, `code-surface/*`, `chart/*`, `line-chart.tsx`, the PDF page layers, canvases, `bytes-view*`, `bit-grid`, `sandboxed-html*`, `camera-capture`, `font-*`, `vector-sample`, `color-ramp`, `contrast-pair`, `color-block`, `swatch*`, `image.tsx`, `adapters/*`, the listed `use-*` hooks and `tool-actions-slot.ts` (#104 "Stays in the product"); their buttons, inputs and SVG move onto Cynosure foundations.
- Gate per task (tools R37): `pnpm lint` 0/0, `pnpm typecheck`, the touched modules' `vitest` files, `pnpm build`. Full `pnpm test`, `pnpm test:e2e --workers=2` and `pnpm test:visual` at the end of each phase (visual baselines are expected to change in Phase 0; review the diff images, then update).
- Branch `feat/cynosure-migration`, one PR per phase into `master`. Merging needs the owner's go-ahead.
- Behaviour parity: a facade keeps every behaviour its existing tests pin; a test that pins a _look_ (class names, sonner DOM) is rewritten to pin the behaviour instead, never deleted without a replacement.

## Review Focus

- **Toast actions close the toast.** Sonner closes a toast when its action is clicked; Cynosure's does not. `notify` must dismiss on action click (test in Task 4).
- **Theme before first paint, in every mode.** A dark-OS visitor with no saved preference, and one with `tools:theme = "light"`, must see no flash and the right Tailwind `dark:` styles; `system` is now resolved by CSS, not by JS (tests in Tasks 2 and 3).
- **Existing saved preferences survive.** `localStorage['tools:theme']` already holds `system|light|dark`; the same values must keep working without migration (test in Task 2).
- **Canvas colours follow a theme switch** without a reload (diagram, charts, markdown doc tokens) (test in Task 3).
- **Notify before the Toaster mounts** (calls during app start or from a worker callback) must not throw or vanish (test in Task 4).

---

## Phase 0: Foundation (detailed below)

### Task 1: Install Cynosure and load its styles

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`, `src/main.tsx`
- Test: `test/cynosure-styles.test.ts` (new)

**Interfaces:**

- Produces: Cynosure's stylesheet loaded once, before `src/theme/tokens.css`, so tools' tokens can alias `--cy-*`.

- [ ] **Step 1: Write the failing test** `test/cynosure-styles.test.ts`: reads `src/main.tsx` and asserts the import `'@arshad-shah/cynosure/styles.css'` appears before `'./theme/tokens.css'`; and asserts `package.json` dependencies contain `@arshad-shah/cynosure` matching `^0.5.0`.
- [ ] **Step 2: Run** `pnpm vitest run test/cynosure-styles.test.ts` — expected FAIL.
- [ ] **Step 3:** `pnpm add @arshad-shah/cynosure@^0.5.0`; add the stylesheet import at the top of `src/main.tsx`.
- [ ] **Step 4: Run** the test (PASS), `pnpm build` (PASS; Cynosure's CSS is in the bundle).
- [ ] **Step 5: Commit** `build(deps): add @arshad-shah/cynosure`.

### Task 2: Colour mode through Cynosure

> **As built (2026-11-15):** a smaller first step than the steps below. tools' own `theme.ts` and `public/theme-init.js` stay the source of truth and also set `data-cy-mode` to the _resolved_ mode (`light`/`dark`), before first paint and on every change; the tools theme (accent `#3ddc97`) ships as a static stylesheet `src/theme/cynosure-theme.css` generated by `pnpm theme:gen` (`scripts/gen-cynosure-theme.ts`, `themeToCss`), so the first paint is already themed with no runtime style writes. This keeps every `data-theme` observer (diagram/chart bridges, markdown print flip) working. Moving to `useColorMode`/`themeInitScript` (the steps below) waits until Task 3 moves those observers onto `useCynosureTheme`. Tests: `src/shared/lib/theme.test.ts` (Cynosure mode), `test/theme-init.test.ts`, `test/cynosure-theme.test.ts`.

**Files:**

- Modify: `src/shared/lib/theme.ts`, `src/shared/lib/theme.test.ts`, `src/app/App.tsx`, `src/main.tsx`, `src/theme/tokens.css` (the `dark` custom variant only)
- Create: `scripts/gen-theme-init.ts`; regenerate `public/theme-init.js`
- Test: `src/shared/lib/theme.test.ts`, `test/theme-init.test.ts` (new)

**Interfaces:**

- Consumes: Task 1.
- Produces: `useTheme(): { preference: ThemePreference; resolved: ResolvedTheme; setPreference(p): void }` (same shape as today, now backed by `useColorMode({ key: THEME_KEY })`); `<html data-cy-mode="system|light|dark">` instead of `data-theme`; Tailwind `dark:` matches `[data-cy-mode=dark]`, and `[data-cy-mode=system]` under `prefers-color-scheme: dark`.

- [ ] **Step 1: Failing tests.**
  - `theme-init.test.ts`: `public/theme-init.js` equals `themeInitScript({ key: "tools:theme" })` byte for byte; running it in jsdom with `localStorage['tools:theme']="dark"` sets `data-cy-mode="dark"` on `<html>`; with nothing saved it leaves the attribute absent (CSS then follows the OS).
  - `theme.test.ts`: a saved `"light"` reads back as preference `light`; `setPreference("dark")` sets `data-cy-mode="dark"` on `<html>` and writes `tools:theme`; under a mocked dark OS, preference `system` resolves to `dark`.
- [ ] **Step 2: Run** both — FAIL.
- [ ] **Step 3:** `scripts/gen-theme-init.ts` writes `themeInitScript({ key: THEME_KEY })` to `public/theme-init.js` (wire it into `icons:gen`-style script `theme:gen`, and into `build` before `vite build`). Wrap the App root in `<CynosureTheme theme={theme} mode={mode} target="document">` with `const theme = createTheme({ accent: "#3ddc97" })` at module scope. Re-implement `useTheme` over `useColorMode`; delete `startThemeSync`/`applyTheme` (Cynosure follows other tabs and the OS). Change the variant to:
  ```css
  @custom-variant dark {
    &:where([data-cy-mode='dark'], [data-cy-mode='dark'] *) {
      @slot;
    }
    @media (prefers-color-scheme: dark) {
      &:where([data-cy-mode='system'], [data-cy-mode='system'] *) {
        @slot;
      }
    }
  }
  ```
- [ ] **Step 4: Run** the tests (PASS), `pnpm typecheck`, `pnpm lint`.
- [ ] **Step 5: Commit** `feat(theme): colour mode through Cynosure`.

### Task 3: Tools' colour roles alias Cynosure's

> **As built (2026-11-15, owner's call: keep the current palette):** the other way round. The Cynosure theme is built _from_ tools' palette (`TOOLS_THEME` in `scripts/gen-cynosure-theme.ts`: every colour role per mode, Inter and JetBrains Mono), so Cynosure components show tools' look and `tokens.css` keeps its values unchanged. No visual baseline changes. Aliasing tools' Tailwind roles to `--cy-color-*` moves to Phase 4, when the kit is gone. Test: `test/cynosure-palette.test.ts`.

**Files:**

- Modify: `src/theme/tokens.css` (both palette blocks), `src/shared/lib/theme-tokens.ts`, `src/shared/ui/adapters/theme-colors.ts`, `src/shared/diagram/theme-bridge.ts`, `src/tools/markdown-editor/lib/doc-tokens.ts` and their tests
- Test: `test/token-aliases.test.ts` (new), existing `theme-bridge.test.ts`

**Interfaces:**

- Produces: every tools colour role is `var(--cy-color-…)`; `tokenColor`/`useTokenColors` keep their names and return resolved colours that change with the mode.

- [ ] **Step 1: Failing tests.** `token-aliases.test.ts` parses `tokens.css` and asserts these exact aliases, and that no hex literal remains in the colour-role blocks except the logo tile pair and `--redact`:
      `--canvas: var(--cy-color-bg)`, `--surface: var(--cy-color-surface)`, `--surface-2: var(--cy-color-surface-raised)`, `--surface-3: var(--cy-color-soft)`, `--line: var(--cy-color-line)`, `--fg: var(--cy-color-ink)`, `--fg-muted: var(--cy-color-muted)`, `--accent: var(--cy-color-accent)`, `--accent-ink: var(--cy-color-on-accent)`, `--accent-fg: var(--cy-color-accent-text)`, `--accent-soft: var(--cy-color-accent-soft)`, `--focus: var(--cy-color-ring)`, `--danger: var(--cy-color-danger-text)`, `--warning: var(--cy-color-warning-text)`, `--info: var(--cy-color-info-text)`. (Roles Cynosure lacks: `--backdrop`/`--line-strong`/`--line-control`/`--fg-subtle`/`*-soft`/elevations are `color-mix()` of the aliased roles; check the exact `--cy-*` names against Cynosure's `styles.css` before writing — a name that does not exist there fails the test.) Theme-bridge test: after switching `data-cy-mode` light→dark, `tokenColor('fg')` changes.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3:** Rewrite the two palette blocks as one alias block (the light/dark split now lives in Cynosure). `useTokenColors` re-reads on `useCynosureTheme().palette` instead of `useTheme().resolved`.
- [ ] **Step 4: Run** the tests, then the **phase visual check**: `pnpm test:visual`; review every diff image (expected: Cynosure's palette from the same accent; reject any unreadable text), update baselines only after review; `pnpm test:e2e --workers=2` green. Run axe through the visual suite in both modes: no new contrast violations.
- [ ] **Step 5: Commit** `feat(theme): tools colour roles read Cynosure tokens`.

### Task 4: Toasts through Cynosure

**Files:**

- Modify: `src/shared/ui/toaster.tsx`, `src/shared/lib/notify.ts`, `src/shared/lib/notify.test.ts`, `src/shared/ui/toaster.test.tsx`, `package.json` (remove `sonner`)

**Interfaces:**

- Consumes: Task 2.
- Produces: `Toaster` (same export) renders Cynosure's `<Toaster position="bottom-end">` plus a bridge child that stores `useToast()` in a module ref; `notify.success|info|error(message, { action?, duration? })` keeps its signature and maps to tones `success|neutral|danger`.

- [ ] **Step 1: Failing tests** (`notify.test.ts`, rendering `<Toaster/>`): `notify.success("Saved")` shows a status toast "Saved"; `notify.error(new ToolError(...))` shows `role="alert"` with the error's message and is announced once (not twice: drop the extra `announce` call, Cynosure's danger tone is already assertive); clicking the action of `notify.info("Moved", { action: { label: "Undo", onClick } })` calls `onClick` once **and closes the toast**; `duration: Infinity` stays after 10 s of fake timers; `notify.info("early")` called before `<Toaster/>` mounts shows once the Toaster mounts (queue in the module, flush on bridge mount) and never throws.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3:** Implement the bridge and queue; delete sonner usage; `pnpm remove sonner`.
- [ ] **Step 4: Run** the tests; `pnpm test:e2e --workers=2 --grep toast` (and any spec using `[data-sonner-toast]`: switch its locator to `getByRole('status'|'alert')`).
- [ ] **Step 5: Commit** `feat(notify): toasts through Cynosure`.

**Phase 0 exit:** full gate (lint, typecheck, `pnpm test`, build, e2e, visual, `test:csp`), PR "Cynosure foundation", owner review.

---

## Later phases (each gets its own detailed plan when it starts, from this outline)

Each row is one task: rewrite the module(s) as a facade over the named Cynosure export, keep the export names, keep or rewrite (behaviour, not look) its tests, gate. Paths are under `src/shared/ui/`.

### Phase 1: Primitive facades (drops `@floating-ui/react-dom`)

> **Status (2026-11-15):** four branches merged into `feat/cynosure-migration` (`facade/buttons`, `facade/fields`, `facade/overlays`, `facade/display`); full unit suite green (5715), targeted e2e green per group. Also: Cynosure now loads in a `cynosure` cascade layer below Tailwind utilities (`tokens.css`), and `@floating-ui/react-dom` and `escape-stack.ts` are gone.
>
> **Render Cynosure:** Button, IconButton, ToolButton, HitArea, ButtonGroup, Kbd, ShortcutHint, CopyButton, Badge, StatusDot, Spinner; Input, SearchInput, Textarea, SecretInput, SwitchField, Progress, RadioGroup; Tooltip, Popover, HoverCard, Menu, SendToMenu, OptionsMenu, ShareButton, Dialog, Drawer, AnchoredToolbar; Alert, PrivacyNote, ErrorState, EmptyState, Statistic, Accordion, List, AutoGrid, Divider, Breadcrumb, Card.
>
> **Still the kit's own, blocked on Cynosure gaps** (tracked in arshad-shah/cynosure#171): Switch, Checkbox, Slider, NumberInput, Stepper, Select, SegmentedControl, SecretText, ContextMenu, Table, MetaList, layout primitives (Box/Stack/Inline/Grid/Container/Section/Center), typography, Link, LoadingState, roving.ts. Workarounds in facades to remove once Cynosure fixes them: `useCallerAria` (button.tsx), `useFieldElement` aria-describedby (field-props.ts).

| Task | Modules                                                                                                                                                               | Cynosure                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1.1  | `button.tsx`, `button-variants.ts`, `tool-button.tsx`, `hit-area.tsx`                                                                                                 | `Button`, `IconButton`, `ButtonBase`                                                                   |
| 1.2  | `input.tsx`, `search-input.tsx`, `textarea.tsx`, `secret-input.tsx`, `secret-text.tsx`                                                                                | `TextField` (`revealable`), `SearchField`, `TextArea`                                                  |
| 1.3  | `controls.tsx`, `switch-field.tsx`, `stepper.tsx`                                                                                                                     | `Switch`, `Checkbox`, `Slider`, `NumberField`, `ProgressBar`                                           |
| 1.4  | `select.tsx`, `radio-group.tsx`, `segmented-control.tsx`                                                                                                              | `Select` (`group`), `RadioGroup`, `SegmentedControl`                                                   |
| 1.5  | `tooltip.tsx`, `popover.tsx`, `hover-card.tsx`, `position.ts`, `escape-stack.ts`, `roving.ts`                                                                         | `Tooltip`, `Popover`, `HoverCard`, `useDismiss`, `useRovingFocus`; remove `@floating-ui/react-dom`     |
| 1.6  | `menu.tsx`, `menu-items.ts`, `options-menu.tsx`, `send-to-menu.tsx`, `share-button.tsx`, `context-menu.tsx`                                                           | `Menu`, `ContextMenu`                                                                                  |
| 1.7  | `dialog.tsx`, `drawer.tsx`                                                                                                                                            | `Dialog`, `Sheet`                                                                                      |
| 1.8  | `kbd.tsx`, `shortcut-hint.tsx`, `copy-button.tsx`, `badge.tsx`, `status-dot.tsx`, `spinner.tsx`                                                                       | `Kbd`, `CopyButton`, `Badge` (`dot`), `LoadingDots`                                                    |
| 1.9  | `alert.tsx`, `privacy-note.tsx`, `states.tsx`, `empty-state.tsx`, `meta-list.tsx`, `stat.tsx`, `table.tsx`, `list.tsx`, `accordion.tsx`, `link.tsx`, `breadcrumb.tsx` | `Notice`, `EmptyState`, `DescriptionList`, `Stat`, `Table`, `List`, `Accordion`, `Link`, `Breadcrumbs` |
| 1.10 | `layout.tsx`, `auto-grid.tsx`, `card.tsx`, `typography.tsx`                                                                                                           | `Stack`, `Inline`, `Grid`, `Container`, `Section`, `Divider`, `Card`, `Heading`, `Text`                |

### Phase 2: Composite facades (the Plan 6/8 set; drops `perfect-freehand`)

| Task | Modules                                                                                                                                           | Cynosure                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 2.1  | `context-bar.tsx`, `docked-bar-state.ts`, `reveal.ts`, `use-visual-viewport.ts`, `floating-palette.tsx`, `floating-dock.tsx`                      | `FloatingToolbar`, `DockedToolbar` (`edge`, `floating`, `keepVisible`), `useSelectionAnchor`                      |
| 2.2  | `signature-pad.tsx`, `shared/lib/ink.ts`, `src/pdf/sign/ink.ts`                                                                                   | `SignaturePad`, `inkOutline`, `inkPath`, `inkToSvg`, `InkStroke`; remove `perfect-freehand`                       |
| 2.3  | `selection-frame.tsx`, `selection-math.ts`                                                                                                        | `SelectionFrame`, `moveBy`, `resizeBy`, `resizeByKey`, `contain`, `angleFrom`, `FrameLimits`                      |
| 2.4  | `color-*.tsx`, `color-picker-model.ts`                                                                                                            | `ColorField` (`format`, `alpha`, `swatches`), `ColorSwatches` (recents stay in store-kit)                         |
| 2.5  | `compare-slider.tsx`, `progress-overlay.tsx`, `drop-zone.tsx`, `file-upload.tsx`, `use-window-file-drag.ts`, `src/pdf/components/PdfDropzone.tsx` | `CompareSlider`, `ProgressOverlay`, `FileDrop` (`target="window"`), `acceptsFile`                                 |
| 2.6  | `virtual-list*`, `virtual.ts`, `page-rail.tsx`, `src/pdf/components/useSortableList.ts`, `SortableFileList.tsx`, `PageGrid.tsx`                   | `VirtualList` (`wrap`, `role="log"`, sticky headers, `scrollToIndex`, `onMove`), `SortableList` (`layout="grid"`) |
| 2.7  | `key-value-editor.tsx`, `key-value-row.tsx`, `key-value-bulk.ts`                                                                                  | `KeyValueEditor` (`allowFiles`)                                                                                   |
| 2.8  | `document-viewport.tsx`, `zoom-scale.ts`, `use-viewport-gestures.ts`, `diagram-canvas-controls.tsx`, `diagram-canvas.tsx`                         | `DocumentViewport`, `ZoomControls`, `PanZoomCanvas` (`renderScreen`)                                              |
| 2.9  | `split-pane.tsx`, `command-palette.tsx`, `use-command-palette-hotkey.ts`, `shared/lib/hotkeys.ts`, `shared/lib/fuzzy.ts`                          | `SplitPane`, `CommandPalette` (`filter`), `useHotkey`, `matchesHotkey`                                            |
| 2.10 | `tabs.tsx`, `pane-tabs.tsx`, `mode-tabs.tsx`, `code-tree*.tsx`, `indent.tsx`, `date-input.tsx`                                                    | `Tabs`, `SegmentedControl`, `Tree` (`virtual`, `renderLabel`), `DateField`                                        |
| 2.11 | `app-shell.tsx`, `layout-context.ts`, `top-bar.tsx`, `hub-layout.tsx`, `nav-list.tsx`, `side-panel.tsx`, `inspector.tsx`                          | `AppShell`, `SideNav` (`renderLink`), `SplitPane`, `Sheet`, `Disclosure`                                          |

### Phase 3: Cynosure 0.6.0 (after cynosure PR #169 is released)

| Task | What                                                                                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | Bump to `^0.6.0`; `focus-overlay.tsx` → `Dialog size="full"`; `meter.tsx` → `ProgressBar meter steps`; `choice-grid.tsx` → `RadioGroup variant="card"`; `mode-tabs.tsx` overflow → `TabList overflow="menu"`                                         |
| 3.2  | Icons: `icons/lucide.ts` + `icons/custom/*` → Facet, using the mapping in cynosure `docs/PROGRESS.md` (tools name → Facet name); `icons/brand/Logo.tsx` stays; remove `lucide-react`; `no-lucide-outside-icons` rule becomes "no icon outside Facet" |
| 3.3  | Star ratings, if any tool shows one → `Rating`                                                                                                                                                                                                       |

### Phase 4: Inline and delete the kit

| Task   | What                                                                                                                                                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.x    | One task per top-level folder (`src/app`, `src/pdf/*`, then `src/tools/<id>` in batches of ~5): replace `@/shared/ui` facade imports with `@arshad-shah/cynosure` (+ `/icons`) and the product-only modules' new home `src/shared/surfaces/`; e2e for those tools |
| 4.last | Delete the facades and `src/shared/ui/index.ts`; `eslint-rules/no-raw-ui-outside-kit.js` now allows raw UI nowhere outside `src/shared/surfaces/`; drop `class-variance-authority` if unused; full gate                                                           |
