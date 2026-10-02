import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Rive } from './rive-runtime';

const { setWasmUrl, setWasmFallbackUrl, created } = vi.hoisted(() => ({
  setWasmUrl: vi.fn(),
  setWasmFallbackUrl: vi.fn(),
  created: [] as unknown[],
}));
vi.mock('@rive-app/react-canvas', () => ({
  RuntimeLoader: { setWasmUrl, setWasmFallbackUrl },
  Rive: class {
    layout: unknown;
    load = vi.fn();
    constructor(public params: { layout: unknown }) {
      this.layout = params.layout;
      created.push(this);
    }
  },
  Layout: class {
    constructor(public params: unknown) {}
  },
}));
vi.mock('@rive-app/canvas/rive.wasm?url', () => ({
  default: '/assets/rive.wasm',
}));
vi.mock('@rive-app/canvas/rive_fallback.wasm?url', () => ({
  default: '/assets/rive_fallback.wasm',
}));

const {
  configureSameOriginRuntime,
  createRive,
  disposeRive,
  loadRive,
  setRiveLayout,
} = await import('./rive-runtime');
// Configured on import, before any instance can fetch the WASM.
const atImport = [...setWasmUrl.mock.calls, ...setWasmFallbackUrl.mock.calls];

const layout = (fit: string, alignment: string) =>
  ({ fit, alignment }) as unknown as Parameters<typeof setRiveLayout>[1];

describe('configureSameOriginRuntime', () => {
  it('serves the runtime and its fallback from this site, once', () => {
    expect(atImport).toEqual([
      ['/assets/rive.wasm'],
      ['/assets/rive_fallback.wasm'],
    ]);
    const before = setWasmUrl.mock.calls.length;
    configureSameOriginRuntime();
    configureSameOriginRuntime();
    expect(setWasmUrl.mock.calls.length).toBe(before);
  });

  it('pins @rive-app/canvas to the version @rive-app/react-canvas runs', () => {
    const pkg = (p: string) =>
      JSON.parse(readFileSync(`node_modules/${p}/package.json`, 'utf8')) as {
        version: string;
        dependencies: Record<string, string>;
      };
    expect(pkg('@rive-app/canvas').version).toBe(
      pkg('@rive-app/react-canvas').dependencies['@rive-app/canvas'],
    );
  });
});

describe('instance lifecycle', () => {
  it('creates an autoplaying instance with its layout and handlers', () => {
    const canvas = {} as HTMLCanvasElement;
    const buffer = new ArrayBuffer(4);
    const onLoad = vi.fn();
    const rive = createRive({
      buffer,
      canvas,
      ...layout('cover', 'center'),
      onLoad,
    }) as unknown as { params: Record<string, unknown> };
    expect(created.at(-1)).toBe(rive);
    expect(rive.params).toMatchObject({
      buffer,
      canvas,
      autoplay: true,
      onLoad,
    });
    expect(rive.params.layout).toMatchObject({
      params: { fit: 'cover', alignment: 'center' },
    });
  });

  it('loads a new file into an instance and lays it out again', () => {
    const rive = createRive({
      buffer: new ArrayBuffer(1),
      canvas: {} as HTMLCanvasElement,
      ...layout('cover', 'center'),
    });
    const next = new ArrayBuffer(2);
    loadRive(rive, next);
    expect(rive.load).toHaveBeenCalledWith({ buffer: next, autoplay: true });
    setRiveLayout(rive, layout('fill', 'topLeft'));
    expect(rive.layout).toMatchObject({
      params: { fit: 'fill', alignment: 'topLeft' },
    });
  });
});

const holder = () => {
  const rive = { cleanup: vi.fn() };
  return { rive, ref: { current: rive as unknown as Rive | null } };
};

describe('disposeRive', () => {
  it('drops the instance and cleans it up at once', () => {
    const { rive, ref } = holder();
    disposeRive(ref);
    expect(ref.current).toBeNull();
    expect(rive.cleanup).toHaveBeenCalledTimes(1);
  });

  it('defers the cleanup to a microtask when asked', async () => {
    const { rive, ref } = holder();
    disposeRive(ref, true);
    expect(ref.current).toBeNull();
    expect(rive.cleanup).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(rive.cleanup).toHaveBeenCalledTimes(1);
  });

  it('is a no-op on an empty ref', () => {
    expect(() => disposeRive({ current: null })).not.toThrow();
  });
});
