/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getTool } from '../registry';
import { useBreadcrumbSegments } from '../shell/breadcrumb';
import { BreadcrumbProvider } from '../shell/breadcrumb-context';
import { ToolPage } from './ToolPage';

function Crumbs() {
  return (
    <ol aria-label="Breadcrumb">
      {useBreadcrumbSegments().map((s) => (
        <li key={s.label}>
          {s.href ? <a href={s.href}>{s.label}</a> : s.label}
        </li>
      ))}
    </ol>
  );
}

beforeEach(() => localStorage.clear());

const setup = () => {
  const tool = getTool('regex-tester');
  if (!tool) throw new Error('regex-tester missing');
  return render(
    <MemoryRouter>
      <BreadcrumbProvider>
        <Crumbs />
        <ToolPage tool={tool}>
          <p>tool body</p>
        </ToolPage>
      </BreadcrumbProvider>
    </MemoryRouter>,
  );
};

describe('ToolPage', () => {
  it('renders the name as h1 and the tool body', () => {
    setup();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Regex Tester' }),
    ).toBeTruthy();
    expect(screen.getByText('tool body')).toBeTruthy();
  });
  it('sets the breadcrumb to category then tool', () => {
    setup();
    const nav = screen.getByRole('list', { name: 'Breadcrumb' });
    const items = within(nav)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(items).toEqual(['Text', 'Regex Tester']);
    expect(within(nav).getByRole('link', { name: 'Text' })).toHaveProperty(
      'pathname',
      '/text',
    );
  });
  it('toggles the favourite', () => {
    setup();
    const star = screen.getByRole('button', {
      name: 'Add Regex Tester to favourites',
    });
    expect(star.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(star);
    expect(star.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(star);
    expect(star.getAttribute('aria-pressed')).toBe('false');
  });
  it('shows a failing tool as a message with Try again', () => {
    const tool = getTool('regex-tester')!;
    let fail = true;
    const Boom = () => {
      if (fail) throw new Error('kaboom');
      return <p>recovered</p>;
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <ToolPage tool={tool}>
          <Boom />
        </ToolPage>
      </MemoryRouter>,
    );
    expect(screen.getByText(/kaboom/)).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('recovered')).toBeTruthy();
    spy.mockRestore();
  });
});
