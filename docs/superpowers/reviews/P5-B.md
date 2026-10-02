# Review: PR #67, P5-B workspace core and Organize mode

Reviewer: independent (read-only). Branch `feat/p5-b-workspace-core` at `fbf480a`. 247 files, +20259/-1443.
Method: read the code in a temporary detached worktree. Ran no tests (CI already ran typecheck, lint and build). Two parallel read-only sub-reviews covered the UI/kit/a11y side and the worker/render/edit side, and I spot-checked their key findings. All paths below are on the branch.

## Strengths

- **The DocumentModel matches plan B-3 almost line for line.**
  - Dispatch validates and folds on a scratch view, so a failed group changes nothing.
  - Labels are fixed at dispatch time with the scratch view's context.
  - Group undo and redo use the first op's label.
  - `truncateTail` drops tail checkpoints and merged sources and emits `dropped` before the new op's event.
  - The view memo extends within a segment and refolds across one.
  - `canUndo` and `canRedo` respect unavailable checkpoints.
- **Op definitions are pure and validated, with plain-word labels.** `requireAll` and `freshIds` guard stale ids, and restore re-validates every op against its definition and version (`serialize.ts:fromRecords`).
- **Storage:**
  - Each save is one IndexedDB transaction covering record, log and every pending blob, so a crash can't leave a log pointing at missing bytes.
  - Quota errors map to `STORAGE_FULL`, including synchronous throws from `put`.
  - The prefix delete is bounded (`d1/` vs `d10/` is tested).
  - Retention never deletes the open document.
  - BlobStore never evicts bytes that aren't on disk yet.
  - The blob-key reuse after a dropped tail is handled in the right order: `dropped` is synchronous memory forget, then `addCheckpoint`.
- **Buffers are copied before transfer everywhere** (`services.ts:transferable`, `render/client.ts:open`), so no caller's bytes are detached.
- **Registries are shaped as the plan specifies and are append-only:**
  - ops, materializers, checkpoint runners, export stages, export options, the mode registry, render and edit handlers, icon groups;
  - `registry-pairing.test.ts` checks that every op has a writer, a runner or `noOutput`.
- **`arrangePages` is careful.** It validates every crop against its final MediaBox before mutating, prunes links, outlines and annotations of deleted pages, and reports losses in plain words.
- **Kit a11y is strong.**
  - ModeTabs and FloatingDock are proper tablists.
  - Toolbar has a single roving tab stop, and disabled items stay focusable with their reason.
  - PageRail follows R13: detent `keyboard:false`, Alt+Arrow moves with focus kept, Space and Enter act only on the item itself, moves are announced, and `aria-setsize`/`aria-posinset` survive virtualisation.
  - Page slots are regions labelled "Page n of N", and all landmarks are present.
  - The visual suite runs axe in both themes and all three layouts.
- **UI rules hold.** Lint passes, there are no lucide imports outside the icons module, a manual scan found no banned glyphs in product strings, and test glyphs are built from code points.
- **Tests cover the core well:** model (13 cases), page map, autosave (debounce, hidden flush, blob written once, disabled, quota, thumb, dropped), budget, recent and retention, serialize, materialise, and the kit keyboard behaviour.

## Issues

### Critical

**C1. "Clear old documents" deletes the open document's saved copy, and the status keeps saying "Saved".**

- Where: `src/pdf/workspace/use-autosave.ts:62` calls `clearDocuments(db)`, defined at `src/pdf/doc/recent.ts:71-75`.
- Why:
  - The STORAGE_FULL toast action deletes every document, including the one that is open, and then every blob key.
  - Blobs the open document already wrote are no longer pending in BlobStore (`markWritten`), so they are never written again:
    - checkpoint 0, the original bytes;
    - merged sources;
    - assets;
    - evicted older checkpoints.
  - The next save rewrites only `documents` and `logs`.
  - Result: Recent documents lists the file, but restoring it fails ("This undo step is no longer available on this device" or "A merged file is missing"), and undo across evicted checkpoints fails in the current session too.
  - This is silent data loss on the action the spec offers as the cure for STORAGE_FULL.
- Related: after a failed save, autosave only retries on the next model change (`autosave.ts:244` sets `dirty` but never schedules). Freeing space doesn't resave, and the top bar stays on "error".
- Fix:
  - Make the action `clearOtherDocuments(db, keepId)`: delete every other document by id, plus orphan blobs whose prefix is not `keepId/`.
  - Or, after clearing, re-queue every blob the open document has: add `BlobStore.requeueAll()`, keeping evicted checkpoints readable first.
  - Then call `saver.flush()`.
  - Also reschedule a retry after a failed save (backoff), or at least after the clear action.
  - Test: STORAGE_FULL, then clear, then flush, then `restoreDocument` succeeds with every blob present.

