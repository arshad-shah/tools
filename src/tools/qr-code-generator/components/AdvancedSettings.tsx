import React from 'react';
import { IconSettings } from '@/shared/ui/icons';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Inline,
  Label,
  NumberInput,
  Stack,
  Text,
} from '@/shared/ui';
import type { QRCodeState } from '../types';

export const AdvancedSettings: React.FC<{
  state: QRCodeState;
  setVersion: (version: number) => void;
  setMaskPattern: (maskPattern: number) => void;
}> = ({ state, setVersion, setMaskPattern }) => (
  <Accordion type="single">
    <AccordionItem value="advanced">
      <AccordionTrigger>
        <Inline align="center" gap="2">
          <IconSettings size="sm" />
          <Text weight="medium">Advanced technical settings</Text>
        </Inline>
      </AccordionTrigger>
      <AccordionContent>
        <Stack gap="3">
          <Stack gap="2">
            <Label htmlFor="qr-version">QR version (0 for auto)</Label>
            <NumberInput
              id="qr-version"
              value={state.version}
              onValueChange={(v) => setVersion(v ?? 0)}
              min={0}
              max={40}
              aria-label="QR version"
            />
          </Stack>
          <Stack gap="2">
            <Label htmlFor="mask-pattern">Mask pattern (-1 for auto)</Label>
            <NumberInput
              id="mask-pattern"
              value={state.maskPattern}
              onValueChange={(v) => setMaskPattern(v ?? -1)}
              min={-1}
              max={7}
              aria-label="Mask pattern"
            />
          </Stack>
        </Stack>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
