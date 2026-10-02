import { describe, expect, it } from 'vitest';
import {
  loadPageInputs,
  makeFlatFormWord,
  PDFJS_OPS,
} from '../../../test/fixtures/flat-form';
import {
  makeSigFieldPdf,
  makeSignatureLinePdf,
  SIG_FIELD_NAME,
  SIG_FIELD_RECT,
  SIGNATURE_LINE,
} from '../../../test/fixtures/sig-field';
import { listFormWidgets } from '@/pdf/edit/forms';
import { buildCells } from './cells';
import { extractGeometry } from './geometry';
import { normaliseLines } from './segments';
import { findSignTargets, sigFieldTargets } from './sign-targets';
import { geometry, gridSegs, run } from './test-helpers';
import type { PageGeometry } from './types';

function targetsOf(geom: PageGeometry, pageIndex = 0) {
  const lines = normaliseLines(geom.segments, geom.rects);
  return findSignTargets(geom, lines, buildCells(lines).cells, pageIndex);
}

async function pdfTargets(bytes: Uint8Array, pageIndex: number) {
  const p = (await loadPageInputs(bytes))[pageIndex];
  return targetsOf(
    extractGeometry(p.list, PDFJS_OPS, p.text, p.fontNames, p.fonts),
    pageIndex,
  );
}

describe('findSignTargets', () => {
  it('finds the signature and date leaders on the flat form lines page', async () => {
    const { bytes, truth } = await makeFlatFormWord();
    const targets = await pdfTargets(bytes, 2);
    expect(targets.map((t) => [t.kind, t.label, t.source])).toEqual([
      ['signature', 'Signature', 'underscore'],
      ['date', 'Date', 'underscore'],
    ]);
    for (const t of targets) {
      const want = truth.find((f) => f.page === 2 && f.label === t.label)!;
      expect(t.pageIndex).toBe(2);
      // Within a point: leader rects come from proportional advances.
      for (const k of ['x', 'y', 'width'] as const)
        expect(Math.abs(t.rect[k] - want.rect[k])).toBeLessThan(1);
    }
  });

  it('finds a ruled line directly below a signature label', async () => {
    const [t, ...rest] = await pdfTargets(await makeSignatureLinePdf(), 0);
    expect(rest).toEqual([]);
    expect(t).toMatchObject({
      kind: 'signature',
      label: 'Signature of applicant',
      source: 'line',
      pageIndex: 0,
    });
    expect(t.rect.x).toBeCloseTo(SIGNATURE_LINE.x1, 0);
    expect(t.rect.y).toBeCloseTo(SIGNATURE_LINE.y, 0);
    expect(t.rect.width).toBeCloseTo(SIGNATURE_LINE.x2 - SIGNATURE_LINE.x1, 0);
  });

  it('takes a ruled line to the right on the same band', () => {
    const geom = geometry({
      runs: [run('Initials', 72, 500)],
      segments: [{ x1: 140, y1: 498, x2: 220, y2: 498 }],
    });
    const [t] = targetsOf(geom);
    expect(t).toMatchObject({
      kind: 'initials',
      label: 'Initials',
      source: 'line',
      rect: { x: 140, y: 498, width: 80 },
    });
  });

  it('takes an empty table cell to the right of a label cell', () => {
    const geom = geometry({
      segments: gridSegs([56, 216, 556], [600, 640]),
      runs: [run('Signed', 60, 615)],
    });
    const [t, ...rest] = targetsOf(geom);
    expect(rest).toEqual([]);
    expect(t).toMatchObject({
      kind: 'signature',
      source: 'cell',
      label: 'Signed',
      rect: { x: 216, y: 600, width: 340, height: 40 },
    });
  });

  it('ignores labels with nothing to sign on, dates of birth and prose', () => {
    const geom = geometry({
      runs: [
        run('Signature', 72, 700),
        run('Date of birth: ________', 72, 650),
        run(
          'Your signature confirms that the answers given above are all true: ______',
          72,
          600,
          8,
        ),
      ],
    });
    expect(targetsOf(geom)).toEqual([]);
  });

  it('gives one target per label and never shares a place between labels', () => {
    const geom = geometry({
      runs: [run('Signature', 72, 500), run('Date', 72, 487)],
      segments: [{ x1: 100, y1: 488, x2: 300, y2: 488 }],
    });
    const targets = targetsOf(geom);
    expect(targets).toHaveLength(1);
    expect(targets[0].label).toBe('Signature');
  });

  it('records the free room above the place as the line gap', () => {
    const geom = geometry({
      runs: [run('Name: ______', 72, 540), run('Signature: ______', 72, 500)],
    });
    const [t] = targetsOf(geom);
    expect(t.lineGap).toBeCloseTo(540 - 0.207 * 12 - (500 - 1), 1);
  });
});

describe('sigFieldTargets', () => {
  it('returns the exact rect of an empty /Sig field', async () => {
    const widgets = await listFormWidgets(await makeSigFieldPdf());
    expect(sigFieldTargets(widgets)).toEqual([
      {
        id: `sig:${SIG_FIELD_NAME}:0:0`,
        pageIndex: 0,
        kind: 'signature',
        rect: SIG_FIELD_RECT,
        label: SIG_FIELD_NAME,
        source: 'sig-field',
        fieldName: SIG_FIELD_NAME,
      },
    ]);
  });

  it('leaves signed fields to the verifier', async () => {
    const widgets = await listFormWidgets(
      await makeSigFieldPdf({ signed: true }),
    );
    expect(sigFieldTargets(widgets)).toEqual([]);
  });

  it('uses the field label and spots initials fields', () => {
    const [t] = sigFieldTargets([
      {
        fieldName: 'f1',
        label: 'Initials here',
        kind: 'signature',
        signed: false,
        pageIndex: 2,
        rect: { x: 1, y: 2, width: 30, height: 20 },
      },
      {
        fieldName: 'name',
        kind: 'text',
        signed: false,
        pageIndex: 2,
        rect: { x: 1, y: 2, width: 30, height: 20 },
      },
    ]);
    expect(t).toMatchObject({ kind: 'initials', label: 'Initials here' });
  });
});
