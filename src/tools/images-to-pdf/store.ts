import { createToolStore } from '@/shared/state/createToolStore';
import type { Orientation, PageSizeName } from '@/pdf/edit';

export const useImagesToPdfSettings = createToolStore({
  toolId: 'images-to-pdf',
  initial: {
    pageSize: 'a4' as PageSizeName,
    orientation: 'auto' as Orientation,
    marginMm: 10,
  },
  actions: (set) => ({
    setPageSize: (pageSize: PageSizeName) => set({ pageSize }),
    setOrientation: (orientation: Orientation) => set({ orientation }),
    setMarginMm: (marginMm: number) => set({ marginMm }),
  }),
});
