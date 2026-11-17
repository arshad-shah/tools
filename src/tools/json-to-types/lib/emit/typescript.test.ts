import { describe, expect, it } from 'vitest';
import { emitOpts, model, orderModel } from './fixtures';
import { emitTypeScript, tsKey, tsType } from './typescript';
import { emitZod, zodType } from './zod';

describe('TypeScript', () => {
  it('emits interfaces with optional and nullable fields', () => {
    expect(emitTypeScript(orderModel(), emitOpts())).toMatchInlineSnapshot(`
      "export interface Order {
        id: number;
        "first-name": string;
        total: number;
        paid: boolean;
        created: string;
        tags: unknown[];
        note: null;
        shipping: Shipping;
        items: Item[];
      }

      export interface Shipping {
        street: string;
        zip: null;
      }

      export interface Item {
        sku: string;
        qty: number | null;
        gift?: boolean;
      }
      "
    `);
  });

  it('emits type aliases when asked', () => {
    const out = emitTypeScript(
      orderModel(),
      emitOpts({ tsDeclaration: 'type' }),
    );
    expect(out).toContain('export type Order = {\n  id: number;');
    expect(out).not.toContain('interface');
  });

  it('a root array is an alias of its items', () => {
    const out = emitTypeScript(model([[{ a: 1 }, null]], 'Rows'), emitOpts());
    expect(out).toMatch(
      /^export type Rows = \(Row \| null\)\[\];\n\nexport interface Row \{/,
    );
  });

  it('a root primitive union is an alias', () => {
    expect(emitTypeScript(model([1, 'a'], 'Value'), emitOpts())).toBe(
      'export type Value = string | number;\n',
    );
  });

  it('an empty object is a record', () => {
    expect(emitTypeScript(model([{}], 'Bag'), emitOpts())).toBe(
      'export type Bag = Record<string, unknown>;\n',
    );
  });

  it('quotes keys that are not identifiers', () => {
    expect(tsKey('ok_1')).toBe('ok_1');
    expect(tsKey('first name')).toBe('"first name"');
    expect(tsKey('a"b')).toBe('"a\\"b"');
  });

  it('wraps array items that are unions', () => {
    expect(
      tsType({
        kind: 'array',
        items: { type: { kind: 'string' }, nullable: true },
      }),
    ).toBe('(string | null)[]');
    expect(
      tsType({
        kind: 'array',
        items: {
          type: {
            kind: 'array',
            items: { type: { kind: 'integer' }, nullable: false },
          },
          nullable: false,
        },
      }),
    ).toBe('number[][]');
  });
});

describe('Zod', () => {
  it('emits schemas after their dependencies with inferred types', () => {
    expect(emitZod(orderModel(), emitOpts())).toMatchInlineSnapshot(`
      "import { z } from 'zod';

      export const ShippingSchema = z.object({
        street: z.string(),
        zip: z.null(),
      });
      export type Shipping = z.infer<typeof ShippingSchema>;

      export const ItemSchema = z.object({
        sku: z.string(),
        qty: z.number().int().nullable(),
        gift: z.boolean().optional(),
      });
      export type Item = z.infer<typeof ItemSchema>;

      export const OrderSchema = z.object({
        id: z.number().int(),
        "first-name": z.string(),
        total: z.number(),
        paid: z.boolean(),
        created: z.string().datetime({ offset: true }),
        tags: z.array(z.unknown()),
        note: z.null(),
        shipping: ShippingSchema,
        items: z.array(ItemSchema),
      });
      export type Order = z.infer<typeof OrderSchema>;
      "
    `);
  });

  it('maps every scalar', () => {
    expect(zodType({ kind: 'string', format: 'date' })).toBe(
      'z.string().date()',
    );
    expect(zodType({ kind: 'integer' })).toBe('z.number().int()');
    expect(zodType({ kind: 'null' })).toBe('z.null()');
    expect(zodType({ kind: 'unknown' })).toBe('z.unknown()');
    expect(
      zodType({
        kind: 'union',
        members: [{ kind: 'string' }, { kind: 'boolean' }],
      }),
    ).toBe('z.union([z.string(), z.boolean()])');
  });

  it('a root array gets its own schema last', () => {
    const out = emitZod(model([[{ a: 1 }]], 'List'), emitOpts());
    expect(out.trimEnd().split('\n').slice(-2)).toEqual([
      'export const ListSchema = z.array(ListItemSchema);',
      'export type List = z.infer<typeof ListSchema>;',
    ]);
    expect(out.indexOf('ListItemSchema = ')).toBeLessThan(
      out.indexOf('ListSchema = '),
    );
  });
});
