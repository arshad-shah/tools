/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompareSlider } from './compare-slider';

const before = { src: 'data:image/png;base64,AAAA' };
const after = { src: 'data:image/png;base64,BBBB' };

describe('CompareSlider', () => {
  it('ArrowLeft moves the divider from 50 to 49', () => {
    render(<CompareSlider before={before} after={after} />);
    const divider = screen.getByRole('slider', { name: 'Divider' });
    expect(divider.getAttribute('aria-valuenow')).toBe('50');
    fireEvent.keyDown(divider, { key: 'ArrowLeft' });
    expect(divider.getAttribute('aria-valuenow')).toBe('49');
    expect(divider.getAttribute('aria-valuetext')).toBe(
      'Showing 49 percent before',
    );
  });

  it('Shift moves 10 percent and Home and End reach the ends', () => {
    render(<CompareSlider before={before} after={after} initial={0.2} />);
    const divider = screen.getByRole('slider', { name: 'Divider' });
    fireEvent.keyDown(divider, { key: 'ArrowRight', shiftKey: true });
    expect(divider.getAttribute('aria-valuenow')).toBe('30');
    fireEvent.keyDown(divider, { key: 'End' });
    expect(divider.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(divider, { key: 'Home' });
    expect(divider.getAttribute('aria-valuenow')).toBe('0');
  });

  it('labels both images and clips the before layer', () => {
    render(
      <CompareSlider
        before={before}
        after={after}
        labels={['Original', 'Compressed']}
      />,
    );
    const orig = screen.getByRole('img', { name: 'Original' });
    expect(screen.getByRole('img', { name: 'Compressed' })).toBeTruthy();
    expect(
      (orig.parentElement?.parentElement as HTMLElement).style.clipPath,
    ).toBe('inset(0 50% 0 0)');
  });

  it('1:1 mode pans both images together', () => {
    render(<CompareSlider before={before} after={after} zoom="1:1" />);
    const group = screen.getByRole('group', { name: 'Comparison' });
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    const a = screen.getByRole('img', { name: 'After' }).parentElement!;
    const b = screen.getByRole('img', { name: 'Before' }).parentElement!;
    expect(a.style.transform).toBe('translate(-40px, 0px)');
    expect(b.style.transform).toBe(a.style.transform);
  });
});
