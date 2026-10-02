import { formatColor, parseColor } from '@/shared/lib/colour';

export interface PaletteEntry {
  /** Step or role, e.g. `50`, `500` or `complementary`. */
  label: string;
  /** Any CSS colour; exported as hex. */
  color: string;
}

export interface ExportPalette {
  name: string;
  entries: PaletteEntry[];
}

export type PaletteFormat = 'css' | 'tailwind' | 'json' | 'svg';

/** A CSS-identifier-safe slug: `Brand Blue` to `brand-blue`. */
export function tokenName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'palette';
}

const hex = (c: string) => formatColor(parseColor(c), 'hex');

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

const SWATCH = 96;
const LABEL = 40;

function svgSheet(name: string, entries: PaletteEntry[]): string {
  const width = Math.max(1, entries.length) * SWATCH;
  const height = SWATCH + LABEL;
  const cells = entries
    .map((e, i) => {
      const x = i * SWATCH;
      const h = hex(e.color);
      return [
        `  <rect x="${x}" y="0" width="${SWATCH}" height="${SWATCH}" fill="${h}"/>`,
        `  <text x="${x + 8}" y="${SWATCH + 16}" font-family="sans-serif" font-size="12" fill="#111111">${escapeXml(e.label)}</text>`,
        `  <text x="${x + 8}" y="${SWATCH + 32}" font-family="monospace" font-size="11" fill="#555555">${h}</text>`,
      ].join('\n');
    })
    .join('\n');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <title>${escapeXml(name)}</title>`,
    cells,
    '</svg>',
    '',
  ].join('\n');
}

/** A palette as CSS variables, a Tailwind v4 theme, design tokens or an SVG sheet. */
export function exportPalette(
  palette: ExportPalette,
  fmt: PaletteFormat,
): string {
  const name = tokenName(palette.name);
  const label = (l: string) => tokenName(l);
  switch (fmt) {
    case 'css':
      return [
        ':root {',
        ...palette.entries.map(
          (e) => `  --${name}-${label(e.label)}: ${hex(e.color)};`,
        ),
        '}',
        '',
      ].join('\n');
    case 'tailwind':
      return [
        '@theme {',
        ...palette.entries.map(
          (e) => `  --color-${name}-${label(e.label)}: ${hex(e.color)};`,
        ),
        '}',
        '',
      ].join('\n');
    case 'json': {
      const group: Record<string, { $type: 'color'; $value: string }> = {};
      for (const e of palette.entries)
        group[label(e.label)] = { $type: 'color', $value: hex(e.color) };
      return `${JSON.stringify({ [name]: group }, null, 2)}\n`;
    }
    case 'svg':
      return svgSheet(palette.name, palette.entries);
  }
}
