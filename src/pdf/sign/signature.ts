import type { SignatureFontId } from './fonts';
import type { InkVector } from './ink';

export type SignatureSource =
  | {
      kind: 'image';
      bytes: Uint8Array;
      format: 'png' | 'jpeg';
      width: number;
      height: number;
    }
  | { kind: 'text'; text: string; fontId: SignatureFontId; color: string }
  /** Pen strokes as one filled vector path (pad px, y down). */
  | { kind: 'ink'; vector: InkVector; color: string }
  /** A photo traced to outlines (mask px, y down), filled even-odd. */
  | { kind: 'trace'; vector: InkVector; color: string };

export const INK_COLORS: readonly { value: string; label: string }[] = [
  { value: '#111827', label: 'Black' },
  { value: '#1d4ed8', label: 'Blue' },
  { value: '#1e3a8a', label: 'Dark blue' },
];

/** Props shared by the draw, upload, type and photo sources. */
export interface SignatureSourceProps {
  onChange: (source: SignatureSource | null) => void;
  disabled?: boolean;
}

/** PNG bytes from a canvas. */
export async function canvasToPng(
  canvas: OffscreenCanvas,
): Promise<Uint8Array> {
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}
