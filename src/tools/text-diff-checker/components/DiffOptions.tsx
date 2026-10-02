import { Inline, Label, SegmentedControl, Select, Switch } from '@/shared/ui';
import type { DiffContext, DiffSettings, DiffView } from '../settings';

interface DiffOptionsProps {
  settings: DiffSettings;
  update(patch: Partial<DiffSettings>): void;
}

const CONTEXTS: DiffContext[] = [0, 3, 5, 10, 'all'];

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange(v: boolean): void;
}) {
  return (
    <Inline gap="2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </Inline>
  );
}

/** View, granularity, context and normalisation options (persisted). */
export function DiffOptions({ settings: s, update }: DiffOptionsProps) {
  return (
    <Inline gap="4" className="flex-wrap items-center">
      <SegmentedControl<DiffView>
        size="sm"
        label="View"
        value={s.view}
        onChange={(view) => update({ view })}
        options={[
          { value: 'split', label: 'Split' },
          { value: 'unified', label: 'Unified' },
          { value: 'inline', label: 'Inline' },
        ]}
      />
      <Inline gap="2">
        <Label htmlFor="diff-granularity">Compare by</Label>
        <Select
          id="diff-granularity"
          value={s.granularity}
          onValueChange={(v) =>
            update({ granularity: v as DiffSettings['granularity'] })
          }
          items={[
            { value: 'line', label: 'Line' },
            { value: 'word', label: 'Word' },
            { value: 'char', label: 'Character' },
          ]}
        />
      </Inline>
      <Inline gap="2">
        <Label htmlFor="diff-context">Context lines</Label>
        <Select
          id="diff-context"
          value={String(s.context)}
          onValueChange={(v) =>
            update({
              context: v === 'all' ? 'all' : (Number(v) as DiffContext),
            })
          }
          items={CONTEXTS.map((c) => ({
            value: String(c),
            label: c === 'all' ? 'All' : String(c),
          }))}
        />
      </Inline>
      <Toggle
        id="diff-ws"
        label="Ignore whitespace"
        checked={s.ignoreWhitespace}
        onChange={(ignoreWhitespace) => update({ ignoreWhitespace })}
      />
      <Toggle
        id="diff-case"
        label="Ignore case"
        checked={s.ignoreCase}
        onChange={(ignoreCase) => update({ ignoreCase })}
      />
      <Toggle
        id="diff-blank"
        label="Ignore blank lines"
        checked={s.ignoreBlankLines}
        onChange={(ignoreBlankLines) => update({ ignoreBlankLines })}
      />
      <Toggle
        id="diff-trailing"
        label="Trim trailing whitespace"
        checked={s.trimTrailing}
        onChange={(trimTrailing) => update({ trimTrailing })}
      />
      <Toggle
        id="diff-syntax"
        label="Syntax colours"
        checked={s.syntaxHighlighting}
        onChange={(syntaxHighlighting) => update({ syntaxHighlighting })}
      />
    </Inline>
  );
}
