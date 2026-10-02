import React, { useState } from 'react';
import { toCalendarDate } from '@internationalized/date';
import {
  Alert,
  AlertDescription,
  Card,
  CardBody,
  FileUpload,
  Grid,
  Heading,
  Inline,
  Label,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from '@/shared/ui';
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

  return (
    <Stack gap="6">
      <Grid cols={{ base: 1, md: 2 }} gap="6">
        <DateInput
          id="biz-start"
          label="From"
          input={start}
          onInput={onStart}
          now={now}
        />
        <DateInput
          id="biz-end"
          label="Until (not counted)"
          input={end}
          onInput={onEnd}
          now={now}
        />
      </Grid>

      <div data-dynamic="">
        <Card>
          <CardBody>
            <Stack gap="3">
              <Heading level={3} size="lg" aria-live="polite">
                {between === null
                  ? 'Enter both dates'
                  : `${between} business ${Math.abs(between) === 1 ? 'day' : 'days'}`}
              </Heading>
              <Inline gap="2" align="center" wrap>
                <Label htmlFor="biz-add">Add business days to From</Label>
                <NumberInput
                  id="biz-add"
                  value={addN}
                  min={-10000}
                  max={10000}
                  onValueChange={setAddN}
                />
                <Text size="sm">{added ? `gives ${added}` : ''}</Text>
              </Inline>
              {!anyWorkday && (
                <Alert status="warning">
                  <AlertDescription>
                    Choose at least one working day.
                  </AlertDescription>
                </Alert>
              )}
            </Stack>
          </CardBody>
        </Card>
      </div>

      <Grid cols={{ base: 1, md: 2 }} gap="6">
        <Stack gap="2">
          <Heading level={3} size="sm">
            Workweek
          </Heading>
          {DAYS.map((day, i) => {
            const idx = INDEX[i];
            return (
              <Inline key={day} gap="3" align="center" justify="between">
                <Text size="sm">{day}</Text>
                <SegmentedControl<'work' | 'off'>
                  label={day}
                  size="sm"
                  value={workweek[idx] ? 'work' : 'off'}
                  onChange={(v) =>
                    onWorkweek(
                      workweek.map((w, j) => (j === idx ? v === 'work' : w)),
                    )
                  }
                  options={[
                    { value: 'work', label: 'Work' },
                    { value: 'off', label: 'Off' },
                  ]}
                />
              </Inline>
            );
          })}
        </Stack>
        <Stack gap="2">
          <Label htmlFor="biz-holidays">Holidays (one date per line)</Label>
          <Textarea
            id="biz-holidays"
            value={holidayText}
            onChange={setText}
            rows={8}
            placeholder="2024-12-25"
            spellCheck={false}
          />
          <Text size="xs" tone="subtle">
            {`${holidays.length} ${holidays.length === 1 ? 'holiday' : 'holidays'}. Holidays are not saved; share a link to keep them.`}
          </Text>
          <FileUpload
            accept=".ics,text/calendar"
            onFiles={(files) => void importIcs(files)}
            label="Import holidays from a calendar (.ics)"
          />
          {importError && (
            <Alert status="danger">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
        </Stack>
      </Grid>
    </Stack>
  );
};
