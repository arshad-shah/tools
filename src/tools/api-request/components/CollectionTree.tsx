import { Badge, Text, Tree, type TreeItem } from '@arshad-shah/cynosure';
import { fileCode, folder, trash } from '@arshad-shah/cynosure/icons';
import React, { useMemo } from 'react';
import type { Folder, SavedRequest } from '../lib/collections-migrate';

type Node = Folder | SavedRequest;

const methodTone = (
  method: string,
): 'success' | 'warning' | 'accent' | 'danger' | 'neutral' => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'success';
    case 'POST':
      return 'accent';
    case 'PUT':
    case 'PATCH':
      return 'warning';
    case 'DELETE':
      return 'danger';
    default:
      return 'neutral';
  }
};

const methodOf = (r: SavedRequest) =>
  r.request.mode === 'graphql' ? 'GQL' : r.request.method;

const DELETE = 'delete';

function toItem(node: Node): TreeItem<Node> {
  if (node.type === 'folder')
    return {
      id: node.id,
      label: node.name,
      icon: folder,
      data: node,
      children: node.children.map(toItem),
      actions: [{ value: DELETE, label: 'Delete folder', icon: trash }],
    };
  const method = methodOf(node);
  return {
    id: node.id,
    label: node.name,
    icon: fileCode,
    data: node,
    trailing: (
      <Badge size="sm" tone={methodTone(method)}>
        {method}
      </Badge>
    ),
    actions: [{ value: DELETE, label: 'Delete request', icon: trash }],
  };
}

const allFolders = (nodes: Node[]): string[] =>
  nodes.flatMap((n) =>
    n.type === 'folder' ? [n.id, ...allFolders(n.children)] : [],
  );

interface CollectionTreeProps {
  collections: Folder[];
  selectedRequest: string | null;
  onSelectRequest: (req: SavedRequest) => void;
  onDelete: (id: string, type: 'folder' | 'request') => void;
}

/** Saved requests in their folders: select one to open it. */
export const CollectionTree: React.FC<CollectionTreeProps> = ({
  collections,
  selectedRequest,
  onSelectRequest,
  onDelete,
}) => {
  const items = useMemo(() => collections.map(toItem), [collections]);
  const open = useMemo(() => allFolders(collections), [collections]);
  if (collections.length === 0)
    return (
      <Text size="sm" tone="muted" align="center">
        No collections yet. Create one with New collection.
      </Text>
    );
  return (
    <Tree<Node>
      label="Collections"
      items={items}
      defaultExpanded={open}
      selected={selectedRequest ? [selectedRequest] : []}
      size="sm"
      onSelectionChange={(ids) => {
        const find = (nodes: Node[]): SavedRequest | null => {
          for (const n of nodes) {
            if (n.type === 'request' && n.id === ids[0]) return n;
            if (n.type === 'folder') {
              const hit = find(n.children);
              if (hit) return hit;
            }
          }
          return null;
        };
        const hit = find(collections);
        if (hit) onSelectRequest(hit);
      }}
      onCommand={(value, item) => {
        if (value === DELETE && item.data)
          onDelete(
            item.data.id,
            item.data.type === 'folder' ? 'folder' : 'request',
          );
      }}
    />
  );
};
