import { describe, expect, it } from 'vitest';
import { computeDiff } from './engine';
import { toHtmlReport, type ReportTokens } from './html-export';

const tokens: ReportTokens = {
  bg: 'var-bg',
  fg: 'var-fg',
  muted: 'var-muted',
  border: 'var-border',
  addBg: 'var-add',
  delBg: 'var-del',
  addStrong: 'var-add-strong',
  delStrong: 'var-del-strong',
};

describe('toHtmlReport', () => {
  const left = 'safe\n<script>alert(1)</script>';
  const right = 'safe\nfine';
  const html = toHtmlReport(
    computeDiff(left, right),
    { left, right },
    { left: 'old <a>.txt', right: 'new.txt' },
    tokens,
  );

  it('is a standalone document with both names', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('old &lt;a&gt;.txt');
    expect(html).toContain('new.txt');
    expect(html).toContain('var-add');
  });

  it('escapes the compared text', () => {
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
