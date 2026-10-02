import type { ExistingAnnotation } from '@/pdf/render/annotations';
import type { AnnotTarget, NoteParams } from '@/pdf/doc/ops/annotate-params';
import type { PageId } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { kindName, textOf } from './pending-shapes';
import { existingChanges, pendingAnnots } from './tools';

/** One annotation in the comments panel, pending or already in the file. */
export interface CommentRow {
  key: string;
  pageId: PageId;
  pageNumber: number;
  type: string;
  author: string;
  /** ms since epoch, or null when unknown. */
  at: number | null;
  text: string;
  /** Notes can be answered (spec §9.1: replies for Text). */
  replyable: boolean;
  editable: boolean;
  /** Where a reply's icon goes, page space. */
  anchor: [number, number];
  target: AnnotTarget;
  /** For a reply: the parent's key. */
  replyTo: string | null;
}

/** "D:20250101120000Z" or "D:20250101120000+01'00'" to ms; null if unreadable. */
export function parsePdfDate(s: string | null): number | null {
  if (!s) return null;
  const m =
    /^(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz+-])?(\d{2})?'?(\d{2})?/.exec(
      s,
    );
  if (!m) return null;
  const [
    ,
    y,
    mo = '01',
    d = '01',
    h = '00',
    mi = '00',
    se = '00',
    tz,
    oh = '00',
    om = '00',
  ] = m;
  let t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +se);
  if (tz === '+' || tz === '-')
    t -= (tz === '+' ? 1 : -1) * (+oh * 60 + +om) * 60_000;
  else if (!tz) t += new Date(t).getTimezoneOffset() * 60_000;
  return Number.isNaN(t) ? null : t;
}

const SUBTYPE_NAMES: Record<string, string> = {
  Text: 'Note',
  FreeText: 'Text comment',
  Ink: 'Drawing',
  Square: 'Rectangle',
  Circle: 'Ellipse',
  StrikeOut: 'Strikeout',
  Squiggly: 'Squiggly underline',
};

/** Pending and existing annotations of every page, in page order. */
export function commentRows(
  doc: DocumentApi,
  existing: Map<PageId, ExistingAnnotation[]>,
): CommentRow[] {
  const at = new Map(doc.state.log.map((op) => [op.id, op.at]));
  const rows: CommentRow[] = [];
  doc.view.pages.forEach((page, i) => {
    const { deleted, updated } = existingChanges(doc, page.id);
    for (const a of existing.get(page.id) ?? []) {
      if (deleted.has(a.ref)) continue;
      const patch = updated.get(a.ref);
      rows.push({
        key: `e:${page.id}:${a.ref}`,
        pageId: page.id,
        pageNumber: i + 1,
        type: SUBTYPE_NAMES[a.subtype] ?? a.subtype,
        author: a.author ?? 'Unknown',
        at: parsePdfDate(a.modified),
        text: patch?.contents ?? a.contents ?? '',
        replyable: a.subtype === 'Text',
        editable: a.editable,
        anchor: [a.rect.x + a.rect.width + 4, a.rect.y - 24],
        target: { kind: 'existing', ref: a.ref, nm: null, index: a.index },
        replyTo: a.inReplyTo ? `e:${page.id}:${a.inReplyTo}` : null,
      });
    }
    for (const o of pendingAnnots(doc, page.id)) {
      if (o.type === 'annot.author') continue;
      const p = o.params as { author: string } & Partial<NoteParams>;
      const reply = p.replyTo;
      rows.push({
        key: `p:${o.opId}`,
        pageId: page.id,
        pageNumber: i + 1,
        type: kindName(o),
        author: p.author,
        at: at.get(o.opId) ?? null,
        text: textOf(o),
        replyable: o.type === 'annot.note',
        editable: true,
        anchor: p.at ? [p.at[0] + 24, p.at[1] - 24] : [0, 0],
        target: { kind: 'pending', id: o.opId },
        replyTo: reply
          ? reply.kind === 'pending'
            ? `p:${reply.id}`
            : `e:${page.id}:${reply.ref}`
          : null,
      });
    }
  });
  return rows;
}
