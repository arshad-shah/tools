import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  FontSample,
  Inline,
  Input,
  Label,
  RadioGroup,
  Stack,
  Text,
} from '@/shared/ui';
import {
  ensureFontFace,
  fontById,
  loadSignatureFont,
  missingChars,
  SIGNATURE_FONTS,
  type SignatureFontId,
  INK_COLORS,
  type SignatureSourceProps,
} from '@/pdf/sign';
import { InkField } from './InkField';

const FONT_ITEMS = SIGNATURE_FONTS.map((f) => ({
  value: f.id,
  label: f.label,
}));

export const SignatureType: React.FC<SignatureSourceProps> = ({
  onChange,
  disabled,
}) => {
  const [name, setName] = useState('');
  const [fontId, setFontId] = useState<SignatureFontId>(SIGNATURE_FONTS[0].id);
  const [color, setColor] = useState(INK_COLORS[0].value);
  /** Characters the chosen font can't draw (checked against the real font). */
  const [missing, setMissing] = useState<string[]>([]);
  const run = useRef(0);

  useEffect(() => {
    // The preview falls back to a system font until this resolves.
    ensureFontFace(fontId).catch(() => {});
  }, [fontId]);

  const publish = (next: {
    name: string;
    fontId: SignatureFontId;
    color: string;
  }) => {
    setName(next.name);
    setFontId(next.fontId);
    setColor(next.color);
    const text = next.name.trim();
    const id = ++run.current;
    if (!text) {
      setMissing([]);
      onChange(null);
      return;
    }
    const source = {
      kind: 'text' as const,
      text,
      fontId: next.fontId,
      color: next.color,
    };
    // Check every character now rather than failing at Apply. If the font
    // can't be loaded, pass the source on: placing it reports the error.
    loadSignatureFont(next.fontId).then(
      (font) => {
        if (id !== run.current) return;
        const bad = missingChars(text, (cp) => font.hasGlyphForCodePoint(cp));
        setMissing(bad);
        onChange(bad.length ? null : source);
      },
      () => {
        if (id !== run.current) return;
        setMissing([]);
        onChange(source);
      },
    );
  };

  return (
    <Stack gap="3">
      <Stack gap="2">
        <Label htmlFor="sig-name">Your name</Label>
        <Input
          id="sig-name"
          value={name}
          disabled={disabled}
          autoComplete="name"
          onChange={(v) => publish({ name: v, fontId, color })}
        />
      </Stack>
      <Inline gap="4" wrap>
        <RadioGroup
          label="Font"
          heading={<Label>Font</Label>}
          orientation="vertical"
          value={fontId}
          disabled={disabled}
          options={FONT_ITEMS}
          onValueChange={(v) =>
            publish({ name, fontId: v as SignatureFontId, color })
          }
          className="min-w-40 flex-1"
        />
        <InkField
          value={color}
          disabled={disabled}
          onChange={(v) => publish({ name, fontId, color: v })}
        />
      </Inline>
      {missing.length > 0 && (
        <Alert status="danger">
          <AlertDescription>
            {fontById(fontId).label} can't draw: {missing.join(' ')}. Try
            another font, or draw or upload your signature instead.
          </AlertDescription>
        </Alert>
      )}
      {name.trim() ? (
        <FontSample
          aria-label="Typed signature preview"
          className="min-h-14 truncate rounded-md border border-line bg-white px-3 py-2 text-4xl"
          family={fontById(fontId).family}
          color={color}
        >
          {name.trim()}
        </FontSample>
      ) : (
        <Text size="sm" tone="muted">
          Type your name to preview it in the chosen font.
        </Text>
      )}
    </Stack>
  );
};
