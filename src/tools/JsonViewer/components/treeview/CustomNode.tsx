import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  Code,
  Inline,
  Stack,
  Text,
} from '@arshad-shah/cynosure-react';
import { MainNode } from './types';

const parseKeyValuePairs = (content: string): Record<string, string> | null => {
  try {
    const pairs = content
      .split('\n')
      .filter((line) => line.includes(':'))
      .reduce<Record<string, string>>((acc, line) => {
        const [key, ...values] = line.split(':');
        const value = values.join(':').trim();
        return { ...acc, [key.trim()]: value };
      }, {});
    return Object.keys(pairs).length > 0 ? pairs : null;
  } catch {
    return null;
  }
};

const KeyValuePairs: React.FC<{ pairs: Record<string, string> }> = ({
  pairs,
}) => (
  <Card variant="filled" size="sm">
    <CardBody>
      <Stack gap="2">
        {Object.entries(pairs).map(([key, value]) => (
          <Inline key={key} justify="between" align="center" gap="2" wrap>
            <Inline align="center" gap="2">
              <Badge variant="solid" colorScheme="success" size="xs" dot />
              <Text size="sm" weight="medium" variant="overline">
                {key}
              </Text>
            </Inline>
            <Text size="sm">{String(value)}</Text>
          </Inline>
        ))}
      </Stack>
    </CardBody>
  </Card>
);

const CustomNode: React.FC<NodeProps<MainNode>> = ({ data }) => {
  const isObject = data.type === 'object';
  const isPrimitive = data.type === 'primitive';
  const keyValuePairs =
    typeof data.content === 'string' ? parseKeyValuePairs(data.content) : null;

  return (
    <Box style={{ position: 'relative' }}>
      <Card variant="elevated" size="sm">
        {!isPrimitive && (
          <CardHeader>
            <Inline align="center" gap="2">
              <Badge
                variant="solid"
                colorScheme={isObject ? 'warning' : 'success'}
                size="xs"
                dot
              />
              <Text size="sm" weight="medium">
                {data.label}
              </Text>
            </Inline>
          </CardHeader>
        )}
        <CardBody>
          {keyValuePairs ? (
            <KeyValuePairs pairs={keyValuePairs} />
          ) : (
            <Code variant="block" size="sm">
              {data.content}
            </Code>
          )}
        </CardBody>
      </Card>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          background: 'var(--cynosure-color-accent-default, #3b82f6)',
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          background: 'var(--cynosure-color-accent-default, #3b82f6)',
        }}
      />
    </Box>
  );
};

export default CustomNode;
