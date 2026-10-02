import { ToolError } from '@/shared/lib/errors';
import {
  PRESETS,
  type CompressSettings,
  type PresetId,
  type QpdfSettings,
} from '@/pdf/compress/pipeline';
import { defineOperation } from '../registry';
import { asRecord } from './validate';

export interface OptimizeCompressParams {
  preset: PresetId;
  /** The preset's settings when absent. Never linearizes (that is an export option). */
  settings?: CompressSettings;
}

export type OptimizeRepairParams = Record<string, never>;

export const PRESET_LABELS: Record<PresetId, string> = {
  lossless: 'Lossless',
  balanced: 'Balanced',
  strong: 'Strong',
};

/** Whether the settings are exactly the preset's (otherwise they are custom). */
export function isPresetSettings(p: OptimizeCompressParams): boolean {
  return (
    !p.settings ||
    JSON.stringify(p.settings) === JSON.stringify(PRESETS[p.preset])
  );
}

const bad = (m: string) => new ToolError('INVALID_INPUT', m);
const QPDF_KEYS: (keyof QpdfSettings)[] = [
  'objectStreams',
  'recompressFlate',
  'removeUnreferenced',
  'linearize',
];

function settings(v: unknown): CompressSettings {
  const o = asRecord(v, 'Compression');
  let images: CompressSettings['images'] = null;
  if (o.images !== null) {
    const i = asRecord(o.images, 'Compression images');
    if (
      !Number.isInteger(i.targetDpi) ||
      (i.targetDpi as number) < 36 ||
      (i.targetDpi as number) > 1200
    )
      throw bad('Target resolution must be a whole number from 36 to 1200 DPI');
    if (typeof i.quality !== 'number' || !(i.quality >= 0.1 && i.quality <= 1))
      throw bad('JPEG quality must be between 10% and 100%');
    images = { targetDpi: i.targetDpi as number, quality: i.quality };
  }
  const q = asRecord(o.qpdf, 'Compression');
  if (!QPDF_KEYS.every((k) => typeof q[k] === 'boolean'))
    throw bad('Compression: bad restructure settings');
  if (typeof o.stripMetadata !== 'boolean')
    throw bad('Compression: bad metadata setting');
  return {
    images,
    qpdf: {
      objectStreams: q.objectStreams as boolean,
      recompressFlate: q.recompressFlate as boolean,
      removeUnreferenced: q.removeUnreferenced as boolean,
      // A checkpoint is rewritten at export, which would undo linearization.
      linearize: false,
    },
    stripMetadata: o.stripMetadata,
  };
}

export const compressDocument = defineOperation<OptimizeCompressParams>({
  type: 'optimize.compress',
  v: 1,
  kind: 'checkpoint',
  mode: 'optimize',
  validate(p) {
    const o = asRecord(p, 'Compress');
    if (typeof o.preset !== 'string' || !Object.hasOwn(PRESETS, o.preset))
      throw bad('Compress: unknown preset');
    const preset = o.preset as PresetId;
    return {
      preset,
      settings: settings(
        o.settings === undefined ? PRESETS[preset] : o.settings,
      ),
    };
  },
  label: (p) =>
    `Compress (${isPresetSettings(p) ? PRESET_LABELS[p.preset] : 'Custom'})`,
});

export const repairDocument = defineOperation<OptimizeRepairParams>({
  type: 'optimize.repair',
  v: 1,
  kind: 'checkpoint',
  mode: 'optimize',
  validate(p) {
    asRecord(p, 'Repair');
    return {};
  },
  label: () => 'Repair',
});

export const OPTIMIZE_OPS = [compressDocument, repairDocument] as const;
