import { SelectionFrame, type FrameBox } from '@arshad-shah/cynosure';
import {
  boxToScreen,
  screenRectToBox,
  type Viewport,
} from '@/pdf/doc/geometry';
import type { Box } from '@/pdf/doc/types';

export interface PageFrameProps {
  label: string;
  viewport: Viewport;
  /** Page space (PDF points, y up); null before one is drawn (`draw`). */
  box: Box | null;
  /** Degrees, clockwise on screen. */
  rotate?: number;
  draw?: boolean;
  resizable?: boolean;
  rotatable?: boolean;
  keepAspect?: boolean;
  /** Keep the box on the page. Default true. */
  bounded?: boolean;
  /** Adjust each proposed box, in page space. */
  snap?(box: Box): Box;
  onChange?(box: Box, rotate: number): void;
  onCommit(box: Box, rotate: number): void;
  'aria-describedby'?: string;
}

/**
 * Cynosure's SelectionFrame on a PDF page: it works in screen pixels, the
 * page in PDF points with y up, so boxes are mapped through the page's
 * viewport both ways. Place it in a Layer over the page.
 */
export function PageFrame({
  label,
  viewport,
  box,
  rotate = 0,
  draw,
  resizable,
  rotatable,
  keepAspect,
  bounded = true,
  snap,
  onChange,
  onCommit,
  'aria-describedby': describedBy,
}: PageFrameProps) {
  const toScreen = (b: Box): FrameBox => {
    const r = boxToScreen(viewport, b);
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  };
  const toPage = (f: FrameBox): Box =>
    screenRectToBox(viewport, {
      left: f.x,
      top: f.y,
      width: f.width,
      height: f.height,
    });
  return (
    <SelectionFrame
      label={label}
      box={box ? toScreen(box) : null}
      rotate={rotate}
      draw={draw}
      resizable={resizable}
      rotatable={rotatable}
      keepAspect={keepAspect}
      minSize={4}
      bounds={
        bounded && viewport.width > 0 && viewport.height > 0
          ? { width: viewport.width, height: viewport.height }
          : undefined
      }
      snap={snap ? (f) => toScreen(snap(toPage(f))) : undefined}
      onChange={onChange ? (f, r) => onChange(toPage(f), r) : undefined}
      onCommit={(f, r) => onCommit(toPage(f), r)}
      aria-describedby={describedBy}
    />
  );
}
