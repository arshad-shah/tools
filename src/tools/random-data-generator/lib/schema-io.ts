import {
  parseMockSchema,
  type MockSchema,
} from '@/shared/lib/data-formats/mock-schema';
import { ToolError } from '@/shared/lib/errors';

export { MOCK_SCHEMA_MIME } from '@/shared/lib/data-formats/mock-schema';

/** Strips editor-only ids so exported schemas stay clean. */
function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (typeof value !== 'object' || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value))
    if (k !== 'id' || typeof v !== 'string') out[k] = withoutIds(v);
  return out;
}

/** The schema as pretty JSON for download or hand-off. */
export function schemaToJson(schema: MockSchema): string {
  return JSON.stringify(withoutIds(schema), null, 2) + '\n';
}

/** A schema from JSON text, or INVALID_INPUT (bad JSON or a bad schema). */
export function schemaFromJson(text: string): MockSchema {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new ToolError(
      'INVALID_INPUT',
      `This is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return parseMockSchema(raw);
}
