import React from 'react';
import {
  Checkbox,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
  Textarea,
} from '@/shared/ui';
import type { FormField, FormValue } from '@/pdf/edit';

interface FieldControlProps {
  field: FormField;
  value: FormValue;
  onChange: (v: FormValue) => void;
  id: string;
  disabled?: boolean;
}

/** Kept outside the Label so the accessible name stays exactly the field name. */
const ReadOnlyNote: React.FC<{ show: boolean }> = ({ show }) =>
  show ? <span className="text-xs text-fg-muted">(read-only)</span> : null;

/** One control per AcroForm field kind; its visible label is the field name. */
export const FieldControl: React.FC<FieldControlProps> = ({
  field,
  value,
  onChange,
  id,
  disabled,
}) => {
  if (field.kind === 'unsupported') return null;
  const off = disabled || field.readOnly;
  const heading = (
    <Inline gap="2" align="center">
      <Label htmlFor={id}>{field.name}</Label>
      <ReadOnlyNote show={field.readOnly} />
    </Inline>
  );

  if (field.kind === 'text') {
    const text = typeof value === 'string' ? value : '';
    return (
      <Stack gap="2">
        {heading}
        {field.multiline ? (
          <Textarea
            id={id}
            rows={4}
            value={text}
            disabled={off}
            maxLength={field.maxLength ?? undefined}
            onChange={onChange}
          />
        ) : (
          <Input
            id={id}
            value={text}
            disabled={off}
            maxLength={field.maxLength ?? undefined}
            onChange={onChange}
          />
        )}
      </Stack>
    );
  }

  if (field.kind === 'checkbox') {
    return (
      <Inline gap="2" align="center">
        <Checkbox
          id={id}
          checked={value === true}
          disabled={off}
          onCheckedChange={onChange}
        />
        <Label htmlFor={id}>{field.name}</Label>
        <ReadOnlyNote show={field.readOnly} />
      </Inline>
    );
  }

  const multi =
    (field.kind === 'dropdown' || field.kind === 'optionlist') &&
    field.multiSelect;
  if (multi) {
    const selected = new Set(Array.isArray(value) ? value : []);
    const toggle = (option: string, on: boolean) => {
      const next = new Set(selected);
      if (on) next.add(option);
      else next.delete(option);
      // Keep the document's option order.
      onChange(field.options.filter((o) => next.has(o)));
    };
    return (
      <div role="group" aria-label={field.name} className="flex flex-col gap-2">
        <Inline gap="2" align="center">
          <Text size="sm" weight="medium">
            {field.name}
          </Text>
          <ReadOnlyNote show={field.readOnly} />
        </Inline>
        {field.options.map((option) => (
          <Inline key={option} gap="2" align="center">
            <Checkbox
              aria-label={`${field.name}: ${option}`}
              checked={selected.has(option)}
              disabled={off}
              onCheckedChange={(on) => toggle(option, on)}
            />
            <Text size="sm">{option}</Text>
          </Inline>
        ))}
      </div>
    );
  }

  const choice = typeof value === 'string' ? value : '';
  if (field.kind === 'dropdown' && field.editable) {
    return (
      <Stack gap="2">
        {heading}
        <Input
          id={id}
          list={`${id}-options`}
          value={choice}
          disabled={off}
          onChange={onChange}
        />
        <datalist id={`${id}-options`}>
          {field.options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </Stack>
    );
  }

  return (
    <Stack gap="2">
      {heading}
      <Select
        id={id}
        value={choice}
        disabled={off}
        items={[
          { value: '', label: '— None —' },
          ...field.options.map((o) => ({ value: o, label: o })),
        ]}
        onValueChange={onChange}
      />
    </Stack>
  );
};
