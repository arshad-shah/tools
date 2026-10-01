import React, { useMemo } from 'react';
import { Alert, AlertDescription, Spinner } from '@/shared/ui';
import type { ToolError } from '@/shared/lib/errors';
import { usePdfDocument } from '@/pdf/render';
import { PageThumb } from './PageThumb';

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

/** Renders page 1 of `bytes` (a real output preview, not a CSS mock-up). */
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
  const problem = error ?? openError;
  return (
    <figure
      className="flex flex-col items-center gap-2"
      aria-busy={pending || undefined}
    >
      {problem ? (
        <Alert status="danger">
          <AlertDescription>{problem.message}</AlertDescription>
        </Alert>
      ) : doc ? (
        <PageThumb
          docId={doc.docId}
          pageIndex={0}
          page={doc.pages[0]}
          width={width}
          label={label}
        />
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
