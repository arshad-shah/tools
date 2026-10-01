import { createToolStore } from '@/shared/state/createToolStore';
import type { EdgeAnchor, PageNumberFormat } from '@/pdf/edit';

export const usePageNumberSettings = createToolStore({
  toolId: 'pdf-page-numbers',
  initial: {
    format: 'n' as PageNumberFormat,
    position: 'bottom-center' as EdgeAnchor,
    startAt: 1,
    fontSize: 11,
  },
  actions: (set) => ({
    setFormat: (format: PageNumberFormat) => set({ format }),
    setPosition: (position: EdgeAnchor) => set({ position }),
    setStartAt: (startAt: number) => set({ startAt }),
    setFontSize: (fontSize: number) => set({ fontSize }),
  }),
});
