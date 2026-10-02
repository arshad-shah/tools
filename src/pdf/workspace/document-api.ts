import { notify } from '@/shared/lib/notify';
import { ToolError, toToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import type { JobContext } from '@/shared/state/useJob';
import type { BlobStore } from '@/pdf/doc/blob-store';
import { runCheckpoint } from '@/pdf/doc/checkpoints/run';
import { assertUnrestricted } from '@/pdf/doc/restricted';
import type { DocumentModel } from '@/pdf/doc/model';
import type { Services } from '@/pdf/doc/services';
import type { DocInfo } from '@/pdf/render';
import type { PageId } from '@/pdf/doc/types';
import type { DocumentApi } from './modes/types';
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
  announce(message: string): void;
  /** Runs `fn` with the workspace ProgressOverlay; null when cancelled. */
  runJob<R>(
    title: string,
    fn: (ctx: JobContext) => Promise<R>,
  ): Promise<R | null>;
  confirm(message: string): Promise<boolean>;
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
    render: services.render,
    text: (page) => services.render.textItems(docIdOf(page.source), page.index),
    pageGeom: (page) => pageGeom(page, model.getState().sources),
    viewport: (page, scale) =>
      displayViewport(page, model.getState().sources, scale),
    services,
    announce: d.announce,
  };
}
