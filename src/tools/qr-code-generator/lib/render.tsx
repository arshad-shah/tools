import { ToolError } from '@/shared/lib/errors';
import { qrToSvg } from '@arshad-shah/cynosure';

export type EccLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrStyle {
  fg: string;
  bg: string;
  ecc: EccLevel;
  /** Quiet zone in modules (0 to 8). */
  margin: number;
  /** A local logo as a data URL; '' for none. */
  logo: string;
  /** The logo's width as a share of the code's (0.1 to 0.3). */
  logoFraction: number;
  /** Kept for saved styles: Cynosure always clears the modules behind a logo. */
  excavate: boolean;
}

/** One QR code as standalone SVG text (vector, any size), drawn by Cynosure. */
export async function qrSvg(
  value: string,
  style: QrStyle,
  size = 512,
): Promise<string> {
  try {
    return qrToSvg(value || ' ', {
      level: style.ecc,
      quietZone: style.margin,
      size,
      color: style.fg,
      background: style.bg,
      logo: style.logo
        ? { href: style.logo, size: Math.min(0.3, style.logoFraction) }
        : undefined,
    });
  } catch (cause) {
    throw new ToolError('UNKNOWN', 'Could not draw the QR code', { cause });
  }
}

/** Rasterises SVG text to a PNG of `px` square (browser only). */
export async function svgToPng(svg: string, px: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = new OffscreenCanvas(px, px);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, px, px);
    return await canvas.convertToBlob({ type: 'image/png' });
  } catch (cause) {
    throw new ToolError('UNKNOWN', 'Could not make the PNG', { cause });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Pixels for a physical size at a print resolution (300 dpi default). */
export const printPixels = (mm: number, dpi = 300) =>
  Math.max(1, Math.round((mm / 25.4) * dpi));
