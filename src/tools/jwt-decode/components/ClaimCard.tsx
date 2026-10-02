import React from 'react';
import { Badge, Box, Card, CardBody, Inline, Stack } from '@/shared/ui';
import { ValueRenderer } from './ValueRenderer';

interface ClaimCardProps {
  label: string;
  value: unknown;
  icon: React.ReactNode;
  colorScheme?: 'neutral' | 'accent' | 'warning' | 'success';
}

export const ClaimCard: React.FC<ClaimCardProps> = ({
  label,
  value,
  icon,
  colorScheme = 'neutral',
}) => (
  <Card>
    <CardBody>
      <Inline align="start" gap="3">
        <Box>{icon}</Box>
        <Stack gap="1" className="flex-1 min-w-0">
          <Inline gap="2" align="center">
            <Badge variant="soft" tone={colorScheme} size="xs">
              {label}
            </Badge>
          </Inline>
          <ValueRenderer data={value} />
        </Stack>
      </Inline>
    </CardBody>
  </Card>
);
