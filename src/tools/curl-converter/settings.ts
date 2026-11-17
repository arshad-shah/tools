import { createToolSettings } from '@/shared/lib/tool-settings';

export type CurlConverterSettings = {
  /** The output language (a TargetId). */
  target: string;
};

export const CURL_DEFAULTS: CurlConverterSettings = { target: 'fetch' };

export const curlSettings = createToolSettings(
  'curl-converter',
  CURL_DEFAULTS,
  { version: 1 },
);
