const key = (docId: string, page: number, width: number) =>
  `${docId}:${page}:${width}`;
const tileKey = (k: string) => `tile|${k}`;

/** 256 MB of RGBA on desktop. */
const DESKTOP_MAX_PIXELS = 64 * 1024 * 1024;
/** 96 MB of RGBA on phones. */
const PHONE_MAX_PIXELS = 24 * 1024 * 1024;

function defaultMaxPixels(): number {
  // matchMedia does not exist in Node or in a worker.
  const narrow =
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(max-width: 899px)').matches;
  return narrow ? PHONE_MAX_PIXELS : DESKTOP_MAX_PIXELS;
}

interface Entry {
  docId: string;
  bitmap: ImageBitmap;
  /** Pixels counted when stored (a bitmap closed elsewhere reads 0 later). */
  pixels: number;
}

/**
 * LRU of rendered page bitmaps and zoom tiles bounded by total pixel area;
 * closes bitmaps it evicts and tells subscribers, so a visible tile can ask
 * again. A single bitmap larger than the budget is kept on its own.
 */
export class BitmapCache {
  private entries = new Map<string, Entry>();
  private pixels = 0;
  private listeners = new Set<() => void>();
  private readonly maxPixels: number;

  constructor(opts: { maxPixels?: number } = {}) {
    this.maxPixels = opts.maxPixels ?? defaultMaxPixels();
  }

  get size() {
    return this.entries.size;
  }

  /** Called after evictions and document purges. */
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  get(docId: string, page: number, width: number): ImageBitmap | undefined {
    return this.lookup(key(docId, page, width));
  }

  set(docId: string, page: number, width: number, bitmap: ImageBitmap) {
    this.store(docId, key(docId, page, width), bitmap);
  }

  /** A zoom tile under the caller's key, counted in the same budget. */
  getTile(k: string): ImageBitmap | undefined {
    return this.lookup(tileKey(k));
  }

  setTile(docId: string, k: string, bitmap: ImageBitmap) {
    this.store(docId, tileKey(k), bitmap);
  }

  private notify() {
    for (const l of [...this.listeners]) l();
  }

  private lookup(k: string): ImageBitmap | undefined {
    const entry = this.entries.get(k);
    if (!entry) return undefined;
    this.remove(k, entry);
    if (entry.bitmap.width === 0) return undefined; // closed elsewhere
    this.insert(k, entry);
    return entry.bitmap;
  }

  private store(docId: string, k: string, bitmap: ImageBitmap) {
    const existing = this.entries.get(k);
    if (existing) {
      if (existing.bitmap !== bitmap) existing.bitmap.close();
      this.remove(k, existing);
    }
    this.insert(k, { docId, bitmap, pixels: bitmap.width * bitmap.height });
    // Never evicts the newest entry, even when it alone is over budget.
    let evicted = false;
    while (this.pixels > this.maxPixels && this.entries.size > 1) {
      const [oldest, entry] = this.entries.entries().next().value!;
      this.remove(oldest, entry);
      entry.bitmap.close();
      evicted = true;
    }
    if (evicted) this.notify();
  }

  deleteDoc(docId: string) {
    let any = false;
    for (const [k, entry] of this.entries) {
      if (entry.docId === docId) {
        entry.bitmap.close();
        this.remove(k, entry);
        any = true;
      }
    }
    if (any) this.notify();
  }

  private insert(k: string, entry: Entry) {
    this.entries.set(k, entry);
    this.pixels += entry.pixels;
  }

  private remove(k: string, entry: Entry) {
    this.entries.delete(k);
    this.pixels -= entry.pixels;
  }
}
