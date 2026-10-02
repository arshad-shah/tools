import React from 'react';
import { Badge, Card, CardBody, Grid, Inline, Stack, Text } from '@/shared/ui';
import type { DiffStatistics } from '../types';

/** Additions, deletions, changes, unchanged and change rate. */
export const DiffStats: React.FC<{ diffStats: DiffStatistics }> = ({
  diffStats,
}) => (
  <Grid cols={{ base: 2, md: 5 }} gap="3">
    <Card>
      <CardBody>
        <Stack gap="1">
          <Text size="xs" tone="subtle">
            Additions
          </Text>
          <Inline gap="2" align="center">
            <Badge variant="soft" tone="success" size="md">
              {diffStats.additions}
            </Badge>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
    <Card>
      <CardBody>
        <Stack gap="1">
          <Text size="xs" tone="subtle">
            Deletions
          </Text>
          <Inline gap="2" align="center">
            <Badge variant="soft" tone="danger" size="md">
              {diffStats.deletions}
            </Badge>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
    <Card>
      <CardBody>
        <Stack gap="1">
          <Text size="xs" tone="subtle">
            Changes
          </Text>
          <Inline gap="2" align="center">
            <Badge variant="soft" tone="warning" size="md">
              {diffStats.changes}
            </Badge>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
    <Card>
      <CardBody>
        <Stack gap="1">
          <Text size="xs" tone="subtle">
            Unchanged
          </Text>
          <Inline gap="2" align="center">
            <Badge variant="soft" tone="accent" size="md">
              {diffStats.unchanged}
            </Badge>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
    <Card>
      <CardBody>
        <Stack gap="1">
          <Text size="xs" tone="subtle">
            Change rate
          </Text>
          <Inline gap="2" align="center">
            <Badge variant="soft" tone="accent" size="md">
              {diffStats.changePercentage}%
            </Badge>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  </Grid>
);
