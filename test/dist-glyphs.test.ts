import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EMOJI_ONLY_RE,
  findBanned,
  hex,
} from '../eslint-rules/banned-glyphs.js';
import {
  GLYPH_REPORT_PATH,
  type GlyphReport,
} from '../scripts/vite-glyph-report';

/*
 * Spec 1A.2: scans the production build. Runs after `pnpm build` (CI builds
 * before unit tests); locally it is skipped when there is no dist/.
 */
const DIST = 'dist';
const INDEX = join(DIST, 'index.html');
const built = existsSync(INDEX);
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) =>
    statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
  );
// pdf.js assets are copied verbatim from pdfjs-dist (vendor, not bundled).
const files = built
  ? walk(DIST).filter((f) => /\.(js|mjs|css|html|json|svg)$/.test(f))
  : [];
const appFiles = files.filter(
  (f) => !f.replace(/\\/g, '/').startsWith(`${DIST}/pdfjs/`),
);
const readReport = (): GlyphReport =>
  JSON.parse(readFileSync(GLYPH_REPORT_PATH, 'utf8'));

describe.skipIf(!built && !process.env.CI)('built assets (spec 1A.2)', () => {
  it('a build exists in CI', () => expect(built).toBe(true));

  it('no emoji, FE0F or regional indicators in any chunk (vendor included)', () => {
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      const m = EMOJI_ONLY_RE.exec(text);
      if (m)
        hits.push(
          `${f} @${m.index} ${hex(m[0].codePointAt(0)!)} ${JSON.stringify(text.slice(Math.max(0, m.index - 40), m.index + 40))}`,
        );
    }
    expect(hits).toEqual([]);
  });

  it('no rule-(a) glyph in app CSS, HTML or SVG', () => {
    const hits: string[] = [];
    for (const f of appFiles.filter((x) => /\.(css|html|svg)$/.test(x))) {
      const hit = findBanned(readFileSync(f, 'utf8'));
      if (hit) hits.push(`${f} @${hit.index} ${hex(hit.codePoint)}`);
    }
    expect(hits).toEqual([]);
  });

  it('the Vite report belongs to this build', () => {
    const report = readReport();
    const builtAt = Date.parse(report.builtAt);
    expect(builtAt).toBeGreaterThanOrEqual(statSync(INDEX).mtimeMs - 60_000);
  });

  it('no rule-(a) glyph in app module output (Vite report)', () => {
    const report = readReport();
    expect(report.scannedModules).toBeGreaterThan(100);
    expect(report.appHits).toEqual([]);
  });

  it('lucide-react is reached only from src/shared/ui/icons', () => {
    const { lucideImporters } = readReport();
    expect(
      lucideImporters.filter((m) => !m.startsWith('src/shared/ui/icons/')),
    ).toEqual([]);
    expect(lucideImporters.length).toBeGreaterThan(0);
  });

  it('the dev-only kit gallery is absent from the build', () => {
    // The route path and the component name (store-kit's own `__kit_probe__`
    // storage key is unrelated).
    const GALLERY = /\/__kit\b|KitGallery/;
    const hits = appFiles.filter((f) => GALLERY.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
