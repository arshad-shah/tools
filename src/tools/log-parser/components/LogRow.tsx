import React, { useState } from 'react';
import { IconChevronRight, IconCopy } from '@/shared/ui/icons';

import {
  Badge,
  Card,
  CardBody,
  Code,
  IconButton,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { LEVEL_INFO } from '../lib/level-info';
import type { LogEntry } from '../types';

interface LogRowProps {
  log: LogEntry;
  copied: boolean;
  onCopy: (text: string) => void;
}

export const LogRow: React.FC<LogRowProps> = ({ log, copied, onCopy }) => {
  const [expanded, setExpanded] = useState(false);
  const info = LEVEL_INFO[log.level];
  const LevelIcon = info.icon;
  return (
    <Card>
      <CardBody>
        <Stack gap="2">
          <Inline justify="between" align="center" gap="2" wrap>
            <Inline align="center" gap="2" wrap>
              <Badge
                variant="soft"
                tone={info.tone}
                size="sm"
                icon={<LevelIcon size="sm" />}
              >
                {info.label}
              </Badge>
              {log.timestamp && (
                <Badge variant="soft" tone="neutral" size="xs">
                  {log.timestamp}
                </Badge>
              )}
              {log.component && (
                <Badge variant="outline" tone="accent" size="xs">
                  {log.component}
                </Badge>
              )}
              {log.executionTime && (
                <Badge variant="soft" tone="warning" size="xs">
                  {log.executionTime}
                </Badge>
              )}
            </Inline>
            <Inline gap="1">
              <IconButton
                variant="ghost"
                size="sm"
                label="Copy raw line"
                icon={<IconCopy size="sm" />}
                onClick={() => onCopy(log.raw)}
              />
              {(log.details || log.raw !== log.message) && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  label={expanded ? 'Collapse' : 'Expand'}
                  icon={
                    <IconChevronRight
                      size="sm"
                      className={cn(
                        'transition-transform duration-150',
                        expanded && 'rotate-90',
                      )}
                    />
                  }
                  onClick={() => setExpanded((e) => !e)}
                />
              )}
            </Inline>
          </Inline>
          <Text size="sm">{log.message}</Text>
          {copied && (
            <Text size="xs" tone="subtle">
              Copied
            </Text>
          )}
          {expanded && (
            <Stack gap="2">
              {log.details && <Code block>{log.details}</Code>}
              <Code block>{log.raw}</Code>
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
};
