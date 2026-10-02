import React from 'react';
import { IconFileImage } from '@/shared/ui/icons';

import {
  Card,
  CardBody,
  Checkbox,
  Grid,
  Inline,
  Input,
  Label,
  NumberInput,
  Stack,
  Switch,
} from '@/shared/ui';
import type { ImageSettings, QRCodeState } from '../types';

export const LogoPanel: React.FC<{
  state: QRCodeState;
  setUseImage: (useImage: boolean) => void;
  setImageSettings: (imageSettings: ImageSettings) => void;
}> = ({ state, setUseImage, setImageSettings }) => (
  <Card>
    <CardBody>
      <Stack gap="3">
        <Inline justify="between" align="center">
          <Inline align="center" gap="2">
            <IconFileImage size="sm" />
            <Label htmlFor="use-image">Logo / image</Label>
          </Inline>
          <Switch
            id="use-image"
            checked={state.useImage}
            onCheckedChange={setUseImage}
          />
        </Inline>
        {state.useImage && (
          <Stack gap="3">
            <Stack gap="2">
              <Label htmlFor="logo-url">Logo URL</Label>
              <Input
                id="logo-url"
                value={state.imageSettings.src}
                onChange={(v) =>
                  setImageSettings({
                    ...state.imageSettings,
                    src: v,
                  })
                }
                placeholder="https://example.com/logo.png"
              />
            </Stack>
            <Grid cols={2} gap="3">
              <Stack gap="2">
                <Label htmlFor="logo-width">Width (px)</Label>
                <NumberInput
                  id="logo-width"
                  value={state.imageSettings.width}
                  onValueChange={(v) =>
                    setImageSettings({
                      ...state.imageSettings,
                      width: v ?? 10,
                    })
                  }
                  min={10}
                  max={state.size / 2}
                  aria-label="Logo width"
                />
              </Stack>
              <Stack gap="2">
                <Label htmlFor="logo-height">Height (px)</Label>
                <NumberInput
                  id="logo-height"
                  value={state.imageSettings.height}
                  onValueChange={(v) =>
                    setImageSettings({
                      ...state.imageSettings,
                      height: v ?? 10,
                    })
                  }
                  min={10}
                  max={state.size / 2}
                  aria-label="Logo height"
                />
              </Stack>
            </Grid>
            <Inline align="center" gap="2">
              <Checkbox
                checked={state.imageSettings.excavate}
                onCheckedChange={(c) =>
                  setImageSettings({
                    ...state.imageSettings,
                    excavate: Boolean(c),
                  })
                }
                aria-label="Excavate"
              />
              <Label>Excavate (clear QR behind logo)</Label>
            </Inline>
          </Stack>
        )}
      </Stack>
    </CardBody>
  </Card>
);
