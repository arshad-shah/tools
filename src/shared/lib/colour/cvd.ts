import {
  fromLinearRgb,
  linearRgb,
  luminance,
  type Color,
  type Vec3,
} from './convert';

export type CvdType = 'protan' | 'deutan' | 'tritan' | 'achroma';

/**
 * Machado, Oliveira and Fernandes (2009) simulation matrices at severity
 * 1.0, applied to linear sRGB.
 */
const MACHADO: Record<Exclude<CvdType, 'achroma'>, Vec3[]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * How `c` looks with a colour vision deficiency. `severity` 0 to 1 blends
 * linearly between normal vision and the full deficiency.
 */
export function simulateCvd(c: Color, type: CvdType, severity = 1): Color {
  const s = clamp01(severity);
  const lin = linearRgb(c);
  let full: Vec3;
  if (type === 'achroma') {
    const y = luminance(c);
    full = [y, y, y];
  } else {
    const m = MACHADO[type];
    full = m.map(
      (row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2],
    ) as Vec3;
  }
  const mixed = lin.map((v, i) => clamp01(v + (full[i] - v) * s)) as Vec3;
  return fromLinearRgb(mixed, c.alpha);
}
