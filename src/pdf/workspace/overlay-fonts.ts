import notoSansUrl from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url';
import { ToolError } from '@/shared/lib/errors';

/*
 * The fonts overlays draw with are the export's own files where possible
 * (spec §6.3 mitigation 1): pdf.js renders exported Helvetica with
 * Liberation Sans, and the Unicode font is the Noto Sans file FontCache
 * embeds. Times and Courier fall back to the system serif and monospace
 * (the preview may differ slightly; "Preview page as exported" is exact).
 */
const FACES = [
  {
    family: 'PdfHelvetica',
    url: '/pdfjs/standard_fonts/LiberationSans-Regular.ttf',
    weight: '400',
  },
  {
    family: 'PdfHelvetica',
    url: '/pdfjs/standard_fonts/LiberationSans-Bold.ttf',
    weight: '700',
  },
  { family: 'PdfNoto', url: notoSansUrl, weight: '400' },
];

let loading: Promise<void> | null = null;

/** Loads the overlay FontFaces once; a failure is reported and can be retried. */
export function ensureOverlayFonts(): Promise<void> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined')
    return Promise.resolve();
  loading ??= Promise.all(
    FACES.map(async ({ family, url, weight }) => {
      const face = new FontFace(family, `url(${url})`, { weight });
      await face.load();
      document.fonts.add(face);
    }),
  ).then(
    () => undefined,
    (cause) => {
      loading = null;
      throw new ToolError('NETWORK', 'Could not load the preview fonts', {
        cause,
      });
    },
  );
  return loading;
}
