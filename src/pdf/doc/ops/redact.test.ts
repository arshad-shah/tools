import { describe, expect, it } from 'vitest';
import { makeModel } from '../test-helpers';
import { registerOperations } from '../registry';
import { registerCoreOperations } from '.';
import { applyRedactions } from './redact';

registerCoreOperations();
registerOperations([applyRedactions]);

const mark = (pageId: string) => ({
  type: 'redact.mark',
  params: {
    id: 'm1',
    pageId,
    rects: [{ x: 10, y: 10, width: 50, height: 12 }],
    source: { kind: 'area' },
    fill: '#000000',
    overlayText: null,
  },
});

describe('redact ops', () => {
  it('adds a mark to the page overlays with a label', () => {
    const model = makeModel();
    const pageId = model.getView().pages[1].id;
    const [op] = model.dispatch(mark(pageId));
    expect(op.label).toBe('Mark area for redaction on page 2');
    expect(model.getView().overlays.get(pageId)).toHaveLength(1);
  });

  it('rejects a bad fill and an empty mark', () => {
    const model = makeModel();
    const pageId = model.getView().pages[0].id;
    const bad = mark(pageId);
    (bad.params as { fill: string }).fill = 'black';
    expect(() => model.dispatch(bad)).toThrow('bad fill colour');
    const empty = mark(pageId);
    (empty.params as { rects: unknown[] }).rects = [];
    expect(() => model.dispatch(empty)).toThrow('expected areas');
  });

  it('refuses to dispatch the apply checkpoint', () => {
    const model = makeModel();
    expect(() =>
      model.dispatch({ type: 'redact.apply', params: { dpi: 200 } }),
    ).toThrow('Checkpoints run through runCheckpoint');
  });
});
