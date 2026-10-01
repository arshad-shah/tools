import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  decodedObjects,
  makeBadCountPdf,
  makeTaggedFormPdf,
  TAGGED_SECRET,
  makeEncryptMarkedPdf,
  makeStructuredPdf,
  makeTextPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import { applyPageEdits, extract, merge, split } from './ops';

const rotations = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((p) => p.getRotation().angle);

describe('merge', () => {
  it('concatenates documents in order', async () => {
    const a = await makeTextPdf({ pages: 2, label: 'A' });
    const b = await makeTextPdf({ pages: 1, label: 'B' });
    expect(
      await pdfPageTexts(await merge([{ bytes: a }, { bytes: b }])),
    ).toEqual(['A 1', 'A 2', 'B 1']);
  });
  it('honours per-input page subsets', async () => {
    const a = await makeTextPdf({ pages: 3, label: 'A' });
    const b = await makeTextPdf({ pages: 2, label: 'B' });
    const out = await merge([
      { bytes: a, pages: [2, 0] },
      { bytes: b, pages: [1] },
    ]);
    expect(await pdfPageTexts(out)).toEqual(['A 3', 'A 1', 'B 2']);
  });
  it('requires at least one input', async () => {
    await expect(merge([])).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
  it('rejects an encrypted input with ENCRYPTED', async () => {
    const ok = await makeTextPdf({ pages: 1 });
    await expect(
      merge([{ bytes: ok }, { bytes: await makeEncryptMarkedPdf() }]),
    ).rejects.toMatchObject({ code: 'ENCRYPTED' });
  });
  it('reports progress once per input', async () => {
    const a = await makeTextPdf({ pages: 1 });
    const seen: [number, number][] = [];
    await merge([{ bytes: a }, { bytes: a }, { bytes: a }], {
      onProgress: (done, total) => seen.push([done, total]),
    });
    expect(seen).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
  it('wraps pdf-lib rebuild failures as INVALID_FILE', async () => {
    const a = await makeTextPdf({ pages: 1 });
    vi.spyOn(PDFDocument.prototype, 'copyPages').mockRejectedValueOnce(
      new Error('Expected instance of PDFDict, but got instance of undefined'),
    );
    await expect(merge([{ bytes: a }])).rejects.toMatchObject({
      name: 'ToolError',
      code: 'INVALID_FILE',
      message:
        'This PDF has a structure we could not rebuild. It may be damaged.',
    });
  });
});

describe('extract / split', () => {
  it('extracts pages in the given order', async () => {
    const src = await makeTextPdf({ pages: 4, label: 'P' });
    expect(await pdfPageTexts(await extract(src, [3, 1]))).toEqual([
      'P 4',
      'P 2',
    ]);
  });
  it('rejects empty or out-of-range indices', async () => {
    const src = await makeTextPdf({ pages: 2 });
    await expect(extract(src, [])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(extract(src, [2])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
  it('splits into one document per range', async () => {
    const src = await makeTextPdf({ pages: 5, label: 'S' });
    const parts = await split(src, [
      { start: 0, end: 1 },
      { start: 4, end: 4 },
    ]);
    expect(parts).toHaveLength(2);
    expect(await pdfPageTexts(parts[0])).toEqual(['S 1', 'S 2']);
    expect(await pdfPageTexts(parts[1])).toEqual(['S 5']);
  });
  it('reports split progress once per range', async () => {
    const src = await makeTextPdf({ pages: 4 });
    const seen: number[] = [];
    await split(
      src,
      [
        { start: 0, end: 1 },
        { start: 2, end: 3 },
      ],
      { onProgress: (done) => seen.push(done) },
    );
    expect(seen).toEqual([1, 2]);
  });
  it('validates range bounds before expanding them', async () => {
    const src = await makeTextPdf({ pages: 2 });
    const from = vi.spyOn(Array, 'from');
    await expect(split(src, [{ start: 0, end: 1e9 }])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Page 1000000001 is out of range (1–2)',
    });
    expect(from).not.toHaveBeenCalledWith(
      expect.objectContaining({ length: 1e9 + 1 }),
      expect.anything(),
    );
    await expect(split(src, [{ start: 1, end: 0 }])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(split(src, [{ start: 0.5, end: 1 }])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
  it('wraps save failures as INVALID_FILE', async () => {
    const src = await makeTextPdf({ pages: 2 });
    vi.spyOn(PDFDocument.prototype, 'save').mockRejectedValueOnce(
      new Error('boom'),
    );
    await expect(extract(src, [0])).rejects.toMatchObject({
      code: 'INVALID_FILE',
    });
  });
});

/** Document-level structure as pdf.js (what viewers use) sees it. */
async function inspect(bytes: Uint8Array) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const pdf = await task.promise;
    const { info } = (await pdf.getMetadata()) as unknown as {
      info: Record<string, unknown>;
    };
    const outline = await Promise.all(
      ((await pdf.getOutline()) ?? []).map(async (item) => {
        const dest =
          typeof item.dest === 'string'
            ? await pdf.getDestination(item.dest)
            : item.dest;
        let page: number | null;
        try {
          page = dest ? await pdf.getPageIndex(dest[0]) : null;
        } catch {
          page = null; // points outside the page tree
        }
        return { title: item.title, page };
      }),
    );
    const fields: string[] = [];
    const links: { page: number; target: number | null }[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      for (const a of await (await pdf.getPage(i)).getAnnotations()) {
        if (a.subtype === 'Widget') fields.push(a.fieldName as string);
        if (a.subtype === 'Link' && Array.isArray(a.dest)) {
          let target: number | null;
          try {
            target = await pdf.getPageIndex(a.dest[0]);
          } catch {
            target = null;
          }
          links.push({ page: i - 1, target });
        }
      }
    }
    fields.sort();
    const destinations: string[] = [];
    for (const name of ['second', 'third'])
      if (await pdf.getDestination(name)) destinations.push(name);
    return {
      title: info.Title,
      author: info.Author,
      subject: info.Subject,
      keywords: info.Keywords,
      lang: info.Language,
      outline,
      fields,
      links,
      destinations,
      labels: await pdf.getPageLabels(),
    };
  } finally {
    await task.destroy();
  }
}

describe('applyPageEdits', () => {
  it('reorders, deletes and rotates in one pass', async () => {
    const src = await makeTextPdf({ pages: 3, label: 'O' });
    const { bytes: out } = await applyPageEdits(src, [
      { source: 2, rotate: 90 },
      { source: 0, rotate: 0 },
    ]);
    expect(await pdfPageTexts(out)).toEqual(['O 3', 'O 1']);
    expect(await rotations(out)).toEqual([90, 0]);
  });
  it('adds to existing rotation modulo 360', async () => {
    const { bytes: once } = await applyPageEdits(
      await makeTextPdf({ pages: 1 }),
      [{ source: 0, rotate: 270 }],
    );
    const { bytes: twice } = await applyPageEdits(once, [
      { source: 0, rotate: 180 },
    ]);
    expect(await rotations(twice)).toEqual([90]);
  });
  it('keeps metadata, bookmarks, form fields and language when reordering', async () => {
    const src = await makeStructuredPdf(3);
    const { bytes, notes } = await applyPageEdits(src, [
      { source: 2, rotate: 0 },
      { source: 0, rotate: 90 },
      { source: 1, rotate: 0 },
    ]);
    expect(await pdfPageTexts(bytes)).toEqual(['S 3', 'S 1', 'S 2']);
    const out = await inspect(bytes);
    expect(out).toMatchObject({
      title: 'Structured fixture',
      author: 'Fixture Author',
      subject: 'Fixture Subject',
      keywords: 'alpha beta',
      lang: 'en-GB',
      fields: ['first.name', 'last.page'],
    });
    const form = (await PDFDocument.load(bytes)).getForm();
    expect(form.getTextField('first.name').getText()).toBe('Ada');
    expect(form.getTextField('last.page').getText()).toBe('Zed');
    // Links follow their target pages too.
    expect(out.links).toEqual(
      expect.arrayContaining([
        { page: 1, target: 0 },
        { page: 1, target: 2 },
      ]),
    );
    expect(out.destinations).toEqual(['second', 'third']);
    // Bookmarks follow their pages to the new positions.
    expect(out.outline).toEqual([
      { title: 'Bookmark 1', page: 1 },
      { title: 'Bookmark 2', page: 2 },
      { title: 'Bookmark 3', page: 0 },
    ]);
    // Labels number by position, so they're dropped (and said so) on a move.
    expect(out.labels).toBeNull();
    expect(notes).toEqual([expect.stringMatching(/page labels were removed/i)]);
  });
  it('keeps page labels and reports nothing when only rotating', async () => {
    const src = await makeStructuredPdf(2);
    const { bytes, notes } = await applyPageEdits(src, [
      { source: 0, rotate: 90 },
      { source: 1, rotate: 0 },
    ]);
    expect((await inspect(bytes)).labels).toEqual(['i', 'ii']);
    expect(notes).toEqual([]);
  });
  it('drops fields and reports dead bookmarks for deleted pages, and removes their content', async () => {
    const src = await makeStructuredPdf(3);
    const { bytes, notes } = await applyPageEdits(src, [
      { source: 0, rotate: 0 },
      { source: 1, rotate: 0 },
    ]);
    const out = await inspect(bytes);
    expect(out.fields).toEqual(['first.name']);
    expect(out.outline).toEqual([
      { title: 'Bookmark 1', page: 0 },
      { title: 'Bookmark 2', page: 1 },
      { title: 'Bookmark 3', page: null },
    ]);
    expect(notes).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/1 form field .*removed/i),
        expect.stringMatching(/1 bookmark .*deleted page/i),
      ]),
    );
    // The deleted page's drawing is gone from the file, not just hidden.
    // Links and named destinations to the deleted page are removed (and
    // reported); the link to a kept page stays.
    expect(out.links).toEqual([{ page: 0, target: 1 }]);
    expect(out.destinations).toEqual(['second']);
    expect(notes).toEqual(
      expect.arrayContaining([
        '1 link to a deleted page was removed.',
        '1 named destination to a deleted page was removed.',
      ]),
    );
    const reloaded = await PDFDocument.load(bytes);
    expect(reloaded.getPageCount()).toBe(2);
    expect(
      reloaded
        .getForm()
        .getFields()
        .map((f) => f.getName()),
    ).toEqual(['first.name']);
    expect(bytes.byteLength).toBeLessThan(src.byteLength);
  });
  it.each([7, 1, 0])(
    'tolerates a wrong root /Count (%i) and keeps inherited attributes',
    async (count) => {
      const src = await makeBadCountPdf(3, count);
      const { bytes } = await applyPageEdits(src, [
        { source: 2, rotate: 0 },
        { source: 0, rotate: 90 },
      ]);
      expect(await pdfPageTexts(bytes)).toEqual(['C 3', 'C 1']);
      // Page 3 inherited /Rotate 90 from the intermediate node.
      expect(await rotations(bytes)).toEqual([90, 90]);
      const out = await PDFDocument.load(bytes);
      expect(out.catalog.Pages().Count().asNumber()).toBe(2);
    },
  );
  it('prunes the structure tree so deleted pages leave nothing behind', async () => {
    const src = await makeTaggedFormPdf();
    // A value can be stored literally, as ASCII hex, or as UTF-16BE hex.
    const forms = (s: string) => [
      s,
      Buffer.from(s).toString('hex').toUpperCase(),
      Buffer.from(s, 'utf16le').swap16().toString('hex').toUpperCase(),
    ];
    const contains = (text: string, s: string) =>
      forms(s).some((f) => text.toUpperCase().includes(f.toUpperCase()));
    // Sanity: the fixture really carries both values, in every place.
    const before = await decodedObjects(src);
    expect(contains(before, TAGGED_SECRET)).toBe(true);
    expect(contains(before, 'KeepMe')).toBe(true);

    const { bytes } = await applyPageEdits(src, [{ source: 0, rotate: 0 }]);
    const text = await decodedObjects(bytes);
    for (const f of forms(TAGGED_SECRET))
      expect(text.toUpperCase()).not.toContain(f.toUpperCase());
    expect(contains(text, 'KeepMe')).toBe(true);

    // The kept page's tags still work.
    const task = getDocument({ data: bytes.slice(), verbosity: 0 });
    try {
      const pdf = await task.promise;
      const tree = await (await pdf.getPage(1)).getStructTree();
      expect(JSON.stringify(tree)).toContain('"role":"P"');
    } finally {
      await task.destroy();
    }
    const out = await PDFDocument.load(bytes);
    expect(
      out
        .getForm()
        .getFields()
        .map((f) => f.getName()),
    ).toEqual(['keep']);
  });
  it('can repeat a page', async () => {
    const src = await makeTextPdf({ pages: 2, label: 'R' });
    const { bytes } = await applyPageEdits(src, [
      { source: 1, rotate: 0 },
      { source: 1, rotate: 90 },
    ]);
    expect(await pdfPageTexts(bytes)).toEqual(['R 2', 'R 2']);
    expect(await rotations(bytes)).toEqual([0, 90]);
  });
  it('rejects rotations that are not a multiple of 90°', async () => {
    const src = await makeTextPdf({ pages: 1 });
    await expect(
      applyPageEdits(src, [{ source: 0, rotate: 45 as never }]),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'Rotation must be a multiple of 90°',
    });
  });
  it('wraps in-place rebuild failures as INVALID_FILE', async () => {
    const src = await makeTextPdf({ pages: 2 });
    vi.spyOn(PDFDocument.prototype, 'save').mockRejectedValueOnce(
      new Error('Expected instance of PDFDict'),
    );
    await expect(
      applyPageEdits(src, [{ source: 1, rotate: 0 }]),
    ).rejects.toMatchObject({ code: 'INVALID_FILE' });
  });
  it('refuses to produce an empty document', async () => {
    await expect(
      applyPageEdits(await makeTextPdf({ pages: 1 }), []),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
