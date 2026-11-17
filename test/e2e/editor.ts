import { expect, type Locator } from '@playwright/test';

/**
 * The text of a CodeMirror editor (`loc` is its textbox). Read from the
 * editor's state through the tile CodeMirror keeps on its content element
 * (what `EditorView.findFromDOM` reads), so off-screen lines count too.
 */
export const editorValue = (loc: Locator) =>
  loc.evaluate((el) => {
    type Tile = {
      root?: { view?: { state: { doc: { toString(): string } } } };
    };
    const tile = (el as HTMLElement & { cmTile?: Tile }).cmTile;
    const doc = tile?.root?.view?.state.doc;
    if (!doc) throw new Error('Not a CodeMirror editor');
    return doc.toString();
  });

/** Waits for an editor to hold `value` (or match it). */
export async function expectEditorValue(loc: Locator, value: string | RegExp) {
  if (typeof value === 'string')
    await expect.poll(() => editorValue(loc)).toBe(value);
  else await expect.poll(() => editorValue(loc)).toMatch(value);
}

/** The caret as an offset into the editor's text (from the DOM selection). */
export const editorCaret = (loc: Locator) =>
  loc.evaluate((el) => {
    const sel = el.ownerDocument.getSelection();
    const node = sel?.focusNode;
    if (!sel || !node) return -1;
    const lines = [...el.querySelectorAll('.cm-line')];
    const host =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
    const line = host?.closest('.cm-line');
    const at = line ? lines.indexOf(line) : -1;
    if (at < 0) return -1;
    const range = el.ownerDocument.createRange();
    range.setStart(line!, 0);
    range.setEnd(node, sel.focusOffset);
    const before = lines
      .slice(0, at)
      .reduce((n, l) => n + (l.textContent ?? '').length + 1, 0);
    return before + range.toString().length;
  });
