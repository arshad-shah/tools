import type { BlobSource } from '@/pdf/doc/blob-store';
import type { DocumentModel } from '@/pdf/doc/model';
import { planFor } from '@/pdf/doc/plan';
import { materializeIn, type Services } from '@/pdf/doc/services';
import type { SizeBreakdown } from '@/pdf/edit/size-breakdown';

/**
 * Size breakdown of the document as it would export now: materialise every
 * pending change, then measure in the edit worker.
 */
export async function documentBreakdown(
  s: { model: DocumentModel; blobs: BlobSource; services: Services },
  signal: AbortSignal,
): Promise<SizeBreakdown> {
  const plan = await planFor(s.model, s.blobs);
  const { bytes } = await materializeIn(s.services, plan, { signal });
  return s.services.edit.call('sizeBreakdown', [bytes], {
    signal,
    transfer: [bytes.buffer as ArrayBuffer],
  });
}
