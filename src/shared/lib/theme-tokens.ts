/**
 * Live design tokens as concrete values, for surfaces that cannot resolve
 * `var(--x)` themselves (canvas painters, charts, exported files). Nothing
 * here holds a colour: every value comes from the token layer on `el`.
 */

const root = () => document.documentElement;

/**
 * Reads tokens off `el` (`<html>` by default). A bare name such as `surface`
 * resolves `--color-surface`, then `--surface` (the `@theme inline` tokens
 * are only defined under their short name); a name starting with `--` is read
 * as given. Missing tokens read as an empty string.
 */
export function readThemeTokens(
  names: string[],
  el: HTMLElement = root(),
): Record<string, string> {
  const cs = getComputedStyle(el);
  const read = (prop: string) => cs.getPropertyValue(prop).trim();
  const out: Record<string, string> = {};
  for (const name of names) {
    out[name] = name.startsWith('--')
      ? read(name)
      : read(`--color-${name}`) || read(`--${name}`);
  }
  return out;
}

/**
 * Calls `onChange` whenever the theme on `el` changes (its `data-theme`
 * attribute). Returns an unsubscribe.
 */
export function watchTheme(
  onChange: () => void,
  el: HTMLElement = root(),
): () => void {
  const obs = new MutationObserver(() => onChange());
  obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}
