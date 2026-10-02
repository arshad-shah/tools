/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  it('scrolls the active item and every focused item into view', () => {
    const seen: string[] = [];
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      seen.push(this.textContent ?? '');
    };
    const { getByText } = render(<Row />);
    expect(seen).toEqual(['b']);
    getByText('a').focus();
    expect(seen).toEqual(['b', 'a']);
  });
});
