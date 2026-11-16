import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { boxRect } from './geometry';

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
  DivProps & {
    passive?: boolean;
    clip?: boolean;
    /** A drawing tool: crosshair cursor, and touch draws instead of scrolling. */
    crosshair?: boolean;
  }
>(function Layer({ passive, clip, crosshair, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: passive ? 'none' : undefined,
        overflow: clip ? 'hidden' : undefined,
        cursor: crosshair ? 'crosshair' : undefined,
        touchAction: crosshair ? 'none' : undefined,
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

/**
 * A box hung under the page box it belongs to (an editor under a form
 * field): at least as wide as the box, above the page's other layers.
 */
export const Below = forwardRef<
  HTMLDivElement,
  DivProps & { minWidth?: number }
>(function Below({ minWidth, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 10,
        marginTop: 4,
        minWidth: minWidth ?? '100%',
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

/**
 * Paper over a page box: hides what the page draws there (a value being
 * replaced). White in both themes, as the page is.
 */
export function Paper({
  transform,
  box,
}: {
  transform: Matrix;
  box: { x: number; y: number; width: number; height: number };
}) {
  const r = boxRect(transform, box);
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: r.x,
        top: r.y,
        width: r.width,
        height: r.height,
        pointerEvents: 'none',
        background: '#fff',
        border: '1px solid rgb(0 0 0 / 0.3)',
      }}
    />
  );
}

/** Where something will go: a dashed accent outline filling its box. */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        border: '1px dashed var(--cy-color-accent)',
      }}
    >
      {children}
    </div>
  );
}

/** A line of text on the paper (dark in both themes), cut short to its box. */
export function PaperLine({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        color: '#111',
        fontSize: 12,
        fontFamily: 'var(--cy-font-sans)',
      }}
    >
      {children}
    </div>
  );
}
