import { RuntimeLoader } from '@rive-app/react-canvas';
import wasmUrl from '@rive-app/canvas/rive.wasm?url';
import fallbackUrl from '@rive-app/canvas/rive_fallback.wasm?url';

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
