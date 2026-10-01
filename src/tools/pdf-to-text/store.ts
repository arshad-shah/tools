import { createToolStore } from '@/shared/state/createToolStore';
import type { TextMode } from './lib/output';

export const useTextSettings = createToolStore({
  toolId: 'pdf-to-text',
  initial: { mode: 'combined' as TextMode },
  actions: (set) => ({
    setMode: (mode: TextMode) => set({ mode }),
  }),
});
