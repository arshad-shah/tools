/** Gap kept between a context bar and the thing it works on, px. */
export const CONTEXT_GAP = 8;

/** The first ancestor that scrolls vertically, else the page. */
function scrollParent(el: Element | null): Element | null {
  for (let n = el?.parentElement ?? null; n; n = n.parentElement) {
    const { overflowY } = getComputedStyle(n);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      n.scrollHeight > n.clientHeight
    )
      return n;
  }
  return document.scrollingElement;
}

/**
 * Scrolls `el`'s scroll parent so `rect` (viewport px) sits between `top`
 * and `bottom`. Returns the distance scrolled.
 */
export function revealRect(
  el: Element | null,
  rect: DOMRect,
  top: number,
  bottom: number,
): number {
  const delta =
    rect.bottom > bottom
      ? Math.min(rect.bottom - bottom, rect.top - top)
      : rect.top < top
        ? rect.top - top
        : 0;
  if (!delta) return 0;
  const parent = scrollParent(el);
  if (!parent) return 0;
  const before = parent.scrollTop;
  parent.scrollTop = before + delta;
  return parent.scrollTop - before;
}
