import { useEffect, useRef } from 'react';
import type { Rive } from '@rive-app/react-canvas';
import { attachSpeedControl } from '../lib/speed';

/**
 * Applies `speed` to the loaded instance, attaching the speed control once
 * per instance. Returns false when the runtime cannot change speed.
 */
export function useSpeed(rive: Rive | null, speed: number): boolean {
  const attached = useRef<{
    rive: Rive | null;
    set: ((s: number) => void) | null;
  }>({ rive: null, set: null });
  useEffect(() => {
    if (!rive) return;
    if (attached.current.rive !== rive)
      attached.current = { rive, set: attachSpeedControl(rive) };
    attached.current.set?.(speed);
  }, [rive, speed]);
  // The member attachSpeedControl wraps (it stays a function once wrapped).
  return (
    !rive ||
    typeof (rive as unknown as { _boundDraw?: unknown })._boundDraw ===
      'function'
  );
}
