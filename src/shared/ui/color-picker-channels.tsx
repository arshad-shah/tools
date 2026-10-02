import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import type { Channel } from './color-picker-model';
import { Input } from './input';

export interface ChannelFieldsProps {
  /** Accessible name of the group, for example "RGB channels". */
  label: string;
  channels: readonly Channel[];
  /** A channel holds a valid number in range. */
  onChannel(index: number, value: number): void;
  /** A field lost focus (the edit is settled). */
  onCommit?(): void;
  className?: string;
}

/**
 * Per-channel number fields on a grid (R, G, B; H, S, L; ...). Each field
 * keeps what is typed until it is a number in range, then reports it; on
 * blur it shows the channel's value again.
 */
export function ChannelFields({
  label,
  channels,
  onChannel,
  onCommit,
  className,
}: ChannelFieldsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('grid gap-2', className)}
      style={{
        gridTemplateColumns: `repeat(${channels.length}, minmax(0, 1fr))`,
      }}
    >
      {channels.map((c, i) => (
        <ChannelField
          key={c.label}
          channel={c}
          onValue={(v) => onChannel(i, v)}
          onCommit={onCommit}
        />
      ))}
    </div>
  );
}
ChannelFields.displayName = 'ChannelFields';

function ChannelField({
  channel,
  onValue,
  onCommit,
}: {
  channel: Channel;
  onValue(v: number): void;
  onCommit?(): void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const { label, short, min, max, step, value } = channel;
  const text = draft ?? String(value);
  const n = Number(text);
  const invalid =
    text.trim() === '' || !Number.isFinite(n) || n < min || n > max;
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
      <span aria-hidden className="text-center text-xs text-fg-muted">
        {short}
      </span>
      <Input
        type="number"
        inputMode="decimal"
        aria-label={label}
        value={text}
        min={min}
        max={max}
        step={step}
        invalid={draft !== null && invalid}
        aria-invalid={(draft !== null && invalid) || undefined}
        onChange={(t) => {
          setDraft(t);
          const v = Number(t);
          if (t.trim() !== '' && Number.isFinite(v) && v >= min && v <= max)
            onValue(v);
        }}
        onBlur={() => {
          setDraft(null);
          onCommit?.();
        }}
        className="text-center font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}
