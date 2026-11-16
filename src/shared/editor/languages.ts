import { StreamLanguage, type StreamParser } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { tags as t, type Tag } from '@lezer/highlight';
import {
  tokenizeLine,
  type LanguageId,
  type Token,
  type TokenKind,
} from '@/shared/lib/syntax/tokenize';

/** CodeMirror tags for tools' own token kinds (csv, log, regex, http). */
const TAG: Record<Exclude<TokenKind, 'plain'>, Tag> = {
  key: t.propertyName,
  string: t.string,
  number: t.number,
  boolean: t.bool,
  null: t.null,
  punct: t.punctuation,
  comment: t.comment,
  keyword: t.keyword,
  tag: t.tagName,
  attr: t.attributeName,
  fn: t.function(t.variableName),
  regex: t.regexp,
};

interface LineState {
  /** What the previous line handed on (an open string, a fence). */
  carry: string;
  tokens: Token[];
}

/**
 * CodeMirror has no official csv, log, regex or http mode. These wrap tools'
 * line tokenisers (`src/shared/lib/syntax`) as a stream language: each line
 * is tokenised once at its start and the stream walks its tokens.
 */
function lineTokeniser(lang: LanguageId): StreamParser<LineState> {
  return {
    name: lang,
    startState: () => ({ carry: '', tokens: [] }),
    copyState: (s) => ({ carry: s.carry, tokens: s.tokens }),
    token(stream, state) {
      if (stream.sol()) {
        const r = tokenizeLine(lang, stream.string, state.carry);
        state.tokens = r.tokens;
        state.carry = r.state;
      }
      const at = stream.pos;
      const tok = state.tokens.find((k) => k.end > at);
      if (!tok) {
        stream.skipToEnd();
        return null;
      }
      if (tok.start > at) {
        stream.pos = tok.start;
        return null;
      }
      stream.pos = tok.end;
      return tok.kind === 'plain' ? null : tok.kind;
    },
    blankLine(state) {
      state.carry = tokenizeLine(lang, '', state.carry).state;
    },
    tokenTable: TAG,
  };
}

const streams = new Map<LanguageId, StreamLanguage<LineState>>();

/**
 * The CodeMirror language support for `id`. The official language packages
 * load on demand, so a tool's chunk only carries the parser it highlights.
 */
export async function loadLanguage(id: LanguageId): Promise<Extension> {
  switch (id) {
    case 'json':
      return (await import('@codemirror/lang-json')).json();
    case 'xml':
      return (await import('@codemirror/lang-xml')).xml();
    case 'yaml':
      return (await import('@codemirror/lang-yaml')).yaml();
    case 'markdown': {
      const md = await import('@codemirror/lang-markdown');
      return md.markdown({ base: md.markdownLanguage });
    }
    case 'js':
      return (await import('@codemirror/lang-javascript')).javascript({
        jsx: true,
      });
    case 'ts':
      return (await import('@codemirror/lang-javascript')).javascript({
        jsx: true,
        typescript: true,
      });
    case 'css':
      return (await import('@codemirror/lang-css')).css();
    case 'html':
      return (await import('@codemirror/lang-html')).html();
    case 'sql':
      return (await import('@codemirror/lang-sql')).sql();
    case 'csv':
    case 'log':
    case 'regex':
    case 'http': {
      let lang = streams.get(id);
      if (!lang)
        streams.set(id, (lang = StreamLanguage.define(lineTokeniser(id))));
      return lang;
    }
    case 'plain':
      return [];
  }
}
