import type { Services } from '@/pdf/doc/services';
import type { PageMarks } from './apply';
import { glyphBoxes } from './glyphs';
import { pageStreamBytes } from './page-bytes';
import { overlapFraction } from './geometry';
import { termMatcher } from './terms';
import { OVERLAP } from './text';

export { normalise } from './terms';

export interface VerifyInput {
  bytes: Uint8Array;
  pages: readonly PageMarks[];
  terms: readonly string[];
}

export interface VerifyResult {
  ok: boolean;
  /** 0-based pages whose problems rasterising that page can fix. */
  failedPages: number[];
  /** Problems in plain words, e.g. "Page 3: text remains under a mark". */
  problems: string[];
  /** A term remains somewhere no single page owns (properties, raw bytes). */
  documentLevel: boolean;
  /** A term remains in the decompressed file data (no single place named). */
  rawBytes: boolean;
  /**
   * Terms left unmarked on some page: the file-wide raw-byte search skips
   * them (it would find the kept copies); the marked pages' own streams are
   * searched instead.
   */
  kept: string[];
}

/** The services verification reads through (render worker and qpdf). */
export type VerifyServices = {
  render: Pick<
    Services['render'],
    'open' | 'close' | 'textItems' | 'markCoverage' | 'docTexts'
  >;
  qpdf: Pick<Services['qpdf'], 'qdf'>;
};

const utf16be = (s: string) => {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[2 * i] = c >> 8;
    out[2 * i + 1] = c & 0xff;
  }
  return out;
};

const latin1 = (s: string) =>
  Uint8Array.from([...s].map((ch) => ch.charCodeAt(0) & 0xff));

function indexOfFolded(
  hay: Uint8Array,
  needle: Uint8Array,
  fold: boolean,
): number {
  const f = (b: number) => (fold && b >= 0x41 && b <= 0x5a ? b + 32 : b);
  if (!needle.length) return -1;
  const first = f(needle[0]);
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    if (f(hay[i]) !== first) continue;
    for (let j = 1; j < needle.length; j++)
      if (f(hay[i + j]) !== f(needle[j])) continue outer;
    return i;
  }
  return -1;
}

/** latin1 (ASCII case folded) and UTF-16BE (as typed, lower and upper case), spec 10.3 step 3. */
export function rawContainsTerm(bytes: Uint8Array, term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  return (
    indexOfFolded(bytes, latin1(t), true) >= 0 ||
    [t, t.toLowerCase(), t.toUpperCase()].some(
      (v) => indexOfFolded(bytes, utf16be(v), false) >= 0,
    )
  );
}

/** Verification resolution for the pixel check (spec 10.3 step 1). */
export const VERIFY_DPI = 100;

/**
 * Checks redacted bytes (spec 10.3): no text under a mark and every mark
 * painted; no search term anywhere a reader can see; no search term in the
 * decompressed raw bytes.
 */
export async function verifyRedaction(
  input: VerifyInput,
  services: VerifyServices,
  signal: AbortSignal,
): Promise<VerifyResult> {
  const failed = new Set<number>();
  const problems: string[] = [];
  let documentLevel = false;
  let rawBytes = false;
  let keptTerms: string[] = [];
  const doc = await services.render.open(input.bytes, signal);
  try {
    for (const p of input.pages) {
      const marks = p.marks.map((m) => m.box);
      const items = await services.render.textItems(
        doc.docId,
        p.pageIndex,
        signal,
      );
      const leftover = glyphBoxes(items).filter((g) =>
        marks.some((m) => overlapFraction(g, m) >= OVERLAP),
      );
      if (leftover.length) {
        failed.add(p.pageIndex);
        problems.push(`Page ${p.pageIndex + 1}: text remains under a mark`);
      }
      const coverage = await services.render.markCoverage(
        doc.docId,
        p.pageIndex,
        VERIFY_DPI,
        p.marks,
        signal,
      );
      if (coverage.some((c) => c < 0.99)) {
        failed.add(p.pageIndex);
        problems.push(`Page ${p.pageIndex + 1}: a mark is not fully covered`);
      }
    }
    const terms = [
      ...new Set(input.terms.map((t) => t.trim()).filter(Boolean)),
    ];
    if (terms.length) {
      // A page is checked for the terms marked on it; occurrences the user
      // left unmarked on other pages are theirs to keep.
      const markedOn = new Map<number, Set<string>>();
      for (const p of input.pages)
        markedOn.set(
          p.pageIndex,
          new Set(
            p.marks.map((m) => m.term?.trim()).filter((t): t is string => !!t),
          ),
        );
      const kept = new Set<string>();
      const { entries } = await services.render.docTexts(doc.docId, signal);
      for (const t of terms) {
        const has = termMatcher([t]);
        for (const s of entries) {
          if (!has(s.text)) continue;
          if (s.page !== null && !markedOn.get(s.page)?.has(t)) {
            kept.add(t);
            continue;
          }
          if (s.page !== null) failed.add(s.page);
          else documentLevel = true;
          problems.push(`A search term remains in ${s.where}`);
        }
      }
      const checked = terms.filter((t) => !kept.has(t));
      if (checked.length) {
        const qdf = await services.qpdf.qdf(input.bytes, signal);
        if (checked.some((t) => rawContainsTerm(qdf.bytes, t))) {
          rawBytes = true;
          problems.push('A search term remains in the file data');
        }
      }
      if (kept.size) {
        const keptOn = [...markedOn]
          .filter(([, ts]) => [...ts].some((t) => kept.has(t)))
          .map(([p]) => p);
        const streams = await pageStreamBytes(input.bytes, keptOn);
        for (const p of keptOn) {
          const data = streams.get(p);
          const hit = [...markedOn.get(p)!].some(
            (t) => kept.has(t) && !!data && rawContainsTerm(data, t),
          );
          if (!hit) continue;
          failed.add(p);
          problems.push(
            `Page ${p + 1}: a search term remains in the page data`,
          );
        }
      }
      keptTerms = [...kept];
    }
  } finally {
    await services.render.close(doc.docId);
  }
  return {
    ok: problems.length === 0,
    failedPages: [...failed].sort((a, b) => a - b),
    problems,
    documentLevel,
    rawBytes,
    kept: keptTerms,
  };
}
