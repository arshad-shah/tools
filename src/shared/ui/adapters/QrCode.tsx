import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';

export interface QrCodeProps {
  value: string;
  /** CSS px. */
  size: number;
  level: 'L' | 'M' | 'Q' | 'H';
  /** User-chosen colours (validated hex), not theme tokens: the code prints. */
  fg: string;
  bg: string;
  label: string;
  format: 'svg' | 'canvas';
  includeMargin?: boolean;
  minVersion?: number;
  imageSettings?: {
    src: string;
    width: number;
    height: number;
    excavate: boolean;
  };
}

/** QR code as SVG or canvas (qrcode.react behind the kit). */
export function QrCode({
  value,
  size,
  level,
  fg,
  bg,
  label,
  format,
  includeMargin,
  minVersion,
  imageSettings,
}: QrCodeProps) {
  const props = {
    value,
    size,
    level,
    fgColor: fg,
    bgColor: bg,
    marginSize: includeMargin ? 4 : 0,
    minVersion,
    imageSettings,
    title: label,
  };
  return (
    <span role="img" aria-label={label} className="inline-flex">
      {format === 'svg' ? (
        <QRCodeSVG {...props} />
      ) : (
        <QRCodeCanvas {...props} />
      )}
    </span>
  );
}
QrCode.displayName = 'QrCode';
