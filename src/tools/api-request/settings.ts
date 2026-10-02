import { createToolSettings } from '@/shared/lib/tool-settings';
import { migrateCollections, type Folder } from './lib/collections-migrate';
import { DEFAULT_COLLECTIONS } from './lib/collections';
import type { Environment } from './lib/env';
import type { HistoryEntry } from './lib/history';

export type HttpClientSettings = {
  /** Saved requests (the v1 store's data, migrated). */
  collections: Folder[];
  /** Secret values are emptied unless the environment remembers them. */
  environments: Environment[];
  /** Environment id; '' for none. */
  activeEnv: string;
  /** Opt-in: keep the history summary across visits. */
  historyPersist: boolean;
  /** Only written while historyPersist is on; summaries, never bodies. */
  history: HistoryEntry[];
  timeoutMs: number;
};

export const DEFAULT_TIMEOUT_MS = 30_000;

export const HTTP_DEFAULTS: HttpClientSettings = {
  collections: migrateCollections(DEFAULT_COLLECTIONS),
  environments: [],
  activeEnv: '',
  historyPersist: false,
  history: [],
  timeoutMs: DEFAULT_TIMEOUT_MS,
};

/** v1 was `{ collections }` of flat requests (createToolStore). */
export function migrateSettings(
  old: unknown,
  fromVersion: number,
): HttpClientSettings {
  const state =
    typeof old === 'object' && old !== null
      ? (old as Record<string, unknown>)
      : {};
  if (fromVersion < 2 && Array.isArray(state.collections))
    return {
      ...HTTP_DEFAULTS,
      collections: migrateCollections(state.collections),
    };
  return HTTP_DEFAULTS;
}

const LEGACY_KEY = 'apiTesterCollections';
const STORE_KEY = 'kit:store:tool:api-request';

/**
 * Collections saved before store-kit (`apiTesterCollections`) become a v1
 * store envelope when there is no store yet, so `migrate` imports them.
 * Malformed or wrong-shape data is ignored and its key kept.
 */
export function stageLegacyCollections(): void {
  try {
    const ls = globalThis.localStorage;
    if (!ls || ls.getItem(STORE_KEY) !== null) return;
    const raw = ls.getItem(LEGACY_KEY);
    if (raw === null) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || migrateCollections(parsed).length === 0)
      return;
    ls.setItem(
      STORE_KEY,
      JSON.stringify({ state: { collections: parsed }, version: 1 }),
    );
    ls.removeItem(LEGACY_KEY);
  } catch {
    // Storage blocked or bad JSON: start from the defaults.
  }
}

stageLegacyCollections();

/** Same store key as v1 (`kit:store:tool:api-request`), so collections stay. */
export const httpSettings = createToolSettings('api-request', HTTP_DEFAULTS, {
  version: 2,
  migrate: migrateSettings,
});
