import type { PDFPageProxy } from 'pdfjs-dist';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import { textFromItems, textItemsFrom } from '../text';
import type { PageText } from '../types';
import { getDoc } from './state';

/** One pdf.js text item; `transform` is in page space (PDF user units). */
export interface TextItemGeom {
  str: string;
  transform: [number, number, number, number, number, number];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

export interface PageTextItems {
  items: TextItemGeom[];
  styles: Record<
    string,
    { ascent: number; descent: number; vertical: boolean; fontFamily: string }
  >;
}

/** Runs `read` on one page, then frees the page's parsed resources. */
async function withPage<T>(
  docId: string,
  pageIndex: number,
  read: (page: PDFPageProxy) => Promise<T>,
): Promise<T> {
  const page = await getDoc(docId).getPage(pageIndex + 1);
  try {
    return await read(page);
  } finally {
    page.cleanup();
  }
}

export const textHandlers = {
  extractText(
    _ctx: RpcContext,
    docId: string,
    pageIndex: number,
  ): Promise<PageText> {
    return withPage(docId, pageIndex, async (page) =>
      textFromItems((await page.getTextContent()).items),
    );
  },

  textItems(
    _ctx: RpcContext,
    docId: string,
    pageIndex: number,
  ): Promise<PageTextItems> {
    return withPage(docId, pageIndex, async (page) =>
      textItemsFrom(await page.getTextContent({ includeMarkedContent: false })),
    );
  },
};
