import {
  PRESETS,
  type CompressSettings,
  type PresetId,
} from '@/pdf/compress/pipeline';
import { useSyncExternalStore } from 'react';
import { createToolStore } from '@/shared/state/createToolStore';

/** Image settings the advanced panel falls back to when images were off. */
export const DEFAULT_IMAGES = { targetDpi: 150, quality: 0.75 };

/** Compress choices in Optimize mode: a preset, optionally adjusted. */
export const useOptimizeSettings = createToolStore({
  toolId: 'pdf-optimize-mode',
  initial: {
    preset: 'balanced' as PresetId,
    settings: PRESETS.balanced as CompressSettings,
  },
  actions: (set, get) => ({
    choosePreset: (preset: PresetId) =>
      set({ preset, settings: PRESETS[preset] }),
    update: (patch: Partial<CompressSettings>) =>
      set({ settings: { ...get().settings, ...patch } }),
  }),
});

/** The phase-3 preset descriptions (Compress quick task). */
export const PRESET_DESCRIPTIONS: Record<PresetId, string> = {
  lossless:
    'Restructures the file without touching images. Never lowers quality.',
  balanced:
    'Downsamples images above 150 DPI and re-encodes them as JPEG at 75% quality. Good for sharing.',
  strong:
    'Downsamples images above 96 DPI at 60% quality and removes document metadata. Smallest files.',
};

let refreshes = 0;
const listeners = new Set<() => void>();

/** Measures the size breakdown again (toolbar and command). */
export function refreshSizeBreakdown(): void {
  refreshes++;
  for (const l of [...listeners]) l();
}

export function useSizeBreakdownRefresh(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => refreshes,
  );
}
