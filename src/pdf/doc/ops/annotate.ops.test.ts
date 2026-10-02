import { beforeAll, describe, expect, it } from 'vitest';
import { makeAnnotatedPdf } from '../../../../test/fixtures/annotated';
import { makeTextPdf } from '../../../../test/fixtures/builders';
import { toExistingAnnotations } from '../../render/annotations';
import { readAnnotations } from '../../edit/annot/test-helpers';
import { ALL_MATERIALIZERS } from '../materialize';
import { materialize } from '../materialize/materialize';
import { registerMaterializers } from '../materialize/registry';
import { summarizeChanges } from '../summary';
import { makeModel } from '../test-helpers';
import { currentAuthor, registerCoreOperations } from '.';
import type { NewOperation, OverlayItem } from '../types';

registerCoreOperations();
registerMaterializers(ALL_MATERIALIZERS);

const P0 = 'ckpt0:0';
const P1 = 'ckpt0:1';
const quad = [72, 720, 200, 720, 72, 700, 200, 700];
const who = { author: 'Me', color: '#ffd400' };

const ops = {
  highlight: {
    type: 'annot.markup',
    params: {
      id: 'a1',
      pageId: P0,
      subtype: 'Highlight',
      quads: [quad],
      opacity: 1,
      contents: '',
      ...who,
    },
  },
  underline: {
    type: 'annot.markup',
    params: {
      id: 'a2',
      pageId: P1,
      subtype: 'Underline',
      quads: [quad],
      opacity: 1,
      contents: '',
      ...who,
    },
  },
  note: {
    type: 'annot.note',
    params: {
      id: 'n1',
      pageId: P0,
      at: [300, 600],
      icon: 'Comment',
      contents: 'Why?',
      ...who,
    },
  },
  freetext: {
    type: 'annot.freetext',
    params: {
      id: 'f1',
      pageId: P0,
      rect: { x: 72, y: 500, width: 200, height: 40 },
      text: 'Typed',
      fontSize: 12,
      align: 'left',
      border: true,
      ...who,
    },
  },
  ink: {
    type: 'annot.ink',
    params: {
      id: 'i1',
      pageId: P0,
      strokes: [
        [
          [100, 100],
          [150, 150],
          [200, 100],
        ],
      ],
      width: 2,
      opacity: 1,
      ...who,
    },
  },
  rect: {
    type: 'annot.shape',
    params: {
      id: 's1',
      pageId: P0,
      kind: 'Square',
      rect: { x: 300, y: 300, width: 50, height: 50 },
      width: 2,
      fill: null,
      ...who,
    },
  },
  ellipse: {
    type: 'annot.shape',
    params: {
      id: 's2',
      pageId: P0,
      kind: 'Circle',
      rect: { x: 400, y: 300, width: 50, height: 50 },
      width: 2,
      fill: '#5fd068',
      ...who,
    },
  },
  arrow: {
    type: 'annot.line',
    params: {
      id: 'l1',
      pageId: P0,
      from: [100, 200],
      to: [200, 260],
      width: 2,
      arrowEnd: true,
      ...who,
    },
  },
  stamp: {
    type: 'annot.stamp',
    params: {
      id: 't1',
      pageId: P0,
      rect: { x: 300, y: 400, width: 150, height: 40 },
      preset: 'Approved',
      ...who,
    },
  },
} satisfies Record<string, NewOperation>;

