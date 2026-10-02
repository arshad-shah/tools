import { ToolError } from '@/shared/lib/errors';
import type { JobContext } from '@/shared/state/useJob';
import { deriveFilename } from '@/shared/lib/download';
import type { BlobSource } from '@/pdf/doc/blob-store';
import type { DocumentModel } from '@/pdf/doc/model';
import { planFor } from '@/pdf/doc/plan';
import { assertUnrestricted } from '@/pdf/doc/restricted';
import { getServices, materializeIn, type Services } from '@/pdf/doc/services';
import type { PageId } from '@/pdf/doc/types';

type Env = Partial<JobContext> & { services?: Pick<Services, 'edit'> };

/** These pages as their own PDF, with every pending change (spec §7.2). */
export async function extractPages(
  model: DocumentModel,
  blobs: BlobSource,
  pageIds: PageId[],
  env: Env = {},
): Promise<Uint8Array> {
  assertUnrestricted(model.getState());
  if (pageIds.length === 0)
    throw new ToolError('INVALID_INPUT', 'Select at least one page');
  const plan = await planFor(model, blobs, { onlyPages: pageIds });
  const out = await materializeIn(env.services ?? getServices(), plan, {
    signal: env.signal,
    progress: env.progress,
  });
  return out.bytes;
}

/** Page ids in document order, cut before each selected page or every N pages. */
export function splitGroups(
  order: readonly PageId[],
  at: 'selected' | { every: number },
  selected: ReadonlySet<PageId> = new Set(),
): PageId[][] {
  if (typeof at === 'object' && (!Number.isInteger(at.every) || at.every < 1))
    throw new ToolError(
      'INVALID_INPUT',
      'Split every N pages: N must be 1 or more',
    );
  const groups: PageId[][] = [];
  order.forEach((id, i) => {
    const cut =
      i > 0 &&
      (at === 'selected'
        ? selected.has(id)
        : i % (at as { every: number }).every === 0);
    if (cut || groups.length === 0) groups.push([]);
    groups[groups.length - 1].push(id);
  });
  if (groups.length < 2)
    throw new ToolError(
      'INVALID_INPUT',
      at === 'selected'
        ? 'Select the pages where each new part should start'
        : 'The document is not long enough to split that way',
    );
  return groups;
}

/** One PDF per part (spec §7.2: new files, never a change to the document). */
export async function splitDocument(
  model: DocumentModel,
  blobs: BlobSource,
  at: 'selected' | { every: number },
  selected: ReadonlySet<PageId> = new Set(),
  env: Env = {},
): Promise<{ name: string; bytes: Uint8Array }[]> {
  assertUnrestricted(model.getState());
  const order = model.getView().pages.map((p) => p.id);
  const groups = splitGroups(order, at, selected);
  const name = model.getState().name;
  const parts: { name: string; bytes: Uint8Array }[] = [];
  for (const [i, ids] of groups.entries()) {
    env.progress?.({ done: i, total: groups.length, label: 'Splitting' });
    parts.push({
      name: deriveFilename(name, `part-${i + 1}`, 'pdf'),
      bytes: await extractPages(model, blobs, ids, env),
    });
  }
  return parts;
}
