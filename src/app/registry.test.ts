import { describe, expect, it } from 'vitest';
import { FileText } from 'lucide-react';
import { buildRegistry, TOOLS } from './registry';
import { defineTool } from './tool';

const fake = (id: string, name = id) =>
  defineTool({
    id,
    name,
    description: 'd',
    icon: FileText,
    enabled: true,
    category: 'pdf',
    load: async () => ({ default: () => null }),
  });

describe('buildRegistry', () => {
  it('sorts by name', () => {
    const list = buildRegistry({
      '../tools/b/index.ts': { default: fake('b', 'Beta') },
      '../tools/a/index.ts': { default: fake('a', 'Alpha') },
    });
    expect(list.map((t) => t.id)).toEqual(['a', 'b']);
  });
  it('rejects duplicate ids, naming both files', () => {
    expect(() =>
      buildRegistry({
        '../tools/x/index.ts': { default: fake('dup') },
        '../tools/y/index.ts': { default: fake('dup') },
      }),
    ).toThrow(/Duplicate tool id "dup".*y\/index\.ts.*x\/index\.ts/);
  });
  it('rejects modules without a manifest', () => {
    expect(() =>
      buildRegistry({ '../tools/z/index.ts': { default: undefined as never } }),
    ).toThrow(/must default-export defineTool/);
  });
});

describe('TOOLS', () => {
  it('discovers every existing tool exactly once', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        'color-tester',
        'password-generator',
        'regex-tester',
        'number-converter',
        'qr-code-generator',
        'json-and-xml-viewer',
        'pomodoro',
        'unit-converter',
        'text-diff-checker',
        'image-optimizer',
        'csv-viewer',
        'random-data-generator',
        'url-encoder-decoder',
        'date-calculator',
        'hash-generator',
        'base64-converter',
        'jwt-decode',
        'url-parser',
        'api-request',
        'calculator',
        'log-parser',
        'rive-animation-player',
        'pdf-merger',
        'pdf-splitter',
        'pdf-compressor',
      ]),
    );
    for (const t of TOOLS) expect(typeof t.load).toBe('function');
  });
});
