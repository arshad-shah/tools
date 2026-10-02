export type CaseKind =
  | 'lower'
  | 'upper'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'dot';

/** Words that stay lower case inside a title. */
const SMALL_WORDS = new Set(
  'a an and as at but by en for if in nor of on or per the to v vs via'.split(
    ' ',
  ),
);

/**
 * Splits identifiers and prose into words: spaces, punctuation, `_`, `-`,
 * `.`, camelCase humps, and acronym runs (XMLHttpRequest is xml, http,
 * request).
 */
export function splitWords(text: string): string[] {
  return (
    text
      .replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, '$1 $2')
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

const cap = (w: string) =>
  w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase();

function titleCase(text: string): string {
  // Keep the text's own spacing and punctuation; change letters only.
  let index = 0;
  const words = text.match(/[\p{L}\p{N}']+/gu) ?? [];
  const last = words.length - 1;
  return text.replace(/[\p{L}\p{N}']+/gu, (w) => {
    const i = index++;
    const lower = w.toLocaleLowerCase();
    if (i !== 0 && i !== last && SMALL_WORDS.has(lower)) return lower;
    return cap(w);
  });
}

function sentenceCase(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(
      /(^\s*|[.!?]\s+)(\p{L})/gu,
      (_, pre: string, c: string) => pre + c.toLocaleUpperCase(),
    );
}

/** Converts text between cases (spec §9.1). */
export function convertCase(text: string, kind: CaseKind): string {
  switch (kind) {
    case 'lower':
      return text.toLocaleLowerCase();
    case 'upper':
      return text.toLocaleUpperCase();
    case 'title':
      return titleCase(text);
    case 'sentence':
      return sentenceCase(text);
  }
  const words = splitWords(text).map((w) => w.toLocaleLowerCase());
  switch (kind) {
    case 'camel':
      return words.map((w, i) => (i === 0 ? w : cap(w))).join('');
    case 'pascal':
      return words.map(cap).join('');
    case 'snake':
      return words.join('_');
    case 'kebab':
      return words.join('-');
    case 'constant':
      return words.join('_').toLocaleUpperCase();
    case 'dot':
      return words.join('.');
  }
}

/** URL slug: NFKD, diacritics removed, lower case, joined by `sep`. */
export function slugify(text: string, sep = '-'): string {
  return (
    text
      .normalize('NFKD')
      .replace(/\p{M}+/gu, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.join(sep) ?? ''
  );
}
