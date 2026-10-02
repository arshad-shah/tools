import { describe, expect, it } from 'vitest';
import { toolsAccepting } from '@/app/registry';
import { csvTextPayload, jsonPayload } from './send';

const rows = [
  { name: 'Ada', n: 1 },
  { name: 'Grace', n: null },
];
const ids = (mime: string) => toolsAccepting(mime).map((t) => t.id);

describe('csv-viewer Send to payloads (spec 8.2)', () => {
  it('sends the shown rows as JSON to the JSON Viewer', () => {
    const p = jsonPayload(rows, 'people.csv');
    expect(p.mime).toBe('application/json');
    expect(p.filename).toBe('people.json');
    expect(JSON.parse(p.text)).toEqual(rows);
    expect(ids(p.mime)).toContain('json-and-xml-viewer');
  });

  it('sends the shown rows as CSV text, which Text Diff lists', () => {
    const p = csvTextPayload(rows, ['name', 'n'], 'people.csv');
    expect(p.mime).toBe('text/plain');
    expect(p.filename).toBe('people.csv');
    expect(p.text.split(/\r?\n/)[0]).toBe('name,n');
    expect(ids(p.mime)).toContain('text-diff-checker');
  });
});
