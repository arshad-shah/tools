/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/svg.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Exports. The SVG serialiser and the PNG renderer reuse the geometry the
 * screen draws, which is the point of keeping layout and routing free of any
 * drawing calls: an export can never drift from what is on screen.
 */
import { ToolError } from '@/shared/lib/errors';
import {
  CHIP_GAP,
  CHIP_PAD,
  HEADER_H,
  PAD_X,
  RADIUS,
  ROW_H,
  createMeasure,
  fit,
  rowValueText,
  valueWidth,
  type Card,
  type Measure,
} from './metrics';
import { paint } from './paint';
import { DOT_R, type Route } from './route';
import { SpatialIndex } from './spatial-index';
import type { DiagramTheme } from './theme-bridge';
import { bounds } from './viewport';

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c]);

export function toSvg(
  cards: Card[],
  routes: Route[],
  theme: DiagramTheme,
  pad = 32,
  measure: Measure = createMeasure({ family: theme.fontFamily }),
): string {
  const b = bounds(cards);
  const w = Math.ceil(b.w + pad * 2);
  const h = Math.ceil(b.h + pad * 2);
  const fs = theme.fontSizes;
  const family = esc(theme.fontFamily);
  const text = (
    x: number,
    y: number,
    fill: string,
    size: number,
    body: string,
    extra = '',
  ) =>
    `<text x="${x}" y="${y}" fill="${esc(fill)}" font-family="${family}" font-size="${size}"${extra}>${esc(body)}</text>`;
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="${w}" height="${h}" fill="${esc(theme.surface)}"/>`,
    `<g transform="translate(${pad - b.x} ${pad - b.y})">`,
  ];

  for (const r of routes) {
    let d = '';
    for (let i = 0; i < r.pts.length; i += 2)
      d += (i === 0 ? 'M' : 'L') + r.pts[i] + ' ' + r.pts[i + 1];
    out.push(
      `<path d="${d}" fill="none" stroke="${esc(theme.edge)}" stroke-width="1"${r.dashed ? ' stroke-dasharray="5 4"' : ''}/>`,
    );
    if (r.marker === 'dot')
      out.push(
        `<circle cx="${r.pts[r.pts.length - 2]}" cy="${r.pts[r.pts.length - 1]}" r="${DOT_R}" fill="${esc(theme.edge)}"/>`,
      );
  }

  for (const c of cards) {
    const n = c.node;
    const avail = c.w - PAD_X * 2;
    out.push(
      `<g transform="translate(${c.x} ${c.y})">`,
      `<rect width="${c.w}" height="${c.h}" rx="${RADIUS}" fill="${esc(theme.card)}" stroke="${esc(theme.cardBorder)}"/>`,
      `<path d="M0 ${RADIUS}a${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} -${RADIUS}h${c.w - RADIUS * 2}a${RADIUS} ${RADIUS} 0 0 1 ${RADIUS} ${RADIUS}v${HEADER_H - RADIUS}H0Z" fill="${esc(theme.cardHeader)}"/>`,
      `<line x1="0" y1="${HEADER_H}" x2="${c.w}" y2="${HEADER_H}" stroke="${esc(theme.divider)}"/>`,
    );
    const title = fit(n.title, theme.fontTitle, avail, measure);
    if (n.eyebrow) {
      out.push(
        text(
          PAD_X,
          14,
          theme.eyebrow,
          fs.eyebrow,
          fit(n.eyebrow, theme.fontEyebrow, avail, measure),
        ),
        text(PAD_X, 29, theme.title, fs.title, title, ' font-weight="600"'),
      );
    } else {
      out.push(
        text(
          PAD_X,
          HEADER_H / 2 + 4,
          theme.title,
          fs.title,
          title,
          ' font-weight="600"',
        ),
      );
    }
    n.rows.forEach((row, i) => {
      const y = c.rows[i].midY + 4;
      const value = rowValueText(row);
      const full = valueWidth(row, theme, measure);
      const vw = row.role === 'link' ? full : Math.min(full, avail * 0.6);
      const keyMax = Math.max(16, avail - (vw ? vw + CHIP_GAP : 0));
      const more = row.kind === 'more';
      const keyFont = more ? theme.fontRowItalic : theme.fontRow;
      out.push(
        text(
          PAD_X,
          y,
          more ? theme.value.more : theme.key,
          fs.row,
          fit(row.key, keyFont, keyMax, measure),
          more ? ' font-style="italic"' : '',
        ),
      );
      if (!value) return;
      if (row.role === 'link') {
        const x = c.w - PAD_X - vw;
        const ch = ROW_H - 6;
        out.push(
          `<rect x="${x}" y="${c.rows[i].midY - ch / 2}" width="${vw}" height="${ch}" rx="${ch / 2}" fill="${esc(theme.chip)}"/>`,
          text(x + CHIP_PAD, y, theme.chipText, fs.chip, value),
        );
      } else {
        out.push(
          text(
            c.w - PAD_X,
            y,
            theme.value[row.kind],
            fs.row,
            fit(value, theme.fontRow, vw, measure),
            ' text-anchor="end"',
          ),
        );
      }
    });
    out.push('</g>');
  }

  out.push('</g></svg>');
  return out.join('');
}

export interface PngOptions {
  /** Device pixels per CSS pixel. */
  scale: number;
  /** The scale drops until the image has at most this many pixels. */
  maxPixels: number;
  pad: number;
  measure?: Measure;
}

/** Browsers refuse canvases wider or taller than this. */
const MAX_SIDE = 16_384;

/**
 * Paints the whole diagram into an OffscreenCanvas and encodes a PNG. When
 * the image would exceed `maxPixels` (or a canvas side limit) the scale is
 * reduced, and the scale actually used is reported so the UI can say so.
 */
export async function toPng(
  model: { cards: Card[]; routes: Route[] },
  theme: DiagramTheme,
  opts: Partial<PngOptions> = {},
): Promise<{ blob: Blob; scaleUsed: number }> {
  const { scale = 2, maxPixels = 64e6, pad = 32 } = opts;
  if (typeof OffscreenCanvas === 'undefined')
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot export PNG images. Export SVG instead.',
    );
  const b = bounds(model.cards);
  const w = Math.ceil(b.w + pad * 2);
  const h = Math.ceil(b.h + pad * 2);
  let s = scale;
  if (w * h * s * s > maxPixels) s = Math.sqrt(maxPixels / (w * h));
  s = Math.min(s, MAX_SIDE / Math.max(w, h));
  s = Math.floor(s * 100) / 100;
  if (s <= 0)
    throw new ToolError(
      'TOO_LARGE',
      'This diagram is too large to export as PNG. Export SVG instead.',
    );

  const canvas = new OffscreenCanvas(Math.round(w * s), Math.round(h * s));
  const ctx = canvas.getContext('2d');
  if (!ctx)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot export PNG images. Export SVG instead.',
    );
  paint(ctx as unknown as CanvasRenderingContext2D, {
    cards: model.cards,
    routes: model.routes,
    index: SpatialIndex.build(model.cards, model.routes),
    view: { x: pad - b.x, y: pad - b.y, scale: 1 },
    theme,
    measure: opts.measure ?? createMeasure({ family: theme.fontFamily }),
    width: w,
    height: h,
    dpr: s,
    grid: false,
  });
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return { blob, scaleUsed: s };
}
