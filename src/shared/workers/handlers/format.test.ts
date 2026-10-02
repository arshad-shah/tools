import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMAT_OPTIONS as O } from '@/tools/code-formatter/lib/languages';
import format from './format';

const ctx = { signal: new AbortController().signal, progress: () => {} };

describe('format.code handler', () => {
  it('formats code', async () => {
    expect(await format['format.code'](ctx, 'a=1', 'javascript', O)).toEqual({
      ok: true,
      code: 'a = 1;\n',
    });
  });

  it('returns syntax errors with their position', async () => {
    const r = await format['format.code'](ctx, 'const = 1', 'javascript', O);
    expect(r).toMatchObject({ ok: false, line: 1 });
  });

  it('leaves XML to the main thread', async () => {
    await expect(
      format['format.code'](ctx, '<a/>', 'xml', O),
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
    });
  });

  it('minifies and returns positioned errors', async () => {
    expect(
      await format['format.minify'](ctx, '{ "a": 1 }', 'json', {}),
    ).toEqual({ ok: true, code: '{"a":1}', before: 10, after: 7 });
    expect(
      await format['format.minify'](ctx, 'let = ;', 'javascript', {}),
    ).toMatchObject({ ok: false, line: 1 });
  });
});
