import {
  Badge,
  Button,
  Inline,
  Popover,
  SearchField,
  Stack,
  Switch,
  TextField,
} from '@arshad-shah/cynosure';
import { filter as filterIcon } from '@arshad-shah/cynosure/icons';
import type { FieldFilter, LogFilter } from '../lib/filter';
import { levelLabel, levelTone, orderLevels } from '../lib/level-style';
import { rowTime } from '../lib/progress';

export interface FilterBarProps {
  filter: LogFilter;
  onChange(next: LogFilter): void;
  /** Whole-log counts per level (the chips). */
  levels: Record<string, number>;
  searchError: string | null;
}

const fieldLabel = (f: FieldFilter) =>
  `${f.mode === 'include' ? '' : 'not '}${f.key}=${f.value}`;

/**
 * Level toggles, search (with Regex), the rarer exclude and component
 * filters behind More filters, and the active chips.
 */
export function FilterBar({
  filter,
  onChange,
  levels,
  searchError,
}: FilterBarProps) {
  const set = (patch: Partial<LogFilter>) => onChange({ ...filter, ...patch });
  const toggleLevel = (l: string) => {
    const next = new Set(filter.levels);
    if (next.has(l)) next.delete(l);
    else next.add(l);
    set({ levels: next });
  };
  const text = filter.text ?? { value: '', regex: false };

  return (
    <Stack gap="3">
      <Inline gap="2" wrap role="group" aria-label="Levels">
        {orderLevels(levels).map((l) => {
          const on = filter.levels.has(l);
          return (
            <Button
              key={l}
              size="sm"
              variant={on ? 'soft' : 'ghost'}
              pressed={on}
              onClick={() => toggleLevel(l)}
            >
              {levelLabel(l)}
              <Badge size="sm" tone={levelTone(l)} dot>
                {(levels[l] ?? 0).toLocaleString('en-US')}
              </Badge>
            </Button>
          );
        })}
      </Inline>
      <Inline gap="3" align="start" wrap={false}>
        <Stack grow minSize="0">
          <SearchField
            size="sm"
            label="Search entries"
            labelHidden
            placeholder={text.regex ? 'Regular expression' : 'Search text'}
            value={text.value}
            onChange={(value) => set({ text: { ...text, value } })}
            error={searchError ? `Invalid regex: ${searchError}` : undefined}
          />
        </Stack>
        <Switch
          size="sm"
          label="Regex"
          checked={text.regex}
          onChange={(regex) => set({ text: { ...text, regex } })}
        />
        <MoreFilters filter={filter} set={set} />
      </Inline>
      <ActiveChips filter={filter} onChange={onChange} />
    </Stack>
  );
}

function MoreFilters({
  filter,
  set,
}: {
  filter: LogFilter;
  set(patch: Partial<LogFilter>): void;
}) {
  const active =
    (filter.exclude.some((t) => t.trim()) ? 1 : 0) + (filter.component ? 1 : 0);
  return (
    <Popover
      label="More filters"
      trigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={filterIcon}>
          Filters
          {active ? (
            <Badge size="sm" tone="accent">
              {active}
            </Badge>
          ) : null}
        </Button>
      )}
    >
      <Stack gap="4">
        <TextField
          label="Exclude terms"
          description="Comma separated."
          clearable
          value={filter.exclude.join(',')}
          onChange={(v) => set({ exclude: v.split(',') })}
        />
        <TextField
          label="Component"
          clearable
          value={filter.component ?? ''}
          onChange={(v) => set({ component: v || undefined })}
        />
      </Stack>
    </Popover>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove(): void }) {
  return (
    <Inline role="listitem">
      <Badge
        tone="accent"
        onRemove={onRemove}
        labels={{ remove: `Remove filter ${label}` }}
      >
        {label}
      </Badge>
    </Inline>
  );
}

/** The field and time filters in effect, each removable. */
function ActiveChips({
  filter,
  onChange,
}: Pick<FilterBarProps, 'filter' | 'onChange'>) {
  if (filter.fields.length === 0 && !filter.range) return null;
  return (
    <Inline gap="2" wrap role="list" aria-label="Active filters">
      {filter.fields.map((f, i) => (
        <Chip
          key={`${f.mode}:${f.key}=${f.value}`}
          label={fieldLabel(f)}
          onRemove={() =>
            onChange({
              ...filter,
              fields: filter.fields.filter((_, j) => j !== i),
            })
          }
        />
      ))}
      {filter.range ? (
        <Chip
          label={`time ${rowTime(filter.range[0])} to ${rowTime(filter.range[1])}`}
          onRemove={() => onChange({ ...filter, range: undefined })}
        />
      ) : null}
    </Inline>
  );
}
