import React, { useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';

export interface BitGridProps {
  bits: 8 | 16 | 32 | 64;
  value: bigint;
  /** Called with the bit index (0 is the least significant). */
  onToggle?(index: number): void;
  readOnly?: boolean;
  /** Accessible name of the group. */
  label?: string;
  className?: string;
}

const isSet = (value: bigint, i: number) => ((value >> BigInt(i)) & 1n) === 1n;

/**
 * Bits as toggle buttons, most significant first, grouped by byte and
 * nibble with index labels. One tab stop: arrows move between bits, Home
 * goes to the most significant and End to bit 0.
 */
export const BitGrid: React.FC<BitGridProps> = ({
  bits,
  value,
  onToggle,
  readOnly,
  label = 'Bits',
  className,
}) => {
  const [active, setActive] = useState(bits - 1);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.min(active, bits - 1);
  const inert = readOnly || !onToggle;

  const move = (to: number) => {
    const i = Math.min(bits - 1, Math.max(0, to));
    setActive(i);
    refs.current[i]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const keys: Record<string, number> = {
      ArrowRight: i - 1,
      ArrowDown: i - 1,
      ArrowLeft: i + 1,
      ArrowUp: i + 1,
      Home: bits - 1,
      End: 0,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    move(keys[e.key]);
  };

  const renderBit = (i: number) => {
    const on = isSet(value, i);
    return (
      <span key={i} className="flex flex-col items-center gap-0.5">
        <button
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          aria-label={`Bit ${i}, ${on ? 'set' : 'clear'}`}
          aria-pressed={on}
          aria-disabled={inert || undefined}
          tabIndex={i === current ? 0 : -1}
          onFocus={() => setActive(i)}
          onKeyDown={(e) => onKeyDown(e, i)}
          onClick={() => {
            if (!inert) onToggle?.(i);
          }}
          className={cn(
            'flex size-8 items-center justify-center rounded-md border font-mono text-sm transition-colors duration-fast pointer-coarse:size-11',
            'outline-none focus-visible:ring-2 focus-visible:ring-focus',
            on
              ? 'border-accent-indicator bg-accent text-accent-ink'
              : 'border-line-control bg-surface text-fg-muted',
            inert ? 'cursor-default' : 'hover:border-accent-indicator',
          )}
        >
          {on ? '1' : '0'}
        </button>
        <span aria-hidden className="font-mono text-xs text-fg-subtle">
          {i}
        </span>
      </span>
    );
  };

  const bytes = Array.from({ length: bits / 8 }, (_, b) => bits / 8 - 1 - b);
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-wrap gap-x-4 gap-y-3', className)}
    >
      {bytes.map((b) => (
        // A byte's nibbles wrap onto two lines when 44 px touch bits
        // would not fit (8 bits are wider than a 360 px phone).
        <div key={b} data-byte={b} className="flex flex-wrap gap-2">
          {[1, 0].map((n) => {
            const top = b * 8 + n * 4 + 3;
            return (
              <div key={n} data-nibble="" className="flex gap-1">
                {[0, 1, 2, 3].map((k) => renderBit(top - k))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
BitGrid.displayName = 'BitGrid';
