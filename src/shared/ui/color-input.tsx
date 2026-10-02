import { useId, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Input } from './input';

const HEX = /^#[0-9a-f]{6}$/i;

export interface ColorInputProps {
  label: string;
  /** #rrggbb */
  value: string;
  onChange(hex: string): void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Colour field: a native colour chooser (kit-owned) and a hex text field
 * that only reports valid `#rrggbb` values.
 */
export function ColorInput({
  label,
  value,
  onChange,
  disabled,
  className,
  id,
}: ColorInputProps) {
  const auto = useId();
  const textId = id ?? `${auto}-hex`;
  const [draft, setDraft] = useState(value);
  const [prop, setProp] = useState(value);
  // A new value from outside replaces the draft (render-phase sync).
  if (prop !== value) {
    setProp(value);
    setDraft(value);
  }
  const invalid = !HEX.test(draft);
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative inline-flex size-9 shrink-0 overflow-hidden pointer-coarse:size-11 rounded-md border border-line-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={HEX.test(value) ? value.toLowerCase() : '#000000'}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed"
        />
      </span>
      <div className="w-32">
        <Input
          id={textId}
          aria-label={label}
          value={draft}
          invalid={invalid}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          spellCheck={false}
          maxLength={7}
          className="font-mono"
          onChange={(v) => {
            const next = v.startsWith('#') ? v : `#${v}`;
            setDraft(next);
            if (HEX.test(next)) onChange(next.toLowerCase());
          }}
        />
      </div>
    </div>
  );
}
ColorInput.displayName = 'ColorInput';
