import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  IconArrowRightLeft,
  IconCheck,
  IconColumns,
  IconHash,
  IconPen,
  IconSettings2,
  IconTrash,
  IconType,
} from '@/shared/ui/icons';
import {
  AnchoredToolbar,
  ColorPicker,
  ColorSwatchPicker,
  DockedToolbar,
  Drawer,
  IconButton,
  Label,
  Popover,
  Select,
  Slider,
  Stepper,
  Swatch,
  Switch,
  Text,
  ToolbarDivider,
  Tooltip,
  type VirtualAnchor,
} from '@/shared/ui';
import { formatColor } from '@/shared/lib/colour';
import { cn } from '@/shared/lib/cn';
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
  anchor: VirtualAnchor;
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
  const row = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const colourButton = useRef<HTMLButtonElement>(null);
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
  const tips = !phone;
  const tip = (content: string, node: React.ReactElement) =>
    tips ? <Tooltip content={content}>{node}</Tooltip> : node;
  const cue = (Icon: typeof IconType) => (
    <span aria-hidden className="flex shrink-0 pl-1 text-fg-subtle">
      <Icon size="sm" />
    </span>
  );
  const combOn = draft.comb > 0;

  const controls = (
    <div ref={row} className="contents">
      {cue(IconType)}
      <Stepper
        value={draft.size}
        min={MIN_SIZE}
        max={MAX_SIZE}
        step={0.5}
        label="Text size in points"
        decrementLabel="Smaller text"
        incrementLabel="Larger text"
        size={touch ? 'lg' : 'md'}
        tooltips={tips}
        onValueChange={(v) => set({ size: v })}
        className="border-transparent bg-transparent"
      />
      {tip(
        'Text colour',
        <IconButton
          ref={colourButton}
          label="Text colour"
          aria-haspopup="dialog"
          aria-expanded={colours}
          icon={<Swatch color={draft.color} label={draft.color} size="sm" />}
          variant="ghost"
          size={size}
          onClick={() => setColours((o) => !o)}
          className="shrink-0"
        />,
      )}
      {multiline ? null : (
        <>
          <ToolbarDivider />
          {cue(IconArrowRightLeft)}
          <Stepper
            value={draft.spacing}
            min={0}
            max={MAX_SPACING}
            step={0.5}
            label="Letter spacing in points"
            decrementLabel="Tighter letter spacing"
            incrementLabel="Wider letter spacing"
            size={touch ? 'lg' : 'md'}
            tooltips={tips}
            onValueChange={(v) => set({ spacing: v })}
            className="border-transparent bg-transparent"
          />
          <ToolbarDivider />
          {tip(
            'Character boxes',
            <IconButton
              label="Character boxes"
              aria-pressed={combOn}
              icon={IconColumns}
              variant="ghost"
              size={size}
              onClick={() => set({ comb: combOn ? 0 : DEFAULT_COMB })}
              className={cn(
                'shrink-0',
                combOn && 'bg-accent-soft text-accent-fg hover:text-accent-fg',
              )}
            />,
          )}
          {combOn ? (
            <>
              {cue(IconHash)}
              <Stepper
                value={draft.comb}
                min={1}
                max={MAX_COMB}
                label="Number of character boxes"
                decrementLabel="Fewer boxes"
                incrementLabel="More boxes"
                size={touch ? 'lg' : 'md'}
                tooltips={tips}
                onValueChange={(v) => set({ comb: Math.round(v) })}
                className="border-transparent bg-transparent"
              />
            </>
          ) : null}
        </>
      )}
      {onEditText || onDelete ? <ToolbarDivider /> : null}
      {onEditText
        ? tip(
            'Edit text',
            <IconButton
              label="Edit text"
              icon={IconPen}
              variant="ghost"
              size={size}
              onClick={onEditText}
              className="shrink-0"
            />,
          )
        : null}
      {onDelete
        ? tip(
            'Delete',
            <IconButton
              label="Delete"
              icon={IconTrash}
              tone="danger"
              variant="ghost"
              size={size}
              onClick={onDelete}
              className="shrink-0"
            />,
          )
        : null}
      <ToolbarDivider />
      {tip(
        'More text settings',
        <IconButton
          ref={moreButton}
          label="More text settings"
          aria-haspopup="dialog"
          aria-expanded={more}
          icon={IconSettings2}
          variant="ghost"
          size={size}
          onClick={() => setMore((o) => !o)}
          className="shrink-0"
        />,
      )}
    </div>
  );
  const done = tip(
    'Done',
    <IconButton
      label="Done"
      icon={IconCheck}
      variant="ghost"
      tone="accent"
      size={size}
      onClick={onDone}
      className="shrink-0"
    />,
  );

  const settings = (
    <TextSettingsPanel
      value={draft}
      multiline={multiline}
      large={touch}
      onChange={set}
    />
  );

  return (
    <>
      {phone ? (
        <DockedToolbar
          label="Text settings"
          onEscape={onClose}
          keepVisible={{
            rect: () => anchor.getBoundingClientRect(),
            element: () => scrollRoot?.() ?? null,
          }}
          revealKey={boxKey}
          trailing={done}
          data-testid="text-settings-bar"
        >
          {controls}
        </DockedToolbar>
      ) : (
        <AnchoredToolbar
          anchor={anchor}
          label="Text settings"
          onEscape={onClose}
          data-testid="text-settings-bar"
        >
          {controls}
          {done}
        </AnchoredToolbar>
      )}
      <Popover
        open={colours}
        onOpenChange={setColours}
        anchor={colourButton}
        side={phone ? 'top' : 'bottom'}
        label="Text colour"
      >
        <ColorSwatchPicker
          label="Text colour"
          value={draft.color}
          options={[...TEXT_COLORS]}
          onChange={(color) => set({ color })}
        />
      </Popover>
      {phone ? (
        <Drawer
          open={more}
          onOpenChange={setMore}
          side="bottom"
          title="Text settings"
        >
          {settings}
        </Drawer>
      ) : (
        <Popover
          open={more}
          onOpenChange={setMore}
          anchor={moreButton}
          side="bottom"
          align="end"
          label="More text settings"
        >
          {settings}
        </Popover>
      )}
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
  large,
  onChange,
}: {
  value: FieldStyle;
  multiline: boolean;
  large: boolean;
  onChange(patch: Partial<FieldStyle>): void;
}) {
  const stepper = large ? 'lg' : 'md';
  const row = 'flex flex-wrap items-center gap-x-3 gap-y-2';
  const label = 'w-32 shrink-0';
  return (
    <div className="flex w-full flex-col gap-4 p-1 sm:w-[22rem]">
      <div className={row}>
        <Label htmlFor="text-size-exact" className={label}>
          Size
        </Label>
        <Stepper
          id="text-size-exact"
          value={style.size}
          min={MIN_SIZE}
          max={MAX_SIZE}
          step={0.5}
          label="Text size in points"
          decrementLabel="Smaller text"
          incrementLabel="Larger text"
          unit="pt"
          size={stepper}
          onValueChange={(v) => onChange({ size: v })}
        />
        <Select
          aria-label="Text size presets"
          value={TEXT_SIZES.includes(style.size) ? String(style.size) : ''}
          items={[
            { value: '', label: 'Custom' },
            ...TEXT_SIZES.map((s) => ({ value: String(s), label: `${s} pt` })),
          ]}
          onValueChange={(v) => v && onChange({ size: Number(v) })}
          className={cn('w-28 shrink-0', large && 'h-11')}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Text size="sm" className="font-medium">
          Text colour
        </Text>
        <ColorPicker
          label="Text colour"
          value={style.color}
          palette={TEXT_COLORS.map((c) => c.value)}
          defaultFormat="hex"
          onChange={(_, color) =>
            onChange({ color: formatColor({ ...color, alpha: 1 }, 'hex') })
          }
        />
      </div>
      {multiline ? (
        <Text size="xs" tone="muted">
          Letter spacing and character boxes apply to single-line text.
        </Text>
      ) : (
        <>
          <div className={row}>
            <Label htmlFor="text-spacing-exact" className={label}>
              Letter spacing
            </Label>
            <Stepper
              id="text-spacing-exact"
              value={style.spacing}
              min={0}
              max={MAX_SPACING}
              step={0.5}
              label="Letter spacing in points"
              decrementLabel="Tighter letter spacing"
              incrementLabel="Wider letter spacing"
              unit="pt"
              size={stepper}
              onValueChange={(v) => onChange({ spacing: v })}
            />
            <Slider
              aria-label="Letter spacing"
              value={style.spacing}
              min={0}
              max={MAX_SPACING}
              step={0.5}
              onValueChange={(v) => onChange({ spacing: v })}
              className="w-full"
            />
          </div>
          <div className={row}>
            <Label htmlFor="text-comb" className={label}>
              Character boxes
            </Label>
            <Switch
              id="text-comb"
              aria-label="Character boxes"
              checked={style.comb > 0}
              onCheckedChange={(on) =>
                onChange({ comb: on ? DEFAULT_COMB : 0 })
              }
            />
            <Stepper
              value={style.comb || DEFAULT_COMB}
              min={1}
              max={MAX_COMB}
              label="Number of character boxes"
              decrementLabel="Fewer boxes"
              incrementLabel="More boxes"
              size={stepper}
              disabled={style.comb === 0}
              onValueChange={(v) => onChange({ comb: Math.round(v) })}
            />
          </div>
        </>
      )}
    </div>
  );
}
