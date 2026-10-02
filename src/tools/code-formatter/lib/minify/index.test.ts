import { describe, expect, it } from 'vitest';
import { minifyCode } from '.';

describe('minifyCode', () => {
  it('minifies JSON and reports invalid input with a position', async () => {
    expect(await minifyCode('{\n  "a": [1, 2]\n}', 'json')).toEqual({
      code: '{"a":[1,2]}',
      before: 17,
      after: 11,
    });
    await expect(minifyCode('{"a": }', 'json')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      line: 1,
    });
  });

  it('makes CSS smaller', async () => {
    const css = '.a {\n  color: #ff0000;\n  margin: 0px 0px 0px 0px;\n}\n';
    const r = await minifyCode(css, 'css');
    expect(r.code).toBe('.a{color:red;margin:0}');
    expect(r.after).toBeLessThan(r.before);
  });

  it('shortens a local variable when mangling', async () => {
    const js =
      'export function f(x) { const longVariableName = x * 2; return longVariableName + longVariableName; }';
    const on = await minifyCode(js, 'javascript');
    expect(on.code).not.toContain('longVariableName');
    expect(on.after).toBeLessThan(on.before);
    const off = await minifyCode(js, 'javascript', { mangle: false });
    expect(off.code).toContain('longVariableName');
  });

  it('keeps unused top-level functions of a script', async () => {
    const r = await minifyCode(
      'function greet(name) { return "Hi " + name; }',
      'javascript',
    );
    expect(r.code).toBe('function greet(e){return"Hi "+e}');
  });

  it('reports a JavaScript syntax error with its line', async () => {
    await expect(minifyCode('let a = ;', 'javascript')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      line: 1,
    });
  });

  it('runs the HTML and SQL minifiers', async () => {
    expect((await minifyCode('<p>  a  </p>', 'html')).code).toBe('<p> a </p>');
    expect((await minifyCode('select  1', 'sql')).code).toBe('select 1');
  });

  it('refuses XML off the main thread', async () => {
    await expect(minifyCode('<a/>', 'xml')).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
    });
  });
});
