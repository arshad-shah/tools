import { describe, expect, it } from 'vitest';
import { IconFileText } from '@/shared/ui/icons';
import { buildRegistry, TOOLS, toolsAccepting } from './registry';
import { defineTool, type ToolManifest } from './tool';

const fake = (
  id: string,
  name = id,
  extra: Partial<ToolManifest> = {},
): ToolManifest =>
  defineTool({
    id,
    slug: id,
    name,
    description: 'd',
    icon: IconFileText,
    enabled: true,
    category: 'pdf',
    kind: 'tool',
    keywords: ['alpha', 'beta', 'gamma'],
    load: async () => ({ default: () => null }),
    ...extra,
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
  it('has no legacy exceptions: the old PdfCompressor folder is rejected too', () => {
    expect(() =>
      buildRegistry({
        '../tools/PdfCompressor/index.ts': { default: fake('pdf-compressor') },
      }),
    ).toThrow(/Tool folder "PdfCompressor" must match its id "pdf-compressor"/);
  });
});

describe('buildRegistry: routes and search fields', () => {
  const build = (...entries: [string, ToolManifest][]) =>
    buildRegistry(
      Object.fromEntries(entries.map(([p, m]) => [p, { default: m }])),
    );

  it('rejects a duplicate (category, slug), naming both files', () => {
    expect(() =>
      build(
        ['../tools/a/index.ts', fake('a', 'A', { slug: 'merge' })],
        ['../tools/b/index.ts', fake('b', 'B', { slug: 'merge' })],
      ),
    ).toThrow(/\/pdf\/merge.*tools\/b\/index\.ts.*tools\/a\/index\.ts/);
  });
  it('allows the same slug in different categories', () => {
    expect(
      build(
        ['../tools/a/index.ts', fake('a', 'A', { slug: 'x' })],
        [
          '../tools/b/index.ts',
          fake('b', 'B', { slug: 'x', category: 'text' }),
        ],
      ),
    ).toHaveLength(2);
  });
  it('requires a kebab-case slug', () => {
    expect(() =>
      build(['../tools/a/index.ts', fake('a', 'A', { slug: 'Merge' })]),
    ).toThrow(/kebab-case/);
  });
  it('rejects a reserved slug', () => {
    expect(() =>
      build(['../tools/a/index.ts', fake('a', 'A', { slug: 'edit' })]),
    ).toThrow(/reserved/);
  });

  it('lets only the workspace take a reserved slug', () => {
    expect(() =>
      build([
        '../tools/a/index.ts',
        fake('a', 'A', { slug: 'edit', kind: 'workspace' }),
      ]),
    ).not.toThrow();
  });
  it('rejects an unknown category', () => {
    expect(() =>
      build([
        '../tools/a/index.ts',
        fake('a', 'A', { category: 'nope' as never }),
      ]),
    ).toThrow(/unknown category "nope"/);
  });
  it('rejects an unknown kind', () => {
    expect(() =>
      build(['../tools/a/index.ts', fake('a', 'A', { kind: 'app' as never })]),
    ).toThrow(/kind/);
  });
  it('rejects empty keywords', () => {
    expect(() =>
      build(['../tools/a/index.ts', fake('a', 'A', { keywords: ['ok', ''] })]),
    ).toThrow(/keywords/);
    expect(() =>
      build([
        '../tools/a/index.ts',
        fake('a', 'A', { keywords: 'x' as never }),
      ]),
    ).toThrow(/keywords/);
  });
  it('rejects alsoIn naming its own category', () => {
    expect(() =>
      build(['../tools/a/index.ts', fake('a', 'A', { alsoIn: ['pdf'] })]),
    ).toThrow(/alsoIn/);
  });
  it('rejects alsoIn naming an unknown category', () => {
    expect(() =>
      build([
        '../tools/a/index.ts',
        fake('a', 'A', { alsoIn: ['nope' as never] }),
      ]),
    ).toThrow(/alsoIn/);
  });
  it('rejects an accepts rule without kinds', () => {
    expect(() =>
      build([
        '../tools/a/index.ts',
        fake('a', 'A', { accepts: [{ kinds: [] }] }),
      ]),
    ).toThrow(/accepts/);
  });
  it('rejects malformed accepts mimes', () => {
    expect(() =>
      build([
        '../tools/a/index.ts',
        fake('a', 'A', { accepts: [{ mimes: ['not a mime'] }] }),
      ]),
    ).toThrow(/mime/);
    expect(
      build([
        '../tools/a/index.ts',
        fake('a', 'A', { accepts: [{ mimes: ['application/vnd.api+json'] }] }),
      ]),
    ).toHaveLength(1);
  });
  it('accepts a valid manifest', () => {
    expect(
      build([
        '../tools/a/index.ts',
        fake('a', 'A', {
          slug: 'merge',
          kind: 'quick-task',
          accepts: [{ kinds: ['pdf'], multiple: true, min: 2 }],
          alsoIn: ['security'],
        }),
      ]),
    ).toHaveLength(1);
  });
});

describe('TOOLS', () => {
  it('gives every tool at least three keywords', () => {
    for (const t of TOOLS) expect(t.keywords.length).toBeGreaterThanOrEqual(3);
  });

  it('discovers every existing tool exactly once', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    // One per src/tools/*/index.ts at this commit.
    expect(ids).toHaveLength(43);
    // Exact: an extra or missing manifest fails.
    expect([...ids].sort()).toEqual(
      [
        'api-request',
        'base64-converter',
        'calculator',
        'code-formatter',
        'color-tester',
        'cron-builder',
        'csv-viewer',
        'date-calculator',
        'epoch-converter',
        'exif-tool',
        'favicon-generator',
        'hash-generator',
        'image-optimizer',
        'images-to-pdf',
        'json-and-xml-viewer',
        'jwt-decode',
        'log-parser',
        'markdown-editor',
        'number-converter',
        'password-generator',
        'pdf-compressor',
        'pdf-edit',
        'pdf-merger',
        'pdf-page-numbers',
        'pdf-protect',
        'pdf-splitter',
        'pdf-to-images',
        'pdf-to-text',
        'pdf-unlock',
        'pdf-watermark',
        'pomodoro',
        'qr-code-generator',
        'qr-scanner',
        'random-data-generator',
        'regex-tester',
        'rive-animation-player',
        'text-diff-checker',
        'text-toolkit',
        'text-encrypt',
        'unit-converter',
        'url-encoder-decoder',
        'url-parser',
        'uuid-generator',
      ].sort(),
    );
    for (const t of TOOLS) expect(typeof t.load).toBe('function');
  });
});

describe('toolsAccepting', () => {
  it('lists enabled tools whose accepts name the mime', () => {
    const tools = [
      fake('j', 'J', { accepts: [{ mimes: ['application/json'] }] }),
      fake('k', 'K', {
        accepts: [{ kinds: ['csv'] }, { mimes: ['text/csv'] }],
      }),
      fake('off', 'Off', {
        enabled: false,
        accepts: [{ mimes: ['application/json'] }],
      }),
      fake('none', 'None'),
    ];
    expect(toolsAccepting('application/json', tools).map((t) => t.id)).toEqual([
      'j',
    ]);
    expect(toolsAccepting('text/csv', tools).map((t) => t.id)).toEqual(['k']);
  });
});
