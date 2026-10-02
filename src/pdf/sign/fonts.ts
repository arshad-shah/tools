import { ToolError } from '@/shared/lib/errors';
import type { InkFont, InkLayout } from '@/pdf/edit';

export type SignatureFontId =
  | 'dancing-script'
  | 'great-vibes'
  | 'caveat'
  | 'sacramento'
  | 'allura'
  | 'alex-brush'
  | 'parisienne'
  | 'pinyon-script'
  | 'mr-dafoe'
  | 'kristi';

/**
 * OFL-1.1 script fonts, served from our own origin. `load` resolves the
 * file's URL; nothing is imported or fetched until a font is first used.
 */
export const SIGNATURE_FONTS: readonly {
  id: SignatureFontId;
  label: string;
  family: string;
  load: () => Promise<string>;
}[] = [
  {
    id: 'dancing-script',
    label: 'Dancing Script',
    family: 'Sign Dancing Script',
    load: () =>
      import('@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'great-vibes',
    label: 'Great Vibes',
    family: 'Sign Great Vibes',
    load: () =>
      import('@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'caveat',
    label: 'Caveat',
    family: 'Sign Caveat',
    load: () =>
      import('@fontsource/caveat/files/caveat-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'sacramento',
    label: 'Sacramento',
    family: 'Sign Sacramento',
    load: () =>
      import('@fontsource/sacramento/files/sacramento-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'allura',
    label: 'Allura',
    family: 'Sign Allura',
    load: () =>
      import('@fontsource/allura/files/allura-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'alex-brush',
    label: 'Alex Brush',
    family: 'Sign Alex Brush',
    load: () =>
      import('@fontsource/alex-brush/files/alex-brush-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'parisienne',
    label: 'Parisienne',
    family: 'Sign Parisienne',
    load: () =>
      import('@fontsource/parisienne/files/parisienne-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'pinyon-script',
    label: 'Pinyon Script',
    family: 'Sign Pinyon Script',
    load: () =>
      import('@fontsource/pinyon-script/files/pinyon-script-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'mr-dafoe',
    label: 'Mr Dafoe',
    family: 'Sign Mr Dafoe',
    load: () =>
      import('@fontsource/mr-dafoe/files/mr-dafoe-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
  {
    id: 'kristi',
    label: 'Kristi',
    family: 'Sign Kristi',
    load: () =>
      import('@fontsource/kristi/files/kristi-latin-400-normal.woff?url').then(
        (m) => m.default,
      ),
  },
];

export const fontById = (id: SignatureFontId) =>
  SIGNATURE_FONTS.find((f) => f.id === id)!;

const faces = new Map<SignatureFontId, Promise<void>>();

/** Loads the font for on-screen previews (once per font). */
export function ensureFontFace(id: SignatureFontId): Promise<void> {
  let p = faces.get(id);
  if (!p) {
    const f = fontById(id);
    p = f
      .load()
      .then((url) => new FontFace(f.family, `url(${url})`).load())
      .then((face) => {
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
    p = fontById(id)
      .load()
      .then((url) => fetch(url))
      .then(async (res) => {
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
