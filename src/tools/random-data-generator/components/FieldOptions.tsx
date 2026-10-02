import { useId, useState } from 'react';
import {
  CARD_NETWORKS,
  IBAN_COUNTRIES,
  MOCK_LOCALES,
  type MockFieldType,
  type MockTable,
} from '@/shared/lib/data-formats/mock-schema';
import {
  Checkbox,
  Grid,
  Inline,
  Input,
  Label,
  NumberInput,
  Select,
  Stack,
  Textarea,
} from '@/shared/ui';
import { LOCALE_LABEL } from '../lib/locales';
import { parseEnumLines } from '../lib/enum-lines';
import { nullPct } from '../lib/options';
import type { FieldSchema } from '../types';

const RANGE: readonly MockFieldType[] = [
  'int',
  'number',
  'float',
  'price',
  'currency',
  'age',
  'string',
  'words',
  'sentence',
  'paragraph',
];
const PRECISION: readonly MockFieldType[] = [
  'number',
  'float',
  'price',
  'currency',
];
const DATES: readonly MockFieldType[] = [
  'date',
  'dateTime',
  'time',
  'timestamp',
];
const LOCALISED: readonly MockFieldType[] = [
  'firstName',
  'lastName',
  'fullName',
  'username',
  'email',
  'phone',
  'address',
  'street',
  'city',
  'zipCode',
];

const enumText = (f: FieldSchema) =>
  (f.enum ?? [])
    .map((e) => (e.weight === 1 ? String(e.value) : `${e.value}: ${e.weight}`))
    .join('\n');

function EnumEditor({
  field,
  onChange,
}: {
  field: FieldSchema;
  onChange(patch: Partial<FieldSchema>): void;
}) {
  const id = useId();
  const [text, setText] = useState(() => enumText(field));
  return (
    <Stack gap="1">
      <Label htmlFor={id}>
        Values (one per line, optional weight after a colon)
      </Label>
      <Textarea
        id={id}
        rows={4}
        value={text}
        onChange={(v) => {
          setText(v);
          onChange({ enum: parseEnumLines(v) });
        }}
      />
    </Stack>
  );
}

interface FieldOptionsProps {
  field: FieldSchema;
  onChange(patch: Partial<FieldSchema>): void;
  tables: readonly MockTable[];
}

