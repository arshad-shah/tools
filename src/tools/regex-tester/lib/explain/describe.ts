import type {
  AlternationNode,
  CharNode,
  GroupNode,
  QuantifierNode,
  RegexAst,
  RegexNode,
} from './ast';
import {
  ESCAPE_NOUN,
  charName,
  propertyNoun,
  classNoun,
  nounOf,
  amount,
  times,
  LAZY,
} from './nouns';

/** One row of the explanation tree, linked to its pattern span. */
export interface ExplainNode {
  label: string;
  start: number;
  end: number;
  children: ExplainNode[];
  /** Set on capture groups, so the UI can highlight that group's matches. */
  groupIndex?: number;
}

function groupPrefix(g: GroupNode): string {
  switch (g.kind) {
    case 'capture':
      return `Capture group ${g.index}`;
    case 'named':
      return `Named capture group ${g.name}`;
    case 'noncapture':
      return 'Group';
    case 'lookahead':
      return 'followed by';
    case 'negative-lookahead':
      return 'not followed by';
    case 'lookbehind':
      return 'preceded by';
    case 'negative-lookbehind':
      return 'not preceded by';
    case 'modifiers': {
      const m = g.modifiers!;
      const parts = [
        m.add && `with flags ${m.add}`,
        m.remove && `without flags ${m.remove}`,
      ].filter(Boolean);
      return `Group ${parts.join(' and ')}`;
    }
  }
}

class Describer {
  constructor(private readonly ast: RegexAst) {}

  private get flags() {
    return this.ast.flags;
  }

  /** Literal runs merge into one row ("literal abc"). */
  sequence(items: RegexNode[]): ExplainNode[] {
    const out: ExplainNode[] = [];
    let run: CharNode[] = [];
    const flush = () => {
      if (run.length === 0) return;
      out.push({
        label: `literal ${run.map((c) => charName(c.value)).join('')}`,
        start: run[0].start,
        end: run[run.length - 1].end,
        children: [],
      });
      run = [];
    };
    for (const item of items) {
      if (item.type === 'char' && charName(item.value) === item.value)
        run.push(item);
      else {
        flush();
        out.push(this.node(item));
      }
    }
    flush();
    return out;
  }

  alternation(a: AlternationNode): ExplainNode[] {
    if (a.alternatives.length === 1)
      return this.sequence(a.alternatives[0].items);
    return [
      {
        label: `one of ${a.alternatives.length} alternatives`,
        start: a.start,
        end: a.end,
        children: a.alternatives.map((alt, i) => {
          const rows = this.sequence(alt.items);
          const prefix = `alternative ${i + 1}`;
          if (rows.length === 0)
            return {
              label: `${prefix}: empty`,
              start: alt.start,
              end: alt.end,
              children: [],
            };
          if (rows.length === 1 && rows[0].children.length === 0)
            return { ...rows[0], label: `${prefix}: ${rows[0].label}` };
          return {
            label: prefix,
            start: alt.start,
            end: alt.end,
            children: rows,
          };
        }),
      },
    ];
  }

  node(n: RegexNode): ExplainNode {
    const row = (label: string, children: ExplainNode[] = []): ExplainNode => ({
      label,
      start: n.start,
      end: n.end,
      children,
    });
    switch (n.type) {
      case 'char':
        return row(`literal ${charName(n.value)}`);
      case 'dot':
        return row(`any ${nounOf(n, this.flags.includes('s'))!.one}`);
      case 'anchor': {
        const line = this.flags.includes('m');
        return row(
          n.kind === 'start'
            ? line
              ? 'start of a line'
              : 'start of the input'
            : line
              ? 'end of a line'
              : 'end of the input',
        );
      }
      case 'boundary':
        return row(n.negated ? 'not a word boundary' : 'word boundary');
      case 'escape-class':
        return row(`a ${ESCAPE_NOUN[n.kind].one}`);
      case 'property':
        return row(`a ${propertyNoun(n).one}`);
      case 'class':
        return row(`any ${classNoun(n).one}`);
      case 'backreference':
        return row(`the same text as group ${n.ref}`);
      case 'sequence':
        return row('sequence', this.sequence(n.items));
      case 'alternation':
        return row('alternatives', this.alternation(n));
      case 'group':
        return this.group(n);
      case 'quantifier':
        return this.quantifier(n);
    }
  }

  private group(g: GroupNode): ExplainNode {
    const prefix = groupPrefix(g);
    const rows = this.alternation(g.body);
    const base = { start: g.start, end: g.end, groupIndex: g.index };
    // Lookarounds read as a phrase ("preceded by literal $").
    const sep = g.kind.includes('look') ? ' ' : ': ';
    if (rows.length === 0)
      return { ...base, label: `${prefix}${sep}empty`, children: [] };
    if (rows.length === 1 && rows[0].children.length === 0)
      return {
        ...base,
        label: `${prefix}${sep}${rows[0].label}`,
        children: [],
      };
    return { ...base, label: prefix, children: rows };
  }

  private quantifier(q: QuantifierNode): ExplainNode {
    const lazy = q.lazy ? LAZY : '';
    const noun = nounOf(q.target, this.flags.includes('s'));
    if (noun) {
      const a = amount(q);
      return {
        label: `${a.phrase} ${a.plural ? noun.many : noun.one}${lazy}`,
        start: q.start,
        end: q.end,
        children: [],
      };
    }
    const inner = this.node(q.target);
    return {
      label: `${times(q)}${lazy}`,
      start: q.start,
      end: q.end,
      children: [inner],
    };
  }
}

/** The explanation tree for a parsed pattern ("Capture group 1: one or more digits"). */
export function describe(ast: RegexAst): ExplainNode {
  const d = new Describer(ast);
  return {
    label: `Pattern with ${ast.groupCount} capture group${ast.groupCount === 1 ? '' : 's'}`,
    start: 0,
    end: ast.pattern.length,
    children: d.alternation(ast.body),
  };
}
