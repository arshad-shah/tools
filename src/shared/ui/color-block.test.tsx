/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColorBlock } from './color-block';

describe('ColorBlock', () => {
  it('paints a validated hex background and text colour', () => {
    render(
      <ColorBlock color="#336699" textColor="#ffffff" data-testid="b">
        Hi
      </ColorBlock>,
    );
    const el = screen.getByTestId('b');
    expect(el.style.backgroundColor).toBe('rgb(51, 102, 153)');
    expect(el.style.color).toBe('rgb(255, 255, 255)');
    expect(el.textContent).toBe('Hi');
  });
  it('applies alpha as rgba', () => {
    render(<ColorBlock color="#336699" alpha={0.5} data-testid="a" />);
    expect(screen.getByTestId('a').style.backgroundColor).toBe(
      'rgba(51, 102, 153, 0.5)',
    );
  });
  it('rejects anything but #rrggbb', () => {
    expect(() => render(<ColorBlock color="red" />)).toThrow(/#rrggbb/);
    expect(() =>
      render(<ColorBlock color="#000000" textColor="url(x)" />),
    ).toThrow(/#rrggbb/);
  });
});
