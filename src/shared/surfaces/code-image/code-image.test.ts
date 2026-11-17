// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { tokenize } from '@/shared/lib/syntax/tokenize';
import {
  AUTO_MAX_WIDTH,
  AUTO_MIN_WIDTH,
  layoutCodeImage,
  lineRuns,
  type CodeImageOptions,
} from './layout';
import { paintCodeImage, type PaintContext } from './paint';
import { checkSize } from './render';
import { gradientLine, MONO_STACK, type CodeImageStyle } from './style';
import { codeImageSvg, xml } from './svg';

/** Every character is 10 px wide. */
const mono = (s: string) => Array.from(s).length * 10;

const OPTS: CodeImageOptions = {
  fontSize: 16,
  lineHeight: 1.5,
  padding: 32,
  chrome: true,
  title: 'app.js',
  lineNumbers: true,
  highlight: new Set([2]),
  width: 'auto',
  overflow: 'wrap',
};

const STYLE: CodeImageStyle = {
  palette: {
    background: '#101010',
    foreground: '#eeeeee',
    border: '#333333',
    gutter: '#666666',
    gutterActive: '#aaaaaa',
    highlight: '#222222',
    chrome: '#151515',
    title: '#999999',
    dots: ['#f00', '#ff0', '#0f0'],
    shadow: 'rgba(0,0,0,0.5)',
    tokens: { keyword: '#ff00ff', string: '#00ff00' },
  },
  backdrop: { kind: 'gradient', angle: 135, stops: ['#000', '#fff'] },
  fontFamily: MONO_STACK,
};

const layoutOf = (code: string, opts: Partial<CodeImageOptions> = {}) => {
  const lines = code.split('\n');
  return layoutCodeImage(
    lines,
    tokenize('js', code),
    { ...OPTS, ...opts },
    mono,
  );
};

describe('lineRuns', () => {
  it('covers every character, plain between tokens', () => {
    const runs = lineRuns(
      'const a = "x";',
      tokenize('js', 'const a = "x";')[0],
    );
    expect(runs.map((r) => r.text).join('')).toBe('const a = "x";');
    expect(runs[0]).toEqual({ text: 'const', kind: 'keyword' });
    expect(runs.find((r) => r.text === '"x"')?.kind).toBe('string');
  });

  it('ignores overlapping and out-of-range tokens', () => {
    const runs = lineRuns('abcdef', [
      { start: 0, end: 4, kind: 'keyword' },
      { start: 2, end: 5, kind: 'string' },
      { start: 5, end: 99, kind: 'number' },
    ]);
    expect(runs).toEqual([
      { text: 'abcd', kind: 'keyword' },
      { text: 'e', kind: 'string' },
      { text: 'f', kind: 'number' },
    ]);
  });
});

describe('layoutCodeImage', () => {
  it('fits the longest line with auto width, within the limits', () => {
    const l = layoutOf('let x = 1;\nreturn x;');
    // 2 x padding + 2 x inset (24) + gutter (10 + 24) + 10 chars.
    expect(l.width).toBe(Math.max(AUTO_MIN_WIDTH, 64 + 48 + 34 + 100));
    const wide = layoutOf('x'.repeat(1000));
    expect(wide.width).toBe(AUTO_MAX_WIDTH);
  });

  it('places rows one line height apart below the title bar', () => {
    const l = layoutOf('a\nb\nc');
    expect(l.rowHeight).toBe(24);
    expect(l.rows.map((r) => r.lineNo)).toEqual([1, 2, 3]);
    expect(l.rows[1].y - l.rows[0].y).toBe(24);
    expect(l.rows[0].y).toBeGreaterThan(
      l.window.y + (l.chrome?.height ?? 0) - 1,
    );
    expect(l.rows.map((r) => r.highlighted)).toEqual([false, true, false]);
    expect(l.height).toBe(l.code.y + 3 * 24 + 24 + 32);
  });

  it('wraps long lines at a space onto continuation rows', () => {
    const l = layoutOf('aaaa bbbb cccc', { width: 64 + 48 + 34 + 100 });
    expect(l.code.width).toBe(100);
    expect(l.rows.map((r) => r.runs.map((x) => x.text).join(''))).toEqual([
      'aaaa bbbb ',
      'cccc',
    ]);
    expect(l.rows.map((r) => r.lineNo)).toEqual([1, null]);
  });

  it('hangs wrapped rows under the line indentation', () => {
    const l = layoutOf('  aaaa bbbb cccc', { width: 64 + 48 + 34 + 100 });
    expect(l.rows.map((r) => r.runs.map((x) => x.text).join(''))).toEqual([
      '  aaaa ',
      'bbbb ',
      'cccc',
    ]);
    // 'bbbb cccc' (90 px) would fit 100 px but not the 80 px left of it.
    expect(l.rows[1].runs[0].x).toBe(l.code.x + 20);
    expect(l.rows[2].runs[0].x).toBe(l.code.x + 20);
  });

  it('wraps a word longer than the row at the edge', () => {
    const l = layoutOf('abcdefghijklmnop', { width: 64 + 48 + 34 + 100 });
    expect(l.rows.map((r) => r.runs.map((x) => x.text).join(''))).toEqual([
      'abcdefghij',
      'klmnop',
    ]);
  });

  it('clips instead of wrapping when asked', () => {
    const l = layoutOf('aaaa bbbb cccc', {
      width: 64 + 48 + 34 + 100,
      overflow: 'clip',
    });
    expect(l.rows).toHaveLength(1);
    expect(l.rows[0].runs.map((r) => r.text).join('')).toBe('aaaa bbbb cccc');
  });

  it('a highlighted wrapped line highlights all its rows', () => {
    const l = layoutOf('a\nbbbb bbbb bbbb', {
      width: 64 + 48 + 34 + 100,
    });
    expect(l.rows.map((r) => [r.lineNo, r.highlighted])).toEqual([
      [1, false],
      [2, true],
      [null, true],
    ]);
  });

  it('without chrome or line numbers', () => {
    const l = layoutOf('x', { chrome: false, lineNumbers: false, padding: 0 });
    expect(l.chrome).toBeNull();
    expect(l.gutterRight).toBeNull();
    expect(l.window.x).toBe(0);
    expect(l.code.x).toBe(24);
  });

  it('places three dots and a centred title in the bar', () => {
    const l = layoutOf('x');
    expect(l.chrome?.dots).toHaveLength(3);
    expect(l.chrome?.title?.x).toBe(l.width / 2);
    expect(l.chrome?.title?.text).toBe('app.js');
    expect(layoutOf('x', { title: '' }).chrome?.title).toBeNull();
  });

  it('an empty document still has one row', () => {
    const l = layoutCodeImage([''], [[]], OPTS, mono);
    expect(l.rows).toHaveLength(1);
    expect(l.rows[0].runs).toEqual([]);
  });
});

