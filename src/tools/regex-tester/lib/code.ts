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
