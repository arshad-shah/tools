import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
  StandardFonts,
  type PDFPage,
} from 'pdf-lib';

/**
 * A third-party-style annotated document (no appearance streams, as many
 * producers write them): one of every subtype the workspace edits on page 1,
 * a reply to the sticky note, plus a Link and a form Widget that must be
 * preserved untouched. Page 2 has a single Square.
 */
export async function makeAnnotatedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([612, 792]);
  const p2 = doc.addPage([612, 792]);
  p1.drawText('Annotated page one', { x: 72, y: 700, size: 24, font });
  p2.drawText('Annotated page two', { x: 72, y: 700, size: 24, font });

  const add = (page: PDFPage, entries: Record<string, unknown>) => {
    const dict = doc.context.obj({
      Type: 'Annot',
      F: 4,
      P: page.ref,
      ...entries,
    });
    const ref = doc.context.register(dict);
    let annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (!annots) {
      annots = doc.context.obj([]);
      page.node.set(PDFName.of('Annots'), annots);
    }
    annots.push(ref);
    return ref;
  };
  const meta = (author: string, contents: string) => ({
    T: PDFString.of(author),
    Contents: PDFHexString.fromText(contents),
    M: PDFString.of('D:20250101120000Z'),
  });

  const quad = (x: number, y: number, w: number, h: number) => [
    x,
    y + h,
    x + w,
    y + h,
    x,
    y,
    x + w,
    y,
  ];
  (['Highlight', 'Underline', 'StrikeOut', 'Squiggly'] as const).forEach(
    (subtype, i) =>
      add(p1, {
        Subtype: subtype,
        Rect: [72, 690 - i * 2, 320, 724],
        QuadPoints: quad(72, 696, 248, 26),
        C: [1, 0.8, 0],
        ...meta('Reviewer', `${subtype} remark`),
      }),
  );
  const note = add(p1, {
    Subtype: 'Text',
    Rect: [400, 600, 420, 620],
    Name: 'Comment',
    C: [1, 1, 0],
    ...meta('Alice', 'Please check'),
  });
  const popup = add(p1, {
    Subtype: 'Popup',
    Rect: [430, 520, 600, 620],
    Parent: note,
    Open: false,
  });
  doc.context.lookup(note, PDFDict).set(PDFName.of('Popup'), popup);
  add(p1, {
    Subtype: 'Text',
    Rect: [400, 570, 420, 590],
    Name: 'Note',
    C: [1, 1, 0],
    IRT: note,
    RT: 'R',
    ...meta('Bob', 'Checked'),
  });
  add(p1, {
    Subtype: 'FreeText',
    Rect: [72, 500, 272, 560],
    DA: PDFString.of('/Helv 12 Tf 0 0 1 rg'),
    ...meta('Alice', 'Typed comment'),
  });
  add(p1, {
    Subtype: 'Ink',
    Rect: [300, 400, 400, 460],
    InkList: [[300, 400, 350, 460, 400, 400]],
    BS: { W: 2 },
    C: [1, 0, 0],
    ...meta('Bob', 'Scribble'),
  });
  add(p1, {
    Subtype: 'Square',
    Rect: [72, 300, 192, 380],
    BS: { W: 2 },
    C: [0, 0, 1],
    ...meta('Alice', 'Box'),
  });
  add(p1, {
    Subtype: 'Circle',
    Rect: [220, 300, 340, 380],
    BS: { W: 2 },
    C: [0, 0.6, 0],
    ...meta('Bob', 'Ring'),
  });
  add(p1, {
    Subtype: 'Line',
    Rect: [380, 300, 560, 380],
    L: [380, 300, 560, 380],
    LE: ['None', 'OpenArrow'],
    BS: { W: 2 },
    C: [0, 0, 0],
    ...meta('Alice', 'Pointer'),
  });
  add(p1, {
    Subtype: 'Stamp',
    Rect: [72, 200, 252, 250],
    Name: 'Approved',
    C: [0, 0.5, 0],
    ...meta('Bob', 'Approved'),
  });
  add(p1, {
    Subtype: 'Link',
    Rect: [72, 120, 272, 140],
    Border: [0, 0, 0],
    A: { Type: 'Action', S: 'URI', URI: PDFString.of('https://example.com/') },
  });
  const form = doc.getForm();
  const field = form.createTextField('reviewer.name');
  field.setText('Kept');
  field.addToPage(p1, { x: 320, y: 120, width: 200, height: 24, font });
  add(p2, {
    Subtype: 'Square',
    Rect: [100, 100, 200, 200],
    BS: { W: 1 },
    C: [1, 0, 0],
    ...meta('Alice', 'Second page box'),
  });
  return doc.save();
}
