/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { parseXml } from '@/shared/lib/data-formats';
import { findById, fromXml } from './doc-model';
import { queryXPath } from './xpath';

const text = `<?xml version="1.0"?>
<catalog>
  <!-- books -->
  <book id="b1" lang="en"><title>One</title></book>
  <book id="b2" lang="fr"><title>Deux</title></book>
  <book id="b3" lang="en"><title>Three</title>tail</book>
</catalog>`;
const xml = parseXml(text);
const doc = fromXml(xml, text);

describe('queryXPath', () => {
  it('returns nodes named by their doc-model ids', () => {
    const rows = queryXPath(xml, "//book[@lang='en']/title");
    expect(rows).toEqual([
      { nodeId: '/catalog/book[1]/title', text: 'One' },
      { nodeId: '/catalog/book[3]/title', text: 'Three' },
    ]);
    for (const r of rows) expect(findById(doc, r.nodeId)).not.toBeNull();
  });

  it('names attributes, text and comments as the model does', () => {
    const ids = [
      ...queryXPath(xml, '//book/@id'),
      ...queryXPath(xml, '/catalog/book[3]/text()'),
      ...queryXPath(xml, '//comment()'),
    ].map((r) => r.nodeId);
    expect(ids).toEqual([
      '/catalog/book[1]/@id',
      '/catalog/book[2]/@id',
      '/catalog/book[3]/@id',
      '/catalog/book[3]/text()[1]',
      '/catalog/comment()[1]',
    ]);
    for (const id of ids) expect(findById(doc, id)).not.toBeNull();
  });

  it('returns a number, string or boolean as one row', () => {
    expect(queryXPath(xml, 'count(//book)')).toEqual([
      { nodeId: '', text: '3' },
    ]);
    expect(queryXPath(xml, 'string(//book[2]/@id)')).toEqual([
      { nodeId: '', text: 'b2' },
    ]);
    expect(queryXPath(xml, 'count(//book) > 2')).toEqual([
      { nodeId: '', text: 'true' },
    ]);
  });

  it('reports an invalid expression as INVALID_INPUT', () => {
    expect(() => queryXPath(xml, '//[')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});
