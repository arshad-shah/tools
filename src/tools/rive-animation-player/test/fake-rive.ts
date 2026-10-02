import { vi } from 'vitest';
import type { EventType, Layout } from '@/shared/ui/adapters/rive-runtime';

type Callback = () => void;
type EventCallback = (e: { type: EventType; data?: unknown }) => void;
/** An instanced linear animation as the runtime's private animator holds it. */
export interface FakeAnimation {
  name: string;
  playing: boolean;
  scrubTo: number | null;
  animation: { duration: number; fps: number; loopValue: number };
  instance: { time: number };
}
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
  /** Artboard sizes reported by the file (by name; default 500 by 400). */
  static sizes: Record<string, { width: number; height: number }> = {};
  params: FakeRiveParams;
  loaded = false;
  layouts: unknown[] = [];
  fps = 0;
  artboard = FakeRive.artboards[0];
  listeners = new Map<string, Set<EventCallback>>();
  /** Instanced linear animations (the runtime's private `animator`). */
  animator: { animations: FakeAnimation[] } = { animations: [] };
  _boundDraw: ((time: number) => void) | null = () => {};
  stop = vi.fn(() => {
    if (this.loaded) this.params.onStop?.();
  });
  play = vi.fn((name?: string) => {
    if (!name || !this.animationNames.includes(name)) return;
    const found = this.animator.animations.find((a) => a.name === name);
    if (found) found.playing = true;
    else
      this.animator.animations.push({
        name,
        playing: true,
        scrubTo: null,
        animation: { duration: 120, fps: 60, loopValue: 1 },
        instance: { time: 0 },
      });
  });
  pause = vi.fn((name?: string) => {
    for (const a of this.animator.animations)
      if (!name || a.name === name) a.playing = false;
  });
  scrub = vi.fn((name: string, time: number) => {
    const a = this.animator.animations.find((x) => x.name === name);
    if (a) a.instance.time = time;
  });
  on = vi.fn((type: string, cb: EventCallback) => {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  });
  off = vi.fn((type: string, cb: EventCallback) => {
    this.listeners.get(type)?.delete(cb);
  });
  /** Fires a runtime event to the listeners added with `on`. */
  emit(type: EventType, data?: unknown) {
    for (const cb of this.listeners.get(type) ?? []) cb({ type, data });
  }
  textRuns: Record<string, string> = {};
  getTextRunValue = vi.fn((name: string) => this.textRuns[name]);
  setTextRunValue = vi.fn((name: string, value: string) => {
    if (name in this.textRuns) this.textRuns[name] = value;
  });
  viewModelInstance = null;
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
  /** The file's artboards, as the runtime's private `file` lists them. */
  get file() {
    if (!this.loaded) return null;
    const sizeOf = (name: string) =>
      FakeRive.sizes[name] ?? { width: 500, height: 400 };
    return {
      artboardCount: () => FakeRive.artboards.length,
      artboardByIndex: (i: number) => {
        const name = FakeRive.artboards[i];
        return name ? { name, ...sizeOf(name), delete: () => {} } : null;
      },
    };
  }
  get artboardWidth() {
    return this.loaded ? 500 : 0;
  }
  get artboardHeight() {
    return this.loaded ? 400 : 0;
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
