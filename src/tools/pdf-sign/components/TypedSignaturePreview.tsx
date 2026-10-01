import React, { useEffect, useRef } from 'react';
import { fitInk, type InkLayout } from '@/pdf/edit';

interface TypedSignaturePreviewProps {
  layout: InkLayout;
  color: string;
  /** Box size in CSS px. */
  width: number;
  height: number;
}

/**
 * Draws the typed signature from the same glyph outlines, ink metrics and
 * fit that `stamp` uses, so the preview in the box is what gets stamped.
 */
export const TypedSignaturePreview: React.FC<TypedSignaturePreviewProps> = ({
  layout,
  color,
  width,
  height,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let fit: ReturnType<typeof fitInk>;
    try {
      fit = fitInk({ width, height }, layout.ink);
    } catch {
      return; // nothing to draw
    }
    const k = fit.size / layout.unitsPerEm;
    ctx.fillStyle = color;
    for (const g of layout.glyphs) {
      // Font units, y up → canvas px, y down; baseline `fit.y` above the bottom.
      ctx.setTransform(
        dpr * k,
        0,
        0,
        -dpr * k,
        dpr * (fit.x + g.x * k),
        dpr * (height - fit.y),
      );
      ctx.fill(new Path2D(g.path));
    }
  }, [layout, color, width, height]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none block size-full"
    />
  );
};
