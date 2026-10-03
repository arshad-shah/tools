import { css } from './css';
import { js } from './js';
import { markup } from './markup';
import type { LanguageDef, LineState, Token } from '../types';

/**
 * HTML: the markup tokeniser, with `<script>` bodies coloured as JS and
 * `<style>` bodies as CSS. States on top of markup's:
 * - `J<js state>` / `K<css state>`: inside a script or style body;
 * - `E<s|y>:<markup state>`: inside a script or style start tag that
 *   continues on the next line (attributes on their own lines).
 */
const BODY = {
  s: { lang: js, prefix: 'J', closer: '</script' },
  y: { lang: css, prefix: 'K', closer: '</style' },
} as const;
type Body = keyof typeof BODY;

const bodyOf = (name: string): Body | null =>
  name === 'script' ? 's' : name === 'style' ? 'y' : null;

function shift(tokens: readonly Token[], by: number, out: Token[]): void {
  for (const t of tokens)
    out.push({ start: t.start + by, end: t.end + by, kind: t.kind });
}

export const html: LanguageDef = {
  tokenizeLine(line, state) {
    const out: Token[] = [];
    const lower = line.toLowerCase();
    let i = 0;
    let st: LineState = state;
    for (;;) {
      const body = st[0] === 'J' ? 's' : st[0] === 'K' ? 'y' : null;
      if (body) {
        const { lang, prefix, closer } = BODY[body];
        const at = lower.indexOf(closer, i);
        const end = at < 0 ? line.length : at;
        const r = lang.tokenizeLine(line.slice(i, end), st.slice(1));
        shift(r.tokens, i, out);
        if (at < 0) return { tokens: out, state: prefix + r.state };
        i = at;
        st = '';
        continue;
      }
      // Markup from `i`, watching for the end of a script or style start tag.
      let open: Body | null = null;
      let markupState = st;
      if (st[0] === 'E') {
        open = st[1] as Body;
        markupState = st.slice(3);
      }
      const rest = line.slice(i);
      const r = markup.tokenizeLine(rest, markupState);
      let cut = -1;
      for (let k = 0; k < r.tokens.length; k++) {
        const t = r.tokens[k];
        const text = rest.slice(t.start, t.end);
        if (t.kind === 'tag') {
          const prev = r.tokens[k - 1];
          const opening = prev && rest.slice(prev.start, prev.end) === '<';
          open = opening ? bodyOf(text.toLowerCase()) : null;
        } else if (t.kind === 'punct' && text.endsWith('>')) {
          if (open && text === '>') {
            cut = k;
            break;
          }
          open = null;
        }
      }
      if (cut < 0) {
        shift(r.tokens, i, out);
        const pending = open && r.state[0] === 'T';
        return {
          tokens: out,
          state: pending ? `E${open}:${r.state}` : r.state,
        };
      }
      shift(r.tokens.slice(0, cut + 1), i, out);
      i += r.tokens[cut].end;
      st = BODY[open!].prefix;
    }
  },
};
