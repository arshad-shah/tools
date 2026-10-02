import type { RefObject } from 'react';
import type { Rive } from '@rive-app/react-canvas';

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
