import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/shared/ui';
import { usePdfDocument } from '@/pdf/render';
import { PageThumb } from './PageThumb';

const PREVIEW_WIDTH = 240;
/** Gap between thumb and popover, and minimum distance to the viewport edge. */
const GAP = 12;
const EDGE = 8;

/**
 * Places the popover beside the thumb: on the right when it fits, else on
 * the left, vertically centred on the thumb but clamped inside the viewport.
 * Measured imperatively when the popover mounts, so no extra render.
 */
function placePopover(panel: HTMLElement, anchor: HTMLElement) {
  const a = anchor.getBoundingClientRect();
  const pw = panel.offsetWidth;
  const ph = panel.offsetHeight;
  const fitsRight = a.right + GAP + pw + EDGE <= window.innerWidth;
  panel.style.left = `${fitsRight ? a.width + GAP : -(pw + GAP)}px`;
  const centred = a.top + a.height / 2 - ph / 2;
  const maxTop = Math.max(EDGE, window.innerHeight - ph - EDGE);
  const top = Math.min(maxTop, Math.max(EDGE, centred));
  panel.style.top = `${top - a.top}px`;
}
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
  // Stable identity per bytes: usePdfDocument reopens whenever this changes.
  const file = useMemo(() => ({ bytes }), [bytes]);
  const { doc, error } = usePdfDocument(file);
  const wrapper = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [rowFocused, setRowFocused] = useState(false);

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
          // Decorative: a long list must not create a live region per row.
          <span aria-hidden>
            <Spinner size="sm" label={`Opening ${name}`} />
          </span>
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
          ref={(panel) => {
            if (panel && wrapper.current) placePopover(panel, wrapper.current);
          }}
          aria-hidden
          aria-label={`Preview of ${name}`}
          className="pointer-events-none absolute top-0 left-full z-50 hidden rounded-md border border-line-strong bg-surface-subtle p-2 shadow-lg sm:block"
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
