import { createToolSettings } from '@/shared/lib/tool-settings';
import { DEFAULT_TRACKING } from './lib/clean';

export type UrlInspectorSettings = {
  /** Clean URL patterns (`*` suffix wildcard). */
  tracking: string[];
  /** Base URL for relative input; '' for none. */
  base: string;
};

export const URL_DEFAULTS: UrlInspectorSettings = {
  tracking: DEFAULT_TRACKING,
  base: '',
};

export const urlSettings = createToolSettings('url-parser', URL_DEFAULTS, {
  version: 1,
});