### Important

**I1. Page labels break export, Preview, Extract and Split.** Found by both me and the worker sub-review.

- Where: `src/pdf/doc/plan.ts:57` (`pageLabels: view.pageLabels` even with `onlyPages`), `src/pdf/edit/pages.ts:306` (throws when `start >= count`), and `src/pdf/doc/ops/organize.ts:92-113` (`page.delete` never trims ranges).
- Why:
  - With two or more label ranges, writing a subset of pages throws "Page labels start on a page that does not exist". The subset case covers:
    - Extract, Split parts and "Export selected pages";
    - Preview page as exported, which runs automatically when the Export dialog opens.
  - Deleting pages after setting labels breaks the full export the same way.
  - Even where it doesn't throw, the positional ranges are wrong for a subset.
- Fix:
  - In `planFor`, when `onlyPages` is set, either send `pageLabels: null` (arrange then removes labels with a note) or remap the ranges onto the output positions.
  - For full exports, have `page.delete`, `page.reorder` and `page.mergeIn` clip or remap `view.pageLabels`, or clip ranges with `start >= pages.length` in `planFor`.
  - Tests:
    - materialise with labels plus `onlyPages`;
    - label, then delete the last page, then export;
    - preview of page 1 with two ranges.

**I2. A restricted (owner-password-only) document can be exported as an unrestricted copy, and there is no warning after unlocking.**

- Where: the Export button is always enabled (`TopBarControls.tsx:134-145`). `document-api.ts:171-174` guards only `dispatch`, `runCheckpoint`, `addAsset` and `addSource`. `open-flow.ts:53,69` leaves `encryptedInput` false for restricted inputs, so `export-warnings.ts:32` never warns.
- Why:
  - Spec §12 says "editing requires the owner password, no permission bypass".
  - Export, and Extract and Split, which skip `dispatch`, write a decrypted copy with every restriction gone, without the owner password.
  - After a legitimate unlock, the export silently drops the owner's protection.
- Fix:
  - While `restricted` is true, disable Export, Extract and Split (with the reason as a tooltip).
  - Or route them through the same guard, so the restricted message and unlock prompt come up.
  - Add a warning such as "This document had owner restrictions. The exported file has none." when the input was restricted and Protect isn't set.
  - Test both.

**I3. Merged pages are copied one at a time** (`src/pdf/doc/materialize/materialize.ts:83,98`).

- Why: pdf-lib only de-duplicates shared objects within one `copyPages` call. An N-page merged file with shared fonts or images embeds N copies. The existing merge tool batches, so "Merge in" output gets larger.
- Fix: collect the indices per source, call `copyPages` once per source, then place the pages in order. Test that the output size of a 10-page shared-font merge is close to the source size.

**I4. The one-at-a-time edit queue frees its slot on cancel while the worker keeps running** (`src/pdf/doc/services.ts:33-46`).

- Why: an abort rejects at once and releases the slot, but the worker still holds the full document. Repeated Preview, or cancel-and-retry export, stacks several in-memory copies of a large PDF, which breaks the spec §6.5 bound of one copy in the edit worker.
- Fix: hold the slot until the worker settles (keep the inner promise in the limiter), or terminate and restart the edit worker when a running job is cancelled. Test: cancel, then a second call doesn't start until the first settles.

**I5. Render-worker memory for superseded sources is never freed.**

- Where: `src/pdf/workspace/WorkspaceShell.tsx:106-111`, `source-docs.ts` release/dispose, `TiledLayer.tsx:9-20,47-73`.
- Why:
  - Every source still in `state.sources` stays open in the render worker, including old checkpoints that are only kept for undo. In Parts C, E and F, every checkpoint adds a resident document.
  - Closing a document doesn't purge its bitmaps from the shared cache.
  - TiledLayer keeps its own module-level cache of 96 tiles of 512px (about 100 MB) outside the pixel budget. A tile evicted while still visible is closed and never requested again, so it stays blank.
- Fix:
  - Release sources that aren't referenced by the current view, and reopen them on demand.
  - Purge the bitmap cache per docId on close.
  - Count tiles in the pixel budget, or purge them per document, and re-request a tile whose bitmap was closed.

