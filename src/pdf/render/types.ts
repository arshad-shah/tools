export interface PageInfo {
  /** CSS px at scale 1, with the page's own /Rotate applied. */
  width: number;
  height: number;
}

export interface DocInfo {
  docId: string;
  pageCount: number;
  pages: PageInfo[];
}

export interface PageText {
  text: string;
  hasTextLayer: boolean;
}
