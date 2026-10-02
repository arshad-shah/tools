/** @vitest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { DocumentApi } from '../types';
import { useRestoredPreviews } from './restored-previews';
import { fillSign } from './store';

beforeAll(() => registerCoreOperations());
beforeEach(() => fillSign.reset());

const PNG = new Uint8Array([137, 80, 78, 71]);

function docWith() {
  const model = makeModel();
  model.dispatch([
    {
      type: 'sign.place',
      params: {
        id: 's1',
        pageId: 'ckpt0:0',
        rect: { x: 10, y: 10, width: 120, height: 40 },
        rotate: 0,
        role: 'signature',
        content: { kind: 'image', assetId: 'a1', mime: 'image/png' },
      },
    },
    {
      type: 'sign.place',
      params: {
        id: 's2',
        pageId: 'ckpt0:0',
        rect: { x: 10, y: 100, width: 120, height: 40 },
        rotate: 0,
        role: 'initials',
        content: {
          kind: 'text',
          text: 'JD',
          fontId: 'caveat',
          fontAsset: 'f1',
          color: '#112233',
        },
      },
    },
  ]);
  const assetBytes = vi.fn(async () => PNG);
  return {
    doc: {
      view: model.getView(),
      state: model.getState(),
      assetBytes,
    } as unknown as DocumentApi,
    assetBytes,
  };
}

describe('useRestoredPreviews', () => {
  it('previews signatures placed before a reload from their stored assets', async () => {
    const { doc, assetBytes } = docWith();
    renderHook(() => useRestoredPreviews(doc));
    await waitFor(() => expect(fillSign.get().previews.a1).toBeDefined());
    expect(fillSign.get().previews.a1).toEqual({
      kind: 'image',
      bytes: PNG,
      mime: 'image/png',
    });
    expect(assetBytes).toHaveBeenCalledWith('a1');
    expect(fillSign.get().previews.f1).toEqual({
      kind: 'text',
      text: 'JD',
      family: 'Sign Caveat',
      color: '#112233',
    });
  });

  it('leaves previews made this session alone', async () => {
    const { doc, assetBytes } = docWith();
    const mine = {
      kind: 'image' as const,
      bytes: PNG,
      mime: 'image/png' as const,
    };
    fillSign.set({ previews: { a1: mine } });
    renderHook(() => useRestoredPreviews(doc));
    await waitFor(() => expect(fillSign.get().previews.f1).toBeDefined());
    expect(assetBytes).not.toHaveBeenCalled();
    expect(fillSign.get().previews.a1).toBe(mine);
  });
});
