import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  check,
  columns,
  edit as editIcon,
  palette,
  sliders,
  trash,
} from '@arshad-shah/cynosure/icons';
import {
  ColorField,
  ColorSwatches,
  Divider,
  DockedToolbar,
  FloatingToolbar,
  IconButton,
  Inline,
  NumberField,
  Popover,
  Select,
  Sheet,
  Slider,
  Stack,
  Switch,
  Text,
} from '@arshad-shah/cynosure';
import {
  MAX_SIZE,
  MAX_SPACING,
  MIN_SIZE,
  TEXT_COLORS,
  TEXT_SIZES,
  type FieldStyle,
} from './text-style';

/** Restyles wait this long after the last change, so a drag is one step. */
const SETTLE_MS = 400;
const MAX_COMB = 100;
const DEFAULT_COMB = 8;

export interface TextStyleBarProps {
  /** The active box on screen. */
  anchor: { getBoundingClientRect(): DOMRect };
  settings: FieldStyle;
  /** Multiline text: no letter spacing or character boxes. */
  multiline: boolean;
  /**
   * phone: one row docked above the on-screen keyboard; otherwise a
   * compact bar anchored above the box.
   */
  layout: 'standard' | 'focus' | 'phone';
  /** Changes nonce: focus the first control (Alt+T). */
  focusNonce: number;
  /** Every change, at once (the page shows it live). */
  onPreview(style: FieldStyle): void;
  /** The settled change (one undo step). */
  onChange(style: FieldStyle): void;
  /** Esc: the bar closes, the text and any editor stay. */
  onClose(): void;
  /** Done: keep the text and finish with the box. */
  onDone(): void;
  /** Free text boxes: edit and delete. */
  onEditText?(): void;
  onDelete?(): void;
  /** An element inside the scrolling document (phone: keeps the box in view). */
  scrollRoot?: () => Element | null;
  /** The active box's key (phone: reveal it again when it changes). */
  boxKey?: string;
}

/** Cynosure's NumberField as the bar's stepper: a value, smaller and larger. */
function Stepper({
  label,
  less,
  more,
  value,
  min,
  max,
  step,
  large,
  onSet,
}: {
  label: string;
  less: string;
  more: string;
  value: number;
  min: number;
  max: number;
  step: number;
  large: boolean;
  onSet(v: number): void;
}) {
  return (
    <NumberField
      label={label}
      labelHidden
      size={large ? 'lg' : 'sm'}
      value={value}
      min={min}
      max={max}
      step={step}
      labels={{ decrement: less, increment: more }}
      onChange={(v) => v !== null && onSet(v)}
    />
  );
}

/**
 * Text settings for the active text box or field (ruling R39), shaped like
 * the Fill & Sign bars of Acrobat and Edge: size, colour, letter spacing
 * and character boxes in one slim row, everything else under More. On a
 * desktop it is a mini toolbar above the box (flipping below when there
 * is no room), on a phone a bar docked above the keyboard that scrolls
 * the document to keep the box in view. It never covers the box. Esc
 * closes it and returns to the text; Tab moves on.
 */
