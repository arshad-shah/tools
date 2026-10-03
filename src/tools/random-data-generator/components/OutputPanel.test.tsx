/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockViewport } from '@/shared/ui/data-grid/test-utils';

const copyText = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/shared/lib/clipboard', async (orig) => ({
  ...(await orig<typeof import('@/shared/lib/clipboard')>()),
  copyText,
}));

const { OutputPanel } = await import('./OutputPanel');

beforeEach(() => mockViewport(1200, 600));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('OutputPanel', () => {
  it('copies the export in the chosen format, with Download beside it above the grid', () => {
    render(
      <MemoryRouter>
        <OutputPanel tables={{ users: [{ id: 1 }, { id: 2 }] }} />
      </MemoryRouter>,
    );
    const copy = screen.getByRole('button', { name: 'Copy' });
    const download = screen.getByRole('button', { name: 'Download' });
    const grid = screen.getByRole('grid', { name: 'Generated data' });
    for (const b of [copy, download])
      expect(
        b.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    fireEvent.click(copy);
    expect(copyText).toHaveBeenCalledWith(
      `${JSON.stringify([{ id: 1 }, { id: 2 }], null, 2)}\n`,
    );
  });
});
