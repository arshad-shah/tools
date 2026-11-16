import {
  Button,
  EmptyState,
  Icon,
  Inline,
  ListRow,
  ListRows,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  alertCircle,
  checkCircle,
  close,
  info,
  type IconData,
} from '@arshad-shah/cynosure/icons';
import type { DebugLog as DebugLogEntry } from '../types';

const TONE = {
  error: 'danger',
  warning: 'warning',
  success: 'success',
  info: undefined,
} as const;

const ICON: Record<DebugLogEntry['type'], IconData> = {
  error: alertCircle,
  warning: alertCircle,
  success: checkCircle,
  info,
};

/** The player's own log: loading steps, warnings and errors. */
export function DebugLog({
  debugLogs,
  onClear,
}: {
  debugLogs: DebugLogEntry[];
  onClear: () => void;
}) {
  return (
    <Stack gap="3">
      <Inline justify="between" align="center">
        <Text size="sm" tone="muted">
          {debugLogs.length === 1 ? '1 entry' : `${debugLogs.length} entries`}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          icon={close}
          onClick={onClear}
          disabled={debugLogs.length === 0}
        >
          Clear log
        </Button>
      </Inline>
      {debugLogs.length === 0 ? (
        <EmptyState
          size="sm"
          title="No logs yet"
          description="Load a file to see debug information."
        />
      ) : (
        <ListRows label="Debug logs" size="sm" divided>
          {debugLogs.map((log) => (
            <ListRow
              key={log.id}
              label={log.message}
              tone={TONE[log.type]}
              leading={<Icon icon={ICON[log.type]} />}
              trailing={log.timestamp}
              wrap
            />
          ))}
        </ListRows>
      )}
    </Stack>
  );
}
