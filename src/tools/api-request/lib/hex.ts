/** Bytes shown in the hex view; the rest is downloaded, not drawn. */
export const HEX_LIMIT = 64 * 1024;

const hex2 = (b: number) => b.toString(16).padStart(2, '0');
const printable = (b: number) =>
  b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.';

/**
 * A classic hex dump: offset, 16 bytes in hex (a gap after 8) and their
 * printable ASCII, one line per 16 bytes, up to `limit` bytes.
 */
export function hexDump(bytes: Uint8Array, limit = HEX_LIMIT): string {
  const end = Math.min(bytes.length, limit);
  const lines: string[] = [];
  for (let at = 0; at < end; at += 16) {
    const row = bytes.subarray(at, Math.min(at + 16, end));
    const cells = Array.from(row, hex2);
    const left = cells.slice(0, 8).join(' ');
    const right = cells.slice(8).join(' ');
    lines.push(
      `${at.toString(16).padStart(8, '0')}  ${left.padEnd(23)}  ${right.padEnd(23)}  ${Array.from(row, printable).join('')}`,
    );
  }
  return lines.join('\n');
}
