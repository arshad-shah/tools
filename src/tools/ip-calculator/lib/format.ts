/** A count with thousands separators (BigInt safe). */
export const count = (n: bigint) => n.toLocaleString('en-US');

/** A large exact power of two also as one: "65,536 (2 to the power 16)". */
export function countWithPower(n: bigint): string {
  if (n < 65536n) return count(n);
  const bits = n.toString(2).length - 1;
  return 1n << BigInt(bits) === n
    ? `${count(n)} (2 to the power ${bits})`
    : count(n);
}

export interface BitGroup {
  network: string;
  host: string;
}

/** Bits in groups of `size`, each split at the prefix. */
export function groupBits(
  bits: string,
  prefix: number,
  size: number,
): BitGroup[] {
  const out: BitGroup[] = [];
  for (let i = 0; i < bits.length; i += size) {
    const chunk = bits.slice(i, i + size);
    const cut = Math.max(0, Math.min(size, prefix - i));
    out.push({ network: chunk.slice(0, cut), host: chunk.slice(cut) });
  }
  return out;
}
