import { describe, expect, it } from 'vitest';
import { buildCells } from './cells';
import { classify, dedupeAgainstWidgets, isFlatForm } from './classify';
import { normaliseLines } from './segments';
import { geometry, gridSegs, rowBaseline, run } from './test-helpers';
import type {
  DetectedField,
  PageDetection,
  PageGeometry,
  RectShape,
  Seg,
} from './types';

function detect(geom: PageGeometry): DetectedField[] {
  const lines = normaliseLines(geom.segments, geom.rects);
  const { cells, squares, combs } = buildCells(lines);
  return classify(geom, lines, cells, squares, 3, combs);
}
const fields = (geom: PageGeometry) =>
  detect(geom).filter((f) => f.status === 'field');
const square = (x: number, y: number): RectShape => ({
  x,
  y,
  w: 10,
  h: 10,
  filled: false,
  stroked: true,
  fill: null,
  alpha: 1,
});
const rule = (x1: number, x2: number, y: number): Seg => ({
  x1,
  y1: y,
  x2,
  y2: y,
});

describe('classify: labels', () => {
  it('prefers the label cell on the left over text above', () => {
    const found = detect(
      geometry({
        segments: gridSegs([50, 210, 550], [600, 622]),
        runs: [
          run('Surname', 54, rowBaseline(600, 22)),
          run('Applicant section', 250, 630),
        ],
      }),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      label: 'Surname',
      autofill: 'surname',
      type: 'text',
      status: 'field',
      source: 'cell',
      pageIndex: 3,
      table: 0,
      row: 0,
      col: 1,
    });
    expect(found[0].id).toBe('3:cell:212:602');
    expect(found[0].confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('uses the column header when there is no label on the left', () => {
    const ys = [500, 522, 544, 566];
    const found = fields(
      geometry({
        segments: gridSegs([50, 200, 350], ys),
        runs: [
          run('Name', 54, rowBaseline(544, 22)),
          run('Phone', 204, rowBaseline(544, 22)),
        ],
      }),
    );
    expect(found).toHaveLength(4);
    expect(found.map((f) => f.label)).toEqual([
      'Name',
      'Phone',
      'Name',
      'Phone',
    ]);
    expect(found.map((f) => f.autofill)).toEqual([
      'fullName',
      'phone',
      'fullName',
      'phone',
    ]);
    expect(found.every((f) => f.confidence === 1)).toBe(true);
  });

  it('labels a checkbox with the nearest text to its right on the same line', () => {
    const found = fields(
      geometry({
        rects: [square(100, 500)],
        runs: [run('Other', 114, 530), run('Yes', 114, 501)],
      }),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      type: 'tick',
      label: 'Yes',
      source: 'checkbox-vector',
    });
    expect(found[0].rect).toEqual({ x: 101, y: 501, width: 8, height: 8 });
  });

  it('marks a checked glyph box as pre-checked', () => {
    const box = run(
      String.fromCodePoint(0x2612),
      100,
      400,
      12,
      'NotoSansSymbols2-Regular',
    );
    const found = fields(geometry({ runs: [box, run('I agree', 114, 400)] }));
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      type: 'tick',
      label: 'I agree',
      prechecked: true,
    });
  });

  it('gives a merged label cell to every row it spans, numbering addresses', () => {
    // "Address" spans rows 322..388 on the left; the town row is 300..322.
    const segs: Seg[] = [
      rule(50, 550, 388),
      rule(210, 550, 366),
      rule(210, 550, 344),
      rule(50, 550, 322),
      rule(50, 550, 300),
      ...[50, 210, 550].map((x) => ({ x1: x, y1: 300, x2: x, y2: 388 })),
    ];
    const found = fields(
      geometry({
        segments: segs,
        runs: [
          run('Address', 54, rowBaseline(322, 66)),
          run('Town', 54, rowBaseline(300, 22)),
        ],
      }),
    );
    expect(found.map((f) => f.label)).toEqual([
      'Address',
      'Address',
      'Address',
      'Town',
    ]);
    expect(found.map((f) => f.autofill)).toEqual([
      'address1',
      'address2',
      'address3',
      'town',
    ]);
  });
});

