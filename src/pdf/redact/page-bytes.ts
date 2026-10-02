import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  type PDFObject,
} from 'pdf-lib';

/**
 * The decoded streams each page draws: its content, the forms it uses
 * (nested) and its annotations' appearances. Images and fonts are skipped
 * (they hold pixels and outlines, not text). Used to search a marked page
 * for a term the user kept on another page, where the file-wide raw-byte
 * search cannot be used.
 */
export async function pageStreamBytes(
  bytes: Uint8Array,
  pageIndices: readonly number[],
): Promise<Map<number, Uint8Array>> {
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const out = new Map<number, Uint8Array>();
  const pages = doc.getPages();
  for (const i of pageIndices) {
    const page = pages[i];
    if (!page) continue;
    const parts: Uint8Array[] = [];
    const seen = new Set<PDFObject>();
    const visit = (o: PDFObject | undefined, depth: number): void => {
      if (!o || depth > 32) return;
      const key = o instanceof PDFRef ? o.toString() : o;
      if (seen.has(key as never)) return;
      seen.add(key as never);
      const v = o instanceof PDFRef ? doc.context.lookup(o) : o;
      if (v instanceof PDFArray) {
        for (const x of v.asArray()) visit(x, depth + 1);
        return;
      }
      if (v instanceof PDFRawStream) {
        if (v.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) return;
        try {
          parts.push(decodePDFRawStream(v).decode(), Uint8Array.of(0x0a));
        } catch {
          parts.push(v.contents);
        }
        visitResources(v.dict.get(PDFName.of('Resources')), depth + 1);
        return;
      }
      if (v instanceof PDFDict)
        for (const [, x] of v.entries()) visit(x, depth + 1);
    };
    const visitResources = (r: PDFObject | undefined, depth: number) => {
      const res = r instanceof PDFRef ? doc.context.lookup(r) : r;
      if (res instanceof PDFDict) visit(res.get(PDFName.of('XObject')), depth);
    };
    visit(page.node.get(PDFName.of('Contents')), 0);
    visitResources(page.node.Resources(), 0);
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    for (const a of annots?.asArray() ?? []) {
      const d = doc.context.lookup(a);
      if (d instanceof PDFDict) visit(d.get(PDFName.of('AP')), 0);
    }
    const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) {
      all.set(p, at);
      at += p.length;
    }
    out.set(i, all);
  }
  return out;
}
