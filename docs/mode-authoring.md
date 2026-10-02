# Authoring a workspace mode

The PDF workspace (`/pdf/edit/:mode?`) hosts one mode at a time: Organize, Edit, Annotate, Fill and Sign, Redact, Convert, Protect, Optimize and OCR. This guide shows how a mode is put together and what to touch when you add or extend one. Protect mode (`src/pdf/workspace/modes/protect/`) is a compact example to read alongside it.

## The pieces

A mode has a thin UI and its logic elsewhere:

- `src/pdf/workspace/modes/<mode-id>/index.ts`: the manifest (eagerly loaded, tiny)
- `src/pdf/workspace/modes/<mode-id>/Mode.tsx`: the `ModeModule` (lazy-loaded with the mode)
- `src/pdf/doc/ops/<mode-id>.ts`: view-side operation definitions (`defineOperation`)
- `src/pdf/doc/materialize/<mode-id>.ts`: worker-side writers for overlay ops (`defineMaterializer`)
- `src/pdf/doc/checkpoints/<mode-id>.ts`: main-thread runners for checkpoint ops (`defineCheckpointRunner`)
- `src/pdf/edit/worker/<mode-id>.ts` and `src/pdf/render/handlers/<name>.ts`: worker handlers the writers and runners call
- `src/pdf/<domain>/`: pure domain logic (detection, redaction, OCR, signing), unit-tested without React

pdf-lib is used only in the edit worker. The main thread imports op parameter types, never pdf-lib itself, so it stays out of the main bundle.

## 1. The manifest

```ts
// src/pdf/workspace/modes/protect/index.ts
import { IconModeProtect } from '@/shared/ui/icons';
import { shortcutFor } from '../registry-order';
import type { ModeManifest } from '../types';

export const protectManifest: ModeManifest = {
  id: 'protect',
  label: 'Protect',
  icon: IconModeProtect,
  shortcut: shortcutFor('protect'),
  order: 7,
  load: () => import('./Mode'),
};
```

- `id` is a `ModeId` (`src/pdf/doc/types.ts`). A new mode adds its id to `ModeId`, to `MODE_ORDER` and to `MODE_LABELS` in `src/pdf/doc/modes.ts`.
- `shortcut` is `1` to `9` and follows the fixed `MODE_ORDER`, whichever modes exist; use `shortcutFor`.
- Register the manifest with one added line in `src/pdf/workspace/modes/registry.ts`. A mode is registered only when it works end to end: there are no stub modes.

## 2. The ModeModule

`Mode.tsx` default-exports a `ModeModule` (`src/pdf/workspace/modes/types.ts`):

```ts
const mode: ModeModule = {
  operations: [...PROTECT_OPS],
  Toolbar: ProtectToolbar,
  Inspector: ProtectInspector,
  inspectorPinned: true,
  commands,
  onLeave: (ctx) => ctx.tool.set(null),
};
export default mode;
```

- `operations`: the mode's op definitions. They are registered when the mode loads, and also eagerly by `registerCoreOperations` so a restored document validates before its mode has loaded.
- `Toolbar`: renders `<ModeToolbar groups={...} />` with kit `ToolGroup`s. `ModeToolbar` turns the same groups into the Standard toolbar, the Focus floating palette or the phone bar, so a mode never lays itself out per layout.
- `Inspector` (optional): the right-hand panel in Standard, a popover in Focus. `inspectorPinned` shows it without a selection.
- `PageOverlay` (optional): drawn over each visible page with the page's viewport (fields, marks, objects). Build it from kit primitives such as `Positioned`, `SelectionFrame`, `HitArea` and `ShapeLayer`.
- `RailBadge` (optional): a badge on a page's rail thumbnail (for example detection results).
- `commands(ctx)`: entries for the `Mod+K` palette, grouped under the mode's name.
- `shortcuts(ctx)` (optional): mode keys, registered on top of the workspace map while the mode is active, so they win over it. They appear in the keyboard shortcut sheet under the mode's group. Single letters are disabled while typing in a field unless `allowInFields` is set.
- `onEnter`, `onLeave`, `canExit`: lifecycle; `canExit` returns `true` or the reason shown in a confirm dialog.

