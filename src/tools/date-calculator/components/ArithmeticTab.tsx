import {
  Button,
  Card,
  DescriptionList,
  EmptyState,
  Heading,
  IconButton,
  Inline,
  Notice,
  NumberField,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { calendarPlus, globe, plus, trash } from '@arshad-shah/cynosure/icons';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TransformLayout } from '@/app/ui/transform';
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

/** A date plus a chain of steps, live. */
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

  const outputs =
    epochMs !== null ? dateOutputs(epochMs, base.zone, now) : null;

  const inputCard = (
    <Card as="section" title="Date and steps">
      <Stack gap="6">
        <DateInput label="Start from" input={base} onInput={onBase} now={now} />
        <Stack gap="3" role="group" aria-label="Steps, applied in order">
          <Text weight="medium">Steps, applied in order</Text>
          {ops.map((op, i) => (
            <Inline key={i} gap="2" align="center">
              <Stack grow minSize="0">
                <NumberField
                  label={`Step ${i + 1} amount`}
                  labelHidden
                  value={op.amount}
                  min={-100000}
                  max={100000}
                  onChange={(amount) => amount !== null && setOp(i, { amount })}
                />
              </Stack>
              <Stack grow minSize="0">
                <Select
                  label={`Step ${i + 1} unit`}
                  labelHidden
                  value={op.unit}
                  onChange={(unit) => setOp(i, { unit: unit as OpUnit })}
                  options={OP_UNITS}
                />
              </Stack>
              <IconButton
                variant="ghost"
                tone="neutral"
                size="sm"
                icon={trash}
                label={`Remove step ${i + 1}`}
                onClick={() => onOps(ops.filter((_, j) => j !== i))}
              />
            </Inline>
          ))}
          <Inline>
            <Button
              size="sm"
              variant="soft"
              icon={plus}
              onClick={() => onOps([...ops, { amount: 1, unit: 'day' }])}
            >
              Add step
            </Button>
          </Inline>
        </Stack>
        <Stack gap="2">
          <Text weight="medium">Past the end of a month</Text>
          <SegmentedControl
            label="Past the end of a month"
            size="sm"
            value={overflow}
            onChange={(v) => onOverflow(v as 'clamp' | 'roll')}
            options={[
              { value: 'clamp', label: 'Keep the last day' },
              { value: 'roll', label: 'Roll into next month' },
            ]}
          />
        </Stack>
      </Stack>
    </Card>
  );

  const resultCard = (
    <Card as="section" title="Result">
      {result && 'error' in result ? (
        <Notice tone="danger">{result.error}</Notice>
      ) : outputs ? (
        <Stack gap="5">
          <Heading level={3} size="xl" aria-live="polite">
            {outputs[0].value}
          </Heading>
          <DescriptionList
            divided
            size="sm"
            items={outputs.slice(1).map((o) => ({
              id: o.label,
              term: o.label,
              detail: (
                <Text as="span" variant="code" wrap="break">
                  {o.value}
                </Text>
              ),
            }))}
          />
          <Inline>
            <Button
              size="sm"
              variant="soft"
              icon={globe}
              onClick={compareZones}
            >
              Compare across zones
            </Button>
          </Inline>
        </Stack>
      ) : (
        <EmptyState
          icon={calendarPlus}
          title="Enter a start date"
          description="Add or subtract years, months, weeks, days, hours or business days, in any order."
        />
      )}
    </Card>
  );

  return <TransformLayout start={inputCard} end={resultCard} />;
};
