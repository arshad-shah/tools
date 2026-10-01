import { ToolError } from './errors';
import { newId } from './id';

export type FileKind = 'pdf' | 'png' | 'jpeg' | 'webp' | 'gif';

export interface LoadedFile {
  id: string;
  name: string;
  size: number;
  kind: FileKind;
  bytes: Uint8Array;
}

/** Above this we warn (never block): browsers start struggling with memory. */
export const SOFT_SIZE_LIMIT = 200 * 1024 * 1024;

const KIND_INFO: Record<FileKind, { label: string; accept: string }> = {
  pdf: { label: 'PDF', accept: '.pdf,application/pdf' },
  png: { label: 'PNG', accept: '.png,image/png' },
  jpeg: { label: 'JPEG', accept: '.jpg,.jpeg,image/jpeg' },
  webp: { label: 'WebP', accept: '.webp,image/webp' },
  gif: { label: 'GIF', accept: '.gif,image/gif' },
};

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

/** Sniff the real type from magic numbers; file extensions are not trusted. */
export function detectKind(b: Uint8Array): FileKind | null {
  // Check strict image signatures first (at offset 0) to avoid false positives
  // when image metadata contains "%PDF-"
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return 'png';
  if (startsWith(b, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (
    startsWith(b, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return 'webp';
  if (startsWith(b, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  // PDF readers accept the header anywhere in the first 1024 bytes.
  const limit = Math.min(b.length, 1024) - 5;
  for (let i = 0; i <= limit; i++) {
    if (
      b[i] === 0x25 &&
      b[i + 1] === 0x50 &&
      b[i + 2] === 0x44 &&
      b[i + 3] === 0x46 &&
      b[i + 4] === 0x2d
    ) {
      return 'pdf';
    }
  }
  return null;
}

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function describeKinds(kinds: readonly FileKind[]): string {
  const labels = kinds.map((k) => KIND_INFO[k].label);
  if (labels.length === 0) return 'supported';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

export function acceptAttribute(kinds: readonly FileKind[]): string {
  return kinds.map((k) => KIND_INFO[k].accept).join(',');
}

export function isOverSoftLimit(size: number): boolean {
  return size > SOFT_SIZE_LIMIT;
}

export async function loadFile(
  file: File,
  accept: readonly FileKind[],
): Promise<LoadedFile> {
  if (file.size === 0)
    throw new ToolError('INVALID_FILE', `${file.name} is empty`);
  const notAccepted = () =>
    new ToolError(
      'INVALID_FILE',
      `${file.name} is not a ${describeKinds(accept)} file`,
    );
  let bytes: Uint8Array;
  let kind: FileKind | null;
  try {
    // Sniff the header first so a wrong (possibly huge) file is rejected
    // without reading all of it.
    kind = detectKind(await readBytes(file.slice(0, 1024)));
    if (!kind || !accept.includes(kind)) throw notAccepted();
    bytes = await readBytes(file);
  } catch (cause) {
    if (cause instanceof ToolError) throw cause;
    throw new ToolError('INVALID_FILE', `Couldn't read ${file.name}`, {
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
  }
  return {
    id: newId(),
    name: file.name,
    size: file.size,
    kind,
    bytes,
  };
}
