import { formatBytes } from '@/shared/lib/format';
import { compressPdf, PRESETS } from '@/pdf/compress/pipeline';
import type {
  OptimizeCompressParams,
  OptimizeRepairParams,
} from '../ops/optimize';
import { plural } from '../ops/validate';
import { defineCheckpointRunner } from './registry';

/** Spec 13.3: not an error, but always reported. */
export const KEPT_ORIGINAL =
  'Kept original: the compressed file was not smaller';

const sizes = (before: number, after: number) =>
  `${formatBytes(before)} to ${formatBytes(after)}`;

/** Compress pipeline (spec 3.5) as a checkpoint; the report keeps every stage. */
export const optimizeCompressRunner =
  defineCheckpointRunner<OptimizeCompressParams>({
    type: 'optimize.compress',
    async run({ bytes, params }, { services, signal, progress }) {
      const settings = params.settings ?? PRESETS[params.preset];
      const { bytes: out, report } = await compressPdf(
        bytes,
        { ...settings, qpdf: { ...settings.qpdf, linearize: false } },
        services.compress,
        { signal, progress },
      );
      const lines = report.stages.map(
        (s) => `${s.label}: ${sizes(s.before, s.after)}`,
      );
      lines.push(
        report.keptOriginal
          ? `The file stays at ${formatBytes(report.inputSize)}.`
          : `Saved ${formatBytes(report.inputSize - report.outputSize)}.`,
      );
      return {
        bytes: out,
        report: {
          title: report.keptOriginal
            ? KEPT_ORIGINAL
            : `Compressed from ${sizes(report.inputSize, report.outputSize)}`,
          lines,
          warnings: report.warnings,
          details: report,
        },
      };
    },
  });

/** qpdf full rewrite: rebuilds the cross-reference table and every object. */
export const optimizeRepairRunner =
  defineCheckpointRunner<OptimizeRepairParams>({
    type: 'optimize.repair',
    async run({ bytes }, { services, signal, progress }) {
      progress({ done: 0, total: 1, label: 'Rewriting the file' });
      const r = await services.qpdf.optimize(
        bytes,
        { objectStreams: 'preserve' },
        signal,
      );
      const n = r.warnings.length;
      return {
        bytes: r.bytes,
        report: {
          title: n
            ? `Repaired: qpdf fixed ${n} ${plural(n, 'problem')}`
            : 'Rewrote the file: no problems found',
          lines: [`Size: ${sizes(bytes.length, r.bytes.length)}`],
          warnings: r.warnings,
        },
      };
    },
  });
