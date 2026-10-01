import {
  decodePDFRawStream,
  PDFDocument,
  PDFName,
  PDFRawStream,
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
 * /Lang and viewer preferences. Page 1 also has two link annotations (to the
 * last page via /Dest, to page 2 via a GoTo action), and an unused named
 * destination "third" points at the last page.
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
  const lastRef = pageRefs[pageRefs.length - 1];
  names.push(
    PDFString.of('third'),
    context.register(context.obj([lastRef, PDFName.of('Fit')])),
  );
  doc.catalog.set(
    PDFName.of('Names'),
    context.obj({ Dests: context.obj({ Names: names }) }),
  );
  const link = (rect: number[], extra: Record<string, unknown>) =>
    context.register(
      context.obj({
        Type: PDFName.of('Annot'),
        Subtype: PDFName.of('Link'),
        Rect: rect,
        Border: [0, 0, 0],
        ...extra,
      } as never),
    );
  doc.getPage(0).node.set(
    PDFName.of('Annots'),
    context.obj([
      link([72, 600, 200, 620], {
        Dest: context.obj([lastRef, PDFName.of('Fit')]),
      }),
      link([72, 640, 200, 660], {
        A: context.obj({
          S: PDFName.of('GoTo'),
          D: context.obj([pageRefs[1], PDFName.of('Fit')]),
        }),
      }),
    ]),
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
  try {
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
    return out;
  } finally {
    await task.destroy();
  }
}

/**
 * Text pages whose page tree is nested (an intermediate /Pages node holding
 * pages 2..n, with an inherited /Rotate 90) and whose root /Count is wrong.
 * Viewers walk /Kids and cope; code that trusts /Count does not.
 */
export async function makeBadCountPdf(
  pages = 3,
  count = 7,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await makeTextPdf({ pages, label: 'C' }));
  const { context } = doc;
  const root = doc.catalog.Pages();
  const rootRef = doc.catalog.get(PDFName.of('Pages')) as PDFRef;
  const refs = doc.getPages().map((p) => p.ref);
  const midRef = context.nextRef();
  for (const ref of refs.slice(1)) {
    const page = context.lookup(ref) as ReturnType<typeof doc.catalog.Pages>;
    page.set(PDFName.of('Parent'), midRef);
  }
  context.assign(
    midRef,
    context.obj({
      Type: PDFName.of('Pages'),
      Parent: rootRef,
      Kids: refs.slice(1),
      Count: refs.length - 1,
      Rotate: 90,
    }),
  );
  root.set(PDFName.of('Kids'), context.obj([refs[0], midRef]));
  root.set(PDFName.of('Count'), context.obj(count));
  return doc.save({ useObjectStreams: false });
}

export const TAGGED_SECRET = 'SECRET-VALUE-123';

/**
 * A tagged two-page form: each page has marked content (MCID 0) and a text
 * field ('KeepMe' on page 1, TAGGED_SECRET on page 2), and the structure tree
 * references both: P elements with /Pg + MCID, Form elements with OBJR to
 * the widgets, a /ParentTree and an /IDTree.
 */
export async function makeTaggedFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.load(
    await makeTextPdf({ pages: 2, label: 'T' }),
  );
  const { context } = doc;
  const form = doc.getForm();
  const widgetRefs: PDFRef[] = [];
  (['keep', 'secret'] as const).forEach((name, i) => {
    const field = form.createTextField(name);
    field.setText(i === 0 ? 'KeepMe' : TAGGED_SECRET);
    field.addToPage(doc.getPage(i), { x: 72, y: 500, width: 200, height: 24 });
    widgetRefs.push(field.acroField.ref);
  });
  const pageRefs = doc.getPages().map((p) => p.ref);
  const rootRef = context.nextRef();
  const docElRef = context.nextRef();
  const els = pageRefs.map((pageRef, i) => {
    const pRef = context.register(
      context.obj({
        Type: PDFName.of('StructElem'),
        S: PDFName.of('P'),
        P: docElRef,
        Pg: pageRef,
        K: 0,
        ID: PDFString.of(`p${i + 1}`),
        ActualText: PDFString.of(i === 0 ? 'Visible text' : TAGGED_SECRET),
      }),
    );
    const formRef = context.register(
      context.obj({
        Type: PDFName.of('StructElem'),
        S: PDFName.of('Form'),
        P: docElRef,
        K: context.obj({
          Type: PDFName.of('OBJR'),
          Pg: pageRef,
          Obj: widgetRefs[i],
        }),
      }),
    );
    doc.getPage(i).node.set(PDFName.of('StructParents'), context.obj(i));
    (context.lookup(widgetRefs[i]) as typeof doc.catalog).set(
      PDFName.of('StructParent'),
      context.obj(2 + i),
    );
    return { pRef, formRef };
  });
  context.assign(
    docElRef,
    context.obj({
      Type: PDFName.of('StructElem'),
      S: PDFName.of('Document'),
      P: rootRef,
      K: els.flatMap((e) => [e.pRef, e.formRef]),
    }),
  );
  context.assign(
    rootRef,
    context.obj({
      Type: PDFName.of('StructTreeRoot'),
      K: docElRef,
      ParentTree: context.obj({
        Nums: [
          0,
          [els[0].pRef],
          1,
          [els[1].pRef],
          2,
          els[0].formRef,
          3,
          els[1].formRef,
        ],
      }),
      ParentTreeNextKey: 4,
      IDTree: context.obj({
        Names: [
          PDFString.of('p1'),
          els[0].pRef,
          PDFString.of('p2'),
          els[1].pRef,
        ],
      }),
    }),
  );
  doc.catalog.set(PDFName.of('StructTreeRoot'), rootRef);
  doc.catalog.set(PDFName.of('MarkInfo'), context.obj({ Marked: true }));
  return doc.save();
}

/** Every object in the file as text, with streams decompressed. */
export async function decodedObjects(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const parts: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      parts.push(obj.dict.toString());
      try {
        parts.push(
          new TextDecoder('latin1').decode(decodePDFRawStream(obj).decode()),
        );
      } catch {
        parts.push(new TextDecoder('latin1').decode(obj.contents));
      }
    } else parts.push(obj.toString());
  }
  return parts.join('\n');
}
