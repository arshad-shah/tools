import { expect, test, type Locator, type Page } from '@playwright/test';
import { drag, openInWorkspace, slotOf, xy } from './workspace-helpers';

/*
 * The shared object model (FIX-OVERLAYS): every placed overlay type can be
 * placed, moved by dragging, resized from a handle, deleted with the
 * keyboard and brought back with undo.
 */
const TEXT = 'test/fixtures/generated/text-3.pdf';

const toolbarButton = (page: Page, name: string | RegExp) =>
  page.getByRole('toolbar').getByRole('button', { name, exact: true });

/** The placed object on page 1 by its accessible name. */
const objectOn = (page: Page, name: string | RegExp) =>
  page
    .getByTestId('objects-page-1')
    .getByRole('button', { name, exact: typeof name === 'string' });

const centre = (b: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});

async function boxOf(l: Locator) {
  const b = await l.boundingBox();
  if (!b) throw new Error('object is not on screen');
  return b;
}

/** Page point (612 x 792 upright page) to a screen point, measured now. */
async function at(page: Page, x: number, y: number) {
  return (await slotOf(page)).at(x, y);
}

/** Waits until the page slot stops moving (an inspector opening or closing). */
async function settled(page: Page) {
  let last = '';
  for (let i = 0; i < 40; i++) {
    const b = await boxOf(page.getByTestId('page-slot-1'));
    const now = `${b.x},${b.y},${b.width}`;
    if (now === last) return;
    last = now;
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    );
  }
}

/** An object's box in page points from the slot's top-left corner. */
async function pageBox(page: Page, l: Locator) {
  const s = await slotOf(page);
  const b = await boxOf(l);
  return {
    x: (b.x - s.box.x) / s.scale,
    y: (b.y - s.box.y) / s.scale,
    width: b.width / s.scale,
    height: b.height / s.scale,
    scale: s.scale,
  };
}

/**
 * Select, drag to move, drag the bottom-right handle to resize (when it
 * has handles), Delete, then undo the delete. Measured in page points: the
 * canvas may resize when the inspector opens for a selection.
 */
async function moveResizeDeleteUndo(
  page: Page,
  obj: Locator,
  { resize = true }: { resize?: boolean } = {},
) {
  await expect(obj).toHaveCount(1);
  await obj.click();
  await expect(obj).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  await obj.scrollIntoViewIfNeeded();
  const p0 = await pageBox(page, obj);
  const from = centre(await boxOf(obj));
  await drag(page, from, { x: from.x + 40, y: from.y + 30 });
  await settled(page);
  const p1 = await pageBox(page, obj);
  expect(p1.x - p0.x).toBeCloseTo(40 / p0.scale, 0);
  expect(p1.y - p0.y).toBeCloseTo(30 / p0.scale, 0);
  const frame = page.getByTestId('selection-frame');
  await expect(frame).toHaveCount(1);
  if (resize) {
    const handle = frame.locator('[data-handle="se"]');
    await handle.scrollIntoViewIfNeeded();
    const h = centre(await boxOf(handle));
    await drag(page, h, { x: h.x + 30, y: h.y + 20 });
    await settled(page);
    const p2 = await pageBox(page, obj);
    expect(p2.width - p1.width).toBeGreaterThan(5);
  } else {
    await expect(frame.locator('[data-handle]')).toHaveCount(0);
  }
  const p2 = await pageBox(page, obj);
  await obj.focus();
  await page.keyboard.press('Delete');
  await expect(obj).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(obj).toHaveCount(1);
  await settled(page);
  const p3 = await pageBox(page, obj);
  expect(p3.x).toBeCloseTo(p2.x, 0);
  expect(p3.width).toBeCloseTo(p2.width, 0);
}

