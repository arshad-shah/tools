import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { pdfPageTexts, textPositions } from '../fixtures/builders';

async function open(page: Page) {
  await page.goto('/pdf-sign');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('test/fixtures/generated/text-3.pdf');
  await expect(page.getByText('text-3.pdf', { exact: true })).toBeVisible();
  await expect(
    page.getByText('not a digital (certificate-based) signature', {
      exact: false,
    }),
  ).toBeVisible();
}

async function download(page: Page) {
  await page.getByRole('button', { name: 'Apply signature' }).click();
  const promise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download text-3.signed.pdf' })
    .click();
  const d = await promise;
  expect(d.suggestedFilename()).toBe('text-3.signed.pdf');
  return new Uint8Array(readFileSync((await d.path())!));
}

const pageImages = (doc: PDFDocument, i: number) => {
  const res = doc.getPage(i).node.Resources()!;
  const xo = res.lookupMaybe(PDFName.of('XObject'), PDFDict);
  return xo ? xo.keys().map((k) => xo.lookup(k) as PDFRawStream) : [];
};

test('draws a signature, nudges it with the keyboard, and stamps it', async ({
  page,
}) => {
  await open(page);
  const pad = page.getByRole('img', { name: 'Draw your signature' });
  // Screen readers get a role, and keyboard users are pointed to typing.
  await expect(pad).toHaveAccessibleDescription(/Type tab/);
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 100);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++)
    await page.mouse.move(
      box.x + 30 + i * 12,
      box.y + 100 + Math.sin(i / 2) * 30,
    );
  await page.mouse.up();
  const placement = page.getByRole('group', { name: /Signature placement/ });
  await expect(placement).toBeVisible();
  const before = await page.getByText(/^Position:/).textContent();
  await placement.focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(page.getByText(/^Position:/)).not.toHaveText(before!);
  const doc = await PDFDocument.load(await download(page));
  const [img] = pageImages(doc, 0);
  expect(img.dict.has(PDFName.of('SMask'))).toBe(true); // transparent ink PNG
  expect(pageImages(doc, 1)).toHaveLength(0);
});

test('types a name in a script font on page 2', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Type' }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Ada Lovelace');
  await page.getByLabel('Font', { exact: true }).selectOption('great-vibes');
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  const texts = await pdfPageTexts(await download(page));
  expect(texts[1]).toContain('Ada Lovelace');
  expect(texts[0]).not.toContain('Ada');
});

test('uploads a JPEG and removes its white background', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Upload' }).click();
  await page.getByRole('switch', { name: 'Remove white background' }).click();
  await page
    .locator('input[type=file]')
    .last()
    .setInputFiles('test/fixtures/generated/signature.jpg');
  await expect(
    page.getByRole('img', { name: 'Signature preview' }),
  ).toBeVisible();
  const doc = await PDFDocument.load(await download(page));
  const [img] = pageImages(doc, 0);
  expect(img.dict.has(PDFName.of('SMask'))).toBe(true); // converted to PNG with alpha
});

test('drags and corner-resizes the placement box with the pointer', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('tab', { name: 'Type' }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Ada');
  const placement = page.getByRole('group', { name: /Signature placement/ });
  await expect(placement).toBeVisible();
  const position = page.getByText(/^Position:/);
  const parse = async () => {
    const m = /Position: (\d+), (\d+) pt · Size: (\d+) × (\d+) pt/.exec(
      (await position.textContent()) ?? '',
    )!;
    return m.slice(1).map(Number);
  };
  const [x0, y0, w0] = await parse();

  // Drag from the middle of the box, up and to the left.
  await placement.scrollIntoViewIfNeeded();
  const b = (await placement.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++)
    await page.mouse.move(
      b.x + b.width / 2 - i * 10,
      b.y + b.height / 2 - i * 10,
    );
  await page.mouse.up();
  await expect.poll(async () => (await parse())[0]).toBeLessThan(x0 - 50);
  const [, y1] = await parse();
  expect(y1).toBeLessThan(y0 - 50);
  // The box keeps focus after the gesture, so the arrow keys work straight away.
  await expect(placement).toBeFocused();
  const [xDragged] = await parse();
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(async () => (await parse())[0]).toBe(xDragged + 10);

  // Shrink from the bottom-right corner handle (aspect ratio is kept).
  const handle = placement.locator('[data-handle="se"]');
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++)
    await page.mouse.move(h.x + h.width / 2 - i * 4, h.y + h.height / 2);
  await page.mouse.up();
  await expect.poll(async () => (await parse())[2]).toBeLessThan(w0 - 20);

  const texts = await pdfPageTexts(await download(page));
  expect(texts[0]).toContain('Ada');
});

