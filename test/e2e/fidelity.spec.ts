import { expect, test, type Page } from '@playwright/test';
import { encodePng } from '../fixtures/images';
import { compareOverlayWithExport } from '../visual-diff/overlay-vs-export';
import { exportPdf, openInWorkspace } from './workspace-helpers';

/*
 * Plan D-10 step 1 (spec §6.3 mitigation 3): for each op type, the overlay
 * preview and the exported page differ in at most 1.5% of pixels. Times and
 * Courier text are excluded: the overlay draws them with the system serif
 * and monospace faces (documented in plan D-4).
 */
const FILE = 'test/fixtures/generated/text-3.pdf';
const WORD = [72, 720, 152, 720, 72, 690, 152, 690];
const who = { author: 'Me', color: '#ff4d4d' };

/** A smooth image: resampling differences stay small (a noise image is all edges). */
function gradientPng(): Uint8Array {
  const w = 160;
  const h = 120;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      rgba.set([40 + x, 80 + y, 200 - x / 2, 255], (y * w + x) * 4);
  return encodePng(w, h, rgba);
}

type Case = {
  name: string;
  mode: RegExp;
  op: (pageId: string, asset: string) => object;
};

const CASES: Case[] = [
  ...(['Highlight', 'Underline', 'StrikeOut', 'Squiggly'] as const).map(
    (subtype) => ({
      name: `annot.markup ${subtype}`,
      mode: /Annotate/,
      op: (pageId: string) => ({
        type: 'annot.markup',
        params: {
          id: 'm',
          pageId,
          subtype,
          quads: [WORD],
          opacity: 1,
          contents: '',
          ...who,
        },
      }),
    }),
  ),
  {
    name: 'annot.note',
    mode: /Annotate/,
    op: (pageId) => ({
      type: 'annot.note',
      params: {
        id: 'n',
        pageId,
        at: [400, 600],
        icon: 'Comment',
        contents: 'Note',
        ...who,
      },
    }),
  },
  {
    name: 'annot.freetext',
    mode: /Annotate/,
    op: (pageId) => ({
      type: 'annot.freetext',
      params: {
        id: 'f',
        pageId,
        rect: { x: 100, y: 450, width: 220, height: 60 },
        text: 'A typed comment that wraps',
        fontSize: 14,
        align: 'left',
        border: true,
        ...who,
      },
    }),
  },
  {
    name: 'annot.ink',
    mode: /Annotate/,
    op: (pageId) => ({
      type: 'annot.ink',
      params: {
        id: 'i',
        pageId,
        strokes: [
          [
            [100, 300],
            [150, 360],
            [200, 300],
            [250, 360],
          ],
        ],
        width: 3,
        opacity: 1,
        ...who,
      },
    }),
  },
  ...(['Square', 'Circle'] as const).map((kind) => ({
    name: `annot.shape ${kind}`,
    mode: /Annotate/,
    op: (pageId: string) => ({
      type: 'annot.shape',
      params: {
        id: 's',
        pageId,
        kind,
        rect: { x: 300, y: 300, width: 160, height: 100 },
        width: 2,
        fill: null,
        ...who,
      },
    }),
  })),
  {
    name: 'annot.line arrow',
    mode: /Annotate/,
    op: (pageId) => ({
      type: 'annot.line',
      params: {
        id: 'l',
        pageId,
        from: [100, 200],
        to: [300, 260],
        width: 2,
        arrowEnd: true,
        ...who,
      },
    }),
  },
  {
    name: 'annot.stamp',
    mode: /Annotate/,
    op: (pageId) => ({
      type: 'annot.stamp',
      params: {
        id: 't',
        pageId,
        rect: { x: 300, y: 500, width: 180, height: 50 },
        preset: 'Approved',
        ...who,
      },
    }),
  },
  ...(['Helvetica', 'unicode'] as const).map((font) => ({
    name: `content.text ${font}`,
    mode: /Edit/,
    op: (pageId: string) => ({
      type: 'content.text',
      params: {
        id: 'x',
        pageId,
        rect: { x: 100, y: 450, width: 240, height: 80 },
        rotate: 0,
        text: 'Hello there, a text box',
        font,
        size: 18,
        color: '#1f2937',
        align: 'left',
        lineHeight: 1.2,
      },
    }),
  })),
  {
    name: 'content.image',
    mode: /Edit/,
    op: (pageId, asset) => ({
      type: 'content.image',
      params: {
        id: 'g',
        pageId,
        rect: { x: 200, y: 300, width: 160, height: 120 },
        rotate: 0,
        assetId: asset,
        mime: 'image/png',
        opacity: 1,
        keepAspect: false,
      },
    }),
  },
  ...(['rect', 'ellipse'] as const).map((kind) => ({
    name: `content.shape ${kind}`,
    mode: /Edit/,
    op: (pageId: string) => ({
      type: 'content.shape',
      params: {
        id: 'c',
        pageId,
        kind,
        rect: { x: 300, y: 300, width: 160, height: 100 },
        stroke: '#1f2937',
        fill: '#93c5fd',
        width: 2,
        opacity: 1,
        rotate: 0,
      },
    }),
  })),
  ...(['line', 'arrow'] as const).map((kind) => ({
    name: `content.shape ${kind}`,
    mode: /Edit/,
    op: (pageId: string) => ({
      type: 'content.shape',
      params: {
        id: 'c',
        pageId,
        kind,
        rect: { x: 98, y: 198, width: 204, height: 64 },
        from: [2 / 204, 2 / 64],
        to: [202 / 204, 62 / 64],
        stroke: '#1f2937',
        fill: null,
        width: 2,
        opacity: 1,
        rotate: 0,
      },
    }),
  })),
  {
    name: 'content.cover',
    mode: /Edit/,
    op: (pageId) => ({
      type: 'content.cover',
      params: {
        id: 'v',
        pageId,
        rect: { x: 66, y: 685, width: 120, height: 40 },
        fill: '#ffffff',
        text: 'Beta 1',
        font: 'Helvetica',
        size: 20,
        color: '#000000',
        align: 'left',
      },
    }),
  },
  {
    name: 'markup.watermark',
    mode: /Edit/,
    op: () => ({
      type: 'markup.watermark',
      params: {
        id: 'w',
        content: {
          kind: 'text',
          text: 'DRAFT',
          fontSize: 72,
          color: '#9ca3af',
        },
        opacity: 0.5,
        rotation: 45,
        position: 'center',
        margin: 24,
        pages: { mode: 'all' },
      },
    }),
  },
  {
    name: 'markup.pageNumbers',
    mode: /Edit/,
    op: () => ({
      type: 'markup.pageNumbers',
      params: {
        id: 'p',
        format: 'page-n',
        position: 'bottom-center',
        startAt: 1,
        pages: { mode: 'all' },
        fontSize: 12,
        margin: 24,
      },
    }),
  },
  {
    name: 'markup.headerFooter',
    mode: /Edit/,
    op: () => ({
      type: 'markup.headerFooter',
      params: {
        id: 'h',
        header: { left: 'Report', center: '', right: '{filename}' },
        footer: { left: '', center: 'Page {n} of {total}', right: '' },
        fontSize: 11,
        color: '#374151',
        margin: { top: 30, bottom: 30, side: 40 },
        pages: { mode: 'all' },
        filename: 'text-3.pdf',
        date: 0,
      },
    }),
  },
];

