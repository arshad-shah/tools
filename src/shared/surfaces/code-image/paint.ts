import type { ScratchContext2D } from '../scratch-canvas';
import type { CodeImageLayout } from './layout';
import { gradientLine, runColor, type CodeImageStyle } from './style';

/** The 2D context calls the painter uses (a canvas, or a test double). */
export type PaintContext = Pick<
  ScratchContext2D,
  | 'save'
  | 'restore'
  | 'scale'
  | 'beginPath'
  | 'rect'
  | 'roundRect'
  | 'arc'
  | 'fill'
  | 'stroke'
  | 'clip'
  | 'fillRect'
  | 'fillText'
  | 'createLinearGradient'
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'shadowColor'
  | 'shadowBlur'
  | 'shadowOffsetY'
>;

export const fontOf = (size: number, family: string, weight = 400) =>
  `${weight} ${size}px ${family}`;

/** Paints a laid-out code image at `scale` device pixels per CSS pixel. */
export function paintCodeImage(
  g: PaintContext,
  layout: CodeImageLayout,
  style: CodeImageStyle,
  scale: number,
): void {
  const { palette: p, backdrop } = style;
  const { window: w } = layout;
  g.save();
  g.scale(scale, scale);

  if (backdrop.kind === 'solid') {
    g.fillStyle = backdrop.color;
    g.fillRect(0, 0, layout.width, layout.height);
  } else if (backdrop.kind === 'gradient') {
    const l = gradientLine(layout.width, layout.height, backdrop.angle);
    const grad = g.createLinearGradient(l.x1, l.y1, l.x2, l.y2);
    const last = Math.max(1, backdrop.stops.length - 1);
    backdrop.stops.forEach((c, i) => grad.addColorStop(i / last, c));
    g.fillStyle = grad;
    g.fillRect(0, 0, layout.width, layout.height);
  }

  // The window, with a shadow when there is room around it.
  g.save();
  if (w.x > 0) {
    g.shadowColor = p.shadow;
    g.shadowBlur = Math.min(w.x, layout.fontSize * 3);
    g.shadowOffsetY = Math.min(w.x / 3, layout.fontSize);
  }
  g.beginPath();
  g.roundRect(w.x, w.y, w.width, w.height, w.radius);
  g.fillStyle = p.background;
  g.fill();
  g.restore();

  g.save();
  g.beginPath();
  g.roundRect(w.x, w.y, w.width, w.height, w.radius);
  g.clip();
  if (layout.chrome) {
    g.fillStyle = p.chrome;
    g.fillRect(w.x, w.y, w.width, layout.chrome.height);
    layout.chrome.dots.forEach((d, i) => {
      g.beginPath();
      g.arc(d.cx, d.cy, d.r, 0, Math.PI * 2);
      g.fillStyle = p.dots[i];
      g.fill();
    });
    if (layout.chrome.title) {
      g.font = fontOf(layout.fontSize, style.fontFamily, 500);
      g.fillStyle = p.title;
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.fillText(
        layout.chrome.title.text,
        layout.chrome.title.x,
        layout.chrome.title.baseline,
      );
    }
  }
  g.fillStyle = p.highlight;
  for (const r of layout.rows)
    if (r.highlighted) g.fillRect(w.x, r.y, w.width, layout.rowHeight);

  g.font = fontOf(layout.fontSize, style.fontFamily);
  g.textBaseline = 'alphabetic';
  if (layout.gutterRight !== null) {
    g.textAlign = 'right';
    for (const r of layout.rows)
      if (r.lineNo !== null) {
        g.fillStyle = r.highlighted ? p.gutterActive : p.gutter;
        g.fillText(String(r.lineNo), layout.gutterRight, r.baseline);
      }
  }
  g.beginPath();
  g.rect(layout.code.x, w.y, layout.code.width, w.height);
  g.clip();
  g.textAlign = 'left';
  for (const r of layout.rows)
    for (const run of r.runs) {
      g.fillStyle = runColor(p, run.kind);
      g.fillText(run.text, run.x, r.baseline);
    }
  g.restore();

  g.beginPath();
  g.roundRect(w.x + 0.5, w.y + 0.5, w.width - 1, w.height - 1, w.radius);
  g.strokeStyle = p.border;
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}
