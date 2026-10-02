import type { DetectedField, PageDetection } from '@/pdf/detect';
import type { SourceId } from './types';

/**
 * Flat-form detection results kept with the document (spec §8.4): one entry
 * per source page, autosaved with the log but not part of undo. Keys are
 * `${sourceId}:${pageIndex}` so results survive reorder and duplicate.
 */
export interface DetectionCache {
  pages: Record<string, PageDetection>;
}

export const detectionKey = (sourceId: SourceId, pageIndex: number) =>
  `${sourceId}:${pageIndex}`;

/** The cache with `d` stored for its page; other pages are kept. */
export function mergeDetection(
  cache: DetectionCache | undefined,
  sourceId: SourceId,
  d: PageDetection,
): DetectionCache {
  return {
    pages: {
      ...(cache?.pages ?? {}),
      [detectionKey(sourceId, d.pageIndex)]: d,
    },
  };
}

/** Reads a cache from the document state (anything else is no cache). */
export function asDetectionCache(v: unknown): DetectionCache | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const pages = (v as { pages?: unknown }).pages;
  if (typeof pages !== 'object' || pages === null) return undefined;
  return { pages: pages as Record<string, PageDetection> };
}

/** A detected field's id in the view: unique across sources. */
export const fieldKey = (sourceId: SourceId, field: DetectedField) =>
  `${sourceId}:${field.id}`;
