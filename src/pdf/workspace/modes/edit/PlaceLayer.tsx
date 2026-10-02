import { useRef, useState } from 'react';
import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { OverlayLayer, ShapeLayer, type Shape } from '@/shared/ui';
import { toPage, type Viewport } from '@/pdf/doc/geometry';
import type { Box, OpId, PageRef } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { addImage, addShape, openPrompt, TEXT_BOX } from './place';
import { getEditUi, type EditTool } from './ui-store';

type Pt = [number, number];
const MIN_DRAG = 4;

const boxOf = (a: Pt, b: Pt): Box => ({
  x: Math.min(a[0], b[0]),
  y: Math.min(a[1], b[1]),
  width: Math.abs(b[0] - a[0]),
  height: Math.abs(b[1] - a[1]),
});

/**
 * Click or drag to place: text (click: a default box, drag: that box),
 * image, shapes, and cover and replace (drag over text; the cover colour is
 * sampled from the rendered page). A placed image or shape goes to
 * `onPlaced`, so the mode selects it and returns to Select.
 */
export function PlaceLayer({
  doc,
  page,
  pageNumber,
  tool,
  viewport,
  width,
  height,
  onPlaced,
}: {
  doc: DocumentApi;
  page: PageRef;
  pageNumber: number;
  tool: EditTool;
  viewport: Viewport;
  width: number;
  height: number;
  onPlaced?: (id: OpId) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<[Pt, Pt] | null>(null);
  const [a, b, c, d, e, f] = viewport.transform;
  const t = { a, b, c, d, e, f };
  const scale = Math.hypot(a, b);
  const pointOf = (ev: React.PointerEvent): Pt => {
    const r = ref.current!.getBoundingClientRect();
    return toPage(viewport, ev.clientX - r.left, ev.clientY - r.top) as Pt;
  };

  const sample = async (rect: Box): Promise<string> => {
    const docId = page.blank ? null : doc.sources[page.source]?.docId;
    if (!docId) return '#ffffff';
    try {
      return await doc.render.sampleColor(docId, page.index, rect);
    } catch (err) {
      notify.error(toToolError(err));
      return '#ffffff';
    }
  };

  const commit = async (start: Pt, end: Pt) => {
    const dragged =
      Math.hypot(end[0] - start[0], end[1] - start[1]) * scale >= MIN_DRAG;
    const box = boxOf(start, end);
    const placed = (ops: readonly { id: OpId }[]) => {
      if (ops.length) onPlaced?.(ops[0].id);
    };
    switch (tool) {
      case 'text':
        openPrompt({
          kind: 'text',
          pageId: page.id,
          rect: dragged
            ? box
            : { x: start[0], y: start[1] - TEXT_BOX.height, ...TEXT_BOX },
        });
        return;
      case 'image':
        if (!getEditUi().image) {
          doc.announce('Choose an image first');
          return;
        }
        placed(addImage(doc, page.id, start, dragged ? box : null));
        return;
      case 'shape':
        if (dragged) placed(addShape(doc, page.id, start, end));
        return;
      case 'cover':
        if (!dragged) return;
        openPrompt({
          kind: 'cover',
          pageId: page.id,
          rect: box,
          fill: await sample(box),
        });
        return;
    }
  };

  const preview: Shape[] = drag
    ? [
        {
          kind: 'rect',
          box: boxOf(drag[0], drag[1]),
          stroke: { token: 'accent' },
          width: 1,
          dash: 'dashed',
        },
      ]
    : [];

  return (
    <OverlayLayer
      width={width}
      height={height}
      interactive
      label={`Place on page ${pageNumber}`}
      className="cursor-crosshair touch-none"
      data-testid={`edit-place-${pageNumber}`}
    >
      <div
        ref={ref}
        className="absolute inset-0"
        onPointerDown={(ev) => {
          if (ev.button !== 0) return;
          ev.currentTarget.setPointerCapture(ev.pointerId);
          const p = pointOf(ev);
          setDrag([p, p]);
        }}
        onPointerMove={(ev) => drag && setDrag([drag[0], pointOf(ev)])}
        onPointerUp={(ev) => {
          if (!drag) return;
          const end = pointOf(ev);
          setDrag(null);
          void commit(drag[0], end);
        }}
        onPointerCancel={() => setDrag(null)}
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
