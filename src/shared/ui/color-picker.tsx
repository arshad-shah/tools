import { useId, useMemo, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatColor, gamutMap, type Color } from '@/shared/lib/colour';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { createToolSettings } from '@/shared/lib/tool-settings';
import { IconPipette } from '@/shared/ui/icons';
import { IconButton } from './button';
import { ColorArea } from './color-picker-area';
import {
  alphaBackground,
  axisText,
  colorToState,
  hueBackground,
  pushRecent,
  stateToColor,
  tryParse,
  type PickerFormat,
  type PickerMode,
  type PickerState,
} from './color-picker-model';
import { SwatchRow } from './color-picker-swatches';
import { ColorRamp } from './color-ramp';
import { Slider } from './controls';
import { Input } from './input';
import { SegmentedControl } from './segmented-control';
import { colourPaint } from './swatch-paint';

/** Recent colours are settings-like (ruling R30): kept with store-kit. */
const kitColor = createToolSettings(
  'kit-color',
  { recent: [] as string[] },
  { version: 1 },
);

export interface ColorPickerProps {
  /** Any CSS colour. */
  value: string;
  onChange(css: string, color: Color): void;
  /** The 2D area: HSV saturation and brightness, or OKLCH chroma and lightness. */
  mode?: PickerMode;
  /** Shows the alpha rail; without it every emitted colour is opaque. */
  alpha?: boolean;
  /** Accessible name of the picker. */
  label: string;
  /** Caller-owned recent colours; omitted, the kit keeps its own list. */
  recent?: string[];
  /** Tool-provided colours shown as a row. */
  palette?: string[];
  /** Shows the OKLCH tonal ramp of the current colour. */
  showRamp?: boolean;
  showEyeDropper?: boolean;
  /** Initial text format of the field and of `onChange`. */
  defaultFormat?: PickerFormat;
  className?: string;
}

const FORMATS: { value: PickerFormat; label: string }[] = [
  { value: 'hex', label: 'Hex' },
  { value: 'rgb', label: 'RGB' },
  { value: 'hsl', label: 'HSL' },
  { value: 'hwb', label: 'HWB' },
  { value: 'oklch', label: 'OKLCH' },
];

interface EyeDropperApi {
  open(): Promise<{ sRGBHex: string }>;
}
type EyeDropperCtor = new () => EyeDropperApi;

