import { formatBytes } from '@/shared/lib/format';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Label,
  Stack,
  Switch,
  Text,
} from '@/shared/ui';
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
    <Stack gap="2">
      <Inline gap="2" align="center">
        <Switch
          id="history-persist"
          checked={persist}
          onCheckedChange={onPersistChange}
        />
        <Label htmlFor="history-persist">Remember history (no bodies)</Label>
      </Inline>
      {items.length === 0 ? (
        <Text size="sm" tone="subtle">
          Sent requests appear here.
        </Text>
      ) : (
        <Stack gap="1">
          {items.map((h) => (
            <Card key={h.id} interactive onClick={() => onOpen(h)}>
              <CardBody>
                <Stack gap="1">
                  <Inline gap="2" align="center">
                    <Badge variant="soft" tone="neutral" size="xs">
                      {h.method}
                    </Badge>
                    <Badge
                      variant="soft"
                      tone={TONE[statusTone(h.status)]}
                      size="xs"
                    >
                      {h.status || 'failed'}
                    </Badge>
                    <Text size="xs" tone="muted">
                      {h.durationMs} ms, {formatBytes(h.size)}
                    </Text>
                  </Inline>
                  <Text size="xs" className="truncate font-mono">
                    {h.url}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          ))}
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear history
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
