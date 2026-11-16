import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * tools draws no icons of its own (tools#104 Phase 3.2): every kit icon is a
 * Facet icon or a Cynosure brand mark, drawn by Cynosure's Icon. Only the
 * product's own logo (icons/brand) is SVG written here. A missing icon is
 * drawn in Cynosure (GAPS-icons.md), never here.
 */
const ROOT = 'src/shared/ui/icons';

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}

const SVG = /<(svg|path|rect|circle|ellipse|line|polyline|polygon)\b/;

describe('kit icons are Facet icons', () => {
  const sources = files(ROOT).filter((f) => !f.startsWith(join(ROOT, 'brand')));

  it('scans the icon module', () => {
    expect(sources).toContain(join(ROOT, 'facet.ts'));
  });

  it.each(sources)('%s draws no SVG of its own', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(SVG);
  });

  it('no custom icon helper is left', () => {
    const index = readFileSync(join(ROOT, 'index.ts'), 'utf8');
    expect(index).not.toMatch(/defineIcon|fromLucide/);
  });
});
