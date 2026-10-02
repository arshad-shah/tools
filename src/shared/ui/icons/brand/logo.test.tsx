/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo, LogoMark } from './Logo';

describe('Logo', () => {
  it('is an image named "tools home" by default', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: 'tools home' })).toBeTruthy();
  });

  it('draws outlines, never text', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelector('path')?.getAttribute('d')).toMatch(/^M/);
  });

  it('blinks the caret only under motion-safe and only when asked', () => {
    const { container, rerender } = render(<Logo />);
    expect(container.querySelector('rect')?.getAttribute('class')).toContain(
      'motion-safe:animate-caret-3',
    );
    rerender(<Logo animateCaret={false} variant="mono" />);
    const cls = container.querySelector('rect')?.getAttribute('class');
    expect(cls).not.toContain('animate');
    expect(cls).toContain('fill-current');
  });
});

describe('LogoMark', () => {
  it('is decorative without a label', () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('is an image with a label', () => {
    render(<LogoMark label="tools" />);
    expect(screen.getByRole('img', { name: 'tools' })).toBeTruthy();
  });
});
