import { readThemeTokens } from '@/shared/lib/theme-tokens';

export const SERIES_TOKENS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
  'chart-7',
  'chart-8',
] as const;

const TOKENS = [
  ...SERIES_TOKENS,
  'fg',
  'fg-muted',
  'line',
  'surface',
  'accent',
  '--font-sans',
];

export interface ChartTheme {
  /** Series colours, chart-1 to chart-8. */
  series: string[];
  fg: string;
  muted: string;
  grid: string;
  surface: string;
  accent: string;
  font: string;
}

/** Live token values for the painter (re-read on every theme change). */
export function readChartTheme(el?: HTMLElement): ChartTheme {
  const t = readThemeTokens(TOKENS, el);
  return {
    series: SERIES_TOKENS.map((n) => t[n]),
    fg: t.fg,
    muted: t['fg-muted'],
    grid: t.line,
    surface: t.surface,
    accent: t.accent,
    font: t['--font-sans'] || 'sans-serif',
  };
}

/** The colour of the series at `i` (wraps after eight). */
export const seriesColor = (theme: ChartTheme, i: number) =>
  theme.series[i % theme.series.length];

/** Tailwind class of the same series colour, for DOM swatches. */
export const SERIES_BG = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
  'bg-chart-6',
  'bg-chart-7',
  'bg-chart-8',
] as const;