Every mode component gets `ModeProps`: `doc` (the `DocumentApi`), `selection`, `tool` (the active tool id) and `layout`. Change the document only through `doc.dispatch(...)` and `doc.runCheckpoint(...)`; long work runs as a workspace job with a progress overlay. Announce results in plain words with `doc.announce(...)`.

UI rules apply in full: compose kit components only, icons from `@/shared/ui/icons`, no glyphs in labels, light and dark themes, reduced motion, and a keyboard path for every pointer action. If the kit lacks something, add it to the kit first (see CONTRIBUTING.md).

## 3. Operations with defineOperation

```ts
export const setDocumentProperties = defineOperation<MetaSetParams>({
  type: 'meta.set',
  v: 1,
  kind: 'overlay',
  mode: 'protect',
  validate(p) {
    /* parse unknown input; throw ToolError('INVALID_INPUT', ...) */
  },
  label: () => 'Change document properties',
  applyToView: (view, p, op) =>
    withOverlay(view, {
      opId: op.id,
      type: 'meta.set',
      pageId: null,
      params: p,
    }),
});
```

- `type` is unique and stable: it is stored in the autosaved log. `v` is the params version; a changed shape gets a new version, never a silent reinterpretation.
- `kind`:
  - `structure`: page order and page properties (`page.*` types), folded into the page map and written by the page arranger
  - `overlay`: objects on pages or document settings, folded into the view and written at export by a materialiser
  - `checkpoint`: work that needs real bytes; a runner produces new base bytes that become an undoable checkpoint
- `validate` turns unknown input (from a restored log too) into typed params or throws `ToolError('INVALID_INPUT')`.
- `label` is plain words, computed at dispatch time and stored with the op, so undo text ("Undid: rotate page 3 clockwise") stays right after later page moves. Use the `LabelContext` for page numbers.
- `applyToView` is required for structure and overlay ops and must be pure.
- `noOutput: true` marks an overlay op that has no writer (view-only edits such as `object.move`, or settings applied by an export stage).
- `assets(p)` lists the asset ids the writer reads (images, fonts), so their bytes are sent to the worker.
- Overlay ops address pages by stable page id (`PageRef.id`), never by index, so they survive reorder and duplicate.

Export the mode's ops as one array (`PROTECT_OPS`) from its file and add it to `src/pdf/doc/ops/index.ts`: one re-export line and one spread in `registerCoreOperations`.

## 4. Materialisers

A materialiser writes one overlay op type into the output PDF in the edit worker:

```ts
export const metaSetWriter = defineMaterializer<MetaSetParams>({
  type: 'meta.set',
  phase: 'metadata',
  apply(ctx, p) {
    applyMetadataPatch(ctx.doc, p.patch);
  },
});
```

- Writers run grouped by phase in `PHASE_ORDER`: `form`, `flat`, `content`, `signature`, `annotation`, `metadata`.
- `ctx` gives the pdf-lib document, the drawing primitives (`ctx.draw`, from `src/pdf/edit/draw.ts`), the output page for a view page id (`null` when that page is not exported), assets by id, and `ctx.note(...)` for report lines.
- Add the mode's array (`PROTECT_MATERIALIZERS`) with one spread in `ALL_MATERIALIZERS` (`src/pdf/doc/materialize/index.ts`).

## 5. Checkpoint runners

A checkpoint runner orchestrates one checkpoint op on the main thread, calling the worker services (edit, render, qpdf, compress, ocr) for the heavy work:

```ts
export const sanitizeRunner = defineCheckpointRunner<SanitizeParams>({
  type: 'sanitize',
  async run({ bytes, params }, { services, signal, progress }) {
    progress({ done: 0, total: 1, label: 'Removing content' });
    const out = await services.edit.call(
      'sanitize',
      [bytes.slice(), { ...params }],
      { signal },
    );
    return {
      bytes: out.bytes,
      report: { title: 'Sanitised', lines: out.report.removed },
    };
  },
});
```

