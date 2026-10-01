import { createStore } from '@arshad-shah/store-kit';

type SetState<S> = (partial: Partial<S> | ((s: S) => Partial<S>)) => void;
type GetState<S> = () => S;

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
}

export function createToolStore<S extends object, A extends object = object>(
  config: ToolStoreConfig<S, A>,
) {
  return createStore<S, A>({
    // store-kit prefixes this: the real localStorage key is
    // `kit:store:tool:<toolId>` (see arshad-shah/Kit#94).
    name: `tool:${config.toolId}`,
    initial: config.initial,
    actions: config.actions,
    persist:
      config.persist === false
        ? undefined
        : { storage: 'local', version: 1, ...config.persist },
    onError: (error, info) =>
      console.warn(`[tool:${config.toolId}:${info.op}]`, error),
  });
}
