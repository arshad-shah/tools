import { describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import {
  makeAesEncryptedPdf,
  makeOwnerOnlyEncryptedPdf,
  makeTextPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import { qpdfHandlers } from './handlers';
import {
  mayBeEncrypted,
  preparePdf,
  unlockWithPassword,
  type UnlockEngine,
} from './unlock';

const ctx = { signal: new AbortController().signal, progress: () => {} };
const engine = (): UnlockEngine => ({
  inspect: vi.fn((b: Uint8Array, p?: string) =>
    qpdfHandlers.inspect(ctx, b, p),
  ),
  decrypt: vi.fn(
    async (b: Uint8Array, p: string) =>
      (await qpdfHandlers.decrypt(ctx, b, p)).value,
  ),
});
const enc = (s: string) => new TextEncoder().encode(s);

describe('mayBeEncrypted', () => {
  it('finds a real /Encrypt name but not look-alikes', async () => {
    expect(mayBeEncrypted(await makeTextPdf({ pages: 1 }))).toBe(false);
    expect(mayBeEncrypted(await makeAesEncryptedPdf())).toBe(true);
    expect(mayBeEncrypted(enc('%PDF-1.7 /Encrypt 5 0 R'))).toBe(true);
    expect(mayBeEncrypted(enc('%PDF-1.7 /Encrypt'))).toBe(true);
    expect(mayBeEncrypted(enc('%PDF-1.7 /EncryptMetadata false'))).toBe(false);
  });

  it('decodes #xx escapes in names (review M8)', () => {
    expect(mayBeEncrypted(enc('%PDF-1.7 /Encr#79pt 5 0 R'))).toBe(true);
    expect(mayBeEncrypted(enc('%PDF-1.7 /#45#6e#63#72#79#70#74<<'))).toBe(true);
    expect(mayBeEncrypted(enc('%PDF-1.7 /Encr#79ptMetadata false'))).toBe(
      false,
    );
    expect(mayBeEncrypted(enc('%PDF-1.7 /Encr#7'))).toBe(false);
  });
});

describe('preparePdf', () => {
  it('passes plain PDFs through without starting qpdf', async () => {
    const e = engine();
    const bytes = await makeTextPdf({ pages: 1 });
    expect(await preparePdf(bytes, e)).toEqual({
      status: 'ready',
      bytes,
      wasEncrypted: false,
    });
    expect(e.inspect).not.toHaveBeenCalled();
  });

  it('passes a false positive through after qpdf says it is not encrypted', async () => {
    const e = engine();
    const doc = await PDFDocument.create();
    doc.addPage();
    // A literal string that merely contains the token.
    doc.catalog.set(PDFName.of('Note'), PDFString.of('/Encrypt'));
    const bytes = await doc.save({ useObjectStreams: false });
    expect(mayBeEncrypted(bytes)).toBe(true);
    expect(await preparePdf(bytes, e)).toEqual({
      status: 'ready',
      bytes,
      wasEncrypted: false,
    });
    expect(e.decrypt).not.toHaveBeenCalled();
  });

  it('reports password-protected PDFs as locked', async () => {
    expect(await preparePdf(await makeAesEncryptedPdf(), engine())).toEqual({
      status: 'locked',
    });
  });

  it('opens permissions-only PDFs without asking', async () => {
    const r = await preparePdf(await makeOwnerOnlyEncryptedPdf(), engine());
    expect(r).toMatchObject({ status: 'ready', wasEncrypted: true });
    if (r.status !== 'ready') throw new Error('unreachable');
    expect(await pdfPageTexts(r.bytes)).toEqual(['Restricted 1']);
  });
});

describe('unlockWithPassword', () => {
  it('decrypts with the right password; wrong and empty ones fail precisely', async () => {
    const locked = await makeAesEncryptedPdf();
    await expect(
      unlockWithPassword(locked, 'nope', engine()),
    ).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
    await expect(unlockWithPassword(locked, '', engine())).rejects.toThrow(
      'Enter the password',
    );
    const plain = await unlockWithPassword(locked, 'user-pw', engine());
    expect((await PDFDocument.load(plain)).getPageCount()).toBe(2);
  });
});
