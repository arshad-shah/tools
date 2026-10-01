/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import type { LoadedFile } from '@/shared/lib/files';
import { PdfFileHeader } from './PdfFileHeader';

const loaded: LoadedFile = {
  id: '1',
  name: 'report.pdf',
  size: 10,
  kind: 'pdf',
  bytes: new Uint8Array([1]),
};

describe('PdfFileHeader', () => {
  it('shows a dropzone and passes the first file', async () => {
    const onFile = vi.fn();
    const { container } = render(
      <PdfFileHeader
        file={null}
        onFile={onFile}
        onClear={() => {}}
        loading={false}
        error={null}
      />,
    );
    const input = container.querySelector('input[type=file]')!;
    fireEvent.change(input, {
      target: {
        files: [new File([new TextEncoder().encode('%PDF-1.7\n')], 'a.pdf')],
      },
    });
    await waitFor(() => expect(onFile).toHaveBeenCalledOnce());
    expect(onFile.mock.calls[0][0].name).toBe('a.pdf');
  });

  it('shows the file name, opening and error states, and clears', () => {
    const onClear = vi.fn();
    render(
      <PdfFileHeader
        file={loaded}
        onFile={() => {}}
        onClear={onClear}
        loading
        error={new ToolError('INVALID_FILE', 'This file could not be read')}
      />,
    );
    expect(screen.getByText('report.pdf')).toBeTruthy();
    expect(screen.getByText('Opening…')).toBeTruthy();
    expect(screen.getByText('This file could not be read')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose another file' }),
    );
    expect(onClear).toHaveBeenCalledOnce();
  });
});
