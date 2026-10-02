/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolError } from '@/shared/lib/errors';
import { CameraCapture, type CameraCaptureProps } from './camera-capture';
import { CAMERA_BLOCKED } from './camera-errors';

function fakeStream(caps: Record<string, unknown> = {}) {
  const track = {
    stop: vi.fn(),
    getCapabilities: () => caps,
    getSettings: () => ({ deviceId: 'cam-a' }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  };
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, track };
}

const devices = [
  { kind: 'videoinput', deviceId: 'cam-a', label: 'Front' },
  { kind: 'videoinput', deviceId: 'cam-b', label: 'Back' },
  { kind: 'audioinput', deviceId: 'mic', label: 'Mic' },
];

function mockMedia(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices: vi.fn().mockResolvedValue(devices),
    },
  });
}

function Harness(props: Partial<CameraCaptureProps>) {
  const [active, setActive] = useState(false);
  return (
    <CameraCapture
      label="Scanner camera"
      onError={() => {}}
      {...props}
      active={active}
      onActiveChange={setActive}
    />
  );
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
});

afterEach(() => {
  vi.useRealTimers();
  if (readyState)
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', readyState);
  Reflect.deleteProperty(navigator, 'mediaDevices');
  Reflect.deleteProperty(globalThis, 'createImageBitmap');
});

const flush = () => act(async () => {});

describe('CameraCapture', () => {
  it('Start requests the stream; Stop stops every track', async () => {
    const { stream, track } = fakeStream();
    const gum = vi.fn().mockResolvedValue(stream);
    mockMedia(gum);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(gum).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: 'environment' },
    });
    // Device choice appears after permission.
    expect(screen.getByRole('combobox', { name: 'Camera' })).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(track.stop).toHaveBeenCalled();
  });

  it('unmount stops every track', async () => {
    const { stream, track } = fakeStream();
    mockMedia(vi.fn().mockResolvedValue(stream));
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  it('active=false from the parent stops the tracks', async () => {
    const { stream, track } = fakeStream();
    mockMedia(vi.fn().mockResolvedValue(stream));
    const { rerender } = render(
      <CameraCapture active label="Cam" onError={() => {}} />,
    );
    await flush();
    rerender(<CameraCapture active={false} label="Cam" onError={() => {}} />);
    expect(track.stop).toHaveBeenCalled();
  });

  it('NotAllowedError reports the blocked message', async () => {
    const err = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    mockMedia(vi.fn().mockRejectedValue(err));
    const onError = vi.fn<(e: ToolError) => void>();
    render(<Harness onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].code).toBe('INVALID_INPUT');
    expect(onError.mock.calls[0][0].message).toBe(CAMERA_BLOCKED);
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('NotFoundError reports no camera', async () => {
    const err = Object.assign(new Error('none'), { name: 'NotFoundError' });
    mockMedia(vi.fn().mockRejectedValue(err));
    const onError = vi.fn<(e: ToolError) => void>();
    render(<Harness onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(onError.mock.calls[0][0].code).toBe('UNSUPPORTED_FEATURE');
    expect(onError.mock.calls[0][0].message).toBe('No camera found');
  });

  it('calls onFrame at about fps', async () => {
    vi.useFakeTimers();
    const { stream } = fakeStream();
    mockMedia(vi.fn().mockResolvedValue(stream));
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: vi.fn().mockResolvedValue(bitmap),
    });
    const onFrame = vi.fn();
    render(<Harness onFrame={onFrame} fps={8} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(onFrame.mock.calls.length).toBeGreaterThanOrEqual(7);
    expect(onFrame.mock.calls.length).toBeLessThanOrEqual(9);
    expect(onFrame).toHaveBeenCalledWith(bitmap);
  });

  it('shows the torch only with the capability', async () => {
    mockMedia(vi.fn().mockResolvedValue(fakeStream().stream));
    const first = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    expect(screen.queryByRole('switch', { name: 'Torch' })).toBeNull();
    first.unmount();

    const { stream, track } = fakeStream({ torch: true });
    mockMedia(vi.fn().mockResolvedValue(stream));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await flush();
    fireEvent.click(screen.getByRole('switch', { name: 'Torch' }));
    await flush();
    expect(track.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ torch: true }],
    });
    expect(
      screen
        .getByRole('switch', { name: 'Torch' })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });
});
