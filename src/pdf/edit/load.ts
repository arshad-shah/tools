import { EncryptedPDFError, PDFDocument } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { ENCRYPTED_MESSAGE } from './messages';

// pdf-lib compiles to ES5, so subclasses of Error lose their prototype and
// `instanceof EncryptedPDFError` is false at runtime; fall back to the message.
function isEncryptedError(cause: unknown): boolean {
  return (
    cause instanceof EncryptedPDFError ||
    (cause instanceof Error && cause.message.includes('is encrypted'))
  );
}

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (cause) {
    if (isEncryptedError(cause)) {
      throw new ToolError('ENCRYPTED', ENCRYPTED_MESSAGE, { cause });
    }
    throw new ToolError(
      'INVALID_FILE',
      'This file could not be read as a PDF. It may be damaged.',
      { cause },
    );
  }
  // pdf-lib is lenient: a header plus garbage can "load" with no page tree.
  let count: number;
  try {
    count = doc.getPageCount();
  } catch (cause) {
    throw new ToolError(
      'INVALID_FILE',
      'This file could not be read as a PDF. It may be damaged.',
      { cause },
    );
  }
  if (count === 0)
    throw new ToolError('INVALID_FILE', 'This PDF has no pages.');
  return doc;
}

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}
