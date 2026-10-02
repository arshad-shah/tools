import { PDFDocument, PDFName, PDFBool } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { appendIncrement, serializeObject } from './incremental';
import { readTail } from './tail';

async function saved(useObjectStreams: boolean) {
  const doc = await PDFDocument.load(await makeTextPdf({ pages: 2 }));
  return doc.save({ useObjectStreams });
}

describe('readTail', () => {
  it('reads a cross-reference table trailer', async () => {
    const bytes = await saved(false);
    const doc = await PDFDocument.load(bytes);
    const t = readTail(bytes);
    expect(t.kind).toBe('table');
    expect(t.size).toBe(doc.context.largestObjectNumber + 1);
    expect(`${t.root.num} ${t.root.gen} R`).toBe(
      doc.context.trailerInfo.Root!.toString(),
    );
    expect(t.encrypted).toBe(false);
    expect(t.info).not.toBeNull();
  });

  it('reads a cross-reference stream', async () => {
    const bytes = await saved(true);
    const t = readTail(bytes);
    expect(t.kind).toBe('stream');
    expect(t.size).toBeGreaterThan(3);
    const doc = await PDFDocument.load(bytes);
    expect(`${t.root.num} ${t.root.gen} R`).toBe(
      doc.context.trailerInfo.Root!.toString(),
    );
  });

  it('reads the last section of a file with two increments', async () => {
    const bytes = await saved(false);
    const one = appendIncrement(
      bytes,
      [
        {
          num: readTail(bytes).size,
          gen: 0,
          bytes: serializeObject(readTail(bytes).size, 0, PDFBool.True),
        },
      ],
      readTail(bytes),
    );
    const t1 = readTail(one);
    const two = appendIncrement(
      one,
      [
        {
          num: t1.size,
          gen: 0,
          bytes: serializeObject(t1.size, 0, PDFName.of('X')),
        },
      ],
      t1,
    );
    const t2 = readTail(two);
    expect(t2.startxref).toBeGreaterThan(t1.startxref);
    expect(t2.size).toBe(t1.size + 1);
  });

  it('refuses a file without startxref', () => {
    expect(() =>
      readTail(new TextEncoder().encode('%PDF-1.7\nnothing')),
    ).toThrow("This PDF's structure could not be read for signing");
  });
});