- `bytes` is the current view materialised, so every pending change is included.
- Honour `signal` (the user can cancel) and report `progress` in plain words.
- Return a `CheckpointReport` that tells the user what happened, fallbacks included (rasterised pages, kept original, skipped pages). Never fail silently and never fall back silently: throw a `ToolError` when the step cannot be done honestly.
- Add the runner with one entry in `ALL_RUNNERS` (`src/pdf/doc/checkpoints/index.ts`).
- If export must sweep what the checkpoint left behind, see `SCRUBBING` and the stages in `src/pdf/doc/export-stages.ts`.

## 6. Worker handlers

New worker functions are handler modules spread into the worker's registry with one line:

- edit worker: `src/pdf/edit/worker/handlers.ts` (`...protectHandlers`)
- render worker: `src/pdf/render/handlers/index.ts`

Handlers receive an `RpcContext` (abort signal, progress) and return `Transferred` results for large buffers.

## 7. Export options and stages

- A section in the Export dialog is one entry in `EXPORT_OPTION_SECTIONS` (`src/pdf/workspace/export-options.ts`): `visible(doc)`, a `Component` that edits `ExportOptions`, and `secret` keys (passwords) cleared after a successful export. Passwords and private keys never enter the op log, autosave or settings.
- A step after materialisation (encrypt, linearize, sign) is one `ExportStage` in `EXPORT_STAGES` (`src/pdf/doc/export-stages.ts`), ordered by `order`, run when `applies(ctx)` is true.

## 8. Icons

Mode icons live in `src/shared/ui/icons/custom/modes.tsx` (`IconModeProtect` and so on): one family drawn on a document outline with the mode's mark in the lower half. Tool icons for a mode go in their own group file, `src/shared/ui/icons/custom/<group>.tsx`, exported with one line from `src/shared/ui/icons/index.ts`. Draw them with `defineIcon` on the 24px grid, stroke only, every coordinate inside 0 to 24, and list each new name in `test/icons-grid.test.ts`. Prefer a lucide icon when one fits.

## 9. Tests

- Op definitions: `validate` (good and bad input), `label`, `applyToView` (`src/pdf/doc/ops/*.test.ts`).
- Writers and runners: materialise or run on generated fixtures and reopen the output with pdf-lib or pdf.js to check what was written (`src/pdf/doc/materialize/*.test.ts`, `src/pdf/doc/checkpoints/*.test.ts`).
- `src/pdf/doc/registry-pairing.test.ts` checks that every overlay op with output has a writer, every checkpoint op has a runner and every structure op is a `page.*` op. It fails when a pairing is missing.
- Mode UI: render the mode in `WorkspaceShell` with `shellHarness()` from `src/pdf/workspace/test-shell.tsx` and drive it by role and accessible name (`src/pdf/workspace/modes/protect/Mode.test.tsx`).
- End to end: a spec in `test/e2e/` that opens a fixture in the workspace, uses the mode, exports and checks the reopened output (`test/e2e/workspace-helpers.ts` has `openInWorkspace` and `exportPdf`).
- Visual: the mode with a fixture open in Standard and Focus, both themes, in `test/visual/`.

## The append-only registries

Several Parts add to the workspace in parallel, so every shared registry takes one added line per contribution and nothing else:

- `src/pdf/workspace/modes/registry.ts`: one manifest per implemented mode
- `src/pdf/doc/ops/index.ts`: one op array per mode (re-export and spread)
- `src/pdf/doc/materialize/index.ts`: one writer array per mode
- `src/pdf/doc/checkpoints/index.ts`: one runner (or array) per checkpoint
- `src/pdf/doc/export-stages.ts`: one stage per export step
- `src/pdf/workspace/export-options.ts`: one Export dialog section
- `src/pdf/edit/worker/handlers.ts` and `src/pdf/render/handlers/index.ts`: one handler module each
- `src/shared/ui/icons/index.ts`: one line per custom icon group
- `src/shared/ui/index.ts`: one line per kit module

Keep edits to these files additive so parallel branches merge without conflicts.
