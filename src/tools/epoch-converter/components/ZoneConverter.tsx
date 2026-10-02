import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  DateInput,
  Grid,
  Input,
  Label,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/shared/ui';
import { toToolError } from '@/shared/lib/errors';
import { listZones } from '@/shared/lib/time';
import { convertWallClock } from '../lib/zone-convert';

/** A wall-clock time in one zone, shown in the listed zones (spec §9.6). */
export const ZoneConverter: React.FC<{
  zones: string[];
  defaultZone: string;
}> = ({ zones, defaultZone }) => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [from, setFrom] = useState(defaultZone);
  const items = useMemo(
    () => listZones().map((z) => ({ value: z.id, label: z.label })),
    [],
  );
  const result = useMemo(() => {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    const t = /^(\d{2}):(\d{2})$/.exec(time);
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
    <Card>
      <CardHeader>
        <CardTitle as="h2">Zone converter</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="4">
          <Grid cols={{ base: 1, md: 3 }} gap="3">
            <Stack gap="1">
              <Label htmlFor="zc-date">Date</Label>
              <DateInput
                id="zc-date"
                label="Date"
                value={date}
                onChange={setDate}
              />
            </Stack>
            <Stack gap="1">
              <Label htmlFor="zc-time">Time</Label>
              <Input id="zc-time" type="time" value={time} onChange={setTime} />
            </Stack>
            <Stack gap="1">
              <Label htmlFor="zc-zone">In zone</Label>
              <Select
                id="zc-zone"
                value={from}
                onValueChange={setFrom}
                items={items}
              />
            </Stack>
          </Grid>
          {'error' in result ? (
            <Alert status="danger">
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          ) : (
            <>
              {result.notice && (
                <Alert status="warning">
                  <AlertDescription>{result.notice}</AlertDescription>
                </Alert>
              )}
              <Table aria-label="Converted times">
                <TableBody>
                  {result.rows.map((r) => (
                    <TableRow key={r.zone}>
                      <TableCell>{r.zone.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Code>{r.iso.slice(0, 16).replace('T', ' ')}</Code>
                      </TableCell>
                      <TableCell>UTC{r.iso.slice(23)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};
