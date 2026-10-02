import { newId } from '@/shared/lib/id';
import { lineFrame } from '@/pdf/doc/ops/edit';
import type { Box, PageId } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { getEditUi, setEditUi, type TextPrompt } from './ui-store';

type Pt = [number, number];

export const TEXT_BOX = { width: 200, height: 40 };
export const IMAGE_WIDTH = 160;

export function addText(
  doc: DocumentApi,
  pageId: PageId,
  rect: Box,
  text: string,
) {
  const s = getEditUi().text;
  return doc.dispatch({
    type: 'content.text',
    params: { id: newId(), pageId, rect, rotate: 0, text, ...s },
  });
}

export function addCover(doc: DocumentApi, p: TextPrompt, text: string) {
  const s = getEditUi().text;
  return doc.dispatch({
    type: 'content.cover',
    params: {
      id: newId(),
      pageId: p.pageId,
      rect: p.rect,
      fill: p.fill ?? '#ffffff',
      text,
      font: s.font,
      size: s.size,
      color: s.color,
      align: s.align,
    },
  });
}

/** Places the picked image centred on `at` (or filling a dragged box). */
export function addImage(
  doc: DocumentApi,
  pageId: PageId,
  at: Pt,
  drag: Box | null,
) {
  const img = getEditUi().image;
  if (!img) return [];
  const width = drag && drag.width > 4 ? drag.width : IMAGE_WIDTH;
  const height = width / img.aspect;
  const x = drag && drag.width > 4 ? drag.x : at[0] - width / 2;
  const y =
    drag && drag.width > 4 ? drag.y + drag.height - height : at[1] - height / 2;
  return doc.dispatch({
    type: 'content.image',
    params: {
      id: newId(),
      pageId,
      rect: { x, y, width, height },
      rotate: 0,
      assetId: img.assetId,
      mime: img.mime,
      opacity: 1,
      keepAspect: true,
    },
  });
}

export function addShape(doc: DocumentApi, pageId: PageId, a: Pt, b: Pt) {
  const ui = getEditUi();
  const kind = ui.shapeKind;
  const geom =
    kind === 'line' || kind === 'arrow'
      ? lineFrame(a, b, ui.shape.width)
      : {
          rect: {
            x: Math.min(a[0], b[0]),
            y: Math.min(a[1], b[1]),
            width: Math.abs(b[0] - a[0]),
            height: Math.abs(b[1] - a[1]),
          },
        };
  return doc.dispatch({
    type: 'content.shape',
    params: {
      id: newId(),
      pageId,
      kind,
      ...geom,
      stroke:
        ui.shape.stroke ??
        (kind === 'line' || kind === 'arrow' ? '#000000' : null),
      fill: kind === 'line' || kind === 'arrow' ? null : ui.shape.fill,
      width: ui.shape.width,
      opacity: ui.shape.opacity,
      rotate: 0,
    },
  });
}

export function openPrompt(prompt: TextPrompt) {
  setEditUi({ prompt });
}
