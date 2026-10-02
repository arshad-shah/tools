import {
  ObjectLayer,
  type ChangeSource,
  type LayerObject,
  type ObjectChange,
} from '@/shared/ui';
import type { Viewport } from '@/pdf/doc/geometry';
import type { NewOperation, OpId } from '@/pdf/doc/types';
import type { DocumentApi, SelectionApi } from '../modes/types';
import { commitChanges, duplicateObjects, orderObjects } from './object-ops';

export interface ModeObjectLayerProps {
  doc: DocumentApi;
  selection: SelectionApi;
  pageNumber: number;
  viewport: Viewport;
  width: number;
  height: number;
  /** One per placed object; ids are the op ids that created them. */
  objects: readonly LayerObject[];
  onPreview?(changes: ReadonlyMap<string, ObjectChange> | null): void;
  /** A finished change before it is dispatched (e.g. snap a dropped signature). */
  adjust?(change: ObjectChange, via: ChangeSource): ObjectChange;
  /**
   * The op for a change to an object that is not a placed op (e.g. an
   * annotation already in the file); null: an object.move.
   */
  ownOp?(change: ObjectChange): NewOperation | null;
  /** Default: one object.remove per object. */
  onDelete?(ids: OpId[]): void;
  onEdit?(id: OpId): void;
  onProperties?(id: OpId): void;
  /** Off for objects without a stacking order of their own. Default true. */
  orderable?: boolean;
  /** See ObjectLayer: true, or 'shift' for while Shift is held. */
  marquee?: boolean | 'shift';
}

/**
 * The shared object model (ObjectLayer) on one page of a mode: selection
 * is the workspace's object selection and every change goes through the op
 * log as one undo step (object.move, object.remove, object.order, copies).
 */
export function ModeObjectLayer({
  doc,
  selection,
  pageNumber,
  viewport,
  width,
  height,
  objects,
  onPreview,
  adjust,
  ownOp,
  onDelete,
  onEdit,
  onProperties,
  orderable = true,
  marquee,
}: ModeObjectLayerProps) {
  const [a, b, c, d, e, f] = viewport.transform;
  const rotatable = new Set(
    objects.filter((o) => o.rotatable).map((o) => o.id),
  );
  const remove = (ids: OpId[]) => {
    if (onDelete) {
      onDelete(ids);
      return;
    }
    const done = doc.dispatch(
      ids.map((targetId) => ({ type: 'object.remove', params: { targetId } })),
      ids.length > 1 ? `Remove ${ids.length} objects` : undefined,
    );
    if (done.length) selection.selectObjects([]);
  };
  return (
    <ObjectLayer
      transform={{ a, b, c, d, e, f }}
      width={width}
      height={height}
      label={`Objects on page ${pageNumber}`}
      objects={objects}
      selected={selection.objects}
      marquee={marquee}
      onSelect={(ids, mode) => selection.selectObjects(ids, mode)}
      onPreview={onPreview}
      onCommit={(changes, via) =>
        commitChanges(
          doc,
          adjust ? changes.map((c) => adjust(c, via)) : changes,
          (id) => rotatable.has(id),
          ownOp,
        )
      }
      onDelete={remove}
      onDuplicate={(ids) => duplicateObjects(doc, selection, ids)}
      onOrder={orderable ? (ids, to) => orderObjects(doc, ids, to) : undefined}
      onEdit={onEdit}
      onProperties={onProperties}
      data-testid={`objects-page-${pageNumber}`}
    />
  );
}
