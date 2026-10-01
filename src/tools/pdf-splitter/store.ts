import { createToolStore } from '@/shared/state/createToolStore';
import type { SplitMode } from './lib/plan';

export const useSplitterSettings = createToolStore({
  toolId: 'pdf-splitter',
  initial: { mode: 'selection' as SplitMode, everyN: 2 },
  actions: (set) => ({
    setMode: (mode: SplitMode) => set({ mode }),
    setEveryN: (everyN: number) => set({ everyN }),
  }),
});
