import { check } from '@arshad-shah/qpdf-wasm';
import { PDFDocument, PDFDict, PDFName, PDFRef } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { appendIncrement, serializeObject } from './incremental';
import { readTail } from './tail';

async function addTestObject(useObjectStreams: boolean) {
  const base = await (
    await PDFDocument.load(await makeTextPdf({ pages: 2 }))
  ).save({ useObjectStreams });
  const tail = readTail(base);
  const scratch = await PDFDocument.create();
  const obj = scratch.context.obj({ Test: true });
  const out = appendIncrement(
    base,
    [{ num: tail.size, gen: 0, bytes: serializeObject(tail.size, 0, obj) }],
    tail,
  );
  return { base, out, num: tail.size };
}

describe.each([
  ['table', false],
  ['stream', true],
] as const)('appendIncrement (%s xref)', (kind, objectStreams) => {
  it('keeps the original as a prefix and the new object readable', async () => {
    const { base, out, num } = await addTestObject(objectStreams);
    expect(readTail(out).kind).toBe(kind);
    expect(out.subarray(0, base.length)).toEqual(base);
    const doc = await PDFDocument.load(out);
    const found = doc.context.lookup(PDFRef.of(num, 0));
    expect(found).toBeInstanceOf(PDFDict);
    expect((found as PDFDict).get(PDFName.of('Test'))?.toString()).toBe('true');
    expect(doc.getPageCount()).toBe(2);
    const task = getDocument({ data: out.slice(), verbosity: 0 });
    try {
      expect((await task.promise).numPages).toBe(2);
    } finally {
      await task.destroy();
    }
    const diag = await check(out);
    expect(diag.stderr).toBe('');
    expect(diag.warnings).toEqual([]);
  });
});
