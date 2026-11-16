/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { icons as facet } from '@arshad-shah/cynosure/icons/by-name';
import * as brands from '@arshad-shah/cynosure/brands';
import { star } from '@arshad-shah/cynosure/icons';
import { describe, expect, it } from 'vitest';
import * as Icons from './index';

const entries = Object.entries(Icons).filter(
  ([k, v]) => /^(Icon|Key|Logo)/.test(k) && typeof v === 'function',
) as [string, Icons.IconComponent][];

/** Every kit icon except the product's own logo. */
const kit = entries.filter(([n]) => !n.startsWith('Logo'));

const sizeOf = (svg: SVGSVGElement) =>
  svg.style.getPropertyValue('--cy-icon-size');

describe('icon module', () => {
  it('exports icons', () => {
    expect(kit.length).toBeGreaterThan(100);
  });

  it('every kit icon is a Facet icon or a Cynosure brand mark', () => {
    const facetData = new Set<object>(Object.values(facet));
    const brandData = new Set<object>(Object.values(brands));
    for (const [name, Icon] of kit) {
      expect(Icons.isIconComponent(Icon), name).toBe(true);
      const known =
        facetData.has(Icon.data) ||
        brandData.has(Icon.data) ||
        // The favourite star: Facet's star filled, as Cynosure's Rating does.
        (Icon.data.name === star.name && Icon.data.body === star.body);
      expect(known, name).toBe(true);
    }
  });

  it('draws the Facet icon through Cynosure Icon', () => {
    const { container } = render(<Icons.IconSearch />);
    const svg = container.querySelector('svg')!;
    expect(svg.classList).toContain('cy-icon');
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.querySelectorAll('path, rect, circle').length).toBe(
      Icons.IconSearch.data.body.length,
    );
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
    expect(sizeOf(svg)).toBe('24px');
    expect(svg.style.getPropertyValue('--cy-icon-stroke')).toBe('2');
  });

  it('has illustration sizes on the scale', () => {
    const { container } = render(<Icons.IconSearch size="3xl" />);
    expect(sizeOf(container.querySelector('svg')!)).toBe('48px');
    expect(Icons.ICON_PX['2xl']).toBe(32);
  });

  it("defaults to md (18px) and Facet's own stroke", () => {
    const { container } = render(<Icons.IconSearch />);
    const svg = container.querySelector('svg')!;
    expect(sizeOf(svg)).toBe('18px');
    expect(svg.style.getPropertyValue('--cy-icon-stroke')).toBe('');
  });

  it('keeps a layout className', () => {
    const { container } = render(<Icons.IconSearch className="text-danger" />);
    expect(container.querySelector('svg')!.classList).toContain('text-danger');
  });

  it('the filled star and the GitHub mark are filled', () => {
    for (const Icon of [Icons.IconStarFilled, Icons.IconGithub]) {
      const { container, unmount } = render(<Icon />);
      expect(container.querySelector('svg')!.hasAttribute('data-fill')).toBe(
        true,
      );
      unmount();
    }
    const { container } = render(<Icons.IconStar />);
    expect(container.querySelector('svg')!.hasAttribute('data-fill')).toBe(
      false,
    );
  });

  describe('facetOf', () => {
    it('reads the data of a component or a plain element of one', () => {
      expect(Icons.facetOf(Icons.IconCopy)).toBe(Icons.IconCopy.data);
      expect(Icons.facetOf(<Icons.IconCopy size="sm" />)).toBe(
        Icons.IconCopy.data,
      );
    });

    it('leaves styled, labelled and foreign nodes to be rendered as they are', () => {
      expect(Icons.facetOf(<Icons.IconCopy className="animate-spin" />)).toBe(
        undefined,
      );
      expect(Icons.facetOf(<Icons.IconCopy label="Copy" />)).toBe(undefined);
      expect(Icons.facetOf(<Icons.IconCopy strokeWidth={2} />)).toBe(undefined);
      expect(Icons.facetOf(<span />)).toBe(undefined);
      expect(Icons.facetOf('x')).toBe(undefined);
      expect(Icons.facetOf(undefined)).toBe(undefined);
    });
  });

  it('the icon name list changes only deliberately', () => {
    expect(entries.map(([n]) => n).sort()).toMatchSnapshot();
  });

  it('displayName equals the export name', () => {
    for (const [name, Icon] of entries) expect(Icon.displayName).toBe(name);
  });
});
