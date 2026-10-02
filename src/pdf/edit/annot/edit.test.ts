import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument, PDFRef } from 'pdf-lib';
import { makeAnnotatedPdf } from '../../../../test/fixtures/annotated';
import { toExistingAnnotations } from '../../render/annotations';
import {
  annotAt,
  annotByNm,
  annotIndex,
  deleteAnnotation,
  parseAnnotRef,
  updateAnnotation,
} from './edit';
import { writeTextMarkup } from './markup';
import { writeShape } from './shapes';
import { base, blankDoc, readAnnotations, renderPage } from './test-helpers';

let bytes: Uint8Array;
beforeAll(async () => {
  bytes = await makeAnnotatedPdf();
});

const listed = async (b: Uint8Array, page = 0) =>
  toExistingAnnotations(await readAnnotations(b, page));

describe('parseAnnotRef', () => {
  it('reads pdf.js ids', () => {
    expect(parseAnnotRef('12R')).toBe(PDFRef.of(12, 0));
    expect(parseAnnotRef('12R3')).toBe(PDFRef.of(12, 3));
    expect(() => parseAnnotRef('x')).toThrow();
  });
});

describe('existing annotations', () => {
  it('lists every annotation with author and contents; Widgets and Popups left out', async () => {
    const list = await listed(bytes);
    expect(list.map((a) => a.subtype)).toEqual([
      'Highlight',
      'Underline',
      'StrikeOut',
      'Squiggly',
      'Text',
      'Text',
      'FreeText',
      'Ink',
      'Square',
      'Circle',
      'Line',
      'Stamp',
      'Link',
    ]);
    const note = list.find((a) => a.contents === 'Please check')!;
    expect(note.author).toBe('Alice');
    expect(note.editable).toBe(true);
    expect(list.find((a) => a.contents === 'Checked')!.inReplyTo).toBe(
      note.ref,
    );
    expect(list.find((a) => a.subtype === 'Link')!.editable).toBe(false);
    expect(list[0].quadPoints).toHaveLength(8);
    expect(list.find((a) => a.subtype === 'Square')!.color).toBe('#0000ff');
  });

  it('positions match /Annots indices', async () => {
    const list = await listed(bytes);
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    for (const a of list)
      expect(annotIndex(page, parseAnnotRef(a.ref))).toBe(a.index);
  });

  it('delete removes the note and its popup and keeps the Link and Widget', async () => {
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    const note = (await listed(bytes)).find(
      (a) => a.contents === 'Please check',
    )!;
    expect(deleteAnnotation(doc, page, parseAnnotRef(note.ref))).toBe(true);
    const out = await doc.save();
    const raw = await readAnnotations(out);
    expect(raw.some((a) => a.contentsObj?.str === 'Please check')).toBe(false);
    expect(raw.some((a) => a.subtype === 'Popup')).toBe(false);
    expect(raw.some((a) => a.subtype === 'Link')).toBe(true);
    expect(raw.some((a) => a.subtype === 'Widget')).toBe(true);
  });

  it('unknown refs return false', async () => {
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    expect(deleteAnnotation(doc, page, PDFRef.of(9999, 0))).toBe(false);
    expect(
      await updateAnnotation(doc, page, PDFRef.of(9999, 0), {
        color: '#000000',
      }),
    ).toBe(false);
    // On the wrong page.
    const other = (await listed(bytes, 1))[0];
    expect(deleteAnnotation(doc, page, parseAnnotRef(other.ref))).toBe(false);
  });

  it('update recolours a Square and pdf.js reads the new colour', async () => {
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    const sq = (await listed(bytes)).find((a) => a.subtype === 'Square')!;
    expect(
      await updateAnnotation(doc, page, parseAnnotRef(sq.ref), {
        color: '#ff0000',
        contents: 'Red box',
      }),
    ).toBe(true);
    const out = await doc.save();
    const after = (await listed(out)).find((a) => a.subtype === 'Square')!;
    expect(after.color).toBe('#ff0000');
    expect(after.contents).toBe('Red box');
    const r = await renderPage(out);
    const [red, , blue] = r.mean({ x: 72, y: 300, width: 2, height: 80 });
    expect(red).toBeGreaterThan(blue + 50);
  });

  it('update moves geometry with the rect', async () => {
    const { doc, page } = await blankDoc();
    const ref = writeTextMarkup(doc, page, {
      ...base(),
      subtype: 'Highlight',
      quads: [[100, 620, 200, 620, 100, 600, 200, 600]],
    });
    await updateAnnotation(doc, page, ref, {
      rect: { x: 110, y: 500, width: 100, height: 20 },
    });
    const [moved] = await listed(await doc.save());
    expect(moved.rect).toEqual({ x: 110, y: 500, width: 100, height: 20 });
    expect(moved.quadPoints!.slice(0, 2)).toEqual([110, 520]);
  });

  it('every supported subtype survives an edit', async () => {
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    for (const a of (await listed(bytes)).filter((x) => x.editable))
      expect(
        await updateAnnotation(doc, page, parseAnnotRef(a.ref), {
          color: '#336699',
          opacity: 0.5,
        }),
      ).toBe(true);
    const out = await doc.save();
    for (const a of (await listed(out)).filter((x) => x.editable))
      expect(a.color).toBe('#336699');
  });

  it('finds annotations by /NM and position', async () => {
    const { doc, page } = await blankDoc();
    const p = base();
    const ref = writeShape(doc, page, {
      ...p,
      kind: 'Square',
      rect: { x: 1, y: 1, width: 10, height: 10 },
      width: 1,
      fill: null,
    });
    expect(annotByNm(page, p.nm)).toBe(ref);
    expect(annotByNm(page, 'nope')).toBeNull();
    expect(annotAt(page, 0)).toBe(ref);
    expect(annotAt(page, 3)).toBeNull();
  });
});
