import { ToolError } from '@/shared/lib/errors';
import type {
  AssetId,
  DocView,
  ModeId,
  OpId,
  Operation,
  PageId,
} from './types';

export type OpKind = 'structure' | 'overlay' | 'checkpoint';

/** What an op label may ask about the document as it was when dispatched. */
export interface LabelContext {
  pageNumber(id: PageId): number | null;
  pageCount: number;
  /** The page an overlay object (by its op id) sits on, or null. */
  pageOf(opId: OpId): PageId | null;
}

export interface OperationDefinition<P = unknown> {
  type: string;
  v: number;
  kind: OpKind;
  mode: ModeId;
  /** Plain words, no glyphs. */
  label(p: P, ctx: LabelContext): string;
  /** Grouped export summary for this type. */
  summarize?(ops: P[]): string;
  /** Required for structure and overlay ops. */
  applyToView?(view: DocView, p: P, op: Operation<P>): DocView;
  /** Throws ToolError INVALID_INPUT. */
  validate(p: unknown): P;
  /** Overlay op with no writer (view-only: object.move/remove, corrections). */
  noOutput?: true;
  /** Asset ids the op's writer reads (planFor sends their bytes). */
  assets?(p: P): AssetId[];
}

export function defineOperation<P>(
  d: OperationDefinition<P>,
): OperationDefinition<P> {
  return d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, OperationDefinition<any>>();

/** Idempotent per definition; a different definition for a known type throws. */
export function registerOperations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defs: readonly OperationDefinition<any>[],
): void {
  for (const d of defs) {
    const known = registry.get(d.type);
    if (known === d) continue;
    if (known)
      throw new Error(
        `Operation ${d.type} (v${d.v}) is already registered with a different definition`,
      );
    registry.set(d.type, d);
  }
}

export function getOperation(type: string): OperationDefinition {
  const d = registry.get(type);
  if (!d)
    throw new ToolError(
      'INVALID_INPUT',
      `This document uses an edit this version does not know (${type})`,
    );
  return d;
}

export function allOperations(): OperationDefinition[] {
  return [...registry.values()];
}
