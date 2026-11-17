import type { CssIssue, CssReport } from './types';

/** The browser's CSS.supports, or null where there is none (tests). */
export type Supports = ((property: string, value: string) => boolean) | null;

export const browserSupports = (): Supports =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? (p, v) => CSS.supports(p, v)
    : null;

const GLOBAL_VALUES = ['inherit', 'initial', 'unset'];

/**
 * Issues only this browser can find: properties it does not know and
 * values it rejects (the declaration would be dropped when rendering).
 * Vendor-prefixed properties for other engines are reported as info.
 */
export function browserIssues(
  report: CssReport,
  supports: Supports = browserSupports(),
): CssIssue[] {
  if (!supports) return [];
  const out: CssIssue[] = [];
  const knownProperty = new Map<string, boolean>();
  report.declarations.forEach((d, i) => {
    const p = d.property.toLowerCase();
    let known = knownProperty.get(p);
    if (known === undefined) {
      known = GLOBAL_VALUES.some((v) => supports(p, v));
      knownProperty.set(p, known);
    }
    const at = { line: d.line, column: d.column };
    if (!known) {
      const prefixed = /^-(webkit|moz|ms|o)-/.test(p);
      out.push({
        id: `b${i}`,
        severity: prefixed ? 'info' : 'error',
        rule: prefixed ? 'Prefixed property' : 'Unknown property',
        message: prefixed
          ? `${d.property} is not used by this browser (it targets another engine)`
          : `${d.property} is not a property this browser knows, so it is ignored`,
        ...at,
      });
    } else if (!supports(p, d.value)) {
      out.push({
        id: `b${i}`,
        severity: 'error',
        rule: 'Invalid value',
        message: `${d.property}: ${d.value} is not valid here, so the declaration is ignored`,
        ...at,
      });
    }
  });
  return out;
}

/** Colour keywords among the identifiers, as the browser judges them. */
export function colourKeywords(
  report: CssReport,
  supports: Supports = browserSupports(),
): { value: string; count: number }[] {
  if (!supports) return [];
  return report.colourWords.filter(({ value }) => supports('color', value));
}
