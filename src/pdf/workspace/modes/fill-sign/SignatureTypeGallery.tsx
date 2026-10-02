import React, { useEffect, useId, useState } from 'react';
import {
  Alert,
  AlertDescription,
  ChoiceGrid,
  FontPreview,
  Inline,
  Input,
  Label,
  Slider,
  Spinner,
  Stack,
  Text,
  type ChoiceOption,
} from '@/shared/ui';
import {
  ensureFontFace,
  fontById,
  INK_COLORS,
  loadSignatureFont,
  missingChars,
  SIGNATURE_FONTS,
  type SignatureFontId,
  type SignatureSource,
  type SignatureSourceProps,
} from '@/pdf/sign';
import { MAX_TEXT } from '@/pdf/doc/ops/sign-params';
import { InkField } from './InkField';
import { nextSize, SIZE_MAX } from './typed-size';

const SLANT_LIMIT = 20;

type FontState = 'loading' | 'ready' | 'failed';

export interface SignatureTypeGalleryProps extends SignatureSourceProps {
  /** The text to write (a name, or initials). */
  name: string;
  /** Shows the "Your name" field; without it the parent owns the text. */
  onNameChange?(name: string): void;
}

/**
 * A typed signature (plan H-14 "Type"): the name in all 10 handwriting
 * fonts as picture cards, with slant, size and ink. The fonts start loading
 * when the gallery opens; each card waits for its own font.
 */
export const SignatureTypeGallery: React.FC<SignatureTypeGalleryProps> = ({
  name,
  onNameChange,
  onChange,
  disabled,
}) => {
  const ids = useId();
  const [fontId, setFontId] = useState<SignatureFontId>(SIGNATURE_FONTS[0].id);
  const [color, setColor] = useState(INK_COLORS[0].value);
  const [slant, setSlant] = useState(0);
  const [size, setSize] = useState(0);
  const [fonts, setFonts] = useState<
    Partial<Record<SignatureFontId, FontState>>
  >({});
  /** Characters the chosen font can't draw, checked against the real font. */
  const [check, setCheck] = useState<{ key: string; bad: string[] } | null>(
    null,
  );
  const text = name.trim();
  const key = `${fontId}:${text}`;
  const missing = check?.key === key ? check.bad : [];

  useEffect(() => {
    let live = true;
    for (const f of SIGNATURE_FONTS)
      ensureFontFace(f.id).then(
        () => live && setFonts((s) => ({ ...s, [f.id]: 'ready' })),
        () => live && setFonts((s) => ({ ...s, [f.id]: 'failed' })),
      );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!text) {
      onChange(null);
      return;
    }
    const source: SignatureSource = {
      kind: 'text',
      text,
      fontId,
      color,
      ...(slant ? { slant } : {}),
      size: size || 'fit',
    };
    // Check every character now rather than failing at Place. If the font
    // can't be loaded, pass the source on: placing it reports the error.
    let live = true;
    loadSignatureFont(fontId).then(
      (font) => {
        if (!live) return;
        const bad = missingChars(text, (cp) => font.hasGlyphForCodePoint(cp));
        setCheck({ key: `${fontId}:${text}`, bad });
        onChange(bad.length ? null : source);
      },
      () => {
        if (!live) return;
        setCheck(null);
        onChange(source);
      },
    );
    return () => {
      live = false;
    };
  }, [text, fontId, color, slant, size, onChange]);

  const options: ChoiceOption<SignatureFontId>[] = SIGNATURE_FONTS.map((f) => ({
    value: f.id,
    label: f.label,
    render: () =>
      fonts[f.id] === 'ready' ? (
        <FontPreview
          family={f.family}
          text={text}
          slant={slant}
          color={color}
          label={`${f.label} sample`}
          className="h-12 px-2 text-2xl"
        />
      ) : fonts[f.id] === 'failed' ? (
        <Text
          size="xs"
          tone="muted"
          className="flex h-12 items-center justify-center"
        >
          Font not loaded
        </Text>
      ) : (
        <span className="flex h-12 items-center justify-center">
          <Spinner size="sm" label={`Loading ${f.label}`} />
        </span>
      ),
  }));

  return (
    <Stack gap="3">
      {onNameChange ? (
        <Stack gap="2">
          <Label htmlFor={`${ids}-name`}>Your name</Label>
          <Input
            id={`${ids}-name`}
            value={name}
            disabled={disabled}
            autoComplete="name"
            maxLength={MAX_TEXT}
            onChange={onNameChange}
          />
        </Stack>
      ) : null}
      <ChoiceGrid
        label="Style"
        value={fontId}
        onChange={(v: SignatureFontId) => setFontId(v)}
        options={options}
        columns={2}
        disabled={disabled}
      />
      {missing.length > 0 && (
        <Alert status="danger">
          <AlertDescription>
            {fontById(fontId).label} can't draw: {missing.join(' ')}. Try
            another style, or draw your signature instead.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Stack gap="1">
          <Inline justify="between" gap="2">
            <Label id={`${ids}-slant`}>Slant</Label>
            <Text as="span" size="sm" tone="muted">
              {`${slant} degrees`}
            </Text>
          </Inline>
          <Slider
            value={slant}
            min={-SLANT_LIMIT}
            max={SLANT_LIMIT}
            step={1}
            disabled={disabled}
            onValueChange={setSlant}
            aria-labelledby={`${ids}-slant`}
            aria-valuetext={`${slant} degrees`}
          />
        </Stack>
        <Stack gap="1">
          <Inline justify="between" gap="2">
            <Label id={`${ids}-size`}>Size</Label>
            <Text as="span" size="sm" tone="muted">
              {size ? `${size} pt` : 'Auto'}
            </Text>
          </Inline>
          <Slider
            value={size}
            min={0}
            max={SIZE_MAX}
            step={1}
            disabled={disabled}
            onValueChange={(v) => setSize((prev) => nextSize(prev, v))}
            aria-labelledby={`${ids}-size`}
            aria-valuetext={size ? `${size} points` : 'Auto, fits the box'}
          />
        </Stack>
      </div>
      <InkField value={color} disabled={disabled} onChange={setColor} />
    </Stack>
  );
};