**I6. `runCheckpoint` commits without checking the document is unchanged** (`src/pdf/doc/checkpoints/run.ts:40-59`).

- Why: undo, redo or a new edit while the job runs commits bytes that don't match the history. Undone ops get baked in, or new ops silently drop out of the output. B has no runners yet, but C, E and F inherit this.
- Fix:
  - Capture `log.length`, `cursor` and the last op id before `planFor`, and throw CANCELLED if they changed before commit.
  - Block dispatch, undo and redo (shortcuts and buttons) while a workspace job runs.

**I7. Workspace shortcuts fire while a modal dialog is open.**

- Where: `src/shared/lib/hotkeys.ts:194-215` has no modal scope. The shortcuts are registered at `WorkspaceShell.tsx:56` and `organize/Mode.tsx:86-122`.
- Why: with focus on a button inside ExportDialog, PageLabelsDialog, the confirm dialog, "Leave mode?" or the merge password dialog, keys act on the document behind it:
  - Delete or Backspace deletes a page, R rotates it, Mod+D duplicates it.
  - Mod+Z undoes.
  - Digits switch mode, which unmounts the Organize dialogs.
- Fix: skip non-Escape shortcuts when `e.target` is inside `[aria-modal="true"]`, or add a scope root to `ShortcutDef`. Add a test.

**I8. One Esc closes every stacked overlay and also runs the workspace's Esc action.**

- Where: the Esc handlers in `src/shared/ui/dialog.tsx:12-14` and `drawer.tsx:59` don't `preventDefault`.
- Why:
  - Pressing Esc on the export progress overlay over ExportDialog cancels the export and closes the dialog.
  - A confirm dialog closes together with the dialog under it.
  - Then `WorkspaceShell.tsx:278` also clears the selection or exits the crop tool.
  - This breaks the spec §13.1 order of one step per press.
- Fix: only the topmost overlay handles Esc, with `preventDefault`. hotkeys already skips events whose default was prevented.

**I9. PageRail loses its only tab stop under virtualisation** (`src/shared/ui/page-rail.tsx:110-114,233`).

- Why:
  - The remembered tab-stop page can scroll out of the rendered window, for example after a mouse-wheel scroll. No rendered option then has `tabIndex=0`, so Tab skips the rail.
  - A focused option that unmounts drops focus to body.
- Fix: fall back to the first rendered option, keep rendering the tab-stop item, or use `aria-activedescendant` on the listbox. Add a test.

**I10. The "current page" is the topmost page with any pixel visible** (`WorkspaceShell.tsx:462-464`, `document-viewport.tsx:101`).

- Why: with no selection, R, Delete, Mod+D, Insert blank, the Merge-in position, Crop and Preview all act on a page showing a 1px sliver at the top, not the page the user is looking at.
- Fix: report the page with the largest visible area, or the one under the viewport centre.

**I11. Touch targets are under the 44px that spec §13.2 requires in Focus and phone.**

- Where: `TopBarControls.tsx:105` uses size `sm` (32px), Toolbar items are 32px (`toolbar.tsx:107`, `ModeToolbar.tsx`), and the palette grip is 20x32 (`floating-palette.tsx:291`).
- Fix: add a Toolbar `size` prop and pass `lg` in Focus and phone. Use `lg` top-bar buttons there and enlarge the grip.

**I12. A collapsed rail in Standard can only come back with Mod+\\** (`WorkspaceShell.tsx:262-265,433`).

- Why: the collapsed state persists, Standard has no Pages button, and Mod+K has no workspace commands, so pointer and touch users are stuck.
- Fix: add a Pages toggle button in Standard, and register workspace commands (toggle rail, layout, export, undo, redo).

**I13. The Inspector shell contract is incomplete, and C and D build on it** (`WorkspaceShell.tsx:164,478`, `inspector.tsx:127`).

- Why:
  - `inspectorOpen` never resets, so once closed it stays closed for every later selection.
  - Focus layout passes no anchor, so the "popover next to selection" from plan B-13 renders docked.
- Fix: reopen on selection change or add a reopen control, and pass the selection element as the anchor in Focus. Test both.

### Minor

