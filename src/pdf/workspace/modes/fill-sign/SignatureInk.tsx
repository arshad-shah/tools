import React, { useEffect, useId, useRef } from 'react';
import { eraser, undo as undoIcon } from '@arshad-shah/cynosure/icons';
import {
  Button,
  Inline,
  SegmentedControl,
  SignaturePad,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
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

  // The pad's own undo while focus is in its area, not the document's.
  const area = useRef<HTMLElement>(null);
  const undoRef = useRef(undo);
  useEffect(() => {
    undoRef.current = undo;
  });
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || !matchesHotkey(e, UNDO)) return;
      e.preventDefault();
      e.stopPropagation();
      undoRef.current();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Stack gap="3" ref={area}>
      <SignaturePad
        value={strokes}
        space={PAD}
        onChange={commit}
        label={label}
        aria-describedby={hintId}
        ink={ink}
        weight={weight}
        disabled={disabled}
        style={{ inlineSize: '100%', maxInlineSize: 480 }}
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
          onChange={(w) => commit(strokes, ink, w as InkWeight)}
        />
        <Button
          size="sm"
          variant="outline"
          icon={undoIcon}
          disabled={disabled || strokes.length === 0}
          onClick={undo}
        >
          Undo stroke
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={eraser}
          disabled={disabled || strokes.length === 0}
          onClick={() => commit([])}
        >
          Clear
        </Button>
      </Inline>
    </Stack>
  );
};
