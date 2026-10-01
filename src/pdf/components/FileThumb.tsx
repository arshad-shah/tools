import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/shared/ui';
import { usePdfDocument } from '@/pdf/render';
import { PageThumb } from './PageThumb';

const PREVIEW_WIDTH = 240;
/** A4 portrait, used for the box before the real page size is known. */
const PLACEHOLDER_RATIO = Math.SQRT2;

interface FileThumbProps {
  bytes: Uint8Array;
  name: string;
  /** CSS px. */
  width?: number;
}

/**
 * Page 1 of a PDF as a small thumbnail, with a larger preview on hover or
 * when the surrounding focusable row (e.g. a SortableFileList item) has
 * keyboard focus. The thumbnail itself never takes focus, so it can't get in
 * the way of the row's Space/arrow reordering.
 */
export const FileThumb: React.FC<FileThumbProps> = ({
  bytes,
  name,
  width = 48,
}) => {
  // Stable identity per bytes: usePdfDocument reopens whenever this changes.
  const file = useMemo(() => ({ bytes }), [bytes]);
  const { doc, error } = usePdfDocument(file);
  const wrapper = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [rowFocused, setRowFocused] = useState(false);

  useEffect(() => {
    const row =
      wrapper.current?.parentElement?.closest<HTMLElement>('[tabindex]');
    if (!row) return;
    // focus/blur (not focusin/out): only the row itself, not its buttons.
    const onFocus = () => setRowFocused(true);
    const onBlur = () => setRowFocused(false);
    row.addEventListener('focus', onFocus);
    row.addEventListener('blur', onBlur);
    return () => {
      row.removeEventListener('focus', onFocus);
      row.removeEventListener('blur', onBlur);
    };
  }, []);

  const page = doc?.pages[0];
  const showPreview = (hovered || rowFocused) && doc !== null && !!page;

  let thumb: React.ReactNode;
  if (doc && page) {
    thumb = (
      <PageThumb
        docId={doc.docId}
        pageIndex={0}
        page={page}
        width={width}
        label={`${name}, page 1`}
      />
    );
  } else {
    thumb = (
      <div
        className="flex items-center justify-center rounded-sm border border-line bg-surface-subtle"
        style={{ width, height: Math.round(width * PLACEHOLDER_RATIO) }}
      >
        {error ? (
          <span
            role="img"
            aria-label={error.message}
            title={error.message}
            className="text-danger"
          >
            <AlertTriangle size={16} aria-hidden />
          </span>
        ) : (
          <Spinner size="sm" label={`Opening ${name}`} />
        )}
      </div>
    );
  }

  return (
    <div
      ref={wrapper}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Starting a drag shouldn't drag the preview along with it.
      onPointerDown={() => setHovered(false)}
    >
      {thumb}
      {showPreview && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-md border border-line-strong bg-surface-subtle p-2 shadow-lg"
        >
          <PageThumb
            docId={doc.docId}
            pageIndex={0}
            page={page}
            width={PREVIEW_WIDTH}
            label={`${name}, page 1 preview`}
          />
        </div>
      )}
    </div>
  );
};
