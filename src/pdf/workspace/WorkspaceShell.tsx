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
  Divider,
  DockedToolbar,
  Heading,
  IconButton,
  Inline,
  Popover,
  SegmentedControl,
  Select,
  Sheet,
  SkipLink,
  SplitPane,
  Stack,
  StatusBar,
  StatusBarSegment,
  Switch,
  ZoomControls,
  type ZoomSetting,
} from '@arshad-shah/cynosure';
import { close as closeIcon } from '@arshad-shah/cynosure/icons';
import type { ModeId, PageId } from '@/pdf/doc/types';
import { createDocumentApi } from './document-api';
import { ExportDialog } from './ExportDialog';
import { historyMessage, useLiveRegion } from './live-region';
import { ModeHost } from './ModeHost';
import { ModeToolbarContext } from './mode-toolbar-context';
import { getMode, MODE_ORDER, MODES } from './modes/registry';
import type { ActiveTool, GoToPageOptions, ModeContext } from './modes/types';
import { PageRailPanel } from './PageRailPanel';
import { DocumentCanvas, type PageScrollRequest } from './DocumentCanvas';
import type { WorkspaceSession } from './session';
import { useWorkspaceSettings } from './settings';
import { useHeldValue } from './use-held-value';
import { WorkspaceContext, type WorkspaceActions } from './workspace-context';
import {
  workspaceCommands,
  workspaceShortcuts,
  type WorkspaceShortcutApi,
} from './shortcuts';
import { SAVE_TEXT, SAVE_TONE } from './save-status';
import { TopBarControls, type TopBarMenuItem } from './TopBarControls';
import { clearTrustedRootsCommand } from './modes/fill-sign/trusted-roots-command';
import { SignedBadge } from './SignedBadge';
import { useAutosave } from './use-autosave';
import { useDocumentModel } from './useDocument';
import { useSelection } from './useSelection';
import { useConfirm, useWorkspaceJob } from './use-workspace-job';
import { effectiveZoom, nextZoom } from './zoom';
import { useWorkspaceTestHook } from './test-hook';

