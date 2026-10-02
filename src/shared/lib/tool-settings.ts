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

/**
 * Whether a stored value has the shape of its default. Kinds must match;
 * array elements must each match some element of a non-empty default (an
 * empty default only requires one kind throughout); an object must give
 * every key of its default a matching value (`whole`), or, as an array
 * element, match the keys it has. Extra keys are allowed, so a default of
 * `{}` is a free-form map; a nested null default accepts any value.
 */
function matches(value: unknown, def: unknown, whole = true): boolean {
  const kind = kindOf(value);
  if (kind !== kindOf(def)) return false;
  if (kind === 'array') {
    const items = value as unknown[];
    const templates = def as unknown[];
    if (templates.length === 0)
      return items.every((v) => kindOf(v) === kindOf(items[0]));
    return items.every((v) => templates.some((t) => fits(v, t, false)));
  }
  if (kind === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.entries(def as Record<string, unknown>).every(([k, d]) =>
      Object.hasOwn(obj, k) ? fits(obj[k], d, whole) : !whole,
    );
  }
  return true;
}

/** Inside a default, null marks a nullable value of any kind. */
const fits = (value: unknown, def: unknown, whole: boolean) =>
  def === null || matches(value, def, whole);

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

  // Stored values are only trusted when they have the default's shape.
  const sanitize = (state: unknown): Partial<S> => {
    if (kindOf(state) !== 'object') return {};
    const out: Partial<S> = {};
    for (const k of keys) {
      const v = (state as Record<string, unknown>)[k];
      if (v !== undefined && matches(v, defaults[k])) out[k] = v as S[typeof k];
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
