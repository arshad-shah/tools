import React from 'react';
import { Badge, Box, Inline, Stack, Text } from '@/shared/ui';
import type { Tone } from '../types';

export const StatusRow: React.FC<{
  label: string;
  title: string;
  detail: string;
  tone: Tone;
  icon: React.ReactNode;
}> = ({ label, title, detail, tone, icon }) => (
  <Inline align="start" gap="3">
    <Box className="pt-0.5">{icon}</Box>
    <Stack gap="1" className="min-w-0 flex-1">
      <Inline gap="2" align="center" wrap>
        <Text size="sm" tone="subtle">
          {label}
        </Text>
        <Badge variant="soft" tone={tone} size="sm">
          {title}
        </Badge>
      </Inline>
      {detail && (
        <Text size="sm" tone="subtle">
          {detail}
        </Text>
      )}
    </Stack>
  </Inline>
);
