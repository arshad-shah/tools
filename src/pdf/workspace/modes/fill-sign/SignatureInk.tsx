import React, { useId, useState } from 'react';
import { IconEraser, IconUndo } from '@/shared/ui/icons';
import {
  Button,
  Inline,
  SegmentedControl,
  SignaturePad,
  Stack,
  Text,
} from '@/shared/ui';
import { isTypingTarget, matchesHotkey } from '@/shared/lib/hotkeys';
import {
  inkToVector,
  INK_COLORS,
  type InkStroke,
  type InkWeight,
  type SignatureSourceProps,
} from '@/pdf/sign';
import { InkField } from './InkField';

/**
 * The pad's design size in CSS px. It shrinks to fit its container (phone
 * width); strokes are recorded in the shown px, and the vector is cropped
 * to the ink, so the frame only bounds the points.
 */
const PAD = { width: 480, height: 180 };

const WEIGHTS: { value: InkWeight; label: string }[] = [
  { value: 'thin', label: 'Thin' },
  { value: 'medium', label: 'Medium' },
  { value: 'bold', label: 'Bold' },
];

const UNDO = 'Mod+Z';

/**
 * An ink pen (plan H-14 "Draw"): pressure-sensitive strokes kept as one
 * vector path, three weights, ink colours, stroke-level undo (also the
 * undo shortcut while focus is in the pad's area).
 */
export const SignatureInk: React.FC<
  SignatureSourceProps & { label?: string }
> = ({ onChange, disabled, label = 'Draw your signature' }) => {
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [ink, setInk] = useState(INK_COLORS[0].value);
  const [weight, setWeight] = useState<InkWeight>('medium');
  const hintId = useId();

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

  const undo = () => {
    if (!disabled && strokes.length > 0) commit(strokes.slice(0, -1));
  };

  return (
    <Stack
      gap="3"
      onKeyDown={(e) => {
        if (isTypingTarget(e.target) || !matchesHotkey(e, UNDO)) return;
        // The pad's own undo, not the document's.
        e.preventDefault();
        e.stopPropagation();
        undo();
      }}
    >
      <SignaturePad
        value={strokes}
        onChange={commit}
        label={label}
        aria-describedby={hintId}
        ink={ink}
        weight={weight}
        disabled={disabled}
        className="aspect-[8/3] w-full max-w-120 rounded-md border border-line bg-white"
      />
      <Text id={hintId} size="sm" tone="muted">
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
          onClick={undo}
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
