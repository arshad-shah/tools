import type { Config, Data, Layout, PlotData } from 'plotly.js';
import PlotModule from 'react-plotly.js';
import { cn } from '@/shared/lib/cn';
import { unwrapDefault } from '@/shared/lib/interop';
import { useTokenColors } from './theme-colors';

// react-plotly.js is CommonJS (`exports.default = Plot`); Vite may hand the
// default import back as the module object.
const Plot = unwrapDefault(PlotModule);

const TOKENS = ['fg', 'fg-muted', 'line', 'surface', 'accent-fg'] as const;

export interface ChartProps {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  /** Accessible name of the chart region. */
  label: string;
  className?: string;
}

/**
 * Plotly chart on theme tokens (spec §16 step 3): paper, plot, font, grid
 * and the default trace colour follow the theme and update when it changes.
 */
export function Chart({ data, layout, config, label, className }: ChartProps) {
  const c = useTokenColors(TOKENS);
  const axis = {
    gridcolor: c.line,
    zerolinecolor: c['fg-muted'],
    color: c['fg-muted'],
  };
  return (
    <div role="img" aria-label={label} className={cn('w-full', className)}>
      <Plot
        className="size-full"
        useResizeHandler
        data={data.map((d) =>
          d.type === 'scatter'
            ? ({
                ...d,
                line: {
                  color: c['accent-fg'],
                  ...(d as Partial<PlotData>).line,
                },
              } as Data)
            : d,
        )}
        layout={{
          autosize: true,
          ...layout,
          paper_bgcolor: c.surface,
          plot_bgcolor: c.surface,
          font: { color: c.fg, ...layout?.font },
          xaxis: { ...axis, ...layout?.xaxis },
          yaxis: { ...axis, ...layout?.yaxis },
        }}
        config={{ displaylogo: false, responsive: true, ...config }}
      />
    </div>
  );
}
Chart.displayName = 'Chart';
