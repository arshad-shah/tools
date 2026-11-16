import { Button, Menu } from '@arshad-shah/cynosure';
import { columns as columnsIcon } from '@arshad-shah/cynosure/icons';
import { LOG_COLUMNS, type LogColumn } from '../settings';

const COLUMN_LABEL: Record<LogColumn, string> = {
  line: 'Line number',
  time: 'Time',
  level: 'Level',
  component: 'Component',
};

export interface ColumnMenuProps {
  columns: readonly LogColumn[];
  onColumns(columns: LogColumn[]): void;
}

/** Which summary columns the entry rows show (persisted in settings). */
export function ColumnMenu({ columns, onColumns }: ColumnMenuProps) {
  return (
    <Menu
      label="Columns"
      items={LOG_COLUMNS.map((c) => ({
        value: c,
        label: COLUMN_LABEL[c],
        kind: 'checkbox' as const,
        checked: columns.includes(c),
        keepOpen: true,
      }))}
      onSelect={(v) => {
        const c = v as LogColumn;
        const on = !columns.includes(c);
        onColumns(
          LOG_COLUMNS.filter((x) => (x === c ? on : columns.includes(x))),
        );
      }}
      trigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={columnsIcon}>
          Columns
        </Button>
      )}
    />
  );
}
