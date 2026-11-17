import { strFromU8, unzipSync } from 'fflate';
import { ToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';

/** The largest single part we inflate (a sheet's XML, shared strings). */
export const MAX_PART_BYTES = 64 * 1024 * 1024;
/** The most we inflate from one workbook in total. */
export const MAX_TOTAL_BYTES = 256 * 1024 * 1024;

export interface ZipEntry {
  name: string;
  /** Compressed size. */
  size: number;
  /** Uncompressed size as the archive declares it. */
  originalSize: number;
}

/**
 * A read-only view of a zip archive that inflates one part at a time and
 * guards against zip bombs: each part is capped at MAX_PART_BYTES and all
 * parts read together at MAX_TOTAL_BYTES, by their declared sizes (fflate
 * never writes past a declared size, so a lying header only truncates).
 */
export function openZip(bytes: Uint8Array) {
  const entries = new Map<string, ZipEntry>();
  try {
    unzipSync(bytes, {
      filter: (f) => {
        entries.set(f.name, {
          name: f.name,
          size: f.size,
          originalSize: f.originalSize,
        });
        return false;
      },
    });
  } catch (e) {
    throw new ToolError(
      'INVALID_FILE',
      'This file is not a valid XLSX workbook (it is not a readable zip archive)',
      { cause: e },
    );
  }
  let inflated = 0;

  const find = (name: string): ZipEntry | undefined =>
    entries.get(name) ??
    // Part names are case-insensitive in OPC.
    [...entries.values()].find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );

  return {
    has: (name: string) => find(name) !== undefined,
    entries: () => [...entries.values()],
    /** The part as UTF-8 text, or null when the archive has no such part. */
    text(name: string): string | null {
      const entry = find(name);
      if (!entry) return null;
      if (entry.originalSize > MAX_PART_BYTES)
        throw new ToolError(
          'TOO_LARGE',
          `${name} is ${formatBytes(entry.originalSize)} uncompressed; the limit is ${formatBytes(MAX_PART_BYTES)}`,
        );
      if (inflated + entry.originalSize > MAX_TOTAL_BYTES)
        throw new ToolError(
          'TOO_LARGE',
          `This workbook expands to more than ${formatBytes(MAX_TOTAL_BYTES)}; it is too large to open here`,
        );
      inflated += entry.originalSize;
      let out: Uint8Array | undefined;
      try {
        out = unzipSync(bytes, { filter: (f) => f.name === entry.name })[
          entry.name
        ];
      } catch (e) {
        throw new ToolError('INVALID_FILE', `${name} could not be unpacked`, {
          cause: e,
        });
      }
      return out ? strFromU8(out) : null;
    },
  };
}

export type Zip = ReturnType<typeof openZip>;
