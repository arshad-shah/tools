/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavList } from './nav-list';

describe('NavList', () => {
  it('renders titled sections of links and marks the current page', () => {
    render(
      <NavList
        label="Site"
        sections={[
          { id: 'home', items: [{ href: '/', label: 'Home' }] },
          {
            id: 'cats',
            title: 'Categories',
            items: [
              {
                href: '/math',
                label: 'Math',
                children: [
                  {
                    href: '/math/calculator',
                    label: 'Calculator',
                    current: true,
                  },
                ],
              },
            ],
          },
          { id: 'empty', title: 'Favourites', items: [] },
        ]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Site' });
    expect(
      within(nav).getByRole('link', { name: 'Home' }).getAttribute('href'),
    ).toBe('/');
    const current = within(nav).getByRole('link', { name: 'Calculator' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(
      within(nav).getByRole('region', { name: 'Categories' }),
    ).toBeTruthy();
    // An empty section is left out.
    expect(within(nav).queryByText('Favourites')).toBeNull();
  });
});
