// Test-only builders for Protect mode (sanitise).
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
  StandardFonts,
} from 'pdf-lib';

/** Text drawn only inside the hidden (OFF by default) layer. */
export const HIDDEN_LAYER_TEXT = 'HIDDEN-LAYER-NOTE';
/** Text drawn in a layer that is ON by default (kept). */
export const VISIBLE_LAYER_TEXT = 'VISIBLE-LAYER-NOTE';

const js = (doc: PDFDocument, code: string) =>
  doc.context.obj({ S: 'JavaScript', JS: PDFString.of(code) });

/**
 * Two pages carrying everything sanitise removes:
 * - document JavaScript (2 scripts in /Names /JavaScript) and a JavaScript
 *   /OpenAction; catalog /AA;
 * - /AA on both pages; a form field whose widget has /AA and a JavaScript /A;
 *   /AcroForm /XFA;
 * - one embedded file (/Names /EmbeddedFiles) and a FileAttachment annotation;
 * - a URI link (removed by "links") and an internal GoTo link (kept);
 * - Info and XMP metadata;
 * - an optional content group OFF by default whose content and annotation
 *   go, and one ON by default that stays;
 * - page /PieceInfo and /Thumb.
 */
export async function makeScriptedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const { context: c } = doc;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p1 = doc.addPage([612, 792]);
  const p2 = doc.addPage([612, 792]);
  p1.drawText('Visible body text', { x: 72, y: 700, size: 12, font });
  p2.drawText('Second page', { x: 72, y: 700, size: 12, font });
  doc.setTitle('Scripted fixture');
  doc.setAuthor('Fixture author');
  const xmp =
    '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Scripted fixture</rdf:li></rdf:Alt></dc:title></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
  doc.catalog.set(
    PDFName.of('Metadata'),
    c.register(
      c.stream(new TextEncoder().encode(xmp), {
        Type: 'Metadata',
        Subtype: 'XML',
      }),
    ),
  );

  // Document JavaScript, open action, catalog additional actions.
  const names = c.obj({
    JavaScript: c.obj({
      Names: [
        PDFString.of('init'),
        c.register(js(doc, 'app.alert(1)')),
        PDFString.of('track'),
        c.register(js(doc, 'this.submitForm("x")')),
      ],
    }),
    EmbeddedFiles: c.obj({
      Names: [
        PDFString.of('notes.txt'),
        c.register(
          c.obj({
            Type: 'Filespec',
            F: PDFString.of('notes.txt'),
            EF: c.obj({
              F: c.register(
                c.stream(new TextEncoder().encode('attached notes'), {
                  Type: 'EmbeddedFile',
                }),
              ),
            }),
          }),
        ),
      ],
    }),
  });
  doc.catalog.set(PDFName.of('Names'), c.register(names));
  doc.catalog.set(PDFName.of('OpenAction'), c.register(js(doc, 'open()')));
  doc.catalog.set(PDFName.of('AA'), c.obj({ WC: js(doc, 'close()') }));
  doc.catalog.set(PDFName.of('PieceInfo'), c.obj({ App: c.obj({}) }));

  // Page additional actions, private data and thumbnails.
  p1.node.set(PDFName.of('AA'), c.obj({ O: js(doc, 'pageOpen()') }));
  p2.node.set(PDFName.of('AA'), c.obj({ C: js(doc, 'pageClose()') }));
  for (const p of [p1, p2]) {
    p.node.set(PDFName.of('PieceInfo'), c.obj({ App: c.obj({}) }));
    p.node.set(
      PDFName.of('Thumb'),
      c.register(
        c.stream(new Uint8Array(12), {
          Width: 2,
          Height: 2,
          ColorSpace: 'DeviceRGB',
          BitsPerComponent: 8,
        }),
      ),
    );
  }

  // Optional content: Draft is OFF by default, Shown is ON.
  const draft = c.register(c.obj({ Type: 'OCG', Name: PDFString.of('Draft') }));
  const shown = c.register(c.obj({ Type: 'OCG', Name: PDFString.of('Shown') }));
  doc.catalog.set(
    PDFName.of('OCProperties'),
    c.obj({
      OCGs: [draft, shown],
      D: c.obj({ Order: [draft, shown], OFF: [draft] }),
    }),
  );
  const resources = p1.node.Resources()!;
  resources.set(PDFName.of('Properties'), c.obj({ L0: draft, L1: shown }));
  const fontKey = [...resources.lookup(PDFName.of('Font'), PDFDict).keys()][0];
  const layered = [
    `/OC /L0 BDC BT ${fontKey} 12 Tf 72 600 Td (${HIDDEN_LAYER_TEXT}) Tj ET EMC`,
    `/OC /L1 BDC BT ${fontKey} 12 Tf 72 560 Td (${VISIBLE_LAYER_TEXT}) Tj ET EMC`,
  ].join('\n');
  const contents = p1.node.get(PDFName.of('Contents'));
  const extra = c.register(c.stream(layered));
  p1.node.set(
    PDFName.of('Contents'),
    contents instanceof PDFArray
      ? c.obj([...contents.asArray(), extra])
      : c.obj([contents!, extra]),
  );

  // Annotations: URI link, internal link, file attachment, hidden-layer note.
  const rect = (y: number) => [72, y, 200, y + 20];
  const uri = c.register(
    c.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: rect(500),
      A: c.obj({ S: 'URI', URI: PDFString.of('https://example.com/') }),
    }),
  );
  const goTo = c.register(
    c.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: rect(470),
      Dest: [p2.ref, PDFName.of('Fit')],
    }),
  );
  const attachment = c.register(
    c.obj({
      Type: 'Annot',
      Subtype: 'FileAttachment',
      Rect: rect(440),
      FS: c.obj({ Type: 'Filespec', F: PDFString.of('inline.txt') }),
    }),
  );
  const hiddenNote = c.register(
    c.obj({
      Type: 'Annot',
      Subtype: 'Text',
      Rect: rect(410),
      Contents: PDFHexString.fromText('note in the hidden layer'),
      OC: draft,
    }),
  );
  // A form field whose widget runs scripts.
  const widget = c.register(
    c.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Tx',
      T: PDFString.of('name'),
      Rect: rect(380),
      P: p1.ref,
      AA: c.obj({ K: js(doc, 'keystroke()') }),
      A: js(doc, 'clicked()'),
    }),
  );
  p1.node.set(
    PDFName.of('Annots'),
    c.obj([uri, goTo, attachment, hiddenNote, widget]),
  );
  doc.catalog.set(
    PDFName.of('AcroForm'),
    c.obj({
      Fields: [widget],
      XFA: c.register(
        c.stream('<xdp:xdp xmlns:xdp="http://ns.adobe.com/xdp/"/>'),
      ),
    }),
  );
  return doc.save({ useObjectStreams: false });
}

