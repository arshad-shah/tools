import { ToolError } from '@/shared/lib/errors';

export type IconFont = 'Inter' | 'JetBrains Mono';
export type IconShape = 'square' | 'rounded' | 'circle';

export type IconSource =
  | { kind: 'image'; bitmap: ImageBitmap }
  | { kind: 'svg'; svg: string }
  | {
      kind: 'text';
      text: string;
      font: IconFont;
      fg: string;
      bg: string;
      shape: IconShape;
      /** Fraction of the size left empty on each side, 0 to 0.3. */
      padding: number;
    };

export interface RenderOptions {
  /** Extra inset for maskable icons (the 80% safe zone is 0.1). */
  maskablePadding?: number;
  /** Fills the whole square first (maskable icons must be opaque). */
  background?: string;
}

const FAMILY: Record<IconFont, string> = {
  Inter: "'Inter Variable', Inter, sans-serif",
  'JetBrains Mono': "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
};

export const MAX_TEXT = 3;

/** The square the artwork is drawn into, after padding and safe zone. */
export function contentBox(
  size: number,
  padding = 0,
  maskablePadding = 0,
): { x: number; y: number; size: number } {
  const inset = Math.round(size * Math.min(0.45, padding + maskablePadding));
  return { x: inset, y: inset, size: size - 2 * inset };
}

/** Fits `w` by `h` inside a square of side `box`, centred (contain). */
export function containRect(
  w: number,
  h: number,
  box: { x: number; y: number; size: number },
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(box.size / w, box.size / h);
  const width = w * scale;
  const height = h * scale;
  return {
    x: box.x + (box.size - width) / 2,
    y: box.y + (box.size - height) / 2,
    width,
    height,
  };
}

export function validateText(text: string): void {
  const chars = [...text.trim()];
  if (chars.length < 1 || chars.length > MAX_TEXT)
    throw new ToolError(
      'INVALID_INPUT',
      'Use 1 to 3 characters for a text icon',
    );
}

function shapePath(
  g: OffscreenCanvasRenderingContext2D,
  shape: IconShape,
  x: number,
  y: number,
  s: number,
) {
  g.beginPath();
  if (shape === 'circle') g.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
  else if (shape === 'rounded') g.roundRect(x, y, s, s, s * 0.22);
  else g.rect(x, y, s, s);
}

/** SVG text to a drawable image at `size` (main thread: needs an img element). */
async function svgImage(svg: string, size: number): Promise<HTMLImageElement> {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  // Without explicit dimensions an SVG may rasterise at 0x0 or 300x150.
  if (!root.getAttribute('width') || root.getAttribute('width')?.endsWith('%'))
    root.setAttribute('width', String(size));
  if (
    !root.getAttribute('height') ||
    root.getAttribute('height')?.endsWith('%')
  )
    root.setAttribute('height', String(size));
  const blob = new Blob([new XMLSerializer().serializeToString(doc)], {
    type: 'image/svg+xml',
  });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', 'This SVG could not be drawn', {
      cause,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Renders one icon size as a PNG blob on an OffscreenCanvas: an image or
 * SVG fitted inside the padded box, or 1 to 3 characters on a shape.
 */
export async function renderIcon(
  source: IconSource,
  size: number,
  opts: RenderOptions = {},
): Promise<Blob> {
  if (typeof OffscreenCanvas === 'undefined')
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot draw icons (no OffscreenCanvas)',
    );
  const canvas = new OffscreenCanvas(size, size);
  const g = canvas.getContext('2d');
  if (!g) throw new ToolError('UNKNOWN', 'Unable to get a canvas context');
  g.imageSmoothingQuality = 'high';
  const mask = opts.maskablePadding ?? 0;
  if (opts.background) {
    g.fillStyle = opts.background;
    g.fillRect(0, 0, size, size);
  }
  if (source.kind === 'text') {
    validateText(source.text);
    // Maskable: the shape fills the square and the text keeps to the safe zone.
    const shapeBox = contentBox(size);
    g.fillStyle = source.bg;
    shapePath(
      g,
      mask > 0 ? 'square' : source.shape,
      shapeBox.x,
      shapeBox.y,
      shapeBox.size,
    );
    g.fill();
    const box = contentBox(size, source.padding, mask);
    const family = FAMILY[source.font];
    const text = source.text.trim();
    if (typeof document !== 'undefined' && document.fonts)
      await document.fonts
        .load(`600 ${box.size}px ${family}`, text)
        .catch(() => []);
    g.font = `600 ${box.size}px ${family}`;
    const m = g.measureText(text);
    const height =
      m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || box.size;
    const scale =
      Math.min(box.size / Math.max(1, m.width), box.size / height) * 0.9;
    const px = Math.max(1, Math.floor(box.size * scale));
    g.font = `600 ${px}px ${family}`;
    g.fillStyle = source.fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const mm = g.measureText(text);
    // Centre the ink box, not the em box.
    const dy = (mm.actualBoundingBoxAscent - mm.actualBoundingBoxDescent) / 2;
    g.fillText(text, size / 2, size / 2 + dy);
  } else {
    const box = contentBox(size, 0, mask);
    const drawable =
      source.kind === 'image'
        ? source.bitmap
        : await svgImage(source.svg, box.size);
    const w = source.kind === 'image' ? source.bitmap.width : drawable.width;
    const h = source.kind === 'image' ? source.bitmap.height : drawable.height;
    const r = containRect(w || box.size, h || box.size, box);
    g.drawImage(drawable, r.x, r.y, r.width, r.height);
  }
  return canvas.convertToBlob({ type: 'image/png' });
}
