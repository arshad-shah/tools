import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFString,
  type PDFObject,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { FontCache, loadNotoSans } from '@/pdf/edit/font-cache';
import type { Box } from '@/pdf/edit/draw';
import { uprightFrame } from '@/pdf/edit/draw-signature';
import { drawSignatureContent } from '@/pdf/doc/materialize/fill-sign-signature';
import type { SignatureContent } from '@/pdf/doc/ops/sign-params';
import { buildAppearance, type PaintVisual } from './appearance';
import {
  insertSignature,
  locateAndPatchByteRange,
  sigDictBytes,
  signedContent,
  type ByteRangeInfo,
} from './byte-range';
import {
  appendIncrement,
  serializeObject,
  type IncrementObject,
} from './incremental';
import { readTail } from './tail';

export interface SignPlacement {
  pageIndex: number;
  /** Page space (PDF user space, points), as the placed signature's rect. */
  rect: Box;
  /** The placed signature's own rotation, degrees clockwise on screen. */
  rotate?: number;
  visual: SignatureContent | null;
  /** Reuse this existing unsigned /Sig field. */
  fieldName?: string;
}

export interface SignPdfRequest {
  /** The fully materialised export, or the original bytes for a sign-only export (G17). */
  bytes: Uint8Array;
  /** null = invisible signature. */
  placement: SignPlacement | null;
  /** Bytes of assets the visual refers to (images, fonts). */
  assets?: Record<string, Uint8Array>;
  reason?: string;
  location?: string;
  m: Date;
  /** "Digitally signed by {name}" and the date under the visual. */
  caption: boolean;
  /** Signer name for /Name and the caption. */
  name: string;
  /** Caption date text (the caller formats it in the user's locale). */
  captionDate?: string;
  /** 16384, or 32768 with a timestamp. */
  contentsBytes: number;
}

export interface PreparedSignature {
  /** The file with a zero-filled /Contents placeholder and real ByteRange. */
  file: Uint8Array;
  range: ByteRangeInfo;
  /** The bytes the CMS must sign. */
  content: Uint8Array;
}

const N = (s: string) => PDFName.of(s);

function fieldsOf(
  doc: PDFDocument,
): { name: string; dict: PDFDict; ref: PDFRef | null }[] {
  const acro = doc.catalog.lookup(N('AcroForm'));
  const fields = acro instanceof PDFDict ? acro.lookup(N('Fields')) : undefined;
  const out: { name: string; dict: PDFDict; ref: PDFRef | null }[] = [];
  const walk = (raw: PDFObject | undefined, prefix: string, depth: number) => {
    if (depth > 20) return;
    const ref = raw instanceof PDFRef ? raw : null;
    const dict = ref ? doc.context.lookup(ref) : raw;
    if (!(dict instanceof PDFDict)) return;
    const t = dict.lookup(N('T'));
    const part =
      t instanceof PDFString || t instanceof PDFHexString
        ? t.decodeText()
        : null;
    const name = part === null ? prefix : prefix ? `${prefix}.${part}` : part;
    out.push({ name, dict, ref });
    const kids = dict.lookup(N('Kids'));
    if (kids instanceof PDFArray)
      for (const k of kids.asArray()) walk(k, name, depth + 1);
  };
  if (fields instanceof PDFArray)
    for (const f of fields.asArray()) walk(f, '', 0);
  return out;
}

const unsigned = (d: PDFDict) =>
  d.lookup(N('FT')) === N('Sig') && !d.get(N('V'));

/**
 * Prepares an incremental update that adds a signature (edit worker; no
 * key material). New objects are numbered from the trailer's /Size; the
 * catalog, AcroForm, page or /Annots array it changes are rewritten in the
 * increment. The original bytes stay an exact prefix (earlier signatures
 * keep verifying, decision G17).
 */
