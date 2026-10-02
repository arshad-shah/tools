import { useId, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatColor, gamutMap, type Color } from '@/shared/lib/colour';
import { useMediaQuery } from '@/shared/lib/media-query';
import { ColorPicker, type ColorPickerProps } from './color-picker';
import { tryParse } from './color-picker-model';
import { Drawer } from './drawer';
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

/** Phones get the picker in a bottom sheet. */
const PHONE = '(max-width: 639px)';
/** The popover's padding plus the gap to its anchor and the viewport edge. */
const POPOVER_CHROME = 40;

/**
 * Compact colour field (ruling R30): a swatch button that opens the
 * ColorPicker (a popover on desktop, a bottom sheet on phones; neither is
 * clipped by the viewport), and a text field taking any CSS colour
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
  const phone = useMediaQuery(PHONE);
  // The popover scrolls within the taller side of its anchor.
  const [room, setRoom] = useState(480);
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

  const pickerEl = (
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
  );

  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-1', className)}>
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
          onClick={() => {
            const r = trigger.current?.getBoundingClientRect();
            if (r)
              setRoom(
                Math.max(r.top, window.innerHeight - r.bottom) - POPOVER_CHROME,
              );
            setOpen((o) => !o);
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden className="flex">
            <Swatch color={swatchColor} label={label} />
          </span>
        </button>
        <div className="min-w-0 flex-1">
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
      </div>
      {parsed.error && (
        <p id={errorId} className="text-xs text-danger">
          {parsed.error}
        </p>
      )}
      {phone ? (
        <Drawer open={open} onOpenChange={setOpen} side="bottom" title={label}>
          {pickerEl}
        </Drawer>
      ) : (
        <Popover
          open={open}
          onOpenChange={setOpen}
          anchor={trigger}
          label={label}
          // The picker fills 20rem; the surface adds its 0.75rem padding.
          className="w-[21.5rem] max-w-[calc(100vw-1rem)] p-0"
        >
          <div
            data-color-field-body
            className="overflow-y-auto p-3"
            style={{ maxHeight: `${Math.max(240, room)}px` }}
          >
            {pickerEl}
          </div>
        </Popover>
      )}
    </div>
  );
}
ColorField.displayName = 'ColorField';
