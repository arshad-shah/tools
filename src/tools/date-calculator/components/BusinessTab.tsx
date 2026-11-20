import {
  Badge,
  Card,
  Checkbox,
  Disclosure,
  EmptyState,
  FileDrop,
  Grid,
  Heading,
  Inline,
  Notice,
  NumberField,
  Stack,
  Text,
  TextArea,
} from '@arshad-shah/cynosure';
import { calendarDays } from '@arshad-shah/cynosure/icons';
import { toCalendarDate } from '@internationalized/date';
import React, { useState } from 'react';
import { TransformLayout } from '@/app/ui/transform';
import { toToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { addBusinessDays, businessDaysBetween } from '../lib/business';
import { parseIcsDates } from '../lib/ics';
import { parseHolidayText } from '../lib/outputs';
import { readDate, type DateValueInput } from '../lib/read';
import { DateInput } from './DateInput';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
/** Display order Monday first; the workweek array is Sunday 0. */
const INDEX = [1, 2, 3, 4, 5, 6, 0];

export interface BusinessTabProps {
  start: DateValueInput;
  end: DateValueInput;
  onStart: (v: DateValueInput) => void;
  onEnd: (v: DateValueInput) => void;
  workweek: boolean[];
  onWorkweek: (w: boolean[]) => void;
  holidays: string[];
  onHolidays: (h: string[]) => void;
  now: number;
}

/** Business days between dates and N business days on (spec §8.6). */
export const BusinessTab: React.FC<BusinessTabProps> = ({
  start,
  end,
  onStart,
  onEnd,
  workweek,
  onWorkweek,
  holidays,
  onHolidays,
  now,
}) => {
  const [holidayText, setHolidayText] = useState(() => holidays.join('\n'));
  const [addN, setAddN] = useState(10);
  const [importError, setImportError] = useState<string | null>(null);
  const a = readDate(start, now);
  const b = readDate(end, now);
  const opts = { workweek, holidays: new Set(holidays) };
  const anyWorkday = workweek.some(Boolean);
  const between =
    a && b && 'value' in a && 'value' in b && anyWorkday
      ? businessDaysBetween(a.value, b.value, opts)
      : null;
  const added =
    a && 'value' in a && anyWorkday
      ? addBusinessDays(toCalendarDate(a.value), addN, opts).toString()
      : null;

  const setText = (text: string) => {
    setHolidayText(text);
    onHolidays(parseHolidayText(text));
  };

  const importIcs = async (files: File[]) => {
    setImportError(null);
    try {
      const dates = (
        await Promise.all(
          files.map(async (f) => parseIcsDates(await readText(f))),
        )
      ).flat();
      if (dates.length === 0) {
        setImportError('No event dates were found in that calendar file.');
        return;
      }
      const merged = [...new Set([...holidays, ...dates])].sort();
      setHolidayText(merged.join('\n'));
      onHolidays(merged);
    } catch (e) {
      setImportError(
        toToolError(e, 'Could not read that calendar file').message,
      );
    }
  };

  const inputCard = (
    <Stack gap="6">
      <Card as="section" title="Dates">
        <Stack gap="6">
          <DateInput label="From" input={start} onInput={onStart} now={now} />
          <DateInput
            label="Until (not counted)"
            input={end}
            onInput={onEnd}
            now={now}
          />
        </Stack>
      </Card>
      <Card as="section" title="Calendar">
        <Stack gap="6">
          <Stack gap="3" role="group" aria-label="Workweek">
            <Text weight="medium">Working days</Text>
            <Inline gap="4" wrap>
              {DAYS.map((day, i) => {
                const idx = INDEX[i];
                return (
                  <Checkbox
                    key={day}
                    label={day}
                    checked={workweek[idx]}
                    onChange={(on) =>
                      onWorkweek(workweek.map((w, j) => (j === idx ? on : w)))
                    }
                  />
                );
              })}
            </Inline>
          </Stack>
          <Disclosure
            summary="Holidays"
            trailing={
              holidays.length ? (
                <Badge tone="accent">{holidays.length}</Badge>
              ) : undefined
            }
            variant="line"
            defaultOpen={holidays.length > 0}
          >
            <Stack gap="4" paddingBlock="3">
              <TextArea
                label="Holidays (one date per line)"
                description={`${holidays.length} ${holidays.length === 1 ? 'holiday' : 'holidays'}. Holidays are not saved; share a link to keep them.`}
                rows={5}
                placeholder="2024-12-25"
                spellCheck={false}
                value={holidayText}
                onChange={setText}
              />
              <FileDrop
                size="sm"
                accept=".ics,text/calendar"
                multiple
                hint="Import holidays from a calendar (.ics)."
                labels={{
                  choose: 'Import a calendar',
                  chooseOne: 'Import a calendar',
                }}
                onFiles={(files) => void importIcs(files)}
              />
              {importError ? (
                <Notice tone="danger">{importError}</Notice>
              ) : null}
            </Stack>
          </Disclosure>
        </Stack>
      </Card>
    </Stack>
  );

  const resultCard = (
    <Card as="section" title="Business days">
      {between === null && anyWorkday ? (
        <EmptyState
          icon={calendarDays}
          title="Enter both dates"
          description="Counts the working days from the first date up to the second, skipping holidays."
        />
      ) : (
        <Stack gap="5">
          <Heading level={3} size="xl" aria-live="polite">
            {between === null
              ? 'Enter both dates'
              : `${between} business ${Math.abs(between) === 1 ? 'day' : 'days'}`}
          </Heading>
          {!anyWorkday ? (
            <Notice tone="warning">Choose at least one working day.</Notice>
          ) : null}
          <Grid minItemWidth="12rem" gap="4" align="end">
            <NumberField
              label="Add business days to From"
              value={addN}
              min={-10000}
              max={10000}
              onChange={(v) => v !== null && setAddN(v)}
            />
            <Text size="lg" weight="medium" aria-live="polite">
              {added ? `gives ${added}` : ''}
            </Text>
          </Grid>
        </Stack>
      )}
    </Card>
  );

  return <TransformLayout start={inputCard} end={resultCard} />;
};
