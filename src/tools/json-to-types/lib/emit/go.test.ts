import { describe, expect, it } from 'vitest';
import { emitOpts, model, orderModel } from './fixtures';
import { emitGo, goIdent, goType } from './go';

describe('Go', () => {
  it('emits structs with json tags, pointers and omitempty', () => {
    expect(emitGo(orderModel(), emitOpts())).toMatchInlineSnapshot(`
      "package main

      import "time"

      type Order struct {
      	ID        int64     \`json:"id"\`
      	FirstName string    \`json:"first-name"\`
      	Total     float64   \`json:"total"\`
      	Paid      bool      \`json:"paid"\`
      	Created   time.Time \`json:"created"\`
      	Tags      []any     \`json:"tags"\`
      	Note      any       \`json:"note"\`
      	Shipping  Shipping  \`json:"shipping"\`
      	Items     []Item    \`json:"items"\`
      }

      type Shipping struct {
      	Street string \`json:"street"\`
      	Zip    any    \`json:"zip"\`
      }

      type Item struct {
      	Sku  string \`json:"sku"\`
      	Qty  *int64 \`json:"qty"\`
      	Gift *bool  \`json:"gift,omitempty"\`
      }
      "
    `);
  });

  it('exported names follow Go initialisms', () => {
    expect(goIdent('user_id')).toBe('UserID');
    expect(goIdent('apiUrl')).toBe('APIURL');
    expect(goIdent('html-body')).toBe('HTMLBody');
    expect(goIdent('2fa')).toBe('Field2fa');
    expect(goIdent('---')).toBe('Field');
  });

  it('dedupes field names that collide', () => {
    const out = emitGo(model([{ user_id: 1, userId: 2 }], 'R'), emitOpts());
    expect(out).toContain('UserID  int64 `json:"user_id"`');
    expect(out).toContain('UserID2 int64 `json:"userId"`');
  });

  it('imports time only for date-times', () => {
    expect(emitGo(model([{ d: '2024-01-01' }], 'R'), emitOpts())).not.toContain(
      'import',
    );
    expect(
      emitGo(model([{ d: '2024-01-01T00:00:00Z' }], 'R'), emitOpts()),
    ).toContain('import "time"');
  });

  it('a root array is a named slice', () => {
    const out = emitGo(model([[{ a: 1 }]], 'Rows'), emitOpts());
    expect(out).toContain('type Rows []Row\n');
    expect(out).toContain('type Row struct {');
  });

  it('dynamic values are any and slices never take pointers', () => {
    expect(goType({ kind: 'union', members: [] }, true)).toBe('any');
    expect(
      goType(
        { kind: 'array', items: { type: { kind: 'integer' }, nullable: true } },
        true,
      ),
    ).toBe('[]*int64');
  });

  it('an empty object is a map', () => {
    expect(emitGo(model([{}], 'Bag'), emitOpts())).toBe(
      'package main\n\ntype Bag map[string]any\n',
    );
  });
});
