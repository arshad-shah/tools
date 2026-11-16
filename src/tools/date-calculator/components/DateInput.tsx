import {
  Button,
  DescriptionList,
  Disclosure,
  Inline,
  Select,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import React, { useMemo } from 'react';
import { listZones } from '@/shared/lib/time';
import { dateOutputs } from '../lib/outputs';
import { readDate, type DateValueInput } from '../lib/read';

export interface DateInputProps {
  label: string;
  input: DateValueInput;
  onInput: (next: DateValueInput) => void;
  now: number;
}

/**
 * A flexible date field: ISO 8601, Unix seconds or milliseconds, RFC 2822,
 * "now" or "today + 3w", read in the chosen zone, with its read-outs.
 */
export const DateInput: React.FC<DateInputProps> = ({
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
  const error = result && 'error' in result ? result.error : undefined;
  const outputs =
    result && 'epochMs' in result
      ? dateOutputs(result.epochMs, input.zone, now)
      : null;
  return (
    <Stack gap="3">
      <Inline gap="2" align="end">
        <Stack grow minSize="0">
          <TextField
            label={label}
            value={input.text}
            onChange={(text) => onInput({ ...input, text })}
            placeholder="2024-05-01 09:00, 1714550400 or today + 3w"
            spellCheck={false}
            autoComplete="off"
            error={error}
          />
        </Stack>
        <Button
          variant="soft"
          aria-label={`${label}: now`}
          onClick={() => onInput({ ...input, text: 'now' })}
        >
          Now
        </Button>
      </Inline>
      <Select
        label={`${label} time zone`}
        size="sm"
        value={input.zone}
        onChange={(zone) => onInput({ ...input, zone })}
        options={zones}
      />
      {outputs ? (
        <Stack gap="2">
          <Text size="sm" tone="muted">
            {outputs[0].value}
          </Text>
          <Disclosure summary={`More about ${label.toLowerCase()}`} size="sm">
            <DescriptionList
              size="sm"
              layout="inline"
              items={outputs.map((o) => ({
                id: o.label,
                term: o.label,
                detail: (
                  <Text as="span" variant="code" size="sm" wrap="break">
                    {o.value}
                  </Text>
                ),
              }))}
            />
          </Disclosure>
        </Stack>
      ) : null}
    </Stack>
  );
};
