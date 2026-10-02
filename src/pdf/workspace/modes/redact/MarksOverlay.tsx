import { useState } from 'react';
import { newId } from '@/shared/lib/id';
import {
  DrawRectLayer,
  OverlayLayer,
  ShapeLayer,
  type ObjectChange,
  type Shape,
} from '@/shared/ui';
import { geometryBounds } from '@/pdf/doc/object-geometry';
import type { RedactMarkParams } from '@/pdf/doc/ops/redact';
import type { Box } from '@/pdf/doc/types';
import type { PageOverlayProps } from '../types';
import { ModeObjectLayer } from '../../objects/ModeObjectLayer';
import { focusProperties, previewItem } from '../../objects/object-ops';
import { AREA_TOOL, pageMarks } from './marks';
import { snapToText } from './snap';
import { getRedactUi } from './ui-store';

/**
 * Marks on one page: redact-coloured outlines with a hatched preview (only
 * a preview: nothing is removed until Apply), each mark a placed object
 * (move, resize, Delete, the object menu) and, with "Mark area" on, a
 * drawing surface.
 */
export function MarksOverlay(props: PageOverlayProps) {
  const { doc, selection, tool, page, pageNumber, viewport, width, height } =
    props;
  const [a, b, c, d, e, f] = viewport.transform;
  const transform = { a, b, c, d, e, f };
  const [preview, setPreview] = useState<ReadonlyMap<
    string,
    ObjectChange
  > | null>(null);
  const placed = pageMarks(doc.view, page.id);
  // Marks follow a drag live; the op lands on release.
  const marks = placed.map(
    (m) =>
      previewItem(m, preview?.get(m.opId)) as typeof m & {
        params: RedactMarkParams;
      },
  );
  const drawing = tool.id === AREA_TOOL;
  const shapes: Shape[] = marks.flatMap((m) =>
    m.params.rects.map(
      (box): Shape => ({
        kind: 'rect',
        box,
        stroke: { token: 'redact' },
        fill: { hex: m.params.fill, opacity: 0.35 },
        width: selection.objects.has(m.opId) ? 3 : 1.5,
        hatch: true,
      }),
    ),
  );

  const addArea = async (drawn: Box) => {
    const ui = getRedactUi();
    let box = drawn;
    if (ui.snap) {
      try {
        box = snapToText(drawn, await doc.text(page));
      } catch {
        box = drawn;
      }
    }
    const done = doc.dispatch({
      type: 'redact.mark',
      params: {
        id: newId(),
        pageId: page.id,
        rects: [box],
        source: { kind: 'area' },
        fill: ui.fill,
        overlayText: ui.overlayText.trim() || null,
      },
    });
    if (done.length) doc.announce(done[0].label);
  };

  if (!marks.length && !drawing) return null;
  return (
    <>
      <ShapeLayer
        width={width}
        height={height}
        transform={transform}
        shapes={shapes}
      />
      {drawing ? (
        <OverlayLayer
          width={width}
          height={height}
          interactive
          label={`Redaction marks on page ${pageNumber}`}
        >
          <DrawRectLayer
            width={width}
            height={height}
            transform={transform}
            label={`Draw a redaction area on page ${pageNumber}`}
            onDraw={(box) => void addArea(box)}
          />
        </OverlayLayer>
      ) : (
        <ModeObjectLayer
          doc={doc}
          selection={selection}
          pageNumber={pageNumber}
          viewport={viewport}
          width={width}
          height={height}
          marquee
          orderable={false}
          onPreview={setPreview}
          objects={placed.flatMap((m) => {
            const box = geometryBounds(m.params);
            return box
              ? [
                  {
                    id: m.opId,
                    box,
                    label: `Redaction mark on page ${pageNumber}`,
                    testId: 'redact-mark',
                  },
                ]
              : [];
          })}
          onProperties={(id) => {
            selection.selectObjects([id]);
            focusProperties();
          }}
        />
      )}
    </>
  );
}
