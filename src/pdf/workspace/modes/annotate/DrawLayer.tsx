import { useRef, useState } from 'react';
import { OverlayLayer, ShapeLayer, type Shape } from '@/shared/ui';
import { toPage, type Viewport } from '@/pdf/doc/geometry';
import type { Box, PageRef } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { FREETEXT_SIZE, placeStamp } from './place';
import { addAnnotation, type AnnotateTool } from './tools';
import { getAnnotateUi, setAnnotateUi } from './ui-store';

export interface DrawLayerProps {
  doc: DocumentApi;
  page: PageRef;
  pageNumber: number;
  tool: AnnotateTool;
  viewport: Viewport;
  width: number;
  height: number;
}

type Pt = [number, number];
const MIN_DRAG = 3;

const boxOf = (a: Pt, b: Pt): Box => ({
  x: Math.min(a[0], b[0]),
  y: Math.min(a[1], b[1]),
  width: Math.abs(b[0] - a[0]),
  height: Math.abs(b[1] - a[1]),
});

/**
 * Pointer drawing for the shape, pen, note, text comment and stamp tools:
 * a live preview while dragging, one op on release.
 */
export function DrawLayer({
  doc,
  page,
  pageNumber,
  tool,
  viewport,
  width,
  height,
}: DrawLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Pt[] | null>(null);
  const [a, b, c, d, e, f] = viewport.transform;
  const t = { a, b, c, d, e, f };
  const scale = Math.hypot(a, b);

  const pointOf = (ev: React.PointerEvent): Pt => {
    const r = ref.current!.getBoundingClientRect();
    return toPage(viewport, ev.clientX - r.left, ev.clientY - r.top) as Pt;
  };

  const commit = (pts: Pt[]) => {
    const ui = getAnnotateUi();
    const start = pts[0];
    const end = pts[pts.length - 1];
    const dragged =
      Math.hypot(end[0] - start[0], end[1] - start[1]) * scale >= MIN_DRAG;
    switch (tool) {
      case 'pen':
        addAnnotation(doc, 'annot.ink', {
          pageId: page.id,
          strokes: [pts],
          width: ui.width,
          opacity: ui.opacity,
        });
        return;
      case 'rect':
      case 'ellipse':
        if (!dragged) return;
        addAnnotation(doc, 'annot.shape', {
          pageId: page.id,
          kind: tool === 'rect' ? 'Square' : 'Circle',
          rect: boxOf(start, end),
          width: ui.width,
          fill: null,
        });
        return;
      case 'line':
      case 'arrow':
        if (!dragged) return;
        addAnnotation(doc, 'annot.line', {
          pageId: page.id,
          from: start,
          to: end,
          width: ui.width,
          arrowEnd: tool === 'arrow',
        });
        return;
      case 'note':
        setAnnotateUi({
          editor: {
            kind: 'note',
            pageId: page.id,
            at: [start[0], start[1] - 20],
          },
        });
        return;
      case 'freetext':
        setAnnotateUi({
          editor: {
            kind: 'freetext',
            pageId: page.id,
            rect: dragged
              ? boxOf(start, end)
              : {
                  x: start[0],
                  y: start[1] - FREETEXT_SIZE.height,
                  ...FREETEXT_SIZE,
                },
          },
        });
        return;
      case 'stamp':
        placeStamp(doc, page.id, start);
        return;
    }
  };

  const preview: Shape[] = [];
  if (draft && draft.length > 1) {
    const ui = getAnnotateUi();
    const start = draft[0];
    const end = draft[draft.length - 1];
    const ink = { hex: ui.color };
    if (tool === 'pen')
      preview.push({
        kind: 'ink',
        points: [draft],
        stroke: ink,
        width: ui.width * scale,
      });
    else if (tool === 'rect' || tool === 'freetext')
      preview.push({
        kind: 'rect',
        box: boxOf(start, end),
        stroke: ink,
        width: 1,
        dash: 'dashed',
      });
    else if (tool === 'ellipse')
      preview.push({
        kind: 'ellipse',
        box: boxOf(start, end),
        stroke: ink,
        width: ui.width * scale,
      });
    else if (tool === 'line' || tool === 'arrow')
      preview.push({
        kind: 'line',
        from: start,
        to: end,
        stroke: ink,
        width: ui.width * scale,
        arrowEnd: tool === 'arrow',
      });
  }

  return (
    <OverlayLayer
      width={width}
      height={height}
      interactive
      label={`Draw on page ${pageNumber}`}
      className="cursor-crosshair touch-none"
      data-testid={`annotate-draw-${pageNumber}`}
    >
      <div
        ref={ref}
        className="absolute inset-0"
        onPointerDown={(ev) => {
          if (ev.button !== 0) return;
          ev.currentTarget.setPointerCapture(ev.pointerId);
          setDraft([pointOf(ev)]);
        }}
        onPointerMove={(ev) => {
          if (!draft) return;
          const p = pointOf(ev);
          setDraft(tool === 'pen' ? [...draft, p] : [draft[0], p]);
        }}
        onPointerUp={(ev) => {
          if (!draft) return;
          const pts =
            tool === 'pen' ? [...draft, pointOf(ev)] : [draft[0], pointOf(ev)];
          setDraft(null);
          commit(pts);
        }}
        onPointerCancel={() => setDraft(null)}
      />
      {preview.length ? (
        <ShapeLayer
          width={width}
          height={height}
          transform={t}
          shapes={preview}
        />
      ) : null}
    </OverlayLayer>
  );
}