export function TextStyleBar({
  anchor,
  settings: style,
  multiline,
  layout,
  focusNonce,
  onPreview,
  onChange,
  onClose,
  onDone,
  onEditText,
  onDelete,
  scrollRoot,
  boxKey,
}: TextStyleBarProps) {
  const [draft, setDraft] = useState(style);
  const [synced, setSynced] = useState(style);
  const [more, setMore] = useState(false);
  const [colours, setColours] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The field's settings now (a commit may have taken the pending change).
  const latest = useRef(style);
  useEffect(() => {
    latest.current = style;
  }, [style]);
  const row = useRef<HTMLElement>(null);
  // A different field or an undo: start from its settings.
  if (JSON.stringify(style) !== JSON.stringify(synced)) {
    setSynced(style);
    setDraft(style);
  }
  useEffect(() => {
    if (focusNonce)
      (
        row.current?.querySelector<HTMLElement>('input') ??
        row.current?.querySelector<HTMLElement>('button')
      )?.focus();
  }, [focusNonce]);
  // A change still settling when the bar closes (Done, Esc) lands at once.
  const pending = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      pending.current?.();
    },
    [],
  );

  const set = (patch: Partial<FieldStyle>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onPreview(next);
    if (timer.current) clearTimeout(timer.current);
    pending.current = () => {
      pending.current = null;
      if (JSON.stringify(latest.current) !== JSON.stringify(next))
        onChange(next);
    };
    timer.current = setTimeout(() => pending.current?.(), SETTLE_MS);
  };

  const phone = layout === 'phone';
  const touch = layout !== 'standard';
  const size = touch ? 'lg' : 'sm';
  const combOn = draft.comb > 0;
  const controls = (
    <Inline gap="1" align="center" ref={row}>
      <Stepper
        label="Text size in points"
        less="Smaller text"
        more="Larger text"
        value={draft.size}
        min={MIN_SIZE}
        max={MAX_SIZE}
        step={0.5}
        large={touch}
        onSet={(v) => set({ size: v })}
      />
      <Popover
        label="Text colour"
        open={colours}
        onOpenChange={setColours}
        placement={phone ? 'top' : 'bottom'}
        trigger={(t) => (
          <IconButton
            {...t}
            label="Text colour"
            icon={palette}
            iconColor={draft.color}
            variant="ghost"
            size={size}
          />
        )}
      >
        <ColorSwatches
          label="Text colour"
          swatches={[...TEXT_COLORS]}
          value={draft.color}
          onChange={(color) => set({ color })}
        />
      </Popover>
      {multiline ? null : (
        <>
          <Divider orientation="vertical" spacing="sm" />
          <Stepper
            label="Letter spacing in points"
            less="Tighter letter spacing"
            more="Wider letter spacing"
            value={draft.spacing}
            min={0}
            max={MAX_SPACING}
            step={0.5}
            large={touch}
            onSet={(v) => set({ spacing: v })}
          />
          <IconButton
            label="Character boxes"
            pressed={combOn}
            icon={columns}
            variant={combOn ? 'soft' : 'ghost'}
            tone={combOn ? 'accent' : 'neutral'}
            size={size}
            onClick={() => set({ comb: combOn ? 0 : DEFAULT_COMB })}
          />
          {combOn ? (
            <Stepper
              label="Number of character boxes"
              less="Fewer boxes"
              more="More boxes"
              value={draft.comb}
              min={1}
              max={MAX_COMB}
              step={1}
              large={touch}
              onSet={(v) => set({ comb: Math.round(v) })}
            />
          ) : null}
        </>
      )}
      {onEditText || onDelete ? (
        <Divider orientation="vertical" spacing="sm" />
      ) : null}
      {onEditText ? (
        <IconButton
          label="Edit text"
          icon={editIcon}
          variant="ghost"
          size={size}
          onClick={onEditText}
        />
      ) : null}
      {onDelete ? (
        <IconButton
          label="Delete"
          icon={trash}
          tone="danger"
          variant="ghost"
          size={size}
          onClick={onDelete}
        />
      ) : null}
      <Divider orientation="vertical" spacing="sm" />
      {phone ? (
        <IconButton
          label="More text settings"
          aria-haspopup="dialog"
          aria-expanded={more}
          icon={sliders}
          variant="ghost"
          size={size}
          onClick={() => setMore(true)}
        />
      ) : (
        <Popover
          label="More text settings"
          open={more}
          onOpenChange={setMore}
          placement="bottom"
          size="md"
          trigger={(t) => (
            <IconButton
              {...t}
              label="More text settings"
              icon={sliders}
              variant="ghost"
              size={size}
            />
          )}
        >
          <TextSettingsPanel
            value={draft}
            multiline={multiline}
            onChange={set}
          />
        </Popover>
      )}
    </Inline>
  );
  const done = (
    <IconButton
      label="Done"
      icon={check}
      variant="soft"
      tone="accent"
      size={size}
      onClick={onDone}
    />
  );

  // The box being typed in, kept in view above the phone bar.
  const keep: RefObject<Element | null> = {
    get current() {
      return boxKey
        ? (scrollRoot?.()?.ownerDocument.querySelector(
            `[data-testid="field-${CSS.escape(boxKey)}"]`,
          ) ?? null)
        : null;
    },
  };

  return (
    <>
      {phone ? (
        <DockedToolbar
          label="Text settings"
          onEscape={onClose}
          keepVisible={keep}
          trailing={done}
        >
          {controls}
        </DockedToolbar>
      ) : (
        <FloatingToolbar
          anchor={anchor}
          label="Text settings"
          onEscape={onClose}
        >
          {controls}
          {done}
        </FloatingToolbar>
      )}
      {phone ? (
        <Sheet
          open={more}
          onOpenChange={setMore}
          side="bottom"
          title="Text settings"
        >
          <TextSettingsPanel
            value={draft}
            multiline={multiline}
            onChange={set}
          />
        </Sheet>
      ) : null}
    </>
  );
}

/**
 * Every text setting with room to breathe (the More sheet): size with
 * presets, the full colour picker, letter spacing with a slider, and
 * character boxes with their count.
 */
function TextSettingsPanel({
  value: style,
  multiline,
  onChange,
}: {
  value: FieldStyle;
  multiline: boolean;
  onChange(patch: Partial<FieldStyle>): void;
}) {
  const CUSTOM = 'custom';
  return (
    <Stack gap="5">
      <Inline gap="3" align="end" wrap>
        <NumberField
          label="Size in points"
          value={style.size}
          min={MIN_SIZE}
          max={MAX_SIZE}
          step={0.5}
          labels={{ decrement: 'Smaller text', increment: 'Larger text' }}
          onChange={(v) => v !== null && onChange({ size: v })}
        />
        <Select
          label="Text size presets"
          labelHidden
          value={TEXT_SIZES.includes(style.size) ? String(style.size) : CUSTOM}
          options={[
            { value: CUSTOM, label: 'Custom' },
            ...TEXT_SIZES.map((s) => ({ value: String(s), label: `${s} pt` })),
          ]}
          onChange={(v) => v !== CUSTOM && onChange({ size: Number(v) })}
        />
      </Inline>
      <ColorField
        label="Text colour"
        value={style.color}
        swatches={[...TEXT_COLORS]}
        onChange={(color) => onChange({ color })}
      />
      {multiline ? (
        <Text as="p" size="sm" tone="muted">
          Letter spacing and character boxes apply to single-line text.
        </Text>
      ) : (
        <>
          <Slider
            label="Letter spacing"
            showValue
            labels={{ value: (v) => `${v} pt` }}
            value={style.spacing}
            min={0}
            max={MAX_SPACING}
            step={0.5}
            onChange={(v) => onChange({ spacing: Number(v) })}
          />
          <Stack gap="3">
            <Switch
              label="Character boxes"
              checked={style.comb > 0}
              onChange={(on) => onChange({ comb: on ? DEFAULT_COMB : 0 })}
            />
            {style.comb > 0 ? (
              <NumberField
                label="Number of character boxes"
                value={style.comb}
                min={1}
                max={MAX_COMB}
                labels={{ decrement: 'Fewer boxes', increment: 'More boxes' }}
                onChange={(v) =>
                  v !== null && onChange({ comb: Math.round(v) })
                }
              />
            ) : null}
          </Stack>
        </>
      )}
    </Stack>
  );
}
