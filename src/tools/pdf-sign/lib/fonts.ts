import dancingScript from '@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff?url';
import greatVibes from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url';
import caveat from '@fontsource/caveat/files/caveat-latin-400-normal.woff?url';
import { ToolError } from '@/shared/lib/errors';

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

/** The same font file, for embedding with fontkit. */
export async function fetchFontBytes(id: SignatureFontId): Promise<Uint8Array> {
  const res = await fetch(fontById(id).url);
  if (!res.ok)
    throw new ToolError('UNKNOWN', 'Could not load the signature font');
  return new Uint8Array(await res.arrayBuffer());
}

/** Width ÷ height of `text` set in the font (call after ensureFontFace). */
export function measureTextAspect(text: string, id: SignatureFontId): number {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return 3;
  ctx.font = `100px "${fontById(id).family}"`;
  return Math.max(0.5, ctx.measureText(text).width / 125);
}
