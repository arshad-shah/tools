import React from 'react';
import {
  IconCheckCircle2,
  IconCopy,
  IconPalette,
  IconRefreshCw,
  IconSave,
  IconSparkles,
} from '@/shared/ui/icons';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Heading,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';

interface CurrentColorCardProps {
  rgbString: string;
  textColor: string;
  hexCode: string;
  colorNameSuggestion: string;
  generateRandomColor: () => void;
  saveColor: () => void;
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => void;
}

export const CurrentColorCard: React.FC<CurrentColorCardProps> = ({
  rgbString,
  textColor,
  hexCode,
  colorNameSuggestion,
  generateRandomColor,
  saveColor,
  copiedKey,
  copyToClipboard,
}) => (
  <Card>
    <CardHeader>
      <Inline align="center" gap="2">
        <IconPalette size="lg" />
        <CardTitle as="h3">Current colour</CardTitle>
      </Inline>
    </CardHeader>
    <CardBody>
      <Stack gap="4">
        <Card
          // data-driven: user colour and its luminance-derived text colour
          style={{ background: rgbString, color: textColor }}
        >
          <CardBody>
            <Stack gap="2" align="center">
              <IconSparkles size="2xl" />
              <Heading
                level={3}
                size="xl"
                // data-driven: luminance-derived text colour
                style={{ color: textColor }}
              >
                {colorNameSuggestion}
              </Heading>
              <Text
                size="sm"
                // data-driven: luminance-derived text colour
                style={{ color: textColor }}
              >
                {hexCode}
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Inline gap="2" wrap>
          <Button
            variant="soft"
            size="sm"
            leftIcon={<IconRefreshCw size="sm" />}
            onClick={generateRandomColor}
          >
            Random
          </Button>
          <Button
            variant="solid"
            size="sm"
            leftIcon={<IconSave size="sm" />}
            onClick={saveColor}
          >
            Save
          </Button>
        </Inline>

        <Stack gap="2">
          <Inline justify="between" align="center">
            <Text size="sm" tone="subtle">
              HEX
            </Text>
            <Inline gap="2" align="center">
              <Text size="sm" weight="medium">
                {hexCode}
              </Text>
              <IconButton
                variant="ghost"
                size="sm"
                label="Copy hex"
                icon={
                  copiedKey === 'hex' ? (
                    <IconCheckCircle2 size="sm" />
                  ) : (
                    <IconCopy size="sm" />
                  )
                }
                onClick={() => copyToClipboard(hexCode, 'hex')}
              />
            </Inline>
          </Inline>
          <Inline justify="between" align="center">
            <Text size="sm" tone="subtle">
              RGB
            </Text>
            <Inline gap="2" align="center">
              <Text size="sm" weight="medium">
                {rgbString}
              </Text>
              <IconButton
                variant="ghost"
                size="sm"
                label="Copy rgb"
                icon={
                  copiedKey === 'rgb' ? (
                    <IconCheckCircle2 size="sm" />
                  ) : (
                    <IconCopy size="sm" />
                  )
                }
                onClick={() => copyToClipboard(rgbString, 'rgb')}
              />
            </Inline>
          </Inline>
        </Stack>
      </Stack>
    </CardBody>
  </Card>
);
