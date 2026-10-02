import { createToolSettings } from '@/shared/lib/tool-settings';

export interface MarkdownSettings {
  wrap: boolean;
  scrollSync: boolean;
  /** Preview share of the split, 0.2 to 0.8. */
  previewWidth: number;
}

export const MARKDOWN_SETTINGS_DEFAULTS: MarkdownSettings = {
  wrap: true,
  scrollSync: true,
  previewWidth: 0.5,
};

/** Editor options only (spec §9.2): drafts are never persisted (D7). */
export const markdownSettings = createToolSettings<MarkdownSettings>(
  'markdown-editor',
  MARKDOWN_SETTINGS_DEFAULTS,
  { version: 1 },
);
