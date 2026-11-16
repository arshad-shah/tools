import {
  Stack,
  Switch,
  Table,
  Text,
  type TableColumn,
} from '@arshad-shah/cynosure';
import { useState, type ReactNode } from 'react';

/** The rows a chart draws, as the table that is its accessible twin. */
export interface ChartTableData<Row> {
  caption: string;
  columns: TableColumn<Row>[];
  rows: readonly Row[];
  getRowId(row: Row): string;
}

export interface ChartFrameProps<Row> {
  /** The swift-chart component (the drawing surface). */
  children: ReactNode;
  table: ChartTableData<Row>;
  /** Rows shown in the table at most. Default 500. */
  maxRows?: number;
}

/**
 * A chart with its data table: a Cynosure Switch shows the same numbers as
 * a Cynosure Table, the accessible alternative to the canvas (swift-chart
 * names the canvas and announces updates, but has no table of its own).
 */
export function ChartFrame<Row>({
  children,
  table,
  maxRows = 500,
}: ChartFrameProps<Row>) {
  const [show, setShow] = useState(false);
  const rows = table.rows.slice(0, maxRows);
  return (
    <Stack gap="3">
      {children}
      <Switch
        size="sm"
        label="Show the data as a table"
        checked={show}
        onChange={setShow}
      />
      {show ? (
        <Stack gap="2">
          <Table<Row>
            caption={table.caption}
            size="sm"
            columns={table.columns}
            rows={rows}
            getRowId={table.getRowId}
            stickyHeader
          />
          {table.rows.length > rows.length ? (
            <Text size="xs" tone="muted">
              {`The first ${rows.length.toLocaleString('en-US')} of ${table.rows.length.toLocaleString('en-US')} rows.`}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
