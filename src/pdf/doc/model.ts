import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import { baseView, findOverlay, pageNumberOf } from './page-map';
import { getOperation, type LabelContext } from './registry';
import type {
  CheckpointId,
  CheckpointMeta,
  DocView,
  NewOperation,
  Operation,
  SourceId,
  SourceRef,
} from './types';
import { foldView } from './view';

/** Structure ops that bring their own source file (dropped with them). */
const SOURCE_OPS = new Set(['page.mergeIn', 'page.insertImages']);

export interface DocumentState {
  id: string;
  name: string;
  createdAt: number;
  sources: Record<SourceId, SourceRef>;
  /** [0] = original (decrypted) bytes. */
  checkpoints: CheckpointMeta[];
  log: Operation[];
  /** log[0..cursor) applied. */
  cursor: number;
  encryptedInput: boolean;
  /** Owner-password-only input (spec §12). */
  restricted: boolean;
  /** The input had owner restrictions, even once unlocked (export warns). */
  ownerRestricted?: boolean;
  /** DetectionCache from P5-C; not part of undo. */
  detection?: unknown;
}

export type HistoryEvent =
  | { kind: 'dispatch'; label: string; ops: Operation[] }
  | { kind: 'undo' | 'redo'; label: string }
  | { kind: 'checkpoint'; label: string; checkpoint: CheckpointMeta }
  /** Undo or redo crossed a checkpoint. */
  | { kind: 'base-changed'; checkpoint: CheckpointMeta }
  /** Redo tail truncated: blobs to delete. */
  | { kind: 'dropped'; checkpoints: CheckpointMeta[]; sources: SourceId[] }
  | { kind: 'renamed'; name: string }
  /** Checkpoints marked unavailable (disk budget) or a merged source added. */
  | { kind: 'changed' }
  /** A job (runCheckpoint) started or ended; see `beginJob`. */
  | { kind: 'busy'; busy: boolean };

const BUSY_MESSAGE = 'Wait for the current change to finish';

/**
 * The open document: an op log with a cursor over a chain of checkpoints
 * (spec §6.2). The view is a pure fold of the ops since the current
 * checkpoint, memoised so appending ops folds only the new ones.
 */
export class DocumentModel {
  private state: DocumentState;
  private listeners = new Set<(e: HistoryEvent) => void>();
  private version = 0;
  private memo: {
    checkpoint: CheckpointId;
    upTo: number;
    view: DocView;
  } | null = null;
  private readonly now: () => number;
  private readonly id: () => string;
  private busy = false;

  constructor(
    state: DocumentState,
    deps: { now?: () => number; newId?: () => string } = {},
  ) {
    this.state = state;
    this.now = deps.now ?? Date.now;
    this.id = deps.newId ?? newId;
  }