test.describe('Edit objects', () => {
  test.beforeEach(async ({ page }) => {
    await openInWorkspace(page, TEXT, /Edit/);
  });

  test('a text box', async ({ page }) => {
    await toolbarButton(page, 'Text').click();
    await page.mouse.click(...xy(await at(page, 100, 560)));
    await page
      .getByRole('textbox', { name: 'Text', exact: true })
      .fill('Hello');
    await page.getByRole('button', { name: 'Add text' }).click();
    await moveResizeDeleteUndo(page, objectOn(page, 'Text box: Hello'));
  });

  test('an image', async ({ page }) => {
    await page
      .locator('input[type=file][accept*="image/png"]')
      .setInputFiles('test/fixtures/generated/photo.png');
    await expect(toolbarButton(page, 'Image')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.mouse.click(...xy(await at(page, 300, 500)));
    await toolbarButton(page, 'Select').click();
    await moveResizeDeleteUndo(page, objectOn(page, 'Image'));
  });

  test('a shape', async ({ page }) => {
    await toolbarButton(page, 'Shape: Rectangle').click();
    await drag(page, await at(page, 100, 600), await at(page, 220, 530));
    await toolbarButton(page, 'Select').click();
    await moveResizeDeleteUndo(page, objectOn(page, 'Rectangle'));
  });

  test('a cover and replace box', async ({ page }) => {
    await toolbarButton(page, 'Cover and replace').click();
    await drag(page, await at(page, 70, 720), await at(page, 250, 690));
    await page
      .getByRole('textbox', { name: 'Replacement text' })
      .fill('New words');
    await page.getByRole('button', { name: 'Cover', exact: true }).click();
    await toolbarButton(page, 'Select').click();
    await moveResizeDeleteUndo(page, objectOn(page, 'Cover: New words'));
  });

  test('marquee, Shift-click, the object menu and arrows', async ({ page }) => {
    await toolbarButton(page, 'Shape: Rectangle').click();
    await drag(page, await at(page, 100, 400), await at(page, 160, 360));
    await drag(page, await at(page, 300, 400), await at(page, 360, 360));
    await toolbarButton(page, 'Select').click();
    const shapes = page.getByTestId('objects-page-1').getByRole('button', {
      name: 'Rectangle',
    });
    await expect(shapes).toHaveCount(2);
    // Marquee from empty page space around both.
    await drag(page, await at(page, 80, 420), await at(page, 400, 340));
    await expect(page.getByTestId('selection-frame')).toHaveCount(2);
    // Esc deselects.
    await shapes.first().focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('selection-frame')).toHaveCount(0);
    // Shift-click builds a selection; arrows move both.
    await shapes.nth(0).click();
    await shapes.nth(1).click({ modifiers: ['Shift'] });
    await expect(page.getByTestId('selection-frame')).toHaveCount(2);
    const before = await boxOf(shapes.nth(1));
    await page.keyboard.press('Shift+ArrowRight');
    await expect
      .poll(async () => (await boxOf(shapes.nth(1))).x - before.x)
      .toBeGreaterThan(5);
    // Right-click: Duplicate makes copies.
    await shapes.nth(1).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(shapes).toHaveCount(4);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(shapes).toHaveCount(2);
  });
});

/** The only placed object on page 1. */
const onlyObject = (page: Page) =>
  page.getByTestId('objects-page-1').getByTestId('overlay-object');

