import type { PDFDocument, PDFPage, PDFRef } from 'pdf-lib';
import type { AnnotBase } from '@/pdf/edit/annot/common';
import {
  annotAt,
  annotByNm,
  annotIndex,
  deleteAnnotation,
  parseAnnotRef,
  updateAnnotation,
} from '@/pdf/edit/annot/edit';
import { writeFreeText } from '@/pdf/edit/annot/freetext';
import { writeInk } from '@/pdf/edit/annot/ink';
import { writeLine } from '@/pdf/edit/annot/line';
import { writeTextMarkup } from '@/pdf/edit/annot/markup';
import { writeNote } from '@/pdf/edit/annot/note';
import { writeShape } from '@/pdf/edit/annot/shapes';
import { writeStamp } from '@/pdf/edit/annot/stamp';
import type {
  AnnotTarget,
  DeleteParams,
  FreeTextParams,
  InkParams,
  LineParams,
  MarkupParams,
  NoteParams,
  ShapeParams,
  StampParams,
  UpdateParams,
} from '../ops/annotate-params';
import type { PageId } from '../types';
import {
  defineMaterializer,
  type MaterializeCtx,
  type Materializer,
} from './registry';

/** Notes written in this export, by op id, for replies to pending notes. */
const written = new WeakMap<PDFDocument, Map<string, PDFRef>>();
const writtenIn = (doc: PDFDocument) => {
  let m = written.get(doc);
  if (!m) written.set(doc, (m = new Map()));
  return m;
};

const pageNumber = (ctx: MaterializeCtx, page: PDFPage) =>
  ctx.doc.getPages().indexOf(page) + 1;

/** The output page, or null with a report line when it was not exported. */
function pageFor(ctx: MaterializeCtx, id: PageId): PDFPage | null {
  return ctx.page(id);
}

function base(
  p: { id: string; author: string; color: string },
  extra: { opacity?: number; contents?: string } = {},
): AnnotBase {
  const now = new Date();
  return {
    nm: p.id,
    author: p.author,
    color: p.color,
    opacity: extra.opacity ?? 1,
    contents: extra.contents ?? '',
    created: now,
    modified: now,
  };
}

/** An existing annotation on the output page: by ref, then /NM, then position. */
function locate(page: PDFPage, t: Extract<AnnotTarget, { kind: 'existing' }>) {
  const ref = parseAnnotRef(t.ref);
  if (annotIndex(page, ref) >= 0) return ref;
  if (t.nm) {
    const byNm = annotByNm(page, t.nm);
    if (byNm) return byNm;
  }
  return annotAt(page, t.index);
}

const markup = defineMaterializer<MarkupParams>({
  type: 'annot.markup',
  phase: 'annotation',
  apply(ctx, p) {
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    writeTextMarkup(ctx.doc, page, {
      ...base(p, p),
      subtype: p.subtype,
      quads: p.quads,
    });
  },
});

const note = defineMaterializer<NoteParams>({
  type: 'annot.note',
  phase: 'annotation',
  apply(ctx, p, op) {
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    const notes = writtenIn(ctx.doc);
    let replyTo: PDFRef | string | undefined;
    if (p.replyTo?.kind === 'pending') replyTo = p.replyTo.id;
    if (p.replyTo?.kind === 'existing') {
      const ref = parseAnnotRef(p.replyTo.ref);
      if (annotIndex(page, ref) >= 0) replyTo = ref;
      else
        ctx.note(
          `A reply on page ${pageNumber(ctx, page)} was added as a note: the note it answered is no longer there`,
        );
    }
    const ref = writeNote(
      ctx.doc,
      page,
      { ...base(p, p), at: p.at, icon: p.icon, open: false, replyTo },
      (id) => notes.get(id) ?? null,
    );
    notes.set(op.id, ref);
  },
});

const freetext = defineMaterializer<FreeTextParams>({
  type: 'annot.freetext',
  phase: 'annotation',
  apply(ctx, p) {
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    writeFreeText(ctx.doc, page, {
      ...base(p, { contents: p.text }),
      rect: p.rect,
      text: p.text,
      fontSize: p.fontSize,
      align: p.align,
      border: p.border,
    });
  },
});

const ink = defineMaterializer<InkParams>({
  type: 'annot.ink',
  phase: 'annotation',
  apply(ctx, p) {
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    writeInk(ctx.doc, page, {
      ...base(p, p),
      strokes: p.strokes,
      width: p.width,
    });
  },
});

const shape = defineMaterializer<ShapeParams>({
  type: 'annot.shape',
  phase: 'annotation',
  apply(ctx, p) {
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    writeShape(ctx.doc, page, {
      ...base(p),
      kind: p.kind,
      rect: p.rect,
      width: p.width,
      fill: p.fill,
    });
  },
});

const line = defineMaterializer<LineParams>({
  type: 'annot.line',
  phase: 'annotation',
  apply(ctx, p) {
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    writeLine(ctx.doc, page, {
      ...base(p),
      from: p.from,
      to: p.to,
      width: p.width,
      arrowEnd: p.arrowEnd,
    });
  },
});

const stamp = defineMaterializer<StampParams>({
  type: 'annot.stamp',
  phase: 'annotation',
  async apply(ctx, p) {
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    await writeStamp(ctx.doc, page, {
      ...base(p),
      rect: p.rect,
      preset: p.preset,
      label: p.label,
      image: p.image
        ? { bytes: ctx.asset(p.image.assetId), mime: p.image.mime }
        : undefined,
    });
  },
});

const remove = defineMaterializer<DeleteParams>({
  type: 'annot.delete',
  phase: 'annotation',
  apply(ctx, p) {
    // A pending target is hidden in the view: nothing reaches the writer.
    if (p.target.kind !== 'existing') return;
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    const ref = locate(page, p.target);
    if (!ref || !deleteAnnotation(ctx.doc, page, ref))
      ctx.note(
        `An annotation to delete was no longer on page ${pageNumber(ctx, page)}`,
      );
  },
});

const update = defineMaterializer<UpdateParams>({
  type: 'annot.update',
  phase: 'annotation',
  async apply(ctx, p) {
    if (p.target.kind !== 'existing') return;
    const page = pageFor(ctx, p.pageId);
    if (!page) return;
    const ref = locate(page, p.target);
    if (!ref || !(await updateAnnotation(ctx.doc, page, ref, p.patch)))
      ctx.note(
        `An annotation to edit was no longer on page ${pageNumber(ctx, page)}`,
      );
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ANNOTATE_MATERIALIZERS: readonly Materializer<any>[] = [
  markup,
  note,
  freetext,
  ink,
  shape,
  line,
  stamp,
  remove,
  update,
];