describe('classify: trailing space', () => {
  it('suggests the space after a prompt in a wide cell', () => {
    const found = detect(
      geometry({
        segments: gridSegs([50, 450], [300, 322]),
        runs: [run('Name:', 54, rowBaseline(300, 22))],
      }),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      source: 'trailing',
      label: 'Name',
      status: 'suggested',
    });
  });

  it('ignores slack after left-aligned data in a row that continues', () => {
    const found = detect(
      geometry({
        segments: gridSegs([50, 250, 450], [300, 322]),
        runs: [
          run('North', 54, rowBaseline(300, 22)),
          run('Rising', 254, rowBaseline(300, 22)),
        ],
      }),
    );
    // Only the last column can hold trailing space without a prompt.
    expect(found.map((f) => f.label)).toEqual(['Rising']);
  });
});

describe('classify: types and sources', () => {
  it('infers date, signature, multiline and text', () => {
    const found = fields(
      geometry({
        segments: [
          ...gridSegs([50, 210, 550], [600, 622]),
          ...gridSegs([50, 210, 550], [400, 520]),
          rule(120, 320, 200),
        ],
        runs: [
          run('Date of birth', 54, rowBaseline(600, 22)),
          run('Details', 54, 505),
          run('Signature: ______', 50, 300),
          run('Date: __/__/____', 50, 260),
          run('Sign here', 50, 202),
          run('Name: ________', 50, 150),
        ],
      }),
    );
    const byLabel = Object.fromEntries(found.map((f) => [f.label, f]));
    expect(byLabel['Date of birth']).toMatchObject({
      type: 'date',
      autofill: 'dob',
    });
    expect(byLabel['Details']).toMatchObject({
      type: 'multiline',
      source: 'cell',
    });
    expect(byLabel['Signature']).toMatchObject({
      type: 'signature',
      source: 'underscore',
    });
    expect(byLabel['Date']).toMatchObject({ type: 'date', source: 'date' });
    expect(byLabel['Sign here']).toMatchObject({
      type: 'signature',
      source: 'ruled',
    });
    expect(byLabel['Name']).toMatchObject({
      type: 'text',
      autofill: 'fullName',
    });
    expect(found).toHaveLength(6);
  });

  it('lowers confidence of empty cells in a header row', () => {
    const found = fields(
      geometry({
        segments: gridSegs([50, 200, 450], [300, 322, 344]),
        runs: [
          run('Details', 54, rowBaseline(322, 22)),
          run('Name', 54, rowBaseline(300, 22)),
        ],
      }),
    );
    expect(found).toHaveLength(2);
    const [head, body] = found;
    expect(head.row).toBe(0);
    expect(head.confidence).toBeLessThan(body.confidence);
  });

  it('finds nothing in a table full of data', () => {
    expect(
      detect(
        geometry({
          segments: gridSegs([50, 130, 210], [300, 322, 344]),
          runs: [
            run('Region', 54, rowBaseline(322, 22)),
            run('Total', 134, rowBaseline(322, 22)),
            run('North', 54, rowBaseline(300, 22)),
            run('1200', 134, rowBaseline(300, 22)),
          ],
        }),
      ).filter((f) => f.status === 'field'),
    ).toEqual([]);
  });
});

const field = (
  pageIndex: number,
  x: number,
  confidence = 0.9,
): DetectedField => ({
  id: `${pageIndex}:cell:${x}:0`,
  pageIndex,
  rect: { x, y: 0, width: 100, height: 20 },
  type: 'text',
  label: null,
  autofill: null,
  confidence,
  status: confidence >= 0.7 ? 'field' : 'suggested',
  source: 'cell',
});

describe('dedupeAgainstWidgets', () => {
  it('drops detections overlapping a widget on the same page', () => {
    const kept = dedupeAgainstWidgets(
      [field(0, 0), field(0, 300), field(1, 0)],
      [{ pageIndex: 0, rect: { x: 10, y: 0, width: 100, height: 20 } }],
    );
    expect(kept.map((f) => f.id)).toEqual(['0:cell:300:0', '1:cell:0:0']);
  });
});

