import {
  decodePDFRawStream,
  degrees,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFString,
  rgb,
  StandardFonts,
  type PDFRef,
} from 'pdf-lib';
import { encrypt } from '@arshad-shah/qpdf-wasm';
import { getDocument, OPS, Util } from 'pdfjs-dist/legacy/build/pdf.mjs';

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

export async function makeRotatedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const specs: {
    size: [number, number];
    rotate: number;
    crop?: [number, number, number, number];
  }[] = [
    { size: [612, 792], rotate: 0 },
    { size: [612, 792], rotate: 90 },
    { size: [595, 842], rotate: 270, crop: [20, 30, 555, 782] },
  ];
  specs.forEach((s, i) => {
    const page = doc.addPage(s.size);
    page.setRotation(degrees(s.rotate));
    if (s.crop) page.setCropBox(...s.crop);
    page.drawText(`Rotated ${i + 1}`, { x: 100, y: 400, size: 14, font });
  });
  return doc.save();
}

export interface TextPosition {
  str: string;
  /** pdf.js viewport (scale 1, rotation applied): origin top-left, y down. */
  x: number;
  y: number;
  /** Reads left-to-right on screen. */
  upright: boolean;
  /** Font size in viewport units (points at scale 1). */
  size: number;
  /** Text direction on screen, degrees counter-clockwise from left-to-right. */
  angle: number;
  viewport: { width: number; height: number };
}

export async function textPositions(
  bytes: Uint8Array,
  pageIndex: number,
): Promise<TextPosition[]> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const { items } = await page.getTextContent();
    return items
      .filter(
        (i): i is typeof i & { str: string; transform: number[] } =>
          'str' in i && i.str.trim() !== '',
      )
      .map((i) => {
        const [a, b, , , e, f] = Util.transform(
          viewport.transform,
          i.transform,
        );
        return {
          str: i.str,
          x: e,
          y: f,
          upright: a > 0 && Math.abs(b) < 1e-3,
          size: Math.hypot(a, b),
          angle: (Math.atan2(-b, a) * 180) / Math.PI,
          viewport: { width: viewport.width, height: viewport.height },
        };
      });
  } finally {
    await task.destroy();
  }
}

export async function makeFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  form
    .createTextField('name')
    .addToPage(page, { x: 72, y: 700, width: 240, height: 24 });
  const notes = form.createTextField('notes');
  notes.enableMultiline();
  notes.addToPage(page, { x: 72, y: 600, width: 240, height: 80 });
  const zip = form.createTextField('zip');
  zip.setMaxLength(5);
  // An alternate (user-facing) name, as real forms carry for their fields.
  zip.acroField.dict.set(PDFName.of('TU'), PDFString.of('Postcode'));
  zip.addToPage(page, { x: 72, y: 560, width: 80, height: 24 });
  form
    .createCheckBox('agree')
    .addToPage(page, { x: 72, y: 520, width: 16, height: 16 });
  const size = form.createRadioGroup('size');
  ['S', 'M', 'L'].forEach((opt, i) =>
    size.addOptionToPage(opt, page, {
      x: 72 + i * 40,
      y: 480,
      width: 16,
      height: 16,
    }),
  );
  const country = form.createDropdown('country');
  country.addOptions(['Ireland', 'France', 'Spain']);
  country.addToPage(page, { x: 72, y: 440, width: 160, height: 24 });
  const toppings = form.createOptionList('toppings');
  toppings.addOptions(['Cheese', 'Olives', 'Peppers']);
  toppings.enableMultiselect();
  toppings.addToPage(page, { x: 72, y: 340, width: 160, height: 80 });
  const ref = form.createTextField('ref');
  ref.setText('R-1');
  ref.enableReadOnly();
  ref.addToPage(page, { x: 320, y: 700, width: 120, height: 24 });
  return doc.save();
}

/** An AcroForm that also carries XFA (pdf-lib cannot fill XFA). */
export async function makeXfaPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await makeFormPdf());
  const acro = doc.catalog.lookup(PDFName.of('AcroForm'), PDFDict);
  acro.set(
    PDFName.of('XFA'),
    doc.context.register(
      doc.context.stream('<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"/>'),
    ),
  );
  return doc.save();
}

export interface ImagePlacement {
  /** Bounding box on the pdf.js viewport (scale 1, rotation applied, y down). */
  left: number;
  top: number;
  width: number;
  height: number;
  /** The image's own left-to-right runs left-to-right on screen. */
  upright: boolean;
  viewport: { width: number; height: number };
}

type Matrix = [number, number, number, number, number, number];
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

/** Where each image XObject is painted on a page, as a viewer shows it. */
export async function imagePlacements(
  bytes: Uint8Array,
  pageIndex: number,
): Promise<ImagePlacement[]> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const { fnArray, argsArray } = await page.getOperatorList();
    const out: ImagePlacement[] = [];
    let ctm: Matrix = viewport.transform as Matrix;
    const stack: Matrix[] = [];
    fnArray.forEach((fn, i) => {
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
      else if (fn === OPS.transform) ctm = mul(ctm, argsArray[i] as Matrix);
      else if (fn === OPS.paintImageXObject) {
        // Images fill the unit square of their current matrix.
        const pts = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map(([x, y]) => [
          ctm[0] * x + ctm[2] * y + ctm[4],
          ctm[1] * x + ctm[3] * y + ctm[5],
        ]);
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        out.push({
          left: Math.min(...xs),
          top: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
          upright: ctm[0] > 0 && Math.abs(ctm[1]) < 1e-6,
          viewport: { width: viewport.width, height: viewport.height },
        });
      }
    });
    return out;
  } finally {
    await task.destroy();
  }
}
