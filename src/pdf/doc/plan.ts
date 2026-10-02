import type { BlobSource } from './blob-store';
import type { MaterializePlan } from './materialize/materialize';
import type { DocumentModel } from './model';
import { remapPageLabels } from './page-map';
import { getOperation } from './registry';
import type { AssetId, OverlayItem, PageId, SourceId } from './types';

/**
 * What the edit worker needs to write the current view (spec §6.4): the
 * current checkpoint's bytes, merged-in sources and assets the pages and
 * overlays reference, the page map, labels and the overlays that have a
 * writer, in log order. `onlyPages` keeps just those pages (extract, preview
 * as exported), each with the page label it shows in the view.
 */
export async function planFor(
  model: DocumentModel,
  blobs: BlobSource,
  opts: { onlyPages?: PageId[] } = {},
): Promise<MaterializePlan> {
  const view = model.getView();
  const state = model.getState();
  const ckpt = model.currentCheckpoint();
  const only = opts.onlyPages ? new Set(opts.onlyPages) : null;
  const pages = view.pages.filter((p) => !only || only.has(p.id));
  const order = new Map(state.log.map((op, i) => [op.id, i]));
  const writes = (o: OverlayItem) =>
    !view.hidden.has(o.opId) && !getOperation(o.type).noOutput;
  const overlays = [
    ...view.docOverlays,
    ...pages.flatMap((p) => view.overlays.get(p.id) ?? []),
  ]
    .filter(writes)
    .sort((a, b) => (order.get(a.opId) ?? 0) - (order.get(b.opId) ?? 0));

  const sourceIds = new Set<SourceId>();
  for (const p of pages)
    if (!p.blank && p.source !== ckpt.sourceId) sourceIds.add(p.source);
  const assetIds = new Set<AssetId>();
  for (const o of overlays)
    for (const id of getOperation(o.type).assets?.(o.params) ?? [])
      assetIds.add(id);

  const [base, sources, assets] = await Promise.all([
    blobs.checkpointBytes(ckpt.id),
    Promise.all(
      [...sourceIds].map(async (id) => [id, await blobs.sourceBytes(id)]),
    ).then(Object.fromEntries),
    Promise.all(
      [...assetIds].map(async (id) => [id, await blobs.assetBytes(id)]),
    ).then(Object.fromEntries),
  ]);
  return {
    base,
    baseSourceId: ckpt.sourceId,
    sources,
    assets,
    pages,
    pageLabels: only
      ? remapPageLabels(
          view.pageLabels,
          view.pages.map((p) => p.id),
          pages.map((p) => p.id),
        )
      : view.pageLabels,
    overlays,
  };
}