export const FORM_LAYER_TEXT = 'FORM-HIDDEN-NOTE';
export const OCMD_LAYER_TEXT = 'OCMD-HIDDEN-NOTE';

/**
 * Hidden-layer content reached in ways the page content does not show
 * directly: inside a Form XObject (a BDC in the form's own content), and
 * through an optional content membership dictionary (OCMD) in /Properties.
 * A third OFF group stays referenced by an XObject's /OC that sanitise
 * cannot strip (a form whose content cannot be parsed), so it must be kept.
 */
export async function makeLayeredFormsPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const c = doc.context;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('Body', { x: 72, y: 740, size: 12, font });
  const off = c.register(
    c.obj({ Type: 'OCG', Name: PDFString.of('Draft notes') }),
  );
  const off2 = c.register(
    c.obj({ Type: 'OCG', Name: PDFString.of('Reviewer') }),
  );
  const kept = c.register(
    c.obj({ Type: 'OCG', Name: PDFString.of('Kept layer') }),
  );
  const ocmd = c.register(c.obj({ Type: 'OCMD', OCGs: [off2], P: 'AnyOn' }));
  const fontRes = { Font: { F1: font.ref } };
  const form = c.register(
    c.stream(`/OC /L1 BDC BT /F1 12 Tf 0 0 Td (${FORM_LAYER_TEXT}) Tj ET EMC`, {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [0, 0, 300, 50],
      Resources: { ...fontRes, Properties: { L1: off } },
    } as never),
  );
  const broken = c.register(
    c.stream('(unterminated', {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [0, 0, 10, 10],
      OC: kept,
    } as never),
  );
  const content = `q 1 0 0 1 72 600 cm /Fm0 Do Q /OC /M1 BDC BT /F1 12 Tf 72 500 Td (${OCMD_LAYER_TEXT}) Tj ET EMC`;
  page.node.set(PDFName.of('Contents'), c.register(c.stream(content)));
  const res = page.node.Resources()!;
  res.set(PDFName.of('XObject'), c.obj({ Fm0: form, Bad: broken }));
  res.set(PDFName.of('Properties'), c.obj({ M1: ocmd }));
  doc.catalog.set(
    PDFName.of('OCProperties'),
    c.obj({ OCGs: [off, off2, kept], D: { ON: [], OFF: [off, off2, kept] } }),
  );
  return doc.save({ useObjectStreams: false });
}

/**
 * Actions sanitise "Scripts" must reach beyond the page: bookmark actions
 * (JavaScript, Launch), a Rendition action carrying JavaScript, and
 * SubmitForm / ImportData on button widgets.
 */
export async function makeActionsPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const c = doc.context;
  const page = doc.addPage([612, 792]);
  const outline = c.nextRef();
  const a = c.nextRef();
  const b = c.nextRef();
  c.assign(
    a,
    c.obj({
      Title: PDFString.of('Run'),
      Parent: outline,
      Next: b,
      A: { S: 'JavaScript', JS: PDFString.of('app.alert(1)') },
    }),
  );
  c.assign(
    b,
    c.obj({
      Title: PDFString.of('Open'),
      Parent: outline,
      Prev: a,
      A: { S: 'Launch', F: PDFString.of('calc.exe') },
    }),
  );
  c.assign(outline, c.obj({ Type: 'Outlines', First: a, Last: b, Count: 2 }));
  doc.catalog.set(PDFName.of('Outlines'), outline);
  const widget = (y: number, action: Record<string, unknown>) =>
    c.register(
      c.obj({
        Type: 'Annot',
        Subtype: 'Widget',
        FT: 'Btn',
        Ff: 65536,
        T: PDFString.of(`b${y}`),
        Rect: [72, y, 172, y + 20],
        A: action,
      } as never),
    );
  const w1 = widget(600, {
    S: 'SubmitForm',
    F: PDFString.of('https://example.com/collect'),
  });
  const w2 = widget(560, { S: 'ImportData', F: PDFString.of('data.fdf') });
  const rendition = c.register(
    c.obj({
      Type: 'Annot',
      Subtype: 'Screen',
      Rect: [72, 400, 172, 450],
      A: { S: 'Rendition', OP: 0, JS: PDFString.of('play()') },
    } as never),
  );
  page.node.set(PDFName.of('Annots'), c.obj([w1, w2, rendition]));
  doc.catalog.set(PDFName.of('AcroForm'), c.obj({ Fields: [w1, w2] }));
  return doc.save({ useObjectStreams: false });
}
