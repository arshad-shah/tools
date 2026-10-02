import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordCanvas } from './record';

class FakeRecorder {
  static supported = true;
  static isTypeSupported = () => FakeRecorder.supported;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  start = vi.fn();
  stop() {
    this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2])]) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };
const canvas = {
  captureStream: vi.fn(() => ({ getTracks: () => [track] })),
} as unknown as HTMLCanvasElement;

beforeEach(() => {
  vi.useFakeTimers();
  FakeRecorder.supported = true;
  vi.stubGlobal('MediaRecorder', FakeRecorder);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('recordCanvas', () => {
  it('returns a WebM blob after the timer and stops the stream', async () => {
    const done = recordCanvas(canvas, 2, 30);
    await vi.advanceTimersByTimeAsync(2000);
    const blob = await done;
    expect(blob.type).toBe('video/webm');
    expect(blob.size).toBe(2);
    expect(canvas.captureStream).toHaveBeenCalledWith(30);
    expect(track.stop).toHaveBeenCalled();
  });

  it('rejects UNSUPPORTED_FEATURE when WebM recording is unavailable', async () => {
    FakeRecorder.supported = false;
    await expect(recordCanvas(canvas, 2)).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
    });
  });

  it('rejects CANCELLED when aborted', async () => {
    const ctrl = new AbortController();
    const done = recordCanvas(canvas, 5, 60, ctrl.signal);
    ctrl.abort();
    await expect(done).rejects.toMatchObject({ code: 'CANCELLED' });
  });
});
