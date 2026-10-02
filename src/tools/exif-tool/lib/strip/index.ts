import { ToolError } from '@/shared/lib/errors';
import { readBytes } from '@/shared/lib/files';
import { sniffImage } from '../format';
import { readMetadata, type Metadata } from '../read';
import { stripJpeg, type StripResult } from './jpeg';
import { stripPng } from './png';
import { stripWebp } from './webp';

export interface StripOptions {
  keepIcc?: boolean;
  keepOrientation?: boolean;
}

/** Groups that must be empty after a strip (the ICC profile may be kept). */
const MUST_BE_EMPTY = [
  'camera',
  'exposure',
  'dates',
  'gps',
  'software',
  'iptc',
  'xmp',
  'other',
] as const;

/** What is still there after a strip that should not be, if anything. */
export function leftovers(meta: Metadata, opts: StripOptions): string[] {
  const left: string[] = MUST_BE_EMPTY.filter((g) => meta.groups[g].length > 0);
  if (meta.gps && !left.includes('gps')) left.push('gps');
  if (!opts.keepIcc && meta.groups.icc.length > 0) left.push('icc');
  // A kept orientation is the only image tag that may come from EXIF.
  if (
    !opts.keepOrientation &&
    meta.groups.image.some(([k]) => k === 'Orientation')
  )
    left.push('orientation');
  return left;
}

/**
 * Removes metadata without re-encoding (JPEG, PNG, WebP), then re-reads the
 * result: anything left gives VERIFICATION_FAILED, and nothing is returned
 * to download.
 */
export async function stripMetadata(
  file: File,
  opts: StripOptions = {},
): Promise<StripResult> {
  const bytes = await readBytes(file);
  const format = sniffImage(bytes);
  let result: StripResult;
  switch (format) {
    case 'jpeg':
      result = stripJpeg(bytes, opts);
      break;
    case 'png':
      result = stripPng(bytes, opts);
      break;
    case 'webp':
      result = stripWebp(bytes);
      break;
    case 'heic':
    case 'avif':
    case 'tiff':
      throw new ToolError(
        'UNSUPPORTED_FEATURE',
        `Metadata cannot be removed from ${format.toUpperCase()} files here. Convert with Image Compressor (re-encodes without metadata)`,
      );
    default:
      throw new ToolError(
        'INVALID_FILE',
        `${file.name} is not a JPEG, PNG or WebP image`,
      );
  }
  const left = leftovers(await readMetadata(result.bytes), opts);
  if (left.length > 0)
    throw new ToolError(
      'VERIFICATION_FAILED',
      `Metadata could not be fully removed from ${file.name}`,
    );
  return result;
}