export async function prepareSignature(
  req: SignPdfRequest,
): Promise<PreparedSignature> {
  const tail = readTail(req.bytes);
  if (tail.encrypted)
    throw new ToolError(
      'INVALID_INPUT',
      'Choose either password protection or a digital signature for this export. A signed file cannot be encrypted afterwards.',
    );
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(req.bytes, { updateMetadata: false });
  } catch (cause) {
    throw new ToolError(
      'INVALID_FILE',
      "This PDF's structure could not be read for signing",
      { cause },
    );
  }
  const ctx = doc.context;
  ctx.largestObjectNumber = Math.max(ctx.largestObjectNumber, tail.size - 1);
  const firstNew = ctx.largestObjectNumber + 1;
  const modified = new Set<PDFRef>();
  const sigRef = ctx.nextRef();

  const fields = fieldsOf(doc);
  const reuse = req.placement?.fieldName
    ? fields.find(
        (f) => f.name === req.placement!.fieldName && unsigned(f.dict),
      )
    : undefined;
  if (req.placement?.fieldName && !reuse)
    throw new ToolError(
      'INVALID_INPUT',
      `There is no empty signature field named ${req.placement.fieldName}`,
    );

  const pages = doc.getPages();
  const placement = req.placement;
  const page = placement ? pages[placement.pageIndex] : pages[0];
  if (!page)
    throw new ToolError(
      'INVALID_INPUT',
      'The signature page is not in this document',
    );

  const assets = req.assets ?? {};
  const paint: PaintVisual | null = placement?.visual
    ? async (p, area) => {
        const draw = { doc, fonts: new FontCache(doc, loadNotoSans) };
        // Upright on a rotated page, turned by the placement's own rotation,
        // exactly as the page-content writer lays it out.
        const { box, rotate } = uprightFrame(
          area,
          page.getRotation().angle,
          placement.rotate ?? 0,
        );
        await drawSignatureContent(
          {
            doc,
            draw,
            page: () => p,
            asset: (id) => {
              const a = assets[id];
              if (!a)
                throw new ToolError(
                  'INVALID_INPUT',
                  'A signature image or font is missing',
                );
              return a;
            },
            note: () => {},
          },
          p,
          placement.visual!,
          box,
          rotate,
        );
      }
    : null;
  const rect =
    placement && placement.rect.width > 0 && placement.rect.height > 0
      ? placement.rect
      : null;
  const ap = await buildAppearance(
    doc,
    rect,
    paint,
    rect && req.caption
      ? { name: req.name, date: req.captionDate ?? req.m.toLocaleString() }
      : null,
  );
  const rectArr = rect
    ? [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height]
    : [0, 0, 0, 0];

  if (reuse && reuse.ref) {
    // The field, or its first widget kid, gets the value and appearance.
    reuse.dict.set(N('V'), sigRef);
    modified.add(reuse.ref);
    const kids = reuse.dict.lookup(N('Kids'));
    const widgetRaw = kids instanceof PDFArray ? kids.get(0) : null;
    const widgetRef = widgetRaw instanceof PDFRef ? widgetRaw : reuse.ref;
    const widget = ctx.lookup(widgetRef, PDFDict);
    widget.set(N('AP'), ctx.obj({ N: ap }));
    if (rect) widget.set(N('Rect'), ctx.obj(rectArr));
    modified.add(widgetRef);
  } else {
    const taken = new Set(fields.map((f) => f.name));
    let n =
      fields.filter((f) => f.dict.lookup(N('FT')) === N('Sig')).length + 1;
    while (taken.has(`Signature${n}`)) n++;
    const fieldRef = ctx.register(
      ctx.obj({
        Type: 'Annot',
        Subtype: 'Widget',
        FT: 'Sig',
        T: PDFString.of(`Signature${n}`),
        F: 132,
        P: page.ref,
        Rect: rectArr,
        AP: { N: ap },
        V: sigRef,
      }),
    );
    // Page /Annots: an indirect array is rewritten, else the page itself.
    const annotsRaw = page.node.get(N('Annots'));
    if (annotsRaw instanceof PDFRef) {
      ctx.lookup(annotsRaw, PDFArray).push(fieldRef);
      modified.add(annotsRaw);
    } else {
      const arr = annotsRaw instanceof PDFArray ? annotsRaw : ctx.obj([]);
      arr.push(fieldRef);
      page.node.set(N('Annots'), arr);
      modified.add(page.ref);
    }
    // AcroForm: the indirect dictionary, or the catalog when inline or new.
    const acroRaw = doc.catalog.get(N('AcroForm'));
    let acro: PDFDict;
    if (acroRaw instanceof PDFRef) {
      acro = ctx.lookup(acroRaw, PDFDict);
      modified.add(acroRaw);
    } else {
      acro = acroRaw instanceof PDFDict ? acroRaw : ctx.obj({});
      if (!(acroRaw instanceof PDFDict))
        doc.catalog.set(N('AcroForm'), ctx.register(acro));
      modified.add(ctx.trailerInfo.Root as PDFRef);
    }
    const fieldsRaw = acro.get(N('Fields'));
    if (fieldsRaw instanceof PDFRef) {
      ctx.lookup(fieldsRaw, PDFArray).push(fieldRef);
      modified.add(fieldsRaw);
    } else {
      const arr = fieldsRaw instanceof PDFArray ? fieldsRaw : ctx.obj([]);
      arr.push(fieldRef);
      acro.set(N('Fields'), arr);
    }
  }
  // Mark the form as signed, append-only (SignaturesExist | AppendOnly).
  const acroRaw = doc.catalog.get(N('AcroForm'));
  const acro =
    acroRaw instanceof PDFRef
      ? ctx.lookup(acroRaw, PDFDict)
      : (acroRaw as PDFDict);
  acro.set(N('SigFlags'), PDFNumber.of(3));
  modified.add(
    acroRaw instanceof PDFRef ? acroRaw : (ctx.trailerInfo.Root as PDFRef),
  );
  // Fonts and images used by the appearance.
  await doc.flush();

  const objects: IncrementObject[] = [];
  const written = new Set<number>();
  const write = (ref: PDFRef) => {
    if (written.has(ref.objectNumber) || ref === sigRef) return;
    const obj = ctx.lookup(ref);
    if (!obj) return;
    written.add(ref.objectNumber);
    objects.push({
      num: ref.objectNumber,
      gen: ref.generationNumber,
      bytes: serializeObject(ref.objectNumber, ref.generationNumber, obj),
    });
  };
  for (const ref of modified) write(ref);
  for (const [ref] of ctx.enumerateIndirectObjects())
    if (ref.objectNumber >= firstNew) write(ref);
  objects.push({
    num: sigRef.objectNumber,
    gen: 0,
    bytes: sigDictBytes(sigRef.objectNumber, {
      contentsBytes: req.contentsBytes,
      name: req.name,
      reason: req.reason,
      location: req.location,
      m: req.m,
      subFilter: 'ETSI.CAdES.detached',
    }),
  });
  objects.sort((a, b) => a.num - b.num);
  const file = appendIncrement(req.bytes, objects, tail);
  const range = locateAndPatchByteRange(file);
  return { file, range, content: signedContent(file, range) };
}

/** Writes the CMS into the placeholder (cheap; main thread). */
export function finishSignature(
  file: Uint8Array,
  range: ByteRangeInfo,
  der: Uint8Array,
): Uint8Array {
  return insertSignature(file, range, der);
}
