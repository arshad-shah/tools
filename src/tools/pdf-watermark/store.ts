import { createToolStore } from '@/shared/state/createToolStore';
import type { Anchor } from '@/pdf/edit';

export type WatermarkMode = 'text' | 'image';

/** Settings only: the PDF and the watermark image are never persisted. */
export const useWatermarkSettings = createToolStore({
  toolId: 'pdf-watermark',
  initial: {
    mode: 'text' as WatermarkMode,
    text: 'CONFIDENTIAL',
    fontSize: 48,
    color: '#9ca3af',
    widthPercent: 40,
    opacityPercent: 30,
    rotation: 45,
    position: 'center' as Anchor,
  },
  actions: (set) => ({
    setMode: (mode: WatermarkMode) => set({ mode }),
    setText: (text: string) => set({ text }),
    setFontSize: (fontSize: number) => set({ fontSize }),
    setColor: (color: string) => set({ color }),
    setWidthPercent: (widthPercent: number) => set({ widthPercent }),
    setOpacityPercent: (opacityPercent: number) => set({ opacityPercent }),
    setRotation: (rotation: number) => set({ rotation }),
    setPosition: (position: Anchor) => set({ position }),
  }),
});
