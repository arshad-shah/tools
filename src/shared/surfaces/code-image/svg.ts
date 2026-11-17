import type { CodeImageLayout } from './layout';
import { gradientLine, runColor, type CodeImageStyle } from './style';

/** Escapes text and attribute values for XML. */
export const xml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const n = (v: number) => String(Math.round(v * 100) / 100);

/**
 * The code image as SVG, text as real `<text>` elements (selectable,
 * searchable, sharp at any size). Mirrors `paintCodeImage`.
 */
export function codeImageSvg(
  layout: CodeImageLayout,
  style: CodeImageStyle,
): string {
  const { palette: p, backdrop } = style;
  const { window: w } = layout;
  const defs: string[] = [];
  const body: string[] = [];

  if (backdrop.kind === 'solid')
    body.push(
      `<rect width="${layout.width}" height="${layout.height}" fill="${xml(backdrop.color)}"/>`,
    );
  else if (backdrop.kind === 'gradient') {
    const l = gradientLine(layout.width, layout.height, backdrop.angle);
    const last = Math.max(1, backdrop.stops.length - 1);
    defs.push(
      `<linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="${n(l.x1)}" y1="${n(l.y1)}" x2="${n(l.x2)}" y2="${n(l.y2)}">${backdrop.stops
        .map((c, i) => `<stop offset="${n(i / last)}" stop-color="${xml(c)}"/>`)
        .join('')}</linearGradient>`,
    );
    body.push(
      `<rect width="${layout.width}" height="${layout.height}" fill="url(#bg)"/>`,
    );
  }

  const shape = `x="${w.x}" y="${w.y}" width="${w.width}" height="${w.height}" rx="${w.radius}"`;
  defs.push(`<clipPath id="window"><rect ${shape}/></clipPath>`);
  defs.push(
    `<clipPath id="code"><rect x="${layout.code.x}" y="${w.y}" width="${layout.code.width}" height="${w.height}"/></clipPath>`,
  );
  if (w.x > 0) {
    defs.push(
      `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="${n(Math.min(w.x / 3, layout.fontSize))}" stdDeviation="${n(Math.min(w.x, layout.fontSize * 3) / 2)}" flood-color="${xml(p.shadow)}"/></filter>`,
    );
    body.push(
      `<rect ${shape} fill="${xml(p.background)}" filter="url(#shadow)"/>`,
    );
  } else body.push(`<rect ${shape} fill="${xml(p.background)}"/>`);

  const inner: string[] = [];
  if (layout.chrome) {
    inner.push(
      `<rect x="${w.x}" y="${w.y}" width="${w.width}" height="${layout.chrome.height}" fill="${xml(p.chrome)}"/>`,
    );
    layout.chrome.dots.forEach((d, i) =>
      inner.push(
        `<circle cx="${n(d.cx)}" cy="${n(d.cy)}" r="${d.r}" fill="${xml(p.dots[i])}"/>`,
      ),
    );
    if (layout.chrome.title)
      inner.push(
        `<text x="${n(layout.chrome.title.x)}" y="${layout.chrome.title.baseline}" text-anchor="middle" font-weight="500" fill="${xml(p.title)}">${xml(layout.chrome.title.text)}</text>`,
      );
  }
  for (const r of layout.rows)
    if (r.highlighted)
      inner.push(
        `<rect x="${w.x}" y="${r.y}" width="${w.width}" height="${layout.rowHeight}" fill="${xml(p.highlight)}"/>`,
      );
  if (layout.gutterRight !== null)
    for (const r of layout.rows)
      if (r.lineNo !== null)
        inner.push(
          `<text x="${layout.gutterRight}" y="${r.baseline}" text-anchor="end" fill="${xml(r.highlighted ? p.gutterActive : p.gutter)}">${r.lineNo}</text>`,
        );
  const code = layout.rows
    .filter((r) => r.runs.length)
    .map(
      (r) =>
        `<text y="${r.baseline}" xml:space="preserve">${r.runs
          .map(
            (run) =>
              `<tspan x="${n(run.x)}" fill="${xml(runColor(p, run.kind))}">${xml(run.text)}</tspan>`,
          )
          .join('')}</text>`,
    );
  inner.push(`<g clip-path="url(#code)">${code.join('')}</g>`);
  body.push(`<g clip-path="url(#window)">${inner.join('')}</g>`);
  body.push(
    `<rect x="${w.x + 0.5}" y="${w.y + 0.5}" width="${w.width - 1}" height="${w.height - 1}" rx="${w.radius}" fill="none" stroke="${xml(p.border)}"/>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" font-family="${xml(style.fontFamily)}" font-size="${layout.fontSize}"><defs>${defs.join('')}</defs>${body.join('')}</svg>\n`;
}
