import React from 'react';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  Inline,
  Label,
  Slider,
  Stack,
  Text,
} from '@/shared/ui';
import type { ColorLike } from '../types';

interface ColorEditorProps {
  hexCode: string;
  handleColorPicker: (color: ColorLike) => void;
  red: number;
  setRed: (value: number) => void;
  green: number;
  setGreen: (value: number) => void;
  blue: number;
  setBlue: (value: number) => void;
  alpha: number;
  setAlpha: (value: number) => void;
}

export const ColorEditor: React.FC<ColorEditorProps> = ({
  hexCode,
  handleColorPicker,
  red,
  setRed,
  green,
  setGreen,
  blue,
  setBlue,
  alpha,
  setAlpha,
}) => (
  <Card>
    <CardHeader>
      <CardTitle as="h3">Colour editor</CardTitle>
    </CardHeader>
    <CardBody>
      <Stack gap="4">
        <Inline align="center" gap="3" wrap>
          <input
            type="color"
            value={hexCode}
            onChange={(e) =>
              handleColorPicker({ toString: () => e.target.value })
            }
            aria-label="Colour picker"
            className="h-10 w-16 cursor-pointer rounded-md border border-line bg-surface"
          />
          <Text size="sm" tone="subtle">
            Pick a colour or use the sliders below.
          </Text>
        </Inline>

        <Grid max={2} gap="4">
          <Stack gap="2">
            <Inline justify="between" align="center">
              <Label>Red</Label>
              <Badge variant="soft" tone="danger" size="sm">
                {red}
              </Badge>
            </Inline>
            <Slider
              value={red}
              onValueChange={setRed}
              min={0}
              max={255}
              aria-label="Red channel"
            />
          </Stack>
          <Stack gap="2">
            <Inline justify="between" align="center">
              <Label>Green</Label>
              <Badge variant="soft" tone="success" size="sm">
                {green}
              </Badge>
            </Inline>
            <Slider
              value={green}
              onValueChange={setGreen}
              min={0}
              max={255}
              aria-label="Green channel"
            />
          </Stack>
          <Stack gap="2">
            <Inline justify="between" align="center">
              <Label>Blue</Label>
              <Badge variant="soft" tone="accent" size="sm">
                {blue}
              </Badge>
            </Inline>
            <Slider
              value={blue}
              onValueChange={setBlue}
              min={0}
              max={255}
              aria-label="Blue channel"
            />
          </Stack>
          <Stack gap="2">
            <Inline justify="between" align="center">
              <Label>Alpha</Label>
              <Badge variant="soft" tone="neutral" size="sm">
                {alpha.toFixed(2)}
              </Badge>
            </Inline>
            <Slider
              value={alpha}
              onValueChange={setAlpha}
              min={0}
              max={1}
              step={0.01}
              aria-label="Alpha channel"
            />
          </Stack>
        </Grid>
      </Stack>
    </CardBody>
  </Card>
);
