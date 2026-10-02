import { describe, expect, it } from 'vitest';
import { formatCode } from './format';
import { DEFAULT_FORMAT_OPTIONS as O } from './languages';

describe('formatCode', () => {
  it('formats JavaScript, with and without semicolons', async () => {
    expect(await formatCode('const a={b:1}', 'javascript', O)).toBe(
      'const a = { b: 1 };\n',
    );
    expect(
      await formatCode('const a={b:1}', 'javascript', { ...O, semi: false }),
    ).toBe('const a = { b: 1 }\n');
  });

  it('honours quotes, indent and bracket spacing', async () => {
    const out = await formatCode('function f(){return {a:"x"}}', 'javascript', {
      ...O,
      singleQuote: true,
      indent: 4,
      bracketSpacing: false,
    });
    expect(out).toBe("function f() {\n    return {a: 'x'};\n}\n");
    expect(
      await formatCode('if(a){b()}', 'javascript', { ...O, indent: 'tab' }),
    ).toBe('if (a) {\n\tb();\n}\n');
  });

  it('formats TypeScript generics', async () => {
    expect(
      await formatCode(
        'function id<T extends object>(x:T):T{return x}',
        'typescript',
        O,
      ),
    ).toBe('function id<T extends object>(x: T): T {\n  return x;\n}\n');
  });

  it('formats TSX', async () => {
    expect(
      await formatCode('const A=(p:{x:number})=><b>{p.x}</b>', 'tsx', O),
    ).toBe('const A = (p: { x: number }) => <b>{p.x}</b>;\n');
  });

  it('formats JSON', async () => {
    expect(await formatCode('{"a":[1,2],"b":{"c":true}}', 'json', O)).toBe(
      '{ "a": [1, 2], "b": { "c": true } }\n',
    );
  });

  it('formats CSS, SCSS and Less', async () => {
    expect(await formatCode('a{color:red;margin:0}', 'css', O)).toBe(
      'a {\n  color: red;\n  margin: 0;\n}\n',
    );
    expect(await formatCode('.a{&:hover{color:$c}}', 'scss', O)).toBe(
      '.a {\n  &:hover {\n    color: $c;\n  }\n}\n',
    );
    expect(await formatCode('@c:red;.a{color:@c}', 'less', O)).toContain(
      'color: @c;',
    );
  });

  it('indents HTML', async () => {
    expect(await formatCode('<div><p>x</p></div>', 'html', O)).toBe(
      '<div><p>x</p></div>\n',
    );
    expect(
      await formatCode(
        '<div><p>x</p><p>y</p><ul><li>a</li></ul></div>',
        'html',
        {
          ...O,
          printWidth: 20,
        },
      ),
    ).toBe(
      '<div>\n  <p>x</p>\n  <p>y</p>\n  <ul>\n    <li>a</li>\n  </ul>\n</div>\n',
    );
  });

  it('formats YAML, Markdown and GraphQL', async () => {
    expect(await formatCode('a:   1\nb:\n    - x', 'yaml', O)).toBe(
      'a: 1\nb:\n  - x\n',
    );
    expect(await formatCode('#  Title\n*  item', 'markdown', O)).toBe(
      '# Title\n\n- item\n',
    );
    expect(await formatCode('query{user(id:1){name}}', 'graphql', O)).toBe(
      'query {\n  user(id: 1) {\n    name\n  }\n}\n',
    );
  });

  it('formats SQL with upper-case keywords', async () => {
    expect(await formatCode('select a,b from t where x=1', 'sql', O)).toBe(
      'SELECT\n  a,\n  b\nFROM\n  t\nWHERE\n  x = 1\n',
    );
    expect(
      await formatCode('SELECT a FROM t', 'sql', {
        ...O,
        keywordCase: 'lower',
      }),
    ).toBe('select\n  a\nfrom\n  t\n');
  });

  it('gives a syntax error with its line', async () => {
    await expect(
      formatCode('const = 1', 'javascript', O),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      line: 1,
    });
    await expect(
      formatCode('a {\n  color: red;\n  }}', 'css', O),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', line: 3 });
  });

  it('refuses XML off the main thread', async () => {
    await expect(formatCode('<a/>', 'xml', O)).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
    });
  });
});
