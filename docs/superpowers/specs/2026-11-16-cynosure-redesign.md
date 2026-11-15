# Tools redesign on Cynosure

**Date:** 2026-11-16. **Owner's direction:** do not reproduce the current look through facades. Rebuild the UI from `@arshad-shah/cynosure` (0.6.0 and later) components, designed for better UI/UX, with nothing native or hand-made left in the product. Supersedes the facade approach in `docs/superpowers/plans/2026-11-15-cynosure-migration.md` (its Phase 0 theme work and its "Review Focus" checks still apply).

## Rules

1. **Cynosure only.** Pages are composed of Cynosure components: layout from `Container`, `Section`, `Stack`, `Inline`, `Grid`; text from `Heading`, `Text`, `Link`, `List`; controls, overlays and feedback from the matching components. No raw `div`/`span`/`p`/`ul`/`button`/`input`/`a` in redesigned code, no Tailwind classes, no product CSS. Only a drawing surface itself (a `<canvas>`, a PDF page layer) may be custom; every control on it is Cynosure.
2. **Icons are Facet** (`@arshad-shah/cynosure/icons`), brand marks from `@arshad-shah/cynosure/brands`. The tools logo stays.
3. **A gap is fixed in Cynosure, not worked around.** If a page needs something Cynosure lacks, write it down in `docs/cynosure-gaps.md` (what, where, why) and use the closest correct composition meanwhile. Never vendor, patch or restyle Cynosure's classes.
4. **Theme:** `createTheme({ accent: '#3ddc97' })` with Cynosure's own palette, type scale, spacing and fonts. `CynosureTheme target="document"`, `useColorMode({ key: 'tools:theme' })`, `themeInitScript({ key: 'tools:theme' })` written to `public/theme-init.js` (no inline scripts: `test:csp`). Saved `system|light|dark` values keep working. Tools' old Tailwind colour roles become aliases of `--cy-color-*` so tools not yet redesigned follow the theme.
5. **Behaviour is kept.** Tool logic (`lib/`, stores, workers), routes (`/<category>/<slug>`), storage keys, favourites, recents, drop routing, keyboard shortcuts and the command palette commands stay. Tests that pin the old look are rewritten to pin behaviour.
6. **Accessible and responsive.** Every page works at 390px wide and 1440px, in light and dark, by keyboard, and passes axe.

## Shell

`AppShell`, with:

- **Navigation** (`SideNav`, `renderLink` with React Router): the logo; a "Search tools" entry with the shortcut (`Kbd`) that opens the `CommandPalette`; Home; **Favourites** (when there are any); **Recent** (last five); then the nine categories as groups listing their tools (the current tool's group open). In the footer: the privacy status ("Files stay on this device", which opens the privacy dialog), a Help `Menu` (shortcuts, source, issues, licences, privacy) and a `ThemeToggle variant="cycle"`. The rail collapses on desktop; on phones it is the shell's drawer, plus a bottom tab bar (`tabs`, `SideNav layout="bar"`) with Home, Search, Favourites and PDF.
- **Header:** `Breadcrumbs` (with `renderLink`, or `onNavigate` until that exists) and page-level actions. No page footer: what the footer held moves to the navigation footer and the Help menu.
- **Command palette:** Cynosure `CommandPalette` with tools' fuzzy `filter`, the app commands and every tool, opened by Mod+K anywhere.

## Pages

- **Home** (`Container`): a `PageHeader` ("Private tools that run in your browser", lead: nothing is uploaded) with a large `SearchField` that filters the tool grid live (`textMatches`), with a hint for the shortcut. Then "Pick up where you left off": `ListRows` of recents and favourites (hidden when empty). Then the **PDF workspace** `Card` with a `FileDrop` that routes dropped files to the right tool (existing drop routing). Then **All tools**: one `Section` per category, a `Heading` and a `Grid` of tool cards (`Card` with `IconTile`, name, one-line description; the whole card is the link). No matches: `EmptyState` with a "Clear search" action.
- **Category hub:** `PageHeader` (category icon, name, blurb), a `FileDrop` for file-based categories, the category's groups as `Section`s of tool cards.
- **Tool page** (`ToolPage`): a `PageHeader` with `IconTile`, the tool's name and description, and actions (favourite toggle `IconButton` with `aria-pressed`, the Send-to `Menu` where the tool has one). Wrapped in an `ErrorBoundary`. Then the tool, built from one of two patterns:
  - **Transform tools** (input to output: JWT, Base64, hashes, URL, formatters, encoders): modes as `Tabs` (or `SegmentedControl` for two or three short modes); input and output side by side in a `SplitPane` on wide screens, stacked on narrow ones. Input in a `Card` (`TextArea`, `FileDrop`, fields); output in a `Card` (`CodeBlock`, `DescriptionList`, `Notice`, `Badge`) with `CopyButton`s. Empty input shows an `EmptyState` with "Try an example".
  - **File tools** (PDF quick tasks, image tools): a step flow on one page. (1) A prominent `FileDrop`. (2) The files (`SortableList` with thumbnails when order matters, `ListRows` otherwise) beside an options `Card` of fields. (3) One primary `Button` that names the result ("Merge 3 files"), in a `DockedToolbar` or the options card. (4) `ProgressBar` while working, then a result `Card` with a success `Notice` and download `Button`s, plus a `Toast`. Errors are a danger `Notice` next to what caused them.
- **Not found:** `EmptyState` with search and a link home.

## Order

1. Theme (rule 4) and shell. 2. Home, hubs, tool page, not found. 3. Pattern tools: **PDF Merger** (file tool) and **JWT Decoder** (transform tool). 4. Owner review (screenshots in light and dark at 1440 and 390). 5. The other tools in batches, by pattern. 6. Delete `src/shared/ui` (keeping only product drawing surfaces, moved to `src/shared/surfaces/`), remove Tailwind and the `class-variance-authority`/`tailwind-merge`/`clsx` helpers, and make lint forbid raw elements and class names outside `src/shared/surfaces/`.
