import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconGlobe, IconPlus, IconTrash2 } from '@/shared/ui/icons';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardBody,
  Heading,
  IconButton,
  Inline,
  MetaList,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { toToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import { applyOps, type DateOp, type OpUnit } from '../lib/arith';
import { OP_UNITS } from '../lib/ops';
import { dateOutputs } from '../lib/outputs';
import { readDate, type DateValueInput } from '../lib/read';
import { DateInput } from './DateInput';

export interface ArithmeticTabProps {
  base: DateValueInput;
  onBase: (v: DateValueInput) => void;
  ops: DateOp[];
  onOps: (ops: DateOp[]) => void;
  overflow: 'clamp' | 'roll';
  onOverflow: (o: 'clamp' | 'roll') => void;
  workweek: boolean[];
  holidays: string[];
  now: number;
}

/** A date plus a chain of steps (spec §8.6), live. */
export const ArithmeticTab: React.FC<ArithmeticTabProps> = ({
  base,
  onBase,
  ops,
  onOps,
  overflow,
  onOverflow,
  workweek,
  holidays,
  now,
}) => {
  const navigate = useNavigate();
  const start = readDate(base, now);
  let result: { epochMs: number } | { error: string } | null = null;
  if (start && 'value' in start) {
    try {
      const r = applyOps(start.value, ops, {
        overflow,
        workweek,
        holidays: new Set(holidays),
      });
      result = { epochMs: r.toDate().getTime() };
    } catch (e) {
      result = { error: toToolError(e, 'Could not apply the steps').message };
    }
  }
  const setOp = (i: number, patch: Partial<DateOp>) =>
    onOps(ops.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const epochMs = result && 'epochMs' in result ? result.epochMs : null;
  const compareZones = () =>
    epochMs !== null &&
    sendTo(navigate, 'epoch-converter', {
      kind: 'text',
      mime: 'text/plain',
      text: String(Math.floor(epochMs / 1000)),
      sourceTool: 'date-calculator',
    });

  useSendCommands('date-calculator', [
    { target: 'epoch-converter', run: compareZones, enabled: epochMs !== null },
  ]);

  return (
    <Stack gap="6">
      <DateInput
        id="arith-base"
        label="Start from"
        input={base}
        onInput={onBase}
        now={now}
      />
      <Stack gap="3">
        <Heading level={3} size="sm">
          Steps, applied in order
        </Heading>
        {ops.map((op, i) => (
          <Inline key={i} gap="2" align="center" wrap={false}>
            <NumberInput
              aria-label={`Step ${i + 1} amount`}
              value={op.amount}
              min={-100000}
              max={100000}
              onValueChange={(amount) => setOp(i, { amount })}
            />
            <Select
              aria-label={`Step ${i + 1} unit`}
              value={op.unit}
              onValueChange={(unit) => setOp(i, { unit: unit as OpUnit })}
              items={OP_UNITS}
            />
            <IconButton
              variant="ghost"
              size="sm"
              label={`Remove step ${i + 1}`}
              icon={<IconTrash2 size="sm" />}
              onClick={() => onOps(ops.filter((_, j) => j !== i))}
            />
          </Inline>
        ))}
        <Inline gap="3" align="center" wrap>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconPlus size="sm" />}
            onClick={() => onOps([...ops, { amount: 1, unit: 'day' }])}
          >
            Add step
          </Button>
          <SegmentedControl<'clamp' | 'roll'>
            label="Past the end of a month"
            size="sm"
            value={overflow}
            onChange={onOverflow}
            options={[
              { value: 'clamp', label: 'Keep the last day' },
              { value: 'roll', label: 'Roll into next month' },
            ]}
          />
        </Inline>
      </Stack>
      {result && 'error' in result && (
        <Alert status="danger">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
      {result && 'epochMs' in result && (
        <div data-dynamic="">
          <Card>
            <CardBody>
              <Stack gap="3">
                <Text size="sm" tone="subtle">
                  Result
                </Text>
                <Heading level={3} size="lg" aria-live="polite">
                  {dateOutputs(result.epochMs, base.zone, now)[0].value}
                </Heading>
                <MetaList
                  items={dateOutputs(result.epochMs, base.zone, now)
                    .slice(1)
                    .map((o) => `${o.label} ${o.value}`)}
                />
                <Inline>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<IconGlobe size="sm" />}
                    onClick={compareZones}
                  >
                    Compare across zones
                  </Button>
                </Inline>
              </Stack>
            </CardBody>
          </Card>
        </div>
      )}
    </Stack>
  );
};
