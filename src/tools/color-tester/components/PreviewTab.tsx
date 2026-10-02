import React from 'react';
import {
  Badge,
  Button,
  CardBody,
  ColorBlock,
  Heading,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';

interface PreviewTabProps {
  hexCode: string;
  alpha: number;
  textColor: string;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  hexCode,
  alpha,
  textColor,
}) => (
  <Stack gap="3">
    <ColorBlock
      color={hexCode}
      alpha={alpha}
      textColor={textColor}
      className="flex flex-col rounded-lg shadow-e1"
    >
      <CardBody>
        <Stack gap="3" align="center">
          <Heading level={3} size="2xl" className="text-center text-inherit">
            Sample heading
          </Heading>
          <Text size="md" className="text-center text-inherit">
            The quick brown fox jumps over the lazy dog.
          </Text>
          <Inline gap="2">
            <Button variant="primary" size="sm">
              Primary
            </Button>
            <Button variant="secondary" size="sm">
              Secondary
            </Button>
          </Inline>
        </Stack>
      </CardBody>
    </ColorBlock>
    <Inline justify="center" gap="2">
      <Badge variant="soft" tone="neutral" size="sm">
        Auto text colour: {textColor}
      </Badge>
    </Inline>
  </Stack>
);
