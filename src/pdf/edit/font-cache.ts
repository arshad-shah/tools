import notoSansUrl from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url';
import type { PDFDocument, PDFFont } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';

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

  constructor(
    private readonly doc: PDFDocument,
    private readonly loadUnicode: () => Promise<Uint8Array>,
  ) {}

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

/**
 * The Unicode drawing font's bytes, fetched once from our own origin.
 * The file is fontsource's latin subset of Noto Sans regular (WOFF).
 */
let noto: Promise<Uint8Array> | null = null;
export function loadNotoSans(): Promise<Uint8Array> {
  if (!noto) {
    const failed = (cause?: unknown) =>
      new ToolError('NETWORK', 'Could not load the Unicode font', { cause });
    const loading = fetch(notoSansUrl).then(
      async (res) => {
        if (!res.ok) throw failed();
        return new Uint8Array(await res.arrayBuffer());
      },
      (cause: unknown) => {
        throw failed(cause);
      },
    );
    // A failed load is retried on the next call.
    loading.catch(() => {
      if (noto === loading) noto = null;
    });
    noto = loading;
  }
  return noto;
}
