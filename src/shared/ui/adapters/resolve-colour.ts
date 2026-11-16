/**
 * Tokens alias Cynosure's roles, which are light-dark() pairs and
 * color-mix() values: a custom property holds them unresolved. Painting the
 * value as `el`'s colour for one synchronous read gives the concrete colour
 * for `el`'s current colour scheme. Plain values pass through.
 */
export function resolveColour(el: HTMLElement, value: string): string {
  if (!/light-dark\(|color-mix\(|var\(/.test(value)) return value;
  const before = el.style.getPropertyValue('color');
  const priority = el.style.getPropertyPriority('color');
  el.style.setProperty('color', value);
  const out = getComputedStyle(el).color;
  if (before) el.style.setProperty('color', before, priority);
  else el.style.removeProperty('color');
  return out || value;
}
