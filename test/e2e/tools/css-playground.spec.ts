import { expect, test, type Page } from '@playwright/test';
import { pathOf } from '../tool-routes';
import { expectEditorValue } from '../editor';

const css = (page: Page) => page.getByRole('textbox', { name: 'CSS' });
const frame = (page: Page) => page.frameLocator('iframe[title="Rendered CSS"]');

test.beforeEach(async ({ page }) => {
  await page.goto(pathOf('css-playground'));
});

test('renders pasted CSS on markup built from its selectors', async ({
  page,
}) => {
  await css(page).fill('.card .title { color: rgb(255, 0, 0); }');
  const title = frame(page).locator('.card .title');
  await expect(title).toHaveText('.card .title');
  await expect(title).toHaveCSS('color', 'rgb(255, 0, 0)');
});

test('styles the HTML the user gives instead', async ({ page }) => {
  await css(page).fill('p { font-weight: 700; }');
  await page.getByRole('radio', { name: 'My HTML' }).click();
  await page
    .getByRole('textbox', { name: 'HTML' })
    .fill('<p id="mine">Mine</p>');
  await expect(frame(page).locator('#mine')).toHaveCSS('font-weight', '700');
});

test('lists issues the browser finds and jumps to their line', async ({
  page,
}) => {
  await css(page).fill('.a { color: red; }\n.b { colr: blue; width: 10pz; }');
  const issues = page.getByRole('table', { name: 'Issues' });
  await expect(issues).toContainText('colr is not a property');
  await expect(issues).toContainText('width: 10pz is not valid');
  await issues.getByRole('button', { name: '2' }).first().click();
  await expect(css(page)).toBeFocused();
});

test('optimises, then loads the result back into the editor', async ({
  page,
}) => {
  await css(page).fill(
    '.a { color: #ff0000; margin: 0px; }\n.b { color: #ff0000; margin: 0px; }\n',
  );
  await page.getByRole('tab', { name: 'Optimise and minify' }).click();
  await expect(
    page.getByRole('figure', { name: 'Optimised CSS' }),
  ).toContainText('.a,.b{color:red;margin:0}');
  await page.getByRole('button', { name: 'Use in editor' }).click();
  await expectEditorValue(css(page), '.a,.b{color:red;margin:0}');
});

test('formats the stylesheet in place', async ({ page }) => {
  await css(page).fill('.a{color:red}');
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expectEditorValue(css(page), '.a {\n  color: red;\n}\n');
});
