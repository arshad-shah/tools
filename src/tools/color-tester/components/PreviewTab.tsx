import React from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Heading,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';

interface PreviewTabProps {
  rgbString: string;
  textColor: string;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  rgbString,
  textColor,
}) => (
  <Stack gap="3">
    <Card
      // data-driven: user colour and its luminance-derived text colour
      style={{ background: rgbString, color: textColor }}
    >
      <CardBody>
        <Stack gap="3" align="center">
          <Heading
            level={3}
            size="2xl"
            className="text-center"
            // data-driven: luminance-derived text colour
            style={{ color: textColor }}
          >
            Sample heading
          </Heading>
          <Text
            size="md"
            className="text-center"
            // data-driven: luminance-derived text colour
            style={{ color: textColor }}
          >
            The quick brown fox jumps over the lazy dog.
          </Text>
          <Inline gap="2">
            <Button variant="solid" size="sm">
              Primary
            </Button>
            <Button variant="soft" size="sm">
              Secondary
            </Button>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
    <Inline justify="center" gap="2">
      <Badge variant="soft" tone="neutral" size="sm">
        Auto text colour: {textColor}
      </Badge>
    </Inline>
  </Stack>
);
