import type { Box } from '@/pdf/doc/types';
import { rgbOf, textColour, type RedactMark } from './mark-style';

/*
 * Pixel and string checks shared by the render worker and the Node test
 * fakes. pdf.js objects are typed structurally so either build fits.
 */

export interface ViewportLike {
  width: number;
  height: number;
  /** PDF user space to viewport px. */
  transform: number[];
}

const toPx = (t: number[], x: number, y: number) => [
  t[0] * x + t[2] * y + t[4],
  t[1] * x + t[3] * y + t[5],
];

/** A mark's pixel rectangle: `outer` covers every touched pixel, `inner` only whole ones. */
export function markPixels(v: ViewportLike, box: Box) {
  const [x1, y1] = toPx(v.transform, box.x, box.y);
  const [x2, y2] = toPx(v.transform, box.x + box.width, box.y + box.height);
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);
  const clampX = (x: number) => Math.max(0, Math.min(Math.round(v.width), x));
  const clampY = (y: number) => Math.max(0, Math.min(Math.round(v.height), y));
  return {
    outer: {
      x0: clampX(Math.floor(left)),
      y0: clampY(Math.floor(top)),
      x1: clampX(Math.ceil(right)),
      y1: clampY(Math.ceil(bottom)),
    },
    inner: {
      x0: clampX(Math.ceil(left)),
      y0: clampY(Math.ceil(top)),
      x1: clampX(Math.floor(right)),
      y1: clampY(Math.floor(bottom)),
    },
  };
}

/** Paints every mark onto a 2D context (rasterise fallback: marks burned in). */
export function burnMarks(
  g: {
    fillStyle: unknown;
    fillRect(x: number, y: number, w: number, h: number): void;
  },
  v: ViewportLike,
  marks: readonly RedactMark[],
) {
  for (const m of marks) {
    const { outer } = markPixels(v, m.box);
    g.fillStyle = m.fill;
    g.fillRect(outer.x0, outer.y0, outer.x1 - outer.x0, outer.y1 - outer.y0);
  }
}

const near = (data: Uint8ClampedArray | Uint8Array, o: number, c: number[]) =>
  Math.abs(data[o] - c[0]) <= 8 &&
  Math.abs(data[o + 1] - c[1]) <= 8 &&
  Math.abs(data[o + 2] - c[2]) <= 8;

/**
 * Per mark, the share of its whole pixels within 8/255 of the fill colour
 * (spec 10.3 step 1). Pixels of the overlay text colour count as covered
 * when the mark carries overlay text. A mark too small to hold a whole
 * pixel counts as covered.
 */
export function coverageOf(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  v: ViewportLike,
  marks: readonly RedactMark[],
): number[] {
  return marks.map((m) => {
    const { inner } = markPixels(v, m.box);
    const fill = rgbOf(m.fill);
    const text = m.overlayText ? textColour(m.fill) : null;
    let total = 0;
    let ok = 0;
    for (let y = inner.y0; y < inner.y1; y++)
      for (let x = inner.x0; x < inner.x1; x++) {
        const o = (y * width + x) * 4;
        total++;
        if (near(rgba, o, fill) || (text && near(rgba, o, text))) ok++;
      }
    return total ? ok / total : 1;
  });
}

export interface DocTextEntry {
  text: string;
  /** Plain words: "page 3 text", "the document title", "an attachment name". */
  where: string;
  /** 0-based page, or null for document-level strings. */
  page: number | null;
}

interface PdfDocLike {
  numPages: number;
  getPage(n: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>;
    getAnnotations(): Promise<unknown[]>;
    cleanup(): void;
  }>;
  getOutline(): Promise<unknown[] | null>;
  getMetadata(): Promise<{ info: unknown; metadata: unknown }>;
  getFieldObjects(): Promise<unknown>;
  getAttachments(): Promise<unknown>;
}

const INFO_WHERE: Record<string, string> = {
  Title: 'the document title',
  Author: 'the author',
  Subject: 'the subject',
  Keywords: 'the keywords',
  Creator: 'the creating application',
  Producer: 'the producer',
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Every string a reader can get at, by where it lives (spec 10.3 step 2). */
export async function collectDocTexts(
  doc: PdfDocLike,
): Promise<DocTextEntry[]> {
  const out: DocTextEntry[] = [];
  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    try {
      const { items } = await page.getTextContent();
      const text = items
        .map((it) => {
          const t = it as { str?: string; hasEOL?: boolean };
          return (t.str ?? '') + (t.hasEOL ? '\n' : '');
        })
        .join('');
      out.push({ text, where: `page ${i + 1} text`, page: i });
      for (const a of (await page.getAnnotations()) as Record<
        string,
        unknown
      >[]) {
        const contents =
          str((a.contentsObj as { str?: unknown } | undefined)?.str) ||
          str(a.contents);
        if (contents)
          out.push({
            text: contents,
            where: `an annotation on page ${i + 1}`,
            page: i,
          });
        const value = a.fieldValue;
        const values = Array.isArray(value) ? value.map(str) : [str(value)];
        for (const v of values.filter(Boolean))
          out.push({
            text: v,
            where: `a form field on page ${i + 1}`,
            page: i,
          });
      }
    } finally {
      page.cleanup();
    }
  }
  const walk = (items: unknown[] | null, depth: number) => {
    for (const it of items ?? []) {
      const o = it as { title?: unknown; items?: unknown[] };
      if (str(o.title))
        out.push({ text: str(o.title), where: 'a bookmark', page: null });
      if (depth < 64) walk(o.items ?? null, depth + 1);
    }
  };
  walk(await doc.getOutline(), 0);
  const meta = await doc.getMetadata();
  const info = (meta.info ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(info))
    if (str(v))
      out.push({
        text: str(v),
        where: INFO_WHERE[k] ?? `the document property ${k}`,
        page: null,
      });
  const raw = (meta.metadata as { getRaw?: () => unknown } | null)?.getRaw?.();
  if (str(raw))
    out.push({ text: str(raw), where: 'the XMP metadata', page: null });
  const fields = await doc.getFieldObjects();
  const lists =
    fields instanceof Map
      ? [...fields.values()]
      : Object.values((fields ?? {}) as Record<string, unknown>);
  for (const list of lists as unknown[][]) {
    for (const f of list as Record<string, unknown>[]) {
      const v = f.value;
      for (const s of (Array.isArray(v) ? v : [v]).map(str).filter(Boolean))
        out.push({ text: s, where: 'a form field', page: null });
    }
  }
  const att0 = await doc.getAttachments();
  const attachments =
    att0 instanceof Map
      ? [...att0.entries()]
      : Object.entries((att0 ?? {}) as Record<string, unknown>);
  for (const [key, a] of attachments as [string, unknown][]) {
    const att = a as { filename?: unknown; description?: unknown };
    out.push({
      text: str(att.filename) || key,
      where: 'an attachment name',
      page: null,
    });
    if (str(att.description))
      out.push({
        text: str(att.description),
        where: 'an attachment description',
        page: null,
      });
  }
  return out;
}
