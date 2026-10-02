import { createToolSettings } from '@/shared/lib/tool-settings';
import { URL_ALPHABET } from './lib/nanoid';
import type { UuidFormat } from './lib/uuid';

export type IdKind = 'v4' | 'v7' | 'v5' | 'nil' | 'max' | 'ulid' | 'nanoid';

export interface UuidSettings {
  kind: IdKind;
  count: number;
  format: UuidFormat & { [key: string]: boolean };
  nanoAlphabet: string;
  nanoSize: number;
  /** dns, url, oid, x500 or a custom namespace UUID. */
  v5Namespace: string;
}

export const UUID_DEFAULTS: UuidSettings = {
  kind: 'v4',
  count: 10,
  format: { upper: false, hyphens: true, braces: false, urn: false },
  nanoAlphabet: URL_ALPHABET,
  nanoSize: 21,
  v5Namespace: 'dns',
};

/** Kind and options (spec §9.4); generated ids are never stored. */
export const uuidSettings = createToolSettings<UuidSettings>(
  'uuid-generator',
  UUID_DEFAULTS,
  { version: 1 },
);
