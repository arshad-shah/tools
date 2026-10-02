import { newId } from '@/shared/lib/id';
import {
  DrawRectLayer,
  HitArea,
  OverlayLayer,
  ShapeLayer,
  type Shape,
} from '@/shared/ui';
import type { Box } from '@/pdf/doc/types';
import type { PageOverlayProps } from '../types';
import { AREA_TOOL, pageMarks } from './marks';
import { snapToText } from './snap';
import { getRedactUi } from './ui-store';

/**
 * Marks on one page: redact-coloured outlines with a hatched preview (only
 * a preview: nothing is removed until Apply), an accessible hit area per
 * mark (Delete removes it) and, with "Mark area" on, a drawing surface.
 */
export function MarksOverlay(props: PageOverlayProps) {
  const { doc, selection, tool, page, pageNumber, viewport, width, height } =
    props;
  const [a, b, c, d, e, f] = viewport.transform;
  const transform = { a, b, c, d, e, f };
  const marks = pageMarks(doc.view, page.id);
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
      <OverlayLayer
        width={width}
        height={height}
        interactive={drawing}
        label={`Redaction marks on page ${pageNumber}`}
      >
        {drawing ? (
          <DrawRectLayer
            width={width}
            height={height}
            transform={transform}
            label={`Draw a redaction area on page ${pageNumber}`}
            onDraw={(box) => void addArea(box)}
          />
        ) : null}
        {marks.flatMap((m) =>
          m.params.rects.map((box, i) => (
            <HitArea
              key={`${m.opId}-${i}`}
              transform={transform}
              box={box}
              label={`Redaction mark on page ${pageNumber}`}
              pressed={selection.objects.has(m.opId)}
              data-testid="redact-mark"
              onActivate={() => selection.selectObjects([m.opId])}
              onKeyDown={(e) => {
                if (e.key !== 'Delete' && e.key !== 'Backspace') return;
                e.preventDefault();
                e.stopPropagation();
                doc.dispatch({
                  type: 'object.remove',
                  params: { targetId: m.opId },
                });
                selection.clear();
              }}
            />
          )),
        )}
      </OverlayLayer>
    </>
  );
}
