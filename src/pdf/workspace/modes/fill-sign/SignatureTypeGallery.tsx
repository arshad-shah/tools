import React, { useEffect, useState } from 'react';
import {
  Grid,
  LoadingDots,
  Notice,
  RadioGroup,
  Slider,
  Stack,
  Text,
  TextField,
} from '@arshad-shah/cynosure';
import { SamplePaper, TypedSample } from '@/pdf/surfaces/InkSample';
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

  const options = SIGNATURE_FONTS.map((f) => ({
    value: f.id,
    label: f.label,
    media: (
      <SamplePaper height={56}>
        {fonts[f.id] === 'ready' ? (
          <TypedSample
            family={f.family}
            text={text}
            slant={slant}
            color={color}
            label={`${f.label} sample`}
          />
        ) : fonts[f.id] === 'failed' ? (
          <Text size="xs" tone="muted">
            Font not loaded
          </Text>
        ) : (
          <LoadingDots size="sm" tone="muted" label={`Loading ${f.label}`} />
        )}
      </SamplePaper>
    ),
  }));

  return (
    <Stack gap="4">
      {onNameChange ? (
        <TextField
          label="Your name"
          value={name}
          disabled={disabled}
          autoComplete="name"
          maxLength={MAX_TEXT}
          onChange={onNameChange}
        />
      ) : null}
      <RadioGroup
        label="Style"
        variant="card"
        columns={2}
        value={fontId}
        onChange={(v) => setFontId(v as SignatureFontId)}
        options={options}
        disabled={disabled}
      />
      {missing.length > 0 && (
        <Notice tone="danger" size="sm">
          {`${fontById(fontId).label} can't draw: ${missing.join(' ')}. Try another style, or draw your signature instead.`}
        </Notice>
      )}
      <Grid columns={2} minItemWidth="12rem" gap="4">
        <Slider
          label="Slant"
          showValue
          labels={{ value: (v) => `${v} degrees` }}
          value={slant}
          min={-SLANT_LIMIT}
          max={SLANT_LIMIT}
          step={1}
          disabled={disabled}
          onChange={(v) => setSlant(Number(v))}
        />
        <Slider
          label="Size"
          showValue
          labels={{ value: (v) => (v ? `${v} pt` : 'Auto, fits the box') }}
          value={size}
          min={0}
          max={SIZE_MAX}
          step={1}
          disabled={disabled}
          onChange={(v) => setSize((prev) => nextSize(prev, Number(v)))}
        />
      </Grid>
      <InkField value={color} disabled={disabled} onChange={setColor} />
    </Stack>
  );
};
