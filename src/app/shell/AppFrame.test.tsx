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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/platform', () => ({ isMac: () => false }));

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname}</p>;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  // A desktop-wide shell: the navigation is beside the content.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 1440,
    height: 900,
    top: 0,
    left: 0,
    right: 1440,
    bottom: 900,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function setup(path = '/somewhere') {
  const { default: AppFrame } = await import('./AppFrame');
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppFrame />}>
          <Route path="*" element={<Where />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Pages stay alive (hidden) after you leave; the newest is the current one. */
const where = () => screen.getAllByTestId('where').at(-1)?.textContent;

describe('AppFrame', () => {
  it('opens the palette with Mod+K and runs a tool from it', async () => {
    await setup();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const palette = await screen.findByRole('dialog', {
      name: 'Search tools and actions',
    });
    const input = within(palette).getByRole('combobox');
    fireEvent.change(input, { target: { value: 'jwt deco' } });
    const option = within(palette).getAllByRole('option')[0]!;
    expect(option.textContent).toContain('JWT Decoder');
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(where()).toBe('/encoding/jwt'));
    // Recent commands are kept for the next session.
    expect(localStorage.getItem('tools:recent-commands')).toContain(
      'tool:jwt-decode',
    );
  });

  it('opens the palette from Search tools in the navigation', async () => {
    await setup();
    const nav = screen.getByRole('navigation', { name: 'Tools navigation' });
    fireEvent.click(within(nav).getByRole('button', { name: /Search tools/ }));
    expect(
      await screen.findByRole('dialog', { name: 'Search tools and actions' }),
    ).toBeTruthy();
  });

  it('lists a visited tool under Recent in the navigation', async () => {
    await setup('/text/regex');
    const nav = screen.getByRole('navigation', { name: 'Tools navigation' });
    const recent = within(nav).getByRole('list', { name: 'Recent' });
    expect(
      within(recent).getByRole('link', { name: 'Regex Tester' }),
    ).toBeTruthy();
    // The current tool's category is open with the tool marked.
    const current = within(nav)
      .getAllByRole('link', { name: 'Regex Tester' })
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
  });

  it('lists starred tools under Favourites in the navigation', async () => {
    const { useFavoritesStore } = await import('../favorites');
    await setup('/');
    const nav = screen.getByRole('navigation', { name: 'Tools navigation' });
    expect(within(nav).queryByRole('list', { name: 'Favourites' })).toBeNull();
    act(() => useFavoritesStore.getState().toggle('pdf-merger'));
    const favourites = within(nav).getByRole('list', { name: 'Favourites' });
    expect(
      within(favourites).getByRole('link', { name: 'PDF Merger' }),
    ).toBeTruthy();
  });

  it('cycles and saves the colour mode from the navigation footer', async () => {
    await setup('/');
    const toggle = screen.getByRole('button', { name: /Colour mode/ });
    fireEvent.click(toggle);
    expect(localStorage.getItem('tools:theme')).not.toBeNull();
  });
});
