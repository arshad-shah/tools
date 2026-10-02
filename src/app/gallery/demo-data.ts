/**
 * Deterministic demo data for the kit gallery: every screenshot must be
 * byte-stable, so nothing here reads the clock or Math.random.
 */

/** mulberry32: a tiny seeded generator returning numbers in [0, 1). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roughly normal samples (sum of uniforms), mean `mu`, spread `sigma`. */
export function normals(
  rand: () => number,
  n: number,
  mu: number,
  sigma: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < 6; k++) s += rand();
    out.push(mu + (s - 3) * sigma * 1.41);
  }
  return out;
}

/** UTC date `days` after 2026-01-01. */
export const dayOf = (days: number): Date =>
  new Date(Date.UTC(2026, 0, 1) + days * 86_400_000);

export const isoDay = (d: Date): string => d.toISOString().slice(0, 10);