/** Workspace settings in the top bar's More menu (plan H-14). */
const SETTINGS_ITEMS: TopBarMenuItem[] = [clearTrustedRootsCommand()].map(
  (c) => ({ id: c.id, label: c.label, onSelect: () => void c.run() }),
);

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
  /** The header's breadcrumbs (pdf, edit). */
  breadcrumb: React.ReactNode;
  /** Opens new bytes (an extract) as a separate document. */
  onOpenNew(doc: { name: string; bytes: Uint8Array }): void;
  /** The app's help menu in the top bar (shortcut sheet, privacy note). */
  helpMenu?: (size: 'md' | 'lg') => React.ReactNode;
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
  helpMenu,
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
  const [visiblePages, setVisiblePages] = useState<readonly PageId[]>([]);
  const [scrollTo, setScrollTo] = useState<PageScrollRequest>();
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

  // Navigation (rail, keys, modes): current page plus a scroll request.
  const navigate = useCallback((id: PageId, opts: GoToPageOptions = {}) => {
    setCurrent(id);
    setScrollTo((prev) => ({ id, ...opts, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const doc = useMemo(
    () =>
      createDocumentApi({
        model,
        blobs: session.blobs,
        services: session.services,
        sourceDocs,
        currentPage,
        visiblePages,
        announce,
        runJob: job.run,
        confirm,
        goToPage: navigate,
      }),
    // version and sourcesVersion: a new api object after every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      model,
      session,
      sourceDocs,
      currentPage,
      visiblePages,
      version,
      sourcesVersion,
    ],
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
  useWorkspaceTestHook(doc);

  const goTo = (i: number) => {
    const id = pageIds[Math.max(0, Math.min(pageIds.length - 1, i))];
    if (id) navigate(id);
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
    selectAllPages: () => selection.selectPages(pageIds),
  });

  const actions: WorkspaceActions = {
    session,
    runJob: job.run,
    unlock: onUnlock,
    goToPage: (id) => doc.goToPage(id),
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

  const modeOptions = MODES.map((m) => ({
    value: m.id,
    label: m.label,
    icon: m.icon,
  }));

  // The inspector opens for a selection once a press (a drag on an
  // object) is released, so the page does not shift under the pointer.
  const hasSelection = useHeldValue(
    selection.pages.size > 0 || selection.objects.size > 0,
  );

  return (
    <ModeHost manifest={manifest} ctx={ctx} onModeChange={changeMode}>
      {({ module, request, toolbar }) => {
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
            height={compact ? '70vh' : '100%'}
            onCurrent={(id) => navigate(id)}
            onActivate={(id) => {
              navigate(id, { focus: true });
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
            badges={<SignedBadge session={session} compact={compact} />}
            onSearch={onSearch}
            helpMenu={helpMenu}
            settingsItems={SETTINGS_ITEMS}
            onExport={() => setExportOpen(true)}
          />
        );
        const modeName = `${manifest.label} mode`;
        const pickMode = (id: string) => request(id as ModeId);
        const inspectorBody = Inspect ? <Inspect {...ctx} /> : null;
        const inspectorShown = showInspector && inspectorOpen;
        const canvas = (
          <Stack
            as="section"
            id="workspace-canvas"
            aria-label="Document canvas"
            fill
            minSize="0"
          >
            <DocumentCanvas
              mode={ctx}
              module={module}
              sourceDocs={sourceDocs}
              zoom={effectiveZoom(settings.zoom, {
                railOpen: layout === 'standard' && settings.railOpen,
                inspectorOpen: layout === 'standard' && inspectorShown,
              })}
              onZoomChange={setZoom}
              onScaleChange={setScale}
              onCurrentPageChange={(id) => id && setCurrent(id)}
              onVisiblePagesChange={(ids) =>
                setVisiblePages((prev) =>
                  prev.join(' ') === ids.join(' ') ? prev : ids,
                )
              }
              scrollToPage={scrollTo}
            />
          </Stack>
        );
        const inspectorPanel = (
          <Stack
            as="aside"
            aria-label="Properties"
            fill
            minSize="0"
            overflow="auto"
            padding="5"
            gap="4"
          >
            <Inline justify="between" align="center" gap="2">
              <Heading level={2} size="sm">
                Properties
              </Heading>
              <IconButton
                icon={closeIcon}
                label="Close properties"
                size="sm"
                variant="ghost"
                onClick={() => setInspectorOpen(false)}
              />
            </Inline>
            {inspectorBody}
          </Stack>
        );
        const railPanel = (
          <Stack as="aside" aria-label="Pages" fill minSize="0">
            {rail}
          </Stack>
        );
        const statusBar = (
          <StatusBar
            label="Status"
            start={
              <>
                <StatusBarSegment>
                  {pageIds.length
                    ? `Page ${at + 1} of ${pageIds.length}`
                    : 'No pages'}
                </StatusBarSegment>
                {selection.pages.size > 1 ? (
                  <StatusBarSegment>
                    {`${selection.pages.size} pages selected`}
                  </StatusBarSegment>
                ) : null}
                {selection.objects.size > 0 ? (
                  <StatusBarSegment>
                    {selection.objects.size === 1
                      ? '1 object selected'
                      : `${selection.objects.size} objects selected`}
                  </StatusBarSegment>
                ) : null}
              </>
            }
            end={
              state.encryptedInput && session.db ? (
                <StatusBarSegment
                  dot
                  tone={SAVE_TONE[saving.status]}
                  label={`${SAVE_TEXT[saving.status]}: change`}
                  popoverLabel="Saving on this device"
                  popover={
                    <Switch
                      label="Save on this device"
                      description="An encrypted PDF is saved here only when you ask."
                      checked={saving.status !== 'off'}
                      onChange={saving.setEnabled}
                    />
                  }
                >
                  {SAVE_TEXT[saving.status]}
                </StatusBarSegment>
              ) : (
                <StatusBarSegment dot tone={SAVE_TONE[saving.status]}>
                  {SAVE_TEXT[saving.status]}
                </StatusBarSegment>
              )
            }
          />
        );
        const modeSwitch =
          layout === 'phone' ? (
            <Select
              label="Mode"
              labelHidden
              size="lg"
              options={modeOptions}
              value={manifest.id}
              onChange={pickMode}
            />
          ) : (
            <SegmentedControl
              label="Modes"
              options={modeOptions}
              value={manifest.id}
              onChange={pickMode}
              iconOnly={layout === 'focus'}
              size={layout === 'focus' ? 'lg' : 'sm'}
            />
          );
        return (
          <WorkspaceContext.Provider
            value={{ ...actions, goToMode: (id) => request(id) }}
          >
            <ModeToolbarContext.Provider
              value={{
                layout,
                label: `${manifest.label} tools`,
                palette: settings.palette,
                onPaletteChange: (palette) =>
                  useWorkspaceSettings.setState({ palette }),
              }}
            >
              <Stack fill minSize="0" gap="0" overflow="hidden">
                <SkipLink
                  href="#workspace-canvas"
                  labels={{ skip: 'Skip to the document' }}
                />
                <Stack as="header" role="banner" gap="0">
                  <Inline
                    gap="3"
                    align="center"
                    paddingInline="4"
                    paddingBlock="2"
                    justify="between"
                  >
                    {compact ? null : breadcrumb}
                    {controls}
                  </Inline>
                  <Divider spacing="none" />
                </Stack>
                {layout === 'standard' ? (
                  <Stack gap="0">
                    <Inline
                      as="nav"
                      aria-label="Modes"
                      paddingInline="4"
                      paddingBlock="2"
                      gap="3"
                      align="center"
                    >
                      {modeSwitch}
                    </Inline>
                    <Divider spacing="none" />
                    <Inline
                      id="mode-panel"
                      role="region"
                      aria-label={modeName}
                      aria-busy={busy}
                      paddingInline="3"
                      paddingBlock="1"
                      gap="3"
                      align="center"
                      justify="between"
                    >
                      {toolbar}
                      <ZoomControls
                        zoom={settings.zoom}
                        percent={Math.round(scale * 100)}
                        onZoomChange={setZoom}
                      />
                    </Inline>
                    <Divider spacing="none" />
                  </Stack>
                ) : layout === 'phone' ? (
                  <Stack gap="0">
                    <Inline
                      as="nav"
                      aria-label="Modes"
                      paddingInline="4"
                      paddingBlock="2"
                    >
                      {modeSwitch}
                    </Inline>
                    <Divider spacing="none" />
                  </Stack>
                ) : null}
                <Stack grow minSize="0" overflow="hidden">
                  {layout === 'standard' ? (
                    <SplitPane
                      label="Resize the page rail"
                      unit="px"
                      size={settings.railWidth}
                      min={120}
                      max={260}
                      collapsed={!settings.railOpen}
                      onResizeEnd={(railWidth) =>
                        useWorkspaceSettings.setState({ railWidth })
                      }
                      start={railPanel}
                      end={
                        Inspect ? (
                          <SplitPane
                            label="Resize the properties"
                            unit="px"
                            anchor="end"
                            defaultSize={320}
                            min={260}
                            max={480}
                            collapsed={!inspectorShown}
                            start={canvas}
                            end={inspectorShown ? inspectorPanel : null}
                          />
                        ) : (
                          canvas
                        )
                      }
                    />
                  ) : (
                    canvas
                  )}
                </Stack>
                {layout === 'standard' ? (
                  statusBar
                ) : (
                  // Docked bars keep room for themselves at the bottom.
                  <Stack
                    id="mode-panel"
                    role="region"
                    aria-label={modeName}
                    aria-busy={busy}
                  >
                    {toolbar}
                    {layout === 'focus' ? (
                      <DockedToolbar label="Modes" floating>
                        {modeSwitch}
                      </DockedToolbar>
                    ) : null}
                  </Stack>
                )}
              </Stack>
              {layout === 'standard' ? null : (
                <Sheet
                  open={railDrawer}
                  onOpenChange={setRailDrawer}
                  side="start"
                  size="sm"
                  title="Pages"
                >
                  <Stack as="aside" aria-label="Pages" gap="0">
                    {rail}
                  </Stack>
                </Sheet>
              )}
              {Inspect && layout === 'phone' ? (
                <Sheet
                  open={inspectorShown}
                  onOpenChange={setInspectorOpen}
                  side="bottom"
                  title="Properties"
                >
                  {inspectorBody}
                </Sheet>
              ) : null}
              {Inspect && layout === 'focus' ? (
                <Popover
                  label="Properties"
                  anchor={inspectorAnchor}
                  open={inspectorShown}
                  onOpenChange={setInspectorOpen}
                  placement="end"
                  size="md"
                  initialFocus="none"
                >
                  <Stack gap="4">
                    <Heading level={2} size="sm">
                      Properties
                    </Heading>
                    {inspectorBody}
                  </Stack>
                </Popover>
              ) : null}
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
