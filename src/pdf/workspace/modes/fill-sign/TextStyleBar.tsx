import { useEffect, useRef, useState } from 'react';
import { IconPen, IconTrash } from '@/shared/ui/icons';
import {
  Button,
  Label,
  NumberInput,
  Popover,
  Select,
  Slider,
  Switch,
  Text,
} from '@/shared/ui';
import { InkField } from './InkField';
import {
  MAX_SIZE,
  MAX_SPACING,
  MIN_SIZE,
  TEXT_SIZES,
  type FieldStyle,
} from './text-style';

/** Restyles wait this long after the last change, so a drag is one step. */
const SETTLE_MS = 400;

export interface TextStyleBarProps {
  anchor: { getBoundingClientRect(): DOMRect };
  settings: FieldStyle;
  /** Multiline text: no letter spacing or character boxes. */
  multiline: boolean;
  /** 44px targets (Focus and phone layouts). */
  large: boolean;
  /** Changes nonce: focus the first control (Alt+T). */
  focusNonce: number;
  /** Every change, at once (the page shows it live). */
  onPreview(style: FieldStyle): void;
  /** The settled change (one undo step). */
  onChange(style: FieldStyle): void;
  onClose(): void;
  /** Free text boxes: edit and delete. */
  onEditText?(): void;
  onDelete?(): void;
}

/**
 * Text settings next to the active text box or field (plan R39): size
 * (stepper and presets), colour, letter spacing and character boxes. A
 * non-modal Popover: Tab moves on and closes it, Esc closes it, nothing
 * traps focus. Alt+T from the field reaches it.
 */
export function TextStyleBar({
  anchor,
  settings: style,
  multiline,
  large,
  focusNonce,
  onPreview,
  onChange,
  onClose,
  onEditText,
  onDelete,
}: TextStyleBarProps) {
  const [draft, setDraft] = useState(style);
  const [synced, setSynced] = useState(style);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The field's settings now (a commit may have taken the pending change).
  const latest = useRef(style);
  useEffect(() => {
    latest.current = style;
  }, [style]);
  const first = useRef<HTMLDivElement>(null);
  // A different field or an undo: start from its settings.
  if (JSON.stringify(style) !== JSON.stringify(synced)) {
    setSynced(style);
    setDraft(style);
  }
  useEffect(() => {
    if (focusNonce)
      (
        first.current?.querySelector<HTMLElement>('input') ??
        first.current?.querySelector<HTMLElement>('button, select')
      )?.focus();
  }, [focusNonce]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const set = (patch: Partial<FieldStyle>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onPreview(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (JSON.stringify(latest.current) !== JSON.stringify(next))
        onChange(next);
    }, SETTLE_MS);
  };
  const size = large ? 'lg' : 'md';
  const row = 'flex items-center gap-2';
  return (
    <Popover
      open
      onOpenChange={(o) => !o && onClose()}
      anchor={anchor}
      side="top"
      align="start"
      label="Text settings"
      modal={false}
      autoFocus={false}
      dismissOnOutside={false}
    >
      <div ref={first} className="flex w-80 max-w-full flex-col gap-3 p-1">
        <div className={row}>
          <Label htmlFor="text-size" className="w-24 shrink-0">
            Size
          </Label>
          <NumberInput
            id="text-size"
            aria-label="Text size in points"
            value={draft.size}
            min={MIN_SIZE}
            max={MAX_SIZE}
            step={0.5}
            size={size}
            onValueChange={(v) => set({ size: v })}
            className="w-28 shrink-0"
          />
          <Select
            aria-label="Text size presets"
            value={TEXT_SIZES.includes(draft.size) ? String(draft.size) : ''}
            items={[
              { value: '', label: 'Preset' },
              ...TEXT_SIZES.map((s) => ({
                value: String(s),
                label: `${s} pt`,
              })),
            ]}
            onValueChange={(v) => v && set({ size: Number(v) })}
            className={large ? 'h-11 w-24 shrink-0' : 'w-24 shrink-0'}
          />
        </div>
        <div className="min-w-0">
          <InkField
            label="Text colour"
            value={draft.color}
            onChange={(color) => set({ color })}
          />
        </div>
        {multiline ? (
          <Text size="xs" tone="muted">
            Letter spacing and character boxes apply to single-line text.
          </Text>
        ) : (
          <>
            <div className={row}>
              <Label htmlFor="text-spacing" className="w-24 shrink-0">
                Letter spacing
              </Label>
              <Slider
                aria-label="Letter spacing"
                value={draft.spacing}
                min={0}
                max={MAX_SPACING}
                step={0.5}
                onValueChange={(v) => set({ spacing: v })}
                className={large ? 'h-11 flex-1' : 'flex-1'}
              />
              <NumberInput
                id="text-spacing"
                aria-label="Letter spacing in points"
                value={draft.spacing}
                min={0}
                max={MAX_SPACING}
                step={0.5}
                size={size}
                onValueChange={(v) => set({ spacing: v })}
                className="w-28"
              />
            </div>
            <div className={row}>
              <Label htmlFor="text-comb" className="w-24 shrink-0">
                Character boxes
              </Label>
              <div
                className={
                  large ? 'flex min-h-11 items-center' : 'flex items-center'
                }
              >
                <Switch
                  id="text-comb"
                  aria-label="Character boxes"
                  checked={draft.comb > 0}
                  onCheckedChange={(on) => set({ comb: on ? 8 : 0 })}
                />
              </div>
              <NumberInput
                aria-label="Number of character boxes"
                value={draft.comb || 8}
                min={1}
                max={100}
                size={size}
                disabled={draft.comb === 0}
                onValueChange={(v) => set({ comb: Math.round(v) })}
                className="w-28"
              />
            </div>
          </>
        )}
        {onEditText || onDelete ? (
          <div className="flex gap-2">
            {onEditText ? (
              <Button
                size={large ? 'lg' : 'sm'}
                variant="secondary"
                leftIcon={<IconPen size="sm" />}
                onClick={onEditText}
              >
                Edit text
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                size={large ? 'lg' : 'sm'}
                variant="danger"
                leftIcon={<IconTrash size="sm" />}
                onClick={onDelete}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Popover>
  );
}
