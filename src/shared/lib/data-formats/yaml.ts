import { ToolError } from '@/shared/lib/errors';

/** YAML via the `yaml` package (ISC), loaded on first use. */

interface YamlErrorLike {
  message?: string;
  linePos?: { line: number; col: number }[];
}

/** Parses YAML; errors carry line and column (INVALID_INPUT). */
export async function parseYaml(text: string): Promise<unknown> {
  const { parse } = await import('yaml');
  try {
    return parse(text);
  } catch (e) {
    const err = e as YamlErrorLike;
    const pos = err.linePos?.[0];
    const first = (err.message ?? 'Invalid YAML').split('\n')[0];
    const message = first.replace(/ at line \d+, column \d+:?$/, '');
    throw Object.assign(
      new ToolError(
        'INVALID_INPUT',
        pos ? `${message} at line ${pos.line}, column ${pos.col}` : message,
        { cause: e },
      ),
      pos ? { line: pos.line, column: pos.col } : {},
    );
  }
}

/** Serialises `value` as YAML. */
export async function toYaml(
  value: unknown,
  { indent = 2 }: { indent?: number } = {},
): Promise<string> {
  const { stringify } = await import('yaml');
  return stringify(value, { indent });
}
