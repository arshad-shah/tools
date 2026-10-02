import React, { useState } from 'react';
import { IconCopy, IconInfo, IconX } from '@/shared/ui/icons';

import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Code,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { Match } from '../lib/match';

export const MatchItem: React.FC<{
  match: Match;
  index: number;
  onCopy: () => void;
}> = ({ match, index, onCopy }) => {
  const [expanded, setExpanded] = useState(false);
  const hasGroups =
    (match.groups?.length ?? 0) > 0 ||
    Object.keys(match.namedGroups ?? {}).length > 0;

  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center" wrap gap="2">
          <Inline gap="2" align="center">
            <Badge variant="solid" tone="accent" size="sm">
              #{index + 1}
            </Badge>
            <Badge variant="soft" tone="neutral" size="sm">
              {match.index}–{match.index + match.length}
            </Badge>
            {match.length === 0 && (
              <Badge variant="soft" tone="warning" size="sm">
                Empty
              </Badge>
            )}
          </Inline>
          <Inline gap="1">
            <IconButton
              variant="ghost"
              size="sm"
              label="Copy match"
              icon={<IconCopy size="sm" />}
              onClick={onCopy}
            />
            {hasGroups && (
              <IconButton
                variant="ghost"
                size="sm"
                label={expanded ? 'Hide details' : 'Show details'}
                icon={expanded ? <IconX size="sm" /> : <IconInfo size="sm" />}
                onClick={() => setExpanded(!expanded)}
              />
            )}
          </Inline>
        </Inline>
      </CardHeader>
      <CardBody>
        <Stack gap="2">
          <Code block>{match.text || '(empty match)'}</Code>
          {expanded && hasGroups && (
            <Stack gap="2">
              {match.groups && match.groups.length > 0 && (
                <Stack gap="1">
                  <Text size="xs" weight="semibold">
                    Capture groups
                  </Text>
                  {match.groups.map((g, i) => (
                    <Inline key={i} justify="between" align="center">
                      <Text size="xs" tone="subtle">
                        Group {i + 1}:
                      </Text>
                      <Code>{g || '(empty)'}</Code>
                    </Inline>
                  ))}
                </Stack>
              )}
              {match.namedGroups &&
                Object.keys(match.namedGroups).length > 0 && (
                  <Stack gap="1">
                    <Text size="xs" weight="semibold">
                      Named groups
                    </Text>
                    {Object.entries(match.namedGroups).map(([n, v]) => (
                      <Inline key={n} justify="between" align="center">
                        <Text size="xs" tone="subtle">
                          {n}:
                        </Text>
                        <Code>{v || '(empty)'}</Code>
                      </Inline>
                    ))}
                  </Stack>
                )}
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};
