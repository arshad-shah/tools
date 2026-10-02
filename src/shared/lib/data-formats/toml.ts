import { ToolError } from '@/shared/lib/errors';

/** TOML via `smol-toml` (BSD-3-Clause), loaded on first use. */

export async function parseToml(
  text: string,
): Promise<Record<string, unknown>> {
  const { parse } = await import('smol-toml');
  try {
    return parse(text) as Record<string, unknown>;
  } catch (e) {
    const err = e as { message?: string; line?: number; column?: number };
    const first = (err.message ?? 'Invalid TOML').split('\n')[0];
    const where =
      err.line !== undefined && err.column !== undefined
        ? ` at line ${err.line}, column ${err.column}`
        : '';
    throw Object.assign(
      new ToolError('INVALID_INPUT', `${first}${where}`, { cause: e }),
      where ? { line: err.line, column: err.column } : {},
    );
  }
}

/** Serialises a table (a plain object) as TOML. */
export async function toToml(value: Record<string, unknown>): Promise<string> {
  const { stringify } = await import('smol-toml');
  try {
    return stringify(value);
  } catch (e) {
    throw new ToolError(
      'INVALID_INPUT',
      `This data cannot be written as TOML: ${(e as Error).message}`,
      { cause: e },
    );
  }
}
