import {
  Badge,
  Button,
  Grid,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Switch,
} from '@arshad-shah/cynosure';
import { sliders } from '@arshad-shah/cynosure/icons';
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

const SWITCHES: { key: (typeof MENU_KEYS)[number]; label: string }[] = [
  { key: 'ignoreWhitespace', label: 'Ignore whitespace' },
  { key: 'ignoreCase', label: 'Ignore case' },
  { key: 'ignoreBlankLines', label: 'Ignore blank lines' },
  { key: 'trimTrailing', label: 'Trim trailing whitespace' },
  { key: 'syntaxHighlighting', label: 'Syntax colours' },
];

/**
 * Granularity, context and normalisation behind the Options button
 * (persisted), which says how many are changed. The view (split, unified,
 * inline) is on the Differences card.
 */
export function DiffOptions({ settings: s, update }: DiffOptionsProps) {
  const changed = MENU_KEYS.filter(
    (k) => s[k] !== DIFF_SETTINGS_DEFAULTS[k],
  ).length;
  return (
    <Popover
      label="Diff options"
      trigger={(props) => (
        <Button {...props} size="sm" variant="soft" icon={sliders}>
          Options
          {changed ? (
            <Badge size="sm" tone="accent">
              {changed}
            </Badge>
          ) : null}
        </Button>
      )}
    >
      <Stack gap="4">
        <Grid columns={2} gap="4">
          <Select
            label="Compare by"
            size="sm"
            value={s.granularity}
            onChange={(v) =>
              update({ granularity: v as DiffSettings['granularity'] })
            }
            options={[
              { value: 'line', label: 'Line' },
              { value: 'word', label: 'Word' },
              { value: 'char', label: 'Character' },
            ]}
          />
          <Select
            label="Context lines"
            size="sm"
            value={String(s.context)}
            onChange={(v) =>
              update({
                context: v === 'all' ? 'all' : (Number(v) as DiffContext),
              })
            }
            options={CONTEXTS.map((c) => ({
              value: String(c),
              label: c === 'all' ? 'All' : String(c),
            }))}
          />
        </Grid>
        {SWITCHES.map(({ key, label }) => (
          <Switch
            key={key}
            label={label}
            checked={s[key] as boolean}
            onChange={(v) => update({ [key]: v })}
          />
        ))}
      </Stack>
    </Popover>
  );
}

/** Split, unified or inline: the Differences card's view. */
export function ViewControl({ settings: s, update }: DiffOptionsProps) {
  return (
    <SegmentedControl
      size="sm"
      label="View"
      value={s.view}
      onChange={(view) => update({ view: view as DiffView })}
      options={[
        { value: 'split', label: 'Split' },
        { value: 'unified', label: 'Unified' },
        { value: 'inline', label: 'Inline' },
      ]}
    />
  );
}
