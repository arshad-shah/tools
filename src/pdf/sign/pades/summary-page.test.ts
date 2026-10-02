import { sha256 } from '@noble/hashes/sha2.js';
import { describe, expect, it } from 'vitest';
import { makeTextPdf, pdfPageTexts } from '../../../../test/fixtures/builders';
import { createSelfSigned } from './self-signed';
import { appendSummaryPage, SUMMARY_FOOTER, summaryRows } from './summary-page';
import { toHex } from './syntax';

describe('appendSummaryPage', () => {
  it('adds one informational page with the pre-signing digest', async () => {
    const bytes = await makeTextPdf({ pages: 2 });
    const id = await createSelfSigned({
      name: 'Jane Doe',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    const digest = toHex(sha256(bytes));
    const out = await appendSummaryPage(bytes, {
      documentName: 'contract.pdf',
      pagesSigned: 2,
      signerName: 'Jane Doe',
      signerInfo: id.info,
      locations: [2],
      time: new Date(Date.UTC(2026, 9, 1, 12, 0, 0)),
      timeSource: 'device-clock',
      preSignSha256: digest,
      locale: 'en-GB',
    });
    const texts = await pdfPageTexts(out);
    expect(texts).toHaveLength(3);
    const last = texts[2].replace(/\s+/g, ' ');
    expect(last).toContain('Signing summary');
    expect(last).toContain('Document: contract.pdf');
    expect(last).toContain('Pages: 2 (not counting this page)');
    expect(last).toContain('Signature locations: page 2');
    expect(last).toContain('(device clock)');
    expect(last.replace(/ /g, '')).toContain(digest);
    expect(last).toContain(SUMMARY_FOOTER.slice(0, 40));
  });

  it('names an invisible signature and a requested timestamp', async () => {
    const id = await createSelfSigned({
      name: 'Jane Doe',
      years: 1,
      keyType: 'ecdsa-p256',
    });
    const rows = summaryRows({
      documentName: 'a.pdf',
      pagesSigned: 1,
      signerName: 'Jane Doe',
      signerInfo: id.info,
      locations: [],
      time: new Date(),
      timeSource: 'timestamp-requested',
      timestampUrl: 'https://tsa.example.org/tsr',
      preSignSha256: 'ab'.repeat(32),
    });
    expect(rows).toContain('Invisible signature');
    expect(rows.join('\n')).toContain(
      '(timestamp requested from tsa.example.org)',
    );
    expect(rows.join('\n')).toContain('Certificate: self-signed');
    expect(rows.at(-1)).toContain('abababab abababab');
  });
});
