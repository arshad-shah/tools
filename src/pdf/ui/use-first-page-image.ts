import { useEffect, useMemo, useState } from 'react';
import { usePageBitmap, usePdfDocument } from '@/pdf/render';
import type { ToolError } from '@/shared/lib/errors';

export interface FirstPageImage {
  /** An object URL of page 1, for an image (null while it renders). */
  src: string | null;
  /** Width over height of page 1, once the document is open. */
  ratio: number | null;
  error: ToolError | null;
}

/**
 * Page 1 of a PDF as an image URL, rendered by the pdf.js worker (no canvas
 * in the page: the bitmap is encoded off screen). The URL is revoked when
 * the bytes change or the caller unmounts.
 */
export function useFirstPageImage(
  bytes: Uint8Array,
  widthPx: number,
): FirstPageImage {
  const file = useMemo(() => ({ bytes }), [bytes]);
  const { doc, error } = usePdfDocument(file);
  const page = doc?.pages[0];
  const { bitmap, error: renderError } = usePageBitmap(
    doc?.docId ?? null,
    0,
    widthPx,
    !!page,
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

  return {
    src,
    ratio: page ? page.width / page.height : null,
    error: error ?? renderError,
  };
}
