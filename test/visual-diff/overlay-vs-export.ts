import type { Page } from '@playwright/test';

/**
 * Spec §6.3 mitigation 3 (used by C and D): screenshots the workspace page
 * slot (bitmap plus overlay) and renders the exported page with the app's
 * own pdf.js worker inside the page, at the slot's size, then compares them
 * with pixelDiffRatio. Pass a ratio limit of 0.015 in assertions.
 * Needs the Vite dev server (it imports the app and helper modules by path).
 */
export async function compareOverlayWithExport(
  page: Page,
  opts: { pageNumber: number; exportBytes: Uint8Array; scale: number },
): Promise<number> {
  const slot = page.locator(`[data-testid="page-slot-${opts.pageNumber}"]`);
  const shot = await slot.screenshot();
  return page.evaluate(
    async ({ shot, pdf, pageIndex }) => {
      const load = (url: string) => import(/* @vite-ignore */ url);
      const { pdfRender } = await load('/src/pdf/render/client.ts');
      const { pixelDiffRatio } = await load('/test/helpers/pixel-diff.ts');
      const pixels = (img: ImageBitmap, w: number, h: number) => {
        const c = new OffscreenCanvas(w, h);
        const g = c.getContext('2d')!;
        g.drawImage(img, 0, 0, w, h);
        return { data: g.getImageData(0, 0, w, h).data, width: w, height: h };
      };
      const actual = await createImageBitmap(
        new Blob([new Uint8Array(shot)], { type: 'image/png' }),
      );
      const doc = await pdfRender.open(new Uint8Array(pdf));
      try {
        const expected: ImageBitmap = await pdfRender.renderPage(
          doc.docId,
          pageIndex,
          actual.width,
        );
        const { width: w, height: h } = actual;
        return pixelDiffRatio(pixels(actual, w, h), pixels(expected, w, h));
      } finally {
        await pdfRender.close(doc.docId);
      }
    },
    {
      shot: [...shot],
      pdf: [...opts.exportBytes],
      pageIndex: opts.pageNumber - 1,
    },
  );
}
