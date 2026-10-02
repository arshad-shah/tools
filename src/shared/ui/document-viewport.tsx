import React from 'react';
import { cn } from '@/shared/lib/cn';
import { Positioned, Sized } from './positioned';
import { useScrollBox } from './use-scroll-box';
import { useViewportGestures, type ZoomAnchor } from './use-viewport-gestures';
import { cumulativeOffsets, visibleRange } from './virtual';
import { zoomScale } from './zoom-scale';

export type ZoomSetting =
  /** max: a cap in percent (the workspace default reads at 125 at most). */
  | { kind: 'fit-width'; max?: number }
  | { kind: 'fit-page'; max?: number }
  /** 25..800 */
  | { kind: 'percent'; value: number };

export interface DocumentViewportProps {
  /** e.g. "Document". */
  label: string;
  /** CSS px at zoom 1 (PDF points), after pending rotation and crop. */
  pages: { id: string; width: number; height: number }[];
  zoom: ZoomSetting;
  onZoomChange(z: ZoomSetting): void;
  /** Bitmap and overlays for one page slot. */
  renderPage(page: {
    id: string;
    index: number;
    scale: number;
    visible: boolean;
    /** The slot's part inside the scroll viewport (slot CSS px); null when off screen. */
    visibleRect: {
      left: number;
      top: number;
      width: number;
      height: number;
    } | null;
  }): React.ReactNode;
  /** Drives rendering, detection priority and the rail's current page. */
  onVisiblePagesChange?(ids: string[]): void;
  /** The page with the largest visible area (the current page). */
  onCurrentPageChange?(id: string | null): void;
  /**
   * Imperative scroll request; a new nonce scrolls again. `rect` (slot CSS
   * px at zoom 1) is centred in the viewport instead of showing the page
   * top; `focus` moves focus to the page slot afterwards.
   */
  scrollToPage?: ScrollRequest;
  /** CSS px between and around pages. Default 16. */
  gap?: number;
  /** The scale the zoom setting resolved to (fit modes depend on the viewport size). */
  onScaleChange?(scale: number): void;
}

export interface ScrollRequest {
  id: string;
  nonce: number;
  rect?: { left: number; top: number; width: number; height: number };
  focus?: boolean;
}

/** Used until the viewport is measured (and where there is no layout). */
const FALLBACK = { width: 0, height: 800 };

/**
 * The scrolling document: virtualised page slots (each a labelled region),
 * zoom by setting, Ctrl/Cmd+wheel or pinch around the pointer, Space+drag
 * panning, and a polite live region announcing the zoom.
 */
