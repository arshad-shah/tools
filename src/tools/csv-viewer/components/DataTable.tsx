import React from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
} from '@/shared/ui/icons';

import {
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/shared/ui';
import type { ParsedData, SortDirection } from '../types';

interface DataTableProps {
  columns: string[];
  rows: ParsedData[];
  sortColumn: string;
  sortDirection: SortDirection;
  onSort: (column: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** The visible page of rows with sortable headers and pagination. */
export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  sortColumn,
  sortDirection,
  onSort,
  page,
  totalPages,
  onPageChange,
}) => (
  <Card>
    <CardBody>
      <Box className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col}
                  onClick={() => onSort(col)}
                  className="cursor-pointer"
                >
                  <Inline gap="1" align="center" wrap={false}>
                    <span>{col}</span>
                    {sortColumn === col &&
                      (sortDirection === 'asc' ? (
                        <IconArrowUp size="xs" label="Sorted ascending" />
                      ) : (
                        <IconArrowDown size="xs" label="Sorted descending" />
                      ))}
                  </Inline>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map((col) => {
                    const v = row[col];
                    const display =
                      v === null || v === undefined ? '' : String(v);
                    return (
                      <TableCell key={`${idx}-${col}`}>{display}</TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Text size="sm" tone="subtle" className="text-center">
                    No matching data found
                  </Text>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <Inline justify="between" align="center" className="pt-3" wrap gap="2">
        <Text size="sm" tone="subtle">
          Page {page} of {totalPages}
        </Text>
        <Inline gap="2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconChevronLeft size="sm" />}
            disabled={page === 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<IconChevronRight size="sm" />}
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            Next
          </Button>
        </Inline>
      </Inline>
    </CardBody>
  </Card>
);
