import { createToolStore } from '@/shared/state/createToolStore';

const MAX = 6;

/** Recently opened tool ids, newest first (a setting: ids only, no data). */
export const useRecentToolsStore = createToolStore({
  toolId: 'app-recent-tools',
  initial: { ids: [] as string[] },
  actions: (set, get) => ({
    visit: (id: string) => {
      const ids = get().ids;
      if (ids[0] === id) return;
      set({ ids: [id, ...ids.filter((x) => x !== id)].slice(0, MAX) });
    },
  }),
});

/** Whether the desktop navigation is collapsed (a setting). */
export const useNavStore = createToolStore({
  toolId: 'app-nav',
  initial: { collapsed: false },
  actions: (set, get) => ({
    toggle: () => set({ collapsed: !get().collapsed }),
  }),
});
