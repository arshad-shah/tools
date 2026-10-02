import { FONT_PX } from './model';

let probe: CanvasRenderingContext2D | null | undefined;

/** Text width in CSS px at the axis font, via an offscreen 2D context. */
export function textMeasurer(font: string): (text: string) => number {
  if (probe === undefined && typeof document !== 'undefined')
    probe = document.createElement('canvas').getContext('2d');
  const ctx = probe;
  if (!ctx) return (text) => text.length * FONT_PX * 0.6;
  return (text) => {
    ctx.font = `${FONT_PX}px ${font}`;
    return ctx.measureText(text).width;
  };
}
