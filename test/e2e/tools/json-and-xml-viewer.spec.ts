import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { parse as parseYaml } from 'yaml';
import { pathOf } from '../tool-routes';

const BOOKSTORE = JSON.stringify(
  {
    store: {
      book: [
        { author: 'Nigel Rees', title: 'Sayings of the Century', price: 8.95 },
        { author: 'Evelyn Waugh', title: 'Sword of Honour', price: 12.99 },
        { author: 'Herman Melville', title: 'Moby Dick', price: 8.99 },
        {
          author: 'J. R. R. Tolkien',
          title: 'The Lord of the Rings',
          price: 22.99,
        },
      ],
      bicycle: { color: 'red', price: 399 },
    },
  },
  null,
  2,
);

const editor = (page: Page) => page.getByRole('textbox', { name: 'Document' });
const tree = (page: Page) => page.getByRole('tree', { name: 'Document tree' });

/** One pane at a time (ruling R41): Source, Tree, Map, Query, Convert. */
const show = (page: Page, name: string) =>
  page.getByRole('tab', { name, exact: true }).click();

async function open(page: Page, text: string) {
  await page.goto(pathOf('json-and-xml-viewer'));
  await editor(page).fill(text);
}

test('the panes are tabs, Source first, and a view before a document points back', async ({
  page,
}) => {
  await page.goto(pathOf('json-and-xml-viewer'));
  await expect(page.getByRole('tab')).toHaveText([
    'Source',
    'Tree',
    'Map',
    'Query',
    'Convert',
  ]);
  await show(page, 'Map');
  await page.getByRole('button', { name: 'Go to Source' }).click();
  await expect(editor(page)).toBeVisible();
});

test('a JSON error shows its line and column, and Jump to error moves the caret', async ({
  page,
}) => {
  await open(page, '{\n  "a": 1,\n}');
  const alert = page.getByTestId('parse-error');
  await expect(alert).toContainText('line 3, column 1');
  await alert.getByRole('button', { name: 'Jump to error' }).click();
  const caret = await editor(page).evaluate(
    (el) => (el as HTMLTextAreaElement).selectionStart,
  );
  expect(caret).toBe('{\n  "a": 1,\n'.length);
});

test('searching for ( is literal and never crashes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, '{"note": "call f(x)", "list": "[1]"}');
  await show(page, 'Tree');
  const search = page.getByRole('searchbox', { name: 'Search the tree' });
  await search.fill('(');
  await expect(page.getByText('1 of 1')).toBeVisible();
  await search.fill('[');
  await expect(page.getByText('1 of 1')).toBeVisible();
  expect(errors).toEqual([]);
});

test('selecting in the Tree fills the path bar and copies the JSONPath', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, BOOKSTORE);
  await show(page, 'Tree');
  await page.getByRole('searchbox', { name: 'Search the tree' }).fill('Sword');
  await tree(page)
    .getByRole('treeitem', { name: /Sword of Honour/ })
    .click();
  await expect(page.getByLabel('Selected path')).toHaveText(
    '$.store.book[1].title',
  );
  await page.getByRole('button', { name: 'Copy JSONPath' }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('$.store.book[1].title');
});

test('the Map shows the selection and ] moves to a child', async ({ page }) => {
  await open(page, BOOKSTORE);
  await show(page, 'Tree');
  await page.getByRole('searchbox', { name: 'Search the tree' }).fill('Sword');
  await tree(page)
    .getByRole('treeitem', { name: /Sword of Honour/ })
    .click();
  await page.getByRole('tab', { name: 'Map' }).click();
  const canvas = page.getByTestId('diagram-canvas');
  await expect(canvas).toBeVisible();
  await canvas.focus();
  await page.keyboard.press('[');
  await expect(page.getByText(/at book, 4 fields$/)).toBeAttached();
  await page.keyboard.press(']');
  await expect(
    page.getByText(/^Object at book\[0\], 3 fields$/),
  ).toBeAttached();
});

test('a JSONPath query lists results and a click selects in the Tree', async ({
  page,
}) => {
  await open(page, BOOKSTORE);
  await page.getByRole('tab', { name: 'Query' }).click();
  const q = page.getByRole('textbox', { name: 'JSONPath query' });
  await q.fill('$..price');
  await q.press('Enter');
  await expect(page.getByText('5 results')).toBeVisible();
  await page
    .getByRole('list', { name: 'Query results' })
    .getByRole('button')
    .nth(2)
    .click();
  await expect(page.getByLabel('Selected path')).toHaveText(
    '$.store.book[2].price',
  );
  await page.getByRole('tab', { name: 'Tree' }).click();
  await expect(
    tree(page).getByRole('treeitem', { selected: true }),
  ).toContainText('8.99');
});

test('Convert to YAML downloads text that parses back equal', async ({
  page,
}) => {
  await open(page, BOOKSTORE);
  await page.getByRole('tab', { name: 'Convert' }).click();
  await page
    .getByRole('radiogroup', { name: 'Convert to' })
    .getByRole('radio', { name: 'YAML' })
    .click();
  const out = page.getByRole('group', { name: 'YAML output' });
  await expect(out.getByRole('textbox')).toContainText('store:');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    out.getByRole('button', { name: 'Download' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('data.yaml');
  const yaml = readFileSync(await download.path(), 'utf8');
  expect(parseYaml(yaml)).toEqual(JSON.parse(BOOKSTORE));
});

test('XML: XPath returns attribute rows and Format keeps the comment', async ({
  page,
}) => {
  await page.goto(pathOf('json-and-xml-viewer'));
  await page.getByRole('button', { name: 'Load a sample' }).click();
  await page.getByRole('menuitem', { name: 'XML catalogue' }).click();
  await show(page, 'Tree');
  await expect(tree(page)).toBeVisible();
  await page.getByRole('tab', { name: 'Query' }).click();
  const q = page.getByRole('textbox', { name: 'XPath query' });
  await q.fill('//book/@id');
  await q.press('Enter');
  await expect(page.getByText('3 results')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Query results' })).toContainText(
    '/catalog/book[1]/@id',
  );
  await show(page, 'Source');
  await editor(page).fill('<r><!-- keep me --><a>1</a></r>');
  await editor(page).press('ControlOrMeta+Shift+F');
  await expect(editor(page)).toHaveValue(
    '<r>\n  <!-- keep me -->\n  <a>1</a>\n</r>\n',
  );
});
