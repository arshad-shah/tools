/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as Icons from './index';

const entries = Object.entries(Icons).filter(
  ([k, v]) => /^(Icon|Key|Logo)/.test(k) && typeof v === 'function',
) as [string, Icons.IconComponent][];

describe('icon module', () => {
  it('exports icons', () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it('every icon renders an svg, aria-hidden without a label', () => {
    // The wordmark is always labelled (it is the home link's name).
    for (const [name, Icon] of entries.filter(([n]) => n !== 'Logo')) {
      const { container, unmount } = render(<Icon />);
      const svg = container.querySelector('svg');
      expect(svg, name).not.toBeNull();
      expect(svg!.getAttribute('aria-hidden'), name).toBe('true');
      expect(svg!.getAttribute('role'), name).toBeNull();
      unmount();
    }
  });

  it('with a label: role=img and an accessible name', () => {
    for (const [name, Icon] of entries) {
      const { getByRole, unmount } = render(<Icon label={`L ${name}`} />);
      expect(getByRole('img', { name: `L ${name}` })).toBeTruthy();
      unmount();
    }
  });

  it('honours size and stroke width', () => {
    const { container } = render(<Icons.IconStar size="xl" strokeWidth={2} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('stroke-width')).toBe('2');
  });

  it('has illustration sizes on the scale', () => {
    const { container } = render(<Icons.IconSearch size="3xl" />);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('48');
    expect(Icons.ICON_PX['2xl']).toBe(32);
  });

  it('defaults to md (18px) and stroke 1.75', () => {
    const { container } = render(<Icons.IconSearch />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('stroke-width')).toBe('1.75');
  });

  it('the icon name list changes only deliberately', () => {
    expect(entries.map(([n]) => n).sort()).toMatchSnapshot();
  });

  it('displayName equals the export name', () => {
    for (const [name, Icon] of entries) expect(Icon.displayName).toBe(name);
  });
});
