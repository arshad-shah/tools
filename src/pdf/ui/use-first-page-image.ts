import { useEffect, useMemo, useState } from 'react';
import { usePageBitmap, usePdfDocument } from '@/pdf/render';
import type { ToolError } from '@/shared/lib/errors';

export interface PageImage {
  /** An object URL of the page, for an image (null while it renders). */
  src: string | null;
  error: ToolError | null;
}

/**
 * One page of an open document as an image URL, rendered by the pdf.js
 * worker (no canvas in the page: the bitmap is encoded off screen). The URL
 * is revoked when the page changes or the caller unmounts.
 */
export function usePageImage(
  docId: string | null,
  pageIndex: number,
  widthPx: number,
  enabled = true,
): PageImage {
  const { bitmap, error } = usePageBitmap(
    docId,
    pageIndex,
    widthPx,
    enabled && docId !== null,
    1,
  );
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!bitmap || bitmap.width === 0 || typeof OffscreenCanvas === 'undefined')
      return;
    let url: string | null = null;
    let live = true;
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    void canvas.convertToBlob({ type: 'image/png' }).then((blob) => {
      if (!live) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [bitmap]);

  return { src, error };
}

export interface FirstPageImage extends PageImage {
  /** Width over height of page 1, once the document is open. */
  ratio: number | null;
}

/** Page 1 of a PDF's bytes as an image URL (the file list's thumbnail). */
export function useFirstPageImage(
  bytes: Uint8Array,
  widthPx: number,
): FirstPageImage {
  const file = useMemo(() => ({ bytes }), [bytes]);
  const { doc, error } = usePdfDocument(file);
  const page = doc?.pages[0];
  const image = usePageImage(doc?.docId ?? null, 0, widthPx, !!page);
  return {
    src: image.src,
    ratio: page ? page.width / page.height : null,
    error: error ?? image.error,
  };
}
