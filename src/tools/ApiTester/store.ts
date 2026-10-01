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
    read: (raw) =>
      raw.apiTesterCollections
        ? {
            collections: JSON.parse(
              raw.apiTesterCollections,
            ) as CollectionType[],
          }
        : null,
  },
});
