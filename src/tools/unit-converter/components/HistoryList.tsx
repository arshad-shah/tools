import React from 'react';
import {
  IconArrowRight,
  IconClock,
  IconHistory,
  IconRefreshCw,
  IconX,
} from '@/shared/ui/icons';

import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Heading,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { Conversion } from '../types';
import { getTimeSince } from '../lib/convert';

interface HistoryListProps {
  history: Conversion[];
  onReuse: (c: Conversion) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onStart: () => void;
}

/** The last five conversions, or an empty state. */
export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onReuse,
  onRemove,
  onClear,
  onStart,
}) => (
  <Stack gap="4" className="pt-4">
    {history.length > 0 ? (
      <>
        <Inline justify="between" align="center" wrap>
          <Heading level={2} size="md">
            <Inline gap="2" align="center">
              <IconClock size="lg" />
              Conversion history
            </Inline>
          </Heading>
          <Button
            variant="soft"
            size="sm"
            leftIcon={<IconX size="sm" />}
            onClick={onClear}
          >
            Clear all
          </Button>
        </Inline>
        <Stack gap="2">
          {history.map((c) => (
            <Card key={c.id} interactive onClick={() => onReuse(c)}>
              <CardBody>
                <Inline justify="between" align="center" gap="3" wrap>
                  <Inline align="center" gap="3">
                    {c.categoryIcon}
                    <Stack gap="1">
                      <Inline gap="2" align="center" wrap>
                        <Text size="sm" weight="medium">
                          {c.category}
                        </Text>
                        <Badge variant="soft" tone="neutral" size="xs">
                          {getTimeSince(c.timestamp)}
                        </Badge>
                      </Inline>
                      <Inline gap="2" align="center" wrap>
                        <Text size="sm" weight="semibold">
                          {c.from}
                        </Text>
                        <IconArrowRight
                          size="xs"
                          label="converts to"
                          className="text-fg-subtle"
                        />
                        <Badge variant="soft" tone="accent" size="sm">
                          {c.to}
                        </Badge>
                      </Inline>
                    </Stack>
                  </Inline>
                  <Inline gap="1">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      label="Reuse conversion"
                      icon={<IconRefreshCw size="sm" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReuse(c);
                      }}
                    />
                    <IconButton
                      variant="ghost"
                      size="sm"
                      tone="danger"
                      label="Remove conversion"
                      icon={<IconX size="sm" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(c.id);
                      }}
                    />
                  </Inline>
                </Inline>
              </CardBody>
            </Card>
          ))}
        </Stack>
      </>
    ) : (
      <EmptyState>
        <EmptyStateIcon>
          <IconHistory size="3xl" />
        </EmptyStateIcon>
        <EmptyStateTitle>No conversion history yet</EmptyStateTitle>
        <EmptyStateDescription>
          Your recent conversions will appear here.
        </EmptyStateDescription>
        <EmptyStateActions>
          <Button variant="solid" onClick={onStart}>
            Start converting
          </Button>
        </EmptyStateActions>
      </EmptyState>
    )}
  </Stack>
);