export function DocumentViewport({
  label,
  pages,
  zoom,
  onZoomChange,
  renderPage,
  onVisiblePagesChange,
  onCurrentPageChange,
  scrollToPage,
  gap = 16,
  onScaleChange,
}: DocumentViewportProps) {
  const box = useScrollBox<HTMLDivElement>();
  const { ref, measure, scrollTop } = box;
  const viewH = box.height || FALLBACK.height;
  const scale = zoomScale(zoom, pages, box.width, box.height, gap);
  const percent = Math.round(scale * 100);

  const sizes = pages.map((p) => p.height * scale);
  const offsets = cumulativeOffsets(sizes, gap);
  const total = sizes.length
    ? offsets[offsets.length - 1] + sizes[sizes.length - 1]
    : 0;
  const maxW = Math.max(0, ...pages.map((p) => p.width * scale));
  const contentW = maxW + 2 * gap;
  const contentH = total + 2 * gap;
  const top = scrollTop - gap;
  const shown = visibleRange(offsets, sizes, top, viewH, 0);
  const near = visibleRange(offsets, sizes, top - viewH, viewH * 3, 0);

  // Zoom around the pointer: keep the content under it in place.
  const anchor = React.useRef<{ at: ZoomAnchor; from: number } | null>(null);
  const gestures = useViewportGestures(ref, percent, (next, at) => {
    anchor.current = at ? { at, from: scale } : null;
    onZoomChange({ kind: 'percent', value: next });
  });
  React.useLayoutEffect(() => {
    const a = anchor.current;
    const el = ref.current;
    if (!a || !el || a.from === scale) return;
    anchor.current = null;
    const k = scale / a.from;
    el.scrollLeft = (el.scrollLeft + a.at.x) * k - a.at.x;
    el.scrollTop = (el.scrollTop + a.at.y) * k - a.at.y;
    measure();
  }, [scale, ref, measure]);

  const scaleCb = React.useRef(onScaleChange);
  React.useLayoutEffect(() => {
    scaleCb.current = onScaleChange;
  });
  React.useEffect(() => {
    scaleCb.current?.(scale);
  }, [scale]);

  // Announce zoom changes (not the first value).
  const [announced, setAnnounced] = React.useState({ percent, text: '' });
  if (announced.percent !== percent)
    setAnnounced({ percent, text: `Zoom ${percent} percent` });

  const visibleKey = pages
    .slice(shown.start, shown.end)
    .map((p) => p.id)
    .join(' ');
  const visibleCb = React.useRef(onVisiblePagesChange);
  React.useLayoutEffect(() => {
    visibleCb.current = onVisiblePagesChange;
  });
  React.useEffect(() => {
    visibleCb.current?.(visibleKey ? visibleKey.split(' ') : []);
  }, [visibleKey]);

  let currentId: string | null = null;
  let most = -1;
  for (let i = shown.start; i < shown.end; i++) {
    const area =
      Math.min(offsets[i] + sizes[i], top + viewH) - Math.max(offsets[i], top);
    if (area > most) {
      most = area;
      currentId = pages[i].id;
    }
  }
  const currentCb = React.useRef(onCurrentPageChange);
  React.useLayoutEffect(() => {
    currentCb.current = onCurrentPageChange;
  });
  React.useEffect(() => {
    currentCb.current?.(currentId);
  }, [currentId]);

  const scrollIndex = scrollToPage
    ? pages.findIndex((p) => p.id === scrollToPage.id)
    : -1;
  const rect = scrollToPage?.rect;
  const scrollTarget =
    scrollIndex < 0
      ? null
      : rect
        ? Math.max(
            0,
            gap +
              offsets[scrollIndex] +
              rect.top * scale -
              (viewH - rect.height * scale) / 2,
          )
        : offsets[scrollIndex];
  const scrollLeftTarget =
    scrollIndex >= 0 && rect
      ? Math.max(
          0,
          (contentW - pages[scrollIndex].width * scale) / 2 +
            rect.left * scale -
            ((box.width || 0) - rect.width * scale) / 2,
        )
      : null;
  const focusSlot = !!scrollToPage?.focus;
  const targetId = scrollIndex >= 0 ? pages[scrollIndex].id : null;
  // Only a new request (nonce) scrolls; zoom changes keep the position.
  const lastNonce = React.useRef<number | null>(null);
  const pendingFocus = React.useRef<string | null>(null);
  const nonce = scrollToPage?.nonce ?? null;
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || scrollTarget === null || nonce === lastNonce.current) return;
    lastNonce.current = nonce;
    el.scrollTop = scrollTarget;
    if (scrollLeftTarget !== null) el.scrollLeft = scrollLeftTarget;
    measure();
    pendingFocus.current = focusSlot ? targetId : null;
  }, [
    nonce,
    scrollTarget,
    scrollLeftTarget,
    focusSlot,
    targetId,
    ref,
    measure,
  ]);
  // Focus waits for the slot to mount (it may be far from the old position).
  React.useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const slot = ref.current?.querySelector<HTMLElement>(
      `[data-page-id="${CSS.escape(id)}"]`,
    );
    if (!slot) return;
    pendingFocus.current = null;
    slot.focus({ preventScroll: true });
  });

  return (
    <>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        {...gestures.handlers}
        className={cn(
          'relative h-full w-full touch-pan-x touch-pan-y overflow-auto bg-backdrop outline-none',
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus',
          gestures.panning && 'cursor-grab select-none',
        )}
      >
        <Sized width={contentW} height={contentH} className="relative mx-auto">
          {pages.slice(near.start, near.end).map((page, k) => {
            const i = near.start + k;
            const w = page.width * scale;
            const x = (contentW - w) / 2;
            const y = gap + offsets[i];
            const left = Math.max(0, box.scrollLeft - x);
            const top = Math.max(0, scrollTop - y);
            const right = Math.min(w, box.scrollLeft + (box.width || w) - x);
            const bottom = Math.min(sizes[i], scrollTop + viewH - y);
            const visibleRect =
              right > left && bottom > top
                ? { left, top, width: right - left, height: bottom - top }
                : null;
            return (
              <Positioned
                key={page.id}
                x={x}
                y={y}
                width={w}
                height={sizes[i]}
                role="region"
                aria-label={`Page ${i + 1} of ${pages.length}`}
                data-testid={`page-slot-${i + 1}`}
                data-page-id={page.id}
                // Focusable by navigation (goToPage), not in the Tab order.
                tabIndex={-1}
                className="overflow-hidden bg-surface shadow-page outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {renderPage({
                  id: page.id,
                  index: i,
                  scale,
                  visible: i >= shown.start && i < shown.end,
                  visibleRect,
                })}
              </Positioned>
            );
          })}
        </Sized>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announced.text}
      </p>
    </>
  );
}
DocumentViewport.displayName = 'DocumentViewport';
