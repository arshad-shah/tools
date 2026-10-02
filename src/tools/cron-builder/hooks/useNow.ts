import { useEffect, useState } from 'react';

const MINUTE = 60_000;

/**
 * The current time, refreshed as each minute turns (cron runs fall on whole
 * minutes, so the next-runs list moves on exactly when its first run
 * passes). One timeout per minute, re-aligned on every tick.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setNow(Date.now());
          schedule();
        },
        MINUTE - (Date.now() % MINUTE),
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return now;
}
