/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { AutoGrid } from './auto-grid';
import { CategoryCard } from './category-card';
import { HubLayout } from './hub-layout';
import { IconFileText, IconLayoutGrid } from './icons';
import { ToolCard } from './tool-card';

function FavCard() {
  const [active, setActive] = useState(false);
  return (
    <ToolCard
      href="/pdf/merge"
      icon={IconFileText}
      title="Merge PDFs"
      description="Combine files"
      tag="pdf"
      favourite={{ active, onToggle: () => setActive((a) => !a) }}
    />
  );
}

describe('ToolCard', () => {
  it('is one link named by the title', () => {
    render(<FavCard />);
    const link = screen.getByRole('link', { name: 'Merge PDFs' });
    expect(link.getAttribute('href')).toBe('/pdf/merge');
    const desc = document.getElementById(
      link.getAttribute('aria-describedby')!,
    );
    expect(desc?.textContent).toBe('Combine files');
  });

  it('the favourite toggle is a sibling of the link, not inside it', () => {
    render(<FavCard />);
    const link = screen.getByRole('link');
    // APG toggle button: a static name, the state in aria-pressed.
    const fav = screen.getByRole('button', { name: 'Favourite Merge PDFs' });
    expect(link.contains(fav)).toBe(false);
    expect(fav.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(fav);
    expect(
      screen
        .getByRole('button', { name: 'Favourite Merge PDFs' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(fav.className).toContain('size-touch');
  });
});

describe('CategoryCard', () => {
  it('shows the count and a MetaList of top tools', () => {
    render(
      <CategoryCard
        href="/pdf"
        icon={IconLayoutGrid}
        label="PDF"
        count={12}
        topTools={['Merge PDFs', 'Split PDF', 'Compress', 'Extra']}
      />,
    );
    const link = screen.getByRole('link', { name: 'PDF' });
    expect(within(link).queryByRole('list')).toBeNull();
    const desc = document.getElementById(
      link.getAttribute('aria-describedby')!,
    );
    expect(desc?.textContent).toBe('12 tools');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('HubLayout', () => {
  it('has one h1 and an h2 per labelled group', () => {
    render(
      <HubLayout
        icon={IconFileText}
        title="PDF"
        blurb="Work with PDFs"
        groups={[
          { id: 'quick', label: 'Quick tasks', children: <p>a</p> },
          { id: 'more', label: 'More', children: <p>b</p> },
          { id: 'plain', children: <p>c</p> },
        ]}
      />,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Quick tasks', 'More']);
    expect(screen.getByRole('region', { name: 'Quick tasks' })).toBeTruthy();
  });
});

describe('AutoGrid', () => {
  it('sets grid-template-columns from min', () => {
    const { container } = render(
      <AutoGrid min={240}>
        <p>a</p>
      </AutoGrid>,
    );
    expect(
      (container.firstElementChild as HTMLElement).style.gridTemplateColumns,
    ).toContain('240px');
  });
});
