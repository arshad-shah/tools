/** The whole photo clean-up: from camera pixels to a level, cropped ink mask. */
import { ToolError } from '@/shared/lib/errors';
import { adaptiveThreshold, downscale, toGray, type Mask } from './binarize';
import { close3, despeckle, dropBorderComponents } from './components';
import { cropMask, inkBounds } from './crop';
import { rotateMask, skewAngle } from './deskew';

export interface PhotoResult {
  mask: Mask;
  /** Skew that was removed, degrees, positive rising to the right. */
  angle: number;
  inkPixels: number;
}

export interface CleanOptions {
  /** Bradley-Roth sensitivity (default 0.15). */
  t?: number;
}

/** Longest side processed; larger photos are box-filtered down first. */
const MAX_SIDE = 1600;
/** Below this share of the image the photo holds no usable signature. */
const MIN_INK_RATIO = 0.001;

const noSignature = () =>
  new ToolError(
    'INVALID_INPUT',
    'No signature found in this photo. Use dark ink on light paper and fill the frame.',
  );

/**
 * toGray, downscale(1600), adaptiveThreshold, despeckle, close3,
 * dropBorderComponents, skewAngle, rotateMask(-angle), inkBounds, cropMask.
 */
export function cleanSignaturePhoto(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts: CleanOptions = {},
): PhotoResult {
  const gray = downscale(toGray(rgba, width, height), MAX_SIDE);
  let mask = adaptiveThreshold(gray, { t: opts.t });
  mask = despeckle(mask);
  mask = close3(mask);
  mask = dropBorderComponents(mask);
  if (countInk(mask) < MIN_INK_RATIO * mask.width * mask.height)
    throw noSignature();
  const angle = skewAngle(mask);
  const level = rotateMask(mask, -angle);
  const bounds = inkBounds(level);
  if (!bounds) throw noSignature();
  const cropped = cropMask(level, bounds);
  return { mask: cropped, angle, inkPixels: countInk(cropped) };
}

function countInk(m: Mask): number {
  let n = 0;
  for (let i = 0; i < m.data.length; i++) n += m.data[i];
  return n;
}
