import { PRESETS, type PresetId } from '@/pdf/compress/pipeline';
import { createToolStore } from '@/shared/state/createToolStore';
import {
  matchPreset,
  toAdvanced,
  type AdvancedSettings,
  type PresetChoice,
} from './lib/settings';

export const useCompressorSettings = createToolStore({
  toolId: 'pdf-compressor',
  initial: {
    preset: 'balanced' as PresetChoice,
    advanced: toAdvanced(PRESETS.balanced),
  },
  actions: (set, get) => ({
    choosePreset: (id: PresetId) =>
      set({ preset: id, advanced: toAdvanced(PRESETS[id]) }),
    updateAdvanced: (patch: Partial<AdvancedSettings>) => {
      const advanced = { ...get().advanced, ...patch };
      set({ advanced, preset: matchPreset(advanced) });
    },
  }),
});
