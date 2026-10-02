import { Alert, MetaList, Stack, StatusDot, Text } from '@/shared/ui';
import { IconTextLayer } from '@/shared/ui/icons';
import { LOW_CONFIDENCE } from '@/pdf/doc/checkpoints/ocr';
import type { DocumentApi } from '../types';
import { latestOcr } from './actions';

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** The last run (spec 11 "Quality report"): confidence per page, low pages flagged. */
export function OcrReport({ doc }: { doc: DocumentApi }) {
  const latest = latestOcr(doc.state);
  if (!latest) return null;
  const { report, pages } = latest;
  const words = pages.reduce((n, p) => n + p.words, 0);
  const capped = pages.filter((p) => p.capped);
  return (
    <Stack gap="2" aria-label="OCR report">
      <div className="flex items-center gap-2 text-accent-fg">
        <IconTextLayer size="sm" />
        <Text size="sm" weight="semibold">
          {report.title}
        </Text>
      </div>
      <MetaList
        items={[
          `${plural(words, 'word')} in total`,
          ...(capped.length
            ? [`${plural(capped.length, 'large page')} read below 300 DPI`]
            : []),
        ]}
      />
      <ul className="flex flex-col gap-1 text-sm text-fg-muted">
        {pages.map((p) => {
          const low = p.low;
          const pct = Math.round(p.meanConfidence);
          return (
            <li key={p.page} className="flex items-center gap-2">
              <StatusDot
                tone={low ? 'warning' : p.words ? 'accent' : 'muted'}
                label={
                  low
                    ? `Low confidence, below ${LOW_CONFIDENCE}%`
                    : p.words
                      ? 'Text added'
                      : 'No text found'
                }
              />
              <span>
                {p.words
                  ? `Page ${p.page}: ${plural(p.words, 'word')}, ${pct}% confidence`
                  : `Page ${p.page}: no text found`}
              </span>
            </li>
          );
        })}
      </ul>
      {report.warnings.map((w) => (
        <Alert key={w} status="warning">
          <Text size="sm">{w}</Text>
        </Alert>
      ))}
    </Stack>
  );
}
