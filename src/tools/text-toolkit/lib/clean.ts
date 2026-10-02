export type UnicodeForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';

/** Clean-up operations (spec §9.1). */
export const clean = {
  /** Runs of spaces and tabs become one space; lines are trimmed. */
  collapseWhitespace: (text: string) =>
    text
      .split(/\r?\n/)
      .map((l) => l.replace(/[^\S\r\n]+/g, ' ').trim())
      .join('\n'),
  tabsToSpaces: (text: string, n = 2) => text.replace(/\t/g, ' '.repeat(n)),
  /** Leading runs of `n` spaces become tabs. */
  spacesToTabs: (text: string, n = 2) =>
    text.replace(
      /^( +)/gm,
      (lead: string) =>
        '\t'.repeat(Math.floor(lead.length / n)) + ' '.repeat(lead.length % n),
    ),
  removeDiacritics: (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .normalize('NFC'),
  /** Drops control and format characters, keeping newlines and tabs. */
  stripNonPrintable: (text: string) =>
    text.replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/gu, (c) =>
      c === '\n' || c === '\t' || c === '\r' ? c : '',
    ),
  normaliseLineEndings: (text: string, to: 'lf' | 'crlf') =>
    text.replace(/\r\n|\r|\n/g, to === 'lf' ? '\n' : '\r\n'),
  normaliseUnicode: (text: string, form: UnicodeForm) => text.normalize(form),
};
