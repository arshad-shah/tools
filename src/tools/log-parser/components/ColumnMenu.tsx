import { Button, Menu } from '@arshad-shah/cynosure';
import { columns as columnsIcon } from '@arshad-shah/cynosure/icons';
import { LOG_COLUMNS, type LogColumn } from '../settings';

const COLUMN_LABEL: Record<LogColumn, string> = {
  line: 'Line number',
  time: 'Time',
  level: 'Level',
  component: 'Component',
};

const WRAP = 'wrap';

export interface ColumnMenuProps {
  columns: readonly LogColumn[];
  onColumns(columns: LogColumn[]): void;
  wrap: boolean;
  onWrap(wrap: boolean): void;
}

/**
 * How the entries look (persisted in settings): which summary columns the
 * rows show, and whether long lines wrap.
 */
export function ColumnMenu({
  columns,
  onColumns,
  wrap,
  onWrap,
}: ColumnMenuProps) {
  return (
    <Menu
      label="View"
      items={[
        {
          label: 'Columns',
          items: LOG_COLUMNS.map((c) => ({
            value: c,
            label: COLUMN_LABEL[c],
            kind: 'checkbox' as const,
            checked: columns.includes(c),
            keepOpen: true,
          })),
        },
        {
          items: [
            {
              value: WRAP,
              label: 'Wrap lines',
              kind: 'checkbox' as const,
              checked: wrap,
              keepOpen: true,
            },
          ],
        },
      ]}
      onSelect={(v) => {
        if (v === WRAP) return onWrap(!wrap);
        const c = v as LogColumn;
        const on = !columns.includes(c);
        onColumns(
          LOG_COLUMNS.filter((x) => (x === c ? on : columns.includes(x))),
        );
      }}
      trigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={columnsIcon}>
          View
        </Button>
      )}
    />
  );
}
