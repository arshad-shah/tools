/*
 * Smart-placement fixtures (plan H-8): an AcroForm signature field and a
 * flat page with a signature label above a ruled line.
 */
import { PDFDocument, PDFName, PDFString, rgb, StandardFonts } from 'pdf-lib';
import type { Box } from '../../src/pdf/doc/types';

/** Where `makeSigFieldPdf` puts its widget (page 1, PDF points). */
export const SIG_FIELD_RECT: Box = { x: 320, y: 120, width: 200, height: 50 };
export const SIG_FIELD_NAME = 'ApplicantSignature';

/**
 * One page with an empty, unsigned /Sig field (a merged field and widget)
 * at `SIG_FIELD_RECT`. `signed` gives it a /V signature dictionary, as a
 * signed field has (the dictionary holds no real signature).
 */
export async function makeSigFieldPdf({
  signed = false,
}: { signed?: boolean } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  const { x, y, width, height } = SIG_FIELD_RECT;
  const ctx = doc.context;
  const field = ctx.obj({
    FT: 'Sig',
    T: PDFString.of(SIG_FIELD_NAME),
    Type: 'Annot',
    Subtype: 'Widget',
    Rect: [x, y, x + width, y + height],
    F: 4,
    P: page.ref,
  });
  if (signed)
    field.set(
      PDFName.of('V'),
      ctx.register(ctx.obj({ Type: 'Sig', Filter: 'Adobe.PPKLite' })),
    );
  const ref = ctx.register(field);
  form.acroForm.addField(ref);
  page.node.addAnnot(ref);
  return doc.save();
}

/** The label and line `makeSignatureLinePdf` draws (page 1). */
export const SIGNATURE_LINE = {
  label: 'Signature of applicant',
  labelBaseline: 600,
  x1: 72,
  x2: 300,
  y: 585,
};

/** "Signature of applicant" in 12pt Helvetica with a ruled line just below it. */
export async function makeSignatureLinePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  const { label, labelBaseline, x1, x2, y } = SIGNATURE_LINE;
  page.drawText(label, { x: x1, y: labelBaseline, size: 12, font });
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness: 0.75,
    color: rgb(0, 0, 0),
  });
  return doc.save();
}
