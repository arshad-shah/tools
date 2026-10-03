import React from 'react';

export type ScrollAxis = 'x' | 'y';

/** Which ends of a scroller hide content, as `data-fade` tokens. */
export function fadeEnds(
  el: Pick<
    HTMLElement,
    | 'scrollLeft'
    | 'scrollTop'
    | 'scrollWidth'
    | 'scrollHeight'
    | 'clientWidth'
    | 'clientHeight'
  >,
  axis: ScrollAxis,
): string {
  // RTL scrollers report a negative scrollLeft; the distance is what counts.
  const pos = Math.abs(axis === 'x' ? el.scrollLeft : el.scrollTop);
  const size = axis === 'x' ? el.clientWidth : el.clientHeight;
  const total = axis === 'x' ? el.scrollWidth : el.scrollHeight;
  const ends: string[] = [];
  if (pos > 1) ends.push('start');
  if (pos + size < total - 1) ends.push('end');
  return ends.join(' ');
}

/** The item a bar should keep visible: focused first, else the active one. */
const ACTIVE =
  '[aria-pressed="true"], [aria-selected="true"], [aria-checked="true"]';

/**
 * Scrolls `row` itself just enough to show `item`. Not scrollIntoView: that
 * also scrolls every ancestor, so a bar low on the page dragged the window
 * down to it on mount.
 */
function reveal(row: HTMLElement, item: Element, axis: ScrollAxis) {
  const r = row.getBoundingClientRect();
  const i = item.getBoundingClientRect();
  const [start, end, itemStart, itemEnd] =
    axis === 'x'
      ? [r.left, r.right, i.left, i.right]
      : [r.top, r.bottom, i.top, i.bottom];
  const delta =
    itemStart < start ? itemStart - start : itemEnd > end ? itemEnd - end : 0;
  if (!delta) return;
  if (axis === 'x') row.scrollLeft += delta;
  else row.scrollTop += delta;
}

/**
 * A one-row (or one-column) scroller for bars of controls: the element
 * gets `data-fade="start end"` while content hides past either end (the
 * `scroll-fade-x`/`-y` utilities turn that into edge masks), and the
 * focused or active item is scrolled into view. Attributes are written
 * directly, so scrolling never re-renders the bar.
 */
export function useScrollRow<T extends HTMLElement>(axis: ScrollAxis = 'x') {
  const ref = React.useRef<T>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const ends = fadeEnds(el, axis);
      if (ends) el.dataset.fade = ends;
      else delete el.dataset.fade;
    };
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target !== el)
        reveal(el, e.target, axis);
    };
    update();
    const active = el.querySelector(ACTIVE);
    if (active) reveal(el, active, axis);
    el.addEventListener('scroll', update, { passive: true });
    el.addEventListener('focusin', onFocus);
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    for (const child of Array.from(el.children)) ro?.observe(child);
    return () => {
      el.removeEventListener('scroll', update);
      el.removeEventListener('focusin', onFocus);
      ro?.disconnect();
    };
  }, [axis]);

  return ref;
}

/**
 * The edge fade of useScrollRow for a row whose items arrive later (a
 * portal target such as the tool header's actions): it also watches for
 * added and removed children.
 */
export function useScrollFade(el: HTMLElement | null, axis: ScrollAxis = 'x') {
  React.useLayoutEffect(() => {
    if (!el) return;
    const update = () => {
      const ends = fadeEnds(el, axis);
      if (ends) el.dataset.fade = ends;
      else delete el.dataset.fade;
    };
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    const observeChildren = () => {
      ro?.disconnect();
      ro?.observe(el);
      for (const child of Array.from(el.children)) ro?.observe(child);
      update();
    };
    const mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(observeChildren)
        : null;
    mo?.observe(el, { childList: true });
    observeChildren();
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [el, axis]);
}
