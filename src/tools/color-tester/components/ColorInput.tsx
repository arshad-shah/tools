import { useId, useState } from 'react';
import { parseColor } from '@/shared/lib/colour';
import { ColorPicker, Input, Label, Stack, Text } from '@/shared/ui';

export interface ColorInputProps {
  /** Any CSS colour. */
  value: string;
  onChange(css: string): void;
}

const errorOf = (text: string): string | null => {
  try {
    parseColor(text);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Not a colour';
  }
};

/**
 * The base colour: the kit picker (area, rails, EyeDropper, recent colours)
 * and a universal field that takes any CSS colour (hex, rgb, hsl, hwb, lab,
 * lch, oklab, oklch or a name).
 */
export function ColorInput({ value, onChange }: ColorInputProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  // A new value from outside replaces the draft (render-phase sync).
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  const error = errorOf(draft);

  const onText = (t: string) => {
    setDraft(t);
    if (errorOf(t) === null) {
      const css = t.trim();
      setSeen(css);
      onChange(css);
    }
  };

  return (
    <Stack gap="3">
      <ColorPicker
        label="Base colour"
        value={value}
        onChange={(css) => onChange(css)}
        alpha
        showEyeDropper
      />
      <Stack gap="1">
        <Label htmlFor={`${id}-any`}>Any CSS colour</Label>
        <Input
          id={`${id}-any`}
          value={draft}
          onChange={onText}
          invalid={!!error}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          spellCheck={false}
          autoComplete="off"
          className="font-mono"
          placeholder="oklch(0.6 0.15 250), tomato, lab(50 20 -30)"
        />
        {error && (
          <Text id={`${id}-error`} size="xs" className="text-danger">
            {error}
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
