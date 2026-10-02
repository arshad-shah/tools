import React from 'react';
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Grid,
  Inline,
  Input,
  Label,
  Slider,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
import { COLOR_PRESETS, ERROR_LEVEL_PCT, ERROR_LEVELS } from '../lib/options';
import type { ErrorCorrectionLevel, QRCodeState, RenderAs } from '../types';

/** Size, colour, error-correction and output-format controls. */
export const StylePanel: React.FC<{
  state: QRCodeState;
  setSize: (size: number) => void;
  setBackgroundColor: (color: string) => void;
  setForegroundColor: (color: string) => void;
  setErrorCorrectionLevel: (level: ErrorCorrectionLevel) => void;
  setRenderAs: (renderAs: RenderAs) => void;
  setIncludeMargin: (includeMargin: boolean) => void;
}> = ({
  state,
  setSize,
  setBackgroundColor,
  setForegroundColor,
  setErrorCorrectionLevel,
  setRenderAs,
  setIncludeMargin,
}) => (
  <>
    <Card>
      <CardBody>
        <Stack gap="3">
          <Inline justify="between" align="center">
            <Label>QR code size</Label>
            <Badge variant="soft" tone="accent" size="sm">
              {state.size}px
            </Badge>
          </Inline>
          <Slider
            value={state.size}
            onValueChange={(v) => setSize(v as number)}
            min={100}
            max={500}
            step={20}
            aria-label="QR size"
          />
        </Stack>
      </CardBody>
    </Card>

    <Card>
      <CardBody>
        <Stack gap="3">
          <Label>Colour presets</Label>
          <Grid cols={{ base: 3, sm: 6 }} gap="2">
            {COLOR_PRESETS.map((p) => (
              <Button
                key={p.name}
                variant={
                  p.bg === state.backgroundColor &&
                  p.fg === state.foregroundColor
                    ? 'solid'
                    : 'soft'
                }
                size="sm"
                onClick={() => {
                  setBackgroundColor(p.bg);
                  setForegroundColor(p.fg);
                }}
              >
                {p.name}
              </Button>
            ))}
          </Grid>
          <Grid cols={{ base: 1, md: 2 }} gap="3">
            <Stack gap="2">
              <Label htmlFor="bg-color">Background</Label>
              <Input
                id="bg-color"
                value={state.backgroundColor}
                onChange={setBackgroundColor}
                placeholder="#FFFFFF"
              />
            </Stack>
            <Stack gap="2">
              <Label htmlFor="fg-color">Foreground</Label>
              <Input
                id="fg-color"
                value={state.foregroundColor}
                onChange={setForegroundColor}
                placeholder="#000000"
              />
            </Stack>
          </Grid>
        </Stack>
      </CardBody>
    </Card>

    <Card>
      <CardBody>
        <Stack gap="3">
          <Label>Error correction</Label>
          <ButtonGroup>
            {ERROR_LEVELS.map((level) => (
              <Button
                key={level}
                variant={
                  state.errorCorrectionLevel === level ? 'solid' : 'soft'
                }
                size="sm"
                onClick={() => setErrorCorrectionLevel(level)}
              >
                {level} ({ERROR_LEVEL_PCT[level]})
              </Button>
            ))}
          </ButtonGroup>
          <Text size="xs" tone="subtle">
            Higher levels make the QR more resistant to damage but denser.
          </Text>
        </Stack>
      </CardBody>
    </Card>

    <Card>
      <CardBody>
        <Stack gap="3">
          <Label>Output format</Label>
          <ButtonGroup>
            <Button
              variant={state.renderAs === 'canvas' ? 'solid' : 'soft'}
              size="sm"
              onClick={() => setRenderAs('canvas')}
            >
              PNG
            </Button>
            <Button
              variant={state.renderAs === 'svg' ? 'solid' : 'soft'}
              size="sm"
              onClick={() => setRenderAs('svg')}
            >
              SVG
            </Button>
          </ButtonGroup>
          <Inline justify="between" align="center" wrap>
            <Stack gap="0">
              <Label htmlFor="include-margin">Include margin</Label>
              <Text size="xs" tone="subtle">
                Adds white space around the QR
              </Text>
            </Stack>
            <Switch
              id="include-margin"
              checked={state.includeMargin}
              onCheckedChange={setIncludeMargin}
            />
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  </>
);
