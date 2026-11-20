import { ToolError } from '@/shared/lib/errors';

export type ShellDialect = 'posix' | 'cmd';

const bad = (message: string) => new ToolError('INVALID_INPUT', message);

/**
 * Splits a POSIX shell command line (bash, zsh) into words: single quotes
 * are literal, double quotes allow `\"`, `\\`, `\$` and `` \` ``, a
 * backslash escapes the next character, a backslash before a newline joins
 * lines and `$'...'` keeps its common escapes. Unquoted control operators
 * (`|`, `;`, `&&`, `>`) come back as their own words so the caller can stop
 * at the end of the first command.
 */
export function splitPosix(cmd: string): string[] {
  const out: string[] = [];
  let cur = '';
  let has = false;
  let i = 0;
  const push = () => {
    if (has) out.push(cur);
    cur = '';
    has = false;
  };
  while (i < cmd.length) {
    const c = cmd[i];
    if (c === '\\') {
      const n = cmd[i + 1];
      if (n === '\n' || (n === '\r' && cmd[i + 2] === '\n')) {
        i += n === '\n' ? 2 : 3;
        continue;
      }
      if (n !== undefined) {
        cur += n;
        has = true;
      }
      i += 2;
    } else if (c === "'") {
      const end = cmd.indexOf("'", i + 1);
      if (end < 0) throw bad('The command has an unterminated single quote');
      cur += cmd.slice(i + 1, end);
      has = true;
      i = end + 1;
    } else if (c === '$' && cmd[i + 1] === "'") {
      i += 2;
      const ESC: Record<string, string> = {
        n: '\n',
        t: '\t',
        r: '\r',
        '0': '\0',
        a: '\x07',
        b: '\b',
        e: '\x1b',
        f: '\f',
        v: '\v',
      };
      while (i < cmd.length && cmd[i] !== "'") {
        if (cmd[i] === '\\' && i + 1 < cmd.length) {
          const n = cmd[i + 1];
          const hex = /^x([0-9a-fA-F]{1,2})/.exec(cmd.slice(i + 1));
          const uni = /^u([0-9a-fA-F]{4})/.exec(cmd.slice(i + 1));
          if (hex) {
            cur += String.fromCharCode(parseInt(hex[1], 16));
            i += 1 + hex[0].length;
          } else if (uni) {
            cur += String.fromCharCode(parseInt(uni[1], 16));
            i += 1 + uni[0].length;
          } else {
            cur += ESC[n] ?? n;
            i += 2;
          }
        } else cur += cmd[i++];
      }
      if (i >= cmd.length) throw bad('The command has an unterminated quote');
      has = true;
      i++;
    } else if (c === '"') {
      i++;
      while (i < cmd.length && cmd[i] !== '"') {
        if (cmd[i] === '\\' && '"\\$`\n'.includes(cmd[i + 1] ?? '')) {
          if (cmd[i + 1] !== '\n') cur += cmd[i + 1];
          i += 2;
        } else cur += cmd[i++];
      }
      if (i >= cmd.length)
        throw bad('The command has an unterminated double quote');
      has = true;
      i++;
    } else if (/\s/.test(c)) {
      push();
      i++;
    } else if (!has && /[|;&<>]/.test(c)) {
      const op = /^(\|\||&&|>>|[|;&<>])/.exec(cmd.slice(i))?.[0] ?? c;
      out.push(op);
      i += op.length;
    } else {
      cur += c;
      has = true;
      i++;
    }
  }
  push();
  return out;
}

/**
 * Removes Windows cmd.exe escaping: a caret escapes the next character and a
 * caret before a newline joins lines. Quotes are kept: cmd passes them on to
 * the program, which splits its own command line (see `splitMsvcrt`).
 */
export function uncaret(cmd: string): string {
  let out = '';
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (c !== '^') {
      out += c;
      continue;
    }
    const n = cmd[i + 1];
    if (n === '\r' && cmd[i + 2] === '\n') i += 2;
    else if (n === '\n') i += 1;
    else if (n !== undefined) {
      out += n;
      i += 1;
    }
  }
  return out;
}

/**
 * Splits a command line the way the Microsoft C runtime builds `argv`:
 * whitespace separates words outside quotes, `"` toggles quoting, and
 * backslashes are literal unless they come before a quote (2n backslashes
 * and a quote give n backslashes and toggle; 2n+1 give n and a literal
 * quote). Inside quotes, `""` is a literal quote.
 */
export function splitMsvcrt(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let has = false;
  let quoted = false;
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '\\') {
      let n = 0;
      while (line[i + n] === '\\') n++;
      if (line[i + n] === '"') {
        cur += '\\'.repeat(Math.floor(n / 2));
        if (n % 2 === 1) {
          cur += '"';
          i += n + 1;
        } else i += n;
      } else {
        cur += '\\'.repeat(n);
        i += n;
      }
      has = true;
    } else if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 2;
      } else {
        quoted = !quoted;
        i++;
      }
      has = true;
    } else if (!quoted && /\s/.test(c)) {
      if (has) out.push(cur);
      cur = '';
      has = false;
      i++;
    } else {
      cur += c;
      has = true;
      i++;
    }
  }
  if (quoted) throw bad('The command has an unterminated double quote');
  if (has) out.push(cur);
  return out;
}

/**
 * Whether a pasted command is written for Windows cmd.exe: lines that end
 * in a caret, or carets escaping quotes (Chrome's "Copy as cURL (cmd)").
 */
export function detectDialect(cmd: string): ShellDialect {
  if (/\^\r?\n/.test(cmd) || /\^"/.test(cmd)) return 'cmd';
  return 'posix';
}

/** The words of a pasted command, in the dialect it is written for. */
export function splitCommand(cmd: string): {
  words: string[];
  dialect: ShellDialect;
} {
  const dialect = detectDialect(cmd);
  const words = dialect === 'cmd' ? splitMsvcrt(uncaret(cmd)) : splitPosix(cmd);
  return { words, dialect };
}
