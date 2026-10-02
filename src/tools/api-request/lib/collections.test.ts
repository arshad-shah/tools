import { describe, expect, it } from 'vitest';
import {
  addCollection,
  addRequest,
  DEFAULT_COLLECTIONS,
  deleteNode,
} from './collections';
import {
  migrateCollections,
  toStoredRequest,
  type Folder,
  type SavedRequest,
} from './collections-migrate';
import { findRequest, replaceRequest } from './collections';
import { emptyRequest } from './model';

const req = (id: string): SavedRequest => ({
  id,
  type: 'request',
  name: id,
  request: toStoredRequest(emptyRequest()),
});
const tree = (): Folder[] => [
  {
    id: 'f1',
    type: 'folder',
    name: 'One',
    children: [
      req('r1'),
      { id: 'f2', type: 'folder', name: 'Nested', children: [req('r2')] },
    ],
  },
  { id: 'f3', type: 'folder', name: 'Two', children: [req('r3')] },
];

describe('collections', () => {
  it('adds to a nested folder without mutating the input', () => {
    const before = tree();
    const after = addRequest(before, 'f2', req('new'));
    expect(JSON.stringify(before)).toBe(JSON.stringify(tree()));
    const nested = after[0].children[1];
    expect(
      nested.type === 'folder' && nested.children.map((c) => c.id),
    ).toEqual(['r2', 'new']);
  });
  it('adds to a later top-level collection', () => {
    const after = addRequest(tree(), 'f3', req('n'));
    expect(after[1].children.map((c) => c.id)).toEqual(['r3', 'n']);
  });
  it('falls back to the first collection for an unknown or null target', () => {
    expect(addRequest(tree(), 'missing', req('n'))[0].children.at(-1)!.id).toBe(
      'n',
    );
    expect(addRequest(tree(), null, req('m'))[0].children.at(-1)!.id).toBe('m');
  });
  it('throws when there is no collection', () => {
    expect(() => addRequest([], null, req('n'))).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'No collection available. Create one first.',
      }),
    );
  });
  it('deletes requests at any depth and in any collection (B6)', () => {
    expect(JSON.stringify(deleteNode(tree(), 'r2'))).not.toContain('"r2"');
    expect(JSON.stringify(deleteNode(tree(), 'r3'))).not.toContain('"r3"');
    expect(JSON.stringify(deleteNode(tree(), 'r1'))).toContain('"r2"');
  });
  it('deletes folders at any depth', () => {
    expect(deleteNode(tree(), 'f3').map((c) => c.id)).toEqual(['f1']);
    expect(JSON.stringify(deleteNode(tree(), 'f2'))).not.toContain('"r2"');
  });
  it('adds a named collection', () => {
    expect(addCollection([], ' New ').at(-1)).toMatchObject({
      type: 'folder',
      name: 'New',
      children: [],
    });
  });
  it('seeds one default collection', () => {
    const [first] = migrateCollections(DEFAULT_COLLECTIONS);
    expect(first.name).toBe('My Collection');
    expect(first.children).toHaveLength(2);
  });
  it('finds and replaces a saved request at any depth', () => {
    const renamed = { ...req('r2'), name: 'Renamed' };
    const after = replaceRequest(tree(), renamed);
    expect(findRequest(after, 'r2')?.name).toBe('Renamed');
    expect(findRequest(after, 'nope')).toBeNull();
  });
});
