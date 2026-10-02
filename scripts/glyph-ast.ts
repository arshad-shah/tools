import { parseAst } from 'vite';

/**
 * Shared ESTree walking for the build-time glyph tools (the app module scan
 * and the vendor literal rewrite). Parsing means comments are never seen and
 * string contents are never mistaken for comments.
 */
export interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

export const isNode = (v: unknown): v is AstNode =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as AstNode).type === 'string';

export interface WalkContext {
  parent: AstNode | null;
  /** The parent property holding this node ('key', 'value', 'source', ...). */
  key: string | null;
}

/** Parses compiled JS (JSX allowed) into an ESTree Program with UTF-16 offsets. */
export function parseModule(code: string, filename = 'module.js'): AstNode {
  return parseAst(code, { lang: 'jsx' }, filename) as unknown as AstNode;
}

/**
 * Depth-first walk. `enter` returns false to skip a node's children.
 */
export function walk(
  root: AstNode,
  enter: (node: AstNode, ctx: WalkContext) => boolean | void,
): void {
  const visit = (node: AstNode, ctx: WalkContext) => {
    if (enter(node, ctx) === false) return;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'parent') continue;
      if (Array.isArray(v)) {
        for (const c of v) if (isNode(c)) visit(c, { parent: node, key: k });
      } else if (isNode(v)) {
        visit(v, { parent: node, key: k });
      }
    }
  };
  visit(root, { parent: null, key: null });
}

/** Literal parents whose string is a module specifier or binding name. */
export const NAME_POSITIONS = new Set([
  'ImportDeclaration:source',
  'ExportNamedDeclaration:source',
  'ExportAllDeclaration:source',
  'ExportAllDeclaration:exported',
  'ImportExpression:source',
  'ImportSpecifier:imported',
  'ImportSpecifier:local',
  'ExportSpecifier:local',
  'ExportSpecifier:exported',
  'ImportAttribute:key',
  'ImportAttribute:value',
]);

export const literalPosition = (ctx: WalkContext) =>
  `${ctx.parent?.type ?? ''}:${ctx.key ?? ''}`;
