import { ToolError } from '@/shared/lib/errors';
import type { PageInfo } from './types';

interface SizedDoc {
  numPages: number;
  getPage(n: number): Promise<{
    getViewport(o: { scale: number }): { width: number; height: number };
  }>;
}

/** How often (in pages) a long open checks whether it was cancelled. */
const ABORT_CHECK_EVERY = 25;

/**
 * Every page's size at scale 1 (with its own /Rotate applied). Checks the
 * signal every few pages, so aborting the open of a 5,000-page file doesn't
 * wait for the whole loop.
 */
export async function readPageSizes(
  doc: SizedDoc,
  signal: AbortSignal,
): Promise<PageInfo[]> {
  const pages: PageInfo[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    if (i % ABORT_CHECK_EVERY === 0 && signal.aborted)
      throw new ToolError('CANCELLED', 'Cancelled');
    const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
    pages.push({ width: vp.width, height: vp.height });
  }
  return pages;
}
