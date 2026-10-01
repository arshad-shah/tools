import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import { Button, Inline, Label, Select, Stack, Text } from '@/shared/ui';
import {
  addPoint,
  strokePath,
  strokesBounds,
  type Stroke,
} from '../lib/stroke';
import {
  canvasToPng,
  INK_COLORS,
  type SignatureSourceProps,
} from '../lib/signature';

const LINE_WIDTH = 2.5;
/** Export resolution relative to CSS px, so the stamp stays sharp in print. */
const EXPORT_SCALE = 3;

function paint(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [live, setLive] = useState<Stroke | null>(null);
  // The source of truth while drawing: several pointer events can arrive
  // between renders, and reading `live`/`strokes` from the render closure
  // would drop samples (or the whole stroke). State only mirrors these.
  const liveRef = useRef<Stroke | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const [ink, setInk] = useState(INK_COLORS[0].value);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const exportRun = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: canvas.clientWidth, height: canvas.clientHeight }),
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(ctx, live ? [...strokes, live] : strokes, ink);
  }, [strokes, live, ink, size]);

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
    strokesRef.current = next;
    setStrokes(next);
    void publish(next, color);
  };

  const finish = () => {
    const stroke = liveRef.current;
    if (!stroke) return;
    liveRef.current = null;
    setLive(null);
    commit([...strokesRef.current, stroke]);
  };

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <Stack gap="3">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Draw your signature"
        aria-describedby="sig-draw-hint"
        className="h-44 w-full touch-none rounded-md border border-line bg-white"
        onPointerDown={(e) => {
          if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          liveRef.current = [point(e)];
          setLive(liveRef.current);
        }}
        onPointerMove={(e) => {
          if (!liveRef.current) return;
          liveRef.current = addPoint(liveRef.current, point(e));
          setLive(liveRef.current);
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <Text id="sig-draw-hint" size="sm" tone="muted">
        Draw with a mouse, pen or finger. Using a keyboard? Use the Type tab.
      </Text>
      <Inline gap="3" align="end" wrap>
        <Stack gap="2">
          <Label htmlFor="sig-ink">Ink colour</Label>
          <Select
            id="sig-ink"
            value={ink}
            items={INK_COLORS}
            disabled={disabled}
            onValueChange={(v) => {
              setInk(v);
              if (strokes.length > 0) commit(strokes, v);
            }}
          />
        </Stack>
        <Button
          size="sm"
          variant="soft"
          leftIcon={<Undo2 size={14} />}
          disabled={disabled || strokes.length === 0}
          onClick={() => commit(strokes.slice(0, -1))}
        >
          Undo stroke
        </Button>
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<Eraser size={14} />}
          disabled={disabled || strokes.length === 0}
          onClick={() => commit([])}
        >
          Clear
        </Button>
      </Inline>
    </Stack>
  );
};
