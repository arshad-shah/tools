/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { qpdf } from '@/pdf/qpdf/client';
import { PdfDropzone } from './PdfDropzone';

vi.mock('@/pdf/qpdf/client', () => ({
  qpdf: { inspect: vi.fn(), decrypt: vi.fn() },
}));

const locked = (name: string) =>
  new File(
    [new TextEncoder().encode('%PDF-1.7\n/Encrypt 9 0 R\n%%EOF')],
    name,
    { type: 'application/pdf' },
  );
const lockedInfo = {
  encrypted: true,
  needsPassword: true,
  pdfVersion: '1.7',
  pageCount: null,
  warnings: [],
};

const pdf = (name: string) =>
  new File([new TextEncoder().encode('%PDF-1.7\n%%EOF')], name, {
    type: 'application/pdf',
  });
const fake = (name: string) =>
  new File([new TextEncoder().encode('nope')], name);

describe('PdfDropzone', () => {
  it('processes handed-over files once, through the same load path', async () => {
    const onFiles = vi.fn();
    const files = [pdf('handed.pdf'), fake('bad.pdf')];
    const { rerender } = render(
      <PdfDropzone multiple onFiles={onFiles} initialFiles={files} />,
    );
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    expect(onFiles.mock.calls[0][0][0]).toMatchObject({ name: 'handed.pdf' });
    expect(await screen.findByText('bad.pdf is not a PDF file')).toBeTruthy();
    rerender(<PdfDropzone multiple onFiles={onFiles} initialFiles={files} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(onFiles).toHaveBeenCalledOnce();
  });

  it('takes only the first handed-over file when single', async () => {
    const onFiles = vi.fn();
    render(
      <PdfDropzone
        onFiles={onFiles}
        initialFiles={[pdf('one.pdf'), pdf('two.pdf')]}
      />,
    );
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    expect(onFiles.mock.calls[0][0]).toHaveLength(1);
  });

  it('passes valid files and lists rejected ones', async () => {
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone multiple onFiles={onFiles} />);
    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [pdf('good.pdf'), fake('bad.pdf')] },
    });
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    expect(
      onFiles.mock.calls[0][0].map((f: { name: string }) => f.name),
    ).toEqual(['good.pdf']);
    expect(await screen.findByText('bad.pdf is not a PDF file')).toBeTruthy();
  });

  it('does not call onFiles when everything is rejected', async () => {
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone onFiles={onFiles} />);
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [fake('x.pdf')] },
    });
    expect(await screen.findByText('x.pdf is not a PDF file')).toBeTruthy();
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('marks plain files as not encrypted, without starting qpdf', async () => {
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone onFiles={onFiles} />);
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [pdf('plain.pdf')] },
    });
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    expect(onFiles.mock.calls[0][0][0]).toMatchObject({
      name: 'plain.pdf',
      wasEncrypted: false,
    });
    expect(qpdf.inspect).not.toHaveBeenCalled();
  });

  it('prompts for a password, re-prompts when wrong, then hands over plaintext', async () => {
    vi.mocked(qpdf.inspect).mockResolvedValue(lockedInfo);
    vi.mocked(qpdf.decrypt)
      .mockRejectedValueOnce(
        new ToolError('WRONG_PASSWORD', 'That password is not correct.'),
      )
      .mockResolvedValueOnce({
        bytes: new Uint8Array([1, 2, 3]),
        warnings: [],
      });
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone onFiles={onFiles} />);
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [locked('s.pdf')] },
    });
    const input = await screen.findByLabelText('Password for s.pdf');
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(
      await screen.findByText('That password is not correct. Try again.'),
    ).toBeTruthy();
    expect(onFiles).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'good' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    expect(onFiles.mock.calls[0][0][0]).toMatchObject({
      name: 's.pdf',
      wasEncrypted: true,
      bytes: new Uint8Array([1, 2, 3]),
      size: 3,
    });
    expect(screen.queryByLabelText('Password for s.pdf')).toBeNull();
  });

  it('can skip a locked file', async () => {
    vi.mocked(qpdf.inspect).mockResolvedValue(lockedInfo);
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone onFiles={onFiles} />);
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [locked('k.pdf')] },
    });
    await screen.findByLabelText('Password for k.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Skip this file' }));
    expect(screen.queryByLabelText('Password for k.pdf')).toBeNull();
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('does not prompt when unlock is off', async () => {
    vi.mocked(qpdf.inspect).mockClear();
    const onFiles = vi.fn();
    const { container } = render(
      <PdfDropzone onFiles={onFiles} unlock={false} />,
    );
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [locked('raw.pdf')] },
    });
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    expect(onFiles.mock.calls[0][0][0]).toMatchObject({
      name: 'raw.pdf',
      wasEncrypted: false,
    });
    expect(qpdf.inspect).not.toHaveBeenCalled();
  });

  it('disables its prompts while the host is busy (review M3)', async () => {
    vi.mocked(qpdf.inspect).mockResolvedValue(lockedInfo);
    const onFiles = vi.fn();
    const { container, rerender } = render(<PdfDropzone onFiles={onFiles} />);
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [locked('busy.pdf')] },
    });
    const input = await screen.findByLabelText('Password for busy.pdf');
    fireEvent.change(input, { target: { value: 'pw' } });
    rerender(<PdfDropzone onFiles={onFiles} disabled />);
    const unlockButton = screen.getByRole('button', { name: 'Unlock' });
    expect(unlockButton.hasAttribute('disabled')).toBe(true);
    fireEvent.submit(screen.getByRole('form', { name: 'Unlock busy.pdf' }));
    expect(qpdf.decrypt).not.toHaveBeenCalledWith(
      expect.anything(),
      'pw',
      expect.anything(),
    );
  });

  it('does not hand over a file the user has since replaced (review M4)', async () => {
    vi.mocked(qpdf.inspect).mockResolvedValue(lockedInfo);
    let finish: (v: {
      bytes: Uint8Array;
      warnings: string[];
    }) => void = () => {};
    vi.mocked(qpdf.decrypt).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone onFiles={onFiles} />);
    const input = container.querySelector('input[type=file]')!;
    fireEvent.change(input, { target: { files: [locked('old.pdf')] } });
    fireEvent.change(await screen.findByLabelText('Password for old.pdf'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    fireEvent.change(input, { target: { files: [pdf('new.pdf')] } });
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    expect(onFiles.mock.calls[0][0][0].name).toBe('new.pdf');
    finish({ bytes: new Uint8Array([7]), warnings: [] });
    await new Promise((r) => setTimeout(r, 20));
    expect(onFiles).toHaveBeenCalledOnce();
  });

  it('a decryption finishing in the same tick as the replacing drop is still dropped (review M24)', async () => {
    vi.mocked(qpdf.inspect).mockResolvedValue(lockedInfo);
    let finish: (v: {
      bytes: Uint8Array;
      warnings: string[];
    }) => void = () => {};
    vi.mocked(qpdf.decrypt).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    // Deterministic worst case: the old unlock completes inside the very
    // call that hands the replacing file over, before React re-renders.
    const onFiles = vi.fn((files: { name: string }[]) => {
      if (files[0].name === 'new.pdf')
        finish({ bytes: new Uint8Array([7]), warnings: [] });
    });
    const { container } = render(<PdfDropzone onFiles={onFiles} />);
    const input = container.querySelector('input[type=file]')!;
    fireEvent.change(input, { target: { files: [locked('old.pdf')] } });
    fireEvent.change(await screen.findByLabelText('Password for old.pdf'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    fireEvent.change(input, { target: { files: [pdf('new.pdf')] } });
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    await new Promise((r) => setTimeout(r, 20));
    expect(onFiles).toHaveBeenCalledOnce();
    expect(onFiles.mock.calls[0][0][0].name).toBe('new.pdf');
  });

  it('numbers files in drop order, locked or not (review M3)', async () => {
    vi.mocked(qpdf.inspect).mockResolvedValue(lockedInfo);
    vi.mocked(qpdf.decrypt).mockResolvedValueOnce({
      bytes: new Uint8Array([1]),
      warnings: [],
    });
    const onFiles = vi.fn();
    const { container } = render(<PdfDropzone multiple onFiles={onFiles} />);
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [locked('first.pdf'), pdf('second.pdf')] },
    });
    await waitFor(() => expect(onFiles).toHaveBeenCalledOnce());
    fireEvent.change(await screen.findByLabelText('Password for first.pdf'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(2));
    const second = onFiles.mock.calls[0][0][0];
    const first = onFiles.mock.calls[1][0][0];
    expect([first.name, second.name]).toEqual(['first.pdf', 'second.pdf']);
    expect(first.order).toBeLessThan(second.order);
  });
});
