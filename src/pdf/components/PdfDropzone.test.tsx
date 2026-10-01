/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PdfDropzone } from './PdfDropzone';

const pdf = (name: string) =>
  new File([new TextEncoder().encode('%PDF-1.7\n%%EOF')], name, {
    type: 'application/pdf',
  });
const fake = (name: string) =>
  new File([new TextEncoder().encode('nope')], name);

describe('PdfDropzone', () => {
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
});
