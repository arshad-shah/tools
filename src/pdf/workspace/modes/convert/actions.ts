import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { loadFile, type FileKind } from '@/shared/lib/files';
import { newId } from '@/shared/lib/id';
import { convertToPng } from '@/shared/lib/image-convert';
import { notify } from '@/shared/lib/notify';
import type { JobContext } from '@/shared/state/useJob';
import type { PageId } from '@/pdf/doc/types';
import type { ImageInput } from '@/pdf/edit/images';
import {
  exportImages,
  exportMarkdown,
  exportText,
  IMAGE_MIME,
  imagesAsPdf,
  materializeView,
} from '@/pdf/convert/exports';
import { MAX_EXPORT_DPI, MIN_EXPORT_DPI } from '@/pdf/render';
import { useWorkspace } from '../../workspace-context';
import type { ModeProps } from '../types';
import { dispatchWithSource } from './insert';
import { imageSaver } from '@/pdf/convert/zip-stream';
import { useConvertSettings } from './settings';

export const IMAGE_KINDS: FileKind[] = ['png', 'jpeg', 'webp', 'gif'];
export const IMAGE_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif';

export const clampDpi = (n: number) =>
  Math.min(MAX_EXPORT_DPI, Math.max(MIN_EXPORT_DPI, Math.round(n)));

/** Selected pages in document order, else the current page. */
export function selectedPages({ doc, selection }: ModeProps): PageId[] {
  const picked = doc.view.pages
    .map((p) => p.id)
    .filter((id) => selection.pages.has(id));
  if (picked.length) return picked;
  return doc.currentPage ? [doc.currentPage] : [];
}

const listPages = (pages: number[]) =>
  pages.length === 1
    ? `page ${pages[0]}`
    : `pages ${pages.slice(0, -1).join(', ')} and ${pages[pages.length - 1]}`;

const TEXT_MIME = 'text/plain;charset=utf-8';
const MARKDOWN_MIME = 'text/markdown;charset=utf-8';
const encoder = new TextEncoder();

/**
 * Convert actions (spec 7.2): exports from the current materialised view,
 * one materialise per action behind the workspace ProgressOverlay, and the
 * one document change, "Insert images as pages".
 */
export function useConvertActions(ctx: ModeProps) {
  const ws = useWorkspace();
  const settings = useConvertSettings();
  const { model, blobs, services } = ws.session;
  const name = model.getState().name;
  const scoped = () => (settings.scope === 'all' ? null : selectedPages(ctx));

  const run = async <R>(
    title: string,
    work: (job: JobContext) => Promise<R>,
    done: (r: R) => void | Promise<void>,
  ) => {
    try {
      const r = await ws.runJob(title, work);
      if (r !== null) await done(r);
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  const noText = (pages: number[]) => {
    if (pages.length)
      notify.info(
        `No text found on ${listPages(pages)}. Scanned pages need OCR first.`,
      );
  };

  const images = () => {
    const opts = {
      format: settings.format,
      dpi: clampDpi(settings.dpi),
      quality: settings.quality,
    };
    // Images stream into the download as they are rendered.
    const saver = imageSaver(
      IMAGE_MIME[opts.format],
      deriveFilename(name, 'images', 'zip'),
    );
    return run(
      'Converting pages to images',
      async (job) => {
        try {
          const r = await exportImages(
            model,
            blobs,
            scoped(),
            opts,
            { ...job, services },
            saver.add,
          );
          return { capped: r.capped, saved: await saver.finish() };
        } catch (e) {
          saver.abort();
          throw e;
        }
      },
      async ({ capped, saved }) => {
        saveBlob(saved.blob, saved.name);
        notify.success(
          `Saved ${saved.count} ${saved.count === 1 ? 'image' : 'images'}`,
        );
        if (capped.length)
          notify.info(
            `Rendered ${listPages(capped.map((c) => c.page))} at a lower resolution (down to ${Math.min(
              ...capped.map((c) => c.dpi),
            )} DPI) to fit the size limit`,
          );
      },
    );
  };

  const text = () =>
    run(
      'Extracting text',
      (job) => exportText(model, blobs, scoped(), { ...job, services }),
      (r) => {
        const file = deriveFilename(name, '', 'txt');
        saveBlob(encoder.encode(r.text), file, TEXT_MIME);
        notify.success(`Saved ${file}`);
        noText(r.emptyPages);
      },
    );

  const markdown = () =>
    run(
      'Converting to Markdown',
      (job) => exportMarkdown(model, blobs, scoped(), { ...job, services }),
      (r) => {
        const file = deriveFilename(name, '', 'md');
        saveBlob(encoder.encode(r.markdown), file, MARKDOWN_MIME);
        notify.success(
          `Saved ${file}. The structure is a best guess: check it before use.`,
        );
        noText(r.emptyPages);
      },
    );

  const selectedPdf = (then: 'download' | 'open') => {
    const pages = selectedPages(ctx);
    const file = deriveFilename(name, 'extract', 'pdf');
    return run(
      'Extracting pages',
      (job) => materializeView(model, blobs, pages, { ...job, services }),
      (bytes) => {
        if (then === 'open') return ws.openAsNew({ name: file, bytes });
        saveBlob(bytes, file, 'application/pdf');
        notify.success(`Saved ${file}`);
      },
    );
  };

  /** The images as one PDF source, its pages inserted after the current page. */
  const insertImages = (files: File[]) => {
    if (files.length === 0) return;
    const label = files.length === 1 ? files[0].name : `${files.length} images`;
    return run(
      files.length === 1 ? 'Inserting the image' : 'Inserting images',
      async (job) => {
        const images: ImageInput[] = [];
        for (const [i, f] of files.entries()) {
          job.signal.throwIfAborted();
          job.progress({
            done: i,
            total: files.length,
            label: 'Reading images',
          });
          const file = await loadFile(f, IMAGE_KINDS);
          images.push(
            file.kind === 'png' || file.kind === 'jpeg'
              ? { bytes: file.bytes, kind: file.kind, name: file.name }
              : {
                  bytes: await convertToPng(file.bytes, file.kind, file.name),
                  kind: 'png',
                  name: file.name,
                },
          );
        }
        job.progress({
          done: files.length,
          total: files.length,
          label: 'Building pages',
        });
        const bytes = await imagesAsPdf(
          services.edit,
          images,
          settings.pageSize,
          job.signal,
        );
        const id = await ctx.doc.addSource(bytes, label);
        if (job.signal.aborted) {
          ctx.doc.removeSource(id);
          job.signal.throwIfAborted();
        }
        return id;
      },
      (sourceId) => {
        const count = model.getState().sources[sourceId]?.pageCount ?? 0;
        const pages = model.getView().pages;
        const at =
          pages.findIndex((p) => p.id === ctx.doc.currentPage) + 1 ||
          pages.length;
        const ops = dispatchWithSource(ctx.doc, sourceId, {
          type: 'page.insertImages',
          params: {
            at,
            sourceId,
            newIds: Array.from({ length: count }, () => newId()),
          },
        });
        if (ops.length)
          ctx.doc.announce(
            `Inserted ${count} ${count === 1 ? 'image' : 'images'} as ${
              count === 1 ? 'a page' : 'pages'
            }`,
          );
      },
    );
  };

  return { images, text, markdown, selectedPdf, insertImages };
}
