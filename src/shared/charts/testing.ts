/**
 * Test helpers for swift-chart (imported by tests only): every canvas gets a
 * recording 2D context (with gradients), boxes measure 600 by 300, frames
 * run at once and a ResizeObserver fires on observe.
 */
import { vi } from 'vitest';
import {
  recordingContext,
  type RecordingContext,
} from '@/shared/diagram/test-canvas';

const contexts = new WeakMap<HTMLCanvasElement, RecordingContext>();
const gradient = () => ({ addColorStop() {} });

export function installChartStubs() {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(performance.now() + 10_000);
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
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      let ctx = contexts.get(this);
      if (!ctx) {
        ctx = recordingContext();
        const target = ctx as unknown as Record<string, unknown>;
        target.createLinearGradient = gradient;
        target.createRadialGradient = gradient;
        target.getLineDash = () => [];
        contexts.set(this, ctx);
      }
      return ctx as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,iVBORw0KGgo=',
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    x: 0,
    y: 0,
    width: 600,
    height: 300,
    right: 600,
    bottom: 300,
    toJSON: () => ({}),
  });
  for (const prop of ['clientWidth', 'offsetWidth'] as const)
    vi.spyOn(HTMLElement.prototype, prop, 'get').mockReturnValue(600);
  for (const prop of ['clientHeight', 'offsetHeight'] as const)
    vi.spyOn(HTMLElement.prototype, prop, 'get').mockReturnValue(300);
}

export function resetChartStubs() {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
}

/** The recording context of a chart canvas. */
export const contextOf = (canvas: Element) =>
  contexts.get(canvas as HTMLCanvasElement)!;

/** Every text a chart canvas drew, in order. */
export const textsOf = (canvas: Element) =>
  contextOf(canvas).texts() as string[];

/** Every colour a chart canvas stroked or filled with. */
export function coloursOf(canvas: Element): Set<string> {
  const out = new Set<string>();
  for (const c of contextOf(canvas).calls) {
    if (c.name === 'stroke' || c.name === 'lineTo') out.add(c.strokeStyle);
    if (c.name === 'fill' || c.name === 'fillRect') out.add(c.fillStyle);
  }
  return out;
}

/**
 * A chart's canvas by its accessible name. A chart with a click handler is
 * an "interactive chart" (no `img` role), so look it up by its label.
 */
export function chartCanvas(name: string): HTMLCanvasElement {
  const el = document.querySelector<HTMLCanvasElement>(
    `canvas[aria-label="${name}"]`,
  );
  if (!el) throw new Error(`No chart named ${name}`);
  return el;
}

/** Only a recording 2D context on canvases (for tools that hold charts). */
export function stubChartCanvas() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      let ctx = contexts.get(this);
      if (!ctx) {
        ctx = recordingContext();
        const target = ctx as unknown as Record<string, unknown>;
        target.createLinearGradient = gradient;
        target.createRadialGradient = gradient;
        contexts.set(this, ctx);
      }
      return ctx as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
}
