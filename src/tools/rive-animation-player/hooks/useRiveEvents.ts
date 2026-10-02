import { useEffect, useState } from 'react';
import { EventType, type Rive } from '@rive-app/react-canvas';

export interface LoggedEvent {
  id: number;
  name: string;
  /** `key: value` pairs, in the order the file defines them. */
  properties: [string, string][];
  /** ms since the epoch. */
  at: number;
}

const MAX = 1000;
let nextId = 1;

interface Payload {
  name?: unknown;
  properties?: Record<string, unknown>;
}

/** Rive events reported by the instance's state machines, newest last. */
export function useRiveEvents(rive: Rive | null) {
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  useEffect(() => {
    if (!rive) return;
    const onEvent = (e: { data?: unknown }) => {
      const data = (e.data ?? {}) as Payload;
      const entry: LoggedEvent = {
        id: nextId++,
        name: typeof data.name === 'string' ? data.name : 'Unnamed event',
        properties: Object.entries(data.properties ?? {}).map(([k, v]) => [
          k,
          String(v),
        ]),
        at: Date.now(),
      };
      setEvents((list) => [...list, entry].slice(-MAX));
    };
    rive.on(EventType.RiveEvent, onEvent);
    return () => rive.off(EventType.RiveEvent, onEvent);
  }, [rive]);
  return { events, clear: () => setEvents([]) };
}
