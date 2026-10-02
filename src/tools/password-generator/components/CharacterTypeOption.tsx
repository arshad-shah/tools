import React from 'react';
import {
  Badge,
  Card,
  CardBody,
  Inline,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';

interface CharacterTypeOptionProps {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  recommended?: boolean;
}

export const CharacterTypeOption: React.FC<CharacterTypeOptionProps> = ({
  label,
  sublabel,
  checked,
  onChange,
  recommended = false,
}) => (
  <Card className={checked ? 'border-accent' : undefined}>
    <CardBody>
      <Inline justify="between" align="center" gap="3" wrap>
        <Stack gap="1">
          <Inline align="center" gap="2">
            <Text size="sm" weight="semibold">
              {label}
            </Text>
            {recommended && (
              <Badge variant="soft" tone="warning" size="xs">
                Recommended
              </Badge>
            )}
          </Inline>
          <Text size="xs" tone="subtle">
            {sublabel}
          </Text>
        </Stack>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          aria-label={`Toggle ${label}`}
        />
      </Inline>
    </CardBody>
  </Card>
);
