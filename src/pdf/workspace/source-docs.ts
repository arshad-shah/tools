import { logToolError, toToolError, type ToolError } from '@/shared/lib/errors';
import type { DocInfo, PdfRender } from '@/pdf/render';
import type { SourceId } from '@/pdf/doc/types';

export interface SourceHandle {
  docId: string | null;
  info: DocInfo | null;
  error: ToolError | null;
}

type Render = Pick<PdfRender, 'open' | 'close' | 'onRestart' | 'generation'>;

/**
 * The render-worker documents behind a workspace's sources (the current
 * checkpoint, earlier checkpoints after undo, merged-in files). Opens what
 * the view needs from the blob store, keeps a handle per source, and
 * reopens everything after a worker restart.
 */
export class SourceDocs {
  private handles = new Map<SourceId, SourceHandle>();
  private opening = new Map<SourceId, AbortController>();
  private listeners = new Set<() => void>();
  private version = 0;
  private disposed = false;
  private readonly offRestart: () => void;

  constructor(
    private readonly render: Render,
    private readonly bytesOf: (id: SourceId) => Promise<Uint8Array>,
    /** Drops cached bitmaps of a document this closes. */
    private readonly onClosed: (docId: string) => void = () => {},
  ) {
    this.offRestart = render.onRestart(() => {
      // The old worker took every document with it.
      const ids = [...this.handles.keys()];
      this.handles.clear();
      for (const c of this.opening.values()) c.abort();
      this.opening.clear();
      this.changed();
      this.ensure(ids);
    });
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };
  getVersion = () => this.version;

  private changed() {
    this.version++;
    for (const l of [...this.listeners]) l();
  }

  get(id: SourceId): SourceHandle | undefined {
    return this.handles.get(id);
  }

  /** Every handle, for DocumentApi.sources. */
  snapshot(): Record<SourceId, { docId: string | null; info: DocInfo | null }> {
    return Object.fromEntries(
      [...this.handles].map(([id, h]) => [
        id,
        { docId: h.docId, info: h.info },
      ]),
    );
  }

  /** A document the caller already opened in the render worker. */
  seed(id: SourceId, info: DocInfo): void {
    const old = this.handles.get(id);
    if (old?.docId && old.docId !== info.docId) this.close(old.docId);
    this.handles.set(id, { docId: info.docId, info, error: null });
    this.changed();
  }

  /** Opens every listed source that is not open (or opening) yet. */
  ensure(ids: Iterable<SourceId>): void {
    for (const id of ids) {
      if (this.disposed || this.handles.has(id) || this.opening.has(id))
        continue;
      const ctrl = new AbortController();
      this.opening.set(id, ctrl);
      void this.bytesOf(id)
        .then((bytes) => this.render.open(bytes, ctrl.signal))
        .then(
          (info) => {
            if (ctrl.signal.aborted) {
              this.close(info.docId);
              return;
            }
            this.handles.set(id, { docId: info.docId, info, error: null });
          },
          (e) => {
            if (ctrl.signal.aborted) return;
            const error = toToolError(e);
            if (error.code !== 'CANCELLED') logToolError(error);
            this.handles.set(id, { docId: null, info: null, error });
          },
        )
        .finally(() => {
          if (this.opening.get(id) === ctrl) {
            this.opening.delete(id);
            this.changed();
          }
        });
    }
  }

  private close(docId: string) {
    this.onClosed(docId);
    void this.render.close(docId).catch(() => {});
  }

  /**
   * Exactly these sources open: opens the missing ones and closes the rest
   * (superseded checkpoints, a dropped redo tail, unused merges). Undo back
   * to an earlier checkpoint reopens it from the blob store.
   */
  show(ids: Iterable<SourceId>): void {
    const wanted = new Set(ids);
    for (const [id, c] of this.opening)
      if (!wanted.has(id)) {
        c.abort();
        this.opening.delete(id);
      }
    this.release(wanted);
    this.ensure(wanted);
  }

  /** Closes sources not listed in `keep`. */
  release(keep: Iterable<SourceId>): void {
    const wanted = new Set(keep);
    let any = false;
    for (const [id, h] of this.handles)
      if (!wanted.has(id)) {
        if (h.docId) this.close(h.docId);
        this.handles.delete(id);
        any = true;
      }
    if (any) this.changed();
  }

  dispose(): void {
    this.disposed = true;
    this.offRestart();
    for (const c of this.opening.values()) c.abort();
    this.opening.clear();
    for (const h of this.handles.values()) if (h.docId) this.close(h.docId);
    this.handles.clear();
    this.listeners.clear();
  }
}
