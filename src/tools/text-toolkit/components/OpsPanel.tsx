import { useId, type ReactNode } from 'react';
import { Button, Input, Label, NumberInput, Select, Switch } from '@/shared/ui';
import type { OpGroup, TextOp } from '../lib/ops';
import type { ToolkitSettings } from '../settings';

export interface OpsPanelProps {
  ops: TextOp[];
  onRun(op: TextOp): void;
  settings: ToolkitSettings;
  update(patch: Partial<ToolkitSettings>): void;
  filter: string;
  onFilter(text: string): void;
}

const GROUPS: OpGroup[] = ['Case', 'Lines', 'Clean'];

function Field({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-w-28 flex-1 flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(on: boolean): void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function LineOptions({
  settings: s,
  update,
  filter,
  onFilter,
}: Omit<OpsPanelProps, 'ops' | 'onRun'>) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line p-3">
      <div className="flex flex-wrap gap-3">
        <Toggle
          label="Duplicates ignore case"
          checked={s.dedupeCaseInsensitive}
          onChange={(v) => update({ dedupeCaseInsensitive: v })}
        />
        <Toggle
          label="Filter removes matches"
          checked={s.filterInvert}
          onChange={(v) => update({ filterInvert: v })}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Field label="Keep duplicate">
          {(id) => (
            <Select
              id={id}
              value={s.dedupeKeep}
              onValueChange={(v) =>
                update({ dedupeKeep: v as 'first' | 'last' })
              }
              items={[
                { value: 'first', label: 'First' },
                { value: 'last', label: 'Last' },
              ]}
            />
          )}
        </Field>
        <Field label="Number from">
          {(id) => (
            <NumberInput
              id={id}
              value={s.numberStart}
              onValueChange={(v) => update({ numberStart: v })}
            />
          )}
        </Field>
        <Field label="Number separator">
          {(id) => (
            <Input
              id={id}
              value={s.numberSep}
              onChange={(v) => update({ numberSep: v })}
            />
          )}
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Field label="Prefix">
          {(id) => (
            <Input
              id={id}
              value={s.prefix}
              onChange={(v) => update({ prefix: v })}
            />
          )}
        </Field>
        <Field label="Suffix">
          {(id) => (
            <Input
              id={id}
              value={s.suffix}
              onChange={(v) => update({ suffix: v })}
            />
          )}
        </Field>
        <Field label="Join with">
          {(id) => (
            <Input
              id={id}
              value={s.joinSep}
              onChange={(v) => update({ joinSep: v })}
            />
          )}
        </Field>
        <Field label="Split on">
          {(id) => (
            <Input
              id={id}
              value={s.splitSep}
              onChange={(v) => update({ splitSep: v })}
            />
          )}
        </Field>
        <Field label="Filter text">
          {(id) => <Input id={id} value={filter} onChange={onFilter} />}
        </Field>
      </div>
    </div>
  );
}

function OtherOptions({
  group,
  settings: s,
  update,
}: {
  group: OpGroup;
  settings: ToolkitSettings;
  update(patch: Partial<ToolkitSettings>): void;
}) {
  if (group === 'Case')
    return (
      <div className="flex flex-wrap gap-3">
        <Field label="Slug separator">
          {(id) => (
            <Input
              id={id}
              value={s.slugSep}
              onChange={(v) => update({ slugSep: v })}
            />
          )}
        </Field>
      </div>
    );
  return (
    <div className="flex flex-wrap gap-3">
      <Field label="Tab width">
        {(id) => (
          <NumberInput
            id={id}
            value={s.tabSize}
            min={1}
            max={16}
            onValueChange={(v) => update({ tabSize: v })}
          />
        )}
      </Field>
    </div>
  );
}

/** The operations, grouped (spec §9.1); each is one undo step. */
export function OpsPanel(props: OpsPanelProps) {
  const { ops, onRun } = props;
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-md font-semibold text-fg">
        Operations
      </h2>
      {GROUPS.map((group) => (
        <div
          key={group}
          role="group"
          aria-label={group}
          className="flex flex-col gap-2"
        >
          <h3 className="text-sm font-medium text-fg-muted">{group}</h3>
          <div className="flex flex-wrap gap-2">
            {ops
              .filter((o) => o.group === group)
              .map((o) => (
                <Button
                  key={o.id}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onRun(o)}
                >
                  {o.label}
                </Button>
              ))}
          </div>
          {group === 'Lines' ? (
            <LineOptions {...props} />
          ) : (
            <OtherOptions
              group={group}
              settings={props.settings}
              update={props.update}
            />
          )}
        </div>
      ))}
    </section>
  );
}
