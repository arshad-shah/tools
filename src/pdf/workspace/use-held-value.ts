import { useEffect, useRef, useState } from 'react';

/**
 * `value`, except that while a pointer is held down anywhere it keeps
 * showing the value from before the press, catching up on release. Layout
 * that follows the selection (the inspector opening) then waits until a
 * press-and-drag on a placed object ends, so the page does not move under
 * the pointer.
 */
export function useHeldValue<T>(value: T): T {
  const [shown, setShown] = useState(value);
  const held = useRef(false);
  const latest = useRef(value);

  useEffect(() => {
    const down = () => {
      held.current = true;
    };
    const up = () => {
      held.current = false;
      setShown(latest.current);
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
    };
  }, []);

  useEffect(() => {
    latest.current = value;
    if (!held.current) setShown(value);
  }, [value]);

  return shown;
}
