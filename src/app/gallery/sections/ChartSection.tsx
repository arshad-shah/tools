import { useMemo } from 'react';
import {
  Chart,
  type ChartFunction,
  type ChartSeries,
  type HeatmapCell,
} from '@/shared/ui';
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

  const cells: HeatmapCell[] = [];
  for (let i = 0; i < 26 * 7; i++) {
    const weekday = (weekDay(i).getDay() + 6) % 7;
    const busy = weekday < 5 ? 1 : 0.25;
    cells.push({
      x: weekDay(i),
      y: 0,
      value: Math.floor(rand() * rand() * 14 * busy),
    });
  }
  return { visits, signups, sources, revenue, scatter, latency, cells };
}

const FNS: ChartFunction[] = [
  { id: 'sin', label: 'sin(x)', fn: Math.sin },
  { id: 'damped', label: 'sin(3x) / x', fn: (x) => Math.sin(3 * x) / x },
  { id: 'parabola', label: 'x squared / 20', fn: (x) => (x * x) / 20 },
];

const shortDate = (x: unknown) =>
  x instanceof Date
    ? `${x.getDate()} ${x.toLocaleString('en-GB', { month: 'short' })}`
    : String(x);

export function ChartSection() {
  const d = useMemo(() => buildData(), []);
  return (
    <Section name="chart" title="Charts">
      <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0 lg:grid-cols-2">
        <Row label="line: time axis, two series, a gap">
          <Chart
            kind="line"
            series={[d.visits, d.signups]}
            xType="time"
            ariaLabel="Daily visits and sign-ups"
            ariaSummary="Visits rise from about 1,400 to 2,000 a day over the quarter; sign-ups follow, with a two-day gap in February."
            yLabel="Per day"
            className="w-full"
          />
        </Row>
        <Row label="area: stacked">
          <Chart
            kind="area"
            stacked
            series={d.sources}
            xType="time"
            ariaLabel="Visits by source"
            formatX={shortDate}
            className="w-full"
          />
        </Row>
        <Row label="bar: band axis, grouped">
          <Chart
            kind="bar"
            series={d.revenue}
            xType="band"
            ariaLabel="Revenue by month"
            yLabel="Revenue, thousands"
            formatY={(y) => `${y}k`}
            className="w-full"
          />
        </Row>
        <Row label="scatter">
          <Chart
            kind="scatter"
            series={d.scatter}
            ariaLabel="Price against weight"
            xLabel="Weight, kg"
            yLabel="Price"
            className="w-full"
          />
        </Row>
        <Row label="histogram: auto bins">
          <Chart
            kind="histogram"
            series={[d.latency]}
            ariaLabel="Response time distribution"
            xLabel="Milliseconds"
            legend={false}
            className="w-full"
          />
        </Row>
        <Row label="function: zoomable">
          <Chart
            kind="function"
            fns={FNS}
            xDomain={[-10, 10]}
            zoomable
            ariaLabel="Function plot"
            className="w-full"
          />
        </Row>
      </div>
      <Row label="heatmap: calendar">
        <Chart
          kind="heatmap"
          calendar
          cells={d.cells}
          height={200}
          ariaLabel="Commits per day, first half of 2026"
          className="w-full"
        />
      </Row>
    </Section>
  );
}
