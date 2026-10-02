import { useEffect, useState } from 'react';
import type { PageTextItems } from '@/pdf/render';
import type { ExistingAnnotation } from '@/pdf/render/annotations';
import type { Box, PageId, PageRef } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';

/*
 * Existing annotations and page text, read once per open source document
 * and page (the render worker's docId changes when the base changes).
 */
const cache = new Map<string, Promise<ExistingAnnotation[]>>();

function load(
  doc: DocumentApi,
  page: PageRef,
): Promise<ExistingAnnotation[]> | null {
  if (page.blank) return Promise.resolve([]);
  const docId = doc.sources[page.source]?.docId;
  if (!docId) return null;
  const key = `${docId}:${page.index}`;
  let p = cache.get(key);
  if (!p) {
    p = doc.render.annotations(docId, page.index);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

/** The page's existing annotations; null while loading or unavailable. */
export function useExistingAnnotations(
  doc: DocumentApi,
  page: PageRef,
): ExistingAnnotation[] | null {
  const docId = page.blank ? 'blank' : doc.sources[page.source]?.docId;
  const key = `${docId}:${page.index}`;
  const [got, setGot] = useState<{
    key: string;
    list: ExistingAnnotation[];
  } | null>(null);
  useEffect(() => {
    let live = true;
    load(doc, page)?.then(
      (list) => live && setGot({ key, list }),
      () => live && setGot({ key, list: [] }),
    );
    return () => {
      live = false;
    };
    // The key names the document and page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return got?.key === key ? got.list : null;
}

/** Existing annotations of every page in view order (the comments panel). */
export function useAllExisting(
  doc: DocumentApi,
): Map<PageId, ExistingAnnotation[]> {
  const pages = doc.view.pages;
  const key = pages
    .map(
      (p) =>
        `${p.id}=${p.blank ? 'b' : doc.sources[p.source]?.docId}:${p.index}`,
    )
    .join('|');
  const [got, setGot] = useState<{
    key: string;
    map: Map<PageId, ExistingAnnotation[]>;
  } | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all(
      pages.map(
        async (p) =>
          [p.id, (await load(doc, p)?.catch(() => [])) ?? []] as const,
      ),
    ).then((entries) => live && setGot({ key, map: new Map(entries) }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return got?.key === key ? got.map : new Map();
}

const textCache = new WeakMap<PageRef, Promise<PageTextItems>>();

/** The page's positioned text (for the text layer); null while loading. */
export function usePageText(
  doc: DocumentApi,
  page: PageRef,
): PageTextItems | null {
  const [got, setGot] = useState<{ page: PageRef; text: PageTextItems } | null>(
    null,
  );
  useEffect(() => {
    if (page.blank) return;
    let live = true;
    let p = textCache.get(page);
    if (!p) {
      p = doc.text(page);
      textCache.set(page, p);
    }
    p.then(
      (text) => live && setGot({ page, text }),
      () => live && setGot({ page, text: { items: [], styles: {} } }),
    );
    return () => {
      live = false;
    };
  }, [doc, page]);
  return got?.page === page ? got.text : null;
}

/** The page under `box` with annotations left out, for hiding one in preview. */
export function useCleanPatch(
  doc: DocumentApi,
  page: PageRef,
  box: Box,
  scale: number,
): ImageBitmap | null {
  const docId = page.blank ? null : doc.sources[page.source]?.docId;
  const key = `${docId}:${page.index}:${scale}:${page.rotate}:${box.x},${box.y},${box.width},${box.height}`;
  const [got, setGot] = useState<{ key: string; bitmap: ImageBitmap } | null>(
    null,
  );
  useEffect(() => {
    if (!docId) return;
    const ac = new AbortController();
    doc.render
      .renderWithoutAnnotations(
        docId,
        page.index,
        scale,
        page.rotate,
        box,
        ac.signal,
      )
      .then(
        (bitmap) => setGot({ key, bitmap }),
        () => {},
      );
    return () => ac.abort();
    // The key covers every input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Free each patch once it is replaced or unmounted.
  useEffect(() => () => got?.bitmap.close(), [got]);
  return got?.key === key ? got.bitmap : null;
}
