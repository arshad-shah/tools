import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs`. With `align`, each tick
 * lands on a whole interval (a minute tick turns with the clock's minute),
 * re-aligned on every tick.
 */
export function useNow(
  intervalMs: number,
  { align = false }: { align?: boolean } = {},
): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait = align ? intervalMs - (Date.now() % intervalMs) : intervalMs;
      timer = setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, wait);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [intervalMs, align]);
  return now;
}
