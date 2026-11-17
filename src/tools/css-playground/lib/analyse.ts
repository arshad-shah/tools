import { syntax } from 'csso';
import { SpecimenBuilder, type SelectorPart } from './specimen';
import type {
  CssIssue,
  CssReport,
  CustomProperty,
  DeclarationInfo,
  SelectorInfo,
} from './types';

type Node = Parameters<typeof syntax.generate>[0];
interface Loc {
  start: { line: number; column: number };
}
interface Located {
  type: string;
  loc?: Loc | null;
}
interface ListLike<T> {
  toArray(): T[];
}

const COLOUR_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'color-mix',
  'light-dark',
]);
/** Identifiers that are never colours, kept out of the colour list. */
const NOT_COLOURS = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'currentcolor',
  'transparent',
  'none',
  'auto',
]);
/** Most rows the declaration list sends back for the browser check. */
const DECLARATION_LIMIT = 3000;

const sortedCounts = (m: Map<string, number>) =>
  [...m.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

const bump = (m: Map<string, number>, k: string) =>
  m.set(k, (m.get(k) ?? 0) + 1);

const compare = (a: number[], b: number[]) =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

const lineOf = (n: Located) => n.loc?.start.line;

/** Colours inside a custom property's raw (unparsed) value. */
const RAW_COLOURS =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)/gi;

/**
 * Everything the playground shows about a stylesheet, from one parse:
 * counts, selectors with specificity, colours, custom properties, issues
 * the parser can see, and the specimen markup. Issues that need the
 * browser (unsupported properties and values) are added on the main
 * thread from `declarations`.
 */
