/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { Swatch } from './swatch';

describe('Swatch variants', () => {
  it('accepts any CSS colour function, painted as sRGB', () => {
    render(<Swatch color="oklch(62.8% 0.2577 29.23)" label="Red" />);
    expect(screen.getByRole('img', { name: 'Red' }).style.backgroundColor).toBe(
      'rgb(255, 0, 0)',
    );
  });

  it('paints translucent colours over a checkerboard', () => {
    render(<Swatch color="rgb(255 0 0 / 0.5)" label="Half" />);
    const img = screen.getByRole('img', { name: 'Half' });
    expect(img.style.backgroundImage).toContain('rgba(255, 0, 0, 0.5)');
  });

  it('has sizes and block and dot variants', () => {
    render(
      <>
        <Swatch color="accent" label="Large" size="lg" />
        <Swatch color="accent" label="Block" variant="block" />
        <Swatch color="accent" label="Dot" variant="dot" size="sm" />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Large' }).className).toContain(
      'size-8',
    );
    expect(screen.getByRole('img', { name: 'Block' }).className).toContain(
      'w-full',
    );
    expect(screen.getByRole('img', { name: 'Dot' }).className).toContain(
      'rounded-full',
    );
  });

  it('a flag dot adds its text to the name', () => {
    render(<Swatch color="#777777" label="Grey" flag="fails contrast" />);
    const img = screen.getByRole('img', { name: 'Grey, fails contrast' });
    expect(img.querySelector('[data-flag]')).not.toBeNull();
  });

  it('rejects invalid colour text and bare non-token words', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Swatch color="#12" label="x" />)).toThrow(ToolError);
    expect(() => render(<Swatch color="accnt" label="x" />)).toThrow(ToolError);
  });
});