describe('isFlatForm', () => {
  const page = (pageIndex: number, n: number, c = 0.9): PageDetection => ({
    pageIndex,
    fields: Array.from({ length: n }, (_, i) => field(pageIndex, i * 200, c)),
    skipped: null,
    ms: 1,
  });
  it('needs five fields, or three on each of two pages, and no AcroForm', () => {
    expect(isFlatForm([page(0, 5)], false)).toBe(true);
    expect(isFlatForm([page(0, 4)], false)).toBe(false);
    expect(isFlatForm([page(0, 3), page(1, 3)], false)).toBe(true);
    expect(isFlatForm([page(0, 5)], true)).toBe(false);
    expect(isFlatForm([page(0, 9, 0.6)], false)).toBe(false);
  });
});

/** A label cell 50..190 and `n` 14 x 18 boxes from 190 (each its own grid). */
function boxRowSegs(lefts: number[], y = 600): Seg[] {
  return [
    ...gridSegs([50, 190], [y, y + 18]),
    ...lefts.flatMap((x) => gridSegs([x, x + 14], [y, y + 18])),
  ];
}
const lefts = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => from + i * 14);
const fill = (
  x: number,
  y: number,
  w: number,
  h: number,
  colour: string,
): RectShape => ({
  x,
  y,
  w,
  h,
  filled: true,
  stroked: false,
  fill: colour,
  alpha: 1,
});

describe('classify: character boxes', () => {
  it('makes one labelled comb text field of a run of boxes', () => {
    const found = detect(
      geometry({
        segments: boxRowSegs(lefts(190, 20)),
        runs: [run('Surname', 54, rowBaseline(600, 18))],
      }),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      source: 'comb',
      type: 'text',
      label: 'Surname',
      autofill: 'surname',
      cellCount: 20,
      status: 'field',
      rect: { x: 190, width: 280 },
    });
  });

  it('makes dd/mm/yyyy box groups one date field of 10 cells', () => {
    const boxes = [...lefts(190, 2), ...lefts(232, 2), ...lefts(274, 4)];
    const found = detect(
      geometry({
        segments: boxRowSegs(boxes),
        runs: [
          run('Date of birth', 54, rowBaseline(600, 18)),
          run('/', 220, rowBaseline(600, 18)),
          run('/', 262, rowBaseline(600, 18)),
        ],
      }),
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      type: 'date',
      cellCount: 10,
      label: 'Date of birth',
    });
  });

  it('types eight plain boxes as text even under a date label', () => {
    const found = detect(
      geometry({
        segments: boxRowSegs(lefts(190, 8)),
        runs: [run('Date', 54, rowBaseline(600, 18))],
      }),
    );
    expect(found[0]).toMatchObject({ type: 'text', cellCount: 8 });
  });

  it('ignores boxes with text printed in them', () => {
    const found = detect(
      geometry({
        segments: boxRowSegs(lefts(190, 4)),
        runs: [
          run('Office code', 54, rowBaseline(600, 18)),
          run('A', 193, rowBaseline(600, 18)),
        ],
      }),
    );
    expect(found).toEqual([]);
  });
});

describe('classify: decoration', () => {
  it('ignores an empty cell under a shaded band, and the rule beneath it', () => {
    const found = detect(
      geometry({
        segments: [...gridSegs([50, 550], [700, 712]), rule(50, 550, 696)],
        rects: [fill(50, 700, 500, 12, '#0d5466')],
      }),
    );
    expect(found).toEqual([]);
  });

  it('keeps an empty cell with near-white shading', () => {
    const found = detect(
      geometry({
        segments: gridSegs([50, 210, 550], [600, 622]),
        rects: [fill(210, 600, 340, 22, '#f2f2f2')],
        runs: [run('Surname', 54, rowBaseline(600, 22))],
      }),
    );
    expect(found).toHaveLength(1);
  });

  it('offers no write-in after a heading in a header rectangle', () => {
    const found = detect(
      geometry({
        segments: gridSegs([50, 550], [700, 740]),
        runs: [
          run('Part A: About you', 54, 715, 14),
          ...['one', 'two', 'three'].map((w, i) =>
            run(w, 54, 600 - i * 14, 10),
          ),
        ],
      }),
    );
    expect(found.filter((f) => f.source === 'trailing')).toEqual([]);
  });

  it('offers no write-in after a checkbox label', () => {
    const found = detect(
      geometry({
        segments: gridSegs([50, 62, 400], [600, 612]),
        runs: [run('No', 66, 602, 10)],
      }),
    );
    expect(found.map((f) => f.type)).toEqual(['tick']);
  });
});
