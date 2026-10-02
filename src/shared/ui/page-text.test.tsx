/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageText } from './page-text';

const PDF = { a: 2, b: 0, c: 0, d: -2, e: 0, f: 1584 };

describe('PageText', () => {
  it('places each character at its page-space position, scaled', () => {
    render(
      <PageText
        transform={PDF}
        box={{ x: 100, y: 600, width: 160, height: 20 }}
        text="123"
        size={11}
        color="#1e3a8a"
        x={[7.5, 27.5, 47.5]}
        baseline={5}
        data-testid="t"
      />,
    );
    const box = screen.getByTestId('t');
    expect(box.style.left).toBe('200px');
    expect(box.style.width).toBe('320px');
    const spans = box.querySelectorAll('span');
    expect([...spans].map((s) => s.style.left)).toEqual([
      '15px',
      '55px',
      '95px',
    ]);
    expect(spans[0].style.fontSize).toBe('22px');
    expect(spans[0].style.bottom).toBe('10px');
    expect(box.getAttribute('aria-hidden')).toBe('true');
  });

  it('refuses a colour that is not #rrggbb', () => {
    expect(() =>
      render(
        <PageText
          transform={PDF}
          box={{ x: 0, y: 0, width: 10, height: 10 }}
          text="a"
          size={10}
          color="red"
          x={[0]}
          baseline={0}
        />,
      ),
    ).toThrow('PageText needs a #rrggbb colour.');
  });
});
