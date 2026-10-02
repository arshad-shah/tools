import { useId } from 'react';
import {
  Alert,
  Badge,
  Button,
  Grid,
  IconButton,
  Inline,
  Input,
  SearchInput,
  Stack,
  StatusDot,
  SwitchField,
} from '@/shared/ui';
import { IconX } from '@/shared/ui/icons';
import { cn } from '@/shared/lib/cn';
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

/** Level chips, search, exclude and component filters, active chips. */
export function FilterBar({
  filter,
  onChange,
  levels,
  searchError,
}: FilterBarProps) {
  const errorId = useId();
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
              variant={on ? 'secondary' : 'ghost'}
              aria-pressed={on}
              onClick={() => toggleLevel(l)}
            >
              <StatusDot tone={levelTone(l)} decorative />
              {levelLabel(l)}
              <span className="font-mono tabular-nums">
                {(levels[l] ?? 0).toLocaleString('en-US')}
              </span>
            </Button>
          );
        })}
      </Inline>
      <Grid cols={{ base: 1, md: 3 }} gap="3">
        <Stack gap="1">
          <Inline gap="2" wrap={false}>
            <SearchInput
              className="flex-1"
              prompt="/"
              aria-label="Search entries"
              aria-invalid={searchError ? true : undefined}
              aria-describedby={searchError ? errorId : undefined}
              placeholder={text.regex ? 'Regular expression' : 'Search text'}
              value={text.value}
              onChange={(value) => set({ text: { ...text, value } })}
            />
            <SwitchField
              label="Regex"
              checked={text.regex}
              onCheckedChange={(regex) => set({ text: { ...text, regex } })}
            />
          </Inline>
          {searchError ? (
            <Alert status="danger" size="sm" id={errorId}>
              Invalid regex: {searchError}
            </Alert>
          ) : null}
        </Stack>
        <Input
          aria-label="Exclude terms"
          placeholder="Exclude terms, comma separated"
          clearable
          value={filter.exclude.join(',')}
          onChange={(v) => set({ exclude: v.split(',') })}
        />
        <Input
          aria-label="Component"
          placeholder="Component"
          clearable
          value={filter.component ?? ''}
          onChange={(v) => set({ component: v || undefined })}
        />
      </Grid>
      <ActiveChips filter={filter} onChange={onChange} />
    </Stack>
  );
}

function Chip({
  label,
  onRemove,
  className,
}: {
  label: string;
  onRemove(): void;
  className?: string;
}) {
  return (
    <Badge
      variant="soft"
      tone="neutral"
      size="sm"
      className={cn('gap-1 pr-0.5', className)}
    >
      <span>{label}</span>
      <IconButton
        size="sm"
        variant="ghost"
        className="size-5"
        label={`Remove filter ${label}`}
        icon={IconX}
        onClick={onRemove}
      />
    </Badge>
  );
}

/** The field and time filters in effect, each removable. */
function ActiveChips({
  filter,
  onChange,
}: Pick<FilterBarProps, 'filter' | 'onChange'>) {
  if (filter.fields.length === 0 && !filter.range) return null;
  return (
    <ul aria-label="Active filters" className="flex flex-wrap gap-2">
      {filter.fields.map((f, i) => (
        <li key={`${f.mode}:${f.key}=${f.value}`}>
          <Chip
            label={fieldLabel(f)}
            onRemove={() =>
              onChange({
                ...filter,
                fields: filter.fields.filter((_, j) => j !== i),
              })
            }
          />
        </li>
      ))}
      {filter.range ? (
        <li>
          <Chip
            label={`time ${rowTime(filter.range[0])} to ${rowTime(filter.range[1])}`}
            onRemove={() => onChange({ ...filter, range: undefined })}
          />
        </li>
      ) : null}
    </ul>
  );
}
