import { getStroke } from 'perfect-freehand';
import { docSize, fullSize, type Doc } from './doc';
import { orientMatrix, pixelRect, type Rect, type Size } from './geometry';
import type { AnnotObject, TextObject } from './model';
import { stepNumber } from './model';
import { blur, pixelate } from './redact';

/** A 2D context on a canvas element or an OffscreenCanvas. */
export type Ctx2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const LINE_HEIGHT = 1.25;

export const fontFor = (size: number) => `600 ${size}px ${FONT_FAMILY}`;

/** Black or white, whichever reads better on `color` (#rgb or #rrggbb). */
export function contrastOn(color: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return '#ffffff';
  const hex =
    m[1].length === 3
      ? m[1]
          .split('')
          .map((c) => c + c)
          .join('')
      : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? '#000000' : '#ffffff';
}

/** Text size from a context: the widest line and the line count. */
export function measureWith(ctx: Ctx2D) {
  return (text: string, size: number) => {
    ctx.font = fontFor(size);
    const lines = text.split('\n');
    const width = Math.max(1, ...lines.map((l) => ctx.measureText(l).width));
    return {
      width: Math.ceil(width),
      height: Math.ceil(lines.length * size * LINE_HEIGHT),
    };
  };
}

/**
 * A text measurer on its own small OffscreenCanvas; where there is none,
 * an estimate (average glyph width) that keeps the frame near the text.
 */
export function createMeasure() {
  const ctx =
    typeof OffscreenCanvas === 'undefined'
      ? null
      : new OffscreenCanvas(1, 1).getContext('2d');
  if (ctx) return measureWith(ctx);
  return (text: string, size: number) => {
    const lines = text.split('\n');
    return {
      width: Math.ceil(Math.max(1, ...lines.map((l) => l.length * size * 0.6))),
      height: Math.ceil(lines.length * size * LINE_HEIGHT),
    };
  };
}

function paintArrowHead(
  ctx: Ctx2D,
  o: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    width: number;
  },
) {
  const len = Math.max(10, o.width * 4);
  const angle = Math.atan2(o.to.y - o.from.y, o.to.x - o.from.x);
  const spread = Math.PI / 7;
  ctx.beginPath();
  ctx.moveTo(o.to.x, o.to.y);
  ctx.lineTo(
    o.to.x - len * Math.cos(angle - spread),
    o.to.y - len * Math.sin(angle - spread),
  );
  ctx.lineTo(
    o.to.x - len * Math.cos(angle + spread),
    o.to.y - len * Math.sin(angle + spread),
  );
  ctx.closePath();
  ctx.fill();
}

function paintText(ctx: Ctx2D, o: TextObject) {
  ctx.font = fontFor(o.size);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, o.size / 7);
  ctx.strokeStyle = contrastOn(o.color);
  ctx.fillStyle = o.color;
  o.text.split('\n').forEach((line, i) => {
    const y =
      o.at.y + i * o.size * LINE_HEIGHT + (o.size * (LINE_HEIGHT - 1)) / 2;
    ctx.strokeText(line, o.at.x, y);
    ctx.fillText(line, o.at.x, y);
  });
}

/** Destroys the pixels under a redaction (canvas pixels, clipped). */
function paintRedaction(
  ctx: Ctx2D,
  box: Rect,
  size: Size,
  kind: 'blur' | 'pixelate',
  strength: number,
) {
  const r = pixelRect(box, size);
  if (!r) return;
  const img = ctx.getImageData(r.x, r.y, r.width, r.height);
  if (kind === 'pixelate') pixelate(img, strength);
  else blur(img, strength);
  ctx.putImageData(img, r.x, r.y);
}

/**
 * Paints one object in canvas pixels. `offset` is where the edited image's
 * corner sits on the canvas (non-zero only while cropping).
 */