  subscribe(listener: (e: HistoryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /** Immutable snapshot; a new object after every change. */
  getState(): DocumentState {
    return this.state;
  }
  /** Increments on every change (useSyncExternalStore key). */
  getVersion(): number {
    return this.version;
  }

  /** True while a job holds the document (see `beginJob`). */
  isBusy(): boolean {
    return this.busy;
  }

  /**
   * Marks a job (runCheckpoint) as running: until the returned `end` is
   * called, dispatch throws, and undo and redo do nothing (canUndo and
   * canRedo are false). Emits `busy` on start and end. Throws when another
   * job is already running.
   */
  beginJob(): () => void {
    if (this.busy) throw new ToolError('INVALID_INPUT', BUSY_MESSAGE);
    this.busy = true;
    this.emit({ kind: 'busy', busy: true });
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.busy = false;
      this.emit({ kind: 'busy', busy: false });
    };
  }

  private emit(e: HistoryEvent) {
    this.version++;
    for (const l of [...this.listeners]) l(e);
  }
  private set(patch: Partial<DocumentState>) {
    this.state = { ...this.state, ...patch };
  }

  /** Index of the last checkpoint op strictly before `cursor`, or -1 (base = checkpoint 0). */
  private lastCheckpointOp(cursor: number): number {
    for (let i = cursor - 1; i >= 0; i--)
      if (this.state.log[i].checkpoint) return i;
    return -1;
  }

  checkpointFor(cursor: number): CheckpointMeta {
    const i = this.lastCheckpointOp(cursor);
    const id =
      i < 0 ? this.state.checkpoints[0].id : this.state.log[i].checkpoint!;
    const meta = this.state.checkpoints.find((c) => c.id === id);
    if (!meta)
      throw new ToolError('INVALID_INPUT', 'A saved version is missing');
    return meta;
  }

  currentCheckpoint(): CheckpointMeta {
    return this.checkpointFor(this.state.cursor);
  }

  getView(): DocView {
    const { cursor, log } = this.state;
    const ckpt = this.currentCheckpoint();
    const start = this.lastCheckpointOp(cursor) + 1;
    const memo = this.memo;
    if (memo && memo.checkpoint === ckpt.id && memo.upTo === cursor)
      return memo.view;
    // Extend the memo when only ops were appended in the same segment;
    // otherwise fold from the checkpoint's base view.
    let view: DocView;
    let from: number;
    if (
      memo &&
      memo.checkpoint === ckpt.id &&
      memo.upTo < cursor &&
      memo.upTo >= start
    ) {
      view = memo.view;
      from = memo.upTo;
    } else {
      view = baseView(ckpt, this.state.sources[ckpt.sourceId]);
      from = start;
    }
    view = foldView(view, log.slice(from, cursor));
    this.memo = { checkpoint: ckpt.id, upTo: cursor, view };
    return view;
  }

  labelContext(view: DocView = this.getView()): LabelContext {
    return {
      pageNumber: (id) => pageNumberOf(view, id),
      pageCount: view.pages.length,
      pageOf: (opId) => findOverlay(view, opId)?.pageId ?? null,
    };
  }

  /** Throws ToolError on an invalid op or while busy; nothing is applied then. */
  dispatch(input: NewOperation | NewOperation[], label?: string): Operation[] {
    if (this.busy) throw new ToolError('INVALID_INPUT', BUSY_MESSAGE);
    const list = Array.isArray(input) ? input : [input];
    if (list.length === 0) return [];
    const group = list.length > 1 ? this.id() : undefined;
    // Validate and fold on a scratch view first: nothing changes unless
    // every op applies.
    let view = this.getView();
    const ops: Operation[] = [];
    for (const n of list) {
      const def = getOperation(n.type);
      if (def.kind === 'checkpoint')
        throw new ToolError(
          'INVALID_INPUT',
          'Checkpoints run through runCheckpoint',
        );
      const params = def.validate(n.params);
      const op: Operation = {
        id: this.id(),
        type: def.type,
        v: def.v,
        params,
        at: this.now(),
        label: def.label(params, this.labelContext(view)),
        ...(group ? { group } : {}),
      };
      view = def.applyToView ? def.applyToView(view, params, op) : view;
      ops.push(op);
    }
    // The group's label lives on its first op.
    if (group && label) ops[0] = { ...ops[0], label };
    const dropped = this.truncateTail();
    this.set({
      log: [...this.state.log, ...ops],
      cursor: this.state.cursor + ops.length,
    });
    this.memo = {
      checkpoint: this.currentCheckpoint().id,
      upTo: this.state.cursor,
      view,
    };
    if (dropped) this.emit(dropped);
    this.emit({ kind: 'dispatch', label: ops[0].label, ops });
    return ops;
  }

  /** A merged-in file, added before dispatching page.mergeIn. */
  addSource(source: SourceRef): void {
    this.set({ sources: { ...this.state.sources, [source.id]: source } });
    this.emit({ kind: 'changed' });
  }

  commitCheckpoint(
    input: NewOperation,
    checkpoint: Omit<CheckpointMeta, 'index' | 'opId' | 'available'>,
    source: SourceRef,
    label?: string,
  ): Operation {
    const def = getOperation(input.type);
    if (def.kind !== 'checkpoint')
      throw new ToolError(
        'INVALID_INPUT',
        `${input.type} is not a checkpoint operation`,
      );
    const params = def.validate(input.params);
    const op: Operation = {
      id: this.id(),
      type: def.type,
      v: def.v,
      params,
      at: this.now(),
      label: label ?? def.label(params, this.labelContext()),
      checkpoint: checkpoint.id,
    };
    const dropped = this.truncateTail();
    const meta: CheckpointMeta = {
      ...checkpoint,
      index: this.state.checkpoints.length,
      opId: op.id,
      available: true,
    };
    this.set({
      log: [...this.state.log, op],
      cursor: this.state.cursor + 1,
      checkpoints: [...this.state.checkpoints, meta],
      sources: { ...this.state.sources, [source.id]: source },
    });
    this.memo = null;
    if (dropped) this.emit(dropped);
    this.emit({ kind: 'checkpoint', label: op.label, checkpoint: meta });
    return op;
  }

  /** Drops log[cursor..] and the checkpoints and sources only they referenced. */
  private truncateTail(): HistoryEvent | null {
    const tail = this.state.log.slice(this.state.cursor);
    if (tail.length === 0) return null;
    const ids = new Set(
      tail.flatMap((o) => (o.checkpoint ? [o.checkpoint] : [])),
    );
    const dropped = this.state.checkpoints.filter((c) => ids.has(c.id));
    const mergedInTail = tail
      .filter((o) => SOURCE_OPS.has(o.type))
      .map((o) => (o.params as { sourceId: SourceId }).sourceId);
    const droppedSources = [
      ...new Set([...dropped.map((c) => c.sourceId), ...mergedInTail]),
    ];
    const sources = { ...this.state.sources };
    for (const s of droppedSources) delete sources[s];
    this.set({
      checkpoints: this.state.checkpoints.filter((c) => !ids.has(c.id)),
      sources,
      log: this.state.log.slice(0, this.state.cursor),
    });
    return dropped.length || droppedSources.length
      ? { kind: 'dropped', checkpoints: dropped, sources: droppedSources }
      : null;
  }

  /** First index of the undo step that ends at `cursor`. */
  private undoTarget(): number {
    const { log, cursor } = this.state;
    let g = cursor - 1;
    const group = log[g].group;
    if (group) while (g > 0 && log[g - 1].group === group) g--;
    return g;
  }
  /** Cursor after redoing the step that starts at `cursor`. */
  private redoTarget(): number {
    const { log, cursor } = this.state;
    let end = cursor + 1;
    const group = log[cursor].group;
    if (group) while (end < log.length && log[end].group === group) end++;
    return end;
  }

  canUndo(): boolean {
    if (this.busy || this.state.cursor === 0) return false;
    const target = this.checkpointFor(this.undoTarget());
    return target.id === this.currentCheckpoint().id || target.available;
  }
  canRedo(): boolean {
    if (this.busy || this.state.cursor >= this.state.log.length) return false;
    const target = this.checkpointFor(this.redoTarget());
    return target.id === this.currentCheckpoint().id || target.available;
  }
  undoLabel(): string | null {
    return this.canUndo() ? this.state.log[this.undoTarget()].label : null;
  }
  redoLabel(): string | null {
    return this.canRedo() ? this.state.log[this.state.cursor].label : null;
  }

  undo(): HistoryEvent | null {
    if (!this.canUndo()) return null;
    const target = this.undoTarget();
    return this.moveCursor(target, 'undo', this.state.log[target].label);
  }
  redo(): HistoryEvent | null {
    if (!this.canRedo()) return null;
    const label = this.state.log[this.state.cursor].label;
    return this.moveCursor(this.redoTarget(), 'redo', label);
  }

  private moveCursor(cursor: number, kind: 'undo' | 'redo', label: string) {
    const before = this.currentCheckpoint();
    this.set({ cursor });
    const event: HistoryEvent = { kind, label };
    this.emit(event);
    const after = this.currentCheckpoint();
    if (after.id !== before.id)
      this.emit({ kind: 'base-changed', checkpoint: after });
    return event;
  }

  /** Disk budget dropped these checkpoints' bytes; limits undo. */
  markUnavailable(ids: CheckpointId[]): void {
    const set = new Set(ids);
    this.set({
      checkpoints: this.state.checkpoints.map((c) =>
        set.has(c.id) ? { ...c, available: false } : c,
      ),
    });
    this.emit({ kind: 'changed' });
  }

  /** The owner password was given: a restricted document becomes editable. */
  unrestrict(): void {
    if (!this.state.restricted) return;
    this.set({ restricted: false });
    this.emit({ kind: 'changed' });
  }

  rename(name: string): void {
    const trimmed = name.trim();
    if (!trimmed || trimmed === this.state.name) return;
    this.set({ name: trimmed });
    this.emit({ kind: 'renamed', name: trimmed });
  }
}
