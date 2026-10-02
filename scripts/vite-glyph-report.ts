import { mkdirSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { Plugin } from 'vite';
import { cookRegex, findBanned, hex } from '../eslint-rules/banned-glyphs.js';
import { parseModule, walk, type AstNode } from './glyph-ast';

export interface GlyphHit {
  offset: number;
  codePoint: string;
}

export interface GlyphReport {
  root: string;
  appHits: ({ module: string } & GlyphHit)[];
  /** Module ids (relative, forward slashes) that import lucide-react directly. */
  lucideImporters: string[];
  /** How many app script modules were scanned (proves the scan ran). */
  scannedModules: number;
  builtAt: string;
}

export const GLYPH_REPORT_PATH = 'node_modules/.tmp/glyph-report.json';

/** Every banned code point in `text`, in order. */
function allBanned(text: string): number[] {
  const found: number[] = [];
  let rest = text;
  for (let hit = findBanned(rest); hit; hit = findBanned(rest)) {
    found.push(hit.codePoint);
    rest = rest.slice(hit.index + String.fromCodePoint(hit.codePoint).length);
  }
  return found;
}

/**
 * Every rule-(a) glyph in compiled module text (spec 1A.2). The module is
 * parsed, so comments are never product text and string contents such as
 * "image/*" can never be mistaken for comments. Strings, template text
 * (cooked), regex patterns (escapes decoded) and JSX text are scanned; each
 * hit's offset is the start of the literal holding it. A module that does
 * not parse throws: the scan never passes silently.
 */
export function scanModuleText(
  code: string,
  filename = 'module.js',
): GlyphHit[] {
  const hits: GlyphHit[] = [];
  const add = (start: number, text: string) => {
    for (const cp of allBanned(text))
      hits.push({ offset: start, codePoint: hex(cp) });
  };
  walk(parseModule(code, filename), (node: AstNode) => {
    if (node.type === 'Literal') {
      if (typeof node.value === 'string') add(node.start, node.value);
      const regex = node.regex as { pattern: string } | undefined;
      if (regex) add(node.start, cookRegex(regex.pattern));
      return false;
    }
    if (node.type === 'TemplateElement') {
      const v = node.value as { cooked: string | null; raw: string };
      add(node.start, v.cooked ?? v.raw);
      return false;
    }
    if (node.type === 'JSXText') {
      add(node.start, String(node.value));
      return false;
    }
    return true;
  });
  return hits;
}

/** App modules worth scanning: compiled scripts, not styles or assets. */
const SCRIPT = /\.(?:[cm]?[jt]sx?)$/;

const IMPORTS_LUCIDE =
  /\bfrom\s*["']lucide-react(?:\/[^"']*)?["']|\bimport\s*\(\s*["']lucide-react/;

/**
 * Records banned glyphs in app-owned module output (after every transform,
 * so JSX and TS are compiled) and which modules import lucide-react. The
 * report lives outside dist, so nothing extra is deployed (decision G9).
 */
export function glyphReport(): Plugin {
  let root = '';
  const appHits: GlyphReport['appHits'] = [];
  const lucideImporters = new Set<string>();
  let scanned = 0;
  const rel = (id: string) => relative(root, id).replace(/\\/g, '/');
  const isApp = (id: string) => {
    const p = id.replace(/\\/g, '/');
    return (
      p.includes('/src/') && !p.includes('/node_modules/') && !p.includes('?')
    );
  };
  return {
    name: 'glyph-report',
    enforce: 'post',
    apply: 'build',
    configResolved(c) {
      root = c.root;
    },
    buildStart() {
      appHits.length = 0;
      lucideImporters.clear();
      scanned = 0;
    },
    transform(code, id) {
      if (!isApp(id) || !SCRIPT.test(id)) return null;
      scanned++;
      for (const hit of scanModuleText(code, id))
        appHits.push({ module: rel(id), ...hit });
      // Rolldown keeps bare specifiers in transform output, so a direct
      // import is visible here whether or not moduleParsed reports it.
      if (IMPORTS_LUCIDE.test(code)) lucideImporters.add(rel(id));
      return null;
    },
    moduleParsed(info) {
      if (!isApp(info.id)) return;
      if (
        info.importedIds.some((d) =>
          /[\\/]node_modules[\\/](\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?lucide-react[\\/]/.test(
            d,
          ),
        )
      )
        lucideImporters.add(rel(info.id));
    },
    closeBundle() {
      // The Cloudflare plugin builds more than one environment; the client
      // build is the one that bundles the app.
      if (this.environment && this.environment.name !== 'client') return;
      const report: GlyphReport = {
        root,
        appHits,
        lucideImporters: [...lucideImporters].sort(),
        scannedModules: scanned,
        builtAt: new Date().toISOString(),
      };
      mkdirSync(`${root}/node_modules/.tmp`, { recursive: true });
      writeFileSync(
        `${root}/${GLYPH_REPORT_PATH}`,
        JSON.stringify(report, null, 2),
      );
    },
  };
}
