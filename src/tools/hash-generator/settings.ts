import type { DigestId } from '@/shared/lib/crypto/digest';
import type { KeyFormat } from '@/shared/lib/crypto/digest';
import { createToolSettings } from '@/shared/lib/tool-settings';
import type { DigestFormat } from './lib/format';

export interface HashSettings {
  selected: DigestId[];
  output: DigestFormat;
  hmacAlg: DigestId;
  inputEncoding: KeyFormat;
}

export const HASH_DEFAULTS: HashSettings = {
  selected: ['md5', 'sha1', 'sha256', 'sha512'],
  output: 'hex',
  hmacAlg: 'sha256',
  inputEncoding: 'text',
};

/** Selected algorithms and formats (spec §8.4); never the key or input. */
export const hashSettings = createToolSettings<HashSettings>(
  'hash-generator',
  HASH_DEFAULTS,
  { version: 1 },
);
