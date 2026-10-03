import type { KdfChoice } from '../settings';

/** What the chosen key derivation does (shown under the control bar). */
export const kdfHint = (value: KdfChoice) =>
  `${
    value === 'pbkdf2'
      ? 'PBKDF2-SHA-256 with 600,000 iterations.'
      : 'Argon2id with 64 MiB of memory and 3 passes; slower, and harder to attack with GPUs.'
  } Decrypting reads the choice from the data.`;
