/**
 * The median colour of the pixels along a region's border, as '#rrggbb'
 * (per channel): what lies around text, so a cover blends with the page.
 */
export function borderMedian(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const take = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  };
  for (let x = 0; x < width; x++) {
    take(x, 0);
    if (height > 1) take(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    take(0, y);
    if (width > 1) take(width - 1, y);
  }
  const median = (v: number[]) => {
    if (v.length === 0) return 255;
    const s = [...v].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return `#${[rs, gs, bs]
    .map((c) => median(c).toString(16).padStart(2, '0'))
    .join('')}`;
}
