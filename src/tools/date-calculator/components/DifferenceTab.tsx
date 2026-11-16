import {
  Card,
  DescriptionList,
  EmptyState,
  Heading,
  Notice,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { calendarDays } from '@arshad-shah/cynosure/icons';
import React from 'react';
import { TransformLayout } from '@/app/ui/transform';
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

/** The signed calendar difference between two dates, live. */
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
  const dates = (
    <Card as="section" title="Dates">
      <Stack gap="6">
        <DateInput label="Start" input={start} onInput={onStart} now={now} />
        <DateInput label="End" input={end} onInput={onEnd} now={now} />
      </Stack>
    </Card>
  );
  const result = (
    <Card as="section" title="Difference">
      {d ? (
        <Stack gap="5">
          <Heading level={3} size="xl" aria-live="polite">
            {`${d.sign === -1 ? 'Minus ' : ''}${describeParts([
              [d.years, 'year'],
              [d.months, 'month'],
              [d.days, 'day'],
              [d.hours, 'hour'],
              [d.minutes, 'minute'],
              [d.seconds, 'second'],
            ])}`}
          </Heading>
          {d.sign === -1 ? (
            <Notice tone="info" size="sm">
              The end is before the start, so the difference is negative.
            </Notice>
          ) : null}
          <DescriptionList
            divided
            layout="inline"
            items={[
              {
                id: 'days',
                term: 'Days',
                detail: count(d.totals.days, d.sign),
              },
              {
                id: 'weeks',
                term: 'Weeks and days',
                detail: `${count(d.totals.weeks.weeks, d.sign)} weeks and ${d.totals.weeks.days} days`,
              },
              {
                id: 'hours',
                term: 'Hours',
                detail: count(d.totals.hours, d.sign),
              },
              {
                id: 'minutes',
                term: 'Minutes',
                detail: count(d.totals.minutes, d.sign),
              },
              {
                id: 'seconds',
                term: 'Seconds',
                detail: count(d.totals.seconds, d.sign),
              },
            ]}
          />
          <Text size="sm" tone="muted">
            Years, months and days follow the calendar in the start date&apos;s
            zone; hours and smaller units are elapsed time, so a day with a
            clock change can be 23 or 25 hours.
          </Text>
        </Stack>
      ) : (
        <EmptyState
          icon={calendarDays}
          title="Enter both dates"
          description="Dates, timestamps or phrases such as today + 3w all work."
        />
      )}
    </Card>
  );
  return <TransformLayout start={dates} end={result} />;
};
