import MagicString from 'magic-string';
import type { Plugin } from 'vite';
import { EMOJI_ONLY_RE } from '../eslint-rules/banned-glyphs.js';
import {
  literalPosition,
  NAME_POSITIONS,
  parseModule,
  walk,
  type AstNode,
} from './glyph-ast';

/*
 * Spec 1A.2 bans emoji, U+FE0F and regional indicators from every built
 * chunk, vendor included, and says vendor hits are fixed by wrapping the
 * dependency, never by an exemption list. Some dependencies carry such
 * characters in string literals that are not product text (a decoder probe
 * in fontkit, the HTML entity decode table, a developer hint in
 * react-router's default error screen), often as
 * escapes that the minifier prints back as raw characters.
 *
 * This build-only transform brings every vendor module to the rule the app
 * follows (spec 1A.1, decision G2): such a code point is produced at runtime
 * with String.fromCodePoint(0x...), never written as a literal. Runtime
 * values are unchanged:
 * - a string literal becomes `"head".concat(String.fromCodePoint(..), ..)`,
 *   which still starts with a string literal, so automatic semicolon
 *   insertion behaves exactly as before (no parenthesis can join it to the
 *   previous line);
 * - template text gets `${String.fromCodePoint(..)}` substitutions;
 * - object and class keys become computed keys.
 * Literals it cannot rewrite safely are left alone, so the dist scan still
 * fails on them: tagged templates, regular expressions, directives, module
 * specifiers and string import or export names.
 */

const GLYPH_G = new RegExp(EMOJI_ONLY_RE.source, 'gu');
const hasGlyph = (s: string) => {
  GLYPH_G.lastIndex = 0;
  return GLYPH_G.test(s);
};
const fromCodePoint = (g: string) =>
  `String.fromCodePoint(0x${g.codePointAt(0)!.toString(16)})`;

const ESCAPE =
  /\\u\{([0-9a-fA-F]+)\}|\\u([dD][89abAB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})|\\u([0-9a-fA-F]{4})/g;

/** Raw glyphs, or unicode escapes that decode to one. */
function mayContainGlyph(code: string): boolean {
  if (EMOJI_ONLY_RE.test(code)) return true;
  for (const m of code.matchAll(ESCAPE)) {
    const s = m[1]
      ? String.fromCodePoint(Math.min(parseInt(m[1], 16), 0x10ffff))
      : m[2]
        ? String.fromCharCode(parseInt(m[2], 16), parseInt(m[3], 16))
        : String.fromCharCode(parseInt(m[4], 16));
    if (EMOJI_ONLY_RE.test(s)) return true;
  }
  return false;
}

/** `"ab".concat(String.fromCodePoint(0x1f4a9), "c")` for a cooked value. */
function toExpression(value: string): string {
  const parts: string[] = [];
  let last = 0;
  for (const m of value.matchAll(new RegExp(GLYPH_G))) {
    if (m.index > last) parts.push(JSON.stringify(value.slice(last, m.index)));
    parts.push(fromCodePoint(m[0]));
    last = m.index + m[0].length;
  }
  if (last < value.length) parts.push(JSON.stringify(value.slice(last)));
  const head = parts[0].startsWith('"') ? parts.shift()! : '""';
  return `${head}.concat(${parts.join(', ')})`;
}

/** Template text rebuilt from its cooked value, glyphs as substitutions. */
function toTemplateText(cooked: string): string {
  return cooked
    .replace(/\\|`|\$\{/g, (s) => `\\${s}`)
    .replace(/\r/g, '\\r')
    .replace(GLYPH_G, (g) => '${' + fromCodePoint(g) + '}');
}

const KEY_PARENTS = new Set([
  'Property',
  'MethodDefinition',
  'PropertyDefinition',
]);

/** The rewrite with a sourcemap, or null when nothing changes. */
export function rewriteGlyphLiterals(
  code: string,
  filename = 'x.js',
): { code: string; map: ReturnType<MagicString['generateMap']> } | null {
  if (!mayContainGlyph(code)) return null;
  const s = new MagicString(code);
  let changed = false;
  walk(parseModule(code, filename), (node: AstNode, ctx) => {
    if (node.type === 'TaggedTemplateExpression') return false;
    if (node.type === 'Literal' && typeof node.value === 'string') {
      if (!hasGlyph(node.value)) return false;
      if (NAME_POSITIONS.has(literalPosition(ctx))) return false;
      if (ctx.parent?.type === 'ExpressionStatement' && ctx.parent.directive)
        return false;
      const expr = toExpression(node.value);
      const p = ctx.parent;
      let text = expr;
      if (ctx.key === 'key' && p && KEY_PARENTS.has(p.type) && !p.computed)
        text = `[${expr}]`;
      else if (p?.type === 'JSXAttribute') text = `{${expr}}`;
      s.overwrite(node.start, node.end, text);
      changed = true;
      return false;
    }
    if (node.type === 'TemplateElement') {
      const cooked = (node.value as { cooked: string | null }).cooked;
      if (cooked !== null && hasGlyph(cooked)) {
        s.overwrite(node.start, node.end, toTemplateText(cooked));
        changed = true;
      }
      return false;
    }
    return true;
  });
  if (!changed) return null;
  return {
    code: s.toString(),
    map: s.generateMap({ hires: true, source: filename }),
  };
}

/** Rewrites emoji in string literals and untagged template quasis. */
export function escapeGlyphLiterals(code: string, filename = 'x.js'): string {
  return rewriteGlyphLiterals(code, filename)?.code ?? code;
}

/** Ids the plugin rewrites: JavaScript under node_modules only. */
export const isVendorScript = (id: string) =>
  /[\\/]node_modules[\\/]/.test(id) &&
  /\.[cm]?js$/.test(id.replace(/\?.*$/, ''));

export function escapeVendorGlyphs(): Plugin {
  return {
    name: 'escape-vendor-glyphs',
    apply: 'build',
    enforce: 'post',
    transform(code, id) {
      if (!isVendorScript(id)) return null;
      return rewriteGlyphLiterals(code, id.replace(/\?.*$/, ''));
    },
  };
}
