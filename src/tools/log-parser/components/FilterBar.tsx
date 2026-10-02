import React from 'react';
import { IconClock, IconCpu, IconFilter } from '@/shared/ui/icons';

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
  SearchInput,
  Stack,
} from '@/shared/ui';
import type { FilterCriteria } from '../types';

interface FilterBarProps {
  hasActiveFilters: boolean;
  resetFilters: () => void;
  filter: string;
  setFilter: (value: string) => void;
  searchComponent: string;
  setSearchComponent: (value: string) => void;
  timeRange: FilterCriteria['timeRange'];
  setTimeRange: (range: FilterCriteria['timeRange']) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  hasActiveFilters,
  resetFilters,
  filter,
  setFilter,
  searchComponent,
  setSearchComponent,
  timeRange,
  setTimeRange,
}) => (
  <Card>
    <CardHeader>
      <Inline justify="between" align="center" wrap>
        <Inline align="center" gap="2">
          <IconFilter size="md" />
          <CardTitle as="h3">Filters</CardTitle>
        </Inline>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={resetFilters}
        >
          Reset
        </Button>
      </Inline>
    </CardHeader>
    <CardBody>
      <Grid max={2} gap="3">
        <Stack gap="2">
          <Label htmlFor="filter-search">Message search</Label>
          <SearchInput
            value={filter}
            onChange={setFilter}
            placeholder="Search in messages…"
          />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="filter-component">Component</Label>
          <Input
            id="filter-component"
            value={searchComponent}
            onChange={setSearchComponent}
            placeholder="Filter by component…"
            leadingSlot={<IconCpu size="sm" />}
          />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="filter-from">Time range start</Label>
          <Input
            id="filter-from"
            value={timeRange.start ?? ''}
            onChange={(v) =>
              setTimeRange({ ...timeRange, start: v || undefined })
            }
            placeholder="e.g. 12:00:00"
            leadingSlot={<IconClock size="sm" />}
          />
        </Stack>
        <Stack gap="2">
          <Label htmlFor="filter-to">Time range end</Label>
          <Input
            id="filter-to"
            value={timeRange.end ?? ''}
            onChange={(v) =>
              setTimeRange({ ...timeRange, end: v || undefined })
            }
            placeholder="e.g. 13:00:00"
            leadingSlot={<IconClock size="sm" />}
          />
        </Stack>
      </Grid>
    </CardBody>
  </Card>
);
