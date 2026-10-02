import React, { useMemo } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Inline,
  Input,
  Label,
  MetaList,
  Select,
  Stack,
} from '@/shared/ui';
import { listZones } from '@/shared/lib/time';
import { dateOutputs } from '../lib/outputs';
import { readDate, type DateValueInput } from '../lib/read';

export interface DateInputProps {
  id: string;
  label: string;
  input: DateValueInput;
  onInput: (next: DateValueInput) => void;
  now: number;
}

/**
 * A flexible date field (spec §8.6): ISO 8601, Unix seconds or
 * milliseconds, RFC 2822, "now" or "today + 3w", read in the chosen zone,
 * with its read-outs below.
 */
export const DateInput: React.FC<DateInputProps> = ({
  id,
  label,
  input,
  onInput,
  now,
}) => {
  const zones = useMemo(
    () => listZones().map((z) => ({ value: z.id, label: z.label })),
    [],
  );
  const result = readDate(input, now);
  const error = result && 'error' in result ? result.error : null;
  return (
    <Stack gap="2">
      <Label htmlFor={id}>{label}</Label>
      <Inline gap="2" wrap={false}>
        <Input
          id={id}
          value={input.text}
          onChange={(text) => onInput({ ...input, text })}
          placeholder="2024-05-01 09:00, 1714550400 or today + 3w"
          spellCheck={false}
          autoComplete="off"
          invalid={Boolean(error)}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-status`}
        />
        <Button
          variant="secondary"
          aria-label={`${label}: now`}
          onClick={() => onInput({ ...input, text: 'now' })}
        >
          Now
        </Button>
      </Inline>
      <Select
        aria-label={`${label} time zone`}
        value={input.zone}
        onValueChange={(zone) => onInput({ ...input, zone })}
        items={zones}
      />
      <div id={`${id}-status`} aria-live="polite" data-dynamic="">
        {error ? (
          <Alert status="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : result && 'epochMs' in result ? (
          <MetaList
            items={dateOutputs(result.epochMs, input.zone, now).map(
              (o) => `${o.label} ${o.value}`,
            )}
          />
        ) : null}
      </div>
    </Stack>
  );
};
