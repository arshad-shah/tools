import { PDFDocument } from 'pdf-lib';
import { drawText } from '@/pdf/edit/draw';
import { FontCache, loadNotoSans } from '@/pdf/edit/font-cache';
import { unsupportedChars } from '@/pdf/edit/fonts';
import type { CertInfo } from './cert-info';

export interface SummaryPageInput {
  documentName: string;
  /** Pages before the summary page is added. */
  pagesSigned: number;
  signerName: string;
  signerInfo: CertInfo;
  /** 1-based page numbers of visible signatures; empty = invisible. */
  locations: number[];
  time: Date;
  timeSource: 'device-clock' | 'timestamp-requested';
  timestampUrl?: string;
  /** SHA-256 of the document before the page and the signature were added. */
  preSignSha256: string;
  /** BCP 47 locale for dates (default: the runtime's). */
  locale?: string;
}

export const SUMMARY_HEADING = 'Signing summary';
export const SUMMARY_FOOTER =
  'This page is for information only. Check the digital signature in a PDF reader that verifies signatures.';
export const SUMMARY_BLOCKED_REASON =
  "A summary page can't be added without breaking the existing signatures";

const groups = (hex: string) => hex.match(/.{1,8}/g)?.join(' ') ?? hex;

/** The rows of the summary page, in plain words (decision G15). */
export function summaryRows(s: SummaryPageInput): string[] {
  const day = new Intl.DateTimeFormat(s.locale, { dateStyle: 'long' });
  const when = new Intl.DateTimeFormat(s.locale, {
    dateStyle: 'long',
    timeStyle: 'long',
  });
  let host = s.timestampUrl ?? '';
  try {
    host = new URL(host).host;
  } catch {
    // Keep what was given.
  }
  const i = s.signerInfo;
  return [
    `Document: ${s.documentName}`,
    `Pages: ${s.pagesSigned} (not counting this page)`,
    `Signed by: ${s.signerName}`,
    `Certificate: ${i.selfSigned ? 'self-signed' : `issued by ${i.issuerCN || i.issuer}`}, valid ${day.format(i.notBefore)} to ${day.format(i.notAfter)}`,
    s.locations.length
      ? `Signature locations: ${s.locations.map((n) => `page ${n}`).join(', ')}`
      : 'Invisible signature',
    `Signing time: ${when.format(s.time)} ${
      s.timeSource === 'device-clock'
        ? '(device clock)'
        : `(timestamp requested from ${host})`
    }`,
    `SHA-256 of the document before this page and the signature were added: ${groups(s.preSignSha256)}`,
  ];
}

/**
 * Appends an informational summary page the size of the last page (full
 * save; run before signing so the signature covers it).
 */
export async function appendSummaryPage(
  bytes: Uint8Array,
  s: SummaryPageInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const last = doc.getPage(doc.getPageCount() - 1);
  const { width, height } = last.getSize();
  const page = doc.addPage([width, height]);
  const draw = { doc, fonts: new FontCache(doc, loadNotoSans) };
  const margin = Math.min(56, width * 0.1);
  const textW = width - 2 * margin;
  let y = height - margin;
  const helvetica = await draw.fonts.get({ standard: 'Helvetica' });
  const block = async (text: string, size: number, lines: number) => {
    const h = size * 1.3 * lines;
    // Helvetica for WinAnsi text; the Unicode font for anything else.
    const font = unsupportedChars(helvetica, text).length
      ? ({ unicode: true } as const)
      : ({ standard: 'Helvetica' } as const);
    y -= h;
    await drawText(
      draw,
      page,
      text,
      { x: margin, y, width: textW, height: h },
      {
        font,
        size,
        color: '#111827',
        multiline: true,
        fit: 'shrink',
        minSize: 6,
      },
    );
    y -= size * 0.6;
  };
  await block(SUMMARY_HEADING, 18, 1);
  for (const row of summaryRows(s)) await block(row, 10, 3);
  y = margin + 30;
  await block(SUMMARY_FOOTER, 8, 2);
  return doc.save({ useObjectStreams: false });
}
