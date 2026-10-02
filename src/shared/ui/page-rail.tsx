import React from 'react';
import { useSortable } from '@arshad-shah/detent-react';
import { cn } from '@/shared/lib/cn';
import { Badge } from './badge';
import { Sized } from './positioned';
import { useScrollBox } from './use-scroll-box';
import { cumulativeOffsets, visibleRange } from './virtual';

export interface RailPage {
  id: string;
  label: string;
  /** width / height of the page as shown. */
  aspect: number;
  badges?: { tone: 'accent' | 'danger' | 'warning' | 'info'; label: string }[];
}

export interface PageRailProps {
  /** e.g. "Pages". */
  label: string;
  pages: RailPage[];
  selected: ReadonlySet<string>;
  current: string | null;
  onSelect(id: string, mods: { shift: boolean; meta: boolean }): void;
  /** Enter / double click: scroll the canvas to it. */
  onActivate(id: string): void;
  /** Drag (detent useSortable, keyboard false) or Alt+ArrowUp/Down. */
  onMove?(ids: string[], to: number): void;
  /** Delete / Backspace. */
  onDelete?(ids: string[]): void;
  /** e.g. PageThumb at priority 1. */
  renderThumb(page: RailPage, width: number): React.ReactNode;
  /** A mode's status over the bottom-left of the thumbnail (e.g. fields left). */
  renderBadge?(page: RailPage): React.ReactNode;
  /** CSS px, 120..260. */
  width: number;
}

const ITEM = '[data-rail-item]';
const PAD = 8;
const GAP = 8;
const CAPTION = 28;
const OVERSCAN = 3;
/** Used until the list is measured (and in environments without layout). */
const FALLBACK_HEIGHT = 800;

const BADGE_TONE = {
  accent: 'accent',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
} as const;

/**
 * detent moves the dragged node in the DOM; React must stay the owner of
 * DOM order, so the node goes back before state changes.
 */
function restoreDomOrder(
  container: HTMLElement,
  item: HTMLElement,
  from: number,
) {
  const siblings = Array.from(
    container.querySelectorAll<HTMLElement>(`:scope > ${ITEM}`),
  ).filter((el) => el !== item);
  const anchor =
    siblings[from] ?? siblings[siblings.length - 1]?.nextSibling ?? null;
  container.insertBefore(item, anchor);
}

/**
 * Virtualised page thumbnails as a multi-select listbox. Keyboard (R13):
 * arrows, Home and End move and select (Shift extends, Ctrl/Cmd only moves
 * focus), Space toggles, Enter activates, Delete removes, Alt+ArrowUp/Down
 * moves the page and announces it in the rail's own live region.
 */
