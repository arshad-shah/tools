import { useRef } from 'react';
import { HitArea, OverlayLayer, SelectionFrame } from '@/shared/ui';
import type { Viewport } from '@/pdf/doc/geometry';
import type { OverlayItem, PageRef } from '@/pdf/doc/types';
import type { DocumentApi, SelectionApi } from '../modes/types';
import {
  frameRotation,
  objectsOn,
  opRotation,
  type ObjectGeometry,
} from './useObjectSelection';

export interface ObjectsOverlayProps {
  doc: DocumentApi;
  selection: SelectionApi;
  page: PageRef;
  pageNumber: number;
  viewport: Viewport;
  width: number;
  height: number;
  /** Accessible name of an object, e.g. "Text box: Hello". */
  labelOf(item: OverlayItem): string;
  /** Images keep their aspect ratio while resizing. */
  keepAspect?(item: OverlayItem): boolean;
}

/**
 * Hit areas and selection frames for the Edit objects on one page (spec
 * §9.2): click selects (Shift adds), the frame moves, resizes and rotates
 * (arrows 1pt, Shift 10pt, Alt resizes, [ and ] rotate), and each committed
 * change is one object.move.
 */
export function ObjectsOverlay({
  doc,
  selection,
  page,
  pageNumber,
  viewport,
  width,
  height,
  labelOf,
  keepAspect,
}: ObjectsOverlayProps) {
  const shift = useRef(false);
  const [a, b, c, d, e, f] = viewport.transform;
  const t = { a, b, c, d, e, f };
  const items = objectsOn(doc, page.id);
  if (items.length === 0) return null;
  return (
    <OverlayLayer
      width={width}
      height={height}
      label={`Objects on page ${pageNumber}`}
    >
      <div
        className="contents"
        onPointerDownCapture={(ev) => {
          shift.current = ev.shiftKey;
        }}
      >
        {items.map((o) => {
          const g = o.params as ObjectGeometry;
          return (
            <HitArea
              key={o.opId}
              transform={t}
              box={g.rect}
              label={labelOf(o)}
              pressed={selection.objects.has(o.opId)}
              onActivate={() =>
                selection.selectObjects(
                  [o.opId],
                  shift.current ? 'toggle' : 'replace',
                )
              }
            />
          );
        })}
        {items
          .filter((o) => selection.objects.has(o.opId))
          .map((o) => {
            const g = o.params as ObjectGeometry;
            return (
              <SelectionFrame
                key={`frame-${o.opId}`}
                transform={t}
                box={g.rect}
                rotate={frameRotation(g.rotate)}
                resizable
                rotatable
                keepAspect={keepAspect?.(o) ?? false}
                label={labelOf(o)}
                onChange={() => {}}
                onCommit={(rect, rot) =>
                  doc.dispatch({
                    type: 'object.move',
                    params: { targetId: o.opId, rect, rotate: opRotation(rot) },
                  })
                }
              />
            );
          })}
      </div>
    </OverlayLayer>
  );
}
