import {
  Badge,
  Card,
  DateField,
  EmptyState,
  Grid,
  Notice,
  NumberField,
  Stack,
  Table,
  Text,
  VisuallyHidden,
  type TableColumn,
} from '@arshad-shah/cynosure';
import { globe } from '@arshad-shah/cynosure/icons';
import React, { useMemo, useState } from 'react';
import { bestOverlap, planDay } from '../lib/planner';

const p2 = (n: number) => String(n).padStart(2, '0');

export interface MeetingPlannerProps {
  zones: string[];
  workHours: number[];
  onWorkHours: (hours: number[]) => void;
}

/**
 * The meeting planner: 24 UTC hours across, one row per zone, working
 * hours as badges and the best overlap marked in the header. Cynosure's
 * Table cannot tint a cell or a column (docs/cynosure-gaps.md).
 */
export const MeetingPlanner: React.FC<MeetingPlannerProps> = ({
  zones,
  workHours,
  onWorkHours,
}) => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, end] = [workHours[0] ?? 9, workHours[1] ?? 17];
  const rows = useMemo(
    () =>
      /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? planDay(date, zones, [start, end])
        : [],
    [date, zones, start, end],
  );
  const best = useMemo(() => new Set(bestOverlap(rows)), [rows]);
  const bestText =
    best.size === 0
      ? 'No working hours overlap on this day.'
      : `Best overlap (UTC): ${[...best].map((h) => `${p2(h)}:00`).join(', ')}`;

  const columns: TableColumn<{ zone: string; zi: number }>[] = [
    {
      key: 'zone',
      header: 'Zone',
      rowHeader: true,
      cell: (r) => r.zone.replace(/_/g, ' '),
    },
    ...rows.map(
      (h): TableColumn<{ zone: string; zi: number }> => ({
        key: String(h.hourUTC),
        header: best.has(h.hourUTC) ? (
          <Badge size="sm" tone="success">
            {p2(h.hourUTC)}
          </Badge>
        ) : (
          p2(h.hourUTC)
        ),
        cell: (r) => {
          const cell = h.cells[r.zi];
          const text = `${p2(cell.localHour)}${cell.localMinute ? `:${p2(cell.localMinute)}` : ''}`;
          return cell.working ? (
            <Badge size="sm" tone={best.has(h.hourUTC) ? 'success' : 'accent'}>
              {text}
              <VisuallyHidden> working</VisuallyHidden>
            </Badge>
          ) : (
            <Text as="span" size="sm" tone="muted" numeric>
              {text}
            </Text>
          );
        },
      }),
    ),
  ];

  return (
    <Card as="section" title="Meeting planner">
      <Stack gap="5">
        <Grid minItemWidth="11rem" gap="4">
          <DateField
            label="Day (UTC)"
            value={date}
            onChange={(v) => setDate(v ?? '')}
          />
          <NumberField
            label="Working from"
            value={start}
            min={0}
            max={end - 1}
            onChange={(v) => v !== null && onWorkHours([v, end])}
          />
          <NumberField
            label="Working until"
            value={end}
            min={start + 1}
            max={24}
            onChange={(v) => v !== null && onWorkHours([start, v])}
          />
        </Grid>
        {zones.length === 0 ? (
          <EmptyState
            size="sm"
            icon={globe}
            title="No zones yet"
            description="Add zones in the world clock to plan across them."
          />
        ) : (
          <>
            <Notice tone={best.size ? 'success' : 'warning'} size="sm">
              {bestText}
            </Notice>
            <Table
              caption="Meeting planner"
              captionHidden
              size="sm"
              rows={zones.map((zone, zi) => ({ zone, zi }))}
              getRowId={(r) => r.zone}
              columns={columns}
            />
          </>
        )}
        <Text size="sm" tone="muted">
          Columns are UTC hours; each cell is the local hour in that zone.
          Badges are working hours; green columns suit everyone best.
        </Text>
      </Stack>
    </Card>
  );
};
