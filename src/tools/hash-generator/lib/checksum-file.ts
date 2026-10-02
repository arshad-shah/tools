import type { DigestId } from '@/shared/lib/crypto/digest';

export interface ChecksumRow {
  name: string;
  results: Partial<Record<DigestId, string>>;
}

/** File extension for a checksum file (`checksums.sha256`). */
export const checksumExtension = (alg: DigestId) => alg.replace(/-/g, '');

/**
 * Rows as a `sha256sum`-style checksum file: `<hex>  <name>` per line (two
 * spaces: text mode), rows without that digest skipped. Names with a line
 * break or backslash are escaped the GNU way (a leading backslash).
 */
export function toChecksumFile(rows: ChecksumRow[], alg: DigestId): string {
  const lines: string[] = [];
  for (const row of rows) {
    const hex = row.results[alg];
    if (!hex) continue;
    const escaped = /[\n\\]/.test(row.name);
    const name = row.name.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    lines.push(`${escaped ? '\\' : ''}${hex.toLowerCase()}  ${name}`);
  }
  return lines.length ? lines.join('\n') + '\n' : '';
}
