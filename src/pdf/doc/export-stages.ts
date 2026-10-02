import type { JobProgress } from '@/shared/state/useJob';
import type { DocumentModel } from './model';
import type { Services } from './services';
import type { DocView, PageId } from './types';
import { encryptStage } from './export-stages/encrypt';
import { linearizeStage } from './export-stages/linearize';

/** Export choices; Parts add keys (flatten, linearize, password, signature). */
export interface ExportOptions {
  filename: string;
  /** Export only these pages; null = every page. */
  onlyPages: PageId[] | null;
  stripMetadata: boolean;
  [key: string]: unknown;
}

export interface ExportContext {
  model: DocumentModel;
  view: DocView;
  options: ExportOptions;
  services: Services;
  signal: AbortSignal;
  progress(p: JobProgress): void;
  /** Stages report anything the user must know here (plain words). */
  warnings: string[];
}

/** A step after materialise, run in `order` when it `applies`. */
export interface ExportStage {
  id: string;
  order: number;
  applies(ctx: ExportContext): boolean;
  run(bytes: Uint8Array, ctx: ExportContext): Promise<Uint8Array>;
}

/** Checkpoints whose originals must not survive as orphaned objects (spec §6.4 step 4). */
const SCRUBBING = /^(redact\.|sanitize)/;

/**
 * Ordered export stages. Append-only: B ships metadata removal and the
 * unreferenced-object sweep; E adds linearize and encrypt, H adds sign.
 */
export const EXPORT_STAGES: ExportStage[] = [
  {
    id: 'strip-metadata',
    order: 5,
    applies: (ctx) => ctx.options.stripMetadata,
    run: (bytes, ctx) =>
      ctx.services.edit.call('stripMetadata', [bytes.slice()], {
        signal: ctx.signal,
      }),
  },
  {
    id: 'remove-unreferenced',
    order: 10,
    applies: (ctx) =>
      ctx.model
        .getState()
        .log.slice(0, ctx.model.getState().cursor)
        .some((op) => op.checkpoint && SCRUBBING.test(op.type)),
    run: async (bytes, ctx) => {
      const out = await ctx.services.qpdf.optimize(
        bytes,
        { removeUnreferenced: true, objectStreams: 'generate' },
        ctx.signal,
      );
      return out.bytes;
    },
  },
  encryptStage,
  linearizeStage,
];
