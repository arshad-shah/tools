/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findBanned } from '../../../eslint-rules/banned-glyphs.js';
import { AppShell } from './app-shell';
import { Breadcrumb } from './breadcrumb';
import { TopBar } from './top-bar';

describe('AppShell', () => {
  it('has one banner, one main and a first skip link to it', () => {
    const { container } = render(
      <AppShell topBar={<TopBar />}>
        <p>Content</p>
      </AppShell>,
    );
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    const main = screen.getByRole('main');
    expect(main.id).toBe('main');
    const firstFocusable = container.querySelector('a, button, [tabindex="0"]');
    expect(firstFocusable?.textContent).toBe('Skip to content');
    expect(firstFocusable?.getAttribute('href')).toBe('#main');
  });

  it('renders complementary regions only when given', () => {
    const { rerender } = render(<AppShell topBar={null}>x</AppShell>);
    expect(screen.queryByRole('complementary')).toBeNull();
    rerender(
      <AppShell topBar={null} aside={<p>rail</p>} asideLabel="Pages">
        x
      </AppShell>,
    );
    expect(screen.getByRole('complementary', { name: 'Pages' })).toBeTruthy();
  });
});

describe('Breadcrumb', () => {
  it('is a navigation list with the last item current and icon separators', () => {
    const { container } = render(
      <Breadcrumb
        segments={[{ label: 'pdf', href: '/pdf' }, { label: 'edit' }]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const items = within(nav).getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(['pdf', 'edit']);
    expect(
      within(nav).getByRole('link', { name: 'pdf' }).getAttribute('href'),
    ).toBe('/pdf');
    expect(items[1].querySelector('[aria-current="page"]')?.textContent).toBe(
      'edit',
    );
    const seps = container.querySelectorAll('svg');
    expect(seps).toHaveLength(1);
    expect(seps[0].getAttribute('aria-hidden')).toBe('true');
    expect(findBanned(nav.textContent ?? '')).toBeNull();
  });
});

describe('TopBar', () => {
  it('links the logo home', () => {
    render(<TopBar actions={<button type="button">Theme</button>} />);
    const home = screen.getByRole('link', { name: 'tools home' });
    expect(home.getAttribute('href')).toBe('/');
    expect(home.querySelector('svg text')).toBeNull();
  });

  it('uses the supplied link renderer', () => {
    render(
      <TopBar
        renderLink={({ href, children, ...rest }) => (
          <a href={`#router${href}`} {...rest}>
            {children}
          </a>
        )}
      />,
    );
    expect(
      screen.getByRole('link', { name: 'tools home' }).getAttribute('href'),
    ).toBe('#router/');
  });
});

describe('AppShell layout prop', () => {
  it('follows a changed layout prop', () => {
    const { container, rerender } = render(
      <AppShell topBar={null} layout="standard">
        x
      </AppShell>,
    );
    expect(
      container.querySelector('[data-layout]')?.getAttribute('data-layout'),
    ).toBe('standard');
    rerender(
      <AppShell topBar={null} layout="focus">
        x
      </AppShell>,
    );
    expect(
      container.querySelector('[data-layout]')?.getAttribute('data-layout'),
    ).toBe('focus');
  });
});
