import { useEffect, useRef } from 'react';
import type React from 'react';

/**
 * Moves focus into its children once, when `active` (a just-placed
 * signature's frame, a field being resized). `onLeave` runs when focus moves
 * out of it.
 */
export function FocusOnMount({
  active,
  onFocused,
  onLeave,
  children,
}: {
  active: boolean;
  onFocused?(): void;
  onLeave?(): void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    ref.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    onFocused?.();
    // Once per activation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return (
    <div
      ref={ref}
      onBlur={
        onLeave
          ? (e) => {
              if (!ref.current?.contains(e.relatedTarget as Node | null))
                onLeave();
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
