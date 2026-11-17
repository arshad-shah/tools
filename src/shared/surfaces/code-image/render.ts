import { ToolError } from '@/shared/lib/errors';
import type { Token } from '@/shared/lib/syntax/tokenize';
import {
  canvasToBlob,
  createScratchCanvas,
  scratchContext2D,
  type ScratchContext2D,
} from '../scratch-canvas';
import {
  layoutCodeImage,
  type CodeImageLayout,
  type CodeImageOptions,
} from './layout';
import { fontOf, paintCodeImage } from './paint';
import type { CodeImageStyle } from './style';
import { codeImageSvg } from './svg';

export interface CodeImageInput {
  lines: readonly string[];
  tokens: readonly (readonly Token[])[];
  options: CodeImageOptions;
  style: CodeImageStyle;
}

/** Largest side and area a browser canvas reliably allows. */
export const MAX_SIDE = 16384;
export const MAX_AREA = 120_000_000;

/** Waits until web fonts in use have loaded (no-op without document.fonts). */
export async function fontsReady(family: string, size: number): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await document.fonts.load(fontOf(size, family));
    await document.fonts.ready;
  } catch {
    // A font that fails to load leaves the fallback in place: still drawable.
  }
}

function measuringContext(): ScratchContext2D {
  const g = scratchContext2D(createScratchCanvas(1, 1));
  if (!g)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot draw images here',
    );
  return g;
}

/** Lays the code out with the browser's real text metrics. */
export async function measureCodeImage(
  input: CodeImageInput,
): Promise<CodeImageLayout> {
  const { options, style } = input;
  await fontsReady(style.fontFamily, options.fontSize);
  const g = measuringContext();
  g.font = fontOf(options.fontSize, style.fontFamily);
  return layoutCodeImage(
    input.lines,
    input.tokens,
    options,
    (s) => g.measureText(s).width,
  );
}

/** Throws TOO_LARGE when the image at `scale` will not fit in a canvas. */
export function checkSize(layout: CodeImageLayout, scale: number): void {
  const w = Math.ceil(layout.width * scale);
  const h = Math.ceil(layout.height * scale);
  if (w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_AREA)
    throw new ToolError(
      'TOO_LARGE',
      `The image would be ${w} by ${h} pixels, too large to draw. Use less code, a smaller font or a lower scale.`,
    );
}

/** The image as a PNG at `scale` (1, 2 or 3 device pixels per CSS pixel). */
export async function renderCodeImagePng(
  input: CodeImageInput,
  scale: number,
): Promise<{ blob: Blob; layout: CodeImageLayout }> {
  const layout = await measureCodeImage(input);
  checkSize(layout, scale);
  const canvas = createScratchCanvas(
    Math.ceil(layout.width * scale),
    Math.ceil(layout.height * scale),
  );
  const g = scratchContext2D(canvas);
  if (!g)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser cannot draw an image this large',
    );
  paintCodeImage(g, layout, input.style, scale);
  const blob = await canvasToBlob(canvas, 'image/png');
  if (!blob)
    throw new ToolError(
      'UNSUPPORTED_FEATURE',
      'This browser could not encode the image as PNG',
    );
  return { blob, layout };
}

/** The image as SVG text, laid out with the same metrics as the PNG. */
export async function renderCodeImageSvg(
  input: CodeImageInput,
): Promise<string> {
  return codeImageSvg(await measureCodeImage(input), input.style);
}
