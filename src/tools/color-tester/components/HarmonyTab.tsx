import React from 'react';
import { Card, CardBody, Grid, Stack, Text } from '@/shared/ui';
import type { ColorHarmony } from '../types';
import { Swatch } from './Swatch';

interface HarmonyTabProps {
  colorHarmony: ColorHarmony;
  loadHarmonyColor: (rgb: string) => void;
}

export const HarmonyTab: React.FC<HarmonyTabProps> = ({
  colorHarmony,
  loadHarmonyColor,
}) => {
  const entries: Array<[string, { hex: string; rgb: string; name: string }]> = [
    ['Complementary', colorHarmony.complementary],
    ['Analogous 1', colorHarmony.analogous1],
    ['Analogous 2', colorHarmony.analogous2],
    ['Triadic 1', colorHarmony.triadic1],
    ['Triadic 2', colorHarmony.triadic2],
    ['Lighter', colorHarmony.lighter],
    ['Darker', colorHarmony.darker],
  ];
  return (
    <Grid max={4} gap="3">
      {entries.map(([label, c]) => (
        <Card key={label} interactive onClick={() => loadHarmonyColor(c.rgb)}>
          <CardBody>
            <Stack gap="2" align="center">
              <Swatch color={c.hex} size="lg" rounded={false} />
              <Stack gap="0" align="center">
                <Text size="xs" weight="semibold">
                  {label}
                </Text>
                <Text size="xs" tone="subtle">
                  {c.hex}
                </Text>
              </Stack>
            </Stack>
          </CardBody>
        </Card>
      ))}
    </Grid>
  );
};
