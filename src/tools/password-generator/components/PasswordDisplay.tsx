import React, { useState } from 'react';
import {
  IconCheckCircle,
  IconCopy,
  IconEye,
  IconEyeOff,
} from '@/shared/ui/icons';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  IconButton,
  Inline,
  Stack,
} from '@/shared/ui';
import { CharLegend } from './CharLegend';
import { HighlightedPassword } from './HighlightedPassword';

interface PasswordDisplayProps {
  password: string;
  onCopy: () => void;
  copied: boolean;
}

export const PasswordDisplay: React.FC<PasswordDisplayProps> = ({
  password,
  onCopy,
  copied,
}) => {
  const [hidden, setHidden] = useState(false);
  const counts = {
    uppercase: password.match(/[A-Z]/g)?.length || 0,
    lowercase: password.match(/[a-z]/g)?.length || 0,
    numbers: password.match(/[0-9]/g)?.length || 0,
    special: password.match(/[^A-Za-z0-9]/g)?.length || 0,
  };

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center">
          <CardTitle as="h3">Generated password</CardTitle>
          <IconButton
            variant="ghost"
            size="sm"
            label={hidden ? 'Show password' : 'Hide password'}
            icon={hidden ? <IconEye size="sm" /> : <IconEyeOff size="sm" />}
            onClick={() => setHidden(!hidden)}
          />
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="4">
          <Stack gap="2">
            <HighlightedPassword password={password} hidden={hidden} />
            <Inline justify="between" align="center" gap="3" wrap>
              <CharLegend />
              <Button
                variant={copied ? 'solid' : 'soft'}
                size="md"
                leftIcon={
                  copied ? (
                    <IconCheckCircle size="md" />
                  ) : (
                    <IconCopy size="md" />
                  )
                }
                onClick={onCopy}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Inline>
          </Stack>
          <Inline gap="2" wrap>
            {counts.uppercase > 0 && (
              <Badge variant="soft" tone="warning" size="sm">
                {counts.uppercase} uppercase
              </Badge>
            )}
            {counts.lowercase > 0 && (
              <Badge variant="soft" tone="neutral" size="sm">
                {counts.lowercase} lowercase
              </Badge>
            )}
            {counts.numbers > 0 && (
              <Badge variant="soft" tone="success" size="sm">
                {counts.numbers} numbers
              </Badge>
            )}
            {counts.special > 0 && (
              <Badge variant="soft" tone="info" size="sm">
                {counts.special} special
              </Badge>
            )}
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  );
};
