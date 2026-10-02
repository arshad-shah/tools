import type { TreeNodeData } from '@/shared/ui';
import type { ExplainNode } from './explain/describe';

export interface ExplainTree {
  roots: TreeNodeData[];
  /** Tree row id to its explanation node (span and group). */
  byId: Map<string, ExplainNode>;
}

/**
 * The explanation as CodeTree rows: each row reads "label source", where
 * source is the pattern span it explains. Ids are tree paths, so they stay
 * stable while the pattern keeps its shape.
 */
export function explainTree(root: ExplainNode, pattern: string): ExplainTree {
  const byId = new Map<string, ExplainNode>();
  const build = (n: ExplainNode, id: string): TreeNodeData => {
    byId.set(id, n);
    const kids = n.children.map((c, i) => build(c, `${id}.${i}`));
    const source = pattern.slice(n.start, n.end);
    return {
      id,
      label: n.label,
      value:
        id === 'r' || source === ''
          ? undefined
          : { text: source, kind: 'regex' },
      childCount: kids.length,
      children: kids.length > 0 ? () => kids : undefined,
    };
  };
  return { roots: [build(root, 'r')], byId };
}
