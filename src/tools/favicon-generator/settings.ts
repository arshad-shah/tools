import { createToolSettings } from '@/shared/lib/tool-settings';
import type { IconFont, IconShape } from './lib/render';

export type FaviconSettings = {
  font: IconFont;
  shape: IconShape;
  padding: number;
  fg: string;
  bg: string;
  themeColor: string;
  backgroundColor: string;
};

export const FAVICON_DEFAULTS: FaviconSettings = {
  font: 'Inter',
  shape: 'rounded',
  padding: 0.1,
  fg: '#ffffff',
  bg: '#1f6feb',
  themeColor: '#1f6feb',
  backgroundColor: '#ffffff',
};

export const faviconSettings = createToolSettings<FaviconSettings>(
  'favicon-generator',
  FAVICON_DEFAULTS,
  { version: 1 },
);
