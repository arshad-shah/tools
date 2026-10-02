import React from 'react';
import { IconTrendingUp } from '@/shared/ui/icons';

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Inline,
  Label,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import type { ChartPoint } from '../types';
import { CHART_ROW_LIMIT } from '../lib/table';
import { LineChart } from './LineChart';

interface ChartPanelProps {
  numericColumns: string[];
  column: string;
  onColumnChange: (column: string) => void;
  data: ChartPoint[];
  /** Rows left after filtering. */
  rowCount: number;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({
  numericColumns,
  column,
  onColumnChange,
  data,
  rowCount,
}) => (
  <Stack gap="4" className="pt-4">
    {numericColumns.length > 0 ? (
      <Card>
        <CardHeader>
          <Inline justify="between" align="center" wrap gap="3">
            <CardTitle as="h4">Data visualisation</CardTitle>
            <Inline align="center" gap="2">
              <Label>Column:</Label>
              <Select
                value={column}
                onValueChange={onColumnChange}
                items={numericColumns.map((c) => ({
                  value: c,
                  label: c,
                }))}
                aria-label="Chart column"
              />
            </Inline>
          </Inline>
        </CardHeader>
        <CardBody>
          <LineChart data={data} height={360} />
          <Text size="xs" tone="subtle" className="text-center">
            {rowCount > CHART_ROW_LIMIT
              ? `Showing first ${CHART_ROW_LIMIT} of ${rowCount} rows`
              : `Showing all ${rowCount} rows`}
          </Text>
        </CardBody>
      </Card>
    ) : (
      <EmptyState>
        <EmptyStateIcon>
          <IconTrendingUp size="2xl" />
        </EmptyStateIcon>
        <EmptyStateTitle>No numeric columns available</EmptyStateTitle>
        <EmptyStateDescription>
          Charts require at least one column with numeric data.
        </EmptyStateDescription>
      </EmptyState>
    )}
  </Stack>
);
