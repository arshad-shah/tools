import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeFlatFormWord } from '../fixtures/flat-form';
import { makeTextPdf } from '../fixtures/builders';
import { expectAxeClean, setTheme, stabilise, VIEWPORTS } from './helpers';

/*
 * Signing+ (plan H-15): every signature panel tab, the Export dialog's
 * digital signature section and the Signatures panel (one valid
 * self-signed and one broken signature), in both themes, plus the phone
 * signature sheet. The camera is left idle: its later states depend on
 * the machine's devices.
 */
const pdf = (name: string, bytes: Uint8Array) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from(bytes),
});

async function openFile(
  page: Page,
  theme: 'light' | 'dark',
  file: ReturnType<typeof pdf>,
) {
  await page.goto('/pdf/edit/fill-sign');
  await setTheme(page, theme);
  await page.locator('input[type=file]').first().setInputFiles(file);
  await expect(
    page
      .locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]')
      .first(),
  ).toBeAttached({ timeout: 20_000 });
  await expect(page.getByText(/^Detecting fields, page/)).toHaveCount(0, {
    timeout: 20_000,
  });
  await stabilise(page);
}

async function signaturePanel(page: Page): Promise<Locator> {
  await page
    .getByRole('toolbar', { name: /Fill & Sign/ })
    .getByRole('button', { name: 'Signature', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: /Signature|Initials/ });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function drawStroke(page: Page, pad: Locator) {
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 110);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++)
    await page.mouse.move(
      box.x + 40 + i * 25,
      box.y + 110 - Math.sin(i / 2) * 40,
      { steps: 2 },
    );
  await page.mouse.up();
}

/**
 * One valid self-signed signature (made through the app's own export, as a
 * user would) and a copy with a changed byte.
 */
async function signedPair(page: Page) {
  await openFile(
    page,
    'light',
    pdf('plain.pdf', await makeTextPdf({ pages: 1 })),
  );
  await page
    .getByRole('button', { name: /^Export/ })
    .first()
    .click();
  const exp = page.getByRole('dialog', { name: 'Export PDF' });
  await exp.getByRole('switch', { name: 'Sign digitally (PAdES)' }).click();
  await exp.getByRole('button', { name: 'Choose certificate' }).click();
  const cert = page.getByRole('dialog', { name: 'Signing certificate' });
  await cert.getByRole('radio', { name: 'Create self-signed' }).click();
  await cert.getByLabel('Name', { exact: true }).fill('Jane Doe');
  await cert.getByRole('button', { name: 'Create certificate' }).click();
  await cert.getByRole('button', { name: 'Use this certificate' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exp.getByRole('button', { name: 'Sign and export' }).click(),
  ]);
  const signed = new Uint8Array(readFileSync((await download.path())!));
  const broken = signed.slice();
  // A byte of the binary header comment: inside the signed range, harmless
  // to the file's structure.
  broken[11] ^= 0x01;
  return { signed, broken };
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`signing ${theme}`, () => {
    test('signature panel tabs', async ({ page }) => {
      await openFile(
        page,
        theme,
        pdf('form.pdf', (await makeFlatFormWord()).bytes),
      );
      const dialog = await signaturePanel(page);
      await dialog.getByRole('tab', { name: 'Draw' }).click();
      await drawStroke(
        page,
        dialog.getByRole('img', { name: 'Draw your signature' }),
      );
      await expect(dialog).toHaveScreenshot(`signing-draw-${theme}.png`);
      await expectAxeClean(page);

      await dialog.getByRole('tab', { name: 'Type' }).click();
      await dialog.getByLabel('Your name').fill('Jane Doe');
      await expect(dialog.getByText(/^Loading /)).toHaveCount(0, {
        timeout: 15_000,
      });
      await expect(dialog).toHaveScreenshot(`signing-type-${theme}.png`);
      await expectAxeClean(page);

      await dialog.getByRole('tab', { name: 'Photo' }).click();
      await expect(dialog).toHaveScreenshot(`signing-photo-${theme}.png`);

      await dialog.getByRole('tab', { name: 'Initials' }).click();
      await expect(dialog).toHaveScreenshot(`signing-initials-${theme}.png`);

      await dialog.getByRole('tab', { name: 'Block' }).click();
      await expect(dialog).toHaveScreenshot(`signing-block-${theme}.png`, {
        // The date preview shows today's date.
        mask: [dialog.getByText(/\d{4}/)],
      });
      await expectAxeClean(page);
    });

    test('export digital signature section', async ({ page }) => {
      await openFile(
        page,
        theme,
        pdf('form.pdf', (await makeFlatFormWord()).bytes),
      );
      await page
        .getByRole('button', { name: /^Export/ })
        .first()
        .click();
      const exp = page.getByRole('dialog', { name: 'Export PDF' });
      await exp.getByRole('switch', { name: 'Sign digitally (PAdES)' }).click();
      const section = exp.getByRole('region', { name: 'Digital signature' });
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveScreenshot(
        `signing-export-section-${theme}.png`,
      );
      await expectAxeClean(page);
    });

    test('signatures panel', async ({ page }) => {
      test.setTimeout(120_000);
      const { signed, broken } = await signedPair(page);
      for (const [name, bytes] of [
        ['valid', signed],
        ['broken', broken],
      ] as const) {
        await openFile(page, theme, pdf(`${name}.pdf`, bytes));
        await page
          .getByRole('button', { name: /Signed/ })
          .first()
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Signatures in this document',
        });
        await expect(
          dialog.getByText('Revocation status is not checked.'),
        ).toBeVisible({
          timeout: 20_000,
        });
        await expect(dialog).toHaveScreenshot(
          `signing-signatures-${name}-${theme}.png`,
          {
            // Signing time and certificate dates come from the run.
            mask: [
              dialog.locator('[data-separator]').locator('..').locator('..'),
            ],
          },
        );
        await expectAxeClean(page);
      }
    });

    test('phone signature sheet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.phone);
      await openFile(
        page,
        theme,
        pdf('form.pdf', (await makeFlatFormWord()).bytes),
      );
      const dialog = await signaturePanel(page);
      await expect(
        dialog.getByRole('button', { name: 'Next place to sign' }),
      ).toBeEnabled();
      // The pointer rests where the toolbar button was: keep hover off.
      await page.mouse.move(0, 0);
      // The sheet only: the page canvas behind it repaints between runs.
      await expect(dialog).toHaveScreenshot(`signing-phone-${theme}.png`);
      await expectAxeClean(page);
    });
  });
}
