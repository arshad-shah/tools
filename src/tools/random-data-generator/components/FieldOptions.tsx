import {
  Checkbox,
  DateField,
  Grid,
  GridItem,
  NumberField,
  Select,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import { useState } from 'react';
import {
  CARD_NETWORKS,
  IBAN_COUNTRIES,
  MOCK_LOCALES,
  type MockFieldType,
  type MockTable,
} from '@/shared/lib/data-formats/mock-schema';
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
  const [text, setText] = useState(() => enumText(field));
  return (
    <TextArea
      size="sm"
      label="Values"
      description="One per line, optional weight after a colon"
      rows={4}
      value={text}
      onChange={(v) => {
        setText(v);
        onChange({ enum: parseEnumLines(v) });
      }}
    />
  );
}

/** Select has no empty value: "any" stands for none chosen. */
const ANY = '__any';
const orAny = (v: string | undefined) => v || ANY;
const fromAny = (v: string) => (v === ANY ? undefined : v);

interface FieldOptionsProps {
  field: FieldSchema;
  onChange(patch: Partial<FieldSchema>): void;
  tables: readonly MockTable[];
}

/** Per-field options (spec §8.2): nulls, uniqueness, ranges, enums, patterns, dates, references. */
export function FieldOptions({ field, onChange, tables }: FieldOptionsProps) {
  const t = field.type;
  const nested = t === 'object' || t === 'array';
  const target = tables.find((x) => x.name === field.table) ?? tables[0];

  const num = (
    label: string,
    value: number,
    set: (v: number) => void,
    range: { min?: number; max?: number } = {},
  ) => (
    <NumberField
      size="sm"
      label={label}
      value={value}
      min={range.min}
      max={range.max}
      onChange={(v) => v !== null && set(v)}
    />
  );

  return (
    <Grid columns={{ base: 1, sm: 2 }} gap="3">
      {!nested &&
        num(
          'Null %',
          nullPct(field),
          (v) => onChange({ nullablePct: Math.min(100, Math.max(0, v)) }),
          { min: 0, max: 100 },
        )}
      {!nested && (
        <Checkbox
          size="sm"
          label="Unique"
          checked={field.unique ?? false}
          onChange={(c) => onChange({ unique: c })}
        />
      )}
      {(RANGE.includes(t) || t === 'sequence') &&
        num(
          t === 'sequence' ? 'Start' : 'Min',
          field.min ?? (t === 'sequence' ? 1 : 0),
          (v) => onChange({ min: v }),
        )}
      {RANGE.includes(t) &&
        num('Max', field.max ?? 100, (v) => onChange({ max: v }))}
      {PRECISION.includes(t) &&
        num(
          'Decimals',
          field.precision ?? (t === 'number' ? 0 : 2),
          (v) =>
            onChange({ precision: Math.min(10, Math.max(0, Math.round(v))) }),
          { min: 0, max: 10 },
        )}
      {t === 'array' &&
        num(
          'Items per array',
          field.arraySize ?? 3,
          (v) => onChange({ arraySize: Math.max(0, Math.round(v)) }),
          { min: 0, max: 1000 },
        )}
      {t === 'pattern' && (
        <TextField
          size="sm"
          label="Pattern"
          value={field.pattern ?? ''}
          placeholder="[A-Z]{3}-\d{4}"
          onChange={(v) => onChange({ pattern: v })}
        />
      )}
      {DATES.includes(t) && (
        <>
          <DateField
            size="sm"
            label="From"
            value={field.dateFrom ?? '2000-01-01'}
            onChange={(v) => onChange({ dateFrom: v || undefined })}
          />
          <DateField
            size="sm"
            label="To"
            value={field.dateTo ?? '2025-12-31'}
            onChange={(v) => onChange({ dateTo: v || undefined })}
          />
        </>
      )}
      {t === 'foreign-key' && (
        <>
          <Select
            size="sm"
            label="Table"
            value={target?.name ?? ''}
            onChange={(v) =>
              onChange({
                table: v,
                field: tables.find((x) => x.name === v)?.fields[0]?.name,
              })
            }
            options={tables.map((x) => ({ value: x.name, label: x.name }))}
          />
          <Select
            size="sm"
            label="Field"
            placeholder="Choose a field"
            value={field.field ?? ''}
            onChange={(v) => onChange({ table: target?.name, field: v })}
            options={(target?.fields ?? []).map((x) => ({
              value: x.name,
              label: x.name,
            }))}
          />
        </>
      )}
      {t === 'creditCard' && (
        <Select
          size="sm"
          label="Network"
          value={orAny(field.network)}
          onChange={(v) =>
            onChange({ network: fromAny(v) as FieldSchema['network'] })
          }
          options={[
            { value: ANY, label: 'Any' },
            ...CARD_NETWORKS.map((n) => ({
              value: n,
              label: n[0].toUpperCase() + n.slice(1),
            })),
          ]}
        />
      )}
      {t === 'iban' && (
        <Select
          size="sm"
          label="Country"
          value={orAny(field.country)}
          onChange={(v) =>
            onChange({ country: fromAny(v) as FieldSchema['country'] })
          }
          options={[
            { value: ANY, label: 'Any' },
            ...IBAN_COUNTRIES.map((c) => ({ value: c, label: c })),
          ]}
        />
      )}
      {LOCALISED.includes(t) && (
        <Select
          size="sm"
          label="Locale"
          value={orAny(field.locale)}
          onChange={(v) =>
            onChange({ locale: fromAny(v) as FieldSchema['locale'] })
          }
          options={[
            { value: ANY, label: 'Schema locale' },
            ...MOCK_LOCALES.map((l) => ({
              value: l,
              label: LOCALE_LABEL[l],
            })),
          ]}
        />
      )}
      {t === 'enum' && (
        <GridItem span="full">
          <EnumEditor key={field.id} field={field} onChange={onChange} />
        </GridItem>
      )}
    </Grid>
  );
}
