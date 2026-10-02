/** Elements whose content is kept exactly as written. */
const RAW = ['pre', 'textarea', 'script', 'style'] as const;

const isSpace = (c: string) =>
  c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';

/** Whitespace runs outside quoted values become one space; none before `>`. */
function collapseTag(tag: string): string {
  let out = '';
  let quote: string | null = null;
  let space = false;
  for (const c of tag) {
    if (quote) {
      out += c;
      if (c === quote) quote = null;
      continue;
    }
    if (isSpace(c)) {
      space = true;
      continue;
    }
    if (space) {
      if (c !== '>' && !(c === '/' && out.length > 1)) out += ' ';
      else if (c === '/') out += ' ';
      space = false;
    }
    if (c === '"' || c === "'") quote = c;
    out += c;
  }
  return out.replace(/ \/>$/, '/>').replace(/\s+>$/, '>');
}

/** End of a tag starting at `i` (the index after its `>`), quote-aware. */
function tagEnd(html: string, i: number): number {
  let quote: string | null = null;
  for (let j = i + 1; j < html.length; j++) {
    const c = html[j];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return j + 1;
  }
  return html.length;
}

/**
 * A conservative HTML minifier (spec D9): comments go except conditional
 * ones (`<!--[if`, `<![endif]`); whitespace runs in text collapse to one
 * space (never removed, so inline layout is unchanged); `pre`, `textarea`,
 * `script` and `style` content is kept verbatim; whitespace inside tags
 * collapses. Optional tags and attribute quotes are never removed.
 */
export function minifyHtml(html: string): string {
  let out = '';
  let i = 0;
  let text = '';
  const flushText = () => {
    out += text.replace(/[ \n\t\r\f]+/g, ' ');
    text = '';
  };
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      const stop = end === -1 ? html.length : end + 3;
      const comment = html.slice(i, stop);
      if (
        /^<!--\[if\b/i.test(comment) ||
        /^<!--<!\[endif\]/i.test(comment) ||
        /<!\[endif\]-->$/i.test(comment)
      ) {
        flushText();
        out += comment;
      }
      i = stop;
      continue;
    }
    if (html[i] === '<' && /[A-Za-z!/?]/.test(html[i + 1] ?? '')) {
      flushText();
      const end = tagEnd(html, i);
      const tag = html.slice(i, end);
      out += /^<[!?]/.test(tag)
        ? tag.replace(/[ \n\t\r\f]+/g, ' ')
        : collapseTag(tag);
      i = end;
      const name = /^<([A-Za-z][\w-]*)/.exec(tag)?.[1]?.toLowerCase();
      if (
        name &&
        (RAW as readonly string[]).includes(name) &&
        !tag.endsWith('/>')
      ) {
        const close = new RegExp(`</${name}\\s*>`, 'i');
        const m = close.exec(html.slice(i));
        const stop = m ? i + m.index : html.length;
        out += html.slice(i, stop);
        if (m) out += collapseTag(m[0]);
        i = m ? stop + m[0].length : stop;
      }
      continue;
    }
    text += html[i++];
  }
  flushText();
  return out.trim();
}
