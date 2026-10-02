import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

/*
 * Keyboard-only workspace flow (spec §13.2, plan G-3): the skip link, the
 * page rail, a rotate with its live announcement, a form field filled with
 * Tab and Enter, and Export with Mod+S, without the mouse. The file itself
 * is chosen through the file input (the system picker is outside the page).
 */
const TEXT = 'test/fixtures/generated/text-3.pdf';
const FORM = 'test/fixtures/generated/form.pdf';
const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
const rendered = (page: Page) =>
  page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]');
const rail = (page: Page) => page.getByRole('listbox', { name: 'Pages' });
const announcer = (page: Page) => page.getByTestId('workspace-announcer');

async function open(page: Page, file: string, path = '/pdf/edit') {
  await page.goto(path);
  await page.locator('input[type=file]').first().setInputFiles(file);
  // First render of a fresh document: a budget for a loaded runner.
  await expect(rendered(page)).toBeAttached({ timeout: 15_000 });
}

/** Presses Tab until the target has focus (fails after `max` presses). */
async function tabTo(page: Page, target: Locator, max = 80) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

async function exportWithKeys(page: Page) {
  await page.keyboard.press(`${mod}+s`);
  const dialog = page.getByRole('dialog', { name: 'Export PDF' });
  await expect(dialog).toBeVisible();
  const go = dialog.getByRole('button', { name: 'Export', exact: true });
  await tabTo(page, go);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.keyboard.press('Enter'),
  ]);
  return new Uint8Array(readFileSync((await download.path())!));
}

test('landmarks: one banner and one main; rail and inspector are named complementary regions', async ({
  page,
}) => {
  await open(page, TEXT);
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  const regions = page.getByRole('complementary');
  expect(await regions.count()).toBeGreaterThanOrEqual(1);
  for (const r of await regions.all())
    expect(await r.getAttribute('aria-label')).toBeTruthy();
});

test('skip link, rail rotate with its announcement, undo, and export by keyboard', async ({
  page,
}) => {
  await open(page, TEXT);
  await page.locator('body').focus();
  const skip = page.getByRole('link', { name: 'Skip to the document' });
  await tabTo(page, skip);
  await page.keyboard.press('Enter');
  await expect(skip).not.toBeFocused();

  // Into the rail, down to page 2, rotate it with R.
  const first = rail(page).getByRole('option', { name: /^Page 1 of 3/ });
  await tabTo(
    page,
    rail(page).getByRole('option').and(page.locator('[tabindex="0"]')),
  );
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const second = rail(page).getByRole('option', { name: /^Page 2 of 3/ });
  await expect(second).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('r');
  await expect(
    page.getByRole('button', { name: 'Undo Rotate page 2 clockwise' }),
  ).toBeAttached();
  await page.keyboard.press(`${mod}+z`);
  await expect(announcer(page)).toHaveText('Undid: rotate page 2 clockwise');
  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(announcer(page)).toHaveText('Redid: rotate page 2 clockwise');

  const bytes = await exportWithKeys(page);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPage(1).getRotation().angle).toBe(90);
});

test('a form field filled with Tab and Enter, then exported by keyboard', async ({
  page,
}) => {
  await open(page, FORM, '/pdf/edit/fill-sign');
  const field = page.getByRole('button', { name: 'Text field: name, empty' });
  await tabTo(page, field);
  await page.keyboard.press('Enter');
  const input = page
    .getByTestId('field-widget:name:0')
    .getByRole('textbox', { name: 'name' });
  await expect(input).toBeFocused();
  await page.keyboard.type('Ada Lovelace');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Text field: name, filled' }),
  ).toBeAttached();

  const bytes = await exportWithKeys(page);
  const form = (await PDFDocument.load(bytes)).getForm();
  expect(form.getTextField('name').getText()).toBe('Ada Lovelace');
});

test('a text box added from the toolbar is placed and moved with the arrows', async ({
  page,
}) => {
  await open(page, FORM, '/pdf/edit/fill-sign');
  const toolbar = page.getByRole('toolbar', { name: /Fill & Sign/ });
  // The split item's main button; ArrowDown on it opens its menu.
  const options = toolbar
    .getByRole('button', {
      name: /^Add field/,
      exact: false,
    })
    .and(page.locator(':not([aria-haspopup])'));
  // One tab stop for the toolbar (roving focus); arrows move inside it.
  await tabTo(page, toolbar.locator('[tabindex="0"]').first());
  for (let i = 0; i < 20; i++) {
    if (await options.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('ArrowRight');
  }
  await expect(options).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const centre = page.getByRole('menuitem', { name: 'Add at page centre' });
  await expect(centre).toBeVisible();
  // The menu focuses its first item; arrows walk to "Add at page centre".
  for (let i = 0; i < 6; i++) {
    if (await centre.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('ArrowDown');
  }
  await expect(centre).toBeFocused();
  await page.keyboard.press('Enter');
  const frame = page.getByRole('group', {
    name: 'Resize Text field: unlabelled, empty',
  });
  await expect(frame).toBeFocused();
  const before = (await frame.boundingBox())!;
  await page.keyboard.press('Alt+ArrowRight');
  await expect
    .poll(async () => (await frame.boundingBox())!.width)
    .toBeGreaterThan(before.width);
});
