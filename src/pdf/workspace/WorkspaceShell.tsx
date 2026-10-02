import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCommands } from '@/shared/lib/commands';
import { useShortcuts } from '@/shared/lib/hotkeys';
import { useMediaQuery } from '@/shared/lib/media-query';
import {
  Drawer,
  FloatingDock,
  Inspector,
  ModeTabs,
  SidePanel,
  TopBar,
  type ModeTabItem,
  type ZoomSetting,
} from '@/shared/ui';
import type { ModeId, PageId } from '@/pdf/doc/types';
import { createDocumentApi } from './document-api';
import { ExportDialog } from './ExportDialog';
import { historyMessage, useLiveRegion } from './live-region';
import { ModeHost } from './ModeHost';
import { ModeToolbarContext } from './mode-toolbar-context';
import { getMode, MODE_ORDER, MODES } from './modes/registry';
import type { ActiveTool, ModeContext } from './modes/types';
import { PageRailPanel } from './PageRailPanel';
import { DocumentCanvas } from './DocumentCanvas';
import type { WorkspaceSession } from './session';
import { useWorkspaceSettings } from './settings';
import { WorkspaceContext, type WorkspaceActions } from './workspace-context';
import {
  workspaceCommands,
  workspaceShortcuts,
  type WorkspaceShortcutApi,
} from './shortcuts';
import { TopBarControls } from './TopBarControls';
import { useAutosave } from './use-autosave';
import { useDocumentModel } from './useDocument';
import { useSelection } from './useSelection';
import { useConfirm, useWorkspaceJob } from './use-workspace-job';
import { nextZoom } from './zoom';

export interface WorkspaceShellProps {
  session: WorkspaceSession;
  mode: ModeId;
  onModeChange(id: ModeId): void;
  /** Mod+O: choose another file. */
  onOpen(): void;
  /** Opens the command palette (Mod+K). */
  onSearch(): void;
  /** Restricted documents: ask for the owner password. */
  onUnlock(): void;
  /** Usually the kit Breadcrumb. */
  breadcrumb: React.ReactNode;
  /** Opens new bytes (an extract) as a separate document. */
  onOpenNew(doc: { name: string; bytes: Uint8Array }): void;
}

const PHONE = '(max-width: 899px)';

/**
 * Where the Focus inspector popover points: the object selection frame,
 * else the page's slot, else the canvas. Read when the popover places.
 */
function selectionAnchor(pageId: PageId | null) {
  return {
    getBoundingClientRect(): DOMRect {
      const canvas = document.getElementById('workspace-canvas');
      const el =
        canvas?.querySelector('[data-testid="selection-frame"]') ??
        (pageId
          ? canvas?.querySelector(`[data-page-id="${CSS.escape(pageId)}"]`)
          : null) ??
        canvas;
      return el?.getBoundingClientRect() ?? new DOMRect();
    },
  };
}

/**
 * The global keyboard map while the workspace is open (spec §13.1), and the
 * same actions in the command palette.
 */
function WorkspaceKeys({
  api,
  disabled,
}: {
  api: WorkspaceShortcutApi;
  disabled: Partial<Record<string, string | false>>;
}) {
  // Mod+F belongs to modes that can find (Redact); until then the browser keeps it.
  useShortcuts(
    workspaceShortcuts(api).filter((d) => d.id !== 'workspace-find'),
    [api],
  );
  const latest = useRef({ api, disabled });
  useEffect(() => {
    latest.current = { api, disabled };
  });
  useCommands(
    {
      id: 'workspace',
      commands: () =>
        workspaceCommands(latest.current.api, latest.current.disabled),
    },
    [],
  );
  return null;
}

/**
 * The PDF workspace (spec §6.1): Standard (tabs, toolbar, rail, inspector),
 * Focus (dock, floating palette, drawers) and phone layouts around one
 * document canvas, with the global keyboard map and a live region.
 */