export function analyseCss(css: string): CssReport {
  const issues: CssIssue[] = [];
  let issueId = 0;
  const issue = (i: Omit<CssIssue, 'id'>) =>
    issues.push({ id: `i${issueId++}`, ...i });

  const ast = syntax.parse(css, {
    positions: true,
    onParseError: (e: { message?: string; line?: number; column?: number }) =>
      issue({
        severity: 'error',
        rule: 'Syntax error',
        message: String(e.message ?? 'Could not parse this part'),
        line: e.line,
        column: e.column,
      }),
  });

  const selectors: SelectorInfo[] = [];
  const properties = new Map<string, number>();
  const colours = new Map<string, number>();
  const colourWords = new Map<string, number>();
  const customProperties: CustomProperty[] = [];
  const usedVars = new Map<string, number | undefined>();
  const declared = new Set<string>();
  const declarations = new Map<string, DeclarationInfo>();
  const atRules: Record<string, number> = {};
  const seenRules = new Map<string, number>();
  const specimen = new SpecimenBuilder();
  let rules = 0;
  let declarationCount = 0;
  let important = 0;
  let emptyRules = 0;
  let maxSpecificity: [number, number, number] = [0, 0, 0];
  const context: string[] = [];

  syntax.walk(ast, {
    enter(node: Node) {
      const n = node as unknown as Located & Record<string, unknown>;
      if (n.type === 'Atrule') {
        const name = String(n.name).toLowerCase();
        atRules[name] = (atRules[name] ?? 0) + 1;
        const prelude = n.prelude ? syntax.generate(n.prelude as Node) : '';
        context.push(`@${name}${prelude ? ` ${prelude}` : ''}`);
      } else if (n.type === 'Rule') {
        rules++;
        const block = n.block as { children: ListLike<Located> };
        const decls = block.children
          .toArray()
          .filter((c) => c.type === 'Declaration') as unknown as {
          property: string;
          loc?: Loc;
        }[];
        const prelude = syntax.generate(n.prelude as Node);
        const where = context.join(' ');
        if (decls.length === 0 && block.children.toArray().length === 0) {
          emptyRules++;
          issue({
            severity: 'info',
            rule: 'Empty rule',
            message: `${prelude} has no declarations and can be removed`,
            line: lineOf(n),
          });
        }
        const seen = new Map<string, number>();
        for (const d of decls) {
          const p = d.property.toLowerCase();
          if (seen.has(p) && !p.startsWith('--'))
            issue({
              severity: 'warning',
              rule: 'Repeated property',
              message: `${d.property} is set twice in ${prelude}; the last one wins unless the first is a fallback for older browsers`,
              line: d.loc?.start.line,
            });
          seen.set(p, 1);
        }
        const ruleKey = `${where}|${prelude}`;
        const firstLine = seenRules.get(ruleKey);
        if (firstLine !== undefined)
          issue({
            severity: 'info',
            rule: 'Duplicate selector',
            message: `${prelude} also has a rule on line ${firstLine}; the two could be merged`,
            line: lineOf(n),
          });
        else seenRules.set(ruleKey, lineOf(n) ?? 0);
      } else if (n.type === 'Selector') {
        const text = syntax.generate(node);
        const spec = syntax.specificity(node) as [number, number, number];
        if (compare(spec, maxSpecificity) > 0) maxSpecificity = spec;
        selectors.push({
          selector: text,
          specificity: spec,
          line: lineOf(n),
          context: context.join(' '),
        });
        const parts = (n.children as ListLike<SelectorPart>).toArray();
        specimen.add(parts, text);
        if (spec[0] > 0)
          issue({
            severity: 'info',
            rule: 'ID selector',
            message: `${text} uses an ID; its specificity (${spec.join(',')}) is hard to override`,
            line: lineOf(n),
          });
      } else if (n.type === 'Declaration') {
        declarationCount++;
        const property = String(n.property);
        const value = syntax.generate(n.value as Node).trim();
        const isImportant = Boolean(n.important);
        bump(properties, property.toLowerCase());
        if (isImportant) {
          important++;
          issue({
            severity: 'info',
            rule: '!important',
            message: `${property} uses !important, which makes later overrides harder`,
            line: lineOf(n),
          });
        }
        if (property.startsWith('--')) {
          declared.add(property);
          customProperties.push({ name: property, value, line: lineOf(n) });
          for (const m of value.match(RAW_COLOURS) ?? [])
            bump(colours, m.toLowerCase());
        } else {
          const key = `${property.toLowerCase()}:${value}`;
          if (!declarations.has(key) && declarations.size < DECLARATION_LIMIT)
            declarations.set(key, {
              property,
              value,
              important: isImportant,
              line: n.loc?.start.line,
              column: n.loc?.start.column,
            });
        }
      } else if (n.type === 'Hash') {
        bump(colours, `#${String(n.value).toLowerCase()}`);
      } else if (n.type === 'Function') {
        const name = String(n.name).toLowerCase();
        if (name === 'var') {
          const args = (n.children as ListLike<Located & { name?: string }>)
            .toArray()
            .filter((c) => c.type !== 'WhiteSpace');
          const ref = args[0]?.name;
          const hasFallback = args.some((c) => c.type === 'Operator');
          if (ref && !hasFallback && !usedVars.has(ref))
            usedVars.set(ref, lineOf(n));
        } else if (COLOUR_FUNCTIONS.has(name)) {
          bump(colours, syntax.generate(node).toLowerCase());
          return syntax.walk.skip;
        }
      } else if (n.type === 'Identifier') {
        const name = String(n.name).toLowerCase();
        if (/^[a-z]+$/.test(name) && !NOT_COLOURS.has(name))
          bump(colourWords, name);
      }
      return undefined;
    },
    leave(node: Node) {
      if ((node as unknown as Located).type === 'Atrule') context.pop();
    },
  });

  for (const [name, line] of usedVars)
    if (!declared.has(name))
      issue({
        severity: 'warning',
        rule: 'Undefined variable',
        message: `${name} is used without a fallback but never declared in this stylesheet`,
        line,
      });

  const lineCount = css === '' ? 0 : css.split('\n').length;
  return {
    stats: {
      bytes: new TextEncoder().encode(css).length,
      lines: lineCount,
      rules,
      selectors: selectors.length,
      declarations: declarationCount,
      uniqueProperties: properties.size,
      important,
      emptyRules,
      maxSpecificity,
      atRules,
    },
    selectors,
    properties: sortedCounts(properties).map(({ value, count }) => ({
      property: value,
      count,
    })),
    colours: sortedCounts(colours),
    colourWords: sortedCounts(colourWords),
    customProperties,
    declarations: [...declarations.values()],
    issues,
    specimen: specimen.html(),
    specimenTruncated: specimen.truncated,
  };
}
