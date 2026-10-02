import { useEffect, useState } from 'react';
import type { PDFFont, StandardFonts } from 'pdf-lib';
import type { TextMeasure } from '@/pdf/edit/font-stack';
import type { OverlayTextMetrics } from '@/shared/ui';
import type { Box } from '@/pdf/doc/types';

/*
 * Overlay text uses the writers' own layout (fitText with pdf-lib font
 * metrics) so the preview wraps exactly like the export (spec §6.3
 * mitigation 1). pdf-lib is loaded on first use, outside the main bundle.
 */

export type LayoutFont =
  | 'Helvetica'
  | 'Helvetica-Bold'
  | 'Times-Roman'
  | 'Courier'
  | 'unicode';

let fonts: Promise<Map<LayoutFont, PDFFont>> | null = null;
let unicode: Promise<TextMeasure> | null = null;

/**
 * The Unicode font with its per-character fallbacks (Noto Sans, the files
 * the export embeds), loaded on first use.
 */
function loadUnicode(): Promise<TextMeasure> {
  unicode ??= Promise.all([
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
    import('@/pdf/edit/font-cache'),
    import('@/pdf/edit/font-stack'),
  ]).then(
    async ([
      { PDFDocument },
      fontkit,
      { loadNotoSans, loadNotoFallbacks },
      { FontStack },
    ]) => {
      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit.default);
      const files = [await loadNotoSans(), ...(await loadNotoFallbacks())];
      const fonts = await Promise.all(
        files.map((f) => doc.embedFont(f, { subset: true })),
      );
      return new FontStack(fonts);
    },
  );
  unicode.catch(() => {
    unicode = null;
  });
  return unicode;
}

function loadFont(name: LayoutFont): Promise<TextMeasure> {
  return name === 'unicode'
    ? loadUnicode()
    : loadFonts().then((m) => m.get(name)!);
}

function loadFonts(): Promise<Map<LayoutFont, PDFFont>> {
  fonts ??= import('pdf-lib').then(async ({ PDFDocument }) => {
    const doc = await PDFDocument.create();
    const names: LayoutFont[] = [
      'Helvetica',
      'Helvetica-Bold',
      'Times-Roman',
      'Courier',
    ];
    return new Map(
      names.map((n) => [
        n,
        doc.embedStandardFont(n as unknown as StandardFonts),
      ]),
    );
  });
  return fonts;
}

export interface TextLayout {
  font: TextMeasure;
  fit: typeof import('@/pdf/edit/draw-fit').fitText;
}

let fit: Promise<TextLayout['fit']> | null = null;

/** A standard font's metrics and fitText, or null while they load. */
export function useTextLayout(name: LayoutFont): TextLayout | null {
  const [layout, setLayout] = useState<TextLayout | null>(null);
  useEffect(() => {
    let live = true;
    fit ??= import('@/pdf/edit/draw-fit').then((m) => m.fitText);
    void Promise.all([loadFont(name), fit]).then(
      ([font, f]) => {
        if (live) setLayout({ font, fit: f });
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, [name]);
  return layout;
}

/** Ascent and glyph height per unit of size, as drawText measures them. */
export function metricsOf(font: TextMeasure): OverlayTextMetrics {
  return {
    ascent: font.heightAtSize(1, { descender: false }),
    height: font.heightAtSize(1),
  };
}

/** Lines and size for multiline text in a box (fitText, shrinking to 6pt). */
export function layoutLines(
  layout: TextLayout,
  text: string,
  box: Box,
  size: number,
  lineHeight = 1.2,
): { lines: string[]; size: number } {
  try {
    const r = layout.fit(layout.font, text, box, {
      size,
      minSize: Math.min(6, size),
      multiline: true,
      lineHeight,
    });
    return { lines: r.lines, size: r.size };
  } catch {
    return { lines: text.split('\n'), size };
  }
}
