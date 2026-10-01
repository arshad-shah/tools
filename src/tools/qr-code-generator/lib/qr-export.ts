import { ToolError } from '@/shared/lib/errors';

export const qrFilename = (
  qrType: string,
  renderAs: 'canvas' | 'svg',
  now = Date.now(),
) => `qrcode-${qrType}-${now}.${renderAs === 'canvas' ? 'png' : 'svg'}`;

/** Encodes the QR code rendered inside `container` as PNG or SVG. */
export async function qrToBlob(
  container: HTMLElement,
  renderAs: 'canvas' | 'svg',
): Promise<Blob> {
  if (renderAs === 'canvas') {
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new ToolError('UNKNOWN', 'The QR code is not ready yet');
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!blob) throw new ToolError('UNKNOWN', 'Could not export the QR code');
    return blob;
  }
  const svg = container.querySelector('svg');
  if (!svg) throw new ToolError('UNKNOWN', 'The QR code is not ready yet');
  return new Blob([new XMLSerializer().serializeToString(svg)], {
    type: 'image/svg+xml;charset=utf-8',
  });
}