async function dispatch(page: Page, c: Case) {
  const png = [...gradientPng()];
  await page.waitForFunction(() => !!window.__workspaceTest);
  const { pageId, asset } = await page.evaluate((png) => {
    const hook = window.__workspaceTest!;
    return {
      pageId: hook.pageIds()[0],
      asset: hook.addAsset(new Uint8Array(png), 'image/png'),
    };
  }, png);
  const op = c.op(pageId, asset);
  await page.evaluate((op) => {
    window.__workspaceTest!.dispatch(op as never);
  }, op);
}

// The whole page slot must be on screen for its screenshot.
test.use({ viewport: { width: 1280, height: 1400 } });

for (const c of CASES)
  test(`overlay matches export: ${c.name}`, async ({ page }) => {
    await openInWorkspace(page, FILE, c.mode);
    await dispatch(page, c);
    // Let fonts, images and the text layer settle before the screenshot.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const bytes = await exportPdf(page);
    await page.keyboard.press('Escape');
    // Keep the pointer off the page so no hit area shows its hover tint,
    // and let the export toast leave.
    await page.mouse.move(1, 1);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
      timeout: 15_000,
    });
    const ratio = await compareOverlayWithExport(page, {
      pageNumber: 1,
      exportBytes: bytes,
      scale: 1,
    });
    expect(ratio, c.name).toBeLessThanOrEqual(0.015);
  });
