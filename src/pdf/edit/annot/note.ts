import { PDFName, type PDFDocument, type PDFPage, PDFRef } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { Box } from '../draw';
import {
  appearanceStream,
  fmt,
  opacityState,
  rgbOps,
  setAppearance,
} from './appearance';
import { addToPage, baseAnnot, type AnnotBase } from './common';
import { darker, NOTE_SIZE } from './geometry';

export { NOTE_SIZE } from './geometry';

export interface NoteParams extends AnnotBase {
  /** Lower-left corner of the 20pt icon, page space. */
  at: [number, number];
  icon: 'Comment' | 'Note';
  open: boolean;
  /** The note this replies to: an object reference, or the /NM of a note written in this run. */
  replyTo?: PDFRef | string;
}

/** 20x20 note icon as paths: rounded rectangle and three text lines. */
export function noteAppearance(at: [number, number], color: string): string {
  const [x, y] = at;
  const s = NOTE_SIZE;
  const r = 3;
  const k = r * 0.5523;
  const x0 = x + 1;
  const y0 = y + 1;
  const x1 = x + s - 1;
  const y1 = y + s - 1;
  const outline = [
    `${fmt(x0 + r)} ${fmt(y0)} m`,
    `${fmt(x1 - r)} ${fmt(y0)} l`,
    `${fmt(x1 - r + k)} ${fmt(y0)} ${fmt(x1)} ${fmt(y0 + r - k)} ${fmt(x1)} ${fmt(y0 + r)} c`,
    `${fmt(x1)} ${fmt(y1 - r)} l`,
    `${fmt(x1)} ${fmt(y1 - r + k)} ${fmt(x1 - r + k)} ${fmt(y1)} ${fmt(x1 - r)} ${fmt(y1)} c`,
    `${fmt(x0 + r)} ${fmt(y1)} l`,
    `${fmt(x0 + r - k)} ${fmt(y1)} ${fmt(x0)} ${fmt(y1 - r + k)} ${fmt(x0)} ${fmt(y1 - r)} c`,
    `${fmt(x0)} ${fmt(y0 + r)} l`,
    `${fmt(x0)} ${fmt(y0 + r - k)} ${fmt(x0 + r - k)} ${fmt(y0)} ${fmt(x0 + r)} ${fmt(y0)} c h`,
  ].join(' ');
  const lines = [0.7, 0.5, 0.3]
    .map(
      (f) =>
        `${fmt(x + 5)} ${fmt(y + s * f)} m ${fmt(x + s - 5)} ${fmt(y + s * f)} l`,
    )
    .join(' ');
  return [
    'q',
    '/GS0 gs',
    rgbOps(color, false),
    rgbOps(darker(color), true),
    '1 w',
    `${outline} B`,
    '1.2 w 1 J',
    `${lines} S`,
    'Q',
  ].join('\n');
}

/**
 * A sticky note (/Text) with its /Popup. A reply carries /IRT and /RT /R
 * (spec §9.1). `resolveNm` finds notes written earlier in the same run.
 */
export function writeNote(
  doc: PDFDocument,
  page: PDFPage,
  p: NoteParams,
  resolveNm: (nm: string) => PDFRef | null,
): PDFRef {
  const [x, y] = p.at;
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new ToolError('INVALID_INPUT', 'The note position is not valid');
  const rect: Box = { x, y, width: NOTE_SIZE, height: NOTE_SIZE };
  const dict = baseAnnot(doc, page, 'Text', rect, p);
  dict.set(PDFName.of('Name'), PDFName.of(p.icon));
  dict.set(PDFName.of('Open'), doc.context.obj(false));
  if (p.replyTo !== undefined) {
    const parent =
      p.replyTo instanceof PDFRef ? p.replyTo : resolveNm(p.replyTo);
    if (!parent)
      throw new ToolError(
        'INVALID_INPUT',
        'The note this replies to is no longer in the document',
      );
    dict.set(PDFName.of('IRT'), parent);
    dict.set(PDFName.of('RT'), PDFName.of('R'));
  }
  setAppearance(
    dict,
    appearanceStream(doc, rect, noteAppearance(p.at, p.color), {
      ExtGState: { GS0: opacityState(p.opacity) },
    }),
  );
  const ref = addToPage(doc, page, dict);
  const popup = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Popup',
    Rect: [
      x + NOTE_SIZE + 4,
      y + NOTE_SIZE - 100,
      x + NOTE_SIZE + 204,
      y + NOTE_SIZE,
    ],
    Parent: ref,
    Open: p.open,
    F: 28, // Print, NoZoom, NoRotate
  });
  const popupRef = addToPage(doc, page, popup);
  dict.set(PDFName.of('Popup'), popupRef);
  return ref;
}
