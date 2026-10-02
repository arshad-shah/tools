import type { Command } from '@/shared/lib/commands';
import type { ShortcutDef } from '@/shared/lib/hotkeys';

export interface WorkspaceShortcutApi {
  undo(): void;
  redo(): void;
  exportDoc(): void;
  open(): void;
  toggleFocus(): void;
  toggleRail(): void;
  /** 0-based position in the fixed mode order. */
  setMode(i: number): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomFitWidth(): void;
  zoom100(): void;
  nextPage(): void;
  prevPage(): void;
  firstPage(): void;
  lastPage(): void;
  escape(): void;
  find(): void;
  /** Mod+A: every page (modes with objects register their own Mod+A). */
  selectAllPages(): void;
}

const GROUP = 'Workspace';

/** Global workspace shortcuts (spec §13.1); modes add their own. */
export function workspaceShortcuts(api: WorkspaceShortcutApi): ShortcutDef[] {
  const def = (
    id: string,
    combo: string,
    description: string,
    run: () => void,
    extra: Partial<ShortcutDef> = {},
  ): ShortcutDef => ({
    id: `workspace-${id}`,
    combo,
    description,
    group: GROUP,
    run: () => run(),
    ...extra,
  });
  return [
    def('undo', 'Mod+Z', 'Undo', api.undo),
    def('redo', 'Mod+Shift+Z', 'Redo', api.redo),
    def('redo-y', 'Mod+Y', 'Redo', api.redo),
    def('export', 'Mod+S', 'Export', api.exportDoc, { allowInFields: true }),
    def('open', 'Mod+O', 'Open a file', api.open, { allowInFields: true }),
    def('focus', 'F', 'Toggle Focus layout', api.toggleFocus),
    def('rail', 'Mod+\\', 'Toggle the page rail', api.toggleRail),
    ...Array.from({ length: 9 }, (_, i) =>
      def(`mode-${i + 1}`, String(i + 1), `Mode ${i + 1}`, () =>
        api.setMode(i),
      ),
    ),
    def('zoom-in', 'Mod+=', 'Zoom in', api.zoomIn),
    def('zoom-out', 'Mod+-', 'Zoom out', api.zoomOut),
    def('zoom-fit', 'Mod+0', 'Fit width', api.zoomFitWidth),
    def('zoom-100', 'Mod+1', 'Zoom to 100 percent', api.zoom100),
    def('next-page', 'PageDown', 'Next page', api.nextPage),
    def('next-page-j', 'J', 'Next page', api.nextPage),
    def('prev-page', 'PageUp', 'Previous page', api.prevPage),
    def('prev-page-k', 'K', 'Previous page', api.prevPage),
    def('first-page', 'Home', 'First page', api.firstPage),
    def('last-page', 'End', 'Last page', api.lastPage),
    def('escape', 'Escape', 'Cancel', api.escape),
    def('find', 'Mod+F', 'Find in document', api.find),
    def('select-all', 'Mod+A', 'Select all pages', api.selectAllPages),
  ];
}

/** The workspace actions in the command palette (Mod+K), with their keys. */
export function workspaceCommands(
  api: WorkspaceShortcutApi,
  disabled: Partial<Record<string, string | false>> = {},
): Command[] {
  const cmd = (
    id: string,
    label: string,
    shortcut: string,
    run: () => void,
  ): Command => ({
    id: `workspace-${id}`,
    label,
    group: GROUP,
    shortcut,
    disabled: disabled[id] || false,
    run,
  });
  return [
    cmd('export', 'Export PDF', 'Mod+S', api.exportDoc),
    cmd('open', 'Open a file', 'Mod+O', api.open),
    cmd('undo', 'Undo', 'Mod+Z', api.undo),
    cmd('redo', 'Redo', 'Mod+Shift+Z', api.redo),
    cmd('focus', 'Toggle Focus layout', 'F', api.toggleFocus),
    cmd('rail', 'Toggle the page rail', 'Mod+\\', api.toggleRail),
    cmd('zoom-in', 'Zoom in', 'Mod+=', api.zoomIn),
    cmd('zoom-out', 'Zoom out', 'Mod+-', api.zoomOut),
    cmd('zoom-fit', 'Fit width', 'Mod+0', api.zoomFitWidth),
    cmd('zoom-100', 'Zoom to 100 percent', 'Mod+1', api.zoom100),
    cmd('next-page', 'Next page', 'PageDown', api.nextPage),
    cmd('prev-page', 'Previous page', 'PageUp', api.prevPage),
    cmd('first-page', 'First page', 'Home', api.firstPage),
    cmd('last-page', 'Last page', 'End', api.lastPage),
  ];
}