describe('gradientLine', () => {
  it('runs bottom to top at 0 degrees and left to right at 90', () => {
    expect(gradientLine(100, 50, 0)).toEqual({
      x1: 50,
      y1: 50,
      x2: 50,
      y2: 0,
    });
    const r = gradientLine(100, 50, 90);
    expect(r.x1).toBeCloseTo(0);
    expect(r.x2).toBeCloseTo(100);
    expect(r.y1).toBeCloseTo(25);
  });
});

describe('codeImageSvg', () => {
  it('writes text as real text elements, escaped', () => {
    const l = layoutOf('if (a < b) { "&" }');
    const svg = codeImageSvg(l, STYLE);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
      true,
    );
    expect(svg).toContain('&lt;');
    expect(svg).toContain('&quot;&amp;&quot;');
    expect(svg).toContain('xml:space="preserve"');
    expect(svg).toContain('<tspan x="');
    expect(svg).toContain('fill="#ff00ff">if</tspan>');
    expect(svg).toContain('<linearGradient id="bg"');
    expect(svg).toContain('>app.js</text>');
    expect(svg).toContain('text-anchor="end"');
    expect(svg).not.toContain('<script');
  });

  it('parses as XML', () => {
    const svg = codeImageSvg(layoutOf('a < b && c > "d"\n\tx'), STYLE);
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.getElementsByTagName('text').length).toBeGreaterThan(2);
  });

  it('a transparent backdrop draws no background rect', () => {
    const svg = codeImageSvg(layoutOf('x'), {
      ...STYLE,
      backdrop: { kind: 'transparent' },
    });
    expect(svg).not.toContain('url(#bg)');
    expect(xml('<"&>')).toBe('&lt;&quot;&amp;&gt;');
  });
});

describe('paintCodeImage', () => {
  it('draws the backdrop, window, numbers and coloured runs', () => {
    const calls: string[] = [];
    const fillText = vi.fn((text: string) => calls.push(text));
    const g = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      roundRect: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      fillRect: vi.fn(),
      fillText,
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetY: 0,
    } as unknown as PaintContext;
    paintCodeImage(g, layoutOf('const a = 1;\nb'), STYLE, 2);
    expect(g.scale).toHaveBeenCalledWith(2, 2);
    expect(g.createLinearGradient).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      'app.js',
      '1',
      '2',
      'const',
      ' a ',
      '=',
      ' ',
      '1',
      ';',
      'b',
    ]);
    expect(g.arc).toHaveBeenCalledTimes(3);
  });
});

describe('checkSize', () => {
  it('refuses images too large for a canvas', () => {
    const l = layoutOf('x');
    expect(() => checkSize(l, 3)).not.toThrow();
    expect(() => checkSize({ ...l, height: 9000 }, 2)).toThrow(/too large/);
  });
});
