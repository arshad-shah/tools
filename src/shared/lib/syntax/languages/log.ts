import { isDigit, isIdPart, Out, readQuoted } from '../scan';
import type { LanguageDef } from '../types';

const LEVELS = new Set(
  'TRACE DEBUG INFO NOTICE WARN WARNING ERROR ERR FATAL CRITICAL CRIT SEVERE ALERT EMERG PANIC'.split(
    ' ',
  ),
);

/** Log lines: levels, timestamps and numbers, key=value keys, quoted text. */
export const log: LanguageDef = {
  tokenizeLine(line) {
    const out = new Out();
    let i = 0;
    while (i < line.length) {
      const c = line.charCodeAt(i);
      const ch = line[i];
      if (ch === '"' || ch === "'") {
        const { end } = readQuoted(line, i, c);
        out.push(i, end, 'string');
        i = end;
      } else if (isDigit(c)) {
        // Dates, times, IPs, durations: digits joined by - : . T / , and Z.
        let j = i;
        while (
          j < line.length &&
          (isDigit(line.charCodeAt(j)) || /[-:.T/,Z+]/.test(line[j]))
        ) {
          if (
            /[-:.T/,Z+]/.test(line[j]) &&
            !isDigit(line.charCodeAt(j + 1) || 0) &&
            line[j] !== 'Z'
          )
            break;
          j++;
        }
        out.push(i, j, 'number');
        i = j;
      } else if (isIdPart(c)) {
        let j = i;
        while (
          j < line.length &&
          (isIdPart(line.charCodeAt(j)) || line[j] === '.' || line[j] === '-')
        )
          j++;
        const word = line.slice(i, j);
        if (
          LEVELS.has(word.toUpperCase()) &&
          (word === word.toUpperCase() || word === word.toLowerCase())
        )
          out.push(i, j, 'keyword');
        else if (line[j] === '=') out.push(i, j, 'key');
        i = j;
      } else if (/[[\](){}<>=|]/.test(ch)) {
        out.push(i, i + 1, 'punct');
        i++;
      } else i++;
    }
    return { tokens: out.tokens, state: '' };
  },
};
