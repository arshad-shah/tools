/**
 * Collapses whitespace in SQL outside strings, quoted identifiers and
 * dollar-quoted bodies. `--` and block comments are removed (MySQL `/*!`
 * hints are kept), each leaving a space so tokens never merge.
 */
export function minifySql(sql: string): string {
  let out = '';
  let pendingSpace = false;
  const emit = (s: string) => {
    if (pendingSpace && out !== '') out += ' ';
    pendingSpace = false;
    out += s;
  };
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f') {
      pendingSpace = true;
      i++;
    } else if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl + 1;
      pendingSpace = true;
    } else if (c === '/' && sql[i + 1] === '*' && sql[i + 2] !== '!') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      pendingSpace = true;
    } else if (c === "'" || c === '"' || c === '`' || c === '[') {
      const close = c === '[' ? ']' : c;
      let j = i + 1;
      for (; j < sql.length; j++) {
        if (sql[j] === close) {
          if (sql[j + 1] === close)
            j++; // doubled quote escape
          else break;
        } else if (sql[j] === '\\' && c === "'") j++; // MySQL backslash escape
      }
      emit(sql.slice(i, j + 1));
      i = j + 1;
    } else if (c === '$' && /^\$[A-Za-z_]?\w*\$/.test(sql.slice(i))) {
      const tag = /^\$[A-Za-z_]?\w*\$/.exec(sql.slice(i))![0];
      const end = sql.indexOf(tag, i + tag.length);
      const stop = end === -1 ? sql.length : end + tag.length;
      emit(sql.slice(i, stop));
      i = stop;
    } else {
      let j = i;
      while (
        j < sql.length &&
        !/[\s'"`[$]/.test(sql[j]) &&
        !(sql[j] === '-' && sql[j + 1] === '-') &&
        !(sql[j] === '/' && sql[j + 1] === '*')
      )
        j++;
      if (j === i) j++;
      emit(sql.slice(i, j));
      i = j;
    }
  }
  return out;
}
