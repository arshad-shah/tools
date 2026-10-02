import type { RefObject } from 'react';
import {
  Alignment,
  EventType,
  Fit,
  Layout,
  Rive,
  RuntimeLoader,
  StateMachineInput,
  StateMachineInputType,
} from '@rive-app/react-canvas';
import wasmUrl from '@rive-app/canvas/rive.wasm?url';
import fallbackUrl from '@rive-app/canvas/rive_fallback.wasm?url';

/**
 * The kit's only door to the Rive runtime: creating, loading, laying out
 * and freeing an instance. Callers draw on `RivePlayer`'s canvas and read
 * the instance through the types re-exported here.
 */
export { Alignment, EventType, Fit, StateMachineInput, StateMachineInputType };
export type { Layout, Rive };

let configured = false;

/**
 * Points the Rive runtime at its WASM served from this site. Left alone it
 * downloads both the WASM and its fallback from cdn.jsdelivr.net, a
 * third-party request this app never makes (spec §3, Network).
 */
export function configureSameOriginRuntime(): void {
  if (configured) return;
  RuntimeLoader.setWasmUrl(wasmUrl);
  RuntimeLoader.setWasmFallbackUrl(fallbackUrl);
  configured = true;
}
configureSameOriginRuntime();

export interface RiveLayout {
  fit: Fit;
  alignment: Alignment;
}

export interface CreateRiveOptions extends RiveLayout {
  buffer: ArrayBuffer;
  canvas: HTMLCanvasElement;
  onLoad?: () => void;
  onLoadError?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

/** A new autoplaying instance drawing `buffer` on `canvas`. */
export function createRive({
  buffer,
  canvas,
  fit,
  alignment,
  ...handlers
}: CreateRiveOptions): Rive {
  return new Rive({
    buffer,
    canvas,
    autoplay: true,
    layout: new Layout({ fit, alignment }),
    ...handlers,
  });
}

/** Replaces the file an existing instance plays (autoplaying it). */
export function loadRive(rive: Rive, buffer: ArrayBuffer): void {
  rive.load({ buffer, autoplay: true });
}

/** How the artboard fits the canvas. */
export function setRiveLayout(rive: Rive, { fit, alignment }: RiveLayout) {
  rive.layout = new Layout({ fit, alignment });
}

/**
 * Drop the instance held in `ref` and free its WASM objects, renderer and
 * document listeners. `defer`: the caller is inside the instance's own event
 * dispatch, so it is freed once that dispatch has returned.
 */
export function disposeRive(ref: RefObject<Rive | null>, defer = false) {
  const rive = ref.current;
  ref.current = null;
  if (defer) queueMicrotask(() => rive?.cleanup());
  else rive?.cleanup();
}