export function WorkspaceShell({
  session,
  mode,
  onModeChange,
  onOpen,
  onSearch,
  onUnlock,
  breadcrumb,
  onOpenNew,
}: WorkspaceShellProps) {
  const { model, sourceDocs } = session;
  const settings = useWorkspaceSettings();
  const phone = useMediaQuery(PHONE);
  const layout = phone ? 'phone' : settings.layout;
  const compact = layout !== 'standard';
  const { state, view, version } = useDocumentModel(model);
  const sourcesVersion = React.useSyncExternalStore(
    sourceDocs.subscribe,
    sourceDocs.getVersion,
  );
  const selection = useSelection(view);
  const { announce, regions } = useLiveRegion();
  const job = useWorkspaceJob();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [toolId, setToolId] = useState<string | null>(null);
  const [current, setCurrent] = useState<PageId | null>(null);
  const [scrollTo, setScrollTo] = useState<{ id: PageId; nonce: number }>();
  const [railDrawer, setRailDrawer] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const manifest = getMode(mode) ?? MODES[0];
  const busy = model.isBusy();
  const pageIds = view.pages.map((p) => p.id);
  const currentPage =
    current && pageIds.includes(current) ? current : (pageIds[0] ?? null);

  // Exactly the sources the view shows stay open in the render worker;
  // superseded checkpoints are closed (and reopen on undo).
  useEffect(() => {
    sourceDocs.show(
      new Set(view.pages.filter((p) => !p.blank).map((p) => p.source)),
    );
  }, [view, sourceDocs]);

  // Undo and redo are announced (spec §13.2).
  useEffect(
    () =>
      model.subscribe((e) => {
        if (e.kind === 'undo') announce(historyMessage('Undid', e.label));
        else if (e.kind === 'redo') announce(historyMessage('Redid', e.label));
      }),
    [model, announce],
  );

  const saving = useAutosave(session, () => ({
    mode: manifest.id,
    viewport: {
      page: Math.max(0, pageIds.indexOf(currentPage ?? '')),
      zoom: settings.zoom,
    },
  }));

  const doc = useMemo(
    () =>
      createDocumentApi({
        model,
        blobs: session.blobs,
        services: session.services,
        sourceDocs,
        currentPage,
        announce,
        runJob: job.run,
        confirm,
      }),
    // version and sourcesVersion: a new api object after every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, session, sourceDocs, currentPage, version, sourcesVersion],
  );
  const tool: ActiveTool = useMemo(
    () => ({ id: toolId, set: setToolId }),
    [toolId],
  );
  const changeMode = useCallback(
    (id: ModeId) => {
      setToolId(null);
      onModeChange(id);
      useWorkspaceSettings.setState({ lastMode: id });
      announce(`${getMode(id)?.label ?? id} mode`);
    },
    [onModeChange, announce],
  );
  const ctx: ModeContext = useMemo(
    () => ({ doc, selection, tool, layout, navigateMode: changeMode }),
    [doc, selection, tool, layout, changeMode],
  );

  const goTo = (i: number) => {
    const id = pageIds[Math.max(0, Math.min(pageIds.length - 1, i))];
    if (!id) return;
    setCurrent(id);
    setScrollTo((prev) => ({ id, nonce: (prev?.nonce ?? 0) + 1 }));
  };
  const at = Math.max(0, pageIds.indexOf(currentPage ?? ''));

  // A new selection brings a closed inspector back.
  const selectionKey = [...selection.pages, ...selection.objects].join(' ');
  const [seenSelection, setSeenSelection] = useState(selectionKey);
  if (seenSelection !== selectionKey) {
    setSeenSelection(selectionKey);
    if (selectionKey) setInspectorOpen(true);
  }
  const anchorPage =
    pageIds.find((id) => selection.pages.has(id)) ?? currentPage;
  const inspectorAnchor = useMemo(
    () => selectionAnchor(anchorPage),
    [anchorPage],
  );
  const setZoom = (zoom: ZoomSetting) =>
    useWorkspaceSettings.setState({ zoom });
  // Read at key time: quick presses must not see a scale measured before
  // the previous zoom rendered.
  const currentScale = () => {
    const z = useWorkspaceSettings.getState().zoom;
    return z.kind === 'percent' ? z.value / 100 : scale;
  };
  const toggleFocus = () =>
    !phone &&
    useWorkspaceSettings.setState({
      layout: settings.layout === 'focus' ? 'standard' : 'focus',
    });

  const shortcutApi = (
    request: (id: ModeId) => void,
  ): WorkspaceShortcutApi => ({
    undo: () => model.undo(),
    redo: () => model.redo(),
    exportDoc: () => setExportOpen(true),
    open: onOpen,
    toggleFocus,
    toggleRail: () =>
      compact
        ? setRailDrawer((o) => !o)
        : useWorkspaceSettings.setState({ railOpen: !settings.railOpen }),
    setMode: (i) => {
      const id = MODE_ORDER[i];
      if (id && getMode(id)) request(id);
    },
    zoomIn: () => setZoom(nextZoom(currentScale(), 1)),
    zoomOut: () => setZoom(nextZoom(currentScale(), -1)),
    zoomFitWidth: () => setZoom({ kind: 'fit-width' }),
    zoom100: () => setZoom({ kind: 'percent', value: 100 }),
    nextPage: () => goTo(at + 1),
    prevPage: () => goTo(at - 1),
    firstPage: () => goTo(0),
    lastPage: () => goTo(pageIds.length - 1),
    escape: () => (toolId ? setToolId(null) : selection.clear()),
    find: () => {},
  });

  const actions: WorkspaceActions = {
    session,
    runJob: job.run,
    async openAsNew(next) {
      const saved = !!session.db && saving.status !== 'off';
      if (
        !saved &&
        !(await confirm(
          'Leave this document? Changes are not saved on this device.',
        ))
      )
        return;
      await saving.flush();
      onOpenNew(next);
    },
  };

  const items: ModeTabItem[] = MODES.map((m) => ({
    id: m.id,
    label: m.label,
    icon: m.icon,
    shortcut: m.shortcut,
  }));

  return (
    <ModeHost manifest={manifest} ctx={ctx} onModeChange={changeMode}>
      {({ module, request, toolbar }) => {
        const hasSelection =
          selection.pages.size > 0 || selection.objects.size > 0;
        const Inspect = module?.Inspector;
        const showInspector =
          !!Inspect && (hasSelection || !!module?.inspectorPinned);
        const rail = (
          <PageRailPanel
            mode={ctx}
            module={module}
            sourceDocs={sourceDocs}
            current={currentPage}
            width={compact ? 220 : settings.railWidth}
            onCurrent={setCurrent}
            onActivate={(id) => {
              setCurrent(id);
              setScrollTo((prev) => ({ id, nonce: (prev?.nonce ?? 0) + 1 }));
              setRailDrawer(false);
            }}
          />
        );
        const controls = (
          <TopBarControls
            compact={compact}
            name={state.name}
            onRename={(n) => model.rename(n)}
            undoLabel={model.undoLabel()}
            redoLabel={model.redoLabel()}
            onUndo={() => model.undo()}
            onRedo={() => model.redo()}
            layout={layout}
            onToggleFocus={toggleFocus}
            onOpenPages={() =>
              compact
                ? setRailDrawer(true)
                : useWorkspaceSettings.setState({
                    railOpen: !settings.railOpen,
                  })
            }
            railOpen={settings.railOpen}
            save={saving.status}
            canToggleSave={state.encryptedInput && !!session.db}
            onToggleSave={saving.setEnabled}
            restricted={state.restricted}
            onUnlock={onUnlock}
            onSearch={onSearch}
            onExport={() => setExportOpen(true)}
          />
        );
        return (
          <WorkspaceContext.Provider value={actions}>
            <ModeToolbarContext.Provider
              value={{
                layout,
                label: `${manifest.label} tools`,
                palette: settings.palette,
                onPaletteChange: (palette) =>
                  useWorkspaceSettings.setState({ palette }),
              }}
            >
              <div
                data-layout={layout}
                className="grid h-dvh grid-rows-[auto_auto_1fr] overflow-hidden bg-canvas text-fg"
              >
                <a
                  href="#workspace-canvas"
                  className="sr-only rounded-md bg-surface px-3 py-2 text-sm font-medium text-fg shadow-e2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-palette"
                >
                  Skip to the document
                </a>
                <header role="banner">
                  <TopBar
                    compact={compact}
                    breadcrumb={compact ? undefined : breadcrumb}
                    // Compact bars size to their controls (the centre
                    // slot); Standard keeps them on the right.
                    center={compact ? controls : undefined}
                    actions={compact ? undefined : controls}
                  />
                </header>
                <div className="flex min-w-0 flex-col">
                  {layout === 'standard' ? (
                    <>
                      <nav
                        aria-label="Modes"
                        className="border-b border-line bg-surface px-2"
                      >
                        <ModeTabs
                          label="Modes"
                          items={items}
                          value={manifest.id}
                          onChange={(id) => request(id as ModeId)}
                        />
                      </nav>
                      <div
                        id="mode-panel"
                        role="tabpanel"
                        // A checkpoint job holds the document (no edits).
                        inert={busy}
                        aria-busy={busy}
                        aria-label={`${manifest.label} mode`}
                        className="flex min-h-11 items-center border-b border-line bg-surface px-2"
                      >
                        {toolbar}
                      </div>
                    </>
                  ) : (
                    <>
                      <nav aria-label="Modes">
                        <FloatingDock
                          label="Modes"
                          items={items}
                          value={manifest.id}
                          onChange={(id) => request(id as ModeId)}
                          size={layout === 'phone' ? 'lg' : 'md'}
                        />
                      </nav>
                      <div
                        id="mode-panel"
                        role="tabpanel"
                        // A checkpoint job holds the document (no edits).
                        inert={busy}
                        aria-busy={busy}
                        aria-label={`${manifest.label} mode`}
                      >
                        {toolbar}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex min-h-0 min-w-0">
                  {layout === 'standard' ? (
                    <SidePanel
                      side="left"
                      label="Pages"
                      width={settings.railWidth}
                      minWidth={120}
                      maxWidth={260}
                      collapsed={!settings.railOpen}
                      onResize={(railWidth) =>
                        useWorkspaceSettings.setState({ railWidth })
                      }
                    >
                      {rail}
                    </SidePanel>
                  ) : (
                    <Drawer
                      open={railDrawer}
                      onOpenChange={setRailDrawer}
                      side="left"
                      title="Pages"
                    >
                      <div className="h-[70vh]">{rail}</div>
                    </Drawer>
                  )}
                  <main
                    id="workspace-canvas"
                    tabIndex={-1}
                    className="min-w-0 flex-1 outline-none"
                  >
                    <DocumentCanvas
                      mode={ctx}
                      module={module}
                      sourceDocs={sourceDocs}
                      zoom={settings.zoom}
                      onZoomChange={setZoom}
                      onScaleChange={setScale}
                      onCurrentPageChange={(id) => id && setCurrent(id)}
                      scrollToPage={scrollTo}
                    />
                  </main>
                  {Inspect ? (
                    <Inspector
                      title="Properties"
                      mode={
                        layout === 'standard'
                          ? 'panel'
                          : layout === 'phone'
                            ? 'sheet'
                            : 'popover'
                      }
                      anchor={inspectorAnchor}
                      open={showInspector && inspectorOpen}
                      onOpenChange={setInspectorOpen}
                    >
                      <Inspect {...ctx} />
                    </Inspector>
                  ) : null}
                </div>
              </div>
              <WorkspaceKeys
                api={shortcutApi(request)}
                disabled={{
                  undo: model.undoLabel() ? false : 'Nothing to undo',
                  redo: model.redoLabel() ? false : 'Nothing to redo',
                  focus: phone ? 'Phones always use Focus' : false,
                }}
              />
              {regions}
              {job.overlay}
              {confirmDialog}
              <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                session={session}
                doc={doc}
                currentPage={currentPage}
                selectedPages={view.pages
                  .map((p) => p.id)
                  .filter((id) => selection.pages.has(id))}
              />
            </ModeToolbarContext.Provider>
          </WorkspaceContext.Provider>
        );
      }}
    </ModeHost>
  );
}
