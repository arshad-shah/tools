import type { RefObject } from 'react';
import { copyText } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import type { SandboxedHtmlHandle } from '@/shared/surfaces/sandboxed-html/SandboxedHtml';
import { fileBase } from '../lib/caret';
import { readDocTokens } from '../lib/doc-tokens';
import { toRichClipboard, toStandaloneHtml } from '../lib/export';
import { renderMarkdown } from '../lib/render';

/** A failure as a toast, with a plain fallback message. */
export const fail = (e: unknown, fallback: string) =>
  notify.error(toToolError(e, fallback));

export interface ExportActions {
  downloadHtml(): void;
  downloadMarkdown(): void;
  copyRich(): void;
  copyHtml(): void;
  print(): void;
}

/**
 * Export, download, copy and print for the document. Each successful
 * export marks `text` as exported (`onExported`).
 */
export function useExportActions(
  text: string,
  preview: RefObject<SandboxedHtmlHandle | null>,
  onExported: (text: string) => void,
): ExportActions {
  const fresh = async () => {
    const r = await renderMarkdown(text);
    const title = r.outline.find((h) => h.depth === 1)?.text ?? 'Document';
    return { ...r, title, base: fileBase(title) };
  };
  return {
    downloadHtml: () =>
      void fresh().then(
        ({ html, title, base }) => {
          const doc = toStandaloneHtml(html, title, readDocTokens('light'));
          saveBlob(
            new Blob([doc], { type: 'text/html;charset=utf-8' }),
            `${base}.html`,
          );
          onExported(text);
        },
        (e) => fail(e, 'Could not export HTML'),
      ),
    downloadMarkdown: () =>
      void fresh().then(
        ({ base }) => {
          saveBlob(
            new Blob([text], { type: 'text/markdown;charset=utf-8' }),
            `${base}.md`,
          );
          onExported(text);
        },
        (e) => fail(e, 'Could not export Markdown'),
      ),
    copyRich: () =>
      void fresh()
        .then(async ({ html }) => {
          try {
            if (
              typeof ClipboardItem === 'undefined' ||
              !navigator.clipboard?.write
            )
              throw new Error('Rich clipboard unavailable');
            await navigator.clipboard.write([toRichClipboard(html, text)]);
            notify.success('Copied as rich text');
          } catch {
            await copyText(html);
            notify.info(
              'Rich text copy is not available here, so the HTML was copied as text',
            );
          }
          onExported(text);
        })
        .catch((e: unknown) => fail(e, 'Could not copy')),
    copyHtml: () =>
      void fresh()
        .then(async ({ html }) => {
          await copyText(html);
          notify.success('Copied HTML');
          onExported(text);
        })
        .catch((e: unknown) => fail(e, 'Could not copy')),
    print: () => preview.current?.print(),
  };
}
