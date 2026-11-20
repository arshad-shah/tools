/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseXml } from '@/shared/lib/data-formats';
import { findById, fromValue, fromXml } from '../lib/doc-model';
import { PathBar } from './PathBar';

const writeText = vi.fn<(text: string) => Promise<void>>(() =>
  Promise.resolve(),
);
beforeEach(() => {
  writeText.mockClear();
  Object.assign(navigator, { clipboard: { writeText } });
});

/** The path has its own button; the other copies are in a menu. */
const copied = async (name: string) => {
  if (/^Copy (JSONPath|XPath)$/.test(name))
    fireEvent.click(screen.getByRole('button', { name }));
  else {
    fireEvent.click(screen.getByRole('button', { name: 'More copy options' }));
    fireEvent.click(screen.getByRole('menuitem', { name }));
  }
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  return writeText.mock.calls.at(-1)![0];
};

describe('PathBar', () => {
  const value = { store: { book: [{ 'first name': 'a', tags: ['x'] }] } };
  const doc = fromValue(value);

  it('copies the JSONPath, JS accessor, value and subtree', async () => {
    render(
      <PathBar
        node={findById(doc, "$.store.book[0]['first name']")}
        value={value}
        xml={null}
      />,
    );
    expect(screen.getByLabelText('Selected path').textContent).toBe(
      "$.store.book[0]['first name']",
    );
    expect(await copied('Copy JSONPath')).toBe("$.store.book[0]['first name']");
    expect(await copied('Copy JS accessor')).toBe(
      "data.store.book[0]['first name']",
    );
    expect(await copied('Copy value')).toBe('a');
  });

  it('copies a subtree as JSON', async () => {
    render(
      <PathBar
        node={findById(doc, '$.store.book[0]')}
        value={value}
        xml={null}
      />,
    );
    expect(JSON.parse(await copied('Copy subtree as JSON'))).toEqual(
      value.store.book[0],
    );
  });

  it('uses XPath for XML and copies the element as JSON', async () => {
    const text = '<r><b id="1">x</b><b id="2">y</b></r>';
    const xml = parseXml(text);
    const xdoc = fromXml(xml, text);
    render(
      <PathBar node={findById(xdoc, '/r/b[2]')} value={undefined} xml={xml} />,
    );
    expect(await copied('Copy XPath')).toBe('/r/b[2]');
    fireEvent.click(screen.getByRole('button', { name: 'More copy options' }));
    expect(
      screen.queryByRole('menuitem', { name: 'Copy JS accessor' }),
    ).toBeNull();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(JSON.parse(await copied('Copy subtree as JSON'))).toEqual({
      b: { '@id': '2', '#text': 'y' },
    });
  });

  it('prompts when nothing is selected', () => {
    render(<PathBar node={null} value={null} xml={null} />);
    expect(screen.getByText('Select a node to see its path')).toBeTruthy();
  });
});
