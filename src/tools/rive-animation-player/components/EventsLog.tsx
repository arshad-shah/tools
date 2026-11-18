import {
  Button,
  EmptyState,
  Inline,
  ListRow,
  ListRows,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { trash } from '@arshad-shah/cynosure/icons';
import type { LoggedEvent } from '../hooks/useRiveEvents';

const clock = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

/** Events shown at once: the newest (ScrollArea has no height cap, gaps doc). */
const SHOWN = 100;

/** Rive events (name, properties, time) as the state machines report them. */
export function EventsLog({
  events,
  onClear,
}: {
  events: LoggedEvent[];
  onClear: () => void;
}) {
  const shown = events.slice(-SHOWN);
  return (
    <Stack gap="3">
      <Inline justify="between" align="center">
        <Text size="sm" tone="muted">
          {events.length === 1 ? '1 event' : `${events.length} events`}
        </Text>
        {events.length > 0 ? (
          <Button variant="ghost" size="sm" icon={trash} onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </Inline>
      {events.length === 0 ? (
        <EmptyState
          size="sm"
          title="No events yet"
          description="Events appear here when a playing state machine reports them."
        />
      ) : (
        <Stack role="log" aria-label="Rive events">
          <ListRows label="Rive events" size="sm" divided>
            {shown.map((e) => (
              <ListRow
                key={e.id}
                label={e.name}
                description={
                  e.properties.length === 0
                    ? 'No properties'
                    : e.properties.map(([k, v]) => `${k}: ${v}`).join(', ')
                }
                mono="description"
                trailing={clock(e.at)}
              />
            ))}
          </ListRows>
        </Stack>
      )}
    </Stack>
  );
}