test.describe('Annotate objects', () => {
  test.beforeEach(async ({ page }) => {
    await openInWorkspace(page, TEXT, /Annotate/);
  });

  /** Picks a drawing tool and waits for its pointer layer. */
  async function drawWith(page: Page, name: string) {
    await toolbarButton(page, name).click();
    await expect(page.getByTestId('annotate-draw-1')).toBeAttached();
  }

  const selectTool = (page: Page) => toolbarButton(page, 'Select').click();

  test('a highlight', async ({ page }) => {
    await toolbarButton(page, 'Highlight').click();
    const word = page
      .locator('[data-testid="page-slot-1"] .pdf-text-layer span')
      .first();
    const w = await boxOf(word);
    await drag(
      page,
      { x: w.x + 1, y: w.y + w.height / 2 },
      { x: w.x + w.width - 1, y: w.y + w.height / 2 },
    );
    await expect(
      page.getByRole('button', { name: 'Undo Highlight text on page 1' }),
    ).toBeAttached();
    await selectTool(page);
    await moveResizeDeleteUndo(page, onlyObject(page));
  });

  test('a note (moves, fixed size)', async ({ page }) => {
    await drawWith(page, 'Note');
    await page.mouse.click(...xy(await at(page, 300, 600)));
    await page.getByRole('textbox', { name: 'New note' }).fill('Why?');
    await page.getByRole('button', { name: 'Save' }).click();
    await selectTool(page);
    await moveResizeDeleteUndo(page, onlyObject(page), { resize: false });
  });

  for (const [name, a, b] of [
    ['Pen', [100, 560], [200, 620]],
    ['Rectangle', [100, 560], [220, 620]],
    ['Ellipse', [100, 560], [220, 620]],
    ['Line', [100, 560], [220, 620]],
    ['Arrow', [100, 560], [220, 620]],
    ['Text comment', [100, 560], [260, 620]],
  ] as const) {
    test(`${name} annotation`, async ({ page }) => {
      await drawWith(page, name);
      await drag(page, await at(page, a[0], a[1]), await at(page, b[0], b[1]));
      if (name === 'Text comment') {
        await page
          .getByRole('textbox', { name: 'Text comment' })
          .fill('Look here');
        await page.getByRole('button', { name: 'Save' }).click();
      }
      await selectTool(page);
      await moveResizeDeleteUndo(page, onlyObject(page));
    });
  }

  test('a stamp', async ({ page }) => {
    await drawWith(page, 'Stamp: Approved');
    await page.mouse.click(...xy(await at(page, 300, 560)));
    await selectTool(page);
    await moveResizeDeleteUndo(page, onlyObject(page));
  });

  test('double-click edits a text comment', async ({ page }) => {
    await drawWith(page, 'Text comment');
    await drag(page, await at(page, 100, 560), await at(page, 260, 620));
    await page.getByRole('textbox', { name: 'Text comment' }).fill('Before');
    await page.getByRole('button', { name: 'Save' }).click();
    await selectTool(page);
    await onlyObject(page).dblclick();
    await page.getByRole('textbox', { name: 'Edit comment' }).fill('After');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(onlyObject(page)).toHaveAccessibleName(/After$/);
  });
});

test('Redact: a marked area', async ({ page }) => {
  await openInWorkspace(page, TEXT, /Redact/);
  await toolbarButton(page, 'Mark area').click();
  await drag(page, await at(page, 300, 500), await at(page, 420, 440));
  const mark = page.getByTestId('redact-mark');
  await expect(mark).toHaveCount(0);
  // Leave the drawing tool: the mark becomes a placed object.
  await toolbarButton(page, 'Mark area').click();
  await moveResizeDeleteUndo(page, mark);
});

