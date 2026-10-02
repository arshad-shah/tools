import React, { useMemo } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Code,
  Grid,
  Input,
  Inline,
  Label,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { listZones } from '@/shared/lib/time';
import { KIND_LABELS, outputsFor } from '../lib/outputs';
import { readInstant, type ReadAs } from '../lib/read';
import { CopyValue } from './CopyValue';

const READ_AS: { value: ReadAs; label: string }[] = [
  { value: 'auto', label: 'Detect automatically' },
  { value: 'unix-s', label: 'Unix seconds' },
  { value: 'unix-ms', label: 'Unix milliseconds' },
  { value: 'unix-us', label: 'Unix microseconds' },
  { value: 'unix-ns', label: 'Unix nanoseconds' },
];

export interface ConvertPanelProps {
  text: string;
  onText: (t: string) => void;
  readAs: ReadAs;
  onReadAs: (r: ReadAs) => void;
  zone: string;
  onZone: (z: string) => void;
  /** For relative output ("2 hours ago"). */
  now: number;
}

/** One input, auto-detected, rendered every way (spec §9.6). */
export const ConvertPanel: React.FC<ConvertPanelProps> = ({
  text,
  onText,
  readAs,
  onReadAs,
  zone,
  onZone,
  now,
}) => {
  const { copiedKey, copy } = useClipboard();
  const zones = useMemo(
    () => listZones().map((z) => ({ value: z.id, label: z.label })),
    [],
  );
  const result = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const r = readInstant(text, readAs, { zone, now });
      return { ...r, outputs: outputsFor(r.epochMs, zone, now) };
    } catch (e) {
      return { error: toToolError(e, 'Could not read that time').message };
    }
  }, [text, readAs, zone, now]);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Convert</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack gap="4">
          <Grid cols={{ base: 1, md: 2 }} gap="3">
            <Stack gap="1">
              <Label htmlFor="epoch-input">Timestamp or date</Label>
              <Inline gap="2" wrap={false}>
                <Input
                  id="epoch-input"
                  value={text}
                  onChange={onText}
                  placeholder="1700000000000, 2024-05-01T12:00Z or now"
                  spellCheck={false}
                  autoComplete="off"
                  invalid={Boolean(result && 'error' in result)}
                  aria-describedby="epoch-status"
                />
                <Button
                  variant="secondary"
                  onClick={() => onText(String(Date.now()))}
                >
                  Now
                </Button>
              </Inline>
            </Stack>
            <Stack gap="1">
              <Label htmlFor="epoch-read-as">Read numbers as</Label>
              <Select
                id="epoch-read-as"
                value={readAs}
                onValueChange={(v) => onReadAs(v as ReadAs)}
                items={READ_AS}
              />
            </Stack>
          </Grid>
          <Stack gap="1">
            <Label htmlFor="epoch-zone">Time zone</Label>
            <Select
              id="epoch-zone"
              value={zone}
              onValueChange={onZone}
              items={zones}
            />
          </Stack>
          <div id="epoch-status" aria-live="polite">
            {result && 'error' in result ? (
              <Alert status="danger">
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : result ? (
              <Badge variant="soft" tone="accent">
                {`Detected: ${KIND_LABELS[result.detected]}`}
              </Badge>
            ) : null}
          </div>
          {result && 'outputs' in result && (
            <Table aria-label="Conversions">
              <TableBody>
                {result.outputs.map((o) => (
                  <TableRow key={o.label}>
                    <TableCell>{o.label}</TableCell>
                    <TableCell>
                      <Code>{o.value}</Code>
                    </TableCell>
                    <TableCell>
                      <CopyValue
                        label={o.label}
                        value={o.value}
                        copied={copiedKey === o.label}
                        onCopy={() => void copy(o.value, o.label)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};
