/**
 * Tokens alias Cynosure's roles, which are light-dark() pairs and
 * color-mix() values: a custom property holds them unresolved. Painting the
 * value as the colour of a hidden probe inside `el`, for one synchronous
 * read, gives the concrete colour for `el`'s current colour scheme. Plain
 * values pass through.
 *
 * The probe, not `el` itself, carries the colour: `color` is inherited, so
 * setting it on `el` (often `<html>`) restyles `el`'s whole subtree on every
 * read, which made a page with many readers take seconds to render.
 */
export function resolveColour(el: HTMLElement, value: string): string {
  if (!/light-dark\(|color-mix\(|var\(/.test(value)) return value;
  const probe = el.ownerDocument.createElement('span');
  probe.hidden = true;
  probe.style.setProperty('color', value);
  el.appendChild(probe);
  try {
    return getComputedStyle(probe).color || value;
  } finally {
    probe.remove();
  }
}
