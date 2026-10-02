/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContrastPair } from './contrast-pair';

describe('ContrastPair', () => {
  it('shows the WCAG ratio, levels and APCA Lc', () => {
    render(<ContrastPair fg="#000000" bg="#ffffff" label="Body text" />);
    const region = screen.getByRole('region', { name: 'Body text' });
    expect(region.textContent).toContain('21.00:1');
    expect(screen.getAllByText('AAA pass')).toHaveLength(2);
    expect(region.textContent).toMatch(/Lc 10\d\.\d/);
  });

  it('spells out failing levels', () => {
    render(<ContrastPair fg="#777777" bg="#ffffff" />);
    // #777 on white is 4.48:1: fails AA for normal text, passes for large.
    expect(screen.getByText('4.47:1')).toBeTruthy();
    expect(screen.getAllByText('AA fail')).toHaveLength(1);
    expect(screen.getAllByText('AA pass')).toHaveLength(2);
    expect(screen.getAllByText('AAA fail')).toHaveLength(2);
  });

  it('reports invalid colours', () => {
    render(<ContrastPair fg="nope" bg="#fff" />);
    expect(screen.getByRole('alert').textContent).toMatch(/not a colour/);
  });
});

describe('ContrastPair preview (6-A2 minor)', () => {
  it('draws the sample as decorative generated content, so a failing pair does not trip axe', () => {
    const { container } = render(
      <ContrastPair fg="#999999" bg="#aaaaaa" sample="Sample words" />,
    );
    const preview = container.querySelector('[data-contrast-preview]')!;
    expect(preview.getAttribute('aria-hidden')).toBe('true');
    // No text nodes for axe's colour-contrast rule to measure.
    expect(preview.textContent).toBe('');
    expect(
      preview.querySelector('[data-sample]')?.getAttribute('data-sample'),
    ).toBe('Sample words');
  });
});
