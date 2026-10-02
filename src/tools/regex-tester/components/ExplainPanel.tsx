import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CodeTree,
  Text,
  expandAll,
  type CodeTreeHandle,
} from '@/shared/ui';
import type { ExplainTree } from '../lib/explain-tree';

interface ExplainPanelProps {
  tree: ExplainTree | null;
  selectedId: string | null;
  onSelect(id: string | null): void;
  treeRef?: React.Ref<CodeTreeHandle>;
}

/**
 * The pattern as a tree of plain sentences. Selecting a row highlights its
 * span in the pattern and, for a capture group, that group in the matches.
 */
export const ExplainPanel: React.FC<ExplainPanelProps> = ({
  tree,
  selectedId,
  onSelect,
  treeRef,
}) => {
  // Everything starts expanded; the set resets when the tree changes.
  const [state, setState] = useState<{
    tree: ExplainTree | null;
    expanded: Set<string>;
  }>(() => ({ tree, expanded: tree ? expandAll(tree.roots) : new Set() }));
  let expanded = state.expanded;
  if (state.tree !== tree) {
    expanded = tree ? expandAll(tree.roots) : new Set();
    setState({ tree, expanded });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Explain</CardTitle>
      </CardHeader>
      <CardBody>
        {tree ? (
          <CodeTree
            ref={treeRef}
            roots={tree.roots}
            expanded={expanded}
            onExpandedChange={(next) => setState({ tree, expanded: next })}
            selectedId={selectedId}
            onSelect={(id) => onSelect(id === selectedId ? null : id)}
            ariaLabel="Pattern explanation"
            rowStyle="plain"
            height={280}
          />
        ) : (
          <Text size="sm" tone="subtle">
            Enter a valid pattern to see what each part does.
          </Text>
        )}
      </CardBody>
    </Card>
  );
};