/** Per-field options (spec §8.2): nulls, uniqueness, ranges, enums, patterns, dates, references. */
export function FieldOptions({ field, onChange, tables }: FieldOptionsProps) {
  const ids = {
    nulls: useId(),
    unique: useId(),
    min: useId(),
    max: useId(),
    prec: useId(),
    pattern: useId(),
    from: useId(),
    to: useId(),
    table: useId(),
    field: useId(),
    locale: useId(),
    network: useId(),
    country: useId(),
    size: useId(),
  };
  const t = field.type;
  const nested = t === 'object' || t === 'array';
  const target = tables.find((x) => x.name === field.table) ?? tables[0];

  return (
    <Grid max={3} gap="3">
      {!nested && (
        <Stack gap="1">
          <Label htmlFor={ids.nulls}>Null %</Label>
          <NumberInput
            id={ids.nulls}
            value={nullPct(field)}
            min={0}
            max={100}
            onValueChange={(v) =>
              onChange({ nullablePct: Math.min(100, Math.max(0, v)) })
            }
          />
        </Stack>
      )}
      {!nested && (
        <Inline gap="2" align="center" className="self-end pb-2">
          <Checkbox
            id={ids.unique}
            checked={field.unique ?? false}
            onCheckedChange={(c) => onChange({ unique: c })}
          />
          <Label htmlFor={ids.unique}>Unique</Label>
        </Inline>
      )}
      {(RANGE.includes(t) || t === 'sequence') && (
        <Stack gap="1">
          <Label htmlFor={ids.min}>{t === 'sequence' ? 'Start' : 'Min'}</Label>
          <NumberInput
            id={ids.min}
            value={field.min ?? (t === 'sequence' ? 1 : 0)}
            onValueChange={(v) => onChange({ min: v })}
          />
        </Stack>
      )}
      {RANGE.includes(t) && (
        <Stack gap="1">
          <Label htmlFor={ids.max}>Max</Label>
          <NumberInput
            id={ids.max}
            value={field.max ?? 100}
            onValueChange={(v) => onChange({ max: v })}
          />
        </Stack>
      )}
      {PRECISION.includes(t) && (
        <Stack gap="1">
          <Label htmlFor={ids.prec}>Decimals</Label>
          <NumberInput
            id={ids.prec}
            value={field.precision ?? (t === 'number' ? 0 : 2)}
            min={0}
            max={10}
            onValueChange={(v) =>
              onChange({ precision: Math.min(10, Math.max(0, Math.round(v))) })
            }
          />
        </Stack>
      )}
      {t === 'array' && (
        <Stack gap="1">
          <Label htmlFor={ids.size}>Items per array</Label>
          <NumberInput
            id={ids.size}
            value={field.arraySize ?? 3}
            min={0}
            max={1000}
            onValueChange={(v) =>
              onChange({ arraySize: Math.max(0, Math.round(v)) })
            }
          />
        </Stack>
      )}
      {t === 'pattern' && (
        <Stack gap="1">
          <Label htmlFor={ids.pattern}>Pattern</Label>
          <Input
            id={ids.pattern}
            value={field.pattern ?? ''}
            placeholder="[A-Z]{3}-\d{4}"
            onChange={(v) => onChange({ pattern: v })}
          />
        </Stack>
      )}
      {DATES.includes(t) && (
        <>
          <Stack gap="1">
            <Label htmlFor={ids.from}>From</Label>
            <Input
              id={ids.from}
              type="date"
              value={field.dateFrom ?? '2000-01-01'}
              onChange={(v) => onChange({ dateFrom: v || undefined })}
            />
          </Stack>
          <Stack gap="1">
            <Label htmlFor={ids.to}>To</Label>
            <Input
              id={ids.to}
              type="date"
              value={field.dateTo ?? '2025-12-31'}
              onChange={(v) => onChange({ dateTo: v || undefined })}
            />
          </Stack>
        </>
      )}
      {t === 'foreign-key' && (
        <>
          <Stack gap="1">
            <Label htmlFor={ids.table}>Table</Label>
            <Select
              id={ids.table}
              value={target?.name ?? ''}
              onValueChange={(v) =>
                onChange({
                  table: v,
                  field: tables.find((x) => x.name === v)?.fields[0]?.name,
                })
              }
              items={tables.map((x) => ({ value: x.name, label: x.name }))}
            />
          </Stack>
          <Stack gap="1">
            <Label htmlFor={ids.field}>Field</Label>
            <Select
              id={ids.field}
              value={field.field ?? ''}
              onValueChange={(v) => onChange({ table: target?.name, field: v })}
              items={[
                { value: '', label: 'Choose a field' },
                ...(target?.fields ?? []).map((x) => ({
                  value: x.name,
                  label: x.name,
                })),
              ]}
            />
          </Stack>
        </>
      )}
      {t === 'creditCard' && (
        <Stack gap="1">
          <Label htmlFor={ids.network}>Network</Label>
          <Select
            id={ids.network}
            value={field.network ?? ''}
            onValueChange={(v) =>
              onChange({ network: (v || undefined) as FieldSchema['network'] })
            }
            items={[
              { value: '', label: 'Any' },
              ...CARD_NETWORKS.map((n) => ({
                value: n,
                label: n[0].toUpperCase() + n.slice(1),
              })),
            ]}
          />
        </Stack>
      )}
      {t === 'iban' && (
        <Stack gap="1">
          <Label htmlFor={ids.country}>Country</Label>
          <Select
            id={ids.country}
            value={field.country ?? ''}
            onValueChange={(v) =>
              onChange({ country: (v || undefined) as FieldSchema['country'] })
            }
            items={[
              { value: '', label: 'Any' },
              ...IBAN_COUNTRIES.map((c) => ({ value: c, label: c })),
            ]}
          />
        </Stack>
      )}
      {LOCALISED.includes(t) && (
        <Stack gap="1">
          <Label htmlFor={ids.locale}>Locale</Label>
          <Select
            id={ids.locale}
            value={field.locale ?? ''}
            onValueChange={(v) =>
              onChange({ locale: (v || undefined) as FieldSchema['locale'] })
            }
            items={[
              { value: '', label: 'Schema locale' },
              ...MOCK_LOCALES.map((l) => ({
                value: l,
                label: LOCALE_LABEL[l],
              })),
            ]}
          />
        </Stack>
      )}
      {t === 'enum' && (
        <div className="col-span-full">
          <EnumEditor key={field.id} field={field} onChange={onChange} />
        </div>
      )}
    </Grid>
  );
}
