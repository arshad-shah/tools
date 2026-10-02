import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { columnName, toXlsx } from './xlsx-write';

describe('toXlsx', () => {
  it('writes a workbook with escaped inline strings and numbers', () => {
    const bytes = toXlsx(
      [
        { name: "O'Brien", n: 42, ok: true },
        { name: 'A & B <c>', n: 1.5, ok: false },
      ],
      ['name', 'n', 'ok'],
      'People',
    );
    const files = unzipSync(bytes);
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toMatch(/O(&apos;|&#39;)Brien/);
    expect(sheet).toContain('A &amp; B &lt;c&gt;');
    expect(sheet).toContain('<c r="B2"><v>42</v></c>');
    expect(sheet).toContain('<c r="C3" t="b"><v>0</v></c>');
    expect(sheet.match(/<row /g)).toHaveLength(3);
    expect(strFromU8(files['[Content_Types].xml'])).toContain(
      '/xl/worksheets/sheet1.xml',
    );
    expect(strFromU8(files['xl/workbook.xml'])).toContain('name="People"');
    for (const part of [
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
    ])
      expect(files[part]).toBeDefined();
  });
  it('refuses an invalid sheet name', () => {
    expect(() => toXlsx([], ['a'], 'a/b')).toThrow(/Sheet names/);
  });
  it('names columns like a spreadsheet', () => {
    expect([0, 25, 26, 701, 702].map(columnName)).toEqual([
      'A',
      'Z',
      'AA',
      'ZZ',
      'AAA',
    ]);
  });
});
