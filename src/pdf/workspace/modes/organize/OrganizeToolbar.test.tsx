/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { shellHarness, stubLayoutApis } from '../../test-shell';

beforeAll(() => registerCoreOperations());
beforeEach(() => stubLayoutApis());
afterEach(() => vi.restoreAllMocks());

const key = (k: string, init: KeyboardEventInit = {}) =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: k,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });

async function open() {
  const h = shellHarness();
  render(h.ui);
  const toolbar = await screen.findByRole('toolbar', {
    name: 'Organize tools',
  });
  return { ...h, toolbar };
}
const rail = () => screen.getByRole('listbox', { name: 'Pages' });
const option = (n: number) =>
  within(rail()).getByRole('option', { name: new RegExp(`^Page ${n} of`) });

describe('Organize toolbar', () => {
  it('R rotates the current page clockwise, Shift+R back', async () => {
    const { model } = await open();
    key('r');
    expect(model.getState().log.at(-1)).toMatchObject({
      type: 'page.rotate',
      params: { pageIds: ['ckpt0:0'], delta: 90 },
    });
    key('R', { shiftKey: true });
    expect(model.getView().pages[0].rotate).toBe(0);
  });

  it('Delete removes the selected pages', async () => {
    const { model } = await open();
    fireEvent.click(option(2));
    key('Delete');
    expect(model.getView().pages.map((p) => p.id)).toEqual([
      'ckpt0:0',
      'ckpt0:2',
    ]);
  });

  it('cannot delete every page and says why', async () => {
    const { model, toolbar } = await open();
    fireEvent.click(option(1));
    fireEvent.click(option(3), { shiftKey: true });
    const del = within(toolbar).getByRole('button', { name: 'Delete pages' });
    expect(del.getAttribute('aria-disabled')).toBe('true');
    expect(document.body.textContent).toContain(
      'The document must keep at least one page',
    );
    fireEvent.click(del);
    expect(model.getView().pages).toHaveLength(3);
  });

  it('duplicates and inserts a blank page after the current one', async () => {
    const { model, toolbar } = await open();
    fireEvent.click(
      within(toolbar).getByRole('button', { name: 'Duplicate pages' }),
    );
    fireEvent.click(
      within(toolbar).getByRole('button', { name: 'Insert blank page' }),
    );
    const pages = model.getView().pages;
    expect(pages).toHaveLength(5);
    // The blank page follows the current page (1), then the copy of page 1.
    expect(pages[1].blank).toEqual({ width: 612, height: 792 });
    expect(pages[2]).toMatchObject({ source: 's0', index: 0 });
  });
});
