/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverlayText } from './overlay-text';

const T = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 792 };

describe('OverlayText', () => {
  it('draws one text element per line with the writer baseline', () => {
    const { container } = render(
      <OverlayText
        transform={T}
        box={{ x: 100, y: 600, width: 200, height: 100 }}
        lines={['one', 'two']}
        text="one two"
        family="helvetica"
        size={10}
        color="#112233"
        align="right"
        metrics={{ ascent: 1, height: 1 }}
        width={612}
        height={792}
      />,
    );
    const texts = container.querySelectorAll('text');
    expect([...texts].map((t) => t.textContent)).toEqual(['one', 'two']);
    // lineH 12, glyph 10, ascent 10: first baseline 700 - 1 - 10 = 689.
    expect(texts[0].getAttribute('transform')).toBe('matrix(1 0 0 -1 300 689)');
    expect(texts[1].getAttribute('transform')).toBe('matrix(1 0 0 -1 300 677)');
    const g = container.querySelector('g')!;
    expect(g.getAttribute('text-anchor')).toBe('end');
    expect(g.getAttribute('fill')).toBe('#112233');
  });

  it('refuses a colour that is not hex', () => {
    expect(() =>
      render(
        <OverlayText
          transform={T}
          box={{ x: 0, y: 0, width: 1, height: 1 }}
          text="x"
          family="noto"
          size={10}
          color="red"
          align="left"
          width={1}
          height={1}
        />,
      ),
    ).toThrow();
  });
});
