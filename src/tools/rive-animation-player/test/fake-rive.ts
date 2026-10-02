import { vi } from 'vitest';
import type { Layout } from '@rive-app/react-canvas';

type Callback = () => void;
export interface FakeRiveParams {
  layout: Layout;
  canvas: HTMLCanvasElement;
  onLoad?: Callback;
  onLoadError?: Callback;
  onPlay?: Callback;
  onPause?: Callback;
  onStop?: Callback;
}

/**
 * A stand-in for the Rive runtime (tests only): lists are empty until the
 * file "loads", stop() fires Stop synchronously once loaded, as the real
 * runtime does, and the artboard list comes from `contents`, which the real
 * runtime leaves undefined until load.
 */
export class FakeRive {
  static instances: FakeRive[] = [];
  /** Artboards of the next file "loaded"; the first is the default. */
  static artboards = ['Main'];
  params: FakeRiveParams;
  loaded = false;
  layouts: unknown[] = [];
  fps = 0;
  artboard = FakeRive.artboards[0];
  stop = vi.fn(() => {
    if (this.loaded) this.params.onStop?.();
  });
  play = vi.fn();
  pause = vi.fn();
  load = vi.fn();
  cleanup = vi.fn();
  reset = vi.fn((params?: { artboard?: string }) => {
    if (params?.artboard) this.artboard = params.artboard;
  });
  resizeToCanvas = vi.fn();
  stateMachineInputs = vi.fn((): unknown[] => []);
  /** Set to make the next constructor call throw it. */
  static failNext: Error | null = null;
  constructor(params: FakeRiveParams) {
    const failure = FakeRive.failNext;
    FakeRive.failNext = null;
    if (failure) throw failure;
    this.params = params;
    this.layout = params.layout;
    FakeRive.instances.push(this);
  }
  set layout(l: unknown) {
    this.layouts.push(l);
  }
  get activeArtboard() {
    return this.loaded ? this.artboard : '';
  }
  get contents() {
    if (!this.loaded) return undefined;
    return {
      artboards: FakeRive.artboards.map((name) => ({
        name,
        animations: [],
        stateMachines: [],
      })),
    };
  }
  get animationNames() {
    if (!this.loaded) return [];
    return this.artboard === 'Main' ? ['idle', 'run'] : [`${this.artboard}-a`];
  }
  get stateMachineNames() {
    if (!this.loaded) return [];
    return this.artboard === 'Main' ? ['machine'] : [`${this.artboard}-sm`];
  }
  finishLoad() {
    this.loaded = true;
    this.params.onLoad?.();
  }
}
