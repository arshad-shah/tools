import {
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFString,
  type PDFDocument,
  type PDFObject,
} from 'pdf-lib';

/** One signed signature field, as stored in the file. */
export interface StoredSignature {
  fieldName: string;
  byteRange: [number, number, number, number];
  /** The /Contents value (CMS DER plus zero padding). */
  contents: Uint8Array;
  subFilter: string;
  /** /M as written, e.g. "D:20261001123005+01'00'". */
  m: string | null;
  name: string | null;
  reason: string | null;
  location: string | null;
}

const text = (o: PDFObject | undefined): string | null =>
  o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : null;

const bytesOf = (o: PDFObject | undefined): Uint8Array | null =>
  o instanceof PDFHexString || o instanceof PDFString ? o.asBytes() : null;

function walk(
  doc: PDFDocument,
  node: PDFDict,
  prefix: string,
  out: { name: string; dict: PDFDict }[],
  seen: Set<PDFDict>,
): void {
  if (seen.has(node)) return;
  seen.add(node);
  const t = text(node.lookup(PDFName.of('T')));
  const name = t === null ? prefix : prefix ? `${prefix}.${t}` : t;
  out.push({ name, dict: node });
  const kids = node.lookup(PDFName.of('Kids'));
  if (kids instanceof PDFArray)
    for (let i = 0; i < kids.size(); i++) {
      const kid = kids.lookup(i);
      if (kid instanceof PDFDict) walk(doc, kid, name, out, seen);
    }
}

/** Fields of type /Sig (inherited /FT honoured) that hold a signature value. */
export function readSignatures(doc: PDFDocument): StoredSignature[] {
  const acro = doc.catalog.lookup(PDFName.of('AcroForm'));
  if (!(acro instanceof PDFDict)) return [];
  const fields = acro.lookup(PDFName.of('Fields'));
  if (!(fields instanceof PDFArray)) return [];
  const all: { name: string; dict: PDFDict }[] = [];
  const seen = new Set<PDFDict>();
  for (let i = 0; i < fields.size(); i++) {
    const f = fields.lookup(i);
    if (f instanceof PDFDict) walk(doc, f, '', all, seen);
  }
  const out: StoredSignature[] = [];
  const used = new Set<PDFObject>();
  for (const { name, dict } of all) {
    let ft: PDFObject | undefined;
    for (let d: PDFDict | undefined = dict; d && !ft; ) {
      ft = d.lookup(PDFName.of('FT'));
      const parent: PDFObject | undefined = d.lookup(PDFName.of('Parent'));
      d = parent instanceof PDFDict ? parent : undefined;
    }
    if (ft !== PDFName.of('Sig')) continue;
    const vRaw = dict.get(PDFName.of('V'));
    const v = vRaw instanceof PDFRef ? doc.context.lookup(vRaw) : vRaw;
    if (!(v instanceof PDFDict) || used.has(v)) continue;
    used.add(v);
    const br = v.lookup(PDFName.of('ByteRange'));
    const contents = bytesOf(v.lookup(PDFName.of('Contents')));
    if (!(br instanceof PDFArray) || br.size() !== 4 || !contents) continue;
    const nums = br
      .asArray()
      .map((n) => (n instanceof PDFNumber ? n.asNumber() : NaN));
    if (!nums.every((n) => Number.isInteger(n) && n >= 0)) continue;
    const sub = v.lookup(PDFName.of('SubFilter'));
    out.push({
      fieldName: name || `Signature ${out.length + 1}`,
      byteRange: nums as StoredSignature['byteRange'],
      contents,
      subFilter: sub instanceof PDFName ? sub.decodeText() : '',
      m: text(v.lookup(PDFName.of('M'))),
      name: text(v.lookup(PDFName.of('Name'))),
      reason: text(v.lookup(PDFName.of('Reason'))),
      location: text(v.lookup(PDFName.of('Location'))),
    });
  }
  // Oldest first: by where each signed range ends.
  return out.sort(
    (a, b) =>
      a.byteRange[2] + a.byteRange[3] - (b.byteRange[2] + b.byteRange[3]),
  );
}

/** Parses a PDF date ("D:YYYYMMDDHHmmSS+hh'mm'", any trailing part optional). */
export function parsePdfDate(s: string | null): Date | null {
  if (!s) return null;
  const m =
    /^(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(?:([Zz+-])(\d{2})?'?(\d{2})?'?)?/.exec(
      s.trim(),
    );
  if (!m) return null;
  const n = (v: string | undefined, d: number) =>
    v === undefined ? d : Number(v);
  const utc = Date.UTC(
    n(m[1], 0),
    n(m[2], 1) - 1,
    n(m[3], 1),
    n(m[4], 0),
    n(m[5], 0),
    n(m[6], 0),
  );
  const sign = m[7] === '-' ? -1 : m[7] === '+' ? 1 : 0;
  const offset = sign * (n(m[8], 0) * 60 + n(m[9], 0)) * 60_000;
  const d = new Date(utc - offset);
  return Number.isNaN(d.getTime()) ? null : d;
}
