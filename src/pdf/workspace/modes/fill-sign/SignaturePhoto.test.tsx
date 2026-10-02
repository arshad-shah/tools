/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import type { PhotoClient } from '@/pdf/sign/photo/client';
import { SignaturePhoto } from './SignaturePhoto';

const VECTOR = { d: 'M0 0L40 0L40 10Z', width: 40, height: 10 };
const MASK = { width: 40, height: 10, data: new Uint8Array(400) };

function fakeClient(angle = 6.2) {
  return {
    clean: vi.fn().mockResolvedValue({ mask: MASK, angle, inkPixels: 120 }),
    trace: vi.fn().mockResolvedValue(VECTOR),
  } satisfies Pick<PhotoClient, 'clean' | 'trace'>;
}

const fakeBitmap = () => ({ width: 40, height: 10, close: vi.fn() });

function fakeStream() {
  const track = {
    stop: vi.fn(),
    getCapabilities: () => ({}),
    getSettings: () => ({ deviceId: 'cam-a' }),
  };
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, track };
}

function mockMedia(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
  });
}

const readyState = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  'readyState',
);

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 4,
  });
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: vi.fn(async () => fakeBitmap()),
  });
});

afterEach(() => {
  if (readyState)
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', readyState);
  Reflect.deleteProperty(navigator, 'mediaDevices');
  Reflect.deleteProperty(globalThis, 'createImageBitmap');
});

const upload = (name: string, type: string) => {
  fireEvent.click(screen.getByRole('radio', { name: 'Upload' }));
  const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
  fireEvent.change(input, {
    target: { files: [new File([new Uint8Array(8)], name, { type })] },
  });
};

describe('SignaturePhoto: upload', () => {
  it('cleans, traces and previews a photo; Use this signature hands it on', async () => {
    const client = fakeClient();
    const onChange = vi.fn();
    render(<SignaturePhoto onChange={onChange} client={client} />);
    upload('sig.png', 'image/png');
    expect(
      await screen.findByRole('img', { name: 'Signature preview' }),
    ).toBeTruthy();
    expect(client.clean).toHaveBeenCalledWith(
      expect.anything(),
      { t: 0.15 },
      expect.any(AbortSignal),
    );
    expect(client.trace).toHaveBeenCalledWith(
      MASK,
      {},
      expect.any(AbortSignal),
    );
    expect(screen.getByText('Straightened by 6 degrees')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use this signature' }));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: 'trace',
      vector: VECTOR,
      color: '#111827',
    });
  });

  it('says when no straightening was needed', async () => {
    render(<SignaturePhoto onChange={() => {}} client={fakeClient(0.2)} />);
    upload('sig.jpg', 'image/jpeg');
    expect(await screen.findByText('No straightening needed')).toBeTruthy();
  });

  it('re-runs the clean-up when the contrast changes', async () => {
    const client = fakeClient();
    render(<SignaturePhoto onChange={() => {}} client={client} />);
    upload('sig.webp', 'image/webp');
    await screen.findByRole('img', { name: 'Signature preview' });
    fireEvent.change(screen.getByRole('slider', { name: 'Contrast' }), {
      target: { value: '0.2' },
    });
    await waitFor(() => expect(client.clean).toHaveBeenCalledTimes(2));
    expect(client.clean.mock.calls[1][1]).toEqual({ t: 0.2 });
  });

  it('rejects HEIC and other kinds, naming the supported ones', () => {
    const client = fakeClient();
    render(<SignaturePhoto onChange={() => {}} client={client} />);
    upload('IMG_0001.heic', 'image/heic');
    expect(screen.getByRole('alert').textContent).toContain(
      'Use a PNG, JPEG or WebP image',
    );
    expect(client.clean).not.toHaveBeenCalled();
  });

  it('shows the clean-up error, and Retake goes back to choosing', async () => {
    const client = fakeClient();
    client.clean.mockRejectedValue(
      new ToolError('INVALID_INPUT', 'No signature found in this photo.'),
    );
    const onChange = vi.fn();
    render(<SignaturePhoto onChange={onChange} client={client} />);
    upload('sig.png', 'image/png');
    expect(
      await screen.findByText('No signature found in this photo.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retake' }));
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('SignaturePhoto: camera', () => {
  it('explains a blocked camera', async () => {
    mockMedia(
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
        ),
    );
    render(<SignaturePhoto onChange={() => {}} client={fakeClient()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(
      await screen.findByText(
        'Camera access was blocked. Allow it in your browser settings, or upload a photo instead.',
      ),
    ).toBeTruthy();
  });

  it('explains a browser without a camera', async () => {
    render(<SignaturePhoto onChange={() => {}} client={fakeClient()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(
      await screen.findByText(
        "This browser can't use a camera here. Upload a photo instead.",
      ),
    ).toBeTruthy();
  });

  it('captures a frame, stops the camera and cleans the frame', async () => {
    const { stream, track } = fakeStream();
    mockMedia(vi.fn().mockResolvedValue(stream));
    const client = fakeClient();
    render(<SignaturePhoto onChange={() => {}} client={client} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    const capture = await screen.findByRole('button', { name: 'Capture' });
    await waitFor(() => expect(capture.hasAttribute('disabled')).toBe(false));
    fireEvent.click(capture);
    expect(
      await screen.findByRole('img', { name: 'Signature preview' }),
    ).toBeTruthy();
    expect(client.clean).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalled();
  });

  it('stops the camera tracks on unmount', async () => {
    const { stream, track } = fakeStream();
    mockMedia(vi.fn().mockResolvedValue(stream));
    const view = render(
      <SignaturePhoto onChange={() => {}} client={fakeClient()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await screen.findByRole('button', { name: 'Stop' });
    await act(async () => {});
    view.unmount();
    expect(track.stop).toHaveBeenCalled();
  });
});
