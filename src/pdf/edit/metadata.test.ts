import { describe, expect, it } from 'vitest';
import {
  decodePDFRawStream,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import { makeMetadataPdf, makeTextPdf } from '../../../test/fixtures/builders';
import {
  buildXmp,
  getMetadata,
  setMetadata,
  stripMetadata,
  stripMetadataInPlace,
} from './metadata';

const xmpOf = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  const s = doc.catalog.lookupMaybe(PDFName.of('Metadata'), PDFRawStream);
  return s ? new TextDecoder().decode(decodePDFRawStream(s).decode()) : null;
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
