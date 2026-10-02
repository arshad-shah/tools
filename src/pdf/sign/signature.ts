import type { SignatureFontId } from './fonts';

export type SignatureSource =
  | {
      kind: 'image';
      bytes: Uint8Array;
      format: 'png' | 'jpeg';
      width: number;
      height: number;
    }
  | { kind: 'text'; text: string; fontId: SignatureFontId; color: string };

export const INK_COLORS: { value: string; label: string }[] = [
  { value: '#111827', label: 'Black' },
  { value: '#1e3a8a', label: 'Blue' },
];

/** Props shared by the draw, upload and type sources. */
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
