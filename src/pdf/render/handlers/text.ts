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

export const textHandlers = {
  async extractText(
    _ctx: RpcContext,
    docId: string,
    pageIndex: number,
  ): Promise<PageText> {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    return textFromItems((await page.getTextContent()).items);
  },

  async textItems(
    _ctx: RpcContext,
    docId: string,
    pageIndex: number,
  ): Promise<PageTextItems> {
    const page = await getDoc(docId).getPage(pageIndex + 1);
    return textItemsFrom(
      await page.getTextContent({ includeMarkedContent: false }),
    );
  },
};
