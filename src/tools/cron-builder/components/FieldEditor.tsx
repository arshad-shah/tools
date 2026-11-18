import {
  Inline,
  NumberField,
  SegmentedControl,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import React from 'react';
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
  label: string;
  value: number;
  min: number;
  max: number;
  onValue(v: number): void;
}> = ({ label, value, min, max, onValue }) => (
  <NumberField
    label={label}
    width="sm"
    value={value}
    min={min}
    max={max}
    onChange={(v) => v !== null && onValue(Math.round(v))}
  />
);

/**
 * One field's editor (spec §9.7): Every, Specific, Range or Step, two-way
 * with the field's text. Specific values are typed in the field itself
 * (such as 0,15,30), so no second box repeats them. Text the editor cannot show (L, W, #, mixed
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
    <Stack gap="3">
      <Inline gap="3" align="end" wrap>
        <TextField
          label={label}
          width="sm"
          value={text}
          onChange={onText}
          spellCheck={false}
          autoComplete="off"
        />
        <SegmentedControl
          label={`${label} mode`}
          value={spec?.mode ?? ''}
          onChange={(v) => pickMode(v as FieldMode)}
          options={MODES}
        />
      </Inline>
      {spec?.mode === 'range' ? (
        <Inline gap="3" wrap>
          <Num
            label="From"
            value={spec.from ?? min}
            min={min}
            max={max}
            onValue={(from) => build({ ...spec, from })}
          />
          <Num
            label="To"
            value={spec.to ?? max}
            min={min}
            max={max}
            onValue={(to) => build({ ...spec, to })}
          />
        </Inline>
      ) : null}
      {spec?.mode === 'step' ? (
        <Inline gap="3" wrap>
          <Num
            label="Starting at"
            value={spec.from ?? min}
            min={min}
            max={max}
            onValue={(from) => build({ ...spec, from })}
          />
          <Num
            label="Every"
            value={spec.step ?? 1}
            min={1}
            max={max - min + 1}
            onValue={(step) => build({ ...spec, step })}
          />
        </Inline>
      ) : null}
      {!spec ? (
        <Text size="sm" tone="muted">
          This field uses a form the editor cannot show; edit its text.
        </Text>
      ) : null}
    </Stack>
  );
};
