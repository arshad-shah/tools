import { describe, expect, it } from 'vitest';
import { PRESETS } from './presets';
import { schemaFromJson, schemaToJson } from './schema-io';

describe('schema import and export', () => {
  it('round-trips a preset', () => {
    expect(schemaFromJson(schemaToJson(PRESETS.orders))).toEqual(
      PRESETS.orders,
    );
  });

  it('drops editor ids', () => {
    const json = schemaToJson({
      tables: [{ name: 't', fields: [{ id: 'x1', name: 'a', type: 'int' }] }],
    });
    expect(json).not.toContain('x1');
  });

  it('reports bad JSON and bad schemas', () => {
    expect(() => schemaFromJson('{')).toThrow(/not valid JSON/);
    expect(() =>
      schemaFromJson(
        '{"tables":[{"name":"t","fields":[{"name":"a","type":"x"}]}]}',
      ),
    ).toThrow(/tables\[0\]\.fields\[0\]\.type/);
  });
});
