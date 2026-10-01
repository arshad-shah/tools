/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { saveZip } from '@/shared/lib/download';
import { notify } from '@/shared/lib/notify';
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

  it('renders duplicate names as separate rows', () => {
    render(<ResultFiles files={files} />);
    expect(screen.getAllByText('a.pdf')).toHaveLength(2);
  });
});
