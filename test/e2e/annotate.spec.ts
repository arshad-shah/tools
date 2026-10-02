import { expect, test } from '@playwright/test';
import {
  annotationsOf,
  xy,
  drag,
  exportPdf,
  openInWorkspace,
  slotOf,
} from './workspace-helpers';

/*
 * Plan D-10 step 2: annotation round trips through export (spec §9.1).
 */
const TEXT = 'test/fixtures/generated/text-3.pdf';
const ANNOTATED = 'test/fixtures/generated/annotated.pdf';
const tool = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('toolbar').getByRole('button', { name, exact: true });
/** Picks a drawing tool and waits for its pointer layer. */
async function drawWith(page: import('@playwright/test').Page, name: string) {
  await tool(page, name).click();
  await expect(page.getByTestId('annotate-draw-1')).toBeAttached();
}

test('highlight, note with reply, ink, arrow and an Approved stamp round-trip', async ({
  page,
}) => {
  await openInWorkspace(page, TEXT, /Annotate/);
  // Measured per gesture: the canvas moves when the inspector opens.
  const at = async (x: number, y: number) => (await slotOf(page)).at(x, y);

  // Highlight "Alpha 1" by dragging over the text layer.
  await tool(page, 'Highlight').click();
  const word = page
    .locator('[data-testid="page-slot-1"] .pdf-text-layer span')
    .first();
  await expect(word).toHaveText('Alpha 1');
  const w = (await word.boundingBox())!;
  await drag(
    page,
    { x: w.x + 1, y: w.y + w.height / 2 },
    { x: w.x + w.width - 1, y: w.y + w.height / 2 },
  );
  await expect(
    page.getByRole('button', { name: 'Undo Highlight text on page 1' }),
  ).toBeAttached();

  // A note, then a reply from the comments panel.
  await drawWith(page, 'Note');
  await page.mouse.click(...xy(await at(400, 640)));
  await page.getByRole('textbox', { name: 'New note' }).fill('Why?');
  await page.getByRole('button', { name: 'Save' }).click();
  const list = page.getByRole('list', { name: 'Annotations' });
  const noteRow = list.getByTestId('comment-row').filter({ hasText: 'Why?' });
  await noteRow.getByRole('button', { name: 'Reply' }).click();
  await page.getByRole('textbox', { name: 'Reply' }).fill('Because');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(list.getByText('Reply to Me')).toBeVisible();

  // Ink, an arrow and a stamp.
  await drawWith(page, 'Pen');
  await drag(page, await at(100, 560), await at(200, 600));
  await expect(
    page.getByRole('button', { name: 'Undo Draw on page 1' }),
  ).toBeAttached();
  await drawWith(page, 'Arrow');
  await drag(page, await at(300, 560), await at(450, 620));
  await expect(
    page.getByRole('button', { name: 'Undo Add arrow on page 1' }),
  ).toBeAttached();
  await drawWith(page, 'Stamp: Approved');
  await page.mouse.click(...xy(await at(300, 520)));
  await expect(
    page.getByRole('button', { name: 'Undo Add Approved stamp on page 1' }),
  ).toBeAttached();

  const out = await exportPdf(page);
  const annots = await annotationsOf(out);
  const byType = (t: string) => annots.filter((a) => a.subtype === t);
  expect(byType('Highlight')).toHaveLength(1);
  expect(byType('Ink')).toHaveLength(1);
  expect(byType('Line')[0].lineEndings).toEqual(['None', 'OpenArrow']);
  expect(byType('Stamp')).toHaveLength(1);
  const [note, reply] = byType('Text');
  expect(note.contentsObj.str).toBe('Why?');
  expect(reply.inReplyTo).toBe(note.id);
  // The highlight's quad sits on the word "Alpha 1" (drawn at 72, 696, 24pt).
  const q: number[] = Array.from(byType('Highlight')[0].quadPoints);
  for (let i = 0; i < q.length; i += 2) {
    expect(q[i]).toBeGreaterThan(66);
    expect(q[i]).toBeLessThan(160);
    expect(q[i + 1]).toBeGreaterThan(685);
    expect(q[i + 1]).toBeLessThan(725);
  }
});

test('existing annotations: delete one, recolour one; Link and Widget survive', async ({
  page,
}) => {
  await openInWorkspace(page, ANNOTATED, /Annotate/);
  const list = page.getByRole('list', { name: 'Annotations' });
  await list
    .getByTestId('comment-row')
    .filter({ hasText: 'Ring' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await page.getByRole('radio', { name: 'Red' }).click();
  await list
    .getByTestId('comment-row')
    .filter({ hasText: /^Alice.*Box/ })
    .getByRole('button', { name: 'Use current colour' })
    .click();
  const out = await exportPdf(page);
  const annots = await annotationsOf(out);
  expect(annots.some((a) => a.subtype === 'Circle')).toBe(false);
  expect(Array.from(annots.find((a) => a.subtype === 'Square')!.color)).toEqual(
    [255, 77, 77],
  );
  expect(annots.some((a) => a.subtype === 'Link')).toBe(true);
  expect(annots.some((a) => a.subtype === 'Widget')).toBe(true);
});
