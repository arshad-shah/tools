const key = (docId: string, page: number, width: number) =>
  `${docId}:${page}:${width}`;

/** LRU of rendered page bitmaps; closes bitmaps it evicts. */
export class BitmapCache {
  private entries = new Map<string, { docId: string; bitmap: ImageBitmap }>();

  constructor(private readonly capacity = 150) {}

  get size() {
    return this.entries.size;
  }

  get(docId: string, page: number, width: number): ImageBitmap | undefined {
    const k = key(docId, page, width);
    const entry = this.entries.get(k);
    if (!entry) return undefined;
    this.entries.delete(k);
    if (entry.bitmap.width === 0) return undefined; // closed elsewhere
    this.entries.set(k, entry);
    return entry.bitmap;
  }

  set(docId: string, page: number, width: number, bitmap: ImageBitmap) {
    const k = key(docId, page, width);
    const existing = this.entries.get(k);
    if (existing && existing.bitmap !== bitmap) existing.bitmap.close();
    this.entries.delete(k);
    this.entries.set(k, { docId, bitmap });
    while (this.entries.size > this.capacity) {
      const [oldest, entry] = this.entries.entries().next().value!;
      this.entries.delete(oldest);
      entry.bitmap.close();
    }
  }

  deleteDoc(docId: string) {
    for (const [k, entry] of this.entries) {
      if (entry.docId === docId) {
        entry.bitmap.close();
        this.entries.delete(k);
      }
    }
  }
}
