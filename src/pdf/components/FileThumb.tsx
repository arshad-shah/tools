import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconAlertTriangle } from '@/shared/ui/icons';
import { HoverCard, Sized, Spinner } from '@/shared/ui';
import { usePdfDocument } from '@/pdf/render';
import { PageThumb } from './PageThumb';

const PREVIEW_WIDTH = 240;
/** Gap between the thumb and its preview. */
const GAP = 12;
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
 * the way of the row's keyboard reordering. The preview is hidden below the
 * `sm` breakpoint, where there is no room beside the list.
 */
export const FileThumb: React.FC<FileThumbProps> = ({
  bytes,
  name,
  width = 48,
}) => {
  const wrapper = useRef<HTMLDivElement>(null);
  // Open the worker document only once the row nears the viewport: a long
  // list must not parse every file up front.
  const [near, setNear] = useState(false);
  // Stable identity per bytes: usePdfDocument reopens whenever this changes.
  const file = useMemo(() => (near ? { bytes } : null), [bytes, near]);
  const { doc, error } = usePdfDocument(file);
  const [hovered, setHovered] = useState(false);
  const [rowFocused, setRowFocused] = useState(false);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    // One-shot: once opened, the document stays open for the row's lifetime.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const row = wrapper.current?.closest<HTMLElement>('[data-sortable-item]');
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
      <Sized
        className="flex items-center justify-center rounded-sm border border-line bg-surface-2"
        width={width}
        height={Math.round(width * PLACEHOLDER_RATIO)}
      >
        {error ? (
          <span
            role="img"
            aria-label={error.message}
            title={error.message}
            className="text-danger"
          >
            <IconAlertTriangle size="sm" />
          </span>
        ) : (
          // Decorative: a long list must not create a live region per row.
          <span aria-hidden>
            <Spinner size="sm" label={`Opening ${name}`} />
          </span>
        )}
      </Sized>
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
      <HoverCard
        open={showPreview}
        anchor={wrapper}
        side="right"
        offset={GAP}
        aria-label={`Preview of ${name}`}
        className="hidden sm:block"
      >
        {showPreview && (
          <PageThumb
            docId={doc.docId}
            pageIndex={0}
            page={page}
            width={PREVIEW_WIDTH}
            label={`${name}, page 1 preview`}
          />
        )}
      </HoverCard>
    </div>
  );
};
