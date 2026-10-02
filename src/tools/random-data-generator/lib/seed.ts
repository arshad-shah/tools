import { randomString } from '@/shared/lib/crypto/random';

const SEED_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** A fresh 8-character seed from the secure random source. */
export const newSeed = (): string => randomString(SEED_ALPHABET, 8);

/** A rough in-memory size: rows times fields times about 64 bytes. */
export const memoryEstimate = (rows: number, fields: number): number =>
  rows * Math.max(1, fields) * 64;
