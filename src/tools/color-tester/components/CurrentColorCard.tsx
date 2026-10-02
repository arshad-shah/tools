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
  ColorBlock,
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
  alpha: number;
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
  alpha,
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
        <ColorBlock
          color={hexCode}
          alpha={alpha}
          textColor={textColor}
          className="flex flex-col rounded-lg shadow-e1"
        >
          <CardBody>
            <Stack gap="2" align="center">
              <IconSparkles size="2xl" />
              <Heading level={3} size="xl" className="text-inherit">
                {colorNameSuggestion}
              </Heading>
              <Text size="sm" className="text-inherit">
                {hexCode}
              </Text>
            </Stack>
          </CardBody>
        </ColorBlock>
        <Inline gap="2" wrap>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<IconRefreshCw size="sm" />}
            onClick={generateRandomColor}
          >
            Random
          </Button>
          <Button
            variant="primary"
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
