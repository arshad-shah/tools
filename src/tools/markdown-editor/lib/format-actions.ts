export type FormatAction =
  | 'bold'
  | 'italic'
  | 'code'
  | 'link'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'ul'
  | 'ol'
  | 'task'
  | 'quote'
  | 'table';

export interface Selection {
  start: number;
  end: number;
}

export interface FormatResult {
  text: string;
  selection: Selection;
}

const INLINE: Record<
  'bold' | 'italic' | 'code',
  { mark: string; placeholder: string }
> = {
  bold: { mark: '**', placeholder: 'bold text' },
  italic: { mark: '_', placeholder: 'italic text' },
  code: { mark: '`', placeholder: 'code' },
};

const LINE_PREFIX: Record<'ul' | 'task' | 'quote', string> = {
  ul: '- ',
  task: '- [ ] ',
  quote: '> ',
};

export const TABLE_SNIPPET =
  '| Column 1 | Column 2 |\n| -------- | -------- |\n| Cell     | Cell     |\n| Cell     | Cell     |';

function inline(
  text: string,
  sel: Selection,
  mark: string,
  placeholder: string,
): FormatResult {
  const { start, end } = sel;
  const n = mark.length;
  const inner = text.slice(start, end);
  // Already wrapped: the marks are just outside, or part of, the selection.
  if (
    text.slice(start - n, start) === mark &&
    text.slice(end, end + n) === mark
  )
    return {
      text: text.slice(0, start - n) + inner + text.slice(end + n),
      selection: { start: start - n, end: end - n },
    };
  if (inner.length >= 2 * n && inner.startsWith(mark) && inner.endsWith(mark))
    return {
      text: text.slice(0, start) + inner.slice(n, -n) + text.slice(end),
      selection: { start, end: end - 2 * n },
    };
  const body = inner || placeholder;
  return {
    text: text.slice(0, start) + mark + body + mark + text.slice(end),
    selection: { start: start + n, end: start + n + body.length },
  };
}

function link(text: string, sel: Selection): FormatResult {
  const inner = text.slice(sel.start, sel.end);
  const m = /^\[([^\]]*)\]\(([^)]*)\)$/.exec(inner);
  if (m)
    return {
      text: text.slice(0, sel.start) + m[1] + text.slice(sel.end),
      selection: { start: sel.start, end: sel.start + m[1].length },
    };
  const label = inner || 'link text';
  const out = `[${label}](url)`;
  const urlStart = sel.start + label.length + 3;
  return {
    text: text.slice(0, sel.start) + out + text.slice(sel.end),
    selection: { start: urlStart, end: urlStart + 3 },
  };
}

/** The selected lines, as [lineStart, lineEnd) offsets of the whole block. */
function lineBlock(text: string, sel: Selection) {
  const from = text.lastIndexOf('\n', sel.start - 1) + 1;
  const nl = text.indexOf(
    '\n',
    Math.max(sel.end - (sel.end > sel.start ? 1 : 0), sel.start),
  );
  const to = nl === -1 ? text.length : nl;
  return { from, to, lines: text.slice(from, to).split('\n') };
}

function replaceLines(
  text: string,
  sel: Selection,
  map: (lines: string[]) => string[],
): FormatResult {
  const { from, to, lines } = lineBlock(text, sel);
  const next = map(lines).join('\n');
  return {
    text: text.slice(0, from) + next + text.slice(to),
    selection: { start: from, end: from + next.length },
  };
}

const HEADING = /^#{1,6}\s+/;

function heading(text: string, sel: Selection, level: number): FormatResult {
  const prefix = `${'#'.repeat(level)} `;
  return replaceLines(text, sel, (lines) => {
    const all = lines.every(
      (l) => l.startsWith(prefix) && !l.startsWith(`${prefix.trim()}#`),
    );
    return lines.map((l) =>
      all ? l.slice(prefix.length) : prefix + l.replace(HEADING, ''),
    );
  });
}

function prefixed(text: string, sel: Selection, prefix: string): FormatResult {
  return replaceLines(text, sel, (lines) => {
    const all = lines.every((l) => l.startsWith(prefix));
    return lines.map((l) => (all ? l.slice(prefix.length) : prefix + l));
  });
}

function ordered(text: string, sel: Selection): FormatResult {
  const re = /^\d+\.\s/;
  return replaceLines(text, sel, (lines) => {
    const all = lines.every((l) => re.test(l));
    return lines.map((l, i) => (all ? l.replace(re, '') : `${i + 1}. ${l}`));
  });
}

function table(text: string, sel: Selection): FormatResult {
  const before = text.slice(0, sel.start);
  const after = text.slice(sel.end);
  const lead =
    before === ''
      ? ''
      : before.endsWith('\n\n')
        ? ''
        : before.endsWith('\n')
          ? '\n'
          : '\n\n';
  const trail =
    after === '' || after.startsWith('\n\n')
      ? ''
      : after.startsWith('\n')
        ? '\n'
        : '\n\n';
  const start = before.length + lead.length;
  return {
    text: before + lead + TABLE_SNIPPET + trail + after,
    selection: { start: start + 2, end: start + 10 },
  };
}

/**
 * Applies a toolbar action to the text and selection (spec §9.2). Inline
 * marks, links, headings and line prefixes toggle off when already applied.
 */
export function applyFormat(
  text: string,
  selection: Selection,
  action: FormatAction,
): FormatResult {
  const sel = {
    start: Math.min(selection.start, selection.end),
    end: Math.max(selection.start, selection.end),
  };
  switch (action) {
    case 'bold':
    case 'italic':
    case 'code':
      return inline(text, sel, INLINE[action].mark, INLINE[action].placeholder);
    case 'link':
      return link(text, sel);
    case 'h1':
    case 'h2':
    case 'h3':
      return heading(text, sel, Number(action[1]));
    case 'ul':
    case 'task':
    case 'quote':
      return prefixed(text, sel, LINE_PREFIX[action]);
    case 'ol':
      return ordered(text, sel);
    case 'table':
      return table(text, sel);
  }
}
