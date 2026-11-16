/**
 * Live design tokens as concrete values, for surfaces that cannot resolve
 * `var(--x)` themselves (canvas painters, charts, exported files). Nothing
 * here holds a colour: every value comes from the token layer on `el`.
 */

import { resolveColour } from '@/shared/surfaces/resolve-colour';

const root = () => document.documentElement;

/**
 * Reads custom properties (`--cy-color-surface`) off `el` (`<html>` by
 * default) as concrete values. Missing tokens read as an empty string.
 */
export function readThemeTokens(
  names: string[],
  el: HTMLElement = root(),
): Record<string, string> {
  const cs = getComputedStyle(el);
  const read = (prop: string) =>
    resolveColour(el, cs.getPropertyValue(prop).trim());
  const out: Record<string, string> = {};
  for (const name of names) {
    out[name] = read(name);
  }
  return out;
}
