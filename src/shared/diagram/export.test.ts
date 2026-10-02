/**
 * Ported from arshad-shah/verql tests/unit/er/erd-svg.test.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toPng, toSvg } from './export';
import { layout } from './layout';
import { buildCards, createMeasure } from './metrics';
import type { Diagram } from './model';
import { route } from './route';
import { recordingContext } from './test-canvas';
import { rec, testTheme } from './test-fixtures';

const theme = testTheme();
const measure = createMeasure();

const DIAGRAM: Diagram = {
  nodes: [
    {
      id: 'a',
      eyebrow: 'object',
      title: 'a & <b>',
      rows: [
        { key: 'q"uote', value: '1 < 2 & "x"', kind: 'string' },
        { key: 'child', value: '1', kind: 'object', role: 'link' },
      ],
    },
    rec('b', 1),
    rec('c', 1),
  ],
  edges: [
    { id: 'solid', from: 'b', to: 'a', toRow: 1 },
    { id: 'dash', from: 'c', to: 'a', style: 'dashed' },
  ],
};

function model(d: Diagram = DIAGRAM) {
  const cards = buildCards(d.nodes, theme, measure);
  layout(cards, d.edges);
  return { cards, routes: route(cards, d.edges) };
}

describe('toSvg', () => {
  const { cards, routes } = model();
  const svg = toSvg(cards, routes, theme, 32, measure);

  it('is a single well-formed SVG document', () => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.nodeName).toBe('svg');
    expect(doc.querySelectorAll('svg')).toHaveLength(1);
    expect(doc.querySelectorAll('g > g')).toHaveLength(3);
  });

  it('escapes markup-significant characters in keys and values', () => {
    expect(svg).toContain('a &amp; &lt;b&gt;');
    expect(svg).toContain('q&quot;uote');
    expect(svg).toContain('1 &lt; 2 &amp; &quot;x&quot;');
    expect(svg).not.toContain('a & <b>');
    expect(svg).toContain('>{1}<');
  });

  it('dashes dashed edges only', () => {
    const paths = svg.match(/<path[^>]*fill="none"[^>]*>/g) ?? [];
    expect(paths).toHaveLength(2);
    expect(paths.filter((p) => p.includes('stroke-dasharray'))).toHaveLength(1);
  });

  it('uses the theme font family', () => {
    expect(svg).toContain('font-family="monospace"');
  });
});

describe('toPng', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubCanvas() {
    const made: { w: number; h: number }[] = [];
    class FakeCanvas {
      constructor(
        readonly width: number,
        readonly height: number,
      ) {
        made.push({ w: width, h: height });
      }
      getContext() {
        return recordingContext();
      }
      convertToBlob() {
        return Promise.resolve(new Blob(['png'], { type: 'image/png' }));
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeCanvas);
    return made;
  }

  it('renders at the requested scale', async () => {
    const made = stubCanvas();
    const m = model();
    const { blob, scaleUsed } = await toPng(m, theme, { measure });
    expect(blob.type).toBe('image/png');
    expect(scaleUsed).toBe(2);
    expect(made[0].w).toBeGreaterThan(0);
  });

  it('reduces the scale for a huge model', async () => {
    const made = stubCanvas();
    const m = model();
    m.cards[2].x = 9000;
    m.cards[2].y = 9000;
    const { scaleUsed } = await toPng(m, theme, { measure });
    expect(scaleUsed).toBeLessThan(2);
    expect(made[0].w * made[0].h).toBeLessThanOrEqual(64e6);
  });

  it('fails with a ToolError where OffscreenCanvas is missing', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    await expect(toPng(model(), theme)).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
    });
  });
});
