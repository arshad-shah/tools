/** @vitest-environment jsdom */
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QrScanner from './Tool';

const decodeBarcodes = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/qr-decode', async (orig) => ({
  ...(await orig<typeof import('@/shared/lib/qr-decode')>()),
  decodeBarcodes,
}));

beforeEach(() => {
  decodeBarcodes.mockReset().mockResolvedValue([]);
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width: 10, height: 10, close() {} }),
  );
});
afterEach(() => vi.unstubAllGlobals());

/** A paste event carrying `files` as clipboard items, fired on `target`. */
function pasteOn(target: EventTarget, files: File[]) {
  const e = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'clipboardData', {
    value: {
      items: files.map((f) => ({
        kind: 'file',
        type: f.type,
        getAsFile: () => f,
      })),
    },
  });
  target.dispatchEvent(e);
  return e;
}

const png = () => new File(['x'], 'shot.png', { type: 'image/png' });

const mount = () =>
  render(
    <MemoryRouter>
      <QrScanner />
    </MemoryRouter>,
  );

describe('QR Scanner Mod+V anywhere on the page', () => {
  it('scans an image pasted outside text fields', async () => {
    mount();
    const file = png();
    let e: Event | undefined;
    await act(async () => {
      e = pasteOn(document.body, [file]);
    });
    expect(decodeBarcodes).toHaveBeenCalledWith(file);
    expect(e?.defaultPrevented).toBe(true);
  });

  it('ignores pastes into text fields and pastes without an image', async () => {
    mount();
    const input = document.createElement('input');
    document.body.append(input);
    await act(async () => {
      pasteOn(input, [png()]);
      pasteOn(document.body, [
        new File(['t'], 'a.txt', { type: 'text/plain' }),
      ]);
    });
    expect(decodeBarcodes).not.toHaveBeenCalled();
    input.remove();
  });

  it('stops listening after unmount', async () => {
    const { unmount } = mount();
    unmount();
    await act(async () => {
      pasteOn(document.body, [png()]);
    });
    expect(decodeBarcodes).not.toHaveBeenCalled();
  });
});
