import { zip, type AsyncZippable } from 'fflate';
import { ToolError } from './errors';

/** `report.pdf` + `merged` + `pdf` → `report.merged.pdf`. */
export function deriveFilename(
  inputName: string,
  suffix: string,
  ext: string,
): string {
  const base = inputName.replace(/\.[^./\\]+$/, '') || 'file';
  const cleanExt = ext.replace(/^\./, '');
  return suffix ? `${base}.${suffix}.${cleanExt}` : `${base}.${cleanExt}`;
}

/**
 * Disambiguates repeated names as "a (2).pdf", "a (3).pdf", ... never
 * producing a name that is already in the list (e.g. an existing "a (2).pdf").
 */
export function uniqueNames(names: string[]): string[] {
  const used = new Set(names);
  const seen = new Set<string>();
  const next = new Map<string, number>();
  return names.map((name) => {
    if (!seen.has(name)) {
      seen.add(name);
      return name;
    }
    const dot = name.lastIndexOf('.');
    const withN = (n: number) =>
      dot > 0
        ? `${name.slice(0, dot)} (${n})${name.slice(dot)}`
        : `${name} (${n})`;
    let n = next.get(name) ?? 2;
    while (used.has(withN(n))) n++;
    const candidate = withN(n);
    next.set(name, n + 1);
    used.add(candidate);
    return candidate;
  });
}

// Long enough for every browser to have started reading the blob.
const REVOKE_DELAY_MS = 30_000;

/**
 * Downloads `data` as `filename`. Bytes get `mime`; a Blob keeps its own
 * type, and only an untyped Blob takes `mime`.
 */
export function saveBlob(
  data: Blob | Uint8Array,
  filename: string,
  mime = 'application/octet-stream',
): void {
  // Our byte arrays are never backed by SharedArrayBuffer, so the cast is sound.
  const blob =
    data instanceof Blob
      ? data.type
        ? data
        : new Blob([data], { type: mime })
      : new Blob([data as Uint8Array<ArrayBuffer>], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.hidden = true;
  try {
    document.body.appendChild(a);
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}

export function zipFiles(
  entries: { name: string; data: Uint8Array }[],
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6,
): Promise<Uint8Array> {
  const names = uniqueNames(entries.map((e) => e.name));
  const input: AsyncZippable = {};
  entries.forEach((e, i) => {
    input[names[i]] = [e.data, { level }];
  });
  return new Promise((resolve, reject) => {
    try {
      zip(input, (err, out) => {
        if (err) {
          reject(
            new ToolError('UNKNOWN', 'Could not build the ZIP file', {
              cause: err,
            }),
          );
        } else {
          resolve(out);
        }
      });
    } catch (err) {
      reject(
        new ToolError('UNKNOWN', 'Could not build the ZIP file', {
          cause: err,
        }),
      );
    }
  });
}

export async function saveZip(
  entries: { name: string; data: Uint8Array }[],
  filename: string,
): Promise<void> {
  // PDFs and images are already compressed; storing is faster and barely larger.
  const out = await zipFiles(entries, 0);
  saveBlob(out, filename, 'application/zip');
}
