import { Zip, ZipPassThrough } from 'fflate';
import { ToolError } from '@/shared/lib/errors';

/**
 * A stored (uncompressed) ZIP built one file at a time. Each finished chunk
 * becomes a Blob at once, so the bytes can leave the JS heap (browsers may
 * keep large blobs on disk) instead of every file and the whole archive
 * being held in memory together.
 */
export function streamZip() {
  const parts: Blob[] = [];
  let resolve!: (b: Blob) => void;
  let reject!: (e: unknown) => void;
  const result = new Promise<Blob>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Keeps an early failure from being unhandled before finish() is awaited.
  result.catch(() => {});
  const zip = new Zip((err, chunk, final) => {
    if (err) {
      reject(
        new ToolError('UNKNOWN', 'Could not build the ZIP file', {
          cause: err,
        }),
      );
      return;
    }
    parts.push(new Blob([chunk as Uint8Array<ArrayBuffer>]));
    if (final) resolve(new Blob(parts, { type: 'application/zip' }));
  });
  return {
    add(name: string, data: Uint8Array) {
      const file = new ZipPassThrough(name);
      zip.add(file);
      file.push(data, true);
    },
    finish(): Promise<Blob> {
      zip.end();
      return result;
    },
    abort() {
      zip.terminate();
    },
  };
}

export interface SavedImages {
  blob: Blob;
  name: string;
  count: number;
}

/**
 * Collects page images for download: one image is saved as itself, two or
 * more stream into a ZIP named `zipName` as they arrive.
 */
export function imageSaver(mime: string, zipName: string) {
  let first: { name: string; data: Uint8Array } | null = null;
  let zip: ReturnType<typeof streamZip> | null = null;
  let count = 0;
  return {
    add(file: { name: string; data: Uint8Array }) {
      count++;
      if (!first && !zip) {
        first = file;
        return;
      }
      if (!zip) {
        zip = streamZip();
        zip.add(first!.name, first!.data);
        first = null;
      }
      zip.add(file.name, file.data);
    },
    async finish(): Promise<SavedImages> {
      if (zip) return { blob: await zip.finish(), name: zipName, count };
      if (!first) throw new ToolError('INVALID_INPUT', 'No pages to save');
      const one: { name: string; data: Uint8Array } = first;
      return {
        blob: new Blob([one.data as Uint8Array<ArrayBuffer>], { type: mime }),
        name: one.name,
        count,
      };
    },
    abort() {
      zip?.abort();
    },
  };
}
