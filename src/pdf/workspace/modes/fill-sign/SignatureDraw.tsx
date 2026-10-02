import React, { useRef, useState } from 'react';
import { IconEraser, IconUndo } from '@/shared/ui/icons';
import { Button, Inline, SignaturePad, Stack, Text } from '@/shared/ui';
import {
  strokePath,
  strokesBounds,
  type Stroke,
  canvasToPng,
  INK_COLORS,
  type SignatureSourceProps,
} from '@/pdf/sign';
import { InkField } from './InkField';

const LINE_WIDTH = 2.5;
/** Export resolution relative to CSS px, so the stamp stays sharp in print. */
const EXPORT_SCALE = 3;

/** Export painter: the same stroke geometry SignaturePad draws on screen. */
function paint(
  ctx: OffscreenCanvasRenderingContext2D,
  strokes: Stroke[],
  ink: string,
) {
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  for (const s of strokes) ctx.stroke(new Path2D(strokePath(s)));
}

/** A signature pad: pointer strokes, exported as a tightly cropped transparent PNG. */
export const SignatureDraw: React.FC<SignatureSourceProps> = ({
  onChange,
  disabled,
}) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [ink, setInk] = useState(INK_COLORS[0].value);
  const exportRun = useRef(0);

  const publish = async (next: Stroke[], color: string) => {
    const run = ++exportRun.current;
    const bounds = strokesBounds(next, 6);
    if (!bounds) {
      onChange(null);
      return;
    }
    const width = Math.ceil(bounds.width * EXPORT_SCALE);
    const height = Math.ceil(bounds.height * EXPORT_SCALE);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(
      EXPORT_SCALE,
      0,
      0,
      EXPORT_SCALE,
      -bounds.x * EXPORT_SCALE,
      -bounds.y * EXPORT_SCALE,
    );
    paint(ctx, next, color);
    const bytes = await canvasToPng(canvas);
    if (run !== exportRun.current) return; // a newer export superseded this one
    onChange({ kind: 'image', bytes, format: 'png', width, height });
  };

  const commit = (next: Stroke[], color = ink) => {
    setStrokes(next);
    void publish(next, color);
  };

  return (
    <Stack gap="3">
      <SignaturePad
        value={strokes}
        onChange={commit}
        label="Draw your signature"
        aria-describedby="sig-draw-hint"
        ink={ink}
        strokeWidth={LINE_WIDTH}
        disabled={disabled}
        className="h-44 w-full rounded-md border border-line bg-white"
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
