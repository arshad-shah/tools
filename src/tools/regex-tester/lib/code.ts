import { parseRegex, type RegexNode } from './explain/parser';

const LINE_TERMINATOR_ESCAPES: Record<string, string> = {
  '\n': '\\n',
  '\r': '\\r',
  [String.fromCharCode(0x2028)]: '\\u2028',
  [String.fromCharCode(0x2029)]: '\\u2029',
};

/**
 * A JavaScript regex literal for `pattern`: unescaped `/` is escaped and
 * line terminators (which cannot appear in a literal) become escapes, so
 * the literal means exactly what `new RegExp(pattern, flags)` means.
 */
export function toRegexLiteral(pattern: string, flags: string): string {
  if (pattern === '') return `/(?:)/${flags}`;
  let out = '';
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      // "\<newline>" is an identity escape for the newline itself.
      out += LINE_TERMINATOR_ESCAPES[next] ?? `\\${next}`;
      i++;
      continue;
    }
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    // A "/" inside [...] does not end a literal; elsewhere it must be escaped.
    if (c === '/' && !inClass) out += '\\/';
    else out += LINE_TERMINATOR_ESCAPES[c] ?? c;
  }
  return `/${out}/${flags}`;
}

/** A runnable snippet: the regex, the test text as a safe string, matches. */
export function toJsSnippet(
  pattern: string,
  flags: string,
  text: string,
): string {
  const call = flags.includes('g')
    ? '[...text.matchAll(regex)]'
    : 'text.match(regex)';
  return [
    `const regex = ${toRegexLiteral(pattern, flags)};`,
    `const text = ${JSON.stringify(text)};`,
    `const matches = ${call};`,
  ].join('\n');
}

export type SnippetLanguage =
  | 'js'
  | 'python'
  | 'go'
  | 'php'
  | 'java'
  | 'csharp';

export const SNIPPET_LANGUAGES: { id: SnippetLanguage; label: string }[] = [
  { id: 'js', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' },
  { id: 'php', label: 'PHP' },
  { id: 'java', label: 'Java' },
  { id: 'csharp', label: 'C#' },
];

interface Rewrite {
  /** Replacement for the `(?<` that opens a named group. */
  namedGroup?: string;
  /** Replacement for `\k<name>`. */
  namedRef?: (name: string) => string;
  /** Escape every `/` (PHP delimiters do not know about classes). */
  slash?: boolean;
}

/**
 * The pattern for another engine: raw line terminators become `\n`-style
 * escapes, and named-group syntax is rewritten where the engine differs.
 */
function portPattern(pattern: string, r: Rewrite = {}): string {
  let out = '';
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      const ref = /^k<([^>]+)>/.exec(pattern.slice(i + 1));
      if (!inClass && ref && r.namedRef) {
        out += r.namedRef(ref[1]);
        i += ref[0].length;
        continue;
      }
      out += LINE_TERMINATOR_ESCAPES[next] ?? `\\${next}`;
      i++;
      continue;
    }
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    if (
      !inClass &&
      r.namedGroup &&
      pattern.startsWith('(?<', i) &&
      pattern[i + 3] !== '=' &&
      pattern[i + 3] !== '!'
    ) {
      out += r.namedGroup;
      i += 2;
      continue;
    }
    if (c === '/' && r.slash) out += '\\/';
    else out += LINE_TERMINATOR_ESCAPES[c] ?? c;
  }
  return out;
}

/** A double-quoted string literal with C-style escapes (Java, C#, Go). */
function quoted(
  s: string,
  extra: Record<string, string> = {},
  control = (cp: number) => `\\u${cp.toString(16).padStart(4, '0')}`,
): string {
  let out = '"';
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (extra[ch]) out += extra[ch];
    else if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (cp < 0x20 || cp === 0x7f || cp === 0x2028 || cp === 0x2029)
      out += control(cp);
    else out += ch;
  }
  return out + '"';
}

const pyString = (s: string) => quoted(s);

