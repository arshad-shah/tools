import {
  Button,
  Card,
  Grid,
  Inline,
  NumberField,
  Select,
  Stack,
  Switch,
  TextField,
} from '@arshad-shah/cynosure';
import type { ReactNode } from 'react';
import type { TextOp } from '../lib/ops';
import type { ToolkitSettings } from '../settings';

export interface OpsPanelProps {
  ops: TextOp[];
  /** The chosen operation's id. */
  selected: string;
  onSelect(id: string): void;
  onRun(op: TextOp): void;
  settings: ToolkitSettings;
  update(patch: Partial<ToolkitSettings>): void;
  filter: string;
  onFilter(text: string): void;
}

type OptionsProps = Omit<
  OpsPanelProps,
  'ops' | 'selected' | 'onSelect' | 'onRun'
>;

/** The options one operation reads, shown only while it is chosen. */
function OpOptions({
  id,
  settings: s,
  update,
  filter,
  onFilter,
}: OptionsProps & { id: string }): ReactNode {
  const fields = (children: ReactNode) => (
    <Grid minItemWidth="10rem" gap="3">
      {children}
    </Grid>
  );
  switch (id) {
    case 'case-slug':
      return fields(
        <TextField
          label="Slug separator"
          value={s.slugSep}
          onChange={(v) => update({ slugSep: v })}
        />,
      );
    case 'lines-dedupe':
      return (
        <Stack gap="3">
          {fields(
            <Select
              label="Keep duplicate"
              value={s.dedupeKeep}
              onChange={(v) => update({ dedupeKeep: v as 'first' | 'last' })}
              options={[
                { value: 'first', label: 'First' },
                { value: 'last', label: 'Last' },
              ]}
            />,
          )}
          <Switch
            label="Duplicates ignore case"
            checked={s.dedupeCaseInsensitive}
            onChange={(v) => update({ dedupeCaseInsensitive: v })}
          />
        </Stack>
      );
    case 'lines-number':
      return fields(
        <>
          <NumberField
            label="Number from"
            value={s.numberStart}
            onChange={(v) => v !== null && update({ numberStart: v })}
          />
          <TextField
            label="Number separator"
            value={s.numberSep}
            onChange={(v) => update({ numberSep: v })}
          />
        </>,
      );
    case 'lines-affix':
      return fields(
        <>
          <TextField
            label="Prefix"
            value={s.prefix}
            onChange={(v) => update({ prefix: v })}
          />
          <TextField
            label="Suffix"
            value={s.suffix}
            onChange={(v) => update({ suffix: v })}
          />
        </>,
      );
    case 'lines-join':
      return fields(
        <TextField
          label="Join with"
          value={s.joinSep}
          onChange={(v) => update({ joinSep: v })}
        />,
      );
    case 'lines-split':
      return fields(
        <TextField
          label="Split on"
          value={s.splitSep}
          onChange={(v) => update({ splitSep: v })}
        />,
      );
    case 'lines-filter':
      return (
        <Stack gap="3">
          {fields(
            <TextField
              label="Filter text"
              value={filter}
              onChange={onFilter}
            />,
          )}
          <Switch
            label="Filter removes matches"
            checked={s.filterInvert}
            onChange={(v) => update({ filterInvert: v })}
          />
        </Stack>
      );
    case 'clean-tabs-to-spaces':
    case 'clean-spaces-to-tabs':
      return fields(
        <NumberField
          label="Tab width"
          value={s.tabSize}
          min={1}
          max={16}
          onChange={(v) => v !== null && update({ tabSize: v })}
        />,
      );
    default:
      return null;
  }
}

/**
 * One operation at a time: pick it (grouped by case, lines and clean-up),
 * set the few options it reads, and apply it as one undo step. Every
 * operation is also a Mod+K command.
 */
export function OpsPanel(props: OpsPanelProps) {
  const { ops, selected, onSelect, onRun } = props;
  const op = ops.find((o) => o.id === selected) ?? ops[0]!;
  return (
    <Card as="section" title="Operations">
      <Stack gap="4">
        <Inline gap="3" align="end" wrap={false}>
          <Stack grow minSize="0">
            <Select
              label="Operation"
              value={op.id}
              onChange={onSelect}
              options={ops.map((o) => ({
                value: o.id,
                label: o.label,
                group: o.group,
              }))}
            />
          </Stack>
          <Button variant="solid" tone="accent" onClick={() => onRun(op)}>
            Apply
          </Button>
        </Inline>
        <OpOptions id={op.id} {...props} />
      </Stack>
    </Card>
  );
}
