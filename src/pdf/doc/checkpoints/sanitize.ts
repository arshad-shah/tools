import { ToolError } from '@/shared/lib/errors';
import type { SanitizeParams } from '../ops/protect';
import { plural } from '../ops/validate';
import { defineCheckpointRunner } from './registry';

/**
 * `sanitize` (Protect mode): the edit worker removes the chosen content and
 * reports each kind in plain words. Orphaned originals are swept at export
 * by the remove-unreferenced stage.
 */
export const sanitizeRunner = defineCheckpointRunner<SanitizeParams>({
  type: 'sanitize',
  async run({ bytes, params }, { services, signal, progress }) {
    progress({ done: 0, total: 1, label: 'Removing content' });
    const out = await services.edit.call(
      'sanitize',
      [bytes.slice(), { ...params }],
      { signal },
    );
    const { removed, notes } = out.report;
    if (!removed.length)
      throw new ToolError(
        'INVALID_INPUT',
        'This document has none of the chosen content to remove',
      );
    progress({ done: 1, total: 1, label: 'Content removed' });
    return {
      bytes: out.bytes,
      report: {
        title: `Sanitised: ${removed.length} ${plural(removed.length, 'kind')} of content removed`,
        lines: removed,
        warnings: notes,
      },
    };
  },
});
