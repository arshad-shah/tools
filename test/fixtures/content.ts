import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import {
  decodePDFRawStream,
  StandardFonts,
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
} from 'pdf-lib';

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

const decode = (s: PDFRawStream) => decodePDFRawStream(s).decode();

/** Decoded content of every page (its /Contents joined) and every Form XObject. */
export async function contentStreams(
  bytes: Uint8Array,
): Promise<{ where: string; bytes: Uint8Array }[]> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const out: { where: string; bytes: Uint8Array }[] = [];
  doc.getPages().forEach((page, i) => {
    const c = page.node.get(PDFName.of('Contents'));
    const refs = c instanceof PDFArray ? c.asArray() : c ? [c] : [];
    const parts = refs.map((r) => {
      const s = r instanceof PDFRef ? doc.context.lookup(r) : r;
      return decode(s as PDFRawStream);
    });
    // Streams of a /Contents array are joined with white space between them.
    const joined: Uint8Array[] = [];
    parts.forEach((p, k) => {
      if (k) joined.push(Uint8Array.of(0x0a));
      joined.push(p);
    });
    out.push({ where: `page ${i + 1}`, bytes: concat(joined) });
  });
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (
      obj instanceof PDFRawStream &&
      obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Form')
    )
      out.push({ where: `form ${ref.toString()}`, bytes: decode(obj) });
  }
  return out;
}

export const notoBytes = () =>
  new Uint8Array(
    readFileSync(
      createRequire(import.meta.url).resolve(
        '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff',
      ),
    ),
  );

export interface ContentPage {
  /** Content stream text; `{noto:TEXT}` is replaced by the Noto glyph codes as a hex string. */
  content: string;
  /** Extra resources merged into the page's /Resources (pdf-lib literal). */
  resources?: Record<string, unknown>;
  size?: [number, number];
}

/**
 * Pages with hand-written content. Resources: /F1 Helvetica (WinAnsi, no
 * /Widths), /F2 Noto Sans (Identity-H, embedded with ToUnicode).
 */
export async function makeContentPdf(
  pages: ContentPage[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const noto = await doc.embedFont(notoBytes(), { subset: true });
  for (const p of pages) {
    const page = doc.addPage(p.size ?? [612, 792]);
    const content = p.content.replace(/\{noto:([^}]*)\}/g, (_, t: string) =>
      noto.encodeText(t).toString(),
    );
    const stream = doc.context.register(
      doc.context.stream(new TextEncoder().encode(content)),
    );
    page.node.set(PDFName.of('Contents'), stream);
    const res = doc.context.obj({
      Font: { F1: helv.ref, F2: noto.ref },
      ...(p.resources ?? {}),
    } as never);
    page.node.set(PDFName.of('Resources'), res);
  }
  return doc.save({ useObjectStreams: false });
}