| #   | Where                               | Finding                                                                                                                                                                                                                                                                                                                                                              | Fix                                                                                   |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| M1  | `budget.ts:310-328`                 | Budget deletes on disk a checkpoint whose bytes may still be pending, so the next save rewrites them (over budget). Merged sources and assets aren't counted.                                                                                                                                                                                                        | Drop the key from BlobStore (`blobs.drop`) as well, and count sources and assets.     |
| M2  | `autosave.ts:213-224`               | The log is snapshotted before the thumb `await` and the blob writes after it. That is harmless today, but a hung `thumb()` blocks the save chain forever.                                                                                                                                                                                                            | Snapshot both after the thumb, and give the thumb a timeout.                          |
| M3  | `use-autosave.ts:133`               | An encrypted document the user opted in to saving restores with autosave off again, so later edits silently stop saving.                                                                                                                                                                                                                                             | Persist the opt-in in the LogRecord and honour it on restore.                         |
| M4  | `serialize.ts:fromRecords`          | Doesn't check consistency: op `checkpoint` ids and `sourceId`s must exist, and `checkpoints[0].index` must be 0. A corrupt record fails later in render.                                                                                                                                                                                                             | Validate at restore and refuse with the restore message.                              |
| M5  | `summary.ts`                        | Structure ops on pages later deleted still count ("1 page rotated" for a deleted page). Plan B-4 says to exclude them.                                                                                                                                                                                                                                               | Filter structure ops whose `pageIds` are all absent from the view.                    |
| M6  | `merge-in.tsx:21-26`                | `addSource` runs before `dispatch`. If dispatch fails, an orphan source stays in the model and on disk.                                                                                                                                                                                                                                                              | Roll back (`model.removeSource` plus `blobs.drop`) when dispatch returns `[]`.        |
| M7  | `ops/organize.ts:296-334`           | `page.mergeIn` doesn't check `newIds.length <= source.pageCount`.                                                                                                                                                                                                                                                                                                    | Check it in `addSource` or `useMergeIn`, or pass the sources into the view.           |
| M8  | `materialize.ts`                    | pdf-lib failures aren't wrapped, so raw messages can reach users.                                                                                                                                                                                                                                                                                                    | Wrap them with `rebuilding()` or a ToolError mapping.                                 |
| M9  | `source-docs.ts`                    | `release` doesn't abort opens in flight, `seed` during an open leaks a document, and the crash budget is keyed by array identity.                                                                                                                                                                                                                                    | Use AbortControllers per source, and key the budget by sourceId.                      |
| M10 | `use-workspace-document.ts:107-135` | `open` can't be cancelled and is last-wins, so it can leak a session after unmount.                                                                                                                                                                                                                                                                                  | Use a generation token or an AbortController.                                         |
| M11 | `render/handlers/text.ts:25-43`     | No `page.cleanup()`.                                                                                                                                                                                                                                                                                                                                                 | Call it in `finally`.                                                                 |
| M12 | `render/client.ts:196-207`          | `renderPageImage` has no priority, so bulk work competes with the canvas.                                                                                                                                                                                                                                                                                            | Accept a priority (background).                                                       |
| M13 | font-cache                          | Noto Sans is the latin subset only; the plan says latin + latin-ext. Already in the backlog.                                                                                                                                                                                                                                                                         | Add latin-ext.                                                                        |
| M14 | `ExportDialog.tsx:102-144`          | The export isn't aborted on unmount, so it still downloads after the user leaves.                                                                                                                                                                                                                                                                                    | Abort in an effect cleanup.                                                           |
| M15 | `PageRailPanel.tsx:58-60`           | Rail Delete skips the keep-one-page check and announcement in `organize/actions.ts`.                                                                                                                                                                                                                                                                                 | Reuse `deletePages`.                                                                  |
| M16 | `organize/ui-store.ts`              | Which dialog is open is stored at module level, so it survives a mode switch or a new document.                                                                                                                                                                                                                                                                      | Reset it in `onLeave` and on session change.                                          |
| M17 | `selection-frame.tsx:156-158`       | Keyboard nudges commit on key-up, so the documented "Esc cancels to start" never applies.                                                                                                                                                                                                                                                                            | Commit on blur or Enter, or fix the doc comment.                                      |
| M18 | `CropTool.tsx:268-273`              | "Reset crop" applies a full-page crop instead of clearing it, so the summary still says cropped.                                                                                                                                                                                                                                                                     | Add a `crop: null` path (`page.crop` with `box: null`) or undo to the pre-crop state. |
| M19 | `TopBarControls.tsx:92`             | Esc in the file-name field also clears the selection.                                                                                                                                                                                                                                                                                                                | `preventDefault`.                                                                     |
| M20 | `WorkspaceShell.tsx:365-370`        | The skip link is hand-written, though AppShell supports `skipLinks`, and there is no skip link to the tools (spec §13.2).                                                                                                                                                                                                                                            | Use the AppShell prop and add the tools link.                                         |
| M21 | `mode-tabs.tsx:86-93`               | Focus moves to a tab even when "Leave mode?" blocks the switch.                                                                                                                                                                                                                                                                                                      | Move focus only on a confirmed change.                                                |
| M22 | `PageLabelsDialog.tsx:87,94`        | Rows are keyed by index with fixed ids, so removing a middle row shifts the inputs.                                                                                                                                                                                                                                                                                  | Use stable row ids and `useId`.                                                       |
| M23 | Spec §13.1                          | Mod+A (select all pages) and ? (shortcut sheet) are missing. Plan B-13 doesn't list them.                                                                                                                                                                                                                                                                            | Add them to the backlog.                                                              |
| M24 | tests                               | No tests for: shortcuts while a dialog is open; stacked-overlay Esc; the rail tab stop after a virtual scroll; ExportDialog cancel and error; component tests for the crop, size, labels, split and merge-in dialogs; materialise crop/size, a labels subset and a repeated merged page; SourceDocs; the queue after a cancel; tile eviction; STORAGE_FULL recovery. | Add them alongside the fixes above.                                                   |

