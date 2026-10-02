export type ChartKind =
  | 'line'
  | 'area'
  | 'bar'
  | 'scatter'
  | 'histogram'
  | 'heatmap'
  | 'function';

export type XValue = number | Date | string;
export type XType = 'linear' | 'time' | 'band';

export interface ChartPoint {
  x: XValue;
  /** `null` is a gap: lines and areas break there. */
  y: number | null;
}

export interface ChartSeries {
  id: string;
  label: string;
  points: ChartPoint[];
}

export interface ChartFunction {
  id: string;
  label: string;
  fn(x: number): number;
}

export interface HeatmapCell {
  x: XValue;
  y: XValue;
  value: number;
}

/** What the pointer is over (series kinds: the nearest point). */
export interface ChartHover {
  seriesId: string;
  index: number;
  x: XValue;
  y: number | null;
}

export interface ChartHandle {
  /** The chart as painted, at device resolution. */
  exportPng(): Promise<Blob>;
  /** Line, area and bar charts as an SVG document (one path per line). */
  exportSvg(): string;
  /** Back to the full extent after zooming or panning. */
  resetView(): void;
}

/** A zoomed or panned window onto the data (numeric axis units). */
export interface ChartView {
  x: [number, number];
  y: [number, number];
}
