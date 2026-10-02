import { ToolError } from '@/shared/lib/errors';
import { QrCode } from '@/shared/ui/adapters/QrCode';

export type EccLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrStyle {
  fg: string;
  bg: string;
  ecc: EccLevel;
  /** Quiet zone in modules (0 to 8). */
  margin: number;
  /** A local logo as a data URL; '' for none. */
  logo: string;
  /** Share of the code's area the logo covers (0 to 0.3). */
  logoFraction: number;
  excavate: boolean;
}

/** One QR code as standalone SVG text (vector, any size). */
export async function qrSvg(
  value: string,
  style: QrStyle,
  size = 512,
): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const side = Math.round(size * Math.sqrt(style.logoFraction));
  const logo = style.logo
    ? {
        src: style.logo,
        width: side,
        height: side,
        excavate: style.excavate,
      }
    : undefined;
  const html = renderToStaticMarkup(
    <QrCode
      value={value || ' '}
      size={size}
      level={style.ecc}
      fg={style.fg}
      bg={style.bg}
      label="QR code"
      format="svg"
      includeMargin={style.margin > 0}
      imageSettings={logo}
    />,
  );
  const start = html.indexOf('<svg');
  const end = html.lastIndexOf('</svg>');
  if (start < 0 || end < 0)
    throw new ToolError('UNKNOWN', 'Could not draw the QR code');
  const svg = html.slice(start, end + 6);
  return svg.includes('xmlns=')
    ? svg
    : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
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