export function paintObject(
  ctx: Ctx2D,
  o: AnnotObject,
  all: readonly AnnotObject[],
  canvas: Size,
  offset = { x: 0, y: 0 },
) {
  if (o.type === 'blur' || o.type === 'pixelate') {
    const box = { ...o.box, x: o.box.x + offset.x, y: o.box.y + offset.y };
    paintRedaction(ctx, box, canvas, o.type, o.strength);
    return;
  }
  ctx.save();
  ctx.translate(offset.x, offset.y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (o.type) {
    case 'arrow':
    case 'line': {
      ctx.strokeStyle = o.color;
      ctx.fillStyle = o.color;
      ctx.lineWidth = o.width;
      const head = o.type === 'arrow' ? Math.max(10, o.width * 4) * 0.6 : 0;
      const len = Math.hypot(o.to.x - o.from.x, o.to.y - o.from.y) || 1;
      const k = Math.max(0, (len - head) / len);
      ctx.beginPath();
      ctx.moveTo(o.from.x, o.from.y);
      ctx.lineTo(
        o.from.x + (o.to.x - o.from.x) * k,
        o.from.y + (o.to.y - o.from.y) * k,
      );
      ctx.stroke();
      if (o.type === 'arrow') paintArrowHead(ctx, o);
      break;
    }
    case 'rect':
      ctx.strokeStyle = o.color;
      ctx.lineWidth = o.width;
      ctx.strokeRect(o.box.x, o.box.y, o.box.width, o.box.height);
      break;
    case 'ellipse':
      ctx.strokeStyle = o.color;
      ctx.lineWidth = o.width;
      ctx.beginPath();
      ctx.ellipse(
        o.box.x + o.box.width / 2,
        o.box.y + o.box.height / 2,
        Math.max(0.5, o.box.width / 2),
        Math.max(0.5, o.box.height / 2),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    case 'highlight':
      ctx.globalAlpha = 0.4;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = o.color;
      ctx.fillRect(o.box.x, o.box.y, o.box.width, o.box.height);
      break;
    case 'pen': {
      const outline = getStroke(
        o.points.map((p) => [p.x, p.y, p.p]),
        {
          size: o.width * 1.6,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.4,
          simulatePressure: false,
          last: true,
        },
      );
      if (!outline.length) break;
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (const [x, y] of outline.slice(1)) ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'text':
      paintText(ctx, o);
      break;
    case 'step': {
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.arc(o.center.x, o.center.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = contrastOn(o.color);
      ctx.font = fontFor(Math.round(o.radius * 1.1));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        String(stepNumber(all, o.id)),
        o.center.x,
        o.center.y + o.radius * 0.05,
      );
      break;
    }
  }
  ctx.restore();
}

export interface PaintOptions {
  /** The decoded source image. */
  image: CanvasImageSource;
  doc: Doc;
  /** Objects to draw instead of the doc's (a preview while dragging). */
  objects?: readonly AnnotObject[];
  /** While cropping: the whole oriented image, dimmed outside this rect. */
  cropping?: Rect | null;
  /** Fill under the image (JPEG has no transparency). */
  background?: string | null;
  /** Mask colour outside the crop. */
  dim?: string;
}

/** The canvas size the paint needs. */
export const paintSize = (doc: Doc, cropping: boolean): Size =>
  cropping ? fullSize(doc) : docSize(doc);

/** Paints the image, its orientation and crop, and every object. */
export function paintDoc(ctx: Ctx2D, opts: PaintOptions) {
  const { doc, cropping = null } = opts;
  const size = paintSize(doc, !!cropping);
  const objects = opts.objects ?? doc.objects;
  const origin = cropping ? { x: 0, y: 0 } : { x: doc.crop.x, y: doc.crop.y };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, size.width, size.height);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, size.width, size.height);
  }
  ctx.save();
  ctx.translate(-origin.x, -origin.y);
  ctx.transform(...orientMatrix(doc.source, doc.turns, doc.flip));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(opts.image, 0, 0);
  ctx.restore();
  const offset = cropping ? { x: doc.crop.x, y: doc.crop.y } : { x: 0, y: 0 };
  for (const o of objects) paintObject(ctx, o, objects, size, offset);
  if (cropping) {
    ctx.save();
    ctx.fillStyle = opts.dim ?? 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.rect(0, 0, size.width, size.height);
    ctx.rect(cropping.x, cropping.y, cropping.width, cropping.height);
    ctx.fill('evenodd');
    ctx.restore();
  }
}
