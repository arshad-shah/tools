import { SelectionFrame, type FrameBox } from '@arshad-shah/cynosure';
import {
  boxToScreen,
  screenRectToBox,
  type Viewport,
} from '@/pdf/doc/geometry';
import type { Box } from '@/pdf/doc/types';
import { frameScale } from './geometry';

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
  /** Smallest width and height, in points. Default 4. */
  minSize?: number;
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
  minSize = 4,
  snap,
  onChange,
  onCommit,
  'aria-describedby': describedBy,
}: PageFrameProps) {
  // Frame units are points across the page as shown (x right, y down), so
  // the arrow keys move by a point at any zoom.
  const s = frameScale(viewport);
  const toScreen = (b: Box): FrameBox => {
    const r = boxToScreen(viewport, b);
    return {
      x: r.left / s,
      y: r.top / s,
      width: r.width / s,
      height: r.height / s,
    };
  };
  const toPage = (f: FrameBox): Box =>
    screenRectToBox(viewport, {
      left: f.x * s,
      top: f.y * s,
      width: f.width * s,
      height: f.height * s,
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
      scale={s}
      minSize={minSize}
      bounds={
        bounded && viewport.width > 0 && viewport.height > 0
          ? { width: viewport.width / s, height: viewport.height / s }
          : undefined
      }
      snap={snap ? (f) => toScreen(snap(toPage(f))) : undefined}
      onChange={onChange ? (f, r) => onChange(toPage(f), r) : undefined}
      onCommit={(f, r) => onCommit(toPage(f), r)}
      aria-describedby={describedBy}
    />
  );
}
