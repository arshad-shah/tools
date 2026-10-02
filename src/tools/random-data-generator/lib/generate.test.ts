import { describe, expect, it } from 'vitest';
import { defaultSchema } from './field-types';
import type { FieldSchema } from '../types';
import {
  dataToJsonBlob,
  flattenData,
  generateData,
  getAllHeaders,
} from './generate';

const generateRandomValue = (field: FieldSchema) =>
  generateData([{ ...field, name: 'v' }], 1)[0].v;

describe('generateData', () => {
  it('generates the requested count with every required top-level field', () => {
    const data = generateData(defaultSchema, 3);
    expect(data).toHaveLength(3);
    for (const item of data) {
      expect(Object.keys(item).sort()).toEqual(
        ['address', 'email', 'id', 'name'].sort(),
      );
      expect(Object.keys(item.address as object).sort()).toEqual(
        ['city', 'country', 'street', 'zipCode'].sort(),
      );
    }
  });
});

describe('generateRandomValue', () => {
  it('produces values in the expected shapes', () => {
    expect(generateRandomValue({ name: 'u', type: 'uuid' })).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    const n = generateRandomValue({
      name: 'n',
      type: 'number',
      min: 5,
      max: 7,
    });
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThanOrEqual(7);
    expect(generateRandomValue({ name: 'c', type: 'color' })).toMatch(
      /^#[0-9a-f]{6}$/,
    );
    expect(
      generateRandomValue({
        name: 'a',
        type: 'array',
        arraySize: 4,
        fields: [{ name: 'x', type: 'boolean' }],
      }),
    ).toHaveLength(4);
    expect(generateRandomValue({ name: 'o', type: 'object' })).toEqual({});
    expect(() =>
      generateRandomValue({
        name: 'z',
        type: 'bogus',
      } as unknown as FieldSchema),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});

describe('flattenData / getAllHeaders', () => {
  it('flattens nested objects to dotted keys and stringifies arrays', () => {
    const flat = flattenData([
      { a: 1, b: { c: 'x', d: { e: true } }, f: [1, 2], g: null },
    ]);
    expect(flat).toEqual([
      { a: 1, 'b.c': 'x', 'b.d.e': true, f: '[1,2]', g: null },
    ]);
    expect(getAllHeaders([...flat, { h: 1 }])).toEqual([
      'a',
      'b.c',
      'b.d.e',
      'f',
      'g',
      'h',
    ]);
  });

  it('returns [] for empty input', () => {
    expect(flattenData([])).toEqual([]);
    expect(getAllHeaders([])).toEqual([]);
  });
});

describe('dataToJsonBlob', () => {
  it('pretty-prints JSON with the json mime type', async () => {
    const blob = dataToJsonBlob([{ a: 1 }]);
    expect(blob.type).toBe('application/json');
    expect(await blob.text()).toBe('[\n  {\n    "a": 1\n  }\n]');
  });
});
