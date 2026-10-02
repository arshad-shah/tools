import { describe, expect, it } from 'vitest';
import { isContinuation } from './group';

/** Groups lines into entries the way the store does. */
function group(text: string): string[][] {
  const out: string[][] = [];
  let prev: string | undefined;
  for (const line of text.split('\n')) {
    if (out.length > 0 && isContinuation(line, prev))
      out[out.length - 1].push(line);
    else out.push([line]);
    prev = line;
  }
  return out;
}

const JAVA = [
  '2024-01-01 12:00:00 ERROR [main] c.e.App - Request failed',
  'java.lang.IllegalStateException: boom',
  '\tat com.example.App.handle(App.java:42)',
  '\tat com.example.App.main(App.java:10)',
  '\tat java.base/java.lang.Thread.run(Thread.java:833)',
  'Caused by: java.io.IOException: disk full',
  '\tat com.example.Store.write(Store.java:7)',
  '\tat com.example.App.handle(App.java:40)',
  '\t... 3 more',
  'Suppressed: java.lang.RuntimeException: close failed',
  '\tat com.example.Store.close(Store.java:9)',
  '\t... 4 more',
].join('\n');

const PYTHON = [
  '2024-01-01 12:00:00 ERROR worker crashed',
  'Traceback (most recent call last):',
  '  File "app.py", line 3, in <module>',
  '    main()',
  '  File "app.py", line 2, in main',
  '    raise ValueError("bad")',
  'ValueError: bad',
].join('\n');

describe('isContinuation', () => {
  it('groups a 12-line Java stack trace into one entry', () => {
    expect(JAVA.split('\n')).toHaveLength(12);
    expect(group(JAVA)).toHaveLength(1);
  });

  it('groups a Python traceback into one entry', () => {
    expect(group(PYTHON)).toHaveLength(1);
  });

  it('keeps ordinary lines apart', () => {
    expect(group(`${JAVA}\n2024-01-01 12:00:01 INFO next`)).toHaveLength(2);
    expect(group('a\nb\nc')).toHaveLength(3);
  });

  it('marks indentation, caret markers and blank handling', () => {
    expect(isContinuation('    ^', 'x')).toBe(true);
    expect(isContinuation('', 'x')).toBe(false);
    expect(isContinuation('  x', undefined)).toBe(false);
    expect(isContinuation('ValueError: bad', 'not indented')).toBe(false);
  });
});
