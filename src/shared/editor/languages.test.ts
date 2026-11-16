import { ensureSyntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { classHighlighter, highlightTree } from '@lezer/highlight';
import { describe, expect, it } from 'vitest';
import type { LanguageId } from '@/shared/lib/syntax/tokenize';
import { loadLanguage } from './languages';

/** Each highlighted span as `text:class`. */
async function spans(id: LanguageId, doc: string) {
  const state = EditorState.create({ doc, extensions: await loadLanguage(id) });
  const tree = ensureSyntaxTree(state, doc.length, 5000)!;
  const out: string[] = [];
  highlightTree(tree, classHighlighter, (from, to, cls) =>
    out.push(`${doc.slice(from, to)}:${cls}`),
  );
  return out;
}

describe('editor languages', () => {
  it('json uses the official parser', async () => {
    const s = await spans('json', '{"a": 1, "b": true}');
    expect(s).toContain('"a":tok-propertyName');
    expect(s).toContain('1:tok-number');
    expect(s).toContain('true:tok-bool');
  });

  it('markdown headings and emphasis', async () => {
    const s = await spans('markdown', '# Title\n\n*em*');
    expect(
      s.some((x) => x.startsWith(' Title:') && x.includes('tok-heading')),
    ).toBe(true);
  });

  it('log, csv, regex and http use tools tokenisers as stream languages', async () => {
    expect(
      (await spans('log', '2024-05-01T10:00:00Z ERROR disk full')).length,
    ).toBeGreaterThan(0);
    expect((await spans('csv', 'name,age\n"Ann",42')).join(' ')).toMatch(
      /42:tok-number/,
    );
    expect((await spans('regex', '^a+\\d$')).length).toBeGreaterThan(0);
    expect(
      (await spans('http', 'GET /a HTTP/1.1\nHost: x')).length,
    ).toBeGreaterThan(0);
  });

  it('a stream language carries state across lines', async () => {
    // A quoted csv field spanning two lines stays a string on the second.
    const s = await spans('csv', 'a,"x\ny",2');
    expect(s.join(' ')).toMatch(/y":tok-string/);
  });

  it('plain text has no parser', async () => {
    expect(await loadLanguage('plain')).toEqual([]);
  });
});
