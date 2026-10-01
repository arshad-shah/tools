import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import type {
  CollectionType,
  FolderItemType,
  RequestItemType,
} from '../../types/ApiTesterTypes'; // PR C moves this to ./types

type Node = RequestItemType | FolderItemType;

export const DEFAULT_COLLECTIONS: CollectionType[] = [
  {
    id: '1',
    type: 'folder',
    name: 'My Collection',
    children: [
      {
        id: '2',
        type: 'request',
        name: 'Get Users',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/users',
      },
      {
        id: '3',
        type: 'request',
        name: 'Create User',
        method: 'POST',
        url: 'https://jsonplaceholder.typicode.com/users',
      },
    ],
  },
];

const containsFolder = (nodes: Node[], id: string): boolean =>
  nodes.some(
    (n) =>
      n.type === 'folder' && (n.id === id || containsFolder(n.children, id)),
  );

function appendTo<T extends Node>(
  nodes: T[],
  id: string,
  req: RequestItemType,
): T[] {
  return nodes.map((n) => {
    if (n.type !== 'folder') return n;
    if (n.id === id) return { ...n, children: [...n.children, req] };
    return { ...n, children: appendTo(n.children, id, req) };
  });
}

/**
 * Adds `req` to the folder `targetId` anywhere in the tree, else to the first
 * collection. Never mutates `cols`.
 */
export function addRequest(
  cols: CollectionType[],
  targetId: string | null,
  req: RequestItemType,
): CollectionType[] {
  if (cols.length === 0)
    throw new ToolError(
      'INVALID_INPUT',
      'No collection available. Create one first.',
    );
  const id = targetId && containsFolder(cols, targetId) ? targetId : cols[0].id;
  return appendTo(cols, id, req);
}

export function addCollection(
  cols: CollectionType[],
  name: string,
): CollectionType[] {
  return [
    ...cols,
    { id: newId(), type: 'folder', name: name.trim(), children: [] },
  ];
}

/** Removes the folder or request `id` at any depth (B6). */
export function deleteNode<T extends Node>(nodes: T[], id: string): T[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.type === 'folder' ? { ...n, children: deleteNode(n.children, id) } : n,
    );
}
