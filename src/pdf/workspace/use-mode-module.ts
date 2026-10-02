import { useEffect, useState } from 'react';
import { logToolError, toToolError, type ToolError } from '@/shared/lib/errors';
import { registerOperations } from '@/pdf/doc/registry';
import type { ModeId } from '@/pdf/doc/types';
import type { ModeManifest, ModeModule } from './modes/types';

const loaded = new WeakMap<ModeManifest, Promise<ModeModule>>();

/** Loads a mode once and registers its operations (duplicates are no-ops). */
function loadMode(manifest: ModeManifest): Promise<ModeModule> {
  let p = loaded.get(manifest);
  if (!p) {
    p = manifest.load().then(({ default: mod }) => {
      registerOperations(mod.operations);
      return mod;
    });
    p.catch(() => loaded.delete(manifest));
    loaded.set(manifest, p);
  }
  return p;
}

/** The active mode's module, loaded lazily. */
export function useModeModule(manifest: ModeManifest): {
  module: ModeModule | null;
  error: ToolError | null;
} {
  const [state, setState] = useState<{
    id: ModeId;
    module: ModeModule | null;
    error: ToolError | null;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    loadMode(manifest).then(
      (module) => alive && setState({ id: manifest.id, module, error: null }),
      (e) => {
        const error = toToolError(e, `Could not load ${manifest.label}`);
        logToolError(error);
        if (alive) setState({ id: manifest.id, module: null, error });
      },
    );
    return () => {
      alive = false;
    };
  }, [manifest]);
  if (state?.id !== manifest.id) return { module: null, error: null };
  return { module: state.module, error: state.error };
}
