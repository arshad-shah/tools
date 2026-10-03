/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fadeEnds, useScrollRow } from './use-scroll-row';

const box = (scrollLeft: number, clientWidth = 100, scrollWidth = 300) => ({
  scrollLeft,
  scrollTop: 0,
  clientWidth,
  scrollWidth,
  clientHeight: 40,
  scrollHeight: 40,
});

describe('fadeEnds', () => {
  it('fades only the end at the start of the row', () => {
    expect(fadeEnds(box(0), 'x')).toBe('end');
  });
  it('fades both ends in the middle', () => {
    expect(fadeEnds(box(100), 'x')).toBe('start end');
  });
  it('fades only the start at the end of the row', () => {
    expect(fadeEnds(box(200), 'x')).toBe('start');
  });
  it('fades nothing when everything fits', () => {
    expect(fadeEnds(box(0, 300, 300), 'x')).toBe('');
  });
  it('reads RTL scroll positions (negative scrollLeft)', () => {
    expect(fadeEnds(box(-200), 'x')).toBe('start');
  });
  it('works on the vertical axis', () => {
    expect(
      fadeEnds(
        {
          scrollLeft: 0,
          scrollTop: 10,
          clientWidth: 40,
          scrollWidth: 40,
          clientHeight: 100,
          scrollHeight: 400,
        },
        'y',
      ),
    ).toBe('start end');
  });
});

function Row() {
  const ref = useScrollRow<HTMLDivElement>('x');
  return (
    <div ref={ref} data-testid="row">
      <button type="button">a</button>
      <button type="button" aria-pressed="true">
        b
      </button>
    </div>
  );
}

describe('useScrollRow', () => {
  const rects: Record<string, [number, number]> = {
    row: [0, 100],
    a: [-50, -10],
    b: [150, 200],
  };
  const proto = HTMLElement.prototype;
  const saved = {
    rect: proto.getBoundingClientRect,
    intoView: proto.scrollIntoView,
    scrollLeft: Object.getOwnPropertyDescriptor(
      Element.prototype,
      'scrollLeft',
    ),
  };
  const scrolled = new WeakMap<Element, number>();

  beforeEach(() => {
    proto.getBoundingClientRect = function (this: HTMLElement) {
      const key = this.dataset.testid ?? this.textContent ?? '';
      const [left, right] = rects[key] ?? [0, 0];
      const shift = this.dataset.testid
        ? 0
        : -(scrolled.get(this.parentElement!) ?? 0);
      return {
        left: left + shift,
        right: right + shift,
        top: 0,
        bottom: 40,
        width: right - left,
        height: 40,
        x: left + shift,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
    Object.defineProperty(Element.prototype, 'scrollLeft', {
      configurable: true,
      get(this: Element) {
        return scrolled.get(this) ?? 0;
      },
      set(this: Element, v: number) {
        scrolled.set(this, v);
      },
    });
  });
  afterEach(() => {
    proto.getBoundingClientRect = saved.rect;
    proto.scrollIntoView = saved.intoView;
    if (saved.scrollLeft)
      Object.defineProperty(Element.prototype, 'scrollLeft', saved.scrollLeft);
  });

  it('scrolls only the row (never the page) to the active and focused items', () => {
    const intoView = vi.fn();
    proto.scrollIntoView = intoView;
    const { getByTestId, getByText } = render(<Row />);
    const row = getByTestId('row');
    // b (150..200) is past the right edge (100): the row scrolls by 100.
    expect(row.scrollLeft).toBe(100);
    // a sits at -150..-110 once scrolled: the row scrolls back to show it.
    getByText('a').focus();
    expect(row.scrollLeft).toBe(-50);
    // scrollIntoView would also scroll the window to the bar.
    expect(intoView).not.toHaveBeenCalled();
  });
});
