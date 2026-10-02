/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DetectSummary } from '@/pdf/render/detect-page';
import { takeStagedDocument } from '@/pdf/workspace/workspace-store';
import { DetectedDocumentCard } from './DetectedDocumentCard';

const SUMMARY: DetectSummary = {
  pageCount: 3,
  sampled: 3,
  fields: 12,
  estimatedFields: 12,
  hasAcroForm: false,
  hasXfa: false,
  hasTextLayer: true,
  flatForm: true,
};

function setup() {
  let resolve!: (s: DetectSummary) => void;
  const render_ = {
    open: vi.fn(async () => ({ docId: 'd1', pageCount: 3, pages: [] })),
    detectSummary: vi.fn(
      () => new Promise<DetectSummary>((r) => (resolve = r)),
    ),
    close: vi.fn(async () => {}),
  };
  const qpdf = { inspect: vi.fn(), decrypt: vi.fn() };
  const onNavigate = vi.fn();
  const view = render(
    <DetectedDocumentCard
      file={{ name: 'form.pdf', bytes: new TextEncoder().encode('%PDF-1.7') }}
      render={render_ as never}
      qpdf={qpdf as never}
      onNavigate={onNavigate}
      onDismiss={() => {}}
    />,
  );
  return {
    resolve: (s: DetectSummary) => resolve(s),
    onNavigate,
    render_,
    view,
  };
}

describe('DetectedDocumentCard', () => {
  it('offers Open in editor before the probe resolves', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Open in editor' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fill & Sign' })).toBeNull();
  });

  it('lists the probe results as meta items and suggests Fill & Sign', async () => {
    const { resolve, onNavigate, render_ } = setup();
    await waitFor(() => expect(render_.detectSummary).toHaveBeenCalled());
    await act(async () => resolve(SUMMARY));
    for (const t of ['3 pages', 'Flat form', '12 fields detected'])
      expect(screen.getByText(t)).toBeTruthy();
    const list = screen.getByText('3 pages').closest('ul')!;
    expect(list.querySelectorAll('[data-separator]')).toHaveLength(2);
    expect(list.textContent).toBe('3 pagesFlat form12 fields detected');
    fireEvent.click(screen.getByRole('button', { name: 'Fill & Sign' }));
    const path = onNavigate.mock.calls[0][0] as string;
    expect(path).toMatch(/^\/pdf\/edit\/fill-sign\?open=/);
    const staged = takeStagedDocument(path.split('open=')[1]);
    expect(staged?.name).toBe('form.pdf');
  });

  it('offers Run OCR for a document without a text layer', async () => {
    const { resolve, onNavigate, render_ } = setup();
    await waitFor(() => expect(render_.detectSummary).toHaveBeenCalled());
    await act(async () => resolve(SUMMARY));
    expect(screen.queryByRole('button', { name: 'Run OCR' })).toBeNull();
    const second = setup();
    await waitFor(() =>
      expect(second.render_.detectSummary).toHaveBeenCalled(),
    );
    await act(async () =>
      second.resolve({ ...SUMMARY, hasTextLayer: false, flatForm: false }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run OCR' }));
    const path = second.onNavigate.mock.calls[0][0] as string;
    expect(path).toMatch(/^\/pdf\/edit\/ocr\?open=/);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('closes the worker document when it goes away', async () => {
    const { resolve, render_, view } = setup();
    await waitFor(() => expect(render_.detectSummary).toHaveBeenCalled());
    await act(async () => resolve(SUMMARY));
    view.unmount();
    expect(render_.close).toHaveBeenCalledWith('d1');
  });
});
