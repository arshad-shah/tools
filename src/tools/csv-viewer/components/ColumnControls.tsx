import React from 'react';
import { IconDownload } from '@/shared/ui/icons';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { ROWS_PER_PAGE_OPTIONS } from '../lib/table';

interface ColumnControlsProps {
  columns: string[];
  totalRows: number;
  filteredRows: number;
  filterColumn: string;
  onFilterColumnChange: (column: string) => void;
  filterValue: string;
  onFilterValueChange: (value: string) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  selectedColumns: string[];
  onToggleColumn: (column: string) => void;
  onToggleAllColumns: () => void;
  onExport: () => void;
}

/** Filter/rows-per-page/export card plus the column visibility toggles. */
export const ColumnControls: React.FC<ColumnControlsProps> = ({
  columns,
  totalRows,
  filteredRows,
  filterColumn,
  onFilterColumnChange,
  filterValue,
  onFilterValueChange,
  rowsPerPage,
  onRowsPerPageChange,
  selectedColumns,
  onToggleColumn,
  onToggleAllColumns,
  onExport,
}) => {
  const filterColumnItems = [
    { value: '', label: 'Select column' },
    ...columns.map((c) => ({ value: c, label: c })),
  ];

  return (
    <>
      <Card>
        <CardBody>
          <Stack gap="3">
            <Grid max={3} gap="3">
              <Stack gap="2">
                <Label>Filter column</Label>
                <Select
                  value={filterColumn}
                  onValueChange={onFilterColumnChange}
                  items={filterColumnItems}
                  aria-label="Filter column"
                />
              </Stack>
              <Stack gap="2">
                <Label htmlFor="filter-value">Filter value</Label>
                <Input
                  id="filter-value"
                  value={filterValue}
                  onChange={onFilterValueChange}
                  placeholder="Enter filter value"
                  disabled={!filterColumn}
                />
              </Stack>
              <Stack gap="2">
                <Label>Rows per page</Label>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(v) => onRowsPerPageChange(Number(v))}
                  items={ROWS_PER_PAGE_OPTIONS}
                  aria-label="Rows per page"
                />
              </Stack>
            </Grid>
            <Inline justify="between" align="center" wrap gap="3">
              <Text size="sm" tone="subtle">
                {filteredRows === totalRows
                  ? `Showing all ${totalRows} rows`
                  : `Showing ${filteredRows} of ${totalRows} rows`}
              </Text>
              <Inline gap="2" wrap>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onToggleAllColumns}
                >
                  {selectedColumns.length === columns.length
                    ? 'Hide all columns'
                    : 'Show all columns'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<IconDownload size="sm" />}
                  disabled={filteredRows === 0}
                  onClick={onExport}
                >
                  Export
                </Button>
              </Inline>
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h4">Column visibility</CardTitle>
        </CardHeader>
        <CardBody>
          <Inline gap="2" wrap>
            {columns.map((col) => {
              const selected = selectedColumns.includes(col);
              return (
                <Button
                  key={col}
                  variant={selected ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => onToggleColumn(col)}
                >
                  {col}
                </Button>
              );
            })}
          </Inline>
        </CardBody>
      </Card>
    </>
  );
};
