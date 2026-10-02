/** SVG export of line, area and bar charts, from the same model as the canvas. */
import type { Model } from './model';
import type { LinePoint } from './model-kinds';
import { runs } from './paint';
import { seriesColor, type ChartTheme } from './theme';

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const n = (v: number) => (Math.round(v * 100) / 100).toString();

function linePath(m: Model, pts: LinePoint[]): string {
  let d = '';
  let down = false;
  for (const p of pts) {
    if (p.y === null) {
      down = false;
      continue;
    }
    d += `${down ? 'L' : 'M'}${n(m.xs.map(p.x))} ${n(m.ys.map(p.y))}`;
    down = true;
  }
  return d;
}

function areaPath(m: Model, pts: LinePoint[]): string {
  return runs(pts)
    .map((run) => {
      const top = run.map(
        (p, i) => `${i ? 'L' : 'M'}${n(m.xs.map(p.x))} ${n(m.ys.map(p.y!))}`,
      );
      const bottom = [...run]
        .reverse()
        .map((p) => `L${n(m.xs.map(p.x))} ${n(m.ys.map(p.base))}`);
      return `${top.join('')}${bottom.join('')}Z`;
    })
    .join('');
}

/**
 * The chart as a standalone SVG document. Line and area series are one
 * stroked `path` each (areas add a translucent fill path); bars are rects.
 */
export function toSvg(m: Model, t: ChartTheme): string {
  const { plot } = m;
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}" viewBox="0 0 ${m.width} ${m.height}" font-family="${esc(t.font)}" font-size="11">`,
    `<rect width="100%" height="100%" fill="${t.surface}"/>`,
  ];
  for (const tick of m.yTicks) {
    const y = n(m.ys.map(tick.v));
    out.push(
      `<line x1="${n(plot.x)}" x2="${n(plot.x + plot.w)}" y1="${y}" y2="${y}" stroke="${t.grid}"/>`,
      `<text x="${n(plot.x - 6)}" y="${y}" fill="${t.muted}" text-anchor="end" dominant-baseline="middle">${esc(tick.label)}</text>`,
    );
  }
  for (const tick of m.xTicks)
    out.push(
      `<text x="${n(m.xs.map(tick.v))}" y="${n(plot.y + plot.h + 6)}" fill="${t.muted}" text-anchor="middle" dominant-baseline="hanging">${esc(tick.label)}</text>`,
    );
  if (m.xLabel)
    out.push(
      `<text x="${n(plot.x + plot.w / 2)}" y="${n(m.height - 2)}" fill="${t.muted}" text-anchor="middle">${esc(m.xLabel)}</text>`,
    );
  if (m.yLabel)
    out.push(
      `<text transform="translate(12 ${n(plot.y + plot.h / 2)}) rotate(-90)" fill="${t.muted}" text-anchor="middle">${esc(m.yLabel)}</text>`,
    );
  out.push(
    `<clipPath id="plot"><rect x="${n(plot.x)}" y="${n(plot.y)}" width="${n(plot.w)}" height="${n(plot.h)}"/></clipPath>`,
    `<g clip-path="url(#plot)">`,
  );
  for (const r of m.rects) {
    const x0 = m.xs.map(r.x0);
    const x1 = m.xs.map(r.x1);
    const ya = m.ys.map(r.y0);
    const yb = m.ys.map(r.y1);
    out.push(
      `<rect x="${n(Math.min(x0, x1))}" y="${n(Math.min(ya, yb))}" width="${n(Math.abs(x1 - x0))}" height="${n(Math.abs(yb - ya))}" fill="${r.color < 0 ? t.grid : seriesColor(t, r.color)}"${r.alpha < 1 ? ` fill-opacity="${r.alpha}"` : ''}/>`,
    );
  }
  for (const l of m.lines) {
    if (l.mode === 'scatter') continue;
    const color = seriesColor(t, l.color);
    if (l.mode === 'area')
      out.push(
        `<path d="${areaPath(m, l.pts)}" fill="${color}" fill-opacity="0.18" stroke="none"/>`,
      );
    out.push(
      `<path d="${linePath(m, l.pts)}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><title>${esc(l.label)}</title></path>`,
    );
  }
  out.push('</g></svg>');
  return out.join('\n');
}
