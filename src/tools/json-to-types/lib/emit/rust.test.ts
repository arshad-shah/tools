import { describe, expect, it } from 'vitest';
import { emitOpts, model, orderModel } from './fixtures';
import { emitRust, rustIdent } from './rust';

describe('Rust', () => {
  it('emits serde structs with renames and options', () => {
    expect(emitRust(orderModel(), emitOpts())).toMatchInlineSnapshot(`
      "use serde::{Deserialize, Serialize};

      #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
      pub struct Order {
          pub id: i64,
          #[serde(rename = "first-name")]
          pub first_name: String,
          pub total: f64,
          pub paid: bool,
          /// Date-time (RFC 3339).
          pub created: String,
          pub tags: Vec<serde_json::Value>,
          pub note: serde_json::Value,
          pub shipping: Shipping,
          pub items: Vec<Item>,
      }

      #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
      pub struct Shipping {
          pub street: String,
          pub zip: serde_json::Value,
      }

      #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
      pub struct Item {
          pub sku: String,
          pub qty: Option<i64>,
          #[serde(default, skip_serializing_if = "Option::is_none")]
          pub gift: Option<bool>,
      }
      "
    `);
  });

  it('snake_cases names and escapes keywords', () => {
    expect(rustIdent('firstName')).toBe('first_name');
    expect(rustIdent('type')).toBe('r#type');
    expect(rustIdent('self')).toBe('self_');
    expect(rustIdent('')).toBe('field');
  });

  it('raw identifiers need no rename, changed names do', () => {
    const out = emitRust(
      model([{ type: 'a', self: 1, ok: true }], 'R'),
      emitOpts(),
    );
    expect(out).toContain('    pub r#type: String,');
    expect(out).not.toContain('rename = "type"');
    expect(out).toContain('    #[serde(rename = "self")]\n    pub self_: i64,');
    expect(out).toContain('    pub ok: bool,');
  });

  it('an optional dynamic field defaults without Option', () => {
    const out = emitRust(model([{ v: 1 }, { v: 'x' }, {}], 'R'), emitOpts());
    expect(out).toContain(
      '    #[serde(default)]\n    pub v: serde_json::Value,',
    );
  });

  it('a root array is a Vec alias', () => {
    expect(emitRust(model([[1.5, null]], 'Nums'), emitOpts())).toBe(
      'use serde::{Deserialize, Serialize};\n\npub type Nums = Vec<Option<f64>>;\n',
    );
  });
});
