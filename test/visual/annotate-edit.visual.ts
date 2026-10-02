import { expect, test, type Page } from '@playwright/test';
import { makeTextPdf } from '../fixtures/builders';
import { makeAnnotatedPdf } from '../fixtures/annotated';
import { expectAxeClean, setTheme, stabilise } from './helpers';

/*
 * Annotate and Edit modes (plan D-10 step 4): both themes on desktop, Focus,
 * the comments panel and the watermark form. Relative times are masked.
 */
const pdf = async (name: string, bytes: Promise<Uint8Array>) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from(await bytes),
});
const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');

async function open(
  page: Page,
  theme: 'light' | 'dark',
  file: Promise<{ name: string; mimeType: string; buffer: Buffer }>,
  mode: RegExp,
) {
  await page.goto('/pdf/edit');
  await setTheme(page, theme);
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(await file);
  // A cold dev server compiles the workspace on first use: a budget, not a retry.
  await expect(rendered(page)).toBeAttached({ timeout: 60_000 });
  await page.getByRole('tab', { name: mode }).click();
  await page.waitForFunction(() => !!window.__workspaceTest);
}

async function dispatch(page: Page, ops: object[]) {
  await page.evaluate((ops) => {
    const hook = window.__workspaceTest!;
    const pageId = hook.pageIds()[0];
    for (const op of ops)
      hook.dispatch(JSON.parse(JSON.stringify(op).replaceAll('PAGE', pageId)));
  }, ops);
}

/** No hover tooltips, and autosave settled, before the shot. */
async function settle(page: Page) {
  await page.mouse.move(1, 1);
  await expect(
    page
      .getByText('Saved on this device')
      .or(page.getByRole('img', { name: 'Saved on this device' }))
      .first(),
  ).toBeVisible();
  await stabilise(page);
}

const who = { author: 'Me', color: '#ff4d4d' };
const ANNOTATIONS = [
  {
    type: 'annot.markup',
    params: {
      id: 'm',
      pageId: 'PAGE',
      subtype: 'Highlight',
      quads: [[72, 720, 152, 720, 72, 690, 152, 690]],
      opacity: 1,
      contents: 'Alpha 1',
      author: 'Me',
      color: '#ffd400',
    },
  },
  {
    type: 'annot.note',
    params: {
      id: 'n',
      pageId: 'PAGE',
      at: [420, 600],
      icon: 'Comment',
      contents: 'Check this figure',
      ...who,
    },
  },
  {
    type: 'annot.shape',
    params: {
      id: 's',
      pageId: 'PAGE',
      kind: 'Square',
      rect: { x: 300, y: 300, width: 160, height: 100 },
      width: 2,
      fill: null,
      ...who,
    },
  },
  {
    type: 'annot.stamp',
    params: {
      id: 't',
      pageId: 'PAGE',
      rect: { x: 80, y: 480, width: 180, height: 50 },
      preset: 'Approved',
      ...who,
    },
  },
];
const CONTENT = [
  {
    type: 'content.text',
    params: {
      id: 'x',
      pageId: 'PAGE',
      rect: { x: 72, y: 560, width: 260, height: 60 },
      rotate: 0,
      text: 'A new paragraph of text',
      font: 'Helvetica',
      size: 18,
      color: '#1f2937',
      align: 'left',
      lineHeight: 1.2,
    },
  },
  {
    type: 'content.shape',
    params: {
      id: 'c',
      pageId: 'PAGE',
      kind: 'ellipse',
      rect: { x: 320, y: 420, width: 160, height: 100 },
      stroke: '#1f2937',
      fill: '#93c5fd',
      width: 2,
      opacity: 1,
      rotate: 0,
    },
  },
  {
    type: 'markup.headerFooter',
    params: {
      id: 'h',
      header: { left: 'Report', center: '', right: '' },
      footer: { left: '', center: 'Page {n} of {total}', right: '' },
      fontSize: 11,
      color: '#374151',
      margin: { top: 30, bottom: 30, side: 40 },
      pages: { mode: 'all' },
      filename: 'text-3.pdf',
      date: 0,
    },
  },
];

/*
 * A cold dev server optimises the modes' dependencies on first use and
 * reloads the page, which drops a file chosen before the reload. Open both
 * modes once before the shots so that reload happens here, not mid-test.
 */
test.beforeAll(async ({ browser }, info) => {
  test.setTimeout(180_000);
  const page = await browser.newPage({ baseURL: info.project.use.baseURL });
  try {
    for (const mode of [/Annotate/, /Edit/]) {
      await page.goto('/pdf/edit', { waitUntil: 'networkidle' });
      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles(await pdf('warm.pdf', makeTextPdf({ pages: 1 })));
      await expect(rendered(page)).toBeAttached({ timeout: 90_000 });
      await page.getByRole('tab', { name: mode }).click();
      await page.waitForLoadState('networkidle');
    }
  } finally {
    await page.close();
  }
});

for (const theme of ['light', 'dark'] as const) {
  test.describe(`annotate and edit ${theme}`, () => {
    // Room for the first-render budget on a cold dev server.
    test.setTimeout(90_000);
    test('annotate with comments panel', async ({ page }) => {
      await open(
        page,
        theme,
        pdf('annotated.pdf', makeAnnotatedPdf()),
        /Annotate/,
      );
      await dispatch(page, ANNOTATIONS);
      await expect(
        page.getByRole('list', { name: 'Annotations' }),
      ).toBeVisible();
      await expect(
        page
          .getByTestId('comment-row')
          .filter({ hasText: 'Check this figure' }),
      ).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`annotate-${theme}.png`);
      await expectAxeClean(page);
    });

    test('annotate focus', async ({ page }) => {
      await open(
        page,
        theme,
        pdf('text-3.pdf', makeTextPdf({ pages: 3, label: 'Alpha' })),
        /Annotate/,
      );
      await dispatch(page, ANNOTATIONS);
      await page.keyboard.press('f');
      await expect(
        page.getByRole('toolbar', { name: 'Annotate tools' }),
      ).toBeVisible();
      // The pinned inspector opens as a popover in Focus; its anchoring is
      // P5-B's (minors backlog). The shot covers the canvas and palette.
      await expect(
        page.getByRole('list', { name: 'Annotations' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('list', { name: 'Annotations' }),
      ).toBeHidden();
      await settle(page);
      await expect(page).toHaveScreenshot(`annotate-focus-${theme}.png`);
      await expectAxeClean(page);
    });

    test('edit with content and the watermark form', async ({ page }) => {
      await open(
        page,
        theme,
        pdf('text-3.pdf', makeTextPdf({ pages: 3, label: 'Alpha' })),
        /Edit/,
      );
      await dispatch(page, CONTENT);
      await page
        .getByRole('toolbar')
        .getByRole('button', { name: 'Watermark', exact: true })
        .click();
      await expect(page.getByLabel('Watermark text')).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`edit-watermark-form-${theme}.png`);
      await expectAxeClean(page);
    });
  });
}
