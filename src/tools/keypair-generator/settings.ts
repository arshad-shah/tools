import { createToolSettings } from '@/shared/lib/tool-settings';
import { DEFAULT_SPEC, type KeySpec } from './lib/spec';

/** The chosen key type survives a reload; keys themselves never do. */
export type KeypairSettings = KeySpec;

export const keypairSettings = createToolSettings<KeypairSettings>(
  'keypair-generator',
  DEFAULT_SPEC,
  { version: 1 },
);
