import {
  PDFDocument,
  PDFName,
  PDFString,
  rgb,
  StandardFonts,
  type PDFRef,
} from 'pdf-lib';
import { encrypt } from '@arshad-shah/qpdf-wasm';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function makeTextPdf({
  pages = 3,
  label = 'Page',
  size = [612, 792] as [number, number],
}: {
  pages?: number;
  label?: string;
  size?: [number, number];
} = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage(size);
    page.drawText(`${label} ${i}`, { x: 72, y: size[1] - 96, size: 24, font });
  }
  doc.setTitle(`${label} fixture`);
  return doc.save();
}

/**
 * Text pages ("S 1", "S 2", ...) plus document-level structure that page
 * edits must keep: Info fields, a bookmark per page (one via a named
 * destination), a text field on the first and last page, page labels,
 * /Lang and viewer preferences.
 */
export async function makeStructuredPdf(pages = 3): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await makeTextPdf({ pages, label: 'S' }));
  doc.setTitle('Structured fixture');
  doc.setAuthor('Fixture Author');
  doc.setSubject('Fixture Subject');
  doc.setKeywords(['alpha', 'beta']);
  doc.setLanguage('en-GB');
  doc.catalog.set(
    PDFName.of('ViewerPreferences'),
    doc.context.obj({ DisplayDocTitle: true }),
  );
  doc.catalog.set(
    PDFName.of('PageLabels'),
    doc.context.obj({ Nums: [0, { S: PDFName.of('r') }] }),
  );

  const { context } = doc;
  const pageRefs = doc.getPages().map((p) => p.ref);
  const outlineRef = context.nextRef();
  const itemRefs = pageRefs.map(() => context.nextRef());
  // Bookmark 2 uses a named destination; the rest use explicit ones.
  const names: (PDFString | PDFRef)[] = [];
  pageRefs.forEach((pageRef, i) => {
    const dest = context.obj([pageRef, PDFName.of('Fit')]);
    const entry: Record<string, unknown> = {
      Title: PDFString.of(`Bookmark ${i + 1}`),
      Parent: outlineRef,
    };
    if (i === 1) {
      entry.Dest = PDFString.of('second');
      names.push(PDFString.of('second'), context.register(dest));
    } else entry.Dest = dest;
    if (i > 0) entry.Prev = itemRefs[i - 1];
    if (i < pageRefs.length - 1) entry.Next = itemRefs[i + 1];
    context.assign(itemRefs[i], context.obj(entry as never));
  });
  context.assign(
    outlineRef,
    context.obj({
      Type: PDFName.of('Outlines'),
      First: itemRefs[0],
      Last: itemRefs[itemRefs.length - 1],
      Count: itemRefs.length,
    }),
  );
  doc.catalog.set(PDFName.of('Outlines'), outlineRef);
  doc.catalog.set(
    PDFName.of('Names'),
    context.obj({ Dests: context.obj({ Names: names }) }),
  );

  const form = doc.getForm();
  const first = form.createTextField('first.name');
  first.setText('Ada');
  first.addToPage(doc.getPage(0), { x: 72, y: 500, width: 200, height: 24 });
  const last = form.createTextField('last.page');
  last.setText('Zed');
  last.addToPage(doc.getPage(pages - 1), {
    x: 72,
    y: 500,
    width: 200,
    height: 24,
  });
  return doc.save();
}

export async function makeShapesOnlyPdf(pages = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage([612, 792]).drawRectangle({
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      color: rgb(0.2, 0.4, 0.8),
    });
  }
  return doc.save();
}

export const AES_FIXTURE_USER_PASSWORD = 'user-pw';
export const AES_FIXTURE_OWNER_PASSWORD = 'owner-pw';

/** A real AES-256 (R6) encrypted PDF that needs a user password to open. */
export async function makeAesEncryptedPdf(): Promise<Uint8Array> {
  const bytes = await makeTextPdf({ pages: 2, label: 'Locked' });
  return (
    await encrypt(bytes, {
      userPassword: AES_FIXTURE_USER_PASSWORD,
      ownerPassword: AES_FIXTURE_OWNER_PASSWORD,
    })
  ).bytes;
}

/**
 * A PDF whose trailer references a Standard security handler. pdf-lib detects
 * this as encrypted. It is NOT valid for pdf.js (no /O, /U or /ID, so pdf.js
 * throws UnknownErrorException, not PasswordException). Use it for pdf-lib unit
 * tests only; use `makeAesEncryptedPdf` for anything that reaches pdf.js.
 */
export async function makeEncryptMarkedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const encrypt = doc.context.obj({
    Filter: PDFName.of('Standard'),
    V: 1,
    R: 2,
    P: -4,
  });
  doc.context.trailerInfo.Encrypt = doc.context.register(encrypt);
  return doc.save({ useObjectStreams: false });
}

/** Per-page text via pdf.js (legacy build runs in Node). */
export async function pdfPageTexts(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  const pdf = await task.promise;
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    out.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join('')
        .trim(),
    );
  }
  await task.destroy();
  return out;
}
