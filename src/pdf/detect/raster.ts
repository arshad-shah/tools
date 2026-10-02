import { pageViewport, toPage } from '@/pdf/doc/geometry';
import type { PageGeom } from '@/pdf/doc/types';
import type { Matrix, OperatorListLike, OpsTable, Seg } from './types';

/**
 * Raster ruling detection for image-only pages (spec 11 "Scans as forms"):
 * binarise a grey render with Otsu, find long dark runs per row and per
 * column, and hand them to the same cell builder as vector segments.
 */

export interface GrayImage {
  width: number;
  height: number;
  /** One byte per pixel, row-major, 0 = black. */
  data: Uint8Array;
}

/** Runs shorter than this many points are not rules (spec 11). */
export const MIN_RULE_PT = 36;
/** Gaps up to this many pixels are closed (morphological closing). */
const CLOSE_GAP = 3;
/** Rows (or columns) of one rule; thicker dark groups are bars or blocks. */
const MAX_THICKNESS = 4;
/** A closed run must be mostly ink: text rows close into half-empty runs. */
const MIN_FILL = 0.85;

/** Otsu's threshold over an 8-bit grey histogram: dark is `<= threshold`. */
export function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * hist[v];
  let sumB = 0;
  let wB = 0;
  let best = -1;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** RGBA (canvas `getImageData`) to grey, Rec. 601 luma. */
export function toGray(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): GrayImage {
  const data = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i++, j += 4)
    data[i] = Math.round(
      0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2],
    );
  return { width, height, data };
}

interface Run {
  start: number;
  /** Exclusive. */
  end: number;
}

/** Dark runs of one line after closing gaps <= CLOSE_GAP, kept when long and mostly ink. */
function lineRuns(
  dark: (i: number) => boolean,
  length: number,
  minLen: number,
): Run[] {
  const out: Run[] = [];
  let start = -1;
  let lastDark = -1;
  let ink = 0;
  const flush = () => {
    if (start < 0) return;
    const end = lastDark + 1;
    if (end - start >= minLen && ink / (end - start) >= MIN_FILL)
      out.push({ start, end });
    start = -1;
    ink = 0;
  };
  for (let i = 0; i < length; i++) {
    if (!dark(i)) continue;
    if (start >= 0 && i - lastDark - 1 > CLOSE_GAP) flush();
    if (start < 0) start = i;
    lastDark = i;
    ink++;
  }
  flush();
  return out;
}

interface Group {
  first: number;
  last: number;
  start: number;
  end: number;
}

const overlaps = (a: Run, b: Run) => {
  const o = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  return o > 0.5 * Math.min(a.end - a.start, b.end - b.start);
};

/**
 * Rules along one axis: `lines` rows (or columns) of `length` pixels each.
 * Runs on consecutive lines that overlap form one group; groups at most
 * MAX_THICKNESS thick become one segment on their centre line.
 */
function axisRules(
  lines: number,
  length: number,
  dark: (line: number, i: number) => boolean,
  minLen: number,
): { at: number; start: number; end: number }[] {
  const out: { at: number; start: number; end: number }[] = [];
  let open: Group[] = [];
  const close = (g: Group) => {
    if (g.last - g.first + 1 <= MAX_THICKNESS)
      out.push({ at: (g.first + g.last + 1) / 2, start: g.start, end: g.end });
  };
  for (let line = 0; line < lines; line++) {
    const runs = lineRuns((i) => dark(line, i), length, minLen);
    const next: Group[] = [];
    for (const r of runs) {
      const k = open.findIndex((g) => overlaps(g, r));
      if (k >= 0) {
        const g = open.splice(k, 1)[0];
        next.push({
          first: g.first,
          last: line,
          start: Math.min(g.start, r.start),
          end: Math.max(g.end, r.end),
        });
      } else next.push({ first: line, last: line, ...r });
    }
    open.forEach(close);
    open = next;
  }
  open.forEach(close);
  return out;
}

/**
 * Horizontal and vertical rules of a scanned page, in image pixel
 * coordinates (pixel edges: a 2px rule on rows 50-51 lies at y = 51).
 */
export function rulingSegments(gray: GrayImage, dpi: number): Seg[] {
  const { width, height, data } = gray;
  if (width === 0 || height === 0) return [];
  const t = otsuThreshold(data);
  // A blank page: Otsu splits the paper itself; nothing is ink.
  let min = 255;
  for (let i = 0; i < data.length; i++) if (data[i] < min) min = data[i];
  if (min > 160) return [];
  const minLen = (MIN_RULE_PT * dpi) / 72;
  const h = axisRules(
    height,
    width,
    (y, x) => data[y * width + x] <= t,
    minLen,
  );
  const v = axisRules(
    width,
    height,
    (x, y) => data[y * width + x] <= t,
    minLen,
  );
  return [
    ...h.map((s) => ({ x1: s.start, y1: s.at, x2: s.end, y2: s.at })),
    ...v.map((s) => ({ x1: s.at, y1: s.start, x2: s.at, y2: s.end })),
  ];
}

/** Image-pixel segments of a render at `dpi` to page space (rotation included). */
export function segmentsToPage(
  segs: Seg[],
  geom: PageGeom,
  dpi: number,
): Seg[] {
  const vp = pageViewport(geom, 0, dpi / 72);
  return segs.map((s) => {
    const [x1, y1] = toPage(vp, s.x1, s.y1);
    const [x2, y2] = toPage(vp, s.x2, s.y2);
    return { x1, y1, x2, y2 };
  });
}

/** The pdf.js `OPS` numbers `imageCoverage` reads. */
export type ImageOpsTable = Pick<
  OpsTable,
  | 'save'
  | 'restore'
  | 'transform'
  | 'paintFormXObjectBegin'
  | 'paintFormXObjectEnd'
> & {
  paintImageXObject: number;
  paintInlineImageXObject: number;
  paintImageXObjectRepeat?: number;
};

const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

/**
 * Share of the page (0-1) covered by its largest image: images paint the
 * unit square under the current transform. Clipped to the page view.
 */
export function imageCoverage(
  list: OperatorListLike,
  OPS: ImageOpsTable,
  view: [number, number, number, number],
): number {
  const [vx0, vy0, vx1, vy1] = view;
  const area = Math.abs(vx1 - vx0) * Math.abs(vy1 - vy0);
  if (area <= 0) return 0;
  const images = new Set(
    [
      OPS.paintImageXObject,
      OPS.paintInlineImageXObject,
      OPS.paintImageXObjectRepeat,
    ].filter((n): n is number => n !== undefined),
  );
  const stack: Matrix[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  let best = 0;
  for (let i = 0; i < list.fnArray.length; i++) {
    const fn = list.fnArray[i];
    const args = (list.argsArray[i] ?? []) as unknown[];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = mul(args as Matrix, ctm);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      const m = args[0] as Matrix | null | undefined;
      if (m && m.length === 6) ctm = mul(Array.from(m) as Matrix, ctm);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (images.has(fn)) {
      const pts = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([x, y]) => [
        ctm[0] * x + ctm[2] * y + ctm[4],
        ctm[1] * x + ctm[3] * y + ctm[5],
      ]);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const w = Math.min(Math.max(...xs), vx1) - Math.max(Math.min(...xs), vx0);
      const h = Math.min(Math.max(...ys), vy1) - Math.max(Math.min(...ys), vy0);
      if (w > 0 && h > 0) best = Math.max(best, (w * h) / area);
    }
  }
  return best;
}
