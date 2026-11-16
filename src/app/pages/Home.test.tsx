/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnabledTools } from '../registry';

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

const setup = async () => {
  // Fresh modules per test: the favourites and recents stores read storage once.
  const { default: Home } = await import('./Home');
  const { useRecentToolsStore } = await import('../recents');
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return {
    visit: (id: string) => act(() => useRecentToolsStore.getState().visit(id)),
  };
};

const search = () => screen.getByRole('searchbox', { name: 'Search tools' });
const cardLinks = () =>
  within(screen.getByRole('region', { name: /tools$/i }))
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'))
    // Tool cards; the category links ("Open PDF") have one segment.
    .filter((h) => h?.split('/').length === 3);

describe('Home', () => {
  it('states the promise as the page heading', async () => {
    await setup();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Private tools that run in your browser',
      }),
    ).toBeTruthy();
  });

  it('lists every enabled tool under All tools', async () => {
    await setup();
    expect(cardLinks()).toHaveLength(getEnabledTools().length);
  });

  it('filters the grid live as you type', async () => {
    await setup();
    fireEvent.change(search(), { target: { value: 'jwt' } });
    expect(cardLinks()).toEqual(['/encoding/jwt']);
    // Every word must match: name, description, keywords or category.
    fireEvent.change(search(), { target: { value: 'pdf merge' } });
    expect(cardLinks()).toEqual(['/pdf/merge']);
  });

  it('says when nothing matches and clears the search', async () => {
    await setup();
    fireEvent.change(search(), { target: { value: 'zzqx' } });
    expect(
      screen.getByRole('heading', { name: 'No tools match "zzqx"' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect((search() as HTMLInputElement).value).toBe('');
    expect(cardLinks()).toHaveLength(getEnabledTools().length);
  });

  it('puts the cursor in the search field on /', async () => {
    await setup();
    fireEvent.keyDown(document.body, { key: '/' });
    expect(document.activeElement).toBe(search());
  });

  it('hides Pick up where you left off until there is something to pick up', async () => {
    const { visit } = await setup();
    expect(
      screen.queryByRole('heading', { name: 'Pick up where you left off' }),
    ).toBeNull();
    visit('regex-tester');
    const recent = screen.getByRole('list', { name: 'Recently used tools' });
    expect(
      within(recent).getByRole('link', { name: /Regex Tester/ }),
    ).toBeTruthy();
  });

  it('starring a tool card lists it under Favourites', async () => {
    await setup();
    const star = screen.getAllByRole('button', {
      name: 'Add Regex Tester to favourites',
    })[0]!;
    expect(star.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(star);
    expect(star.getAttribute('aria-pressed')).toBe('true');
    const favourites = screen.getByRole('list', { name: 'Favourite tools' });
    expect(
      within(favourites).getByRole('link', { name: /Regex Tester/ }),
    ).toBeTruthy();
    // Kept under the old key's replacement across reloads.
    expect(localStorage.getItem('kit:store:tool:app-favorites')).toContain(
      'regex-tester',
    );
  });

  it('routes two PDFs dropped on the workspace card to the merger', async () => {
    await setup();
    const card = screen.getByRole('region', { name: 'PDF workspace' });
    const input = card.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File(['%PDF-1.7'], 'a.pdf'),
          new File(['%PDF-1.7'], 'b.pdf'),
        ],
      },
    });
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toMatch(
        /^\/pdf\/merge\?handoff=.+/,
      ),
    );
  });
});
