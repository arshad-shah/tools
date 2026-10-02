import {
  PDFDict,
  PDFName,
  PDFRawStream,
  PDFRef,
  type PDFDocument,
} from 'pdf-lib';
import type { ImageCodec } from '@/pdf/compress/codec';
import type { Box } from '@/pdf/doc/types';
import type { RasterReason } from '@/pdf/edit/content/font-metrics';
import {
  interpret,
  type FontCache,
  type Interpretation,
} from '@/pdf/edit/content/interpreter';
import type { Matrix } from '@/pdf/edit/content/matrix';
import type { ParsedContent } from '@/pdf/edit/content/tokens';
import { applyEdits, mergeEdits, type Edits } from './edits';
import { intersects } from './geometry';
import {
  decodeForRedaction,
  encodeReplacement,
  imageCoverage,
  paintCovered,
} from './images';
import { patchInline } from './inline';
import { pathEdits } from './paths';
import { glyphEdits, markedContentEdits } from './text';
import { redactForm } from './xobjects';

export interface RedactCounts {
  glyphs: number;
  images: number;
  paths: number;
}

export interface RedactPageCtx {
  doc: PDFDocument;
  codec: ImageCodec;
  fonts: FontCache;
  /** Fill colour as 0..255 RGB, painted into patched images. */
  fill: [number, number, number];
  depth: number;
  counts: RedactCounts;
  /** Dependency injection for tests (a deliberately broken run). */
  glyphEdits?: typeof glyphEdits;
}

export interface RedactStreamResult {
  parsed: ParsedContent;
  changed: boolean;
  raster: RasterReason[];
  /** A private copy of the resources when XObjects were replaced. */
  resources: PDFDict | undefined;
}

/** Copies of `resources` and its /XObject dict, created on first use. */
function privateXObjects(doc: PDFDocument, resources: PDFDict | undefined) {
  let res: PDFDict | undefined;
  let xobjects: PDFDict | undefined;
  const own = () => {
    if (!res || !xobjects) {
      res = resources ? resources.clone(doc.context) : doc.context.obj({});
      const original = res.lookupMaybe(PDFName.of('XObject'), PDFDict);
      xobjects = original ? original.clone(doc.context) : doc.context.obj({});
      res.set(PDFName.of('XObject'), xobjects);
    }
    return xobjects;
  };
  return {
    /** Drops an entry the new content no longer draws (so the original can be swept). */
    remove(name: string): void {
      own().delete(PDFName.of(name));
    },
    add(ref: PDFRef): string {
      own();
      xobjects = xobjects!;
      let n = 0;
      while (xobjects.has(PDFName.of(`Rd${n}`))) n++;
      xobjects.set(PDFName.of(`Rd${n}`), ref);
      return `Rd${n}`;
    },
    get resources() {
      return res;
    },
  };
}

const doOp = (name: string) => [
  { op: 'Do', operands: [{ t: 'name' as const, v: name }] },
];

async function imageEdits(
  parsed: ParsedContent,
  interp: Interpretation,
  resources: PDFDict | undefined,
  marks: readonly Box[],
  ctx: RedactPageCtx,
  xo: ReturnType<typeof privateXObjects>,
): Promise<{ edits: Edits; raster: RasterReason[] }> {
  const edits: Edits = new Map();
  const raster: RasterReason[] = [];
  const xobjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  for (const hit of interp.images) {
    const cov = imageCoverage(hit.ctm, marks);
    if (cov === 'none') continue;
    ctx.counts.images++;
    if (cov === 'full') {
      edits.set(hit.op, []);
      continue;
    }
    if (hit.inline) {
      const r = patchInline(parsed.ops[hit.op], hit.ctm, marks, ctx.fill);
      if ('raster' in r) raster.push(r.raster);
      else edits.set(hit.op, [r.op]);
      continue;
    }
    const ref = xobjects?.get(PDFName.of(hit.name!));
    const stream = ref ? ctx.doc.context.lookup(ref) : undefined;
    if (!(stream instanceof PDFRawStream)) {
      raster.push('parse-error');
      continue;
    }
    const img = await decodeForRedaction(ctx.doc, stream, ctx.codec);
    if ('raster' in img) {
      raster.push(img.raster);
      continue;
    }
    paintCovered(img, hit.ctm, marks, ctx.fill);
    const replacement = await encodeReplacement(
      ctx.doc,
      stream,
      img,
      ctx.codec,
    );
    edits.set(hit.op, doOp(xo.add(replacement)));
  }
  return { edits, raster };
}

/**
 * Redacts one content stream (a page's or a form's) under `marks`: glyphs,
 * painted paths, images (patched into new XObjects) and forms (cloned).
 * Any raster reason means nothing here may be trusted: the caller turns
 * the page into an image.
 */
export async function redactStream(
  parsed: ParsedContent,
  resources: PDFDict | undefined,
  ctm: Matrix,
  marks: readonly Box[],
  ctx: RedactPageCtx,
): Promise<RedactStreamResult> {
  const fail = (raster: RasterReason[]): RedactStreamResult => ({
    parsed,
    changed: false,
    raster: [...new Set(raster)],
    resources: undefined,
  });
  const interp = interpret(parsed, resources, ctx.doc, ctm, ctx.fonts);
  if (interp.raster.length) return fail(interp.raster);
  // Pattern cells and soft-mask groups can draw anything (text included)
  // where they are painted: not edited in place.
  const touches = (b: Box) => marks.some((m) => intersects(b, m));
  if (
    interp.paths.some((p) => p.painted && p.pattern && touches(p.bbox)) ||
    interp.masks.some(touches)
  )
    return fail(['pattern-content']);
  const g = (ctx.glyphEdits ?? glyphEdits)(parsed, interp, marks);
  if (g.uncompensated) return fail(['parse-error']);
  const p = pathEdits(parsed, interp, marks);
  const xo = privateXObjects(ctx.doc, resources);
  const img = await imageEdits(parsed, interp, resources, marks, ctx, xo);
  if (img.raster.length) return fail(img.raster);
  const forms: Edits = new Map();
  const xobjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  for (const hit of interp.forms) {
    const ref = xobjects?.get(PDFName.of(hit.name));
    if (!(ref instanceof PDFRef)) {
      // A direct (inline) form stream cannot be shared: not expected here.
      return fail(['parse-error']);
    }
    const r = await redactForm(
      ctx.doc,
      ref,
      hit.ctm,
      marks,
      ctx,
      redactStream,
      resources,
    );
    if (r.raster.length) return fail(r.raster);
    if (r.changed) forms.set(hit.op, doOp(xo.add(r.ref)));
  }
  ctx.counts.glyphs += g.removed;
  ctx.counts.paths += p.removed;
  const edits = mergeEdits(
    g.edits,
    p.edits,
    img.edits,
    forms,
    g.removed ? markedContentEdits(parsed) : new Map(),
  );
  const next = applyEdits(parsed, edits);
  // Originals the page no longer draws leave its (private) resources, so
  // the sweep removes them: no copy of a redacted image or form remains.
  const drawn = new Set(
    next.ops
      .filter((o) => o.op === 'Do' && o.operands[0]?.t === 'name')
      .map((o) => (o.operands[0] as { v: string }).v),
  );
  const replaced = [...interp.images, ...interp.forms].filter(
    (h) => h.name !== null && edits.has(h.op) && !drawn.has(h.name),
  );
  for (const h of replaced) xo.remove(h.name!);
  return {
    parsed: next,
    changed: edits.size > 0,
    raster: [],
    resources: xo.resources,
  };
}