## Plan coverage

| Task                                                    | Status  | Notes                                                                                                             |
| ------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| B-1 error codes, `storage.ts`                           | Done    | Matches the plan, with tests for prefix, atomicity, quota and open failure.                                       |
| B-2 types, registry, page map, geometry, ops            | Done    | Labels aren't remapped by structure ops (I1).                                                                     |
| B-3 DocumentModel                                       | Done    | Faithful to the plan's code, plus additive `changed`, `unrestrict` and `pageOf`.                                  |
| B-4 change summary                                      | Partial | Ops on deleted pages still count (M5).                                                                            |
| B-5 draw / pages / font-cache                           | Done    | Font subset (M13).                                                                                                |
| B-6 edit worker, materialise, services, `runCheckpoint` | Partial | Queue on cancel (I4), per-page copy (I3), no stale-commit guard (I6).                                             |
| B-7 autosave, restore, recent, budget, blob store       | Partial | The clear action destroys the open document's saved copy (C1), no retry after a failure, budget and pending (M1). |
| B-8 render handlers, tiles, priorities, pixel budget    | Partial | Superseded sources and tile cache outside the budget (I5).                                                        |
| B-9 overlay and panel kit                               | Done    | The Inspector popover anchor isn't wired (I13).                                                                   |
| B-10 ModeTabs / Dock / Toolbar / Palette                | Done    | Touch size (I11).                                                                                                 |
| B-11 PageRail / DocumentViewport                        | Done    | Rail tab stop under virtualisation (I9), current-page heuristic (I10).                                            |
| B-12 mode contract, registry, ModeHost, icons           | Done    |                                                                                                                   |
| B-13 WorkspaceShell, layouts, keyboard, live region     | Partial | Modal scoping (I7), Esc stacking (I8), rail recovery (I12), Inspector (I13), touch targets (I11).                 |
| B-14 open flow, pdf-edit tool, hub, Home                | Partial | Restricted export bypass (I2), otherwise complete (1 GB refusal, repair, crash retry, passwordRole).              |
| B-15 export dialog and pipeline                         | Partial | Labels break Preview, export-selected and full export after delete (I1), missing restricted warning (I2).         |
| B-16 Organize mode, delete `pdf-organize`               | Done    | Dialogs instead of Popovers is a logged deviation. Minors M15, M16, M18.                                          |
| B-17 fixtures, perf, overlay-vs-export harness          | Done    |                                                                                                                   |
| B-18 e2e, visual, global setup                          | Done    | Axe in both themes and three layouts.                                                                             |

## Verdict

**Changes requested.** The architecture is sound: the op log, page map, memoised fold, single-transaction autosave and append-only registries are well built and well tested. But one Critical issue (C1) and thirteen Important issues block merge under R36.

The two that matter most for users now are:

- C1, the clear action corrupting the open document's saved copy;
- I1, page labels breaking Export Preview, Extract and Split.

I2 is a policy breach of spec §12. I4 to I6 are memory and integrity foundations that Parts C, E and F inherit, so fix them in B. I7 to I13 are shell and a11y fixes, mostly local.

Counts: Critical 1, Important 13, Minor 24.