test.describe('Fill & Sign objects', () => {
  test.beforeEach(async ({ page }) => {
    await openInWorkspace(page, TEXT, /Fill/);
  });

  const fillTool = (page: Page, name: string) =>
    page
      .getByRole('toolbar', { name: /Fill & Sign/ })
      .getByRole('button', { name, exact: true });

  test('a text box', async ({ page }) => {
    await fillTool(page, 'Text').click();
    await page.mouse.click(...xy(await at(page, 200, 560)));
    const input = page.locator('[data-state="focused"] input');
    await expect(input).toBeFocused();
    await input.fill('Hello');
    await input.press('Enter');
    const box = objectOn(page, 'Text field: Text, filled');
    await expect(box).toBeFocused();
    await moveResizeDeleteUndo(page, box);
  });

  test('a date', async ({ page }) => {
    await fillTool(page, 'Date').click();
    await page.mouse.click(...xy(await at(page, 200, 560)));
    const input = page.locator('[data-state="focused"] input');
    await expect(input).toBeFocused();
    await input.fill('2026-10-02');
    await input.press('Enter');
    await moveResizeDeleteUndo(page, objectOn(page, /^Date field: /));
  });

  for (const name of ['Tick', 'Cross']) {
    test(`a ${name.toLowerCase()}`, async ({ page }) => {
      await fillTool(page, name).click();
      await page.mouse.click(...xy(await at(page, 300, 560)));
      await fillTool(page, name).click();
      await moveResizeDeleteUndo(
        page,
        objectOn(page, `Tick field: ${name}, filled`),
      );
    });
  }

  for (const role of ['Signature', 'Initials']) {
    test(`a typed ${role.toLowerCase()} (moves, resizes, rotates)`, async ({
      page,
    }) => {
      await fillTool(page, role).click();
      const dialog = page.getByRole('dialog', { name: role });
      if (role === 'Initials') {
        await dialog.getByRole('tab', { name: 'Initials' }).click();
        await dialog.getByLabel('Initials', { exact: true }).fill('JD');
        await dialog.getByRole('radio', { name: 'Great Vibes' }).click();
      } else {
        await dialog.getByRole('tab', { name: 'Type' }).click();
        await dialog.getByLabel('Your name').fill('Jane Doe');
      }
      await dialog
        .getByRole('button', { name: 'Place at page centre' })
        .click();
      await expect(dialog).toHaveCount(0);
      const sig = objectOn(page, `${role} on page 1`);
      await expect(sig).toBeFocused();
      // ] turns it 15 degrees (one undo step).
      await page.keyboard.press(']');
      await expect(sig).toHaveAttribute('style', /rotate\(15deg\)/);
      await page.keyboard.press('ControlOrMeta+z');
      await expect(sig).not.toHaveAttribute('style', /rotate/);
      await moveResizeDeleteUndo(page, sig);
    });
  }

  /** Opens the signature dialog with a typed signature made. */
  async function typedSignature(page: Page) {
    await fillTool(page, 'Signature').click();
    const dialog = page.getByRole('dialog', { name: 'Signature' });
    await dialog.getByRole('tab', { name: 'Type' }).click();
    await dialog.getByLabel('Your name').fill('Jane Doe');
    return dialog;
  }

  test('a signature block', async ({ page }) => {
    const dialog = await typedSignature(page);
    await dialog.getByRole('tab', { name: 'Block' }).click();
    await dialog.getByRole('button', { name: 'Place block' }).click();
    await expect(dialog).toHaveCount(0);
    await moveResizeDeleteUndo(
      page,
      objectOn(page, 'Signature block on page 1'),
    );
  });

  test('initials on several pages are picked and deleted, not moved', async ({
    page,
  }) => {
    await fillTool(page, 'Initials').click();
    const dialog = page.getByRole('dialog', { name: 'Initials' });
    await dialog.getByLabel('Initials', { exact: true }).fill('JD');
    await dialog.getByRole('radio', { name: 'Great Vibes' }).click();
    await dialog.getByRole('button', { name: 'Initial pages' }).click();
    const pages = page.getByRole('dialog', { name: 'Initial pages' });
    await pages.getByRole('radio', { name: 'Every page' }).check();
    await pages.getByRole('button', { name: /^Initial \d+ pages$/ }).click();
    await expect(pages).toHaveCount(0);
    const initials = objectOn(page, 'Initials on page 1, on several pages');
    await initials.scrollIntoViewIfNeeded();
    await initials.click();
    await expect(initials).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByTestId('selection-frame').locator('[data-handle]'),
    ).toHaveCount(0);
    await page.keyboard.press('Delete');
    await expect(initials).toHaveCount(0);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(initials).toHaveCount(1);
  });

  test('the object menu opens on right-click and deletes', async ({ page }) => {
    await fillTool(page, 'Tick').click();
    await page.mouse.click(...xy(await at(page, 300, 560)));
    await fillTool(page, 'Tick').click();
    const tick = objectOn(page, 'Tick field: Tick, filled');
    await tick.click({ button: 'right' });
    const menu = page.getByRole('menu', { name: 'Object actions' });
    await expect(
      menu.getByRole('menuitem', { name: 'Duplicate' }),
    ).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(tick).toHaveCount(0);
  });
});

