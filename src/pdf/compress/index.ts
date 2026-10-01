// Unit tests import the specific modules, never this barrel, so they never
// touch `Worker`.
export {
  compressPdf,
  PRESETS,
  type CompressDeps,
  type CompressReport,
  type CompressSettings,
  type PresetId,
  type QpdfSettings,
  type StageReport,
} from './pipeline';
export type { ImageReport, ImageSettings } from './recompress';
export { browserCompressDeps } from './client';
