import { useId, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button, IconButton } from '../button';
import { Checkbox } from '../controls';
import { IconFilter } from '../icons';
import { Input } from '../input';
import { Popover } from '../popover';
import { SegmentedControl, type SegmentedOption } from '../segmented-control';
import type { ColumnType } from './columns';
import { compileRegex, isFilterActive, type ColumnFilter } from './filters';

type Kind = ColumnFilter['kind'];

export interface FilterPopoverProps {
  header: string;
  type?: ColumnType;
  filter?: ColumnFilter;
  onChange(filter: ColumnFilter | undefined): void;
  /** Distinct cell texts offered by the value-set filter (read on open). */
  distinct(): string[];
}

const BLANK: Record<Kind, ColumnFilter> = {
  text: { kind: 'text', value: '' },
  range: { kind: 'range' },
  empty: { kind: 'empty', empty: true },
  set: { kind: 'set', values: [] },
};

const kindsFor = (type?: ColumnType): SegmentedOption<Kind>[] => {
  const first: SegmentedOption<Kind> =
    type === 'number' || type === 'date'
      ? { value: 'range', label: 'Range' }
      : { value: 'text', label: 'Text' };
  return type === 'boolean'
    ? [
        { value: 'set', label: 'Values' },
        { value: 'empty', label: 'Empty' },
      ]
    : [
        first,
        { value: 'set', label: 'Values' },
        { value: 'empty', label: 'Empty' },
      ];
};

const toInput = (n: number | undefined, date: boolean) =>
  n === undefined
    ? ''
    : date
      ? new Date(n).toISOString().slice(0, 10)
      : String(n);

const fromInput = (s: string, date: boolean): number | undefined => {
  if (s.trim() === '') return undefined;
  const n = date ? Date.parse(s) : Number(s);
  return Number.isFinite(n) ? n : undefined;
};

/** The header's filter button and its popover editor for one column. */
export function FilterPopover({
  header,
  type,
  filter,
  onChange,
  distinct,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const kinds = kindsFor(type);
  const kind = filter?.kind ?? kinds[0].value;
  const active = isFilterActive(filter);
  return (
    <>
      <IconButton
        ref={anchor}
        label={`Filter ${header}`}
        icon={IconFilter}
        variant="ghost"
        size="sm"
        tone={active ? 'accent' : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn('size-7 shrink-0', active && 'bg-accent-soft')}
      />
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={anchor}
        label={`Filter ${header}`}
        className="flex w-72 flex-col gap-3"
      >
        <SegmentedControl
          label="Filter kind"
          size="sm"
          value={kind}
          options={kinds}
          onChange={(k) => onChange(BLANK[k])}
        />
        <FilterBody
          type={type}
          filter={filter ?? BLANK[kind]}
          onChange={onChange}
          distinct={distinct}
          open={open}
        />
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          disabled={!filter}
          onClick={() => {
            onChange(undefined);
            setOpen(false);
            anchor.current?.focus();
          }}
        >
          Clear filter
        </Button>
      </Popover>
    </>
  );
}

function FilterBody({
  type,
  filter,
  onChange,
  distinct,
  open,
}: {
  type?: ColumnType;
  filter: ColumnFilter;
  onChange(f: ColumnFilter): void;
  distinct(): string[];
  open: boolean;
}) {
  const id = useId();
  switch (filter.kind) {
    case 'text': {
      const re = filter.regex ? compileRegex(filter.value) : null;
      const error = typeof re === 'string' ? re : null;
      return (
        <div className="flex flex-col gap-2">
          <Input
            aria-label="Contains"
            placeholder={filter.regex ? 'Pattern' : 'Contains'}
            value={filter.value}
            invalid={!!error}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(value) => onChange({ ...filter, value })}
          />
          <div className="flex items-center gap-2 text-sm text-fg">
            <Checkbox
              id={`${id}-re`}
              size="sm"
              checked={!!filter.regex}
              onCheckedChange={(regex) => onChange({ ...filter, regex })}
            />
            <label htmlFor={`${id}-re`}>Regular expression</label>
          </div>
          {error && (
            <p id={`${id}-err`} className="text-xs text-danger">
              {error}
            </p>
          )}
        </div>
      );
    }
    case 'range': {
      const date = type === 'date';
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="Minimum"
            type={date ? 'date' : 'number'}
            value={toInput(filter.min, date)}
            onChange={(v) => onChange({ ...filter, min: fromInput(v, date) })}
          />
          <Input
            aria-label="Maximum"
            type={date ? 'date' : 'number'}
            value={toInput(filter.max, date)}
            onChange={(v) => onChange({ ...filter, max: fromInput(v, date) })}
          />
        </div>
      );
    }
    case 'empty':
      return (
        <SegmentedControl
          label="Show rows"
          size="sm"
          value={filter.empty ? 'empty' : 'filled'}
          options={[
            { value: 'empty', label: 'Empty' },
            { value: 'filled', label: 'Not empty' },
          ]}
          onChange={(v) => onChange({ kind: 'empty', empty: v === 'empty' })}
        />
      );
    case 'set':
      return open ? (
        <ValueSet filter={filter} onChange={onChange} distinct={distinct} />
      ) : null;
  }
}

function ValueSet({
  filter,
  onChange,
  distinct,
}: {
  filter: Extract<ColumnFilter, { kind: 'set' }>;
  onChange(f: ColumnFilter): void;
  distinct(): string[];
}) {
  const id = useId();
  // Read once per open; the popover unmounts this on close.
  const [values] = useState(distinct);
  const chosen = new Set(filter.values);
  if (values.length === 0)
    return <p className="text-sm text-fg-muted">No values</p>;
  return (
    <ul
      aria-label="Values"
      className="flex max-h-56 flex-col gap-1 overflow-y-auto text-sm"
    >
      {values.map((v, i) => (
        <li key={v} className="flex items-center gap-2">
          <Checkbox
            id={`${id}-${i}`}
            size="sm"
            checked={chosen.has(v)}
            onCheckedChange={(on) =>
              onChange({
                kind: 'set',
                values: on
                  ? [...filter.values, v]
                  : filter.values.filter((x) => x !== v),
              })
            }
          />
          <label htmlFor={`${id}-${i}`} className="truncate text-fg">
            {v === '' ? 'Empty value' : v}
          </label>
        </li>
      ))}
    </ul>
  );
}