describe('annotate ops', () => {
  it('labels name the page', () => {
    const model = makeModel();
    const labels = Object.values(ops).map((o) => model.dispatch(o)[0].label);
    expect(labels).toEqual([
      'Highlight text on page 1',
      'Underline text on page 2',
      'Add note on page 1',
      'Add text comment on page 1',
      'Draw on page 1',
      'Add rectangle on page 1',
      'Add ellipse on page 1',
      'Add arrow on page 1',
      'Add Approved stamp on page 1',
    ]);
  });

  it('summarises one clause per kind', () => {
    const model = makeModel();
    for (const o of Object.values(ops)) model.dispatch(o);
    model.dispatch({
      ...ops.highlight,
      params: { ...ops.highlight.params, id: 'a3' },
    });
    const [s] = summarizeChanges(model.getState(), model.getView());
    expect(s.mode).toBe('annotate');
    expect(s.lines).toEqual([
      '2 highlights, 1 underline',
      '1 note',
      '1 text comment',
      '1 drawing',
      '1 rectangle, 1 ellipse',
      '1 arrow',
      '1 stamp',
    ]);
  });

  it('replies are labelled and counted as replies', () => {
    const model = makeModel();
    const [parent] = model.dispatch(ops.note);
    const [reply] = model.dispatch({
      type: 'annot.note',
      params: {
        ...ops.note.params,
        id: 'n2',
        replyTo: { kind: 'pending', id: parent.id },
      },
    });
    expect(reply.label).toBe('Reply to note on page 1');
    expect(
      summarizeChanges(model.getState(), model.getView())[0].lines,
    ).toEqual(['1 note, 1 reply']);
  });

  it('deleting a pending annotation hides it (and its replies) and is not a change', () => {
    const model = makeModel();
    const [parent] = model.dispatch(ops.note);
    const [reply] = model.dispatch({
      type: 'annot.note',
      params: {
        ...ops.note.params,
        id: 'n2',
        replyTo: { kind: 'pending', id: parent.id },
      },
    });
    const [del] = model.dispatch({
      type: 'annot.delete',
      params: { pageId: P0, target: { kind: 'pending', id: parent.id } },
    });
    expect(del.label).toBe('Delete annotation on page 1');
    const view = model.getView();
    expect(view.hidden.has(parent.id)).toBe(true);
    expect(view.hidden.has(reply.id)).toBe(true);
    expect(summarizeChanges(model.getState(), view)).toEqual([]);
    expect(() =>
      model.dispatch({
        type: 'annot.delete',
        params: { pageId: P0, target: { kind: 'pending', id: parent.id } },
      }),
    ).toThrow(/no longer exists/);
  });

  it('editing a pending annotation patches it in the view', () => {
    const model = makeModel();
    const [shape] = model.dispatch(ops.rect);
    model.dispatch({
      type: 'annot.update',
      params: {
        pageId: P0,
        target: { kind: 'pending', id: shape.id },
        patch: { color: '#FF0000', rect: { x: 1, y: 2, width: 3, height: 4 } },
      },
    });
    const item = model
      .getView()
      .overlays.get(P0)!
      .find((o) => o.opId === shape.id)!;
    expect(item.params).toMatchObject({
      color: '#ff0000',
      rect: { x: 1, y: 2, width: 3, height: 4 },
    });
    expect(
      summarizeChanges(model.getState(), model.getView())[0].lines,
    ).toEqual(['1 rectangle']);
  });

  it('existing annotations: delete and edit are counted', () => {
    const model = makeModel();
    const target = { kind: 'existing', ref: '12R', nm: null, index: 3 };
    model.dispatch({ type: 'annot.delete', params: { pageId: P0, target } });
    model.dispatch({
      type: 'annot.update',
      params: {
        pageId: P1,
        target: { ...target, ref: '13R' },
        patch: { color: '#000000' },
      },
    });
    expect(
      summarizeChanges(model.getState(), model.getView())[0].lines,
    ).toEqual(['1 annotation deleted', '1 annotation edited']);
  });

  it('the author op changes the default for later annotations', () => {
    const model = makeModel();
    expect(currentAuthor(model.getView())).toBe('Me');
    const [op] = model.dispatch({
      type: 'annot.author',
      params: { name: ' Ann ' },
    });
    expect(op.label).toBe('Set comment author to Ann');
    expect(currentAuthor(model.getView())).toBe('Ann');
    model.undo();
    expect(currentAuthor(model.getView())).toBe('Me');
  });

  it('refuses bad input', () => {
    const model = makeModel();
    expect(() =>
      model.dispatch({
        ...ops.highlight,
        params: { ...ops.highlight.params, quads: [] },
      }),
    ).toThrow(/select some text/);
    expect(() =>
      model.dispatch({
        ...ops.rect,
        params: { ...ops.rect.params, color: 'red' },
      }),
    ).toThrow(/colour/);
    expect(() =>
      model.dispatch({
        ...ops.note,
        params: { ...ops.note.params, pageId: 'gone' },
      }),
    ).toThrow(/no longer exists/);
  });
});

