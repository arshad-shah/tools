import React from 'react';
import {
  Checkbox,
  Inline,
  Input,
  Label,
  RadioGroup,
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

/**
 * Notes kept outside the label so its accessible name stays the field's
 * title: "(read-only)", and the raw field name when an alternate name is
 * shown instead (real forms name fields like "topmostSubform[0].f1_01[0]").
 */
const Notes: React.FC<{ field: FormField }> = ({ field }) => (
  <>
    {field.label && (
      <span className="break-all font-mono text-xs text-fg-subtle">
        {field.name}
      </span>
    )}
    {field.kind !== 'unsupported' && field.readOnly && (
      <span className="text-xs text-fg-muted">(read-only)</span>
    )}
  </>
);

/**
 * One control per AcroForm field kind. Its visible label is the field's
 * alternate name (/TU) when it has one, else the field name.
 */
export const FieldControl: React.FC<FieldControlProps> = ({
  field,
  value,
  onChange,
  id,
  disabled,
}) => {
  if (field.kind === 'unsupported') return null;
  const title = field.label ?? field.name;
  const off = disabled || field.readOnly;
  const heading = (
    <Inline gap="2" align="center" wrap>
      <Label htmlFor={id}>{title}</Label>
      <Notes field={field} />
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
      <Inline gap="2" align="center" wrap>
        <Checkbox
          id={id}
          checked={value === true}
          disabled={off}
          onCheckedChange={onChange}
        />
        <Label htmlFor={id}>{title}</Label>
        <Notes field={field} />
      </Inline>
    );
  }

  const groupHeading = (
    <Inline gap="2" align="center" wrap>
      <Text id={`${id}-label`} size="sm" weight="medium">
        {title}
      </Text>
      <Notes field={field} />
    </Inline>
  );

  const choice = typeof value === 'string' ? value : '';
  if (field.kind === 'radio') {
    const options = [
      { value: '', label: 'None' },
      ...field.options.map((o) => ({ value: o, label: o })),
    ];
    return (
      <RadioGroup
        labelledBy={`${id}-label`}
        heading={groupHeading}
        value={choice}
        onValueChange={onChange}
        options={options}
        disabled={off}
      />
    );
  }

  if (field.multiSelect) {
    const selected = new Set(Array.isArray(value) ? value : []);
    const toggle = (option: string, on: boolean) => {
      const next = new Set(selected);
      if (on) next.add(option);
      else next.delete(option);
      // Keep the document's option order.
      onChange(field.options.filter((o) => next.has(o)));
    };
    return (
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="flex flex-col gap-2"
      >
        {groupHeading}
        {field.options.map((option) => (
          <Inline key={option} gap="2" align="center">
            <Checkbox
              aria-label={`${title}: ${option}`}
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
