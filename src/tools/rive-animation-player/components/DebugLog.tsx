import {
  IconAlertCircle,
  IconCheckCircle2,
  IconInfo,
  IconX,
} from '@/shared/ui/icons';

import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Inline,
  Stack,
  Text,
} from '@/shared/ui';
import type { DebugLog as DebugLogEntry } from '../types';

const logColorScheme = (
  type: DebugLogEntry['type'],
): 'danger' | 'warning' | 'success' | 'accent' =>
  type === 'error'
    ? 'danger'
    : type === 'warning'
      ? 'warning'
      : type === 'success'
        ? 'success'
        : 'accent';

const logIcon = (type: DebugLogEntry['type']) => {
  switch (type) {
    case 'error':
      return <IconAlertCircle size="sm" />;
    case 'warning':
      return <IconAlertCircle size="sm" />;
    case 'success':
      return <IconCheckCircle2 size="sm" />;
    default:
      return <IconInfo size="sm" />;
  }
};

export function DebugLog({
  debugLogs,
  onClear,
}: {
  debugLogs: DebugLogEntry[];
  onClear: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <Inline justify="between" align="center">
          <CardTitle as="h4">Debug logs</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<IconX size="sm" />}
            onClick={onClear}
          >
            Clear
          </Button>
        </Inline>
      </CardHeader>
      <CardBody>
        <Box className="max-h-64 overflow-auto">
          {debugLogs.length === 0 ? (
            <Text size="sm" tone="subtle">
              No logs yet. Upload a file to see debug information.
            </Text>
          ) : (
            <Stack gap="1">
              {debugLogs.map((log) => (
                <Card key={log.id}>
                  <CardBody>
                    <Inline gap="2" align="center">
                      {logIcon(log.type)}
                      <Badge
                        variant="soft"
                        tone={logColorScheme(log.type)}
                        size="xs"
                      >
                        {log.timestamp}
                      </Badge>
                      <Text size="xs">{log.message}</Text>
                    </Inline>
                  </CardBody>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </CardBody>
    </Card>
  );
}
