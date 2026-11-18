import { Button, Inline, Select } from '@arshad-shah/cynosure';
import { alert, compare, plus } from '@arshad-shah/cynosure/icons';
import { formatOptions } from '../lib/format-ref';
import type { LogColumn, SavedFormat } from '../settings';
import { ColumnMenu } from './ColumnMenu';

export interface ViewToolbarProps {
  format: string;
  onFormat(id: string): void;
  customFormats: readonly SavedFormat[];
  onNewFormat(): void;
  wrap: boolean;
  onWrap(wrap: boolean): void;
  columns: readonly LogColumn[];
  onColumns(columns: LogColumn[]): void;
  hasLog: boolean;
  onNextError(): void;
  selectedCount: number;
  onCompare(): void;
}

/**
 * The format (with New custom format at the foot of its list), the View
 * menu (columns, wrap), then Compare selected once a line is ticked and
 * Next error.
 */
export function ViewToolbar({
  format,
  onFormat,
  customFormats,
  onNewFormat,
  wrap,
  onWrap,
  columns,
  onColumns,
  hasLog,
  onNextError,
  selectedCount,
  onCompare,
}: ViewToolbarProps) {
  const { items, groups } = formatOptions(customFormats);
  const options = [
    ...items,
    ...groups.flatMap((g) =>
      g.items.map((i) => ({
        value: i.value,
        label: String(i.label),
        group: g.label,
      })),
    ),
  ];
  return (
    <Inline gap="3" align="center" justify="between" wrap>
      <Inline gap="2" align="center" wrap>
        <Select
          label="Log format"
          labelHidden
          size="sm"
          value={format}
          onChange={onFormat}
          options={options}
          footer={{
            label: 'New custom format',
            icon: plus,
            onSelect: onNewFormat,
          }}
        />
        <ColumnMenu
          columns={columns}
          onColumns={onColumns}
          wrap={wrap}
          onWrap={onWrap}
        />
      </Inline>
      <Inline gap="2" align="center" wrap>
        {selectedCount > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            icon={compare}
            disabled={selectedCount !== 2}
            onClick={onCompare}
          >
            {`Compare selected (${selectedCount} of 2)`}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="soft"
          icon={alert}
          disabled={!hasLog}
          aria-keyshortcuts="e"
          onClick={onNextError}
        >
          Next error
        </Button>
      </Inline>
    </Inline>
  );
}
