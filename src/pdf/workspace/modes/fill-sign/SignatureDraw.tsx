import React, { useState } from 'react';
import { IconEraser, IconUndo } from '@/shared/ui/icons';
import {
  Button,
  Inline,
  SegmentedControl,
  SignaturePad,
  Stack,
  Text,
} from '@/shared/ui';
import {
  inkToVector,
  INK_COLORS,
  type InkStroke,
  type InkWeight,
  type SignatureSourceProps,
} from '@/pdf/sign';
import { InkField } from './InkField';

/** Pad size in CSS px: the frame the strokes are recorded in. */
const PAD = { width: 448, height: 176 };

const WEIGHTS: { value: InkWeight; label: string }[] = [
  { value: 'thin', label: 'Thin' },
  { value: 'medium', label: 'Medium' },
  { value: 'bold', label: 'Bold' },
];

/** An ink pen: pressure-sensitive strokes, kept as one vector path. */
export const SignatureDraw: React.FC<SignatureSourceProps> = ({
  onChange,
  disabled,
}) => {
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [ink, setInk] = useState(INK_COLORS[0].value);
  const [weight, setWeight] = useState<InkWeight>('medium');

  const commit = (next: InkStroke[], color = ink, w = weight) => {
    setStrokes(next);
    try {
      onChange(
        next.length
          ? { kind: 'ink', vector: inkToVector(next, w, PAD), color }
          : null,
      );
    } catch {
      // Strokes with nothing to fill (no ink yet): nothing to place.
      onChange(null);
    }
  };

  return (
    <Stack gap="3">
      <SignaturePad
        value={strokes}
        onChange={commit}
        label="Draw your signature"
        aria-describedby="sig-draw-hint"
        ink={ink}
        weight={weight}
        width={PAD.width}
        height={PAD.height}
        disabled={disabled}
        className="max-w-full rounded-md border border-line bg-white"
      />
      <Text id="sig-draw-hint" size="sm" tone="muted">
        Draw with a mouse, pen or finger. Using a keyboard? Use the Type tab.
      </Text>
      <Inline gap="3" align="end" wrap>
        <InkField
          value={ink}
          disabled={disabled}
          onChange={(v) => {
            setInk(v);
            if (strokes.length > 0) commit(strokes, v);
          }}
        />
        <SegmentedControl
          label="Weight"
          size="sm"
          value={weight}
          options={WEIGHTS.map((o) => ({ ...o, disabled }))}
          onChange={(w) => {
            setWeight(w);
            if (strokes.length > 0) commit(strokes, ink, w);
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<IconUndo size="sm" />}
          disabled={disabled || strokes.length === 0}
          onClick={() => commit(strokes.slice(0, -1))}
        >
          Undo stroke
        </Button>
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<IconEraser size="sm" />}
          disabled={disabled || strokes.length === 0}
          onClick={() => commit([])}
        >
          Clear
        </Button>
      </Inline>
    </Stack>
  );
};
