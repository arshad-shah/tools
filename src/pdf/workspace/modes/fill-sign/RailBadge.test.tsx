/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mergeDetection } from '@/pdf/doc/detection';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { DocumentApi } from '../types';
import { FillSignRailBadge } from './RailBadge';
import { fillSign } from './store';

beforeAll(() => registerCoreOperations());
beforeEach(() => fillSign.reset());

const doc = (skipped: 'too-complex' | null, fields = 0) => {
  const model = makeModel();
  model.setDetection(
    mergeDetection(undefined, 's0', {
      pageIndex: 0,
      skipped,
      ms: 1,
      fields: Array.from({ length: fields }, (_, i) => ({
        id: `f${i}`,
        pageIndex: 0,
        rect: { x: 10, y: 100 * i, width: 100, height: 20 },
        type: 'text' as const,
        label: null,
        autofill: null,
        confidence: 0.9,
        status: 'field' as const,
        source: 'cell' as const,
      })),
    }),
  );
  return {
    view: model.getView(),
    state: model.getState(),
  } as unknown as DocumentApi;
};

describe('FillSignRailBadge', () => {
  it('says when a page was too complex to detect', () => {
    const d = doc('too-complex');
    render(<FillSignRailBadge page={d.view.pages[0]} doc={d} />);
    expect(screen.getByText('No detection: page too complex')).toBeTruthy();
  });

  it('counts the empty fields left', () => {
    const d = doc(null, 3);
    render(<FillSignRailBadge page={d.view.pages[0]} doc={d} />);
    expect(screen.getByText('3 fields left')).toBeTruthy();
  });

  it('reports a page whose detection failed', () => {
    const d = doc(null);
    fillSign.set({ crashed: new Set(['s0:0']) });
    render(<FillSignRailBadge page={d.view.pages[0]} doc={d} />);
    expect(screen.getByText('Detection failed on this page')).toBeTruthy();
  });
});
