import type { ComponentType } from 'react';
import type { Command } from '@/shared/lib/commands';
import type { ShortcutDef } from '@/shared/lib/hotkeys';
import type { IconComponent } from '@/shared/ui/icons';
import type { DocumentState } from '@/pdf/doc/model';
import type { OperationDefinition } from '@/pdf/doc/registry';
import type { Viewport } from '@/pdf/doc/geometry';
import type { Services } from '@/pdf/doc/services';
import type {
  AssetId,
  CheckpointReport,
  DocView,
  ModeId,
  NewOperation,
  OpId,
  Operation,
  PageGeom,
  PageId,
  PageRef,
  SourceId,
} from '@/pdf/doc/types';
import type { DocInfo, PageTextItems, PdfRender } from '@/pdf/render';

export interface ModeManifest {
  id: ModeId;
  label: string;
  icon: IconComponent;
  /** '1'..'9', fixed by spec order (G7). */
  shortcut: string;
  order: number;
  load: () => Promise<{ default: ModeModule }>;
}

export interface ModeModule {
  /** Registered on load (also eagerly by registerCoreOperations for restore; duplicates are no-ops). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operations: OperationDefinition<any>[];
  /** Renders `<ModeToolbar groups={...} />`, which picks Toolbar or FloatingPalette by layout. */
  Toolbar: ComponentType<ModeProps>;
  Inspector?: ComponentType<ModeProps>;
  /** Show the inspector even without a selection. */
  inspectorPinned?: boolean;
  PageOverlay?: ComponentType<PageOverlayProps>;
  RailBadge?: ComponentType<{ page: PageRef; doc: DocumentApi }>;
  commands(ctx: ModeContext): Command[];
  shortcuts?: (ctx: ModeContext) => ShortcutDef[];
  onEnter?(ctx: ModeContext): void;
  onLeave?(ctx: ModeContext): void;
  /** A string is the reason shown in a confirm dialog. */
  canExit?(ctx: ModeContext): true | string;
}

export interface ActiveTool {
  id: string | null;
  set(id: string | null): void;
}

export interface SelectionApi {
  pages: ReadonlySet<PageId>;
  objects: ReadonlySet<OpId>;
  selectPages(
    ids: PageId[],
    mode?: 'replace' | 'add' | 'toggle' | 'range',
  ): void;
  selectObjects(ids: OpId[], mode?: 'replace' | 'add' | 'toggle'): void;
  clear(): void;
}

export interface DocumentApi {
  view: DocView;
  state: DocumentState;
  /** Render-worker handles per source. */
  sources: Record<SourceId, { docId: string | null; info: DocInfo | null }>;
  /** The page the canvas shows (the rail's current page). */
  currentPage: PageId | null;
  /** Errors are reported to the user; returns [] when nothing was applied. */
  dispatch(op: NewOperation | NewOperation[], label?: string): Operation[];
  /** useJob + ProgressOverlay; null when cancelled. */
  runCheckpoint<P>(
    type: string,
    params: P,
    opts?: { title: string; confirm?: string },
  ): Promise<CheckpointReport | null>;
  addAsset(bytes: Uint8Array, mime: string): AssetId;
  /** Steps back one undo step (a mode cancelling its own preparation). */
  undo(): void;
  /** Stores flat-form detection results with the document (not undoable). */
  setDetection(detection: unknown): void;
  /** Opens in the render worker and stores the blob. */
  addSource(bytes: Uint8Array, name: string): Promise<SourceId>;
  render: PdfRender;
  text(page: PageRef): Promise<PageTextItems>;
  /** Source geometry. */
  pageGeom(page: PageRef): PageGeom;
  /** geometry.pageViewport with pending rotation and crop. */
  viewport(page: PageRef, scale: number): Viewport;
  services: Services;
  /** Workspace live region. */
  announce(message: string): void;
}

export interface ModeProps {
  doc: DocumentApi;
  selection: SelectionApi;
  tool: ActiveTool;
  layout: 'standard' | 'focus' | 'phone';
}

export interface PageOverlayProps extends ModeProps {
  page: PageRef;
  pageNumber: number;
  viewport: Viewport;
  width: number;
  height: number;
}

export interface ModeContext extends ModeProps {
  navigateMode(id: ModeId): void;
}
