import notoSansUrl from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url';
import notoLatinExtUrl from '@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff?url';
import notoGreekUrl from '@fontsource/noto-sans/files/noto-sans-greek-400-normal.woff?url';
import notoCyrillicUrl from '@fontsource/noto-sans/files/noto-sans-cyrillic-400-normal.woff?url';
import type { PDFDocument, PDFFont } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { FontStack } from './font-stack';

/**
 * Which font to draw with:
 * - one of the standard 14 (WinAnsi only, nothing embedded);
 * - the Unicode font (Noto Sans regular, OFL-1.1), embedded as a subset;
 * - a caller's own font file (`custom` is its cache key), embedded as a subset.
 */
export type FontSpec =
  | { standard: 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Courier' }
  | { unicode: true }
  | { custom: string; bytes: Uint8Array };

const keyOf = (spec: FontSpec): string =>
  'standard' in spec
    ? `standard:${spec.standard}`
    : 'unicode' in spec
      ? 'unicode'
      : `custom:${spec.custom}`;

/**
 * Embeds each font at most once per document. fontkit is loaded (and
 * registered) on the first non-standard font only, since it is large.
 * A failed embed is not cached, so a later call can retry.
 */
export class FontCache {
  private readonly fonts = new Map<string, Promise<PDFFont>>();
  private fontkit: Promise<void> | null = null;

  private fallbackSets: Promise<Set<number>[]> | null = null;

  constructor(
    private readonly doc: PDFDocument,
    private readonly loadUnicode: () => Promise<Uint8Array>,
    /** Unicode fallbacks, tried in order per character the main font lacks. */
    private readonly loadFallbacks: () => Promise<
      Uint8Array[]
    > = async () => [],
  ) {}

  /**
   * The fonts that draw `text` in `spec`: the font itself, plus, for the
   * Unicode font, only the fallbacks some character of `text` needs (each
   * embedded once, as a subset).
   */
  async forText(spec: FontSpec, text: string): Promise<FontStack> {
    const main = await this.get(spec);
    if (!('unicode' in spec)) return new FontStack([main]);
    const have = new Set(main.getCharacterSet());
    const missing = [...new Set(Array.from(text))]
      .map((ch) => ch.codePointAt(0)!)
      .filter((c) => !have.has(c));
    if (missing.length === 0) return new FontStack([main]);
    const sets = await this.fallbackCoverage();
    const needed = sets.flatMap((set, i) =>
      missing.some((c) => set.has(c)) ? [i] : [],
    );
    const fallbacks = await Promise.all(needed.map((i) => this.fallback(i)));
    return new FontStack([main, ...fallbacks]);
  }

  /** Each fallback's character set, read once without embedding it. */
  private fallbackCoverage(): Promise<Set<number>[]> {
    this.fallbackSets ??= Promise.all([
      this.loadFallbacks(),
      import('@pdf-lib/fontkit'),
    ]).then(([files, { default: fontkit }]) =>
      files.map((f) => new Set(fontkit.create(f).characterSet)),
    );
    this.fallbackSets.catch(() => (this.fallbackSets = null));
    return this.fallbackSets;
  }

  private fallback(i: number): Promise<PDFFont> {
    const key = `unicode:fallback:${i}`;
    let font = this.fonts.get(key);
    if (!font) {
      font = this.loadFallbacks().then(async (files) =>
        this.embedBytes(files[i]),
      );
      font.catch(() => this.fonts.delete(key));
      this.fonts.set(key, font);
    }
    return font;
  }

  get(spec: FontSpec): Promise<PDFFont> {
    const key = keyOf(spec);
    let font = this.fonts.get(key);
    if (!font) {
      font = this.embed(spec);
      font.catch(() => this.fonts.delete(key));
      this.fonts.set(key, font);
    }
    return font;
  }

  private async embed(spec: FontSpec): Promise<PDFFont> {
    if ('standard' in spec) return this.doc.embedFont(spec.standard);
    const bytes = 'unicode' in spec ? await this.loadUnicode() : spec.bytes;
    return this.embedBytes(bytes);
  }

  private async embedBytes(bytes: Uint8Array): Promise<PDFFont> {
    await this.registerFontkit();
    try {
      return await this.doc.embedFont(bytes, { subset: true });
    } catch (cause) {
      throw new ToolError('INVALID_FILE', 'The font could not be embedded', {
        cause,
      });
    }
  }

  private registerFontkit(): Promise<void> {
    this.fontkit ??= import('@pdf-lib/fontkit').then(({ default: fontkit }) =>
      this.doc.registerFontkit(fontkit),
    );
    return this.fontkit;
  }
}

/** Fetches a font file from our own origin once; a failed load is retried. */
function fetchOnce(url: string): () => Promise<Uint8Array> {
  let file: Promise<Uint8Array> | null = null;
  return () => {
    if (!file) {
      const failed = (cause?: unknown) =>
        new ToolError('NETWORK', 'Could not load the Unicode font', { cause });
      const loading = fetch(url).then(
        async (res) => {
          if (!res.ok) throw failed();
          return new Uint8Array(await res.arrayBuffer());
        },
        (cause: unknown) => {
          throw failed(cause);
        },
      );
      loading.catch(() => {
        if (file === loading) file = null;
      });
      file = loading;
    }
    return file;
  };
}

/**
 * The Unicode drawing font's bytes: fontsource's latin subset of Noto Sans
 * regular (WOFF, OFL-1.1).
 */
export const loadNotoSans = fetchOnce(notoSansUrl);

const fallbackFiles = [notoLatinExtUrl, notoGreekUrl, notoCyrillicUrl].map(
  fetchOnce,
);

/**
 * Noto Sans latin-ext, greek and cyrillic, in fallback order after
 * `loadNotoSans` (each subset lacks basic Latin, so they only fill gaps).
 */
export const loadNotoFallbacks = (): Promise<Uint8Array[]> =>
  Promise.all(fallbackFiles.map((load) => load()));
