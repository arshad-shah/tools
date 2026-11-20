import { createToolSettings } from '@/shared/lib/tool-settings';
import type { CropAspect } from './lib/crop';
import type { ExportFormat } from './lib/export';

export interface AnnotateSettings {
  /** Colour for new objects. */
  color: string;
  /** Stroke width for new objects, image pixels. */
  width: number;
  format: ExportFormat;
  /** JPEG and WebP quality, 0..1. */
  quality: number;
  aspect: CropAspect;
}

export const ANNOTATE_DEFAULTS: AnnotateSettings = {
  color: '#e11d48',
  width: 6,
  format: 'png',
  quality: 0.9,
  aspect: 'free',
};

export const annotateSettings = createToolSettings(
  'image-annotate',
  ANNOTATE_DEFAULTS,
  { version: 1 },
);

/** Colour presets offered beside the picker (named for screen readers). */
export const SWATCHES = [
  { value: '#e11d48', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#16a34a', label: 'Green' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#9333ea', label: 'Purple' },
  { value: '#000000', label: 'Black' },
  { value: '#ffffff', label: 'White' },
];
