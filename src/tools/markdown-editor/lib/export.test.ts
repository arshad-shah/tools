import { afterEach, describe, expect, it, vi } from 'vitest';
import { toRichClipboard, toStandaloneHtml, type DocTokens } from './export';

const tokens = Object.fromEntries(
  [
    'bg',
    'fg',
    'muted',
    'border',
    'link',
    'codeBg',
    'keyword',
    'string',
    'number',
    'comment',
  ].map((k) => [k, `v-${k}`]),
) as unknown as DocTokens;

afterEach(() => vi.unstubAllGlobals());

describe('toStandaloneHtml', () => {
  it('is a full document with an escaped title and the token CSS', () => {
    const doc = toStandaloneHtml('<p>hi</p>', 'Notes <draft>', tokens);
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('<title>Notes &lt;draft&gt;</title>');
    expect(doc).toContain('<p>hi</p>');
    expect(doc).toContain('v-bg');
  });
});

describe('toRichClipboard', () => {
  it('offers HTML and plain text', async () => {
    class FakeItem {
      constructor(readonly items: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', FakeItem);
    const item = toRichClipboard('<p>x</p>', 'x') as unknown as FakeItem;
    expect(Object.keys(item.items)).toEqual(['text/html', 'text/plain']);
    expect(await item.items['text/html'].text()).toBe('<p>x</p>');
  });
});
