import { beforeAll, describe, expect, it } from 'vitest';
import { makeMetadataPdf } from '../../../../test/fixtures/builders';
import { getMetadata } from '@/pdf/edit/metadata';
import type { MetaSetParams } from '../ops/protect';
import type { OverlayItem } from '../types';
import { materialize, type MaterializePlan } from './materialize';
import { PROTECT_MATERIALIZERS } from './protect';
import { registerMaterializers } from './registry';

const ctx = () => ({
  signal: new AbortController().signal,
  progress: () => {},
});

let base: Uint8Array;
beforeAll(async () => {
  base = await makeMetadataPdf();
  registerMaterializers(PROTECT_MATERIALIZERS);
});

const item = (opId: string, params: MetaSetParams): OverlayItem => ({
  opId,
  type: 'meta.set',
  pageId: null,
  params,
});
const plan = (overlays: OverlayItem[]): MaterializePlan => ({
  base,
  baseSourceId: 's0',
  sources: {},
  assets: {},
  pages: [{ id: 'c:0', source: 's0', index: 0, rotate: 0 }],
  pageLabels: null,
  overlays,
});

describe('meta.set writer', () => {
  it('materialises the patch: getMetadata reads it', async () => {
    const out = await materialize(
      plan([
        item('a', { patch: { title: 'First' } }),
        item('b', { patch: { title: 'Board pack', author: '' } }),
      ]),
      ctx(),
    );
    expect(await getMetadata(out.bytes)).toMatchObject({
      title: 'Board pack',
      author: '',
      subject: 'Numbers',
      hasXmp: true,
    });
  });

  it('remove all drops Info and XMP, then applies later changes', async () => {
    const cleared = await materialize(
      plan([item('a', { patch: {}, removeAll: true })]),
      ctx(),
    );
    expect(await getMetadata(cleared.bytes)).toMatchObject({
      title: '',
      producer: '',
      creationDate: null,
      modificationDate: null,
      hasXmp: false,
    });
    const then = await materialize(
      plan([
        item('a', { patch: {}, removeAll: true }),
        item('b', { patch: { author: 'Ada' } }),
      ]),
      ctx(),
    );
    expect(await getMetadata(then.bytes)).toMatchObject({
      title: '',
      author: 'Ada',
    });
  });
});
