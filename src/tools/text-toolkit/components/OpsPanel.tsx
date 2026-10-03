import { useId, type ReactNode } from 'react';
import {
  Button,
  Heading,
  Inline,
  Input,
  Label,
  NumberInput,
  OptionsMenu,
  Select,
  Stack,
  SwitchField,
} from '@/shared/ui';
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
    <Stack gap="1" className="min-w-0">
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
    </Stack>
  );
}

function LineOptions({
  settings: s,
  update,
  filter,
  onFilter,
}: Omit<OpsPanelProps, 'ops' | 'onRun'>) {
  return (
    <Stack gap="3">
      <Stack gap="2">
        <SwitchField
          label="Duplicates ignore case"
          checked={s.dedupeCaseInsensitive}
          onCheckedChange={(v) => update({ dedupeCaseInsensitive: v })}
        />
        <SwitchField
          label="Filter removes matches"
          checked={s.filterInvert}
          onCheckedChange={(v) => update({ filterInvert: v })}
        />
      </Stack>
      <div className="grid grid-cols-2 gap-3">
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
    </Stack>
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
      <Inline gap="3" wrap align="start">
        <Field label="Slug separator">
          {(id) => (
            <Input
              id={id}
              value={s.slugSep}
              onChange={(v) => update({ slugSep: v })}
            />
          )}
        </Field>
      </Inline>
    );
  return (
    <Inline gap="3" wrap align="start">
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
    </Inline>
  );
}

/** The operations, grouped (spec §9.1); each is one undo step. */
export function OpsPanel(props: OpsPanelProps) {
  const { ops, onRun } = props;
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <Heading level={2} size="md" id={headingId}>
        Operations
      </Heading>
      {GROUPS.map((group) => (
        <Stack key={group} gap="2" role="group" aria-label={group}>
          <Inline justify="between" align="center" gap="2">
            <Heading level={3} size="sm" className="text-fg-muted">
              {group}
            </Heading>
            <OptionsMenu
              variant="ghost"
              label={`${group} options`}
              title={`${group} options`}
              width={group === 'Lines' ? 'w-96' : 'w-64'}
            >
              {group === 'Lines' ? (
                <LineOptions {...props} />
              ) : (
                <OtherOptions
                  group={group}
                  settings={props.settings}
                  update={props.update}
                />
              )}
            </OptionsMenu>
          </Inline>
          <Inline gap="2" wrap>
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
          </Inline>
        </Stack>
      ))}
    </section>
  );
}
