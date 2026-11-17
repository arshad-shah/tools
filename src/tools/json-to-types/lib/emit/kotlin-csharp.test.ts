import { describe, expect, it } from 'vitest';
import { csharpIdent, emitCSharp } from './csharp';
import { emitOpts, model, orderModel } from './fixtures';
import { emitKotlin, kotlinIdent } from './kotlin';

describe('Kotlin', () => {
  it('emits serializable data classes', () => {
    expect(emitKotlin(orderModel(), emitOpts())).toMatchInlineSnapshot(`
      "import kotlinx.serialization.SerialName
      import kotlinx.serialization.Serializable
      import kotlinx.serialization.json.JsonElement

      @Serializable
      data class Order(
          val id: Long,
          @SerialName("first-name")
          val firstName: String,
          val total: Double,
          val paid: Boolean,
          val created: String,
          val tags: List<JsonElement>,
          val note: JsonElement?,
          val shipping: Shipping,
          val items: List<Item>,
      )

      @Serializable
      data class Shipping(
          val street: String,
          val zip: JsonElement?,
      )

      @Serializable
      data class Item(
          val sku: String,
          val qty: Long?,
          val gift: Boolean? = null,
      )
      "
    `);
  });

  it('camelCases names and back-quotes keywords', () => {
    expect(kotlinIdent('first_name')).toBe('firstName');
    expect(kotlinIdent('object')).toBe('`object`');
    const out = emitKotlin(model([{ object: 1 }], 'R'), emitOpts());
    expect(out).toContain('    val `object`: Long,');
    expect(out).not.toContain('SerialName');
  });

  it('a root array is a typealias and an empty object a JsonObject', () => {
    const out = emitKotlin(model([[{}]], 'Rows'), emitOpts());
    expect(out).toContain('typealias Rows = List<Row>');
    expect(out).toContain('typealias Row = JsonObject');
    expect(out).toContain('import kotlinx.serialization.json.JsonObject');
  });
});

describe('C#', () => {
  it('emits records with JsonPropertyName and required members', () => {
    expect(emitCSharp(orderModel(), emitOpts())).toMatchInlineSnapshot(`
      "using System;
      using System.Collections.Generic;
      using System.Text.Json;
      using System.Text.Json.Serialization;

      public record Order
      {
          [JsonPropertyName("id")]
          public required long Id { get; init; }

          [JsonPropertyName("first-name")]
          public required string FirstName { get; init; }

          [JsonPropertyName("total")]
          public required double Total { get; init; }

          [JsonPropertyName("paid")]
          public required bool Paid { get; init; }

          [JsonPropertyName("created")]
          public required DateTimeOffset Created { get; init; }

          [JsonPropertyName("tags")]
          public required List<JsonElement> Tags { get; init; }

          [JsonPropertyName("note")]
          public required JsonElement? Note { get; init; }

          [JsonPropertyName("shipping")]
          public required Shipping Shipping { get; init; }

          [JsonPropertyName("items")]
          public required List<Item> Items { get; init; }
      }

      public record Shipping
      {
          [JsonPropertyName("street")]
          public required string Street { get; init; }

          [JsonPropertyName("zip")]
          public required JsonElement? Zip { get; init; }
      }

      public record Item
      {
          [JsonPropertyName("sku")]
          public required string Sku { get; init; }

          [JsonPropertyName("qty")]
          public required long? Qty { get; init; }

          [JsonPropertyName("gift")]
          public bool? Gift { get; init; }
      }
      "
    `);
  });

  it('a member never takes its record name', () => {
    const out = emitCSharp(model([{ r: 1 }], 'R'), emitOpts());
    expect(out).toContain('public required long RValue { get; init; }');
    expect(csharpIdent('9')).toBe('Field9');
  });

  it('a root array is a C# 12 alias spelled in full', () => {
    const out = emitCSharp(
      model([[{ at: '2024-01-01T00:00:00Z' }]], 'Rows'),
      emitOpts(),
    );
    expect(out).toContain('using Rows = System.Collections.Generic.List<Row>;');
    expect(out).toContain('using System;');
    expect(out).toContain('public required DateTimeOffset At { get; init; }');
  });

  it('dates and dynamic values', () => {
    const out = emitCSharp(
      model([{ d: '2024-01-01', v: [] }], 'R'),
      emitOpts(),
    );
    expect(out).toContain('public required DateOnly D { get; init; }');
    expect(out).toContain('public required List<JsonElement> V { get; init; }');
    expect(out).toContain('using System.Text.Json;');
  });
});
