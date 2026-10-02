import { notify } from '@/shared/lib/notify';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import { createXxh64 } from '@/shared/lib/crypto/checksum';
import type { JobContext } from '@/shared/state/useJob';
import type { BlobStore } from '@/pdf/doc/blob-store';
import { runCheckpoint } from '@/pdf/doc/checkpoints/run';
import { assertUnrestricted } from '@/pdf/doc/restricted';
import type { DocumentModel } from '@/pdf/doc/model';
import { blobKey } from '@/pdf/doc/serialize';
import type { Services } from '@/pdf/doc/services';
import type { DocInfo } from '@/pdf/render';
import type { PageId } from '@/pdf/doc/types';
import type { DocumentApi, GoToPageOptions } from './modes/types';
import { displayViewport, pageGeom } from './page-display';
import type { SourceDocs } from './source-docs';

/** Largest image or signature asset (spec §6.5). */
export const MAX_ASSET_BYTES = 25 * 1024 * 1024;

export { RESTRICTED_MESSAGE } from '@/pdf/doc/restricted';

export interface DocumentApiDeps {
  model: DocumentModel;
  blobs: BlobStore;
  services: Services;
  sourceDocs: SourceDocs;
  currentPage: PageId | null;
  /** Pages the canvas shows, in document order. */
  visiblePages?: readonly PageId[];
  announce(message: string): void;
  /** Runs `fn` with the workspace ProgressOverlay; null when cancelled. */
  runJob<R>(
    title: string,
    fn: (ctx: JobContext) => Promise<R>,
  ): Promise<R | null>;
  confirm(message: string): Promise<boolean>;
  /** Makes the page current and scrolls the canvas (the shell's navigation). */
  goToPage?(id: PageId, opts: GoToPageOptions): void;
}

/** The view of the document a mode works with (spec §7.1). */
export function createDocumentApi(d: DocumentApiDeps): DocumentApi {
  const { model, blobs, services, sourceDocs } = d;
  const state = model.getState();
  const view = model.getView();

  const guard = () => assertUnrestricted(model.getState());

  const docIdOf = (sourceId: string) => {
    const docId = sourceDocs.get(sourceId)?.docId;
    if (!docId) throw new ToolError('CANCELLED', 'This page is still opening');
    return docId;
  };

  return {
    view,
    state,
    sources: sourceDocs.snapshot(),
    currentPage: d.currentPage,
    visiblePages: d.visiblePages ?? [],
    dispatch(op, label) {
      try {
        guard();
        return model.dispatch(op, label);
      } catch (e) {
        notify.error(toToolError(e));
        return [];
      }
    },
    async runCheckpoint(type, params, opts) {
      guard();
      if (opts?.confirm && !(await d.confirm(opts.confirm))) return null;
      let opened: DocInfo | null = null;
      try {
        const report = await d.runJob(opts?.title ?? 'Working', (job) =>
          runCheckpoint({
            model,
            blobs,
            services,
            type,
            params,
            exclude: opts?.exclude,
            signal: job.signal,
            progress: job.progress,
            inspect: async (bytes, signal) => {
              opened = await services.render.open(bytes, signal);
              return opened.pages.map((p) => ({
                view: p.view,
                rotate: p.rotate,
              }));
            },
          }),
        );
        if (report && opened) {
          sourceDocs.seed(model.currentCheckpoint().sourceId, opened);
          opened = null;
        }
        if (report) d.announce(report.title);
        return report;
      } finally {
        if (opened) void services.render.close((opened as DocInfo).docId);
      }
    },
    addAsset(bytes) {
      guard();
      if (bytes.byteLength > MAX_ASSET_BYTES)
        throw new ToolError(
          'TOO_LARGE',
          'Images and signatures can be at most 25 MB',
        );
      const id = newId();
      blobs.addAsset(id, bytes);
      return id;
    },
    assetBytes: (id) => blobs.assetBytes(id),
    async contentHash() {
      const first = model.getState().checkpoints[0];
      const h = createXxh64();
      h.update(await blobs.checkpointBytes(first.id));
      return h.digestHex();
    },
    undo: () => void model.undo(),
    setDetection: (detection) => model.setDetection(detection),
    async addSource(bytes, name) {
      guard();
      const info = await services.render.open(bytes);
      const id = newId();
      blobs.addSource(id, bytes);
      model.addSource({
        id,
        name,
        byteSize: bytes.byteLength,
        pageCount: info.pageCount,
        pages: info.pages.map((p) => ({ view: p.view, rotate: p.rotate })),
        origin: 'merged',
      });
      sourceDocs.seed(id, info);
      return id;
    },
    removeSource(id) {
      if (!model.removeSource(id)) return;
      void blobs
        .drop([blobKey.source(model.getState().id, id)])
        .catch(() => {});
      sourceDocs.release(
        Object.keys(sourceDocs.snapshot()).filter((s) => s !== id),
      );
    },
    render: services.render,
    text: (page) => services.render.textItems(docIdOf(page.source), page.index),
    pageGeom: (page) => pageGeom(page, model.getState().sources),
    viewport: (page, scale) =>
      displayViewport(page, model.getState().sources, scale),
    services,
    announce: d.announce,
    goToPage(id, opts = {}) {
      if (!model.getView().pages.some((p) => p.id === id)) return;
      d.goToPage?.(id, opts);
    },
  };
}