test('typed preview and stamped text fill the same box', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Type' }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Ada Lovelace');
  await page.getByLabel('Font', { exact: true }).selectOption('great-vibes');
  const placement = page.getByRole('group', { name: /Signature placement/ });
  await expect(placement).toBeVisible();

  // Inked pixel bounds of the preview canvas, relative to the box (CSS px).
  const previewInk = await placement.locator('canvas').evaluate(async (c) => {
    const canvas = c as HTMLCanvasElement;
    const read = () => {
      const { width, height } = canvas;
      const data = canvas
        .getContext('2d')!
        .getImageData(0, 0, width, height).data;
      let x0 = width,
        y0 = height,
        x1 = -1,
        y1 = -1;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          if (data[(y * width + x) * 4 + 3] > 0) {
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
      return { x0, y0, x1, y1, width, height };
    };
    let r = read();
    for (let i = 0; i < 50 && r.x1 < 0; i++) {
      await new Promise((ok) => requestAnimationFrame(ok));
      r = read();
    }
    return r;
  });
  const fillsW = previewInk.x0 <= 3 && previewInk.x1 >= previewInk.width - 4;
  const fillsH = previewInk.y0 <= 3 && previewInk.y1 >= previewInk.height - 4;
  expect(fillsW || fillsH).toBe(true);

  const [x, y, w, h] = /Position: (\d+), (\d+) pt · Size: (\d+) × (\d+) pt/
    .exec((await page.getByText(/^Position:/).textContent())!)!
    .slice(1)
    .map(Number);
  const out = await download(page);
  const t = (await textPositions(out, 0)).find((i) => i.str.startsWith('Ada'))!;
  // The baseline sits inside the placed box (readout is rounded to 1 pt).
  expect(t.x).toBeGreaterThanOrEqual(x - 1);
  expect(t.x).toBeLessThanOrEqual(x + w);
  expect(t.y).toBeGreaterThanOrEqual(y - 1);
  expect(t.y).toBeLessThanOrEqual(y + h + 1);
});

test('flags characters the signature font cannot draw while typing', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('tab', { name: 'Type' }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Łukasz');
  await expect(
    page.getByRole('alert').getByText("Dancing Script can't draw: Ł", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Apply signature' }),
  ).toBeDisabled();
  await page.getByLabel('Your name', { exact: true }).fill('Lukasz');
  await expect(
    page.getByRole('button', { name: 'Apply signature' }),
  ).toBeEnabled();
});

test('keeps every pointer sample, even when events arrive between renders', async ({
  page,
}) => {
  await open(page);
  const pad = page.getByLabel('Draw your signature', { exact: true });
  // One task: React has no chance to re-render between these events.
  await pad.evaluate((canvas) => {
    const r = canvas.getBoundingClientRect();
    const fire = (type: string, x: number) =>
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          buttons: 1,
          clientX: r.left + x,
          clientY: r.top + 80,
        }),
      );
    fire('pointerdown', 20);
    for (let x = 30; x <= 320; x += 10) fire('pointermove', x);
    fire('pointerup', 320);
  });
  await expect(page.getByText(/^Position:/)).toBeVisible();
  const [, , w, h] = /Position: (\d+), (\d+) pt · Size: (\d+) × (\d+) pt/
    .exec((await page.getByText(/^Position:/).textContent())!)!
    .slice(1)
    .map(Number);
  // A 300 px horizontal line, not a dot.
  expect(w / h).toBeGreaterThan(8);
});
