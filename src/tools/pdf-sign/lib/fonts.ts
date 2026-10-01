import dancingScript from '@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff?url';
import greatVibes from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url';
import caveat from '@fontsource/caveat/files/caveat-latin-400-normal.woff?url';
import { ToolError } from '@/shared/lib/errors';
import type { InkFont, InkLayout } from '@/pdf/edit';

export type SignatureFontId = 'dancing-script' | 'great-vibes' | 'caveat';

/** OFL-1.1 script fonts, served from our own origin. */
export const SIGNATURE_FONTS: readonly {
  id: SignatureFontId;
  label: string;
  family: string;
  url: string;
}[] = [
  {
    id: 'dancing-script',
    label: 'Dancing Script',
    family: 'Sign Dancing Script',
    url: dancingScript,
  },
  {
    id: 'great-vibes',
    label: 'Great Vibes',
    family: 'Sign Great Vibes',
    url: greatVibes,
  },
  { id: 'caveat', label: 'Caveat', family: 'Sign Caveat', url: caveat },
];

export const fontById = (id: SignatureFontId) =>
  SIGNATURE_FONTS.find((f) => f.id === id)!;

const faces = new Map<SignatureFontId, Promise<void>>();

/** Loads the font for on-screen previews (once per font). */
export function ensureFontFace(id: SignatureFontId): Promise<void> {
  let p = faces.get(id);
  if (!p) {
    const f = fontById(id);
    p = new FontFace(f.family, `url(${f.url})`).load().then((face) => {
      document.fonts.add(face);
    });
    p.catch(() => faces.delete(id));
    faces.set(id, p);
  }
  return p;
}

const bytesCache = new Map<SignatureFontId, Promise<Uint8Array>>();

/** The same font file, for embedding with fontkit (fetched once per font). */
export function fetchFontBytes(id: SignatureFontId): Promise<Uint8Array> {
  let p = bytesCache.get(id);
  if (!p) {
    p = fetch(fontById(id).url).then(async (res) => {
      if (!res.ok)
        throw new ToolError('UNKNOWN', 'Could not load the signature font');
      return new Uint8Array(await res.arrayBuffer());
    });
    p.catch(() => bytesCache.delete(id));
    bytesCache.set(id, p);
  }
  return p;
}

/** A parsed signature font: layout and outlines for previews, glyph coverage. */
export type SignatureFont = InkFont & {
  hasGlyphForCodePoint(codePoint: number): boolean;
};

const parsed = new Map<SignatureFontId, Promise<SignatureFont>>();

/**
 * Parses the font with fontkit, the same library that embeds it in the PDF,
 * so previews and character checks match the output exactly. fontkit is
 * loaded on demand (it is large).
 */
export function loadSignatureFont(id: SignatureFontId): Promise<SignatureFont> {
  let p = parsed.get(id);
  if (!p) {
    p = Promise.all([import('@pdf-lib/fontkit'), fetchFontBytes(id)]).then(
      ([{ default: fontkit }, bytes]) => fontkit.create(bytes),
    );
    p.catch(() => parsed.delete(id));
    parsed.set(id, p);
  }
  return p;
}

/** Width ÷ height of the inked text, the box aspect a typed signature needs. */
export function inkAspect(layout: InkLayout): number {
  const { ink } = layout;
  return (ink.maxX - ink.minX) / (ink.maxY - ink.minY);
}

/** Characters of `text` the font can't draw (unique, in order; whitespace ignored). */
export function missingChars(
  text: string,
  hasGlyph: (codePoint: number) => boolean,
): string[] {
  return [...new Set(Array.from(text))].filter(
    (ch) => !/\s/.test(ch) && !hasGlyph(ch.codePointAt(0)!),
  );
}
