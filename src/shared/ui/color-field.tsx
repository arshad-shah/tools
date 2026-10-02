import { useId, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatColor, gamutMap, type Color } from '@/shared/lib/colour';
import { ColorPicker, type ColorPickerProps } from './color-picker';
import { tryParse } from './color-picker-model';
import { Input } from './input';
import { Popover } from './popover';
import { Swatch } from './swatch';

export interface ColorFieldProps extends Pick<
  ColorPickerProps,
  | 'mode'
  | 'alpha'
  | 'recent'
  | 'palette'
  | 'showRamp'
  | 'showEyeDropper'
  | 'defaultFormat'
> {
  /** Visible label of the field. */
  label: string;
  /** Any CSS colour. */
  value: string;
  onChange(css: string, color: Color): void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Compact colour field (ruling R30): a swatch button that opens the
 * ColorPicker in a popover, and a text field taking any CSS colour
 * (validated with `parseColor`, errors shown inline).
 */
export function ColorField({
  label,
  value,
  onChange,
  disabled,
  id,
  className,
  ...picker
}: ColorFieldProps) {
  const auto = useId();
  const inputId = id ?? `${auto}-input`;
  const errorId = `${auto}-error`;
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [prop, setProp] = useState(value);
  // A new value from outside replaces the draft (render-phase sync).
  if (prop !== value) {
    setProp(value);
    setDraft(value);
  }
  const parsed = tryParse(draft);
  const current = tryParse(value);
  const swatchColor = current.color
    ? formatColor(gamutMap(current.color), 'rgb')
    : 'transparent';

  const onText = (t: string) => {
    setDraft(t);
    const p = tryParse(t);
    if (p.color) {
      setProp(t);
      onChange(t.trim(), p.color);
    }
  };

  return (
    <div className={cn('grid gap-1', className)}>
      <label htmlFor={inputId} className="text-sm text-fg-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          ref={trigger}
          type="button"
          aria-label={`Choose ${label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden className="flex">
            <Swatch color={swatchColor} label={label} />
          </span>
        </button>
        <Input
          id={inputId}
          value={draft}
          onChange={onText}
          disabled={disabled}
          invalid={!!parsed.error}
          aria-invalid={parsed.error ? true : undefined}
          aria-describedby={parsed.error ? errorId : undefined}
          spellCheck={false}
          autoComplete="off"
          className="font-mono"
        />
      </div>
      {parsed.error && (
        <p id={errorId} className="text-xs text-danger">
          {parsed.error}
        </p>
      )}
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={trigger}
        label={label}
        className="w-72"
      >
        <ColorPicker
          {...picker}
          label={label}
          value={value}
          onChange={(css, c) => {
            setProp(css);
            setDraft(css);
            onChange(css, c);
          }}
        />
      </Popover>
    </div>
  );
}
ColorField.displayName = 'ColorField';
