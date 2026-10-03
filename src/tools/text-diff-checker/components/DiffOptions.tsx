import {
  Label,
  OptionsMenu,
  SegmentedControl,
  Select,
  Stack,
  SwitchField,
} from '@/shared/ui';
import {
  DIFF_SETTINGS_DEFAULTS,
  type DiffContext,
  type DiffSettings,
  type DiffView,
} from '../settings';

interface DiffOptionsProps {
  settings: DiffSettings;
  update(patch: Partial<DiffSettings>): void;
}

const CONTEXTS: DiffContext[] = [0, 3, 5, 10, 'all'];

const MENU_KEYS = [
  'granularity',
  'context',
  'ignoreWhitespace',
  'ignoreCase',
  'ignoreBlankLines',
  'trimTrailing',
  'syntaxHighlighting',
] as const satisfies readonly (keyof DiffSettings)[];

/**
 * The view up front; granularity, context and normalisation behind the
 * Options button (persisted).
 */
export function DiffOptions({ settings: s, update }: DiffOptionsProps) {
  const changed = MENU_KEYS.filter(
    (k) => s[k] !== DIFF_SETTINGS_DEFAULTS[k],
  ).length;
  return (
    <>
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
      <OptionsMenu title="Diff options" changed={changed}>
        <div className="grid grid-cols-2 gap-3">
          <Stack gap="1">
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
          </Stack>
          <Stack gap="1">
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
          </Stack>
        </div>
        <SwitchField
          label="Ignore whitespace"
          checked={s.ignoreWhitespace}
          onCheckedChange={(ignoreWhitespace) => update({ ignoreWhitespace })}
        />
        <SwitchField
          label="Ignore case"
          checked={s.ignoreCase}
          onCheckedChange={(ignoreCase) => update({ ignoreCase })}
        />
        <SwitchField
          label="Ignore blank lines"
          checked={s.ignoreBlankLines}
          onCheckedChange={(ignoreBlankLines) => update({ ignoreBlankLines })}
        />
        <SwitchField
          label="Trim trailing whitespace"
          checked={s.trimTrailing}
          onCheckedChange={(trimTrailing) => update({ trimTrailing })}
        />
        <SwitchField
          label="Syntax colours"
          checked={s.syntaxHighlighting}
          onCheckedChange={(syntaxHighlighting) =>
            update({ syntaxHighlighting })
          }
        />
      </OptionsMenu>
    </>
  );
}
