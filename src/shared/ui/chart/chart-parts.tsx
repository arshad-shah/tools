import { cn } from '@/shared/lib/cn';
import { Positioned } from '../positioned';
import type { Hit } from './hit';
import { SERIES_BG } from './theme';

const swatch = 'inline-block size-2.5 shrink-0 rounded-xs';

export function ChartLegend({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
      {items.map((it, i) => (
        <li key={it.id} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(swatch, SERIES_BG[i % SERIES_BG.length])}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

const RAMP = [
  'bg-chart-1/15',
  'bg-chart-1/35',
  'bg-chart-1/60',
  'bg-chart-1/80',
  'bg-chart-1',
];

/** Colour scale of a heatmap: from the lowest to the highest value. */
export function HeatLegend({
  min,
  max,
  calendar,
  format,
}: {
  min: number;
  max: number;
  calendar: boolean;
  format(v: number): string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
      <span>{format(min)}</span>
      <span className="flex gap-0.5" aria-hidden="true">
        {RAMP.map((c) => (
          <span key={c} className={cn(swatch, c)} />
        ))}
      </span>
      <span>{format(max)}</span>
      {calendar ? (
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn(swatch, 'bg-line')} />
          No data
        </span>
      ) : null}
    </div>
  );
}

/**
 * Hover readout beside the pointer. It repeats what the data table offers,
 * so it is hidden from assistive technology and never takes focus.
 */
export function ChartTooltip({ hit, width }: { hit: Hit; width: number }) {
  const flip = hit.anchor.x > width / 2;
  return (
    <Positioned
      x={hit.anchor.x + (flip ? -12 : 12)}
      y={Math.max(0, hit.anchor.y - 12)}
      aria-hidden="true"
      data-testid="chart-tooltip"
      className={cn(
        'pointer-events-none z-10 max-w-60 rounded-lg bg-surface px-2.5 py-1.5 text-xs text-fg shadow-e2',
        flip && '-translate-x-full',
      )}
    >
      <div className="mb-0.5 font-medium">{hit.title}</div>
      {hit.rows.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className={cn(swatch, SERIES_BG[r.color % SERIES_BG.length])} />
          <span className="text-fg-muted">{r.label}</span>
          <span className="ml-auto pl-2 tabular-nums">{r.value}</span>
        </div>
      ))}
    </Positioned>
  );
}
