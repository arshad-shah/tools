import {
  BitmapCanvas,
  HitArea,
  PageBox,
  ShapeLayer,
  type ObjectChange,
  type OverlayTransform,
  type Shape,
} from '@/shared/ui';
import type { ExistingAnnotation } from '@/pdf/render/annotations';
import type { Box, PageRef } from '@/pdf/doc/types';
import { boxToScreen, type Viewport } from '@/pdf/doc/geometry';
import type { DocumentApi } from '../types';
import { useCleanPatch } from './existing';
import { existingId, movedAnnotation } from './existing-objects';
import { existingChanges, existingLabel, type AnnotateTool } from './tools';
import { setAnnotateUi, useAnnotateUi } from './ui-store';

/** Patches cover strokes drawn a little outside the rect. */
const PAD = 2;
const padded = (b: Box): Box => ({
  x: b.x - PAD,
  y: b.y - PAD,
  width: b.width + 2 * PAD,
  height: b.height + 2 * PAD,
});

/** The page without annotations over one box: hides an existing annotation in preview. */
function Patch({
  doc,
  page,
  box,
  viewport,
  transform,
}: {
  doc: DocumentApi;
  page: PageRef;
  box: Box;
  viewport: Viewport;
  transform: OverlayTransform;
}) {
  const scale = Math.hypot(viewport.transform[0], viewport.transform[1]);
  const bitmap = useCleanPatch(doc, page, box, scale);
  const r = boxToScreen(viewport, box);
  if (!bitmap) return null;
  return (
    <PageBox transform={transform} box={box}>
      <BitmapCanvas
        bitmap={bitmap}
        width={r.width}
        height={r.height}
        label=""
      />
    </PageBox>
  );
}

/** A recoloured existing annotation, drawn approximately until export. */
function editedShapes(
  a: ExistingAnnotation,
  color: string,
  scale: number,
): Shape[] {
  const ink = { hex: color };
  if (a.quadPoints && a.subtype === 'Highlight')
    return [
      {
        kind: 'quads',
        quads: chunk(a.quadPoints),
        fill: ink,
        blend: 'multiply',
      },
    ];
  if (
    a.quadPoints &&
    ['Underline', 'StrikeOut', 'Squiggly'].includes(a.subtype)
  )
    return [
      {
        kind:
          a.subtype === 'Underline'
            ? 'underline'
            : a.subtype === 'StrikeOut'
              ? 'strike'
              : 'squiggly',
        quads: chunk(a.quadPoints),
        stroke: ink,
        width: scale,
      },
    ];
  if (a.subtype === 'Circle')
    return [{ kind: 'ellipse', box: a.rect, stroke: ink, width: 2 * scale }];
  return [
    {
      kind: 'rect',
      box: a.rect,
      stroke: ink,
      width: 2 * scale,
      dash: a.subtype === 'Square' ? 'solid' : 'dashed',
    },
  ];
}

const chunk = (q: number[]) => {
  const out: number[][] = [];
  for (let i = 0; i + 8 <= q.length; i += 8) out.push(q.slice(i, i + 8));
  return out;
};

export interface ExistingLayerProps {
  doc: DocumentApi;
  page: PageRef;
  list: ExistingAnnotation[];
  tool: AnnotateTool;
  viewport: Viewport;
  width: number;
  height: number;
  /** Hit areas take pointer events (the Eraser; Select uses the object layer). */
  interactive: boolean;
  /** Moves and resizes in progress on the object layer, by object id. */
  preview?: ReadonlyMap<string, ObjectChange> | null;
}

/**
 * Existing annotations: preview patches for hidden, deleted, recoloured
 * and moved ones (a moved one drawn approximately at its new place until
 * export), and their hit areas.
 */
export function ExistingLayer({
  doc,
  page,
  list,
  tool,
  viewport,
  width,
  height,
  interactive,
  preview,
}: ExistingLayerProps) {
  const ui = useAnnotateUi();
  const { deleted, updated } = existingChanges(doc, page.id);
  const [a, b, c, d, e, f] = viewport.transform;
  const t = { a, b, c, d, e, f };
  const scale = Math.hypot(a, b);
  const rectOf = (x: ExistingAnnotation) =>
    preview?.get(existingId(x.ref))?.box ?? updated.get(x.ref)?.rect;
  const patched = list.filter(
    (x) =>
      ui.hideExisting ||
      deleted.has(x.ref) ||
      updated.get(x.ref)?.color ||
      rectOf(x),
  );
  const shown = list.filter((x) => !ui.hideExisting && !deleted.has(x.ref));
  const edits: Shape[] = list.flatMap((x) => {
    const color = updated.get(x.ref)?.color;
    const rect = rectOf(x);
    if ((!color && !rect) || deleted.has(x.ref) || ui.hideExisting) return [];
    return editedShapes(
      rect ? movedAnnotation(x, rect) : x,
      color ?? x.color ?? '#000000',
      scale,
    );
  });
  return (
    <>
      {patched.map((x) => (
        <Patch
          key={`patch-${x.ref}`}
          doc={doc}
          page={page}
          box={padded(x.rect)}
          viewport={viewport}
          transform={t}
        />
      ))}
      {edits.length ? (
        <ShapeLayer
          width={width}
          height={height}
          transform={t}
          shapes={edits}
        />
      ) : null}
      {interactive
        ? shown.map((x) => (
            <HitArea
              key={x.ref}
              transform={t}
              box={rectOf(x) ?? x.rect}
              label={existingLabel({ ...x, ...updated.get(x.ref) })}
              pressed={ui.selectedExisting?.ref === x.ref}
              onActivate={() => {
                if (tool === 'eraser')
                  doc.dispatch({
                    type: 'annot.delete',
                    params: {
                      pageId: page.id,
                      target: {
                        kind: 'existing',
                        ref: x.ref,
                        nm: null,
                        index: x.index,
                      },
                    },
                  });
                else
                  setAnnotateUi({
                    selectedExisting: {
                      pageId: page.id,
                      ref: x.ref,
                      index: x.index,
                    },
                  });
              }}
            />
          ))
        : null}
    </>
  );
}
