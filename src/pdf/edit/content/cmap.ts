import { latin1 } from './tokens';

/*
 * The parts of an embedded CMap stream (PDF 32000-1 §9.7.5) that glyph
 * positioning needs: code lengths (codespace ranges) and code to CID maps.
 */

export interface CodespaceRange {
  low: Uint8Array;
  high: Uint8Array;
}

const HEX_RE = /<([0-9A-Fa-f\s]*)>/g;

const hexBytes = (h: string): Uint8Array => {
  const s = h.replace(/\s+/g, '');
  const out = new Uint8Array(Math.ceil(s.length / 2));
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(s.slice(2 * i, 2 * i + 2).padEnd(2, '0'), 16);
  return out;
};

const bytesToInt = (b: Uint8Array) => b.reduce((n, x) => n * 256 + x, 0);

/** Every `begin<kind> ... end<kind>` section body of the CMap text. */
function sections(text: string, kind: string): string[] {
  const re = new RegExp(`begin${kind}([\\s\\S]*?)end${kind}`, 'g');
  return [...text.matchAll(re)].map((m) => m[1]);
}

export function parseCodespaceRanges(cmap: Uint8Array): CodespaceRange[] {
  const text = latin1(cmap);
  const out: CodespaceRange[] = [];
  for (const body of sections(text, 'codespacerange')) {
    const hexes = [...body.matchAll(HEX_RE)].map((m) => hexBytes(m[1]));
    for (let i = 0; i + 1 < hexes.length; i += 2)
      out.push({ low: hexes[i], high: hexes[i + 1] });
  }
  return out;
}

export interface CidMap {
  ranges: { low: number; high: number; length: number; cid: number }[];
  chars: Map<string, number>;
}

/** `cidrange` and `cidchar` entries: code (by byte length) to CID. */
export function parseCidMappings(cmap: Uint8Array): CidMap {
  const text = latin1(cmap);
  const ranges: CidMap['ranges'] = [];
  const chars = new Map<string, number>();
  const RANGE = /<([0-9A-Fa-f\s]*)>\s*<([0-9A-Fa-f\s]*)>\s*(\d+)/g;
  for (const body of sections(text, 'cidrange'))
    for (const m of body.matchAll(RANGE)) {
      const low = hexBytes(m[1]);
      ranges.push({
        low: bytesToInt(low),
        high: bytesToInt(hexBytes(m[2])),
        length: low.length,
        cid: Number(m[3]),
      });
    }
  const CHAR = /<([0-9A-Fa-f\s]*)>\s*(\d+)/g;
  for (const body of sections(text, 'cidchar'))
    for (const m of body.matchAll(CHAR)) {
      const code = hexBytes(m[1]);
      chars.set(`${code.length}:${bytesToInt(code)}`, Number(m[2]));
    }
  return { ranges, chars };
}

export function cidFor(map: CidMap, code: number, length: number): number {
  const exact = map.chars.get(`${length}:${code}`);
  if (exact !== undefined) return exact;
  for (const r of map.ranges)
    if (r.length === length && code >= r.low && code <= r.high)
      return r.cid + (code - r.low);
  return 0;
}

/**
 * Length of the code at `at`: the shortest byte count whose bytes fall in
 * a codespace range of that length (§9.7.6.2); 1 when nothing matches.
 */
export function codeLengthIn(
  ranges: readonly CodespaceRange[],
  bytes: Uint8Array,
  at: number,
): number {
  for (let n = 1; n <= 4; n++) {
    if (at + n > bytes.length) break;
    const hit = ranges.some((r) => {
      if (r.low.length !== n) return false;
      for (let k = 0; k < n; k++) {
        const b = bytes[at + k];
        if (b < r.low[k] || b > r.high[k]) return false;
      }
      return true;
    });
    if (hit) return n;
  }
  // No range matches: consume the shortest range length (§9.7.6.3).
  const shortest = Math.min(...ranges.map((r) => r.low.length), 4);
  return Math.max(1, Math.min(shortest, bytes.length - at));
}

/** `/WMode 1` (vertical writing) in an embedded CMap. */
export const isVertical = (cmap: Uint8Array) =>
  /\/WMode\s+1\b/.test(latin1(cmap));
