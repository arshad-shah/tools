import {
  Badge,
  Button,
  Inline,
  ListRow,
  ListRows,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import { trash } from '@arshad-shah/cynosure/icons';
import { formatBytes } from '@/shared/lib/format';
import type { HistoryItem } from '../lib/history';
import { statusTone } from '../lib/response-view';

const TONE = {
  ok: 'success',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
} as const;

interface Props {
  items: HistoryItem[];
  persist: boolean;
  onPersistChange(on: boolean): void;
  onOpen(item: HistoryItem): void;
  onClear(): void;
}

/** The last 50 sends; kept across visits only when opted in (never bodies). */
export function HistoryPanel({
  items,
  persist,
  onPersistChange,
  onOpen,
  onClear,
}: Props) {
  return (
    <Stack gap="4">
      <Switch
        label="Remember history (no bodies)"
        checked={persist}
        onChange={onPersistChange}
      />
      {items.length === 0 ? (
        <Text size="sm" tone="muted">
          Sent requests appear here.
        </Text>
      ) : (
        <Stack gap="3">
          <ListRows label="Recent requests" size="sm" divided>
            {items.map((h) => (
              <ListRow
                key={h.id}
                label={h.url}
                description={`${h.durationMs} ms, ${formatBytes(h.size)}`}
                leading={
                  <Inline gap="1">
                    <Badge size="sm" tone="neutral">
                      {h.method}
                    </Badge>
                  </Inline>
                }
                trailing={
                  <Badge size="sm" tone={TONE[statusTone(h.status)]}>
                    {h.status ? String(h.status) : 'failed'}
                  </Badge>
                }
                onClick={() => onOpen(h)}
              />
            ))}
          </ListRows>
          <Inline>
            <Button size="sm" variant="ghost" icon={trash} onClick={onClear}>
              Clear history
            </Button>
          </Inline>
        </Stack>
      )}
    </Stack>
  );
}
