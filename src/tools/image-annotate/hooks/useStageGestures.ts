import { useRef } from 'react';
import { newId } from '@/shared/lib/id';
import type { StagePointer } from '@/shared/surfaces/raster-stage/RasterStage';
import { aspectRatio, fitAspect, type CropAspect } from '../lib/crop';
import { addObject, docSize, replaceObject } from '../lib/doc';
import {
  clickObject,
  dragObject,
  DRAG_TOOLS,
  extendPen,
  MIN_DRAG,
  type DrawStyle,
  type ToolId,
} from '../lib/draft';
import { clamp, rectFromPoints, type Point } from '../lib/geometry';
import { hitTest, moveObject, type AnnotObject } from '../lib/model';
import type { Annotator } from './useAnnotator';

type Gesture =
  | { kind: 'draw'; id: string; start: Point; pen: AnnotObject | null }
  | { kind: 'move'; target: AnnotObject; start: Point }
  | { kind: 'crop'; start: Point }
  | { kind: 'none' };

/** Hit slack on screen, CSS pixels. */
const HIT_PX = 8;

/**
 * Turns stage pointer gestures into edits for the active tool: drag to draw
 * a shape, click to place text or a step, press an object to select and
 * drag it, or drag a new crop while cropping. Each finished gesture is one
 * undo step; the live state shows as the annotator's preview.
 */
export function useStageGestures(
  a: Annotator,
  tool: ToolId,
  style: DrawStyle,
  scale: number,
  aspect: CropAspect,
  /** A text object was placed: the page focuses its text field. */
  onPlacedText?: (id: string) => void,
) {
  const gesture = useRef<Gesture>({ kind: 'none' });

  return (e: StagePointer) => {
    const doc = a.doc;
    if (!doc) return;
    const size = a.cropDraft && a.full ? a.full : docSize(doc);
    const p = {
      x: clamp(e.x, 0, size.width),
      y: clamp(e.y, 0, size.height),
    };
    const g = gesture.current;

    if (e.phase === 'start') {
      if (a.cropDraft) {
        gesture.current = { kind: 'crop', start: p };
        return;
      }
      if (tool === 'select') {
        const hit = hitTest(doc.objects, p, HIT_PX / scale);
        a.select(hit?.id ?? null);
        gesture.current = hit
          ? { kind: 'move', target: hit, start: p }
          : { kind: 'none' };
        return;
      }
      a.select(null);
      gesture.current = {
        kind: 'draw',
        id: newId(),
        start: p,
        pen:
          tool === 'pen'
            ? {
                id: newId(),
                type: 'pen',
                points: [{ x: p.x, y: p.y, p: e.pressure }],
                ...style,
              }
            : null,
      };
      return;
    }

    if (e.phase === 'cancel') {
      gesture.current = { kind: 'none' };
      a.setPreview(null);
      return;
    }

    const end = e.phase === 'end';
    if (end) gesture.current = { kind: 'none' };

    if (g.kind === 'crop') {
      const far = Math.hypot(p.x - g.start.x, p.y - g.start.y) >= MIN_DRAG;
      if (!far) return;
      const r = rectFromPoints(g.start, p);
      const ratio = aspectRatio(aspect, a.full ?? size);
      a.setCropDraft(ratio ? fitAspect(r, ratio) : r);
      return;
    }

    if (g.kind === 'move') {
      const moved = moveObject(g.target, p.x - g.start.x, p.y - g.start.y);
      if (!end) a.setPreview(replaceObject(doc, moved).objects);
      else if (p.x !== g.start.x || p.y !== g.start.y)
        a.commit(replaceObject(doc, moved));
      else a.setPreview(null);
      return;
    }

    if (g.kind !== 'draw') return;
    if (g.pen && g.pen.type === 'pen') {
      const pen = {
        ...g.pen,
        points: extendPen(g.pen.points, { x: p.x, y: p.y, p: e.pressure }),
      };
      g.pen = pen;
      if (end) a.commit(addObject(doc, pen));
      else a.setPreview([...doc.objects, pen]);
      return;
    }
    if (DRAG_TOOLS.has(tool)) {
      const o = dragObject(tool, g.id, g.start, p, style, size);
      if (!end) {
        a.setPreview(o ? [...doc.objects, o] : null);
        return;
      }
      if (o) {
        a.commit(addObject(doc, o));
        a.select(o.id);
      } else a.setPreview(null);
      return;
    }
    if (end) {
      const o = clickObject(tool, g.id, p, style, size, a.measure);
      if (!o) return;
      a.commit(addObject(doc, o));
      a.select(o.id);
      if (o.type === 'text') onPlacedText?.(o.id);
    }
  };
}
