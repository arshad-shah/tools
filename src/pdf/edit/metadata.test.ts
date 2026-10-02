import { describe, expect, it } from 'vitest';
import {
  decodePDFRawStream,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import { makeMetadataPdf, makeTextPdf } from '../../../test/fixtures/builders';
import {
  applyMetadataPatch,
  buildXmp,
  getMetadata,
  setMetadata,
  stripMetadata,
  stripMetadataInPlace,
} from './metadata';

const xmpOf = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  const s = doc.catalog.lookup(PDFName.of('Metadata'));
  return s instanceof PDFRawStream
    ? new TextDecoder().decode(decodePDFRawStream(s).decode())
    : null;
};

describe('metadata', () => {
  it('reads Info fields, dates and XMP presence', async () => {
    expect(await getMetadata(await makeMetadataPdf())).toEqual({
      title: 'Quarterly report',
      author: 'Ada',
      subject: 'Numbers',
      keywords: 'q3 finance',
      creator: 'Writer',
      producer: 'Fixture',
      creationDate: new Date('2024-01-02T03:04:05Z'),
      modificationDate: null,
      hasXmp: true,
    });
  });

  it('edits, removes blanks, stamps ModDate and keeps XMP in sync (with PDF/A id)', async () => {
    const now = new Date('2026-10-01T12:00:00Z');
    const out = await setMetadata(
      await makeMetadataPdf(),
      { title: 'Annual <report> & more', author: '' },
      now,
    );
    const meta = await getMetadata(out);
    expect(meta).toMatchObject({
      title: 'Annual <report> & more',
      author: '',
      subject: 'Numbers',
      modificationDate: now,
    });
    const xmp = (await xmpOf(out))!;
    expect(xmp).toContain(
      '<rdf:li xml:lang="x-default">Annual &lt;report&gt; &amp; more</rdf:li>',
    );
    expect(xmp).not.toContain('<dc:creator>');
    expect(xmp).toContain(
      '<xmp:ModifyDate>2026-10-01T12:00:00.000Z</xmp:ModifyDate>',
    );
    expect(xmp).toContain('<pdfaid:part>2</pdfaid:part>');
    expect(xmp).toContain('<pdfaid:conformance>B</pdfaid:conformance>');
  });

  it('applies a patch to an already loaded document and reports its PDF/A part', async () => {
    const doc = await PDFDocument.load(await makeMetadataPdf(), {
      updateMetadata: false,
    });
    const now = new Date('2026-10-02T08:00:00Z');
    expect(applyMetadataPatch(doc, { subject: 'Plans' }, now)).toMatchObject({
      part: '2',
    });
    const out = await doc.save();
    expect(await getMetadata(out)).toMatchObject({
      title: 'Quarterly report',
      subject: 'Plans',
      modificationDate: now,
    });
    expect((await xmpOf(out))!).toContain('Plans');
  });

  it('does not invent XMP for files without it', async () => {
    const out = await setMetadata(await makeTextPdf({ pages: 1 }), {
      title: 'x',
    });
    expect(await xmpOf(out)).toBeNull();
    expect((await getMetadata(out)).title).toBe('x');
  });

  it('strips Info and XMP completely', async () => {
    const out = await stripMetadata(await makeMetadataPdf());
    expect(await xmpOf(out)).toBeNull();
    expect(await getMetadata(out)).toMatchObject({
      title: '',
      author: '',
      producer: '',
      creationDate: null,
      hasXmp: false,
    });
    expect(Buffer.from(out).toString('latin1')).not.toContain(
      'Quarterly report',
    );
  });

  it('strips in place on an already loaded document', async () => {
    const doc = await PDFDocument.load(await makeMetadataPdf(), {
      updateMetadata: false,
    });
    stripMetadataInPlace(doc);
    const out = await doc.save();
    expect(Buffer.from(out).toString('latin1')).not.toContain('/Info');
    expect(await xmpOf(out)).toBeNull();
  });

  it('builds a well-formed packet that only lists present fields', () => {
    const xml = buildXmp({
      title: '',
      author: 'Ada "A" Lovelace',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: null,
      modificationDate: null,
      hasXmp: false,
    });
    expect(xml).toContain(
      '<dc:creator><rdf:Seq><rdf:li>Ada &quot;A&quot; Lovelace</rdf:li></rdf:Seq></dc:creator>',
    );
    expect(xml).not.toContain('dc:title');
    expect(xml).not.toContain('pdfaid:part>');
    expect(xml.startsWith('<?xpacket begin=')).toBe(true);
    expect(xml.endsWith('<?xpacket end="w"?>')).toBe(true);
  });
});

/** One page, Info title "T", and the given XMP description body. */
async function withXmp(description: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.addPage([200, 200]);
  doc.setTitle('T');
  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">${description}</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  const ref = doc.context.register(
    doc.context.stream(new TextEncoder().encode(xmp), {
      Type: 'Metadata',
      Subtype: 'XML',
    }),
  );
  doc.catalog.set(PDFName.of('Metadata'), ref);
  return doc.save({ useObjectStreams: false });
}

describe('metadata review fixes', () => {
  it('carries a PDF/UA claim across (review I3)', async () => {
    const out = await setMetadata(
      await withXmp(
        '<pdfuaid:part>1</pdfuaid:part><dc:rights><rdf:Alt><rdf:li xml:lang="x-default">CC0</rdf:li></rdf:Alt></dc:rights>',
      ),
      { author: 'Ada' },
    );
    const xmp = (await xmpOf(out))!;
    expect(xmp).toContain('<pdfuaid:part>1</pdfuaid:part>');
    expect(xmp).toContain('xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/"');
    expect(xmp).toContain('<dc:creator><rdf:Seq><rdf:li>Ada</rdf:li>');
    // Documented: other XMP properties are not kept.
    expect(xmp).not.toContain('dc:rights');
  });

  it('keeps a PDF/A-1 file free of object streams (review M10)', async () => {
    const latin1 = (b: Uint8Array) => Buffer.from(b).toString('latin1');
    const a1 = await setMetadata(
      await withXmp(
        '<pdfaid:part>1</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance>',
      ),
      { title: 'New' },
    );
    expect(latin1(a1)).not.toContain('/ObjStm');
    expect((await xmpOf(a1))!).toContain('<pdfaid:part>1</pdfaid:part>');
    const a2 = await setMetadata(
      await withXmp('<pdfaid:part>2</pdfaid:part>'),
      { title: 'New' },
    );
    expect(latin1(a2)).toContain('/ObjStm');
  });

  it('drops characters XML cannot hold (review M11)', () => {
    const xml = buildXmp({
      title: 'A\u0001B\u001FC￾D\uD800E',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: null,
      modificationDate: null,
      hasXmp: true,
    });
    expect(xml).toContain('<rdf:li xml:lang="x-default">ABCDE</rdf:li>');
  });
});
