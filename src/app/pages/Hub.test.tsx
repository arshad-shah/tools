/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { getCategory, type CategoryDef } from '../categories';
import { Hub } from './Hub';

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

const cat = (id: string): CategoryDef => {
  const c = getCategory(id);
  if (!c) throw new Error(id);
  return c;
};

const setup = (id: string) =>
  render(
    <MemoryRouter initialEntries={[`/${id}`]}>
      <Routes>
        <Route path={`/${id}`} element={<Hub category={cat(id)} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const drop = (files: File[]) => {
  const zone = screen.getByText(/Drop files/).closest('[data-dragging], div');
  const target = zone?.parentElement?.parentElement ?? document.body;
  fireEvent.drop(target, { dataTransfer: { files, types: ['Files'] } });
};
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(() => localStorage.clear());

describe('Hub', () => {
  it('lists the text tools under the hub heading', () => {
    setup('text');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Text' }),
    ).toBeTruthy();
    const names = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .sort();
    expect(names).toEqual([
      '/text/diff',
      '/text/logs',
      '/text/markdown',
      '/text/regex',
      '/text/toolkit',
    ]);
  });
  it('cross-lists Protect and Unlock on the security hub with a pdf tag', () => {
    setup('security');
    for (const href of ['/pdf/protect', '/pdf/unlock']) {
      const link = screen
        .getAllByRole('link')
        .find((a) => a.getAttribute('href') === href);
      expect(link).toBeTruthy();
      expect(within(link as HTMLElement).getByText('pdf')).toBeTruthy();
    }
  });
  it('shows no drop zone on a hub that is not file-based', () => {
    setup('math');
    expect(screen.queryByText(/Drop files/)).toBeNull();
  });
  it('groups the PDF hub into quick tasks and more tools', () => {
    setup('pdf');
    expect(screen.getByRole('heading', { name: 'Quick tasks' })).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'More PDF tools' }),
    ).toBeTruthy();
  });
  it('hands two PDFs to merge', async () => {
    setup('pdf');
    drop([new File(['%PDF-1.7'], 'a.pdf'), new File(['%PDF-1.7'], 'b.pdf')]);
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toMatch(
        /^\/pdf\/merge\?handoff=.+/,
      ),
    );
  });
  it('hands one CSV on the data hub to the CSV viewer', async () => {
    setup('data');
    drop([new File(['a,b\n1,2\n3,4\n'], 'a.csv')]);
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toMatch(
        /^\/data\/csv\?handoff=.+/,
      ),
    );
  });
  it('shows an inline error for a PNG on the text hub', async () => {
    setup('text');
    drop([new File([PNG], 'a.png')]);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/No tool here accepts these files/);
    fireEvent.click(within(alert).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('offers a chooser for one PDF on the PDF hub', async () => {
    setup('pdf');
    drop([new File(['%PDF-1.7'], 'a.pdf')]);
    const chooser = await screen.findByRole('dialog', {
      name: 'Choose a tool for these files',
    });
    fireEvent.click(
      within(chooser).getByRole('button', { name: 'PDF Splitter' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toMatch(
        /^\/pdf\/split\?handoff=.+/,
      ),
    );
  });
});
