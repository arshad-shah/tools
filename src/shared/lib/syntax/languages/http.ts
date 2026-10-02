import { Out } from '../scan';
import type { LanguageDef } from '../types';

const METHODS = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\b/;

/**
 * Raw HTTP messages (and .http files): start line, headers, body.
 * States: '' before the start line, `H` headers, `B` body.
 */
export const http: LanguageDef = {
  tokenizeLine(line, state) {
    const out = new Out();
    if (/^\s*(#|\/\/)/.test(line)) {
      out.push(0, line.length, 'comment');
      // "###" separates requests in .http files.
      return { tokens: out.tokens, state: line.startsWith('###') ? '' : state };
    }
    if (state === 'B') return { tokens: [], state };
    if (state === 'H') {
      if (line.trim() === '') return { tokens: [], state: 'B' };
      const colon = line.indexOf(':');
      if (colon > 0) {
        out.push(0, colon, 'key');
        out.push(colon, colon + 1, 'punct');
        out.push(colon + 1, line.length, 'string');
      }
      return { tokens: out.tokens, state: 'H' };
    }
    if (line.trim() === '') return { tokens: [], state: '' };
    const status = /^(HTTP\/[\d.]+)(\s+)(\d{3})(.*)$/.exec(line);
    if (status) {
      const [, version, gap, code] = status;
      out.push(0, version.length, 'keyword');
      out.push(
        version.length + gap.length,
        version.length + gap.length + code.length,
        'number',
      );
      return { tokens: out.tokens, state: 'H' };
    }
    const method = METHODS.exec(line);
    if (method) {
      out.push(0, method[1].length, 'keyword');
      const rest = line.slice(method[1].length);
      const target = /^(\s+)(\S+)/.exec(rest);
      if (target) {
        const from = method[1].length + target[1].length;
        out.push(from, from + target[2].length, 'attr');
        const version = line.indexOf('HTTP/', from + target[2].length);
        if (version > 0) out.push(version, line.length, 'keyword');
      }
      return { tokens: out.tokens, state: 'H' };
    }
    return { tokens: [], state: '' };
  },
};
