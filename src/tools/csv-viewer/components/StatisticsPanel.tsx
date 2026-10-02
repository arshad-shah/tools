import React from 'react';
import { IconBarChart3 } from '@/shared/ui/icons';

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Grid,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { formatNumber } from '../lib/stats';
import type { ColumnStatistics, Statistics } from '../types';

const StatCard: React.FC<{ column: string; stats: ColumnStatistics }> = ({
  column,
  stats,
}) => (
  <Card>
    <CardHeader>
      <CardTitle as="h4">{column}</CardTitle>
    </CardHeader>
    <CardBody>
      <Stack gap="2">
        <Inline justify="between" align="center">
          <Text size="sm" tone="subtle">
            Minimum
          </Text>
          <Text size="sm" weight="medium">
            {formatNumber(stats.min)}
          </Text>
        </Inline>
        <Inline justify="between" align="center">
          <Text size="sm" tone="subtle">
            Maximum
          </Text>
          <Text size="sm" weight="medium">
            {formatNumber(stats.max)}
          </Text>
        </Inline>
        <Inline justify="between" align="center">
          <Text size="sm" tone="subtle">
            Average
          </Text>
          <Text size="sm" weight="medium">
            {formatNumber(stats.avg)}
          </Text>
        </Inline>
        <Inline justify="between" align="center">
          <Text size="sm" tone="subtle">
            Sum
          </Text>
          <Text size="sm" weight="medium">
            {formatNumber(stats.sum)}
          </Text>
        </Inline>
        <Inline justify="between" align="center">
          <Text size="sm" tone="subtle">
            Count
          </Text>
          <Text size="sm" weight="medium">
            {stats.count.toLocaleString()}
          </Text>
        </Inline>
      </Stack>
    </CardBody>
  </Card>
);

export const StatisticsPanel: React.FC<{ statistics: Statistics }> = ({
  statistics,
}) => (
  <Stack gap="4" className="pt-4">
    {Object.keys(statistics).length > 0 ? (
      <Grid max={3} gap="3">
        {Object.entries(statistics).map(([col, stats]) => (
          <StatCard key={col} column={col} stats={stats} />
        ))}
      </Grid>
    ) : (
      <EmptyState>
        <EmptyStateIcon>
          <IconBarChart3 size="2xl" />
        </EmptyStateIcon>
        <EmptyStateTitle>No numeric columns found</EmptyStateTitle>
        <EmptyStateDescription>
          Statistics can only be calculated for columns with numeric values.
        </EmptyStateDescription>
      </EmptyState>
    )}
  </Stack>
);
