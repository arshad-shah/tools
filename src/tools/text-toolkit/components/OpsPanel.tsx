import {
  Button,
  Card,
  Grid,
  Inline,
  NumberField,
  Popover,
  Select,
  Stack,
  Switch,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { settings as settingsIcon } from '@arshad-shah/cynosure/icons';
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

function LineOptions({
  settings: s,
  update,
  filter,
  onFilter,
}: Omit<OpsPanelProps, 'ops' | 'onRun'>) {
  return (
    <Stack gap="4">
      <Stack gap="3">
        <Switch
          label="Duplicates ignore case"
          checked={s.dedupeCaseInsensitive}
          onChange={(v) => update({ dedupeCaseInsensitive: v })}
        />
        <Switch
          label="Filter removes matches"
          checked={s.filterInvert}
          onChange={(v) => update({ filterInvert: v })}
        />
      </Stack>
      <Grid columns={2} gap="3">
        <Select
          label="Keep duplicate"
          size="sm"
          value={s.dedupeKeep}
          onChange={(v) => update({ dedupeKeep: v as 'first' | 'last' })}
          options={[
            { value: 'first', label: 'First' },
            { value: 'last', label: 'Last' },
          ]}
        />
        <NumberField
          label="Number from"
          size="sm"
          value={s.numberStart}
          onChange={(v) => v !== null && update({ numberStart: v })}
        />
        <TextField
          label="Number separator"
          size="sm"
          value={s.numberSep}
          onChange={(v) => update({ numberSep: v })}
        />
        <TextField
          label="Prefix"
          size="sm"
          value={s.prefix}
          onChange={(v) => update({ prefix: v })}
        />
        <TextField
          label="Suffix"
          size="sm"
          value={s.suffix}
          onChange={(v) => update({ suffix: v })}
        />
        <TextField
          label="Join with"
          size="sm"
          value={s.joinSep}
          onChange={(v) => update({ joinSep: v })}
        />
        <TextField
          label="Split on"
          size="sm"
          value={s.splitSep}
          onChange={(v) => update({ splitSep: v })}
        />
        <TextField
          label="Filter text"
          size="sm"
          value={filter}
          onChange={onFilter}
        />
      </Grid>
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
  return group === 'Case' ? (
    <TextField
      label="Slug separator"
      size="sm"
      value={s.slugSep}
      onChange={(v) => update({ slugSep: v })}
    />
  ) : (
    <NumberField
      label="Tab width"
      size="sm"
      value={s.tabSize}
      min={1}
      max={16}
      onChange={(v) => v !== null && update({ tabSize: v })}
    />
  );
}

/** The operations, grouped; each is one undo step. */
export function OpsPanel(props: OpsPanelProps) {
  const { ops, onRun } = props;
  return (
    <Card as="section" title="Operations">
      <Stack gap="5">
        {GROUPS.map((group) => (
          <Stack key={group} gap="3" role="group" aria-label={group}>
            <Inline justify="between" align="center" gap="2">
              <Text variant="eyebrow" tone="muted">
                {group}
              </Text>
              <Popover
                label={`${group} options`}
                size={group === 'Lines' ? 'lg' : 'sm'}
                trigger={(p) => (
                  <Button {...p} size="sm" variant="ghost" icon={settingsIcon}>
                    {`${group} options`}
                  </Button>
                )}
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
              </Popover>
            </Inline>
            <Inline gap="2" wrap>
              {ops
                .filter((o) => o.group === group)
                .map((o) => (
                  <Button
                    key={o.id}
                    size="sm"
                    variant="soft"
                    onClick={() => onRun(o)}
                  >
                    {o.label}
                  </Button>
                ))}
            </Inline>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
