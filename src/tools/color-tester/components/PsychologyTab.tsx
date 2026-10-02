import React from 'react';
import { IconBrain } from '@/shared/ui/icons';

import { Card, CardBody, Heading, Inline, Stack, Text } from '@/shared/ui';
import { Swatch } from './Swatch';

interface PsychologyTabProps {
  rgbString: string;
  hexCode: string;
  alpha: number;
  colorNameSuggestion: string;
  colorMood: string;
}

export const PsychologyTab: React.FC<PsychologyTabProps> = ({
  rgbString,
  hexCode,
  alpha,
  colorNameSuggestion,
  colorMood,
}) => (
  <Stack gap="3">
    <Inline align="center" gap="3" wrap>
      <Swatch color={hexCode} alpha={alpha} size="lg" />
      <Stack gap="1">
        <Heading level={3} size="lg">
          {colorNameSuggestion}
        </Heading>
        <Text size="sm" tone="subtle">
          {rgbString}
        </Text>
      </Stack>
    </Inline>
    <Card>
      <CardBody>
        <Stack gap="2">
          <Inline align="center" gap="2">
            <IconBrain size="sm" />
            <Text size="sm" weight="semibold">
              Mood
            </Text>
          </Inline>
          <Text size="sm">{colorMood}</Text>
        </Stack>
      </CardBody>
    </Card>
  </Stack>
);
