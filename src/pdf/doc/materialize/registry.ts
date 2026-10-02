import type { PDFDocument, PDFPage } from 'pdf-lib';
import type { DrawCtx } from '@/pdf/edit/draw';
import type { AssetId, OpId, PageId } from '../types';

/** Overlay writers run grouped by phase, in this order (spec §6.4 step 3). */
export type MaterializePhase =
  | 'form'
  | 'flat'
  | 'content'
  | 'signature'
  | 'annotation'
  | 'metadata';

export const PHASE_ORDER: readonly MaterializePhase[] = [
  'form',
  'flat',
  'content',
  'signature',
  'annotation',
  'metadata',
];

export interface MaterializeCtx {
  doc: PDFDocument;
  draw: DrawCtx;
  /** Output page for a view page id; null if not exported. */
  page(id: PageId): PDFPage | null;
  /** Throws INVALID_INPUT if missing. */
  asset(id: AssetId): Uint8Array;
  /** Report line (plain words). */
  note(text: string): void;
}

/** The worker-side writer of one overlay op type (decision G4). */
export interface Materializer<P = unknown> {
  type: string;
  phase: MaterializePhase;
  apply(ctx: MaterializeCtx, p: P, op: { id: OpId }): Promise<void> | void;
}

export function defineMaterializer<P>(m: Materializer<P>): Materializer<P> {
  return m;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const writers = new Map<string, Materializer<any>>();

/** Idempotent per object; a different writer for a known type throws. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerMaterializers(ms: readonly Materializer<any>[]): void {
  for (const m of ms) {
    const known = writers.get(m.type);
    if (known === m) continue;
    if (known) throw new Error(`A writer for ${m.type} is already registered`);
    writers.set(m.type, m);
  }
}

export function getMaterializer(type: string): Materializer | undefined {
  return writers.get(type);
}
