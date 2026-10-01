import { PDFDocument, PDFName, rgb, StandardFonts } from 'pdf-lib';
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

/** A real AES-256 (R6) encrypted PDF that needs a user password to open. */
export async function makeAesEncryptedPdf(): Promise<Uint8Array> {
  const bytes = await makeTextPdf({ pages: 2, label: 'Locked' });
  return (
    await encrypt(bytes, { userPassword: 'user-pw', ownerPassword: 'owner-pw' })
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
