import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const setWasmUrl = vi.fn();
const setWasmFallbackUrl = vi.fn();
vi.mock('@rive-app/react-canvas', () => ({
  RuntimeLoader: { setWasmUrl, setWasmFallbackUrl },
}));
vi.mock('@rive-app/canvas/rive.wasm?url', () => ({
  default: '/assets/rive.wasm',
}));
vi.mock('@rive-app/canvas/rive_fallback.wasm?url', () => ({
  default: '/assets/rive_fallback.wasm',
}));

const { configureSameOriginRuntime } = await import('./runtime');

describe('configureSameOriginRuntime', () => {
  it('serves the runtime and its fallback from this site, once', () => {
    configureSameOriginRuntime();
    configureSameOriginRuntime();
    expect(setWasmUrl).toHaveBeenCalledOnce();
    expect(setWasmUrl).toHaveBeenCalledWith('/assets/rive.wasm');
    expect(setWasmFallbackUrl).toHaveBeenCalledWith(
      '/assets/rive_fallback.wasm',
    );
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