export function PageRail({
  label,
  pages,
  selected,
  current,
  onSelect,
  onActivate,
  renderBadge,
  onMove,
  onDelete,
  renderThumb,
  width,
}: PageRailProps) {
  const { ref: scrollRef, scrollTop, height } = useScrollBox<HTMLDivElement>();
  const nodes = React.useRef(new Map<string, HTMLElement>());
  const pendingFocus = React.useRef<string | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState('');

  const thumbW = Math.max(40, width - 32);
  const sizes = pages.map((p) => thumbW / (p.aspect || 1) + CAPTION + 12);
  const offsets = cumulativeOffsets(sizes, GAP);
  const total = sizes.length
    ? offsets[offsets.length - 1] + sizes[sizes.length - 1]
    : 0;
  const { start, end } = visibleRange(
    offsets,
    sizes,
    Math.max(0, scrollTop - PAD),
    height || FALLBACK_HEIGHT,
    OVERSCAN,
  );
  // Spacers stand in for the pages outside the window (gaps included).
  const before = start < pages.length ? offsets[start] : total;
  const after =
    total - (end > start ? offsets[end - 1] + sizes[end - 1] : before);

  const remembered = pages.some((p) => p.id === focusId)
    ? focusId
    : pages.some((p) => p.id === current)
      ? current
      : (pages[0]?.id ?? null);
  // The tab stop must be rendered: when the remembered page is outside the
  // virtual window, the first rendered page takes it.
  const rendered = pages.slice(start, end);
  const roving = rendered.some((p) => p.id === remembered)
    ? remembered
    : (rendered[0]?.id ?? null);

  // Focus the requested page once it is rendered (after a move or a jump).
  React.useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const node = nodes.current.get(id);
    if (!node) return;
    pendingFocus.current = null;
    node.focus({ preventScroll: true });
  });

  const focusIndex = (i: number) => {
    const id = pages[i].id;
    setFocusId(id);
    pendingFocus.current = id;
    const el = scrollRef.current;
    if (!el) return;
    const top = offsets[i] + PAD;
    const bottom = top + sizes[i];
    const view = height || FALLBACK_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top - PAD;
    else if (bottom > el.scrollTop + view) el.scrollTop = bottom - view + PAD;
  };

  // Opening (a phone drawer mounts the rail): the current page in view.
  const revealed = React.useRef(false);
  React.useLayoutEffect(() => {
    if (revealed.current) return;
    const el = scrollRef.current;
    const i = pages.findIndex((p) => p.id === current);
    if (!el || i < 0 || !sizes.length) return;
    revealed.current = true;
    const view = el.clientHeight || FALLBACK_HEIGHT;
    const top = offsets[i] + PAD;
    if (top < el.scrollTop || top + sizes[i] > el.scrollTop + view)
      el.scrollTop = Math.max(0, top - (view - sizes[i]) / 2);
  }, [current, pages, offsets, sizes, scrollRef]);

  // A touch tap goes to the page (a phone has no double click).
  const pointerType = React.useRef('mouse');

  const sortRef = useSortable({
    items: ITEM,
    direction: 'y',
    animation: 150,
    keyboard: false,
    // Swipes scroll the rail; a touch drag starts after a short press.
    touchAction: 'manipulation',
    disabled: !onMove,
    onSort: ({ item, from, to }) => {
      restoreDomOrder(from.container, item, from.index);
      const id = item.dataset.railItem;
      if (id) onMove?.([id], start + to.index);
    },
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>, i: number) => {
    if (e.target !== e.currentTarget) return;
    const page = pages[i];
    const vertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
    if (e.altKey && vertical) {
      e.preventDefault();
      if (!onMove) return;
      const to = Math.min(
        pages.length - 1,
        Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)),
      );
      if (to === i) return;
      setFocusId(page.id);
      pendingFocus.current = page.id;
      setAnnouncement(`Moved page ${i + 1} to position ${to + 1}`);
      onMove([page.id], to);
      return;
    }
    let to: number | null = null;
    if (e.key === 'ArrowDown') to = Math.min(pages.length - 1, i + 1);
    else if (e.key === 'ArrowUp') to = Math.max(0, i - 1);
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = pages.length - 1;
    if (to !== null) {
      e.preventDefault();
      focusIndex(to);
      if (!e.ctrlKey && !e.metaKey)
        onSelect(pages[to].id, { shift: e.shiftKey, meta: false });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onActivate(page.id);
    } else if (e.key === ' ') {
      e.preventDefault();
      onSelect(page.id, { shift: e.shiftKey, meta: true });
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
      e.preventDefault();
      onDelete(
        selected.has(page.id)
          ? pages.filter((p) => selected.has(p.id)).map((p) => p.id)
          : [page.id],
      );
    }
  };

  // Over the thumbnail, not after it (the box clips what follows: P5-F).
  const badge = (page: RailPage) => {
    const node = renderBadge?.(page);
    if (node === null || node === undefined || node === false) return null;
    return (
      <div
        data-rail-badge=""
        className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] rounded-sm bg-surface/90 px-1 py-0.5 shadow-e1 empty:hidden"
      >
        {node}
      </div>
    );
  };

  return (
    <>
      <div
        ref={scrollRef}
        role="listbox"
        aria-label={label}
        aria-multiselectable="true"
        aria-orientation="vertical"
        className="h-full overflow-y-auto overscroll-contain px-4 py-2 outline-none"
      >
        <Sized height={before} aria-hidden />
        <div ref={sortRef} className="flex flex-col gap-2">
          {rendered.map((page, k) => {
            const i = start + k;
            const isSelected = selected.has(page.id);
            const badges = page.badges ?? [];
            const name = [
              `Page ${i + 1} of ${pages.length}`,
              ...badges.map((b) => b.label),
            ].join(', ');
            return (
              <Sized
                key={page.id}
                ref={(el: HTMLDivElement | null) => {
                  if (el) nodes.current.set(page.id, el);
                  else nodes.current.delete(page.id);
                }}
                height={sizes[i]}
                role="option"
                aria-label={name}
                aria-selected={isSelected}
                aria-current={page.id === current ? 'page' : undefined}
                aria-setsize={pages.length}
                aria-posinset={i + 1}
                data-rail-item={page.id}
                tabIndex={page.id === roving ? 0 : -1}
                onFocus={() => setFocusId(page.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                onPointerDown={(e) => {
                  pointerType.current = e.pointerType;
                }}
                onClick={(e) => {
                  onSelect(page.id, {
                    shift: e.shiftKey,
                    meta: e.metaKey || e.ctrlKey,
                  });
                  if (pointerType.current === 'touch') onActivate(page.id);
                }}
                onDoubleClick={() => onActivate(page.id)}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 outline-none transition-colors duration-fast',
                  'focus-visible:ring-2 focus-visible:ring-focus',
                  isSelected ? 'bg-accent-soft' : 'hover:bg-surface-2',
                )}
              >
                <Sized
                  width={thumbW}
                  height={thumbW / (page.aspect || 1)}
                  className={cn(
                    'relative overflow-hidden rounded-sm bg-surface shadow-page',
                    page.id === current && 'ring-2 ring-accent-indicator',
                  )}
                >
                  {renderThumb(page, thumbW)}
                  {badge(page)}
                </Sized>
                <div className="flex h-5 items-center gap-1" aria-hidden>
                  <span className="font-mono text-xs text-fg-muted">
                    {page.label}
                  </span>
                  {badges.map((b) => (
                    <Badge
                      key={b.label}
                      variant="soft"
                      tone={BADGE_TONE[b.tone]}
                    >
                      {b.label}
                    </Badge>
                  ))}
                </div>
              </Sized>
            );
          })}
        </div>
        <Sized height={after} aria-hidden />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
PageRail.displayName = 'PageRail';
