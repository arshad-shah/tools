import {
  Badge,
  Button,
  Card,
  Disclosure,
  EmptyState,
  Notice,
  Select,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { clock, sparkles } from '@arshad-shah/cynosure/icons';
import React, { useMemo } from 'react';
import { TransformLayout } from '@/app/ui/transform';
import { toToolError } from '@/shared/lib/errors';
import { useMediaQuery } from '@/shared/lib/media-query';
import { KIND_LABELS, outputsFor } from '../lib/outputs';
import { readInstant, type ReadAs } from '../lib/read';
import { NowPanel } from './NowPanel';
import { ValueTable } from './ValueTable';
import { ZoneField } from './ZoneField';

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
  /** Shows the live Now card under the input. */
  showNow?: boolean;
}

/** One input, auto-detected, rendered every way. */
export const ConvertPanel: React.FC<ConvertPanelProps> = ({
  text,
  onText,
  readAs,
  onReadAs,
  zone,
  onZone,
  now,
  showNow = false,
}) => {
  const result = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const r = readInstant(text, readAs, { zone, now });
      return { ...r, outputs: outputsFor(r.epochMs, zone, now) };
    } catch (e) {
      return { error: toToolError(e, 'Could not read that time').message };
    }
  }, [text, readAs, zone, now]);
  const example = () => onText('1700000000000');
  // The live clock sits under the input when side by side, last when stacked.
  const wide = useMediaQuery('(min-width: 1200px)');
  const nowCard = showNow ? (
    <NowPanel now={now} onUse={(ms) => onText(String(ms))} />
  ) : null;

  const input = (
    <Stack gap="6">
      <Card as="section" title="Time to convert">
        <Stack gap="5">
          <TextField
            label="Timestamp or date"
            value={text}
            onChange={onText}
            placeholder="1700000000000, 2024-05-01T12:00Z or now"
            spellCheck={false}
            autoComplete="off"
            clearable
            error={result && 'error' in result ? result.error : undefined}
            addonEnd={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onText(String(Date.now()))}
              >
                Now
              </Button>
            }
          />
          <ZoneField label="Time zone" value={zone} onChange={onZone} />
          {/* Numbers are detected; forcing a unit is rare. The summary names
              the unit in use so a forced one stays in sight. */}
          <Disclosure
            summary="Number units"
            trailing={READ_AS.find((r) => r.value === readAs)?.label}
            variant="line"
            size="sm"
            defaultOpen={readAs !== 'auto'}
          >
            <Stack paddingBlock="2">
              <Select
                label="Read numbers as"
                value={readAs}
                onChange={(v) => onReadAs(v as ReadAs)}
                options={READ_AS}
              />
            </Stack>
          </Disclosure>
        </Stack>
      </Card>
      {wide ? nowCard : null}
    </Stack>
  );

  const output = (
    <Card
      as="section"
      title="Conversions"
      actions={
        result && 'detected' in result ? (
          <Badge tone="accent">{`Detected: ${KIND_LABELS[result.detected]}`}</Badge>
        ) : undefined
      }
    >
      {!result ? (
        <EmptyState
          icon={clock}
          title="No time yet"
          description="Enter a Unix timestamp in any unit, an ISO date or words like now, and see it every way."
          actions={
            <Button variant="soft" icon={sparkles} onClick={example}>
              Try an example
            </Button>
          }
        />
      ) : 'error' in result ? (
        <Notice tone="danger" title="Nothing to convert">
          Fix the time on the left: what is wrong is shown under it.
        </Notice>
      ) : (
        <ValueTable caption="Conversions" rows={result.outputs} />
      )}
    </Card>
  );

  return (
    <TransformLayout
      start={input}
      end={
        wide ? (
          output
        ) : (
          <Stack gap="6">
            {output}
            {nowCard}
          </Stack>
        )
      }
      defaultSize={42}
    />
  );
};
