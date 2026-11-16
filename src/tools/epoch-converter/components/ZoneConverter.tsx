import {
  Card,
  DateField,
  Grid,
  Notice,
  Stack,
  Table,
  Text,
  TimeField,
} from '@arshad-shah/cynosure';
import React, { useMemo, useState } from 'react';
import { toToolError } from '@/shared/lib/errors';
import { convertWallClock } from '../lib/zone-convert';
import { ZoneField } from './ZoneField';

/** A wall-clock time in one zone, shown in the listed zones. */
export const ZoneConverter: React.FC<{
  zones: string[];
  defaultZone: string;
}> = ({ zones, defaultZone }) => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [from, setFrom] = useState(defaultZone);
  const result = useMemo(() => {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const t = /^(\d{2}):(\d{2})/.exec(time);
    if (!d || !t) return { error: 'Enter a date and a time' };
    try {
      return convertWallClock(
        {
          y: Number(d[1]),
          m: Number(d[2]),
          d: Number(d[3]),
          hh: Number(t[1]),
          mm: Number(t[2]),
          ss: 0,
        },
        from,
        zones,
      );
    } catch (e) {
      return { error: toToolError(e, 'Could not convert that time').message };
    }
  }, [date, time, from, zones]);

  return (
    <Card as="section" title="Zone converter">
      <Stack gap="5">
        <Grid minItemWidth="11rem" gap="4">
          <DateField
            label="Date"
            value={date}
            onChange={(v) => setDate(v ?? '')}
          />
          <TimeField
            label="Time"
            value={time}
            onChange={(v) => setTime(v ?? '')}
          />
          <ZoneField label="In zone" value={from} onChange={setFrom} />
        </Grid>
        {'error' in result ? (
          <Notice tone="danger">{result.error}</Notice>
        ) : (
          <>
            {result.notice ? (
              <Notice tone="warning">{result.notice}</Notice>
            ) : null}
            <Table
              caption="Converted times"
              captionHidden
              size="sm"
              rows={result.rows}
              getRowId={(r) => r.zone}
              columns={[
                {
                  key: 'zone',
                  header: 'Zone',
                  rowHeader: true,
                  cell: (r) => r.zone.replace(/_/g, ' '),
                },
                {
                  key: 'time',
                  header: 'Time there',
                  cell: (r) => (
                    <Text as="span" variant="code">
                      {r.iso.slice(0, 16).replace('T', ' ')}
                    </Text>
                  ),
                },
                {
                  key: 'offset',
                  header: 'Offset',
                  cell: (r) => `UTC${r.iso.slice(23)}`,
                },
              ]}
            />
          </>
        )}
      </Stack>
    </Card>
  );
};