test('hit-testing follows the pointer on a rotated page, zoomed in', async ({
  page,
}) => {
  await openInWorkspace(page, TEXT);
  const rail = page.getByRole('listbox', { name: 'Pages' });
  await rail.getByRole('option', { name: /^Page 1 of 3/ }).click();
  await page.keyboard.press('r');
  await expect(
    page.getByRole('button', { name: 'Undo Rotate page 1 clockwise' }),
  ).toBeAttached();
  await page.getByRole('tab', { name: /Edit/ }).click();
  await page.keyboard.press('ControlOrMeta+1');
  await page.keyboard.press('ControlOrMeta+=');
  await page.keyboard.press('ControlOrMeta+=');
  await settled(page);
  await toolbarButton(page, 'Text').click();
  const slot = await boxOf(page.getByTestId('page-slot-1'));
  await page.mouse.click(slot.x + 200, slot.y + 200);
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('Turned');
  await page.getByRole('button', { name: 'Add text' }).click();
  const obj = objectOn(page, 'Text box: Turned');
  await expect(obj).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  await obj.scrollIntoViewIfNeeded();
  const b0 = await boxOf(obj);
  const from = centre(b0);
  await drag(page, from, { x: from.x + 40, y: from.y + 30 });
  // The object lands where the pointer let go, on screen.
  await expect.poll(async () => (await boxOf(obj)).x - b0.x).toBeCloseTo(40, 0);
  expect((await boxOf(obj)).y - b0.y).toBeCloseTo(30, 0);
  const handle = page
    .getByTestId('selection-frame')
    .locator('[data-handle="se"]');
  const h = centre(await boxOf(handle));
  const b1 = await boxOf(obj);
  await drag(page, h, { x: h.x + 30, y: h.y + 20 });
  await expect
    .poll(async () => (await boxOf(obj)).width - b1.width)
    .toBeCloseTo(30, 0);
  expect((await boxOf(obj)).x).toBeCloseTo(b1.x, 0);
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('a finger drags an object; handles are 44px on a coarse pointer', async ({
    page,
  }) => {
    await openInWorkspace(page, TEXT, /Edit/);
    await toolbarButton(page, 'Text').click();
    await page.mouse.click(...xy(await at(page, 100, 560)));
    await page
      .getByRole('textbox', { name: 'Text', exact: true })
      .fill('Touch');
    await page.getByRole('button', { name: 'Add text' }).click();
    const obj = objectOn(page, 'Text box: Touch');
    await settled(page);
    const b0 = await boxOf(obj);
    const from = centre(b0);
    const cdp = await page.context().newCDPSession(page);
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      x: number,
      y: number,
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
    await touch('touchStart', from.x, from.y);
    for (let i = 1; i <= 8; i++)
      await touch('touchMove', from.x + i * 5, from.y + i * 4);
    await touch('touchEnd', from.x + 40, from.y + 32);
    await expect
      .poll(async () => (await boxOf(obj)).x - b0.x)
      .toBeCloseTo(40, 0);
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'pointer', value: 'coarse' },
        { name: 'any-pointer', value: 'coarse' },
      ],
    });
    const handle = page
      .getByTestId('selection-frame')
      .locator('[data-handle="se"]');
    await expect.poll(async () => (await boxOf(handle)).width).toBe(44);
  });
});
