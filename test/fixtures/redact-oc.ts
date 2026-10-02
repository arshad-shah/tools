import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { makeContentPdf } from './content';

export const LAYER_TERM = 'LAYERSECRET-3';

/**
 * Page 1: LAYER_TERM drawn inside ADV_MARK in an optional content group
 * that is OFF by default (readers hide it), plus a public line outside the
 * mark in a group that is ON.
 */
export async function makeOptionalContentPdf(): Promise<Uint8Array> {
  const base = await makeContentPdf([
    {
      content: [
        `/OC /L0 BDC BT /F1 14 Tf 72 700 Td (${LAYER_TERM}) Tj ET EMC`,
        '/OC /L1 BDC BT /F1 14 Tf 72 400 Td (Public layer line) Tj ET EMC',
      ].join('\n'),
    },
  ]);
  const doc = await PDFDocument.load(base);
  const c = doc.context;
  const hidden = c.register(
    c.obj({ Type: 'OCG', Name: PDFString.of('Draft') }),
  );
  const shown = c.register(c.obj({ Type: 'OCG', Name: PDFString.of('Shown') }));
  doc.catalog.set(
    PDFName.of('OCProperties'),
    c.obj({
      OCGs: [hidden, shown],
      D: c.obj({ Order: [hidden, shown], OFF: [hidden] }),
    }),
  );
  doc
    .getPage(0)
    .node.Resources()!
    .set(PDFName.of('Properties'), c.obj({ L0: hidden, L1: shown }));
  return doc.save({ useObjectStreams: false });
}
