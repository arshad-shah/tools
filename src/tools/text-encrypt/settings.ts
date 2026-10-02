import type { KdfParams } from '@/shared/lib/crypto/aead';
import { DEFAULT_KDF } from '@/shared/lib/crypto/aead';
import { createToolSettings } from '@/shared/lib/tool-settings';

export type KdfChoice = 'pbkdf2' | 'argon2id';

export interface EncryptSettings {
  kdf: KdfChoice;
}

export const ENCRYPT_DEFAULTS: EncryptSettings = { kdf: 'pbkdf2' };

/** PBKDF2-SHA-256 600,000 (default) or Argon2id m 64 MiB, t 3, p 1. */
export const KDF_PARAMS: Record<KdfChoice, KdfParams> = {
  pbkdf2: DEFAULT_KDF,
  argon2id: {
    kind: 'argon2id',
    memoryKiB: 65_536,
    iterations: 3,
    parallelism: 1,
  },
};

/** The KDF choice only; passphrases are never persisted (spec §9.5). */
export const encryptSettings = createToolSettings<EncryptSettings>(
  'text-encrypt',
  ENCRYPT_DEFAULTS,
  { version: 1 },
);
