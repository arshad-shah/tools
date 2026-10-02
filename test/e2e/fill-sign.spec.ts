import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { textPositions } from '../fixtures/builders';
import type { TruthField } from '../fixtures/flat-form';

/*
 * Spec §1 criterion 1, §15: a flat form filled from detection, My details,
 * a typed signature and export (plan C-14).
 */
const FLAT = 'test/fixtures/generated/flat-form-word.pdf';
const FORM = 'test/fixtures/generated/form.pdf';
const truth: TruthField[] = JSON.parse(
  readFileSync('test/fixtures/generated/flat-form-word.truth.json', 'utf8'),
);
const fields = (page: Page, n: number) =>
  page.locator(`[data-testid="page-slot-${n}"] [data-testid^="field-"]`);
const rail = (page: Page) => page.getByRole('listbox', { name: 'Pages' });

async function open(page: Page, file = FLAT) {
  await page.goto('/pdf/edit/fill-sign');
  await page.locator('input[type=file]').first().setInputFiles(file);
}

async function exportPdf(page: Page) {
  await page
    .getByRole('button', { name: /^Export/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Export PDF' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  return new Uint8Array(readFileSync((await download.path())!));
}

test('detects the fields of a flat form', async ({ page }) => {
  await open(page);
  await expect
    .poll(() => fields(page, 1).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(10);
  await expect(
    page.getByRole('button', { name: 'Text field: Surname, empty' }).first(),
  ).toBeVisible();
});

const inside = (
  t: { x: number; y: number },
  r: TruthField['rect'],
  pageHeight = 792,
) => {
  const baseline = pageHeight - t.y;
  return (
    t.x >= r.x - 1 &&
    t.x <= r.x + r.width &&
    baseline >= r.y - 1 &&
    baseline <= r.y + r.height + 1
  );
};
const truthOf = (page: number, label: string) =>
  truth.find((t) => t.page === page && t.label === label)!.rect;
const progressDone = (page: Page) =>
  expect(page.getByText(/^Detecting fields, page/)).toHaveCount(0, {
    timeout: 20_000,
  });

test('fills a flat form from My details, by hand and with a signature, then exports', async ({
  page,
}) => {
  await open(page);
  await expect
    .poll(() => fields(page, 1).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(10);
  await progressDone(page);

  // My details: nothing stored yet, so the dialog opens to enter them.
  const toolbar = page.getByRole('toolbar', { name: /Fill & Sign/ });
  await toolbar.getByRole('button', { name: 'My details' }).click();
  const details = page.getByRole('dialog', { name: 'My details' });
  await details.getByLabel('Surname').fill('Doe');
  await details.getByLabel('First name').fill('Jane');
  await details.getByLabel('Postcode').fill('D02 XY45');
  await details.getByRole('button', { name: 'Save' }).click();
  await expect(details).toHaveCount(0);

  // The preview lists the matches before anything is filled.
  await toolbar.getByRole('button', { name: 'My details' }).click();
  const preview = page.getByRole('dialog', { name: 'Fill from My details' });
  for (const row of ['Surname: Doe', 'Forename(s): Jane', 'Postcode: D02 XY45'])
    await expect(
      preview.getByRole('checkbox', { name: row }).first(),
    ).toBeChecked();
  await preview.getByRole('button', { name: /^Fill \d+ fields$/ }).click();
  await expect(
    page.getByRole('button', { name: 'Text field: Surname, filled' }).first(),
  ).toBeAttached();

  // Page 3: type into the dotted Occupation leader.
  const page3 = rail(page).getByRole('option', { name: /^Page 3 of 6/ });
  await page3.click();
  await page3.press('Enter');
  await page
    .getByRole('button', { name: 'Text field: Occupation, empty' })
    .click();
  const occupation = page.getByRole('textbox', { name: 'Occupation' });
  await occupation.fill('Engineer');
  await occupation.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Text field: Occupation, filled' }),
  ).toBeAttached();

  // A typed signature at the centre of page 3, nudged with the arrows.
  await toolbar.getByRole('button', { name: 'Signature', exact: true }).click();
  const sign = page.getByRole('dialog', { name: 'Signature' });
  await sign.getByRole('tab', { name: 'Type' }).click();
  await sign.getByLabel('Your name').fill('Jane Doe');
  await sign.getByRole('button', { name: 'Place at page centre' }).click();
  await expect(sign).toHaveCount(0);
  // Placed objects are buttons on the page's object layer.
  const frame = page
    .getByTestId('objects-page-3')
    .getByRole('button', { name: 'Signature on page 3' });
  await expect(frame).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  const bytes = await exportPdf(page);
  const p1 = await textPositions(bytes, 0);
  const at = (texts: typeof p1, s: string) => texts.find((t) => t.str === s);
  expect(inside(at(p1, 'Doe')!, truthOf(0, 'Surname'))).toBe(true);
  expect(inside(at(p1, 'Jane')!, truthOf(0, 'Forename(s)'))).toBe(true);
  expect(inside(at(p1, 'D02 XY45')!, truthOf(0, 'Postcode'))).toBe(true);
  const p3 = await textPositions(bytes, 2);
  expect(inside(at(p3, 'Engineer')!, truthOf(2, 'Occupation'))).toBe(true);
  const sig = at(p3, 'Jane Doe');
  expect(sig).toBeDefined();
  // Centre of the page, nudged right.
  expect(sig!.x).toBeGreaterThan(306 - 90);
  expect(Math.abs(792 - sig!.y - 396)).toBeLessThan(60);
});

/** Every widget by field name: page, /Rect and value (pdf.js annotations). */
async function fieldObjects(bytes: Uint8Array) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const pdf = await task.promise;
    const out: Record<
      string,
      { page: number; rect: number[]; value: unknown }[]
    > = {};
    for (let n = 1; n <= pdf.numPages; n++)
      for (const a of await (await pdf.getPage(n)).getAnnotations())
        if (a.subtype === 'Widget' && a.fieldName)
          (out[a.fieldName as string] ??= []).push({
            page: n - 1,
            rect: a.rect as number[],
            value: a.fieldValue,
          });
    return out;
  } finally {
    await task.destroy();
  }
}

test('Make fillable writes real form fields at the detected rects', async ({
  page,
}) => {
  await open(page);
  await expect
    .poll(() => fields(page, 1).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(10);
  await progressDone(page);
  await page
    .getByRole('toolbar', { name: /Fill & Sign/ })
    .getByRole('button', { name: 'Make fillable' })
    .click();
  const confirm = page.getByRole('dialog', { name: 'Are you sure?' });
  await expect(confirm).toContainText('into real form fields.');
  await confirm.getByRole('button', { name: 'Continue' }).click();
  await expect(
    page.getByRole('button', { name: 'Undo Make form fillable' }),
  ).toBeAttached({ timeout: 20_000 });
  const objects = await fieldObjects(await exportPdf(page));
  expect(Object.keys(objects)).toEqual(
    expect.arrayContaining(['surname', 'forename_s', 'postcode']),
  );
  const near = (name: string, label: string) => {
    const [x1, y1, x2, y2] = objects[name][0].rect;
    const r = truthOf(0, label);
    return [x1 - r.x, y1 - r.y, x2 - (r.x + r.width), y2 - (r.y + r.height)];
  };
  for (const [name, label] of [
    ['surname', 'Surname'],
    ['forename_s', 'Forename(s)'],
  ])
    for (const d of near(name, label))
      expect(Math.abs(d)).toBeLessThanOrEqual(2);
});

test('fills an AcroForm: a text field and a checkbox', async ({ page }) => {
  await open(page, FORM);
  const name = page.getByRole('button', { name: 'Text field: name, empty' });
  await name.click();
  const input = page
    .getByTestId('field-widget:name:0')
    .getByRole('textbox', { name: 'name' });
  await input.fill('Ada Lovelace');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Tick field: agree, empty' }).click();
  await expect(
    page.getByRole('button', { name: 'Tick field: agree, filled' }),
  ).toBeAttached();
  const objects = await fieldObjects(await exportPdf(page));
  expect(objects.name[0]).toMatchObject({ value: 'Ada Lovelace' });
  expect(objects.agree[0].value).not.toBe('Off');
});

test('the folded Sign and Fill Form tools are gone', async ({ page }) => {
  for (const path of ['/pdf/sign', '/pdf/fill-form']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      `No page at ${path}`,
    );
  }
});

test('the PDF hub suggests Fill & Sign for a dropped flat form', async ({
  page,
}) => {
  await page.goto('/pdf');
  await page.locator('input[type=file]').first().setInputFiles(FLAT);
  await expect(page.getByText('Flat form', { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(/^\d+ fields detected$/)).toBeVisible();
  await page.getByRole('button', { name: 'Fill & Sign' }).click();
  await expect(page).toHaveURL(/\/pdf\/edit\/fill-sign/);
  await expect
    .poll(() => fields(page, 1).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(10);
});

test('a field added from the keyboard is resized with Alt and the arrows', async ({
  page,
}) => {
  await open(page);
  await expect
    .poll(() => fields(page, 1).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(10);
  await page
    .getByRole('toolbar', { name: /Fill & Sign/ })
    .getByRole('button', { name: 'Add field options' })
    .click();
  await page.getByRole('menuitem', { name: 'Add at page centre' }).click();
  const frame = page.getByRole('group', {
    name: 'Resize Text field: unlabelled, empty',
  });
  await expect(frame).toBeFocused();
  const before = await frame.boundingBox();
  await page.keyboard.press('Alt+ArrowRight');
  await expect
    .poll(async () => (await frame.boundingBox())!.width)
    .toBeGreaterThan(before!.width);
  await expect(
    page.getByRole('button', { name: 'Undo Resize field' }),
  ).toBeAttached();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Text field: unlabelled, empty' }),
  ).toBeAttached();
});

// The owner's real case (EUTR5-like): Word table cells, Yes/No squares and
// a Signature/Date declaration, with no AcroForm.
const WORD = 'test/fixtures/generated/word-table-form.pdf';
const wordTruth: TruthField[] = JSON.parse(
  readFileSync('test/fixtures/generated/word-table-form.truth.json', 'utf8'),
);
const wordRect = (page: number, label: string) =>
  wordTruth.find((t) => t.page === page && t.label === label)!.rect;

async function strokesIn(bytes: Uint8Array, pageIndex: number) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const page = await (await task.promise).getPage(pageIndex + 1);
    // pdf.js 6 carries the paint op as constructPath's first argument.
    const { fnArray, argsArray } = await page.getOperatorList();
    return fnArray.filter(
      (f, i) =>
        f === OPS.constructPath &&
        [OPS.stroke, OPS.closeStroke].includes((argsArray[i] as number[])[0]),
    ).length;
  } finally {
    await task.destroy();
  }
}

test('a Word table form: answer cells, a Yes tick, a date and a signature in the declaration', async ({
  page,
}) => {
  await open(page, WORD);
  await expect
    .poll(() => fields(page, 1).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(5);
  await progressDone(page);

  await page
    .getByRole('button', {
      name: 'Text field: Name under which you were convicted, empty',
    })
    .click();
  const name = page.getByRole('textbox', {
    name: 'Name under which you were convicted',
  });
  await name.fill('Jane Doe');
  await name.press('Enter');
  // Enter moves on to the next empty field: the country.
  const country = page.getByRole('textbox', {
    name: 'Country where you were convicted',
  });
  await expect(country).toBeFocused();
  await country.fill('Ireland');
  await country.press('Enter');
  const sentenced = page.getByLabel('Date sentenced');
  await expect(sentenced).toBeFocused();
  await sentenced.fill('2024-05-01');
  await sentenced.press('Enter');

  // Page 2: tick Yes.
  const page2 = rail(page).getByRole('option', { name: /^Page 2 of 4/ });
  await page2.click();
  await page2.press('Enter');
  await page
    .getByRole('button', {
      name: 'Tick field: Yes (give details below), empty',
    })
    .first()
    .click();
  await expect(
    page
      .getByRole('button', {
        name: 'Tick field: Yes (give details below), filled',
      })
      .first(),
  ).toBeAttached();

  // Page 4, the declaration: sign into the Signature cell, date the Date cell.
  const page4 = rail(page).getByRole('option', { name: /^Page 4 of 4/ });
  await page4.click();
  await page4.press('Enter');
  await page
    .getByRole('button', { name: 'Signature field: Signature, empty' })
    .click();
  const sign = page.getByRole('dialog', { name: 'Signature' });
  await sign.getByRole('tab', { name: 'Type' }).click();
  await sign.getByLabel('Your name').fill('Jane Doe');
  await sign.getByRole('button', { name: 'Place in field' }).click();
  await expect(
    page.getByRole('button', { name: 'Signature field: Signature, filled' }),
  ).toBeAttached();
  await page.getByRole('button', { name: 'Date field: Date, empty' }).click();
  const date = page.locator('[data-state="focused"] input');
  await date.fill('2026-10-02');
  await date.press('Enter');

  const bytes = await exportPdf(page);
  const p1 = await textPositions(bytes, 0);
  const h = 841.89;
  const at = (texts: typeof p1, s: string) => texts.find((t) => t.str === s);
  expect(
    inside(
      at(p1, 'Jane Doe')!,
      wordRect(0, 'Name under which you were convicted'),
      h,
    ),
  ).toBe(true);
  expect(
    inside(
      at(p1, 'Ireland')!,
      wordRect(0, 'Country where you were convicted'),
      h,
    ),
  ).toBe(true);
  expect(inside(at(p1, '01/05/2024')!, wordRect(0, 'Date sentenced'), h)).toBe(
    true,
  );
  const original = new Uint8Array(readFileSync(WORD));
  expect(await strokesIn(bytes, 1)).toBeGreaterThan(
    await strokesIn(original, 1),
  );
  const p4 = await textPositions(bytes, 3);
  const sig = at(p4, 'Jane Doe')!;
  const sigRect = wordRect(3, 'Signature');
  expect(sig.x).toBeGreaterThanOrEqual(sigRect.x);
  expect(h - sig.y).toBeGreaterThan(sigRect.y);
  expect(h - sig.y).toBeLessThan(sigRect.y + sigRect.height);
  expect(inside(at(p4, '02/10/2026')!, wordRect(3, 'Date'), h)).toBe(true);
});

test('a click-anywhere text box with 8 character boxes exports evenly spaced digits', async ({
  page,
}) => {
  await open(page, 'test/fixtures/generated/text-3.pdf');
  await expect(
    page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]'),
  ).toBeAttached();
  await page
    .getByRole('toolbar', { name: /Fill & Sign/ })
    .getByRole('button', { name: 'Text', exact: true })
    .click();
  const slot = page.locator('[data-testid="page-slot-1"]');
  const box = (await slot.boundingBox())!;
  // Below the page's "Alpha 1" line, inside the window.
  await page.mouse.click(box.x + box.width * 0.3, box.y + 300);
  const input = page.locator('[data-state="focused"] input');
  await expect(input).toBeFocused();
  // The text settings bar sits by the box: turn on 8 character boxes.
  const bar = page.getByRole('dialog', { name: 'Text settings' });
  await bar.getByRole('switch', { name: 'Character boxes' }).click();
  await expect(
    bar.getByRole('spinbutton', { name: 'Number of character boxes' }),
  ).toHaveValue('8');
  await input.click();
  await input.fill('20261002');
  await input.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Text field: Text, filled' }),
  ).toBeFocused();

  const bytes = await exportPdf(page);
  const digits = (await textPositions(bytes, 0))
    .filter((t) => /^\d$/.test(t.str))
    .sort((a, b) => a.x - b.x);
  expect(digits.map((d) => d.str).join('')).toBe('20261002');
  const gaps = digits.slice(1).map((d, i) => d.x - digits[i].x);
  // The default box is 160pt wide: 20pt cells, digits all the same width.
  for (const g of gaps) expect(g).toBeCloseTo(20, 0);
});

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test('a text box moves with the arrows, is deleted, and comes back with undo', async ({
  page,
}) => {
  await open(page, 'test/fixtures/generated/text-3.pdf');
  await expect(
    page.locator('[data-testid="page-slot-1"] canvas[data-rendered="true"]'),
  ).toBeAttached();
  await page
    .getByRole('toolbar', { name: /Fill & Sign/ })
    .getByRole('button', { name: 'Text options' })
    .click();
  await page
    .getByRole('menuitem', { name: 'Add text box at page centre' })
    .click();
  const input = page.locator('[data-state="focused"] input');
  await expect(input).toBeFocused();
  await input.fill('Hello');
  await input.press('Enter');
  const frame = page.getByRole('button', { name: 'Text field: Text, filled' });
  await expect(frame).toBeFocused();
  const before = (await frame.boundingBox())!;
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => (await frame.boundingBox())!.x)
    .toBeGreaterThan(before.x);
  await expect(
    page.getByRole('button', { name: /^Undo Move object on page 1/ }),
  ).toBeAttached();
  await page.keyboard.press('Delete');
  await expect(page.getByTestId(/^value-free:/)).toHaveCount(0);
  await page.keyboard.press(`${mod}+z`);
  await expect(page.getByTestId(/^value-free:/)).toHaveCount(1);
});

