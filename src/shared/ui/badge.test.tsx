/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';
import { IconCheck } from './icons';

describe('Badge icon', () => {
  it("draws a kit icon in Cynosure's icon slot, decorative", () => {
    render(<Badge icon={<IconCheck size="xs" />}>Valid</Badge>);
    const badge = screen.getByText('Valid').closest('.cy-badge')!;
    const svg = badge.querySelectorAll('svg');
    expect(svg).toHaveLength(1);
    expect(svg[0]!.getAttribute('aria-hidden')).toBe('true');
    // The slot sizes it to the badge, not the element's own 12px.
    expect(svg[0]!.dataset.size).toBe('sm');
  });

  it('renders any other node before the label', () => {
    render(<Badge icon={<span data-testid="dot" />}>Live</Badge>);
    expect(screen.getByTestId('dot').closest('.cy-badge')).not.toBeNull();
  });

  it('without an icon draws no svg', () => {
    render(<Badge>Plain</Badge>);
    expect(
      screen.getByText('Plain').closest('.cy-badge')!.querySelector('svg'),
    ).toBeNull();
  });
});
