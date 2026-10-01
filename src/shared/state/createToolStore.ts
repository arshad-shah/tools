import { createStore } from '@arshad-shah/store-kit';

type SetState<S> = (partial: Partial<S> | ((s: S) => Partial<S>)) => void;
type GetState<S> = () => S;

interface LegacyImport<S> {
  /** Pre-store-kit localStorage keys this tool used to write. */
  keys: readonly string[];
  /**
   * Raw legacy strings (null when absent) → state to import; null = nothing
   * to import. May throw: the tool then starts from defaults and the legacy
   * keys are kept.
   */
  read: (raw: Record<string, string | null>) => Partial<S> | null;
}

interface ToolStoreConfig<S extends object, A extends object> {
  toolId: string;
  initial: S;
  actions?: (set: SetState<S>, get: GetState<S>) => A;
  /**
   * Settings only — never documents, bytes or results. `false` keeps the
   * store in memory.
   */
  persist?:
    | false
    | {
        version?: number;
        migrate?: Record<number, (persisted: unknown) => Partial<S>>;
      };
  /**
   * One-time import of data a tool stored before it used createToolStore.
   * Runs only when persistence is on and the store has no saved state yet.
   */
  legacy?: LegacyImport<S>;
}

const storageKeyFor = (toolId: string) => `kit:store:tool:${toolId}`;

export function createToolStore<S extends object, A extends object = object>(
  config: ToolStoreConfig<S, A>,
) {
  // Set when store-kit fails to write the state (full quota, …), so the
  // legacy import can tell a saved import from one that lives only in memory.
  let persistFailed = false;
  const store = createStore<S, A>({
    // store-kit prefixes this: the real localStorage key is
    // `kit:store:tool:<toolId>` (see arshad-shah/Kit#94).
    name: `tool:${config.toolId}`,
    initial: config.initial,
    actions: config.actions,
    persist:
      config.persist === false
        ? undefined
        : { storage: 'local', version: 1, ...config.persist },
    onError: (error, info) => {
      if (info.op === 'persist') persistFailed = true;
      console.warn(`[tool:${config.toolId}:${info.op}]`, error);
    },
  });
  if (config.persist !== false && config.legacy) {
    importLegacy(
      // Partial<S> only touches state fields, never actions.
      (partial) => {
        persistFailed = false;
        store.setState(partial as Partial<S & A>);
        return !persistFailed;
      },
      config.toolId,
      config.legacy,
    );
  }
  return store;
}

function importLegacy<S>(
  /** Applies the import; false when it could not be saved. */
  apply: (partial: Partial<S>) => boolean,
  toolId: string,
  legacy: LegacyImport<S>,
): void {
  let ls: Storage;
  try {
    ls = globalThis.localStorage;
    if (!ls || ls.getItem(storageKeyFor(toolId)) !== null) return;
  } catch {
    return; // storage blocked (private mode): nothing to import
  }
  try {
    const raw = Object.fromEntries(legacy.keys.map((k) => [k, ls.getItem(k)]));
    if (Object.values(raw).every((v) => v === null)) return;
    const partial = legacy.read(raw);
    // setState (not `initial`) so store-kit persists it and reset() still
    // returns to the defaults.
    if (partial && !apply(partial)) {
      // Only in memory: keep the legacy keys so the next visit can retry.
      throw new Error('Imported data could not be saved; legacy keys kept');
    }
    legacy.keys.forEach((k) => ls.removeItem(k));
  } catch (error) {
    console.warn(`[tool:${toolId}:legacy]`, error);
  }
}
