import { createToolStore } from '@/shared/state/createToolStore';
import type { CollectionType } from '../../types/ApiTesterTypes'; // PR C moves this to ./types
import { DEFAULT_COLLECTIONS } from './collections';

/** Saved request collections. Before store-kit they lived in `apiTesterCollections`. */
export const useApiCollections = createToolStore<
  { collections: CollectionType[] },
  { setCollections(collections: CollectionType[]): void }
>({
  toolId: 'api-request',
  initial: { collections: DEFAULT_COLLECTIONS },
  actions: (set) => ({
    setCollections: (collections) => set({ collections }),
  }),
  legacy: {
    keys: ['apiTesterCollections'],
    read: (raw) => {
      if (!raw.apiTesterCollections) return null;
      const parsed: unknown = JSON.parse(raw.apiTesterCollections);
      // Well-formed JSON of the wrong shape would crash the tool on every
      // load once persisted: import nothing instead.
      return isCollectionList(parsed) ? { collections: parsed } : null;
    },
  },
});

function isCollectionList(v: unknown): v is CollectionType[] {
  return (
    Array.isArray(v) &&
    v.every(
      (c) =>
        typeof c === 'object' &&
        c !== null &&
        (c as CollectionType).type === 'folder' &&
        Array.isArray((c as CollectionType).children),
    )
  );
}
