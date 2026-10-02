/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CATEGORIES } from '../categories';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

const setup = async () => {
  const { default: Home } = await import('./Home');
  // Same module instance as Home's (modules are reset per test).
  const { PaletteContext } = await import('../shell/palette');
  const open = vi.fn();
  render(
    <MemoryRouter>
      <PaletteContext.Provider value={open}>
        <Home />
      </PaletteContext.Provider>
    </MemoryRouter>,
  );
  return open;
};

describe('Home', () => {
  it('states the promise as the page heading', async () => {
    await setup();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Free, private tools. Nothing leaves your browser.',
      }),
    ).toBeTruthy();
  });
  it('renders the nine category cards in order', async () => {
    await setup();
    const section = screen
      .getByRole('heading', { name: 'Categories' })
      .closest('section') as HTMLElement;
    const hrefs = within(section)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(CATEGORIES.map((c) => `/${c.id}`));
  });
  it('hides favourites when there are none', async () => {
    await setup();
    expect(screen.queryByRole('heading', { name: 'Favourites' })).toBeNull();
  });
  it('shows a starred tool under favourites', async () => {
    localStorage.setItem('favoriteTools', JSON.stringify(['regex-tester']));
    await setup();
    const section = screen
      .getByRole('heading', { name: 'Favourites' })
      .closest('section') as HTMLElement;
    expect(
      within(section).getByRole('link', { name: 'Regex Tester' }),
    ).toBeTruthy();
  });
  it('opens the palette from the search button and the / key', async () => {
    const open = await setup();
    fireEvent.click(
      screen.getByRole('button', { name: /Search tools and actions/ }),
    );
    expect(open).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.body, { key: '/' });
    expect(open).toHaveBeenCalledTimes(2);
  });
  it('offers the PDF drop card', async () => {
    await setup();
    expect(screen.getByRole('heading', { name: 'PDF workspace' })).toBeTruthy();
    expect(screen.getByText('Drop a PDF to start')).toBeTruthy();
  });
});
