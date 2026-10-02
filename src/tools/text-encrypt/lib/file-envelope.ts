import { utf8Decode, utf8Encode } from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';

/** Files are held in memory to encrypt them: 2 GB at most (spec §9.5). */
export const MAX_FILE_BYTES = 2 * 1024 ** 3;

const U16 = 0xffff;

export interface UnpackedFile {
  name: string;
  mime: string;
  bytes: Uint8Array;
}

export function checkFileSize(size: number): void {
  if (size > MAX_FILE_BYTES)
    throw new ToolError(
      'TOO_LARGE',
      `Files up to ${formatBytes(MAX_FILE_BYTES, 0)} can be encrypted here; this one is ${formatBytes(size)}`,
    );
}

/**
 * The plaintext inside a file envelope: u16 name length, the name in UTF-8,
 * u16 type length, the type, then the file's bytes (big-endian lengths), so
 * decrypting restores the original name and type.
 */
export async function packFile(file: File): Promise<Uint8Array> {
  checkFileSize(file.size);
  const name = utf8Encode(file.name);
  const mime = utf8Encode(file.type);
  if (name.length > U16 || mime.length > U16)
    throw new ToolError('INVALID_INPUT', 'The file name is too long');
  const body = new Uint8Array(await file.arrayBuffer());
  const out = new Uint8Array(4 + name.length + mime.length + body.length);
  const d = new DataView(out.buffer);
  let o = 0;
  d.setUint16(o, name.length);
  out.set(name, (o += 2));
  d.setUint16((o += name.length), mime.length);
  out.set(mime, (o += 2));
  out.set(body, o + mime.length);
  return out;
}

/** The name, type and bytes packed by `packFile`. */
export function unpackFile(bytes: Uint8Array): UnpackedFile {
  const damaged = () =>
    new ToolError(
      'INVALID_INPUT',
      'The decrypted data is not a file packed by this tool',
    );
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = 0;
  const read = () => {
    if (o + 2 > bytes.length) throw damaged();
    const len = d.getUint16(o);
    o += 2;
    if (o + len > bytes.length) throw damaged();
    const part = bytes.subarray(o, o + len);
    o += len;
    try {
      return utf8Decode(part);
    } catch {
      throw damaged();
    }
  };
  const name = read();
  const mime = read();
  return { name, mime, bytes: bytes.subarray(o) };
}

/** `<name>.enc` for the encrypted download. */
export const encryptedName = (name: string) => `${name}.enc`;
