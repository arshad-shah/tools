import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription, Spinner } from '@/shared/ui';
import type { ToolError } from '@/shared/lib/errors';
import { usePageBitmap, usePdfDocument, type PageInfo } from '@/pdf/render';

interface PdfPagePreviewProps {
  bytes: Uint8Array | null;
  /** CSS px. */
  width: number;
  /** Accessible name of the rendered page image. */
  label: string;
  caption: string;
  pending?: boolean;
  error?: ToolError | null;
}

/**
 * Renders page 1 of `bytes` (a real output preview, not a CSS mock-up).
 * Each settings change brings new bytes, which reopen the document; the
 * canvas keeps the last rendered page until the new one is drawn, so the
 * preview updates in place instead of flashing a spinner.
 */
export const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({
  bytes,
  width,
  label,
  caption,
  pending,
  error,
}) => {
  const file = useMemo(() => (bytes ? { bytes } : null), [bytes]);
  const { doc, error: openError } = usePdfDocument(file);
  const pixelWidth = Math.round(width * (window.devicePixelRatio || 1));
  const { bitmap, error: renderError } = usePageBitmap(
    doc?.docId ?? null,
    0,
    pixelWidth,
    doc !== null,
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  // Last known page size and whether anything has been drawn yet; both
  // outlive a reopening document (adjusted during render, not in effects).
  const [page, setPage] = useState<PageInfo | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const next = doc?.pages[0];
  if (next && (next.width !== page?.width || next.height !== page?.height))
    setPage(next);
  const drawable = bitmap !== null && bitmap.width > 0;
  if (drawable && !hasDrawn) setHasDrawn(true);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !bitmap || bitmap.width === 0) return;
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext('2d')?.drawImage(bitmap, 0, 0);
    c.dataset.rendered = 'true';
  }, [bitmap, page]);

  const problem = error ?? openError ?? renderError;
  return (
    <figure
      className="flex flex-col items-center gap-2"
      aria-busy={pending || undefined}
    >
      {problem ? (
        <Alert status="danger">
          <AlertDescription>{problem.message}</AlertDescription>
        </Alert>
      ) : page ? (
        <div
          className="relative bg-white shadow-sm"
          style={{ width, aspectRatio: `${page.width} / ${page.height}` }}
        >
          <canvas
            ref={canvas}
            role="img"
            aria-label={label}
            className="block size-full"
          />
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="sm" label="Rendering preview" />
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-sm border border-line bg-surface-subtle"
          style={{ width, height: Math.round(width * Math.SQRT2) }}
        >
          <Spinner size="sm" label="Rendering preview" />
        </div>
      )}
      <figcaption className="text-xs text-fg-muted">
        {pending ? 'Updating preview…' : caption}
      </figcaption>
    </figure>
  );
};
