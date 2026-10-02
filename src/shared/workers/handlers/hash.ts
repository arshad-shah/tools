import { open, seal, type KdfParams } from '@/shared/lib/crypto/aead';
import { createDigest, type DigestId } from '@/shared/lib/crypto/digest';
import { ToolError } from '@/shared/lib/errors';
import { Transferred, type RpcContext } from '@/shared/lib/worker-rpc';

/** Bytes read per step: bounded memory however large the file is. */
export const HASH_CHUNK = 4 * 1024 * 1024;

const cancelled = () => new ToolError('CANCELLED', 'Hashing was cancelled');

/**
 * Hashes a file with every selected algorithm in one pass (spec §8.4):
 * 4 MB slices feed each incremental hasher, progress is reported after each
 * slice, and an abort stops between slices.
 */
async function hashFile(
  ctx: RpcContext,
  file: Blob,
  algs: DigestId[],
): Promise<Partial<Record<DigestId, string>>> {
  const hashers = await Promise.all(
    algs.map(async (id) => [id, await createDigest(id)] as const),
  );
  const total = file.size;
  ctx.progress({ done: 0, total });
  for (let done = 0; done < total; ) {
    if (ctx.signal.aborted) throw cancelled();
    const end = Math.min(total, done + HASH_CHUNK);
    const chunk = new Uint8Array(await file.slice(done, end).arrayBuffer());
    for (const [, h] of hashers) h.update(chunk);
    done = end;
    ctx.progress({ done, total });
  }
  if (ctx.signal.aborted) throw cancelled();
  const out: Partial<Record<DigestId, string>> = {};
  for (const [id, h] of hashers) out[id] = h.digestHex();
  return out;
}

/**
 * Text & File Encrypt (spec §9.5) off the main thread: Argon2id is pure JS
 * and would freeze the page for seconds. Progress has two steps, key
 * derivation plus the cipher, and the result buffer is transferred back.
 */
async function cryptoSeal(
  ctx: RpcContext,
  plain: Uint8Array,
  passphrase: string,
  kdf: KdfParams,
): Promise<Transferred<Uint8Array>> {
  ctx.progress({ done: 0, total: 1, label: 'Deriving the key and encrypting' });
  const out = await seal(plain, passphrase, kdf, { signal: ctx.signal });
  ctx.progress({ done: 1, total: 1 });
  return new Transferred(out, [out.buffer]);
}

async function cryptoOpen(
  ctx: RpcContext,
  sealed: Uint8Array,
  passphrase: string,
): Promise<Transferred<Uint8Array>> {
  ctx.progress({ done: 0, total: 1, label: 'Deriving the key and decrypting' });
  const out = await open(sealed, passphrase, { signal: ctx.signal });
  ctx.progress({ done: 1, total: 1 });
  return new Transferred(out, [out.buffer]);
}

export default {
  'hash.file': hashFile,
  'crypto.seal': cryptoSeal,
  'crypto.open': cryptoOpen,
};
