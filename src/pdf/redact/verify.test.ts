import { describe, expect, it } from 'vitest';
import { makeContentPdf } from '../../../test/fixtures/content';
import { nodeJpegCodec } from '../../../test/fixtures/jpeg-codec';
import {
  BASIC_MARK,
  makeRedactBasic,
  REDACT_TERM,
} from '../../../test/fixtures/redact';
import { nodeRedactServices } from '../../../test/fixtures/redact-services';
import { PDFDocument } from 'pdf-lib';
import type { Box } from '@/pdf/doc/types';
import { redactPages, type PageMarks } from './apply';
import { normalise, rawContainsTerm, verifyRedaction } from './verify';

const signal = new AbortController().signal;
const page0 = (box: Box, term?: string): PageMarks => ({
  pageIndex: 0,
  marks: [
    { box, fill: '#000000', overlayText: null, ...(term ? { term } : {}) },
  ],
});

describe('normalise and rawContainsTerm', () => {
  it('normalises case, width and white space', () => {
    expect(normalise('  Ｔop\n  Secret ')).toEqual({
      spaced: 'top secret',
      compact: 'topsecret',
    });
  });

  it('finds latin1 case-insensitively and UTF-16BE in either case', () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(rawContainsTerm(enc('xx topsecret-42 yy'), REDACT_TERM)).toBe(true);
    const u16 = new Uint8Array([
      0xfe,
      0xff,
      ...[...'TopSecret-42'].flatMap((c) => [0, c.charCodeAt(0)]),
    ]);
    expect(rawContainsTerm(u16, 'topsecret-42')).toBe(false);
    const upper = new Uint8Array([
      ...[...REDACT_TERM].flatMap((c) => [0, c.charCodeAt(0)]),
    ]);
    expect(rawContainsTerm(upper, 'topsecret-42')).toBe(true);
    expect(rawContainsTerm(enc('nothing here'), REDACT_TERM)).toBe(false);
  });
});

describe('verifyRedaction', () => {
  it('passes a correctly redacted file', async () => {
    const services = nodeRedactServices();
    const marks = [page0(BASIC_MARK, REDACT_TERM)];
    const r = await redactPages(await makeRedactBasic(), marks, [REDACT_TERM], {
      codec: nodeJpegCodec,
    });
    const swept = await services.qpdf.optimize(r.bytes, {
      removeUnreferenced: true,
      objectStreams: 'generate',
    });
    const v = await verifyRedaction(
      { bytes: swept.bytes, pages: marks, terms: [REDACT_TERM] },
      services,
      signal,
    );
    expect(v).toEqual({
      ok: true,
      failedPages: [],
      problems: [],
      documentLevel: false,
      rawBytes: false,
    });
  });

  it('fails a page whose text is only covered', async () => {
    const bytes = await makeContentPdf([
      {
        content: `BT /F1 14 Tf 72 700 Td (${REDACT_TERM}) Tj ET 0 g 70 695 120 20 re f`,
      },
    ]);
    const v = await verifyRedaction(
      {
        bytes,
        pages: [page0({ x: 70, y: 695, width: 120, height: 20 })],
        terms: [],
      },
      nodeRedactServices(),
      signal,
    );
    expect(v.ok).toBe(false);
    expect(v.failedPages).toEqual([0]);
    expect(v.problems).toEqual(['Page 1: text remains under a mark']);
  });

  it('fails a mark that is not painted', async () => {
    const bytes = await makeContentPdf([{ content: '' }]);
    const v = await verifyRedaction(
      {
        bytes,
        pages: [page0({ x: 70, y: 695, width: 120, height: 20 })],
        terms: [],
      },
      nodeRedactServices(),
      signal,
    );
    expect(v.problems).toEqual(['Page 1: a mark is not fully covered']);
  });

  it('fails when the document title still holds the term', async () => {
    const doc = await PDFDocument.load(
      await makeContentPdf([{ content: '0 g 70 695 120 20 re f' }]),
    );
    doc.setTitle(`About ${REDACT_TERM}`);
    const v = await verifyRedaction(
      {
        bytes: await doc.save(),
        pages: [page0({ x: 70, y: 695, width: 120, height: 20 }, REDACT_TERM)],
        terms: [REDACT_TERM],
      },
      nodeRedactServices(),
      signal,
    );
    expect(v.ok).toBe(false);
    expect(v.documentLevel).toBe(true);
    expect(v.problems).toContain('A search term remains in the document title');
  });

  it('fails when the raw bytes still hold the term (a stream comment)', async () => {
    const bytes = await makeContentPdf([
      { content: `% ${REDACT_TERM}\n0 g 70 695 120 20 re f` },
    ]);
    const v = await verifyRedaction(
      {
        bytes,
        pages: [page0({ x: 70, y: 695, width: 120, height: 20 }, REDACT_TERM)],
        terms: [REDACT_TERM],
      },
      nodeRedactServices(),
      signal,
    );
    expect(v.problems).toEqual(['A search term remains in the file data']);
    expect(v.rawBytes).toBe(true);
  });

  it('lets a term stay on a page where it was not marked', async () => {
    const bytes = await makeContentPdf([
      { content: '0 g 70 695 120 20 re f' },
      { content: `BT /F1 14 Tf 72 700 Td (${REDACT_TERM}) Tj ET` },
    ]);
    const v = await verifyRedaction(
      {
        bytes,
        pages: [page0({ x: 70, y: 695, width: 120, height: 20 }, REDACT_TERM)],
        terms: [REDACT_TERM],
      },
      nodeRedactServices(),
      signal,
    );
    expect(v.ok).toBe(true);
  });
});
