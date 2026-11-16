import { useMemo } from 'react';
import {
  Bar,
  Heatmap,
  Line,
  Scatter,
  StackedArea,
} from '@arshad-shah/swift-chart/react';
import { useChartTheme } from '@/shared/charts';

interface ChartSeries {
  id: string;
  label: string;
  points: { x: unknown; y: number | null }[];
}
import { Row, Section } from '../Section';
import { normals, seeded } from '../demo-data';

/** Local calendar day `i` of 2026 (charts lay out time in local time). */
const day = (i: number) => new Date(2026, 0, 1 + i);
/** Local day `i` from Monday 5 January 2026 (the calendar starts on a week). */
const weekDay = (i: number) => new Date(2026, 0, 5 + i);

function buildData() {
  const rand = seeded(7);
  const visits: ChartSeries = { id: 'visits', label: 'Visits', points: [] };
  const signups: ChartSeries = { id: 'signups', label: 'Sign-ups', points: [] };
  for (let i = 0; i < 90; i++) {
    const weekly = Math.sin((i / 7) * Math.PI * 2) * 120;
    visits.points.push({
      x: day(i),
      y: Math.round(1400 + i * 6 + weekly + rand() * 160),
    });
    signups.points.push({
      x: day(i),
      // A two-day outage leaves a gap in the line.
      y: i === 40 || i === 41 ? null : Math.round(220 + i * 2 + rand() * 60),
    });
  }

  const sources = ['Search', 'Direct', 'Referral'].map((label, s) => ({
    id: label.toLowerCase(),
    label,
    points: Array.from({ length: 12 }, (_, m) => ({
      x: new Date(2026, m, 1),
      y: Math.round((3 - s) * 900 + m * (60 + s * 40) + rand() * 300),
    })),
  }));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const revenue: ChartSeries[] = ['2025', '2026'].map((label, k) => ({
    id: `rev-${label}`,
    label,
    points: months.map((m, i) => ({
      x: m,
      y: Math.round(42 + i * 4 + k * 9 + rand() * 12),
    })),
  }));

  const scatter: ChartSeries[] = ['Laptops', 'Tablets'].map((label, k) => ({
    id: label.toLowerCase(),
    label,
    points: Array.from({ length: 50 }, () => {
      const weight = k === 0 ? 1.1 + rand() * 1.6 : 0.3 + rand() * 0.6;
      return {
        x: Math.round(weight * 100) / 100,
        y: Math.round((k === 0 ? 500 : 200) + weight * 450 + rand() * 400),
      };
    }),
  }));

  const latency: ChartSeries = {
    id: 'latency',
    label: 'Response time',
    points: normals(rand, 600, 180, 40).map((y, i) => ({ x: i, y })),
  };

  const cells: { week: string; day: string; value: number }[] = [];
  for (let i = 0; i < 26 * 7; i++) {
    const weekday = (weekDay(i).getDay() + 6) % 7;
    const busy = weekday < 5 ? 1 : 0.25;
    cells.push({
      week: shortDate(weekDay(i - weekday)),
      day: weekDay(i).toLocaleString('en-GB', { weekday: 'short' }),
      value: Math.floor(rand() * rand() * 14 * busy),
    });
  }
  return { visits, signups, sources, revenue, scatter, latency, cells };
}

/** Rows for swift-chart from parallel series: one row per x. */
function rowsOf(
  series: { label: string; points: { x: unknown; y: number | null }[] }[],
  label: (x: unknown) => string,
) {
  return series[0].points.map((p, i) => ({
    x: label(p.x),
    ...Object.fromEntries(
      series.map((s) => [s.label, s.points[i].y ?? Number.NaN]),
    ),
  }));
}

const xs = Array.from({ length: 161 }, (_, i) => -8 + i * 0.1);
const FUNCTION_ROWS = xs.map((x) => ({
  x: x.toFixed(1),
  'sin(x)': Math.sin(x),
  'sin(3x) / x': x === 0 ? 3 : Math.sin(3 * x) / x,
  'x squared / 20': (x * x) / 20,
}));

const shortDate = (x: unknown) =>
  x instanceof Date
    ? `${x.getDate()} ${x.toLocaleString('en-GB', { month: 'short' })}`
    : String(x);

/** Histogram bins of `values` (20 equal bins). */
function bins(values: number[]) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const w = (hi - lo) / 20 || 1;
  const out = Array.from({ length: 20 }, (_, i) => ({
    bin: `${Math.round(lo + i * w)}`,
    n: 0,
  }));
  for (const v of values) out[Math.min(19, Math.floor((v - lo) / w))].n++;
  return out;
}

export function ChartSection() {
  const d = useMemo(() => buildData(), []);
  const theme = useChartTheme();
  const t = theme.name;
  return (
    <Section name="chart" title="Charts (swift-chart)">
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 lg:grid-cols-2">
        <Row label="Line: two series, a gap">
          <Line
            data={rowsOf([d.visits, d.signups], shortDate)}
            mapping={{ x: 'x', y: ['Visits', 'Sign-ups'] }}
            theme={t}
            dots={false}
            height={260}
            ariaLabel="Daily visits and sign-ups"
            ariaDescription="Visits rise from about 1,400 to 2,000 a day over the quarter; sign-ups follow, with a two-day gap in February."
          />
        </Row>
        <Row label="StackedArea">
          <StackedArea
            data={rowsOf(d.sources, shortDate)}
            mapping={{ x: 'x', y: ['Search', 'Direct', 'Referral'] }}
            theme={t}
            height={260}
            ariaLabel="Visits by source"
          />
        </Row>
        <Row label="Bar: grouped">
          <Bar
            data={rowsOf(d.revenue, String)}
            mapping={{ x: 'x', y: ['2025', '2026'] }}
            theme={t}
            height={260}
            formatValue={(y) => `${y}k`}
            ariaLabel="Revenue by month"
          />
        </Row>
        <Row label="Scatter: two groups">
          <Scatter
            data={d.scatter.flatMap((s) =>
              s.points.map((p) => ({ ...p, group: s.label })),
            )}
            mapping={{ x: 'x', y: 'y', groupField: 'group' }}
            theme={t}
            height={260}
            ariaLabel="Price against weight"
          />
        </Row>
        <Row label="Bar: histogram">
          <Bar
            data={bins(d.latency.points.map((p) => p.y as number))}
            mapping={{ x: 'bin', y: 'n', seriesNames: ['Requests'] }}
            theme={t}
            height={260}
            showLegend={false}
            ariaLabel="Response time distribution"
          />
        </Row>
        <Row label="Line: functions">
          <Line
            data={FUNCTION_ROWS}
            mapping={{
              x: 'x',
              y: ['sin(x)', 'sin(3x) / x', 'x squared / 20'],
            }}
            theme={t}
            dots={false}
            smooth={false}
            height={260}
            ariaLabel="Function plot"
          />
        </Row>
      </div>
      <Row label="Heatmap: weeks by weekday">
        <Heatmap
          data={d.cells}
          mapping={{ x: 'week', y: 'day', valueField: 'value' }}
          theme={t}
          height={240}
          ariaLabel="Commits per day, first half of 2026"
        />
      </Row>
    </Section>
  );
}