const eyeDropper = (): EyeDropperCtor | null =>
  typeof window !== 'undefined' && 'EyeDropper' in window
    ? (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper
    : null;

const initialState = (value: string, mode: PickerMode, hue = 0) => {
  const p = tryParse(value);
  return colorToState(p.color ?? { r: 0, g: 0, b: 0, alpha: 1 }, mode, hue);
};

/**
 * Colour picker (ruling R30): a 2D area plus hue and alpha rails over
 * HSV-held (or OKLCH-held) state, a text field taking any CSS colour,
 * Hex/RGB/HSL/HWB/OKLCH output, an EyeDropper when the browser has one,
 * recent colours, a tool palette and an OKLCH tonal ramp.
 */
export function ColorPicker({
  value,
  onChange,
  mode = 'srgb',
  alpha = false,
  label,
  recent,
  palette,
  showRamp = false,
  showEyeDropper = true,
  defaultFormat = 'hex',
  className,
}: ColorPickerProps) {
  const id = useId();
  const [state, setState] = useState<PickerState>(() =>
    initialState(value, mode),
  );
  const [format, setFormat] = useState<PickerFormat>(defaultFormat);
  const [lastEmitted, setLastEmitted] = useState<string | null>(null);
  const [seen, setSeen] = useState({ value, mode });
  const [draft, setDraft] = useState<string | null>(null);
  // The ramp stays anchored while one of its steps is chosen.
  const [rampBase, setRampBase] = useState<string | null>(null);
  const [settings, updateSettings] = kitColor.useSettings();
  const recentList = recent ?? settings.recent;

  // A new value or mode from outside re-derives the coordinates, keeping
  // the hue (render-phase sync). Our own emissions are not re-derived.
  if (seen.value !== value || seen.mode !== mode) {
    setSeen({ value, mode });
    if (seen.mode !== mode || value !== lastEmitted)
      setState(initialState(value, mode, state.h));
  }

  const color = useMemo(() => {
    const c = stateToColor(state, mode);
    return alpha ? c : { ...c, alpha: 1 };
  }, [state, mode, alpha]);
  const hex = formatColor(color, 'hex');
  const text = draft ?? formatColor(color, format);
  const parsedDraft = draft === null ? null : tryParse(draft);
  const error = parsedDraft?.error;

  const emit = (c: Color, fmt = format) => {
    const out = alpha ? c : { ...c, alpha: 1 };
    const css = formatColor(out, fmt);
    setLastEmitted(css);
    onChange(css, out);
    return out;
  };
  const remember = (c: Color) => {
    if (recent) return;
    updateSettings({
      recent: pushRecent(kitColor.getSettings().recent, formatColor(c, 'hex')),
    });
  };
  const setFromState = (next: PickerState, commit = false) => {
    setRampBase(null);
    setState(next);
    const c = emit(stateToColor(next, mode));
    if (commit) remember(c);
  };
  const setFromColor = (c: Color, commit = true, fromRamp = false) => {
    if (!fromRamp) setRampBase(null);
    const mapped = gamutMap(c);
    setState(colorToState(mapped, mode, state.h));
    const out = emit(mapped);
    if (commit) remember(out);
  };

  const onText = (t: string) => {
    setDraft(t);
    const p = tryParse(t);
    if (p.color) setFromColor(p.color, false);
  };
  const commitText = () => {
    if (parsedDraft?.color) remember(color);
    setDraft(null);
  };

  const Dropper = showEyeDropper ? eyeDropper() : null;
  const pickFromScreen = async () => {
    if (!Dropper) return;
    try {
      const { sRGBHex } = await new Dropper().open();
      const p = tryParse(sRGBHex);
      if (p.color) setFromColor({ ...p.color, alpha: color.alpha });
    } catch (e) {
      const err = toToolError(e, 'The eyedropper could not read the screen');
      if (err.code !== 'CANCELLED') notify.error(err);
    }
  };

  const pick = (css: string) => {
    const p = tryParse(css);
    if (p.color) setFromColor(p.color);
  };

  const hueText = { 'aria-valuetext': axisText('h', state, mode) };
  const alphaText = { 'aria-valuetext': axisText('a', state, mode) };

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'grid w-full max-w-72 grid-cols-[minmax(0,1fr)] gap-3',
        className,
      )}
    >
      <ColorArea
        state={state}
        mode={mode}
        onChange={(s) => setFromState(s)}
        onCommit={(s) => setFromState(s, true)}
      />
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-9 shrink-0 rounded-md border border-line-control"
          style={colourPaint(formatColor(color, 'rgb'))}
        />
        <div className="grid min-w-0 flex-1 gap-2">
          <span
            aria-hidden
            className="h-2 rounded-full border border-line-control"
            style={{ backgroundImage: hueBackground(state, mode) }}
          />
          <Slider
            aria-label="Hue"
            min={0}
            max={359}
            value={Math.round(state.h)}
            onValueChange={(h) => setFromState({ ...state, h })}
            {...hueText}
          />
          {alpha && (
            <>
              <span
                aria-hidden
                className="h-2 rounded-full border border-line-control"
                style={colourPaint('transparent')}
              >
                <span
                  className="block h-full rounded-full"
                  style={{ backgroundImage: alphaBackground(color) }}
                />
              </span>
              <Slider
                aria-label="Alpha"
                min={0}
                max={100}
                value={Math.round(state.a * 100)}
                onValueChange={(a) => setFromState({ ...state, a: a / 100 })}
                {...alphaText}
              />
            </>
          )}
        </div>
      </div>
      <SegmentedControl
        label="Format"
        size="sm"
        value={format}
        onChange={(f) => {
          setFormat(f);
          setDraft(null);
          emit(color, f);
        }}
        options={FORMATS}
      />
      <div className="grid gap-1">
        <label htmlFor={`${id}-text`} className="text-xs text-fg-muted">
          Colour value
        </label>
        <div className="flex items-center gap-2">
          <Input
            id={`${id}-text`}
            value={text}
            onChange={onText}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText();
            }}
            invalid={!!error}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            spellCheck={false}
            autoComplete="off"
            className="font-mono"
          />
          {Dropper && (
            <IconButton
              label="Pick a colour from the screen"
              icon={IconPipette}
              variant="ghost"
              onClick={() => void pickFromScreen()}
            />
          )}
        </div>
        {error && (
          <p id={`${id}-error`} className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      {palette && palette.length > 0 && (
        <SwatchRow
          label="Palette"
          colors={palette}
          currentHex={hex}
          onPick={pick}
        />
      )}
      {recentList.length > 0 && (
        <SwatchRow
          label="Recent colours"
          colors={recentList}
          currentHex={hex}
          onPick={pick}
        />
      )}
      {showRamp && (
        <div className="grid gap-1">
          <span aria-hidden className="text-xs text-fg-muted">
            Tonal ramp
          </span>
          <ColorRamp
            base={rampBase ?? formatColor({ ...color, alpha: 1 }, 'hex')}
            label="Tonal ramp"
            size="sm"
            value={hex}
            onSelect={(_css, c) => {
              setRampBase(
                rampBase ?? formatColor({ ...color, alpha: 1 }, 'hex'),
              );
              setFromColor({ ...c, alpha: color.alpha }, true, true);
            }}
          />
        </div>
      )}
    </div>
  );
}
ColorPicker.displayName = 'ColorPicker';
