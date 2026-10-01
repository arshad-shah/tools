import { zip, type AsyncZippable } from 'fflate';

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

export function uniqueNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  return names.map((name) => {
    const n = (counts.get(name) ?? 0) + 1;
    counts.set(name, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot > 0
      ? `${name.slice(0, dot)} (${n})${name.slice(dot)}`
      : `${name} (${n})`;
  });
}

// Long enough for every browser to have started reading the blob.
const REVOKE_DELAY_MS = 30_000;

export function saveBlob(
  data: Blob | Uint8Array,
  filename: string,
  mime = 'application/octet-stream',
): void {
  // Our byte arrays are never backed by SharedArrayBuffer, so the cast is sound.
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data as Uint8Array<ArrayBuffer>], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
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
    zip(input, (err, out) => (err ? reject(err) : resolve(out)));
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
