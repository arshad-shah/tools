import { describe, expect, it } from 'vitest';
import { emitOpts, model, orderModel } from './fixtures';
import { emitPython, isPyIdent, pyIdent } from './python';

describe('Python dataclasses', () => {
  it('emits dataclasses in dependency order, defaults last', () => {
    expect(emitPython(orderModel(), emitOpts())).toMatchInlineSnapshot(`
      "from __future__ import annotations

      from dataclasses import dataclass, field
      from datetime import datetime
      from typing import Any


      @dataclass
      class Shipping:
          street: str
          zip: None


      @dataclass
      class Item:
          sku: str
          qty: int | None
          gift: bool | None = None


      @dataclass
      class Order:
          id: int
          first_name: str = field(metadata={"json": "first-name"})
          total: float
          paid: bool
          created: datetime
          tags: list[Any]
          note: None
          shipping: Shipping
          items: list[Item]
      "
    `);
  });

  it('renames keys that are not identifiers and keeps the key as metadata', () => {
    const out = emitPython(
      model([{ class: 1, 'a b': 'x' }, { class: 2 }], 'R'),
      emitOpts(),
    );
    expect(out).toContain(
      '    class_: int = field(metadata={"json": "class"})',
    );
    expect(out).toContain(
      '    a_b: str | None = field(default=None, metadata={"json": "a b"})',
    );
    expect(out).toContain('from dataclasses import dataclass, field');
  });

  it('imports only what it uses', () => {
    const out = emitPython(model([{ a: 1 }], 'R'), emitOpts());
    expect(out).toBe(
      'from __future__ import annotations\n\nfrom dataclasses import dataclass\n\n\n@dataclass\nclass R:\n    a: int\n',
    );
  });

  it('a root array is a list alias', () => {
    const out = emitPython(model([['2024-01-01']], 'Days'), emitOpts());
    expect(out).toBe(
      'from __future__ import annotations\n\nfrom datetime import date\n\n\nDays = list[date]\n',
    );
  });

  it('identifiers', () => {
    expect(isPyIdent('ok_1')).toBe(true);
    expect(isPyIdent('def')).toBe(false);
    expect(pyIdent('firstName')).toBe('firstName');
    expect(pyIdent('first-name')).toBe('first_name');
    expect(pyIdent('import')).toBe('import_');
  });
});

describe('Python TypedDict', () => {
  const opts = emitOpts({ pythonStyle: 'typeddict' });

  it('emits TypedDict classes with NotRequired', () => {
    expect(emitPython(orderModel(), opts)).toMatchInlineSnapshot(`
      "from __future__ import annotations

      from datetime import datetime
      from typing import Any, NotRequired, TypedDict


      class Shipping(TypedDict):
          street: str
          zip: None


      class Item(TypedDict):
          sku: str
          qty: int | None
          gift: NotRequired[bool]


      Order = TypedDict(
          "Order",
          {
              "id": int,
              "first-name": str,
              "total": float,
              "paid": bool,
              "created": datetime,
              "tags": list[Any],
              "note": None,
              "shipping": Shipping,
              "items": list[Item],
          },
      )
      "
    `);
  });

  it('uses the functional form for keys that are not identifiers', () => {
    const out = emitPython(model([{ 'first-name': 'a', ok: 1 }], 'R'), opts);
    expect(out).toContain(
      'R = TypedDict(\n    "R",\n    {\n        "first-name": str,\n        "ok": int,\n    },\n)',
    );
  });

  it('an empty object is a dict alias', () => {
    expect(emitPython(model([{}], 'Bag'), opts)).toContain(
      'Bag = dict[str, Any]',
    );
  });
});
