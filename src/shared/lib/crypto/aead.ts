import { argon2idAsync } from '@noble/hashes/argon2.js';
import {
  base64ToBytes,
  bytesToBase64,
  utf8Encode,
} from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { randomBytes } from './random';

/**
 * The `tools-enc-v1` envelope (spec §9.5): AES-256-GCM with a key derived
 * from a passphrase.
 *
 *   magic "TENC" (4) | version 1 (1) | kdf id (1) | kdf params
 *   | salt (16) | iv (12) | ciphertext + tag
 *
 * KDF params: PBKDF2 (id 1) iterations u32; Argon2id (id 2) memory KiB u32,
 * iterations u8, parallelism u8. Integers are big-endian. The whole header
 * (everything before the ciphertext) is the GCM additional data, so changing
 * any header byte fails authentication.
 */

export const ENVELOPE_MAGIC = 'TENC';
const VERSION = 1;
const SALT = 16;
const IV = 12;
const TAG = 16;

export type KdfParams =
  | { kind: 'pbkdf2'; iterations: number }
  | {
      kind: 'argon2id';
      memoryKiB: number;
      iterations: number;
      parallelism: number;
    };

export const DEFAULT_KDF: KdfParams = { kind: 'pbkdf2', iterations: 600_000 };

/** Bounds a crafted file cannot push a decrypt past (memory and time). */
const LIMITS = {
  pbkdf2Iterations: 10_000_000,
  argonMemoryKiB: 1_048_576, // 1 GiB
};

const MAGIC = utf8Encode(ENVELOPE_MAGIC);

const invalid = (message: string) => new ToolError('INVALID_INPUT', message);
const wrong = (cause?: unknown) =>
  new ToolError('WRONG_PASSWORD', 'Wrong passphrase, or the data was changed', {
    cause,
  });

function kdfHeader(kdf: KdfParams): Uint8Array {
  if (kdf.kind === 'pbkdf2') {
    const out = new Uint8Array(5);
    out[0] = 1;
    new DataView(out.buffer).setUint32(1, kdf.iterations);
    return out;
  }
  const out = new Uint8Array(7);
  out[0] = 2;
  const d = new DataView(out.buffer);
  d.setUint32(1, kdf.memoryKiB);
  d.setUint8(5, kdf.iterations);
  d.setUint8(6, kdf.parallelism);
  return out;
}

function checkKdf(kdf: KdfParams): void {
  const whole = (n: number, min: number, max: number) =>
    Number.isInteger(n) && n >= min && n <= max;
  const ok =
    kdf.kind === 'pbkdf2'
      ? whole(kdf.iterations, 1, LIMITS.pbkdf2Iterations)
      : whole(kdf.memoryKiB, 8 * kdf.parallelism, LIMITS.argonMemoryKiB) &&
        whole(kdf.iterations, 1, 255) &&
        whole(kdf.parallelism, 1, 255);
  if (!ok) throw invalid('The key derivation settings are out of range');
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  kdf: KdfParams,
): Promise<CryptoKey> {
  const secret = utf8Encode(passphrase.normalize('NFC'));
  if (kdf.kind === 'pbkdf2') {
    const base = await crypto.subtle.importKey('raw', secret, 'PBKDF2', false, [
      'deriveKey',
    ]);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: kdf.iterations },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }
  const raw = await argon2idAsync(secret, salt, {
    m: kdf.memoryKiB,
    t: kdf.iterations,
    p: kdf.parallelism,
    dkLen: 32,
  });
  return crypto.subtle.importKey('raw', new Uint8Array(raw), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Encrypts `plain` under `passphrase` into a self-describing envelope. */
export async function seal(
  plain: Uint8Array,
  passphrase: string,
  kdf: KdfParams = DEFAULT_KDF,
): Promise<Uint8Array> {
  checkKdf(kdf);
  const salt = randomBytes(SALT);
  const iv = randomBytes(IV);
  const params = kdfHeader(kdf);
  const header = new Uint8Array(MAGIC.length + 1 + params.length + SALT + IV);
  let o = 0;
  header.set(MAGIC, o);
  header[(o += MAGIC.length)] = VERSION;
  header.set(params, (o += 1));
  header.set(salt, (o += params.length));
  header.set(iv, o + SALT);
  const key = await deriveKey(passphrase, salt, kdf);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: header },
      key,
      plain as Uint8Array<ArrayBuffer>,
    ),
  );
  const out = new Uint8Array(header.length + ct.length);
  out.set(header);
  out.set(ct, header.length);
  return out;
}

function parseHeader(sealed: Uint8Array): {
  kdf: KdfParams;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  headerLength: number;
} {
  const notOurs = () =>
    invalid('This is not data encrypted by this tool (tools-enc-v1)');
  if (sealed.length < MAGIC.length + 1 || MAGIC.some((b, i) => sealed[i] !== b))
    throw notOurs();
  if (sealed[4] !== VERSION)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `This data uses envelope version ${sealed[4]}, which this version of the tool cannot read`,
    );
  const d = new DataView(sealed.buffer, sealed.byteOffset, sealed.byteLength);
  const id = sealed[5];
  let kdf: KdfParams;
  let o = 6;
  if (id === 1 && sealed.length >= o + 4) {
    kdf = { kind: 'pbkdf2', iterations: d.getUint32(o) };
    o += 4;
  } else if (id === 2 && sealed.length >= o + 6) {
    kdf = {
      kind: 'argon2id',
      memoryKiB: d.getUint32(o),
      iterations: d.getUint8(o + 4),
      parallelism: d.getUint8(o + 5),
    };
    o += 6;
  } else if (id !== 1 && id !== 2) {
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      `Unknown key derivation (id ${id})`,
    );
  } else throw notOurs();
  checkKdf(kdf);
  if (sealed.length < o + SALT + IV + TAG) throw notOurs();
  return {
    kdf,
    salt: sealed.slice(o, o + SALT),
    iv: sealed.slice(o + SALT, o + SALT + IV),
    headerLength: o + SALT + IV,
  };
}

/**
 * Decrypts an envelope. Throws WRONG_PASSWORD for a wrong passphrase or any
 * tampering, UNSUPPORTED_FEATURE for an unknown version, and INVALID_INPUT
 * for data that is not an envelope.
 */
export async function open(
  sealed: Uint8Array,
  passphrase: string,
): Promise<Uint8Array> {
  const { kdf, salt, iv, headerLength } = parseHeader(sealed);
  const key = await deriveKey(passphrase, salt, kdf);
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: sealed.slice(0, headerLength),
        },
        key,
        sealed.slice(headerLength),
      ),
    );
  } catch (cause) {
    throw wrong(cause);
  }
}

const BEGIN = '-----BEGIN TOOLS ENCRYPTED MESSAGE-----';
const END = '-----END TOOLS ENCRYPTED MESSAGE-----';

/** Text armour: BEGIN line, Base64 wrapped at 76 columns, END line. */
export function armor(bytes: Uint8Array): string {
  const lines = bytesToBase64(bytes).match(/.{1,76}/g) ?? [];
  return [BEGIN, ...lines, END].join('\n') + '\n';
}

/** The bytes inside an armoured message (surrounding text is ignored). */
export function dearmor(text: string): Uint8Array<ArrayBuffer> {
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END, start + BEGIN.length);
  if (start < 0 || end < 0)
    throw invalid(
      'The encrypted message is damaged: its BEGIN or END line is missing',
    );
  try {
    return base64ToBytes(text.slice(start + BEGIN.length, end));
  } catch {
    throw invalid('The encrypted message is damaged: it is not valid Base64');
  }
}
