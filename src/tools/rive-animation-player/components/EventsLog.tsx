import { IconTrash2 } from '@/shared/ui/icons';
import {
  Button,
  EmptyState,
  Inline,
  Stack,
  Text,
  VirtualList,
} from '@/shared/ui';
import type { LoggedEvent } from '../hooks/useRiveEvents';

const clock = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

/** Rive events (name, properties, time) as the state machines report them. */
export function EventsLog({
  events,
  onClear,
}: {
  events: LoggedEvent[];
  onClear: () => void;
}) {
  return (
    <Stack gap="2">
      <Inline justify="between" align="center">
        <Text size="sm" tone="subtle">
          {events.length === 1 ? '1 event' : `${events.length} events`}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<IconTrash2 size="sm" />}
          onClick={onClear}
          disabled={events.length === 0}
        >
          Clear
        </Button>
      </Inline>
      {events.length === 0 ? (
        <EmptyState
          size="sm"
          title="No events yet"
          description="Events appear here when a playing state machine reports them."
        />
      ) : (
        <VirtualList
          items={events}
          estimateSize={56}
          measure
          role="log"
          ariaLabel="Rive events"
          focusModel="none"
          getKey={(e) => e.id}
          maxHeight={320}
          className="rounded-md border border-line"
          renderItem={(e) => (
            <Stack gap="0" className="border-b border-line px-3 py-2">
              <Inline justify="between" gap="2">
                <Text size="sm" weight="medium" mono>
                  {e.name}
                </Text>
                <Text as="span" size="xs" tone="subtle" mono>
                  {clock(e.at)}
                </Text>
              </Inline>
              <Text size="xs" tone="subtle" mono>
                {e.properties.length === 0
                  ? 'No properties'
                  : e.properties.map(([k, v]) => `${k}: ${v}`).join(', ')}
              </Text>
            </Stack>
          )}
        />
      )}
    </Stack>
  );
}
