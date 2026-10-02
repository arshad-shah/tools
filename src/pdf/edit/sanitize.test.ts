import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import {
  decodedObjects,
  makeTextPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import {
  FORM_LAYER_TEXT,
  HIDDEN_LAYER_TEXT,
  makeActionsPdf,
  makeLayeredFormsPdf,
  makeScriptedPdf,
  OCMD_LAYER_TEXT,
  VISIBLE_LAYER_TEXT,
} from '../../../test/fixtures/protect';
import { getMetadata } from './metadata';
import {
  sanitizeDoc,
  sanitizePreviewDoc,
  type SanitizeOptions,
} from './sanitize';

const ALL: SanitizeOptions = {
  scripts: true,
  attachments: true,
  links: true,
  metadata: true,
  hiddenLayers: true,
};
const NONE: SanitizeOptions = {
  scripts: false,
  attachments: false,
  links: false,
  metadata: false,
  hiddenLayers: false,
};

let src: Uint8Array;
beforeAll(async () => {
  src = await makeScriptedPdf();
});

const load = (b: Uint8Array) => PDFDocument.load(b, { updateMetadata: false });
const annotTypes = async (b: Uint8Array) => {
  const doc = await load(b);
  const annots = doc.getPages()[0].node.Annots();
  return (annots?.asArray() ?? []).map((r) =>
    (doc.context.lookup(r) as PDFDict).get(PDFName.of('Subtype'))?.toString(),
  );
};

describe('sanitizeDoc', () => {
  it('removes scripts, open action, page actions and XFA and reports each', async () => {
    const { bytes, report } = await sanitizeDoc(src, {
      ...NONE,
      scripts: true,
    });
    expect(report.removed).toEqual([
      'Document JavaScript (2 scripts)',
      'Open action',
      'Document additional actions',
      'Additional actions on 2 pages',
      'Script actions on 1 annotation or form field',
      'XFA form data',
      'Private application data',
      'Page thumbnails on 2 pages',
    ]);
    const doc = await load(bytes);
    const names = doc.catalog.lookup(PDFName.of('Names'), PDFDict);
    expect(names.has(PDFName.of('JavaScript'))).toBe(false);
    expect(names.has(PDFName.of('EmbeddedFiles'))).toBe(true);
    expect(doc.catalog.has(PDFName.of('OpenAction'))).toBe(false);
    expect(doc.catalog.has(PDFName.of('AA'))).toBe(false);
    for (const p of doc.getPages()) {
      expect(p.node.has(PDFName.of('AA'))).toBe(false);
      expect(p.node.has(PDFName.of('Thumb'))).toBe(false);
      expect(p.node.has(PDFName.of('PieceInfo'))).toBe(false);
    }
    const acro = doc.catalog.lookup(PDFName.of('AcroForm'), PDFDict);
    expect(acro.has(PDFName.of('XFA'))).toBe(false);
    // Only the scripts went: links and attachments stay.
    expect(await annotTypes(bytes)).toEqual([
      '/Link',
      '/Link',
      '/FileAttachment',
      '/Text',
      '/Widget',
    ]);
  });

  it('removes attachments, outside links, metadata and hidden layers', async () => {
    const { bytes, report } = await sanitizeDoc(src, ALL);
    expect(report.removed).toEqual(
      expect.arrayContaining([
        '1 attachment',
        '1 file attachment annotation',
        '1 link to a web page or another file',
        'Document properties and XMP metadata',
        'Hidden layer content on 1 page',
        '1 annotation in a hidden layer',
        '1 hidden layer',
      ]),
    );
    expect(await annotTypes(bytes)).toEqual(['/Link', '/Widget']);
    const doc = await load(bytes);
    const names = doc.catalog.lookup(PDFName.of('Names'), PDFDict);
    expect(names.has(PDFName.of('EmbeddedFiles'))).toBe(false);
    expect(await getMetadata(bytes)).toMatchObject({
      title: '',
      author: '',
      hasXmp: false,
    });
    const text = (await pdfPageTexts(bytes))[0];
    expect(text).not.toContain(HIDDEN_LAYER_TEXT);
    expect(text).toContain(VISIBLE_LAYER_TEXT);
    expect(text).toContain('Visible body text');
    expect(await decodedObjects(bytes)).not.toContain('Draft');
  });

  it('a dry run reports the same items and changes nothing', async () => {
    const real = await sanitizeDoc(src, ALL);
    const dry = await sanitizeDoc(src, { ...ALL, dryRun: true });
    expect(dry.report).toEqual(real.report);
    expect(dry.bytes).toEqual(src);
  });

  it('reports nothing for a plain document', async () => {
    const plain = await makeTextPdf({ pages: 1 });
    const { report } = await sanitizeDoc(plain, { ...ALL, metadata: false });
    expect(report.removed).toEqual([]);
  });
});

describe('sanitize hidden layers in depth', () => {
  it('removes hidden content inside forms and through OCMDs, keeping still-referenced groups', async () => {
    const src2 = await makeLayeredFormsPdf();
    const { bytes, report } = await sanitizeDoc(src2, {
      ...NONE,
      hiddenLayers: true,
    });
    const raw = await decodedObjects(bytes);
    expect(raw).not.toContain(FORM_LAYER_TEXT);
    expect(raw).not.toContain(OCMD_LAYER_TEXT);
    expect(raw).not.toContain('Draft notes');
    expect(raw).not.toContain('Reviewer');
    // The broken form still names "Kept layer", so the group stays.
    expect(raw).toContain('Kept layer');
    expect(report.removed.join(' ')).toContain('hidden layer');
  });
});

describe('sanitize actions beyond the page', () => {
  it('removes bookmark scripts and launches, rendition scripts and submit or import actions', async () => {
    const { bytes, report } = await sanitizeDoc(await makeActionsPdf(), {
      ...NONE,
      scripts: true,
    });
    const raw = await decodedObjects(bytes);
    for (const s of [
      'app.alert',
      'calc.exe',
      'play()',
      'example.com/collect',
      'data.fdf',
    ])
      expect(raw, s).not.toContain(s);
    expect(raw).toContain('Run');
    expect(report.removed).toContain('Actions on 2 bookmarks');
  });
});

describe('sanitizePreviewDoc', () => {
  it('reports per kind from one load what separate dry runs report', async () => {
    for (const bytes of [src, await makeActionsPdf()]) {
      const preview = await sanitizePreviewDoc(bytes);
      for (const k of Object.keys(NONE) as (keyof SanitizeOptions)[]) {
        const one = await sanitizeDoc(bytes, {
          ...NONE,
          [k]: true,
          dryRun: true,
        });
        expect(preview[k], k).toEqual(one.report.removed);
      }
    }
  });
});
