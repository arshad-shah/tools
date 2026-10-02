import { describe, expect, it } from 'vitest';
import type { ExistingAnnotation } from '@/pdf/render/annotations';
import {
  existingId,
  existingObject,
  existingUpdate,
  movedAnnotation,
  refOfExisting,
} from './existing-objects';

const square: ExistingAnnotation = {
  ref: '12R',
  subtype: 'Square',
  rect: { x: 100, y: 600, width: 50, height: 20 },
  color: '#ff0000',
  author: 'Alice',
  contents: 'Box',
  modified: null,
  inReplyTo: null,
  quadPoints: null,
  editable: true,
  index: 3,
};

describe('existing annotations as objects', () => {
  it('round-trips the object id', () => {
    expect(refOfExisting(existingId('12R'))).toBe('12R');
    expect(refOfExisting('op-1')).toBeNull();
  });

  it('moves and resizes boxes; markup and notes keep their size or place', () => {
    expect(existingObject(square, 'Square by Alice')).toMatchObject({
      id: existingId('12R'),
      box: square.rect,
      label: 'Square by Alice',
      movable: true,
      resizable: true,
    });
    const highlight = {
      ...square,
      subtype: 'Highlight',
      quadPoints: [100, 620, 150, 620, 100, 600, 150, 600],
    };
    expect(existingObject(highlight, 'h')).toMatchObject({ movable: false });
    const note = { ...square, subtype: 'Text' };
    expect(existingObject(note, 'n')).toMatchObject({
      movable: true,
      resizable: false,
    });
  });

  it('a change is an annot.update with the new rect', () => {
    const box = { x: 120, y: 500, width: 100, height: 40 };
    expect(existingUpdate('ckpt0:0', square, box)).toEqual({
      type: 'annot.update',
      params: {
        pageId: 'ckpt0:0',
        target: { kind: 'existing', ref: '12R', nm: null, index: 3 },
        patch: { rect: box },
      },
    });
  });

  it('maps quad points into the moved rect, as the writer does', () => {
    const a = {
      ...square,
      quadPoints: [100, 620, 150, 620, 100, 600, 150, 600],
    };
    const m = movedAnnotation(a, { x: 200, y: 300, width: 100, height: 40 });
    expect(m.rect).toEqual({ x: 200, y: 300, width: 100, height: 40 });
    expect(m.quadPoints).toEqual([200, 340, 300, 340, 200, 300, 300, 300]);
  });
});
