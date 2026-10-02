import { useEffect, useRef, useState } from 'react';

/**
 * `value`, updated at most once per `ms`: the first change after a quiet
 * period shows at once, later ones are batched into one trailing update.
 * For live regions that must not chatter (spec §4.1 status line).
 */
export function useThrottled<T>(value: T, ms: number): T {
  const [shown, setShown] = useState(value);
  const last = useRef(0);
  useEffect(() => {
    if (Object.is(value, shown)) return;
    const wait = Math.max(0, last.current + ms - Date.now());
    const t = setTimeout(() => {
      last.current = Date.now();
      setShown(value);
    }, wait);
    return () => clearTimeout(t);
  }, [value, shown, ms]);
  return shown;
}
