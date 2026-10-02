import React, { useMemo, useState } from 'react';
import { IconCalendar, IconDownload } from '@/shared/ui/icons';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Heading,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { Chart } from '@/shared/ui/chart';
import type { ChartSeries, HeatmapCell } from '@/shared/ui/chart';
import { saveBlob } from '@/shared/lib/download';
import { usePomodoroStore } from '../store';
import { historyToCsv, lastDays, weeksGrid } from '../lib/history';

/** `YYYY-MM-DD` as a local-midnight Date (a bare ISO date parses as UTC). */
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const sessions = (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`;

/**
 * The per-day session log (spec §8.6): work sessions over the last 7 days
 * as bars, the last 12 weeks as a calendar heatmap, and the CSV export.
 */
export const HistoryPanel: React.FC = () => {
  const history = usePomodoroStore((s) => s.history);
  // Today as of opening the panel (it remounts each time the tab opens).
  const [now] = useState(() => Date.now());
  const { series, cells, weekTotal } = useMemo(() => {
    const week = lastDays(history, now);
    const series: ChartSeries[] = [
      {
        id: 'work',
        label: 'Work sessions',
        points: week.map((d) => ({
          x: weekday.format(dateOf(d.date)),
          y: d.workSessions,
        })),
      },
    ];
    const cells: HeatmapCell[] = weeksGrid(history, now)
      .flat()
      .map((d) => ({ x: dateOf(d.date), y: 0, value: d.workSessions }));
    const weekTotal = week.reduce((sum, d) => sum + d.workSessions, 0);
    return { series, cells, weekTotal };
  }, [history, now]);

  return (
    <Stack gap="6">
      <Inline align="center" gap="2">
        <IconCalendar size="lg" />
        <Heading level={3} size="md">
          History
        </Heading>
      </Inline>

      {history.length === 0 ? (
        <EmptyState
          icon={IconCalendar}
          title="No sessions yet"
          headingLevel={4}
          description="Finished sessions are logged per day: counts and minutes only."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <Inline justify="between" align="center" wrap>
                <CardTitle as="h4">This week</CardTitle>
                <Text size="sm" tone="subtle">
                  {sessions(weekTotal)} in the last 7 days
                </Text>
              </Inline>
            </CardHeader>
            <CardBody>
              <Chart
                kind="bar"
                xType="band"
                series={series}
                legend={false}
                height={180}
                ariaLabel="Work sessions, last 7 days"
                ariaSummary={`${sessions(weekTotal)} in the last 7 days.`}
                formatY={(y) => String(Math.round(y))}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h4">Last 12 weeks</CardTitle>
            </CardHeader>
            <CardBody>
              <Chart
                kind="heatmap"
                calendar
                cells={cells}
                height={160}
                ariaLabel="Work sessions, last 12 weeks"
                ariaSummary="Work sessions per day, one column per week."
              />
            </CardBody>
          </Card>
        </>
      )}

      <Card>
        <CardBody>
          <Inline justify="between" align="center" gap="3" wrap>
            <Stack gap="1">
              <Text size="sm" weight="medium">
                Session log
              </Text>
              <Text size="xs" tone="subtle">
                {history.length === 0
                  ? 'Nothing to export yet'
                  : `${history.length} ${history.length === 1 ? 'day' : 'days'} logged (up to 365)`}
              </Text>
            </Stack>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconDownload size="sm" />}
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
        </CardBody>
      </Card>
    </Stack>
  );
};
