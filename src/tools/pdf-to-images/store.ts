import { createToolStore } from '@/shared/state/createToolStore';
import type { ImageFormat } from '@/pdf/render';

export const useImageExportSettings = createToolStore({
  toolId: 'pdf-to-images',
  initial: { format: 'png' as ImageFormat, dpi: 150, quality: 0.85 },
  actions: (set) => ({
    setFormat: (format: ImageFormat) => set({ format }),
    setDpi: (dpi: number) => set({ dpi }),
    setQuality: (quality: number) => set({ quality }),
  }),
});
