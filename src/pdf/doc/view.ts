import { getOperation } from './registry';
import type { DocView, Operation } from './types';

/** Applies ops in order with their definitions' `applyToView` (pure). */
export function foldView(base: DocView, ops: readonly Operation[]): DocView {
  let view = base;
  for (const op of ops) {
    const def = getOperation(op.type);
    if (def.applyToView) view = def.applyToView(view, op.params, op);
  }
  return view;
}
