import React from 'react';
import {
  Alert,
  AlertDescription,
  Card,
  CardBody,
  Grid,
  Heading,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Text,
} from '@/shared/ui';
import { difference } from '../lib/difference';
import { describeParts } from '../lib/outputs';
import { readDate, type DateValueInput } from '../lib/read';
import { DateInput } from './DateInput';

export interface DifferenceTabProps {
  start: DateValueInput;
  end: DateValueInput;
  onStart: (v: DateValueInput) => void;
  onEnd: (v: DateValueInput) => void;
  now: number;
}

const count = (n: number, sign: 1 | -1) =>
  (sign === -1 && n ? -n : n).toLocaleString('en-US');

/** The signed calendar difference between two dates, live (spec §8.6). */
export const DifferenceTab: React.FC<DifferenceTabProps> = ({
  start,
  end,
  onStart,
  onEnd,
  now,
}) => {
  const a = readDate(start, now);
  const b = readDate(end, now);
  const d =
    a && b && 'value' in a && 'value' in b
      ? difference(a.value, b.value)
      : null;
  return (
    <Stack gap="6">
      <Grid cols={{ base: 1, md: 2 }} gap="6">
        <DateInput
          id="diff-start"
          label="Start"
          input={start}
          onInput={onStart}
          now={now}
        />
        <DateInput
          id="diff-end"
          label="End"
          input={end}
          onInput={onEnd}
          now={now}
        />
      </Grid>
      {d && (
        <div data-dynamic="">
          <Card>
            <CardBody>
              <Stack gap="4">
                <Heading level={3} size="lg">
                  {`${d.sign === -1 ? 'Minus ' : ''}${describeParts([
                    [d.years, 'year'],
                    [d.months, 'month'],
                    [d.days, 'day'],
                    [d.hours, 'hour'],
                    [d.minutes, 'minute'],
                    [d.seconds, 'second'],
                  ])}`}
                </Heading>
                {d.sign === -1 && (
                  <Alert status="info">
                    <AlertDescription>
                      The end is before the start, so the difference is
                      negative.
                    </AlertDescription>
                  </Alert>
                )}
                <Table aria-label="Totals">
                  <TableBody>
                    <TableRow>
                      <TableCell>Days</TableCell>
                      <TableCell>{count(d.totals.days, d.sign)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Weeks and days</TableCell>
                      <TableCell>
                        {`${count(d.totals.weeks.weeks, d.sign)} weeks and ${d.totals.weeks.days} days`}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Hours</TableCell>
                      <TableCell>{count(d.totals.hours, d.sign)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Minutes</TableCell>
                      <TableCell>{count(d.totals.minutes, d.sign)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Seconds</TableCell>
                      <TableCell>{count(d.totals.seconds, d.sign)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Text size="xs" tone="subtle">
                  Years, months and days follow the calendar in the start
                  date&apos;s zone; hours and smaller units are elapsed time, so
                  a day with a clock change can be 23 or 25 hours.
                </Text>
              </Stack>
            </CardBody>
          </Card>
        </div>
      )}
    </Stack>
  );
};
