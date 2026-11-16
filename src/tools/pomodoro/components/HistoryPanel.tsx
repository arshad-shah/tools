import {
  Button,
  Card,
  EmptyState,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  calendar as calendarIcon,
  download,
} from '@arshad-shah/cynosure/icons';
import { Bar, Heatmap } from '@arshad-shah/swift-chart/react';
import React, { useMemo, useState } from 'react';
// swift-chart draws the charts (a canvas); the owner chose it over a
// Cynosure chart. Everything around them is Cynosure.
import { ChartFrame, useChartTheme } from '@/shared/charts';
import { saveBlob } from '@/shared/lib/download';
import { usePomodoroStore } from '../store';
import { historyToCsv, lastDays, weeksGrid } from '../lib/history';

/** `YYYY-MM-DD` as a local-midnight Date (a bare ISO date parses as UTC). */
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dayLabel = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});
const weekOf = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});
const sessions = (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`;

/**
 * The per-day session log (spec §8.6): work sessions over the last 7 days
 * as bars, the last 12 weeks as a calendar heatmap, and the CSV export.
 */
export const HistoryPanel: React.FC = () => {
  const history = usePomodoroStore((s) => s.history);
  // Today as of opening the panel (it remounts each time the tab opens).
  const [now] = useState(() => Date.now());
  const chart = useChartTheme();
  const { week, cells, weekTotal } = useMemo(() => {
    const week = lastDays(history, now).map((d) => ({
      date: d.date,
      day: weekday.format(dateOf(d.date)),
      sessions: d.workSessions,
    }));
    // One column per week (labelled by its Monday), one row per weekday.
    const cells = weeksGrid(history, now).flatMap((days) =>
      days.map((d) => ({
        date: d.date,
        week: weekOf.format(dateOf(days[0].date)),
        day: weekday.format(dateOf(d.date)),
        value: d.workSessions,
      })),
    );
    const weekTotal = week.reduce((sum, d) => sum + d.sessions, 0);
    return { week, cells, weekTotal };
  }, [history, now]);

  return (
    <Stack gap="6">
      {history.length === 0 ? (
        <EmptyState
          icon={calendarIcon}
          title="No sessions yet"
          headingLevel={4}
          description="Finished sessions are logged per day: counts and minutes only."
        />
      ) : (
        <>
          <Card
            title="This week"
            headingLevel={4}
            variant="outline"
            actions={
              <Text size="sm" tone="muted">
                {`${sessions(weekTotal)} in the last 7 days`}
              </Text>
            }
          >
            <ChartFrame
              table={{
                caption: 'Work sessions, last 7 days',
                rows: week,
                getRowId: (d) => d.date,
                columns: [
                  {
                    key: 'date',
                    header: 'Day',
                    cell: (d) => dayLabel.format(dateOf(d.date)),
                  },
                  { key: 'sessions', header: 'Sessions', align: 'end' },
                ],
              }}
            >
              <Bar
                data={week}
                mapping={{
                  x: 'day',
                  y: 'sessions',
                  seriesNames: ['Work sessions'],
                }}
                theme={chart.name}
                height={200}
                showLegend={false}
                ariaLabel="Work sessions, last 7 days"
                ariaDescription={`${sessions(weekTotal)} in the last 7 days.`}
                formatValue={(y) => String(Math.round(y))}
              />
            </ChartFrame>
          </Card>
          <Card title="Last 12 weeks" headingLevel={4} variant="outline">
            <ChartFrame
              table={{
                caption: 'Days with work sessions, last 12 weeks',
                rows: cells.filter((c) => c.value > 0),
                getRowId: (c) => c.date,
                columns: [
                  {
                    key: 'date',
                    header: 'Day',
                    cell: (c) => dayLabel.format(dateOf(c.date)),
                  },
                  { key: 'value', header: 'Sessions', align: 'end' },
                ],
              }}
            >
              <Heatmap
                data={cells}
                mapping={{ x: 'week', y: 'day', valueField: 'value' }}
                theme={chart.name}
                height={220}
                ariaLabel="Work sessions, last 12 weeks"
                ariaDescription="Work sessions per day, one column per week."
                formatValue={(v) => String(Math.round(v))}
              />
            </ChartFrame>
          </Card>
        </>
      )}

      <Inline justify="between" align="center" gap="3" wrap>
        <Stack gap="1">
          <Text size="sm" weight="medium">
            Session log
          </Text>
          <Text size="sm" tone="muted">
            {history.length === 0
              ? 'Nothing to export yet'
              : `${history.length} ${history.length === 1 ? 'day' : 'days'} logged (up to 365)`}
          </Text>
        </Stack>
        <Button
          variant="soft"
          size="sm"
          icon={download}
          disabled={history.length === 0}
          onClick={() =>
            saveBlob(
              new Blob([historyToCsv(history)], { type: 'text/csv' }),
              'pomodoro-history.csv',
            )
          }
        >
          Export CSV
        </Button>
      </Inline>
    </Stack>
  );
};
