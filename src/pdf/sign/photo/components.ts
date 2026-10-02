/** Connected-component clean-up and morphology on ink masks. */
import type { Mask } from './binarize';

interface Labels {
  /** Component index per pixel, -1 for background. */
  label: Int32Array;
  area: number[];
  touchesBorder: boolean[];
}

/** 8-connected components via an iterative stack flood fill. */
function label(m: Mask): Labels {
  const { width: w, height: h, data } = m;
  const lab = new Int32Array(w * h).fill(-1);
  const area: number[] = [];
  const touchesBorder: boolean[] = [];
  const stack: number[] = [];
  for (let start = 0; start < data.length; start++) {
    if (!data[start] || lab[start] !== -1) continue;
    const id = area.length;
    let n = 0;
    let border = false;
    lab[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      n++;
      const x = p % w,
        y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const q = ny * w + nx;
          if (data[q] && lab[q] === -1) {
            lab[q] = id;
            stack.push(q);
          }
        }
      }
    }
    area.push(n);
    touchesBorder.push(border);
  }
  return { label: lab, area, touchesBorder };
}

function keep(m: Mask, ok: (id: number) => boolean): Mask {
  const { label: lab } = label(m);
  const data = new Uint8Array(m.data.length);
  for (let i = 0; i < data.length; i++)
    data[i] = lab[i] >= 0 && ok(lab[i]) ? 1 : 0;
  return { width: m.width, height: m.height, data };
}

/** Drops 8-connected components smaller than `minArea` (default max(8, 0.0002 * w * h)). */
export function despeckle(m: Mask, minArea?: number): Mask {
  const min = minArea ?? Math.max(8, 0.0002 * m.width * m.height);
  const { area } = label(m);
  return keep(m, (id) => area[id] >= min);
}

/** Components touching the image border are paper edges or shadows. */
export function dropBorderComponents(m: Mask): Mask {
  const { touchesBorder } = label(m);
  return keep(m, (id) => !touchesBorder[id]);
}

/** 3x3 max (dilate) or min (erode); outside the image counts as `outside`. */
function morph(m: Mask, dilate: boolean, outside: number): Mask {
  const { width: w, height: h, data } = m;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dy = -1; dy <= 1 && v === (dilate ? 0 : 1); dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          const s =
            nx < 0 || ny < 0 || nx >= w || ny >= h
              ? outside
              : data[ny * w + nx];
          if (dilate ? s === 1 : s === 0) {
            v = dilate ? 1 : 0;
            break;
          }
        }
      out[y * w + x] = v;
    }
  return { width: w, height: h, data: out };
}

/** 3x3 dilation then erosion (a closing): repairs broken strokes. */
export function close3(m: Mask): Mask {
  return morph(morph(m, true, 0), false, 1);
}
