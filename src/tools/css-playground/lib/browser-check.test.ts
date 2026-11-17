import { describe, expect, it } from 'vitest';
import { analyseCss } from './analyse';
import { browserIssues, colourKeywords, type Supports } from './browser-check';

const KNOWN = new Set(['color', 'width', '-webkit-box-flex']);
const supports: Supports = (p, v) =>
  KNOWN.has(p) &&
  (['inherit', 'initial', 'unset'].includes(v) ||
    (p === 'color' && ['red', 'blue'].includes(v)) ||
    (p === 'width' && /^\d+px$/.test(v)));

describe('browserIssues', () => {
  const report = analyseCss(
    '.a { colr: red; color: red; width: 10pz; -moz-thing: 1; color: blue; display: banana }',
  );

  it('flags unknown properties, invalid values and other engines', () => {
    const found = browserIssues(report, supports).map(
      (i) => `${i.rule}:${i.severity}`,
    );
    expect(found).toEqual([
      'Unknown property:error',
      'Invalid value:error',
      'Prefixed property:info',
      'Unknown property:error',
    ]);
  });

  it('does nothing without CSS.supports', () => {
    expect(browserIssues(report, null)).toEqual([]);
  });

  it('keeps only real colour keywords', () => {
    expect(
      colourKeywords(report, supports)
        .map((c) => c.value)
        .sort(),
    ).toEqual(['blue', 'red']);
  });
});
