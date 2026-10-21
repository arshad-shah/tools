import React, { useEffect, useId, useRef } from 'react';
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
import { fillSign, useFillSign } from './store';

/**
 * The pad's coordinate space. It is shown at whatever size fits its
 * container (phone width, browser text size); strokes are recorded in this
 * space so the signature keeps its shape and weight, and the vector is
 * cropped to the ink.
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
 * undo shortcut while focus is in the pad's area). The drawing lives in the
 * mode's store, so another tab or closing the panel doesn't lose it.
 */
export const SignatureInk: React.FC<
  SignatureSourceProps & { label?: string }
> = ({ onChange, disabled, label = 'Draw your signature' }) => {
  const drawing = useFillSign((s) => s.drawing);
  const { strokes, weight } = drawing;
  const ink = drawing.ink ?? INK_COLORS[0].value;
  const hintId = useId();

  const emit = (next: InkStroke[], color: string, w: InkWeight) => {
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

  const commit = (next: InkStroke[], color = ink, w = weight) => {
    fillSign.set({ drawing: { strokes: next, ink: color, weight: w } });
    emit(next, color, w);
  };

  // Back on this tab (or the panel reopened): the kept drawing is the
  // source again. Once, on mount: later changes go through commit.
  const restore = useRef(() => {
    if (strokes.length > 0) emit(strokes, ink, weight);
  });
  useEffect(() => restore.current(), []);

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
        space={PAD}
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
          onChange={(v) => commit(strokes, v)}
        />
        <SegmentedControl
          label="Weight"
          size="sm"
          value={weight}
          options={WEIGHTS.map((o) => ({ ...o, disabled }))}
          onChange={(w) => commit(strokes, ink, w)}
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
