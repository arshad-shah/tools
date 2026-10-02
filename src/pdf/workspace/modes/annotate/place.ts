import type { DocumentApi } from '../types';
import { addAnnotation } from './tools';
import { getAnnotateUi } from './ui-store';

type Pt = [number, number];

/** Default sizes for objects placed with a click (points). */
export const STAMP_SIZE = { width: 160, height: 48 };
export const FREETEXT_SIZE = { width: 180, height: 48 };

/** Places a stamp centred on a page point. */
export function placeStamp(doc: DocumentApi, pageId: string, at: Pt): void {
  const ui = getAnnotateUi();
  if (ui.imageStamp) {
    const width = 120;
    const height = width / ui.imageStamp.aspect;
    addAnnotation(doc, 'annot.stamp', {
      pageId,
      rect: { x: at[0] - width / 2, y: at[1] - height / 2, width, height },
      image: { assetId: ui.imageStamp.assetId, mime: ui.imageStamp.mime },
    });
    return;
  }
  addAnnotation(doc, 'annot.stamp', {
    pageId,
    rect: {
      x: at[0] - STAMP_SIZE.width / 2,
      y: at[1] - STAMP_SIZE.height / 2,
      ...STAMP_SIZE,
    },
    preset: ui.stamp ?? 'Approved',
  });
}