test('the text settings of a detected field export as letter spacing', async ({
  page,
}) => {
  await open(page);
  await expect
    .poll(() => fields(page, 1).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(10);
  await page
    .getByRole('button', { name: 'Text field: Surname, empty' })
    .first()
    .click();
  const input = page.getByRole('textbox', { name: 'Surname' });
  await input.press('Alt+t');
  const bar = page.getByRole('dialog', { name: 'Text settings' });
  await expect(bar.getByRole('spinbutton').first()).toBeFocused();
  await bar
    .getByRole('spinbutton', { name: 'Letter spacing in points' })
    .fill('3');
  await expect(
    page.getByRole('button', { name: /^Undo Change text style on page 1/ }),
  ).toBeAttached();
  await input.click();
  await input.fill('Doe');
  await input.press('Enter');
  const bytes = await exportPdf(page);
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const ops = await (await (await task.promise).getPage(1)).getOperatorList();
    const spacing = ops.fnArray
      .map((f, i) => (f === OPS.setCharSpacing ? ops.argsArray[i][0] : null))
      .filter((v) => v !== null);
    expect(spacing).toContain(3);
  } finally {
    await task.destroy();
  }
});

// The owner's EUTR5 page 7: one box per character. Each run of boxes is
// one comb field; dd/mm/yyyy boxes are one date field.
const BOXES = 'test/fixtures/generated/char-box-form.pdf';
const boxTruth: (TruthField & { cellCount?: number })[] = JSON.parse(
  readFileSync('test/fixtures/generated/char-box-form.truth.json', 'utf8'),
);
const boxRect = (page: number, label: string) =>
  boxTruth.find((t) => t.page === page && t.label === label)!;

