import {
  decodePDFRawStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { pdfPageTexts } from '../../../test/fixtures/builders';
import { makeContentPdf } from '../../../test/fixtures/content';
import type { Box } from '@/pdf/doc/types';
import { IDENTITY, interpret, quadBox } from '@/pdf/edit/content/interpreter';
import { parseContent } from '@/pdf/edit/content/lexer';
import { serializeContent } from '@/pdf/edit/content/serialize';
import { latin1, type ParsedContent } from '@/pdf/edit/content/tokens';
import { applyEdits, mergeEdits } from './edits';
import { pathEdits } from './paths';
import { glyphEdits } from './text';

async function load(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(0);
  const stream = doc.context.lookup(
    page.node.get(PDFName.of('Contents')),
  ) as PDFRawStream;
  const resources = page.node.lookup(PDFName.of('Resources'), PDFDict);
  const parsed = parseContent(decodePDFRawStream(stream).decode());
  const interp = interpret(parsed, resources, doc, IDENTITY);
  return { doc, page, parsed, interp, resources };
}

/** Redacts page 1 under `marks` and returns the new file and content. */
async function redact(bytes: Uint8Array, marks: Box[]) {
  const { doc, page, parsed, interp } = await load(bytes);
  const g = glyphEdits(parsed, interp, marks);
  const p = pathEdits(parsed, interp, marks);
  const out: ParsedContent = applyEdits(parsed, mergeEdits(g.edits, p.edits));
  const content = serializeContent(out);
  page.node.set(
    PDFName.of('Contents'),
    doc.context.register(doc.context.stream(content)),
  );
  return {
    bytes: await doc.save(),
    content: latin1(content),
    glyphs: g.removed,
    paths: p.removed,
  };
}

const xs = async (bytes: Uint8Array) => {
  const { interp } = await load(bytes);
  return interp.glyphs.map((g) => quadBox(g.quad).x);
};

// Helvetica 12pt: "My " is 19.332pt wide and "SECRET" 48.672pt.
const SECRET_MARK: Box = { x: 92, y: 690, width: 46, height: 20 };

describe('glyph removal', () => {
  it('removes SECRET and keeps the other words where they were', async () => {
    const src = await makeContentPdf([
      { content: 'BT /F1 12 Tf 72 700 Td (My SECRET plan) Tj ET' },
    ]);
    const before = await xs(src);
    const r = await redact(src, [SECRET_MARK]);
    expect(r.glyphs).toBe(6);
    const [text] = await pdfPageTexts(r.bytes);
    expect(text).not.toContain('SECRET');
    expect(text.replace(/\s+/g, ' ')).toMatch(/My\s*plan/);
    const after = await xs(r.bytes);
    const kept = [...before.slice(0, 3), ...before.slice(9)];
    expect(after).toHaveLength(kept.length);
    after.forEach((x, i) => expect(Math.abs(x - kept[i])).toBeLessThan(0.01));
  });

  it('keeps surviving glyph positions in a kerned TJ', async () => {
    const src = await makeContentPdf([
      {
        content:
          'BT /F1 12 Tf 72 700 Td [(M) 50 (y ) -120 (S) 30 (E) 30 (C) 30 (R) 30 (E) 30 (T) 200 ( pl) 10 (an)] TJ (after) Tj ET',
      },
    ]);
    const before = await xs(src);
    const secret = (await load(src)).interp.glyphs
      .slice(3, 9)
      .map((g) => quadBox(g.quad));
    const mark = {
      x: secret[0].x + 1,
      y: 690,
      // Stops short of the space the 200 kern pulls back over the T.
      width: secret[5].x + secret[5].width - secret[0].x - 4,
      height: 20,
    };
    const r = await redact(src, [mark]);
    expect(r.glyphs).toBe(6);
    const after = await xs(r.bytes);
    const kept = [...before.slice(0, 3), ...before.slice(9)];
    after.forEach((x, i) => expect(Math.abs(x - kept[i])).toBeLessThan(0.01));
    expect((await pdfPageTexts(r.bytes))[0]).not.toMatch(/S.?E.?C.?R.?E.?T/);
  });

  it('rewrites \' and " with their line moves', async () => {
    const src = await makeContentPdf([
      {
        content:
          "BT /F1 12 Tf 14 TL 72 700 Td (top) Tj (SECRET one) ' 1 0.5 (SECRET two) \" (last) ' ET",
      },
    ]);
    const before = await xs(src);
    const r = await redact(src, [{ x: 72, y: 668, width: 48, height: 27 }]);
    expect(r.content).toContain('T*');
    expect(r.content).toMatch(/1 Tw\s+0\.5 Tc\s+T\*/);
    expect(r.glyphs).toBe(12);
    const after = await xs(r.bytes);
    const kept = before.filter(
      (_, i) => !((i >= 3 && i < 9) || (i >= 13 && i < 19)),
    );
    after.forEach((x, i) => expect(Math.abs(x - kept[i])).toBeLessThan(0.01));
    const [text] = await pdfPageTexts(r.bytes);
    expect(text).not.toContain('SECRET');
    expect(text).toContain('last');
  });

  it('removes two-byte Identity-H codes in pairs', async () => {
    const src = await makeContentPdf([
      { content: 'BT /F2 12 Tf 72 700 Td {noto:ab SECRET cd} Tj ET' },
    ]);
    const { interp } = await load(src);
    expect(interp.glyphs.every((g) => g.byteLength === 2)).toBe(true);
    const boxes = interp.glyphs.map((g) => quadBox(g.quad));
    const mark = {
      x: boxes[3].x + 0.5,
      y: 690,
      width: boxes[8].x + boxes[8].width - boxes[3].x - 1,
      height: 20,
    };
    const r = await redact(src, [mark]);
    expect(r.glyphs).toBe(6);
    const [text] = await pdfPageTexts(r.bytes);
    expect(text).not.toContain('SECRET');
    expect(text.replace(/\s+/g, '')).toBe('abcd');
    // Every surviving hex string still holds whole two-byte codes.
    for (const m of r.content.matchAll(/<([0-9A-F]*)>/g))
      expect(m[1].length % 4).toBe(0);
  });
});

describe('vector removal', () => {
  it('removes a path inside a mark and keeps an intersecting one', async () => {
    const src = await makeContentPdf([
      {
        content:
          '0 0 1 rg 100 100 20 20 re f 1 0 0 rg 100 200 200 20 re f 0 0 m 5 5 l S',
      },
    ]);
    const r = await redact(src, [{ x: 90, y: 90, width: 100, height: 140 }]);
    expect(r.paths).toBe(1);
    expect(r.content).not.toContain('100 100 20 20 re');
    expect(r.content).toContain('100 200 200 20 re');
    expect(r.content).toContain('0 0 m');
  });

  it('turns a painted clip path into W n', async () => {
    const src = await makeContentPdf([
      { content: 'q 100 100 20 20 re W f 0 0 10 10 re f Q' },
    ]);
    const r = await redact(src, [{ x: 90, y: 90, width: 40, height: 40 }]);
    expect(r.content).toMatch(/100 100 20 20 re W\s+n/);
    expect(r.content).toContain('0 0 10 10 re f');
  });
});
