import {
  DateField,
  Grid,
  GridItem,
  Inline,
  Select,
  Stack,
  Switch,
  TextArea,
  TextField,
  TimeField,
} from '@arshad-shah/cynosure';
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
  (value) => ({ value, label: PAYLOAD_LABELS[value] }),
);

/** A local date and time (`YYYY-MM-DDTHH:mm`) as a DateField and a TimeField. */
function DateTime({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
}) {
  const [date = '', time = ''] = value.split('T');
  const join = (d: string, t: string) => (d ? `${d}T${t || '00:00'}` : '');
  return (
    <Inline gap="3" align="end" wrap>
      <DateField
        label={label}
        value={date || null}
        onChange={(d) => onChange(join(d ?? '', time))}
      />
      <TimeField
        label={`${label} at`}
        value={time ? time.slice(0, 5) : null}
        onChange={(t) => onChange(join(date, t ?? ''))}
      />
    </Inline>
  );
}

function Field({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: string | boolean;
  onChange(v: string | boolean): void;
}) {
  if (spec.kind === 'switch')
    return (
      <Switch label={spec.label} checked={value === true} onChange={onChange} />
    );
  const text = typeof value === 'string' ? value : '';
  if (spec.kind === 'select')
    return (
      <Select
        label={spec.label}
        value={text}
        onChange={onChange}
        options={spec.options ?? []}
      />
    );
  if (spec.kind === 'textarea')
    return (
      <TextArea label={spec.label} value={text} onChange={onChange} rows={3} />
    );
  if (spec.kind === 'datetime')
    return <DateTime label={spec.label} value={text} onChange={onChange} />;
  return (
    <TextField
      label={spec.label}
      value={text}
      onChange={onChange}
      type={spec.kind === 'password' ? 'password' : 'text'}
      revealable={spec.kind === 'password'}
      inputMode={spec.inputMode}
      placeholder={spec.placeholder}
      spellCheck={false}
      autoComplete="off"
    />
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
    <Stack gap="5">
      <Select
        label="Content type"
        width="md"
        value={type}
        onChange={(v) => onTypeChange(v as PayloadType)}
        options={TYPE_ITEMS}
      />
      <Grid minItemWidth="14rem" gap="4">
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
            <GridItem
              key={spec.key}
              span={
                spec.kind === 'textarea' || spec.kind === 'datetime'
                  ? 'full'
                  : undefined
              }
            >
              <Field
                spec={spec}
                value={values[spec.key]}
                onChange={(v) => onFieldChange(type, spec.key, v)}
              />
            </GridItem>
          ))}
      </Grid>
    </Stack>
  );
}
