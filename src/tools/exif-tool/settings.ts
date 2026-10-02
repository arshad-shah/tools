import { createToolSettings } from '@/shared/lib/tool-settings';

/** What the cleaner keeps: options only, never files or metadata. */
export type ExifSettings = {
  /** Keep the ICC colour profile so colours look the same. */
  keepIcc: boolean;
  /** Keep the EXIF orientation so photos stay upright. */
  keepOrientation: boolean;
};

export const EXIF_DEFAULTS: ExifSettings = {
  keepIcc: true,
  keepOrientation: false,
};

export const exifSettings = createToolSettings<ExifSettings>(
  'exif-tool',
  EXIF_DEFAULTS,
  { version: 1 },
);