/** Python: raw string unless a quote, a newline or a trailing backslash forbids it. */
function pyPattern(p: string): string {
  if (!/['"\n\r]/.test(p) && !p.endsWith('\\')) return `r'${p}'`;
  return quoted(p);
}

const usesRe2Unsupported = (pattern: string, flags: string): boolean => {
  let found = false;
  const visit = (n: RegexNode): void => {
    if (n.type === 'backreference') found = true;
    if (n.type === 'group' && n.kind.includes('look')) found = true;
    if (n.type === 'alternation') n.alternatives.forEach(visit);
    if (n.type === 'sequence') n.items.forEach(visit);
    if (n.type === 'group') visit(n.body);
    if (n.type === 'quantifier') visit(n.target);
  };
  try {
    visit(parseRegex(pattern, flags).body);
  } catch {
    return false;
  }
  return found;
};

const flagWarning = (lang: string, flag: string) =>
  `${lang} has no equivalent of the ${flag} flag; it was left out`;

function unsupportedFlags(lang: string, flags: string, ok: string): string[] {
  return [...flags]
    .filter((f) => f !== 'g' && !ok.includes(f))
    .map((f) => flagWarning(lang, f));
}

/**
 * A correctly escaped snippet for six languages (spec §8.1), with warnings
 * where the target engine cannot express the pattern or a flag.
 */
export function toSnippet(
  lang: SnippetLanguage,
  pattern: string,
  flags: string,
  text: string,
): { code: string; warnings: string[] } {
  const all = flags.includes('g');
  switch (lang) {
    case 'js':
      return { code: toJsSnippet(pattern, flags, text), warnings: [] };
    case 'python': {
      const p = portPattern(pattern, {
        namedGroup: '(?P<',
        namedRef: (n) => `(?P=${n})`,
      });
      const opts = [
        flags.includes('i') && 're.IGNORECASE',
        flags.includes('m') && 're.MULTILINE',
        flags.includes('s') && 're.DOTALL',
      ].filter(Boolean);
      const compile = `re.compile(${pyPattern(p)}${opts.length ? `, ${opts.join(' | ')}` : ''})`;
      return {
        code: [
          'import re',
          '',
          `pattern = ${compile}`,
          `text = ${pyString(text)}`,
          all
            ? 'matches = [m.group(0) for m in pattern.finditer(text)]'
            : 'match = pattern.search(text)',
        ].join('\n'),
        warnings: unsupportedFlags('Python', flags, 'imsu'),
      };
    }
    case 'go': {
      const inline = [...'ims'].filter((f) => flags.includes(f)).join('');
      const p =
        (inline ? `(?${inline})` : '') +
        portPattern(pattern, { namedGroup: '(?P<' });
      const literal = p.includes('`') ? quoted(p) : `\`${p}\``;
      const warnings = unsupportedFlags('Go', flags, 'imsu');
      if (usesRe2Unsupported(pattern, flags))
        warnings.unshift('RE2 does not support lookarounds or backreferences');
      return {
        code: [
          'package main',
          '',
          'import (',
          '\t"fmt"',
          '\t"regexp"',
          ')',
          '',
          'func main() {',
          `\tre := regexp.MustCompile(${literal})`,
          `\ttext := ${quoted(text)}`,
          all
            ? '\tfmt.Println(re.FindAllString(text, -1))'
            : '\tfmt.Println(re.FindString(text))',
          '}',
        ].join('\n'),
        warnings,
      };
    }
    case 'php': {
      const p = portPattern(pattern, { slash: true })
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
      const mods = [...'imsu'].filter((f) => flags.includes(f)).join('');
      const phpText = quoted(
        text,
        { $: '\\$' },
        (cp) => `\\u{${cp.toString(16)}}`,
      );
      return {
        code: [
          '<?php',
          `$text = ${phpText};`,
          all
            ? `preg_match_all('/${p}/${mods}', $text, $matches);`
            : `preg_match('/${p}/${mods}', $text, $matches);`,
          'print_r($matches);',
        ].join('\n'),
        warnings: unsupportedFlags('PHP', flags, 'imsu'),
      };
    }
    case 'java': {
      const opts = [
        flags.includes('i') && 'Pattern.CASE_INSENSITIVE',
        flags.includes('m') && 'Pattern.MULTILINE',
        flags.includes('s') && 'Pattern.DOTALL',
        flags.includes('u') && 'Pattern.UNICODE_CASE',
      ].filter(Boolean);
      return {
        code: [
          'import java.util.regex.Matcher;',
          'import java.util.regex.Pattern;',
          '',
          `Pattern pattern = Pattern.compile(${quoted(portPattern(pattern))}${opts.length ? `, ${opts.join(' | ')}` : ''});`,
          `Matcher matcher = pattern.matcher(${quoted(text)});`,
          `${all ? 'while' : 'if'} (matcher.find()) {`,
          '    System.out.println(matcher.group());',
          '}',
        ].join('\n'),
        warnings: unsupportedFlags('Java', flags, 'imsu'),
      };
    }
    case 'csharp': {
      const opts = [
        flags.includes('i') && 'RegexOptions.IgnoreCase',
        flags.includes('m') && 'RegexOptions.Multiline',
        flags.includes('s') && 'RegexOptions.Singleline',
      ].filter(Boolean);
      const verbatim = `@"${portPattern(pattern).replace(/"/g, '""')}"`;
      return {
        code: [
          'using System;',
          'using System.Text.RegularExpressions;',
          '',
          `var regex = new Regex(${verbatim}${opts.length ? `, ${opts.join(' | ')}` : ''});`,
          `var text = ${quoted(text)};`,
          all
            ? 'foreach (Match m in regex.Matches(text))\n    Console.WriteLine(m.Value);'
            : 'Console.WriteLine(regex.Match(text).Value);',
        ].join('\n'),
        warnings: unsupportedFlags('C#', flags, 'imsu'),
      };
    }
  }
}
