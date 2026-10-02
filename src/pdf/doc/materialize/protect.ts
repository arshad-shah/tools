import { applyMetadataPatch, stripMetadataInPlace } from '@/pdf/edit/metadata';
import type { MetaSetParams } from '../ops/protect';
import { defineMaterializer, type Materializer } from './registry';

/** `meta.set`: document properties, written last (phase 'metadata'). */
export const metaSetWriter = defineMaterializer<MetaSetParams>({
  type: 'meta.set',
  phase: 'metadata',
  apply(ctx, p) {
    if (p.removeAll) {
      stripMetadataInPlace(ctx.doc);
      if (Object.keys(p.patch).length === 0) return;
    }
    applyMetadataPatch(ctx.doc, p.patch);
  },
});

// protect.set has no writer: the encrypt export stage applies it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PROTECT_MATERIALIZERS: readonly Materializer<any>[] = [
  metaSetWriter,
];
