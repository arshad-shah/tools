/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { saveBlob, saveZip } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { takeStagedDocument } from '@/pdf/workspace/workspace-store';
import { ResultFiles } from './ResultFiles';

vi.mock('@/shared/lib/download', () => ({
  saveBlob: vi.fn(),
  saveZip: vi.fn(),
}));
vi.mock('@/shared/lib/notify', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const files = [
  { name: 'a.pdf', bytes: new Uint8Array(3) },
  { name: 'a.pdf', bytes: new Uint8Array(4) },
];

describe('ResultFiles', () => {
  it('reports a ZIP failure instead of throwing, then re-enables the button', async () => {
    vi.mocked(saveZip).mockRejectedValueOnce(new Error('disk full'));
    render(<ResultFiles files={files} zipName="out.zip" />);
    const button = screen.getByRole('button', { name: /Download all/ });
    fireEvent.click(button);
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledExactlyOnceWith('disk full'),
    );
    expect(notify.success).not.toHaveBeenCalled();
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
  });

  it('names each download button after its file and saves with its mime', () => {
    render(
      <ResultFiles
        files={[
          { name: 'p1.png', bytes: new Uint8Array(1), mime: 'image/png' },
          { name: 'p2.pdf', bytes: new Uint8Array(2) },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download p1.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download p2.pdf' }));
    expect(vi.mocked(saveBlob).mock.calls).toEqual([
      [expect.any(Uint8Array), 'p1.png', 'image/png'],
      [expect.any(Uint8Array), 'p2.pdf', 'application/pdf'],
    ]);
  });

  it('renders duplicate names as separate rows', () => {
    render(<ResultFiles files={files} />);
    expect(screen.getAllByText('a.pdf')).toHaveLength(2);
  });
});

describe('ResultFiles note', () => {
  it('shows a note under the header', () => {
    render(
      <ResultFiles
        files={[{ name: 'n.pdf', bytes: new Uint8Array(1) }]}
        note="The original was password-protected. This file is not."
      />,
    );
    expect(
      screen.getByText(
        'The original was password-protected. This file is not.',
      ),
    ).toBeTruthy();
  });
});

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

describe('ResultFiles open in workspace', () => {
  const one = [{ name: 'merged.pdf', bytes: new Uint8Array([1, 2, 3]) }];
  const inRouter = (ui: React.ReactNode) =>
    render(
      <MemoryRouter initialEntries={['/pdf/merge']}>
        <Routes>
          <Route path="/pdf/merge" element={ui} />
          <Route path="/pdf/edit" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

  it('stages the single PDF and opens the workspace', () => {
    inRouter(<ResultFiles files={one} openInWorkspace />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Open result in workspace' }),
    );
    const where = screen.getByTestId('where').textContent!;
    const id = /\?open=(.+)$/.exec(where)![1];
    expect(where.startsWith('/pdf/edit?open=')).toBe(true);
    const staged = takeStagedDocument(id);
    expect(staged?.name).toBe('merged.pdf');
    expect([...staged!.bytes]).toEqual([1, 2, 3]);
  });

  it('is offered only for one PDF and only when asked', () => {
    inRouter(<ResultFiles files={files} openInWorkspace />);
    expect(
      screen.queryByRole('button', { name: 'Open result in workspace' }),
    ).toBeNull();
  });

  it('is not offered without the flag', () => {
    inRouter(<ResultFiles files={one} />);
    expect(
      screen.queryByRole('button', { name: 'Open result in workspace' }),
    ).toBeNull();
  });
});
