/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
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

describe('QR Scanner results and camera', () => {
  it('shows each decoded code with its fields and actions', async () => {
    decodeBarcodes.mockResolvedValue([
      {
        text: 'https://example.com/a',
        format: 'qr_code',
        box: { x: 0, y: 0, w: 5, h: 5 },
      },
    ]);
    mount();
    await act(async () => {
      pasteOn(document.body, [png()]);
    });
    expect(screen.getByText('Found 1 code.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Link' })).toBeTruthy();
    expect(screen.getByText('https://example.com/a')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open link' }));
    expect(
      screen.getByRole('dialog', { name: 'Open this link?' }),
    ).toBeTruthy();
  });

  it('says when an image has no code', async () => {
    mount();
    await act(async () => {
      pasteOn(document.body, [png()]);
    });
    expect(screen.getByText('No code found')).toBeTruthy();
  });

  it('starts and stops the camera with its own controls', async () => {
    const track = {
      stop: vi.fn(),
      getCapabilities: () => ({}),
      getSettings: () => ({ deviceId: 'cam-a' }),
    };
    const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia,
        enumerateDevices: vi
          .fn()
          .mockResolvedValue([
            { kind: 'videoinput', deviceId: 'cam-a', label: 'Back' },
          ]),
      },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Camera' }));
    expect(screen.getByText('Camera is off')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    });
    expect(getUserMedia).toHaveBeenCalled();
    expect(screen.queryByText('Camera is off')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    });
    expect(track.stop).toHaveBeenCalled();
    expect(screen.getByText('Camera is off')).toBeTruthy();
    Reflect.deleteProperty(navigator, 'mediaDevices');
  });
});
