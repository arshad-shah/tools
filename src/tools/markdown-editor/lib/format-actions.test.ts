import { describe, expect, it } from 'vitest';
import { applyFormat, TABLE_SNIPPET } from './format-actions';

const sel = (start: number, end = start) => ({ start, end });

describe('applyFormat', () => {
  it('wraps a selection in bold and toggles it off', () => {
    const on = applyFormat('say hello now', sel(4, 9), 'bold');
    expect(on.text).toBe('say **hello** now');
    expect(on.selection).toEqual(sel(6, 11));
    const off = applyFormat(on.text, on.selection, 'bold');
    expect(off).toEqual({ text: 'say hello now', selection: sel(4, 9) });
    const offInner = applyFormat(on.text, sel(4, 13), 'bold');
    expect(offInner.text).toBe('say hello now');
  });

  it('inserts a placeholder when nothing is selected', () => {
    const r = applyFormat('x ', sel(2), 'italic');
    expect(r.text).toBe('x _italic text_');
    expect(r.text.slice(r.selection.start, r.selection.end)).toBe(
      'italic text',
    );
    expect(applyFormat('', sel(0), 'code').text).toBe('`code`');
  });

  it('makes and removes links, selecting the url', () => {
    const r = applyFormat('see docs', sel(4, 8), 'link');
    expect(r.text).toBe('see [docs](url)');
    expect(r.text.slice(r.selection.start, r.selection.end)).toBe('url');
    expect(applyFormat(r.text, sel(4, 15), 'link').text).toBe('see docs');
  });

  it('toggles headings and replaces another level', () => {
    const h2 = applyFormat('Title\nbody', sel(2), 'h2');
    expect(h2.text).toBe('## Title\nbody');
    expect(applyFormat(h2.text, sel(3), 'h2').text).toBe('Title\nbody');
    expect(applyFormat(h2.text, sel(3), 'h1').text).toBe('# Title\nbody');
  });

  it('prefixes every selected line and toggles lists', () => {
    const ul = applyFormat('a\nb\nc', sel(0, 3), 'ul');
    expect(ul.text).toBe('- a\n- b\nc');
    expect(applyFormat(ul.text, ul.selection, 'ul').text).toBe('a\nb\nc');
    expect(applyFormat('a\nb', sel(0, 3), 'ol').text).toBe('1. a\n2. b');
    expect(applyFormat('1. a\n2. b', sel(0, 9), 'ol').text).toBe('a\nb');
    expect(applyFormat('a', sel(0), 'task').text).toBe('- [ ] a');
    expect(applyFormat('a', sel(1), 'quote').text).toBe('> a');
  });

  it('inserts a 2 by 2 table at the caret on its own lines', () => {
    expect(applyFormat('', sel(0), 'table').text).toBe(TABLE_SNIPPET);
    const r = applyFormat('intro', sel(5), 'table');
    expect(r.text).toBe(`intro\n\n${TABLE_SNIPPET}`);
    expect(r.text.slice(r.selection.start, r.selection.end)).toBe('Column 1');
    const rows = TABLE_SNIPPET.split('\n');
    expect(rows).toHaveLength(4);
    expect(rows.every((l) => l.split('|').length === 4)).toBe(true);
  });
});
