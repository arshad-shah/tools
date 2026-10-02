import { useShallow } from 'zustand/react/shallow';
import { createToolStore } from '@/shared/state/createToolStore';

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export interface ToolSettingsOptions<S> {
  /** Bump when the settings shape changes; `migrate` then runs once. */
  version: number;
  /** Older stored state (and its version) to the current shape. */
  migrate?: (old: unknown, fromVersion: number) => S;
}

export interface ToolSettings<S> {
  /** `[settings, update(patch), reset()]` */
  useSettings(): [S, (patch: Partial<S>) => void, () => void];
  getSettings(): S;
}

const kindOf = (v: unknown) =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;

/** Throws unless `value` survives a JSON round trip unchanged in shape. */
function assertJson(value: unknown, path: string): void {
  const kind = kindOf(value);
  if (kind === 'string' || kind === 'boolean' || kind === 'null') return;
  if (kind === 'number') {
    if (Number.isFinite(value)) return;
  } else if (kind === 'array') {
    (value as unknown[]).forEach((v, i) => assertJson(v, `${path}[${i}]`));
    return;
  } else if (
    kind === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    for (const [k, v] of Object.entries(value as object))
      assertJson(v, `${path}.${k}`);
    return;
  }
  throw new TypeError(`Setting ${path} is not a JSON value`);
}

/**
 * Persisted tool options (spec §4.5): a thin wrapper over createToolStore, so
 * the store key stays `kit:store:tool:<id>` and existing stores keep their
 * data through `migrate`. Settings only, never inputs or results; each tool's
 * settings test runs `assertNoDataFields` on its defaults.
 */
export function createToolSettings<S extends { [K in keyof S]: Json }>(
  toolId: string,
  defaults: S,
  opts: ToolSettingsOptions<S>,
): ToolSettings<S> {
  const keys = Object.keys(defaults) as (keyof S & string)[];

  // Stored values are only trusted when they have the default's JSON kind.
  const sanitize = (state: unknown): Partial<S> => {
    if (kindOf(state) !== 'object') return {};
    const out: Partial<S> = {};
    for (const k of keys) {
      const v = (state as Record<string, unknown>)[k];
      if (v !== undefined && kindOf(v) === kindOf(defaults[k]))
        out[k] = v as S[typeof k];
    }
    return out;
  };

  const store = createToolStore<S, { update: (patch: Partial<S>) => void }>({
    toolId,
    initial: defaults,
    actions: (set) => ({
      update: (patch) => {
        if (import.meta.env.DEV) assertJson(patch, 'settings');
        set(patch);
      },
    }),
    persist: {
      version: opts.version,
      // Runs migrate with the stored version (store-kit's own chain only
      // passes the state), then drops unknown or mistyped keys.
      deserialize: (raw) => {
        const env = JSON.parse(raw) as { version?: unknown; state?: unknown };
        if (typeof env?.version !== 'number') return env;
        let state = env.state;
        if (env.version < opts.version) {
          if (!opts.migrate) return null;
          state = opts.migrate(state, env.version);
        } else if (env.version > opts.version) return null;
        return { version: opts.version, state: sanitize(state) };
      },
    },
  });

  const pick = (s: S): S => {
    const out = {} as S;
    for (const k of keys) out[k] = s[k];
    return out;
  };
  const reset = () => store.reset();

  return {
    useSettings() {
      const settings = store(useShallow(pick));
      const update = store((s) => s.update);
      return [settings, update, reset];
    },
    getSettings: () => pick(store.getState()),
  };
}
