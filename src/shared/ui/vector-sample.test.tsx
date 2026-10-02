/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VectorSample } from './vector-sample';

describe('VectorSample', () => {
  it('fills the path in its frame, scaled to fit', () => {
    render(
      <VectorSample
        label="Your signature"
        d="M0 0C1 1 2 2 3 3Z"
        width={30}
        height={10}
        color="#1d4ed8"
      />,
    );
    const svg = screen.getByRole('img', { name: 'Your signature' });
    expect(svg.getAttribute('viewBox')).toBe('0 0 30 10');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    const path = svg.querySelector('path')!;
    expect(path.getAttribute('fill')).toBe('#1d4ed8');
    expect(path.getAttribute('fill-rule')).toBe('nonzero');
  });

  it('can use the even-odd rule and be decorative', () => {
    const { container } = render(
      <VectorSample
        decorative
        d="M0 0Z"
        width={1}
        height={1}
        color="#111827"
        evenOdd
      />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('path')!.getAttribute('fill-rule')).toBe(
      'evenodd',
    );
  });

  it('rejects an unvalidated colour or an empty frame', () => {
    expect(() =>
      render(
        <VectorSample decorative d="M0 0Z" width={1} height={1} color="red" />,
      ),
    ).toThrow(/rrggbb/);
    expect(() =>
      render(
        <VectorSample
          decorative
          d="M0 0Z"
          width={0}
          height={1}
          color="#111111"
        />,
      ),
    ).toThrow(/size/);
  });
});
