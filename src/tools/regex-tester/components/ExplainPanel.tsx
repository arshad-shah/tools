import { Card, EmptyState, Tree, type TreeItem } from '@arshad-shah/cynosure';
import { useMemo } from 'react';
import type { TreeNodeData } from '@/shared/ui/code-tree-model';
import type { ExplainTree } from '../lib/explain-tree';

interface ExplainPanelProps {
  tree: ExplainTree | null;
  selectedId: string | null;
  onSelect(id: string | null): void;
}

const toItems = (nodes: TreeNodeData[]): TreeItem[] =>
  nodes.map((n) => {
    const children =
      n.childCount > 0 && n.children ? toItems(n.children()) : undefined;
    return {
      id: n.id,
      label: n.value ? `${n.label} ${n.value.text}` : n.label,
      ...(children ? { children } : {}),
    };
  });

const allIds = (items: TreeItem[]): string[] =>
  items.flatMap((i) => [i.id, ...(i.children ? allIds(i.children) : [])]);

/**
 * The pattern as a tree of plain sentences, all open. Selecting a row
 * highlights its span in the pattern and, for a capture group, that group
 * in the matches.
 */
export function ExplainPanel({
  tree,
  selectedId,
  onSelect,
}: ExplainPanelProps) {
  const items = useMemo(() => (tree ? toItems(tree.roots) : []), [tree]);
  return (
    <Card as="section" title="Explain" headingLevel={2}>
      {tree ? (
        <Tree
          key={items.length ? items[0].id + allIds(items).length : 'empty'}
          label="Pattern explanation"
          items={items}
          defaultExpanded={allIds(items)}
          selected={selectedId ? [selectedId] : []}
          onSelectionChange={(ids) => {
            const id = ids[0] ?? null;
            onSelect(id === selectedId ? null : id);
          }}
        />
      ) : (
        <EmptyState
          size="sm"
          title="Nothing to explain"
          description="Enter a valid pattern to see what each part does."
        />
      )}
    </Card>
  );
}
