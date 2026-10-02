import React from 'react';
import { IconAlertTriangle } from '@/shared/ui/icons';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  CardBody,
  ColorBlock,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { wcagLevel } from '../lib/palette';

interface AccessibilityTabProps {
  hexCode: string;
  alpha: number;
  contrastRatios: { white: number; black: number };
}

export const AccessibilityTab: React.FC<AccessibilityTabProps> = ({
  hexCode,
  alpha,
  contrastRatios,
}) => {
  const whiteLevel = wcagLevel(contrastRatios.white);
  const blackLevel = wcagLevel(contrastRatios.black);
  return (
    <Stack gap="3">
      <ColorBlock
        color={hexCode}
        alpha={alpha}
        className="flex flex-col rounded-lg shadow-e1"
      >
        <CardBody>
          <Stack gap="2">
            <Text size="lg" weight="bold" className="text-white">
              White text on this colour
            </Text>
            <Text size="sm" className="text-white">
              Contrast ratio: {contrastRatios.white.toFixed(2)}:1
            </Text>
            <Inline gap="2">
              <Badge variant="solid" tone={whiteLevel.colorScheme} size="sm">
                WCAG {whiteLevel.label}
              </Badge>
            </Inline>
          </Stack>
        </CardBody>
      </ColorBlock>
      <ColorBlock
        color={hexCode}
        alpha={alpha}
        className="flex flex-col rounded-lg shadow-e1"
      >
        <CardBody>
          <Stack gap="2">
            <Text size="lg" weight="bold" className="text-black">
              Black text on this colour
            </Text>
            <Text size="sm" className="text-black">
              Contrast ratio: {contrastRatios.black.toFixed(2)}:1
            </Text>
            <Inline gap="2">
              <Badge variant="solid" tone={blackLevel.colorScheme} size="sm">
                WCAG {blackLevel.label}
              </Badge>
            </Inline>
          </Stack>
        </CardBody>
      </ColorBlock>
      {whiteLevel.colorScheme !== 'success' &&
        blackLevel.colorScheme !== 'success' && (
          <Alert status="warning" icon={<IconAlertTriangle />}>
            <AlertTitle>Low contrast</AlertTitle>
            <AlertDescription>
              Neither white nor black text reaches WCAG AA on this colour for
              normal text. Consider darkening or lightening it.
            </AlertDescription>
          </Alert>
        )}
    </Stack>
  );
};
