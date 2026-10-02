import {
  PDFArray,
  PDFDict,
  PDFNumber,
  PDFName,
  PDFRef,
  PDFStream,
  type PDFDocument,
  type PDFObject,
  type PDFPage,
} from 'pdf-lib';

// Pruning after `arrangePages` deletes pages: the structure tree, then every
// object nothing reaches any more.

const N = (name: string) => PDFName.of(name);

/**
 * Tagged PDFs: removes from the logical structure everything that belonged
 * to the deleted pages, so it can't keep their content alive (ActualText,
 * annotations, removed fields' values) through /StructTreeRoot:
 * - marked-content kids (MCIDs, MCRs) whose page is deleted;
 * - OBJR kids for annotations on deleted pages, and for `removedAnnots`
 *   (links on kept pages that went to a deleted page);
 * - structure elements left with no kids (recursively);
 * - /ParentTree entries keyed by a deleted page's /StructParents or a
 *   deleted annotation's /StructParent, or pointing at a dropped element;
 * - /IDTree entries for dropped elements.
 * Tags for the kept pages stay intact.
 */
export function pruneStructTree(
  doc: PDFDocument,
  deleted: PDFPage[],
  gone: ReadonlySet<PDFRef>,
  removedAnnots: ReadonlySet<PDFRef>,
) {
  const { context, catalog } = doc;
  const root = catalog.lookupMaybe(N('StructTreeRoot'), PDFDict);
  if (!root) return;
  const doomedAnnots = new Set<PDFRef>();
  const doomedKeys = new Set<number>();
  const doomAnnot = (ref: PDFRef) => {
    doomedAnnots.add(ref);
    const key = context
      .lookupMaybe(ref, PDFDict)
      ?.lookupMaybe(N('StructParent'), PDFNumber);
    if (key) doomedKeys.add(key.asNumber());
  };
  for (const page of deleted) {
    const sp = page.node.lookupMaybe(N('StructParents'), PDFNumber);
    if (sp) doomedKeys.add(sp.asNumber());
    const annots = page.node.Annots();
    for (let i = 0; i < (annots?.size() ?? 0); i++) {
      const ref = annots!.get(i);
      if (ref instanceof PDFRef) doomAnnot(ref);
    }
  }
  for (const ref of removedAnnots) doomAnnot(ref);
  const onGonePage = (pg: PDFObject | undefined) =>
    pg instanceof PDFRef && gone.has(pg);
  const deref = (o: PDFObject | undefined) =>
    o instanceof PDFRef ? context.lookup(o) : o;
  const dropped = new Set<PDFDict>();
  /**
   * Elements already pruned. Real files are trees, but a structure that
   * shares elements (a DAG) would otherwise be walked once per path, which
   * is exponential in its depth.
   */
  const visited = new Set<PDFDict>();

  const keepKid = (
    kid: PDFObject,
    pg: PDFObject | undefined,
    depth: number,
  ): boolean => {
    if (kid instanceof PDFNumber) return !onGonePage(pg); // MCID
    const dict = deref(kid);
    if (!(dict instanceof PDFDict)) return true;
    const ownPg = dict.get(N('Pg')) ?? pg;
    const type = dict.get(N('Type'));
    if (type === N('MCR')) return !onGonePage(ownPg);
    if (type === N('OBJR')) {
      const obj = dict.get(N('Obj'));
      return (
        !onGonePage(ownPg) &&
        !(obj instanceof PDFRef && (doomedAnnots.has(obj) || gone.has(obj)))
      );
    }
    if (depth > 256) return true; // pathological nesting: leave it be
    if (visited.has(dict)) return !dropped.has(dict);
    visited.add(dict);
    const keep = pruneKids(dict, ownPg, depth + 1);
    if (!keep) dropped.add(dict);
    return keep;
  };

  /** Prunes an element's /K; false when nothing of it remains. */
  const pruneKids = (
    el: PDFDict,
    pg: PDFObject | undefined,
    depth: number,
  ): boolean => {
    const k = el.get(N('K'));
    if (k === undefined) return !onGonePage(pg);
    const arr = deref(k);
    if (arr instanceof PDFArray) {
      for (let i = arr.size() - 1; i >= 0; i--)
        if (!keepKid(arr.get(i), pg, depth)) arr.remove(i);
      return arr.size() > 0;
    }
    if (keepKid(k, pg, depth)) return true;
    el.delete(N('K'));
    return false;
  };
  pruneKids(root, undefined, 0);

  const isDropped = (o: PDFObject | undefined) => {
    const d = deref(o);
    return d instanceof PDFDict && dropped.has(d);
  };
  const walkTree = (
    node: PDFDict | undefined,
    entriesKey: string,
    removeEntry: (key: PDFObject | undefined, value: PDFObject) => boolean,
    depth = 0,
  ) => {
    if (!node || depth > 32) return;
    const entries = node.lookupMaybe(N(entriesKey), PDFArray);
    if (entries) {
      for (let i = entries.size() - 2; i >= 0; i -= 2) {
        const value = entries.get(i + 1);
        if (removeEntry(entries.lookup(i), value)) {
          entries.remove(i + 1);
          entries.remove(i);
          continue;
        }
        // A page's entry is an array of elements: blank out dropped ones.
        const arr = deref(value);
        if (arr instanceof PDFArray)
          for (let j = 0; j < arr.size(); j++)
            if (isDropped(arr.get(j))) arr.set(j, context.obj(null));
      }
    }
    const kids = node.lookupMaybe(N('Kids'), PDFArray);
    for (let i = 0; i < (kids?.size() ?? 0); i++)
      walkTree(
        kids!.lookupMaybe(i, PDFDict),
        entriesKey,
        removeEntry,
        depth + 1,
      );
  };
  walkTree(
    root.lookupMaybe(N('ParentTree'), PDFDict),
    'Nums',
    (key, value) =>
      (key instanceof PDFNumber && doomedKeys.has(key.asNumber())) ||
      isDropped(value),
  );
  walkTree(root.lookupMaybe(N('IDTree'), PDFDict), 'Names', (_key, value) =>
    isDropped(value),
  );
}

/**
 * Deletes every indirect object no longer reachable from the trailer, so
 * removed pages (and their streams, fonts and annotations) leave the file.
 */
export function pruneUnreachable(doc: PDFDocument) {
  const { context } = doc;
  const { Root, Info, Encrypt, ID } = context.trailerInfo;
  const reachable = new Set<PDFRef>();
  const stack = [Root, Info, Encrypt, ID].filter(
    (o): o is PDFObject => o !== undefined,
  );
  while (stack.length > 0) {
    const obj = stack.pop()!;
    if (obj instanceof PDFRef) {
      if (reachable.has(obj)) continue;
      reachable.add(obj);
      const target = context.lookup(obj);
      if (target) stack.push(target);
    } else if (obj instanceof PDFDict) {
      for (const [, value] of obj.entries()) stack.push(value);
    } else if (obj instanceof PDFArray) {
      for (let i = 0; i < obj.size(); i++) stack.push(obj.get(i));
    } else if (obj instanceof PDFStream) {
      stack.push(obj.dict);
    }
  }
  for (const [ref] of context.enumerateIndirectObjects())
    if (!reachable.has(ref)) context.delete(ref);
}
