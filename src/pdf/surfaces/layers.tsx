import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

/*
 * Drawing-surface layout for the PDF workspace (redesign spec rule 1: only
 * a drawing surface may be custom). These boxes stack page canvases, text
 * layers and object layers on a page; every control drawn on them is a
 * Cynosure component.
 */

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, 'style'>;

/** A page's own box inside its viewport slot: everything is drawn in it. */
export const PageSlot = forwardRef<
  HTMLDivElement,
  DivProps & { pageNumber: number; pageId: string }
>(function PageSlot({ pageNumber, pageId, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      data-testid={`page-slot-${pageNumber}`}
      data-page-id={pageId}
      style={{ position: 'relative', width: '100%', height: '100%' }}
      {...rest}
    >
      {children}
    </div>
  );
});

/** A layer over the whole page. `passive` lets the pointer through. */
export const Layer = forwardRef<
  HTMLDivElement,
  DivProps & { passive?: boolean; clip?: boolean }
>(function Layer({ passive, clip, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: passive ? 'none' : undefined,
        overflow: clip ? 'hidden' : undefined,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

/** A 2D affine transform (a b c d e f), as pdf.js viewports give it. */
export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface PlaceProps extends DivProps {
  /** CSS px from the page's top left. */
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** Degrees, clockwise, about the box centre. */
  rotate?: number;
  /** Applied after the position, from the box's top left. */
  matrix?: Matrix;
  opacity?: number;
  /** The pointer goes through to what is under the box. */
  passive?: boolean;
  /** Centres its content in the box. */
  centre?: boolean;
  children?: ReactNode;
}

/** A box at a place on the page (an object, a mark, a tile). */
export const Place = forwardRef<HTMLDivElement, PlaceProps>(function Place(
  {
    x,
    y,
    width,
    height,
    rotate,
    matrix,
    opacity,
    passive,
    centre,
    children,
    ...rest
  },
  ref,
) {
  const parts = [
    rotate ? `rotate(${rotate}deg)` : '',
    matrix
      ? `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`
      : '',
  ].filter(Boolean);
  const style: CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    transform: parts.length ? parts.join(' ') : undefined,
    transformOrigin: matrix ? '0 0' : undefined,
    opacity,
    pointerEvents: passive ? 'none' : undefined,
  };
  if (centre)
    Object.assign(style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
  return (
    <div ref={ref} style={style} {...rest}>
      {children}
    </div>
  );
});

/** Centres a placeholder (a spinner, an error icon) over the page. */
export function Centre({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}