/** Each character shown after its own text matrix (comb text): PDF user space. */
async function shownChars(bytes: Uint8Array, pageIndex: number) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const page = await (await task.promise).getPage(pageIndex + 1);
    const { fnArray, argsArray } = await page.getOperatorList();
    const out: { ch: string; x: number; y: number }[] = [];
    let at = { x: 0, y: 0 };
    fnArray.forEach((f, i) => {
      const args = argsArray[i] as unknown[];
      if (f === OPS.setTextMatrix) {
        const m = Array.from(
          args.length === 1 ? (args[0] as number[]) : (args as number[]),
        );
        at = { x: m[4], y: m[5] };
      } else if (f === OPS.showText) {
        const glyphs = args[0] as ({ unicode?: string } | number)[];
        const ch = glyphs
          .map((g) => (typeof g === 'number' ? '' : (g.unicode ?? '')))
          .join('');
        if (ch) out.push({ ch, ...at });
      }
    });
    return out;
  } finally {
    await task.destroy();
  }
}

test('a character-box form: one comb field per box run, a Yes tick and a date, exported in the boxes', async ({
  page,
}) => {
  await open(page, BOXES);
  await expect
    .poll(() => fields(page, 1).count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(5);
  await progressDone(page);
  const page2 = rail(page).getByRole('option', { name: /^Page 2 of 2/ });
  await page2.click();
  await page2.press('Enter');
  // A field per run of boxes, not one per box.
  await expect
    .poll(() => fields(page, 2).count(), { timeout: 10_000 })
    .toBe(boxTruth.filter((t) => t.page === 1).length);

  await page
    .getByRole('button', { name: 'Text field: Surname, empty' })
    .click();
  const surname = page.getByRole('textbox', { name: 'Surname' });
  await surname.fill('DOE');
  await surname.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Text field: Surname, filled' }),
  ).toBeAttached();

  const slot2 = page.locator('[data-testid="page-slot-2"]');
  await slot2
    .getByRole('button', {
      name: 'Tick field: Yes (give details below), empty',
    })
    .click();
  await expect(
    slot2.getByRole('button', {
      name: 'Tick field: Yes (give details below), filled',
    }),
  ).toBeAttached();

  await page
    .getByRole('button', { name: 'Date field: Date of birth, empty' })
    .click();
  const dob = page.getByLabel('Date of birth');
  await dob.fill('1990-07-15');
  await dob.press('Enter');

  const bytes = await exportPdf(page);
  const original = new Uint8Array(readFileSync(BOXES));
  // What the export added: the form's own print (the date's slashes) left out.
  const printed = await shownChars(original, 1);
  const shown = (await shownChars(bytes, 1)).filter(
    (c) =>
      !printed.some(
        (p) =>
          p.ch === c.ch &&
          Math.abs(p.x - c.x) < 0.01 &&
          Math.abs(p.y - c.y) < 0.01,
      ),
  );
  /** Characters written into a truth rect, left to right. */
  const written = (t: TruthField) =>
    shown
      .filter(
        (c) =>
          c.x >= t.rect.x &&
          c.x <= t.rect.x + t.rect.width &&
          c.y >= t.rect.y &&
          c.y <= t.rect.y + t.rect.height,
      )
      .sort((a, b) => a.x - b.x);
  /** Each character starts inside its own cell. */
  const inCells = (t: TruthField, cells: number, value: string) => {
    const chars = written(t);
    expect(chars.map((c) => c.ch).join('')).toBe(value);
    const pitch = t.rect.width / cells;
    chars.forEach((c, i) => {
      expect(c.x).toBeGreaterThan(t.rect.x + i * pitch);
      expect(c.x).toBeLessThan(t.rect.x + (i + 1) * pitch);
    });
  };

  // Surname: one letter in each of the first three of its 24 boxes.
  const sn = boxRect(1, 'Surname');
  expect(sn.cellCount).toBe(24);
  inCells(sn, 24, 'DOE');
  // Date of birth: dd/mm/yyyy across its ten cells.
  inCells(boxRect(1, 'Date of birth'), 10, '15/07/1990');

  // The Yes tick is drawn as strokes on page 2.
  expect(await strokesIn(bytes, 1)).toBeGreaterThan(
    await strokesIn(original, 1),
  );
});
