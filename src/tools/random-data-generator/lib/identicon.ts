import { createPrng } from '@/shared/lib/prng';

/**
 * A GitHub-style identicon: a 5 by 5 grid mirrored left to right, coloured
 * from the seed, as an SVG data URI. Generated locally (no network) and the
 * same for the same seed.
 */
export function identiconSvgDataUri(seedText: string): string {
  const rng = createPrng(`identicon:${seedText}`);
  const hue = rng.int(360);
  const cells: string[] = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++)
      if (rng.int(2) === 1) {
        cells.push(`M${x} ${y}h1v1h-1z`);
        if (x < 2) cells.push(`M${4 - x} ${y}h1v1h-1z`);
      }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 6 6" width="64" height="64">` +
    `<rect x="-0.5" y="-0.5" width="6" height="6" fill="hsl(${hue} 30% 94%)"/>` +
    `<path fill="hsl(${hue} 55% 45%)" d="${cells.join('')}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
