import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render';

describe('renderMarkdown', () => {
  it('renders GFM tables, task lists, strikethrough, autolinks and footnotes', async () => {
    const { html } = await renderMarkdown(
      [
        '| a | b |',
        '|---|---|',
        '| 1 | 2 |',
        '',
        '- [x] done',
        '- [ ] todo',
        '',
        '~~gone~~ www.example.com',
        '',
        'Note[^1].',
        '',
        '[^1]: The note.',
      ].join('\n'),
    );
    expect(html).toContain('<table');
    expect(html).toContain('<td>1</td>');
    expect(html).toMatch(/<input type="checkbox" disabled="" checked="" \/>/);
    expect(html).toContain('<del>gone</del>');
    expect(html).toContain('<a href="http://www.example.com">');
    expect(html).toContain('data-footnotes');
    expect(html).not.toContain(String.fromCodePoint(0x21a9));
  });

  it('escapes raw HTML', async () => {
    const { html } = await renderMarkdown(
      '<script>alert(1)</script>\n\nhi <b onclick="x">b</b>',
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<b ');
    expect(html).toContain('&lt;script&gt;');
  });

  it('counts remote images', async () => {
    const r = await renderMarkdown(
      '![a](https://example.com/a.png) ![b](//cdn.example.com/b.png) ![c](local.png)',
    );
    expect(r.remoteImages).toBe(2);
  });

  it('gives headings unique ids and an outline with lines', async () => {
    const r = await renderMarkdown(
      '# Intro\n\ntext\n\n## Intro\n\nSetext\n---',
    );
    expect(r.html).toContain('<h1 id="intro" data-line="1">');
    expect(r.html).toContain('<h2 id="intro-1" data-line="5">');
    expect(r.outline).toEqual([
      { depth: 1, text: 'Intro', line: 1, id: 'intro' },
      { depth: 2, text: 'Intro', line: 5, id: 'intro-1' },
      { depth: 2, text: 'Setext', line: 7, id: 'setext' },
    ]);
  });

  it('highlights fenced code with the shared tokenisers', async () => {
    const { html } = await renderMarkdown('```ts\nconst a = "<b>";\n```');
    expect(html).toContain('<span class="tok-keyword">const</span>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toMatch(/<pre data-line="1"><code class="language-ts">/);
  });

  it('puts source lines on top-level blocks only', async () => {
    const { html } = await renderMarkdown(
      'para\none\n\n[r]: https://e.com\n\n> quote\n\n- a\n- b',
    );
    expect(html).toContain('<p data-line="1">');
    expect(html).toContain('<blockquote data-line="6">');
    expect(html).toContain('<ul data-line="8">');
    expect(html).toContain('<li>a</li>');
  });
});
