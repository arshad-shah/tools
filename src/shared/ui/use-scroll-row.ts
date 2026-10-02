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
const ACTIVE = '[aria-pressed="true"], [aria-selected="true"]';

function reveal(el: Element) {
  // jsdom and old engines have no scrollIntoView options.
  el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
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
      if (e.target instanceof Element && e.target !== el) reveal(e.target);
    };
    update();
    const active = el.querySelector(ACTIVE);
    if (active) reveal(active);
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
