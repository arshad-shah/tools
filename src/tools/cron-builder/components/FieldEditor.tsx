import React, { useState } from 'react';
import {
  Input,
  Label,
  NumberInput,
  SegmentedControl,
  Stack,
  Inline,
  Text,
} from '@/shared/ui';
import {
  buildField,
  fieldToSpec,
  type FieldMode,
  type FieldSpec,
} from '../lib/build';
import {
  FIELD_LABELS,
  fieldBounds,
  type CronFlavour,
  type FieldName,
} from '../lib/parse';

interface FieldEditorProps {
  field: FieldName;
  flavour: CronFlavour;
  /** The field's text in the expression. */
  text: string;
  onText(text: string): void;
}

const MODES: { value: FieldMode; label: string }[] = [
  { value: 'every', label: 'Every' },
  { value: 'specific', label: 'Specific' },
  { value: 'range', label: 'Range' },
  { value: 'step', label: 'Step' },
];

function specOf(
  text: string,
  field: FieldName,
  flavour: CronFlavour,
): FieldSpec | null {
  try {
    return fieldToSpec(text, field, flavour);
  } catch {
    return null;
  }
}

const Num: React.FC<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onValue(v: number): void;
}> = ({ id, label, value, min, max, onValue }) => (
  <Stack gap="1">
    <Label htmlFor={id}>{label}</Label>
    <NumberInput
      id={id}
      value={value}
      min={min}
      max={max}
      onValueChange={(v) => onValue(Math.round(v))}
      className="w-32"
    />
  </Stack>
);

const readValues = (text: string, min: number, max: number) =>
  [
    ...new Set(
      text
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= min && n <= max),
    ),
  ].sort((a, b) => a - b);

/**
 * The comma-separated values, kept as typed while they mean the same
 * values (so "1," can become "1,15").
 */
const SpecificValues: React.FC<{
  id: string;
  label: string;
  values: number[];
  min: number;
  max: number;
  onValues(values: number[]): void;
}> = ({ id, label, values, min, max, onValues }) => {
  const joined = values.join(',');
  const [draft, setDraft] = useState(joined);
  const [seen, setSeen] = useState(joined);
  if (joined !== seen) {
    setSeen(joined);
    if (readValues(draft, min, max).join(',') !== joined) setDraft(joined);
  }
  return (
    <Stack gap="1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={draft}
        placeholder={`For example ${min},${Math.min(max, min + 15)}`}
        onChange={(v) => {
          setDraft(v);
          onValues(readValues(v, min, max));
        }}
        className="font-mono"
      />
    </Stack>
  );
};

/**
 * One field's editor (spec §9.7): Every, Specific, Range or Step, two-way
 * with the field's text. Text the editor cannot show (L, W, #, mixed
 * lists) is edited as text only.
 */
export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  flavour,
  text,
  onText,
}) => {
  const label = FIELD_LABELS[field];
  const { min, max } = fieldBounds(field, flavour);
  const spec = specOf(text, field, flavour);
  const id = `cron-${field}`;
  // Quartz's "no specific value" survives choosing Every.
  const build = (next: FieldSpec) =>
    onText(
      next.mode === 'every' && text.trim() === '?'
        ? '?'
        : buildField(next, field, flavour),
    );

  const pickMode = (mode: FieldMode) => {
    if (mode === spec?.mode) return;
    if (mode === 'every') build({ mode });
    else if (mode === 'specific') build({ mode, values: [min] });
    else if (mode === 'range') build({ mode, from: min, to: max });
    else build({ mode, from: min, step: min === 0 ? 5 : 2 });
  };

  return (
    <Stack gap="2">
      <Inline gap="3" align="end">
        <Stack gap="1" className="w-40">
          <Label htmlFor={`${id}-text`}>{label}</Label>
          <Input
            id={`${id}-text`}
            value={text}
            onChange={onText}
            className="font-mono"
            spellCheck={false}
            autoComplete="off"
          />
        </Stack>
        <SegmentedControl
          label={`${label} mode`}
          size="sm"
          value={spec?.mode ?? ('' as FieldMode)}
          onChange={pickMode}
          options={MODES}
        />
      </Inline>
      {spec?.mode === 'specific' && (
        <SpecificValues
          id={`${id}-values`}
          label={`${label} values`}
          values={spec.values ?? []}
          min={min}
          max={max}
          onValues={(values) => build({ mode: 'specific', values })}
        />
      )}
      {spec?.mode === 'range' && (
        <Inline gap="3">
          <Num
            id={`${id}-from`}
            label="From"
            value={spec.from ?? min}
            min={min}
            max={max}
            onValue={(from) => build({ ...spec, from })}
          />
          <Num
            id={`${id}-to`}
            label="To"
            value={spec.to ?? max}
            min={min}
            max={max}
            onValue={(to) => build({ ...spec, to })}
          />
        </Inline>
      )}
      {spec?.mode === 'step' && (
        <Inline gap="3">
          <Num
            id={`${id}-start`}
            label="Starting at"
            value={spec.from ?? min}
            min={min}
            max={max}
            onValue={(from) => build({ ...spec, from })}
          />
          <Num
            id={`${id}-step`}
            label="Every"
            value={spec.step ?? 1}
            min={1}
            max={max - min + 1}
            onValue={(step) => build({ ...spec, step })}
          />
        </Inline>
      )}
      {!spec && (
        <Text size="xs" tone="subtle">
          This field uses a form the editor cannot show; edit its text.
        </Text>
      )}
    </Stack>
  );
};
