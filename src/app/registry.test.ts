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
        '../tools/dup/index.ts': { default: fake('dup') },
        './tools/dup/index.ts': { default: fake('dup') },
      }),
    ).toThrow(
      /Duplicate tool id "dup".*\.\/tools\/dup\/index\.ts.*\.\.\/tools\/dup\/index\.ts/,
    );
  });
  it('rejects modules without a manifest', () => {
    expect(() =>
      buildRegistry({ '../tools/z/index.ts': { default: undefined as never } }),
    ).toThrow(/must default-export defineTool/);
  });
  it.each(['name', 'description', 'icon', 'category'] as const)(
    'rejects a manifest missing %s',
    (key) => {
      const bad = { ...fake('m'), [key]: undefined } as never;
      expect(() =>
        buildRegistry({ '../tools/m/index.ts': { default: bad } }),
      ).toThrow(new RegExp(`missing ${key}`));
    },
  );
  it('rejects a manifest whose load is not a function', () => {
    const bad = { ...fake('m'), load: 'nope' } as never;
    expect(() =>
      buildRegistry({ '../tools/m/index.ts': { default: bad } }),
    ).toThrow(/load to be a function/);
  });
  it('rejects a folder whose name differs from the id', () => {
    expect(() =>
      buildRegistry({
        '../tools/ColorTester/index.ts': { default: fake('color-tester') },
      }),
    ).toThrow(/Tool folder "ColorTester" must match its id "color-tester"/);
    expect(() =>
      buildRegistry({
        '../tools/pdf-thing/index.ts': { default: fake('other') },
      }),
    ).toThrow(/Tool folder "pdf-thing" must match its id "other"/);
  });
  it('rejects a manifest path that is not tools/<folder>/index.ts', () => {
    expect(() =>
      buildRegistry({ '../elsewhere/index.ts': { default: fake('x') } }),
    ).toThrow(/must live at tools\/<id>\/index\.ts/);
  });
  it('does not treat Object prototype keys as legacy folders', () => {
    expect(() =>
      buildRegistry({
        '../tools/constructor/index.ts': { default: fake('other') },
      }),
    ).toThrow(/Tool folder "constructor" must match its id "other"/);
  });
  it('tolerates the legacy PdfCompressor folder only for its own id', () => {
    expect(
      buildRegistry({
        '../tools/PdfCompressor/index.ts': { default: fake('pdf-compressor') },
      }),
    ).toHaveLength(1);
    expect(() =>
      buildRegistry({
        '../tools/PdfCompressor/index.ts': { default: fake('other') },
      }),
    ).toThrow(/Tool folder "PdfCompressor" must match its id "other"/);
  });
});

describe('TOOLS', () => {
  it('discovers every existing tool exactly once', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    // One per src/tools/*/index.ts at this commit.
    expect(ids).toHaveLength(33);
    // Exact: an extra or missing manifest fails.
    expect([...ids].sort()).toEqual(
      [
        'api-request',
        'base64-converter',
        'calculator',
        'color-tester',
        'csv-viewer',
        'date-calculator',
        'hash-generator',
        'image-optimizer',
        'images-to-pdf',
        'json-and-xml-viewer',
        'jwt-decode',
        'log-parser',
        'number-converter',
        'password-generator',
        'pdf-compressor',
        'pdf-fill-form',
        'pdf-merger',
        'pdf-metadata',
        'pdf-organize',
        'pdf-page-numbers',
        'pdf-sign',
        'pdf-splitter',
        'pdf-to-images',
        'pdf-to-text',
        'pdf-watermark',
        'pomodoro',
        'qr-code-generator',
        'random-data-generator',
        'regex-tester',
        'rive-animation-player',
        'text-diff-checker',
        'unit-converter',
        'url-encoder-decoder',
        'url-parser',
      ].sort(),
    );
    for (const t of TOOLS) expect(typeof t.load).toBe('function');
  });
});
