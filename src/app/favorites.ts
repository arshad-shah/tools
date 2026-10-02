import { useCallback } from 'react';
import { createToolStore } from '@/shared/state/createToolStore';

/**
 * Starred tool ids. Imports the pre-redesign localStorage key
 * 'favoriteTools' once, so users keep their stars (ids are unchanged).
 * Unknown ids (removed tools) stay stored; callers filter when listing.
 */
export const useFavoritesStore = createToolStore({
  toolId: 'app-favorites',
  initial: { ids: [] as string[] },
  actions: (set, get) => ({
    toggle: (id: string) => {
      const ids = get().ids;
      set({
        ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      });
    },
  }),
  legacy: {
    keys: ['favoriteTools'],
    read: (raw) => {
      const parsed: unknown = JSON.parse(raw.favoriteTools ?? '[]');
      if (!Array.isArray(parsed)) return null;
      return { ids: parsed.filter((x): x is string => typeof x === 'string') };
    },
  },
});

export function useFavorites(): {
  ids: string[];
  isFavorite(id: string): boolean;
  toggle(id: string): void;
} {
  const ids = useFavoritesStore((s) => s.ids);
  const toggle = useFavoritesStore((s) => s.toggle);
  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);
  return { ids, isFavorite, toggle };
}
