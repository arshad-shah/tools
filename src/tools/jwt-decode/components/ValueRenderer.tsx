import React from 'react';
import { IconBraces, IconBrackets } from '@/shared/ui/icons';

import { Code, Inline, Stack, Text } from '@/shared/ui';

interface ValueRendererProps {
  data: unknown;
  depth?: number;
  maxDepth?: number;
}

export const ValueRenderer: React.FC<ValueRendererProps> = ({
  data,
  depth = 0,
  maxDepth = 3,
}) => {
  if (data === null || data === undefined) {
    return (
      <Text size="sm" tone="subtle" className="italic">
        null
      </Text>
    );
  }
  if (typeof data === 'string') {
    return <Code className="text-success">&quot;{data}&quot;</Code>;
  }
  if (typeof data === 'number') {
    return <Code className="text-accent">{data}</Code>;
  }
  if (typeof data === 'boolean') {
    return <Code className="text-accent">{data ? 'true' : 'false'}</Code>;
  }
  if (Array.isArray(data)) {
    if (depth >= maxDepth) {
      return (
        <Inline gap="1" align="center">
          <IconBrackets size="xs" />
          <Text size="sm" tone="subtle">
            Array[{data.length}]
          </Text>
        </Inline>
      );
    }
    return (
      <Stack gap="1">
        <Inline gap="1" align="center">
          <IconBrackets size="sm" />
          <Text size="sm" weight="medium">
            Array ({data.length} items)
          </Text>
        </Inline>
        <Stack gap="1" className="pl-4">
          {data.map((item, i) => (
            <Inline key={i} align="start" gap="2">
              <Text size="sm" tone="subtle">
                {i}:
              </Text>
              <ValueRenderer
                data={item}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            </Inline>
          ))}
        </Stack>
      </Stack>
    );
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (depth >= maxDepth) {
      return (
        <Inline gap="1" align="center">
          <IconBraces size="xs" />
          <Text size="sm" tone="subtle">
            Object[{entries.length} keys]
          </Text>
        </Inline>
      );
    }
    return (
      <Stack gap="1">
        <Inline gap="1" align="center">
          <IconBraces size="sm" />
          <Text size="sm" weight="medium">
            Object ({entries.length} properties)
          </Text>
        </Inline>
        <Stack gap="1" className="pl-4">
          {entries.map(([key, value]) => (
            <Inline key={key} align="start" gap="2">
              <Code className="text-accent">&quot;{key}&quot;:</Code>
              <ValueRenderer
                data={value}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            </Inline>
          ))}
        </Stack>
      </Stack>
    );
  }
  return <Text size="sm">{String(data)}</Text>;
};
