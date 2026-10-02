import type { ExportStage } from '../export-stages';

/**
 * Export option "Optimise for fast web view" (spec 7.2, Optimize): qpdf
 * rewrites the file linearized so a browser can show page 1 before the
 * rest arrives. Runs after the unreferenced-object sweep.
 */
export const linearizeStage: ExportStage = {
  id: 'linearize',
  order: 20,
  applies: (ctx) => ctx.options.linearize === true,
  run: async (bytes, ctx) => {
    const out = await ctx.services.qpdf.optimize(
      bytes,
      { linearize: true, objectStreams: 'preserve' },
      ctx.signal,
    );
    return out.bytes;
  },
};
