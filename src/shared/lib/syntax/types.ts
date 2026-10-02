export type TokenKind =
  | 'key'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'punct'
  | 'comment'
  | 'keyword'
  | 'tag'
  | 'attr'
  | 'fn'
  | 'regex'
  | 'plain';

/** A coloured span of one line: `[start, end)` in UTF-16 code units. */
export interface Token {
  start: number;
  end: number;
  kind: TokenKind;
}

/**
 * What carries over from one line to the next (an open comment, string,
 * template or fence). Opaque per language; '' is the start of a document.
 * Equal states mean equal results for the rest of the document, which lets
 * an editor re-tokenise only from an edited line until states match again.
 */
export type LineState = string;

export interface LineResult {
  tokens: Token[];
  state: LineState;
}

export interface LanguageDef {
  tokenizeLine(line: string, state: LineState): LineResult;
}
