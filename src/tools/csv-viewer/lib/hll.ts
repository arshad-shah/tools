/**
 * HyperLogLog distinct-count estimate (Flajolet et al. 2007) with the
 * small-range linear-counting correction. Precision 12 gives 4,096
 * registers and a standard error of about 1.6%.
 */
export class HyperLogLog {
  private readonly p: number;
  private readonly m: number;
  private readonly registers: Uint8Array;

  constructor(precision = 12) {
    this.p = precision;
    this.m = 1 << precision;
    this.registers = new Uint8Array(this.m);
  }

  add(value: string): void {
    const h = hash32(value);
    const index = h >>> (32 - this.p);
    // Rank of the first set bit in the remaining 32 - p bits (1-based).
    const rest = (h << this.p) | (1 << (this.p - 1));
    const rank = Math.clz32(rest) + 1;
    if (rank > this.registers[index]) this.registers[index] = rank;
  }

  count(): number {
    const { m } = this;
    let sum = 0;
    let zeros = 0;
    for (const r of this.registers) {
      sum += 2 ** -r;
      if (r === 0) zeros++;
    }
    const alpha = 0.7213 / (1 + 1.079 / m);
    const estimate = (alpha * m * m) / sum;
    if (estimate <= 2.5 * m && zeros > 0)
      return Math.round(m * Math.log(m / zeros));
    const two32 = 2 ** 32;
    if (estimate > two32 / 30)
      return Math.round(-two32 * Math.log(1 - estimate / two32));
    return Math.round(estimate);
  }
}

/** FNV-1a over UTF-16 code units, finished with the murmur3 fmix32 mixer. */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
