import React, { useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DateInput,
  Grid,
  Label,
  NumberInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { bestOverlap, planDay } from '../lib/planner';

const p2 = (n: number) => String(n).padStart(2, '0');

export interface MeetingPlannerProps {
  zones: string[];
  workHours: number[];
  onWorkHours: (hours: number[]) => void;
}

/**
 * The meeting planner (spec §9.6): 24 UTC hours across, one row per zone,
 * working hours shaded and the best overlap outlined.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Meeting planner</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="4">
          <Grid cols={{ base: 1, md: 3 }} gap="3">
            <Stack gap="1">
              <Label htmlFor="mp-date">Day (UTC)</Label>
              <DateInput
                id="mp-date"
                label="Day (UTC)"
                value={date}
                onChange={setDate}
              />
            </Stack>
            <Stack gap="1">
              <Label htmlFor="mp-start">Working from</Label>
              <NumberInput
                id="mp-start"
                value={start}
                min={0}
                max={end - 1}
                onValueChange={(v) => onWorkHours([v, end])}
              />
            </Stack>
            <Stack gap="1">
              <Label htmlFor="mp-end">Working until</Label>
              <NumberInput
                id="mp-end"
                value={end}
                min={start + 1}
                max={24}
                onValueChange={(v) => onWorkHours([start, v])}
              />
            </Stack>
          </Grid>
          <Text size="sm" aria-live="polite">
            {bestText}
          </Text>
          {zones.length === 0 ? (
            <Text size="sm" tone="subtle">
              Add zones in the world clock to plan across them.
            </Text>
          ) : (
            <Table aria-label="Meeting planner" data-testid="meeting-planner">
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  {rows.map((r) => (
                    <TableHead
                      key={r.hourUTC}
                      className={cn(
                        'px-1 text-center font-mono-meta',
                        best.has(r.hourUTC) && 'text-accent-ink',
                      )}
                    >
                      {p2(r.hourUTC)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone, zi) => (
                  <TableRow key={zone}>
                    <TableCell className="whitespace-nowrap">
                      {zone.replace(/_/g, ' ')}
                    </TableCell>
                    {rows.map((r) => {
                      const cell = r.cells[zi];
                      return (
                        <TableCell
                          key={r.hourUTC}
                          data-working={cell.working || undefined}
                          data-best={best.has(r.hourUTC) || undefined}
                          className={cn(
                            'px-1 text-center font-mono-meta',
                            cell.working
                              ? 'bg-accent-soft text-fg'
                              : 'text-fg-subtle',
                            best.has(r.hourUTC) &&
                              'ring-1 ring-inset ring-accent',
                          )}
                        >
                          {p2(cell.localHour)}
                          {cell.localMinute ? `:${p2(cell.localMinute)}` : ''}
                          {cell.working && (
                            <span className="sr-only"> working</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Text size="xs" tone="subtle">
            Columns are UTC hours; each cell is the local hour in that zone.
            Shaded cells are working hours; outlined columns suit everyone best.
          </Text>
        </Stack>
      </CardBody>
    </Card>
  );
};
