import {
  Grid,
  Input,
  Label,
  Select,
  Stack,
  Textarea,
  SwitchField,
} from '@/shared/ui';
import { FORM_SPECS, type FieldSpec } from '../lib/form-spec';
import {
  PAYLOAD_LABELS,
  type PayloadFields,
  type PayloadType,
} from '../lib/payloads';

interface Props {
  type: PayloadType;
  onTypeChange(t: PayloadType): void;
  fields: PayloadFields;
  onFieldChange(type: PayloadType, key: string, value: string | boolean): void;
}

const TYPE_ITEMS = (Object.keys(PAYLOAD_LABELS) as PayloadType[]).map(
  (value) => ({
    value,
    label: PAYLOAD_LABELS[value],
  }),
);

function Field({
  spec,
  id,
  value,
  onChange,
}: {
  spec: FieldSpec;
  id: string;
  value: string | boolean;
  onChange(v: string | boolean): void;
}) {
  if (spec.kind === 'switch')
    return (
      <SwitchField
        label={spec.label}
        id={id}
        checked={value === true}
        onCheckedChange={onChange}
      />
    );
  const text = typeof value === 'string' ? value : '';
  return (
    <Stack
      gap="1"
      className={spec.kind === 'textarea' ? 'sm:col-span-2' : undefined}
    >
      <Label htmlFor={id}>{spec.label}</Label>
      {spec.kind === 'select' ? (
        <Select
          id={id}
          value={text}
          onValueChange={onChange}
          items={spec.options ?? []}
        />
      ) : spec.kind === 'textarea' ? (
        <Textarea id={id} value={text} onChange={onChange} rows={3} />
      ) : (
        <Input
          id={id}
          value={text}
          onChange={onChange}
          type={
            spec.kind === 'password'
              ? 'password'
              : spec.kind === 'datetime'
                ? 'datetime-local'
                : 'text'
          }
          inputMode={spec.inputMode}
          placeholder={spec.placeholder}
          spellCheck={false}
          autoComplete="off"
        />
      )}
    </Stack>
  );
}

/** The payload type and its fields. */
export function ContentForm({
  type,
  onTypeChange,
  fields,
  onFieldChange,
}: Props) {
  const values = fields[type] as unknown as Record<string, string | boolean>;
  return (
    <Stack gap="3">
      <Stack gap="1">
        <Label htmlFor="qr-type">Content type</Label>
        <Select
          id="qr-type"
          value={type}
          onValueChange={(v) => onTypeChange(v as PayloadType)}
          items={TYPE_ITEMS}
        />
      </Stack>
      <Grid max={2} gap="3">
        {FORM_SPECS[type]
          .filter(
            (s) =>
              !(
                type === 'wifi' &&
                s.key === 'password' &&
                values.security === 'nopass'
              ),
          )
          .filter(
            (s) =>
              !(
                type === 'crypto' &&
                s.key === 'chainId' &&
                values.coin !== 'ETH'
              ),
          )
          .map((spec) => (
            <Field
              key={spec.key}
              spec={spec}
              id={`qr-${type}-${spec.key}`}
              value={values[spec.key]}
              onChange={(v) => onFieldChange(type, spec.key, v)}
            />
          ))}
      </Grid>
    </Stack>
  );
}
