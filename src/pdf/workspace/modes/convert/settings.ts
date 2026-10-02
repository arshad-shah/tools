import { createToolStore } from '@/shared/state/createToolStore';
import type { PageSizeName } from '@/pdf/edit/images';
import type { ImageFormat } from '@/pdf/render';

/** Convert mode choices (settings only, never documents). */
export interface ConvertSettings {
  /** Which pages the exports cover. */
  scope: 'all' | 'selected';
  format: ImageFormat;
  dpi: number;
  /** JPEG quality 0.5 to 1. */
  quality: number;
  /** Page size for "Insert images as pages". */
  pageSize: PageSizeName;
}

export const useConvertSettings = createToolStore<ConvertSettings>({
  toolId: 'pdf-edit-convert',
  initial: {
    scope: 'all',
    format: 'png',
    dpi: 150,
    quality: 0.85,
    pageSize: 'fit',
  },
});