describe('annotate materialisers', () => {
  let text3: Uint8Array;
  let annotated: Uint8Array;
  beforeAll(async () => {
    text3 = await makeTextPdf({ pages: 3, label: 'Alpha' });
    annotated = await makeAnnotatedPdf();
  });
  const rpc = () => ({
    signal: new AbortController().signal,
    progress: () => {},
  });
  const plan = (base: Uint8Array, pages: number, overlays: OverlayItem[]) => ({
    base,
    baseSourceId: 's0',
    sources: {},
    assets: {},
    pages: Array.from({ length: pages }, (_, i) => ({
      id: `ckpt0:${i}`,
      source: 's0',
      index: i,
      rotate: 0 as const,
    })),
    pageLabels: null,
    overlays,
  });
  const itemsOf = (model: ReturnType<typeof makeModel>) => {
    const v = model.getView();
    return [...v.overlays.values()].flat().filter((o) => !v.hidden.has(o.opId));
  };

  it('writes every annotation kind, with replies linked', async () => {
    const model = makeModel();
    for (const o of Object.values(ops)) model.dispatch(o);
    const parent = model.getState().log[2];
    model.dispatch({
      type: 'annot.note',
      params: {
        ...ops.note.params,
        id: 'n2',
        replyTo: { kind: 'pending', id: parent.id },
      },
    });
    const out = await materialize(plan(text3, 3, itemsOf(model)), rpc());
    const page1 = toExistingAnnotations(await readAnnotations(out.bytes, 0));
    expect(page1.map((a) => a.subtype).sort()).toEqual(
      [
        'Circle',
        'FreeText',
        'Highlight',
        'Ink',
        'Line',
        'Square',
        'Stamp',
        'Text',
        'Text',
      ].sort(),
    );
    const notes = page1.filter((a) => a.subtype === 'Text');
    expect(notes[1].inReplyTo).toBe(notes[0].ref);
    const page2 = toExistingAnnotations(await readAnnotations(out.bytes, 1));
    expect(page2.map((a) => a.subtype)).toEqual(['Underline']);
  });

  it('deletes and edits existing annotations; missing ones are reported', async () => {
    const existing = toExistingAnnotations(await readAnnotations(annotated, 0));
    const sq = existing.find((a) => a.subtype === 'Square')!;
    const circle = existing.find((a) => a.subtype === 'Circle')!;
    const model = makeModel();
    model.dispatch({
      type: 'annot.delete',
      params: {
        pageId: P0,
        target: {
          kind: 'existing',
          ref: circle.ref,
          nm: null,
          index: circle.index,
        },
      },
    });
    model.dispatch({
      type: 'annot.update',
      params: {
        pageId: P0,
        target: { kind: 'existing', ref: sq.ref, nm: null, index: sq.index },
        patch: { color: '#ff0000' },
      },
    });
    model.dispatch({
      type: 'annot.delete',
      params: {
        pageId: P1,
        target: { kind: 'existing', ref: '999R', nm: null, index: 40 },
      },
    });
    const out = await materialize(plan(annotated, 2, itemsOf(model)), rpc());
    const after = toExistingAnnotations(await readAnnotations(out.bytes, 0));
    expect(after).toHaveLength(existing.length - 1);
    expect(after.some((a) => a.subtype === 'Circle')).toBe(false);
    expect(after.find((a) => a.subtype === 'Square')!.color).toBe('#ff0000');
    expect(after.some((a) => a.subtype === 'Link')).toBe(true);
    const raw = await readAnnotations(out.bytes, 0);
    expect(raw.some((a) => a.subtype === 'Widget')).toBe(true);
    expect(out.notes).toContain(
      'An annotation to delete was no longer on page 2',
    );
  });

  it('finds an existing annotation on a duplicated page by position', async () => {
    const existing = toExistingAnnotations(await readAnnotations(annotated, 1));
    const sq = existing[0];
    const model = makeModel();
    model.dispatch({
      type: 'annot.update',
      params: {
        pageId: P0,
        target: { kind: 'existing', ref: sq.ref, nm: null, index: sq.index },
        patch: { contents: 'Copied page box' },
      },
    });
    const items = itemsOf(model);
    const p = plan(annotated, 1, items);
    // Page 2 shown twice: the copy has new annotation refs.
    p.pages = [
      { id: 'ckpt0:1', source: 's0', index: 1, rotate: 0 },
      { id: P0, source: 's0', index: 1, rotate: 0 },
    ];
    const out = await materialize(p, rpc());
    const copy = toExistingAnnotations(await readAnnotations(out.bytes, 1));
    expect(copy[0].contents).toBe('Copied page box');
    expect(out.notes.join(' ')).not.toMatch(/no longer/);
  });
});
