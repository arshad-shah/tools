/**
 * Test helper (imported by tests only): a recording 2D context per canvas,
 * a fixed 600 by 260 box, a ResizeObserver that fires on observe, frames
 * run at once, and known token colours.
 */
import { vi } from 'vitest';
import {
  recordingContext,
  type RecordingContext,
} from '@/shared/diagram/test-canvas';

const contexts = new WeakMap<HTMLCanvasElement, RecordingContext>();

export const COLORS = {
  '--chart-1': '#111111',
  '--chart-2': '#222222',
  '--line': '#dddddd',
  '--fg-muted': '#777777',
  '--surface': '#ffffff',
  '--accent': '#0000ff',
};

export function installChartStubs() {
  for (const [k, v] of Object.entries(COLORS))
    document.documentElement.style.setProperty(k, v);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private cb: () => void) {}
      observe() {
        this.cb();
      }
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      let ctx = contexts.get(this);
      if (!ctx) contexts.set(this, (ctx = recordingContext()));
      return ctx as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    x: 0,
    y: 0,
    width: 600,
    height: 260,
    right: 600,
    bottom: 260,
    toJSON: () => ({}),
  });
}

export function resetChartStubs() {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
}

export const contextOf = (canvas: HTMLElement) =>
  contexts.get(canvas as HTMLCanvasElement)!;
