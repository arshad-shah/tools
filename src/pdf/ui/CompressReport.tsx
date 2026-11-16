import {
  CodeBlock,
  DescriptionList,
  Disclosure,
  List,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import type { CompressReport } from '@/pdf/compress/pipeline';

/**
 * What each compress stage did, which images were touched, and qpdf's
 * warnings (Optimize mode's result).
 */
export function CompressReportView({ report }: { report: CompressReport }) {
  const { images, warnings } = report;
  const skipped = images?.skipped.reduce((n, s) => n + s.count, 0) ?? 0;
  return (
    <Stack gap="4">
      <DescriptionList
        size="sm"
        divided
        layout="stacked"
        items={report.stages.map((s) => ({
          id: s.id,
          term: s.label,
          detail: `${formatBytes(s.before)} to ${formatBytes(s.after)} (${formatSizeChange(s.before, s.after)})`,
        }))}
      />
      {images ? (
        <Stack gap="2">
          <Text size="sm">
            Images: {images.processed} recompressed, {images.unchanged} already
            optimal, {skipped} left untouched.
          </Text>
          {images.grayToRgb > 0 ? (
            <Text size="sm" tone="muted">
              {images.grayToRgb === 1
                ? '1 grayscale image was'
                : `${images.grayToRgb} grayscale images were`}{' '}
              re-encoded as colour JPEG: browsers cannot write grayscale JPEGs.
            </Text>
          ) : null}
          {skipped > 0 ? (
            <List
              label="Left untouched"
              size="sm"
              items={images.skipped.map((s) => ({
                id: s.reason,
                label: `${s.reason} (${s.count})`,
              }))}
            />
          ) : null}
        </Stack>
      ) : null}
      {warnings.length ? (
        <Disclosure
          summary={`Warnings (${warnings.length})`}
          variant="line"
          size="sm"
        >
          <CodeBlock code={warnings.join('\n')} wrap size="sm" />
        </Disclosure>
      ) : null}
    </Stack>
  );
}
