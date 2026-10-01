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

export type ImageFormat = 'png' | 'jpeg';

export interface PageImageOptions {
  /** 72–300. */
  dpi: number;
  format: ImageFormat;
  /** JPEG quality 0–1 (ignored for PNG). */
  quality: number;
}

export interface PageImage {
  bytes: Uint8Array;
  width: number;
  height: number;
  /** DPI actually rendered (lower than requested when `capped`). */
  dpi: number;
  capped: boolean;
}
