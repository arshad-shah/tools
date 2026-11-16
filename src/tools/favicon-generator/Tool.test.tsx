// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FaviconGenerator from './Tool';
import { HANDOFF_PARAM, putHandoff } from '@/shared/lib/handoff';
import { htmlSnippet } from './lib/outputs';

// jsdom has no OffscreenCanvas: every size renders to a tiny PNG blob.
vi.mock('./lib/render', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/render')>()),
  renderIcon: vi.fn(
    async () =>
      new Blob(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        { type: 'image/png' },
      ),
  ),
}));
vi.mock('@/shared/lib/download', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/download')>()),
  saveZip: vi.fn(async () => {}),
}));
vi.mock('@/shared/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const writeText = vi.fn(async () => {});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  writeText.mockClear();
});

describe('FaviconGenerator', () => {
  it('a text source of one letter enables the download', async () => {
    render(<FaviconGenerator />);
    const download = screen.getByRole('button', { name: 'Download ZIP' });
    expect(download).toHaveProperty('disabled', true);
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Text (1 to 3 characters)' }),
      { target: { value: 'T' } },
    );
    expect(screen.getByRole('button', { name: 'Download ZIP' })).toHaveProperty(
      'disabled',
      false,
    );
    // The preview sits beside the source and follows it.
    expect(
      await screen.findByRole('img', { name: '16 px favicon' }),
    ).toBeTruthy();

    const { saveZip } = await import('@/shared/lib/download');
    fireEvent.click(screen.getByRole('button', { name: 'Download ZIP' }));
    await waitFor(() => expect(saveZip).toHaveBeenCalled());
    const [entries, filename] = vi.mocked(saveZip).mock.calls[0];
    expect(filename).toBe('favicons.zip');
    expect(entries.map((e) => e.name)).toContain('favicon.ico');
  });

  it('copy snippet writes the HTML snippet', async () => {
    render(<FaviconGenerator />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy snippet' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(htmlSnippet({ svg: false })),
    );
    // The snippet is shown as code on the page too.
    expect(document.body.textContent).toContain(
      htmlSnippet({ svg: false }).split('\n')[0],
    );
  });

  it('an SVG with a script lists what was removed', () => {
    render(<FaviconGenerator />);
    fireEvent.click(screen.getByRole('radio', { name: 'SVG' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'SVG markup' }), {
      target: {
        value:
          '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>1</script><rect width="4" height="4"/></svg>',
      },
    });
    const list = screen.getByRole('list', { name: 'Removed from the SVG' });
    expect(list.textContent).toMatch(/script/);
    expect(list.textContent).toMatch(/onload/);
    expect(screen.getByRole('button', { name: 'Download ZIP' })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('a handed-off SVG file opens the SVG source', async () => {
    const svg = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>',
      ],
      'logo.svg',
      { type: 'image/svg+xml' },
    );
    const id = putHandoff([svg]);
    window.history.replaceState(null, '', `/?${HANDOFF_PARAM}=${id}`);
    render(<FaviconGenerator />);
    await waitFor(() =>
      expect(
        (screen.getByRole('radio', { name: 'SVG' }) as HTMLInputElement)
          .checked,
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole('textbox', {
            name: 'SVG markup',
          }) as HTMLTextAreaElement
        ).value,
      ).toMatch(/^<svg/),
    );
    window.history.replaceState(null, '', '/');
  });
});
