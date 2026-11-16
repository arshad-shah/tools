/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RivePlayer } from './RivePlayer';

describe('RivePlayer surface', () => {
  it('RivePlayer owns a labelled canvas and forwards its ref', () => {
    const ref = { current: null as HTMLCanvasElement | null };
    render(<RivePlayer ref={ref} label="Animation" background="white" />);
    expect(screen.getByRole('img', { name: 'Animation' })).toBe(ref.current);
  });
  it('RivePlayer paints a chosen stage colour or a checkerboard', () => {
    const { rerender } = render(<RivePlayer label="Stage" color="#ff0000" />);
    const canvas = screen.getByRole('img', { name: 'Stage' });
    expect(canvas.style.backgroundColor).toBe('rgb(255, 0, 0)');
    rerender(<RivePlayer label="Stage" color="#ff0000" checkerboard />);
    expect(canvas.style.backgroundImage).toContain('repeating-conic-gradient');
    rerender(<RivePlayer label="Stage" color="transparent" />);
    expect(canvas.getAttribute('style') ?? '').toBe('');
    rerender(<RivePlayer label="Stage" color="not a colour" />);
    expect(canvas.getAttribute('style') ?? '').toBe('');
  });
});
