import { List, Notice, Stack, Text } from '@arshad-shah/cynosure';
import { check, minus, textLayer, warning } from '@arshad-shah/cynosure/icons';
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
    <Stack gap="3" aria-label="OCR report">
      <Notice tone="success" size="sm" icon={textLayer} title={report.title}>
        {[
          `${plural(words, 'word')} in total`,
          ...(capped.length
            ? [`${plural(capped.length, 'large page')} read below 300 DPI`]
            : []),
        ].join(' · ')}
      </Notice>
      <List
        label="Pages read"
        size="sm"
        gap="sm"
        items={pages.map((p) => {
          const pct = Math.round(p.meanConfidence);
          return {
            id: String(p.page),
            icon: p.low ? warning : p.words ? check : minus,
            tone: p.low ? 'warning' : p.words ? 'success' : 'neutral',
            label: p.words
              ? `Page ${p.page}: ${plural(p.words, 'word')}, ${pct}% confidence`
              : `Page ${p.page}: no text found`,
            description: p.low
              ? `Low confidence, below ${LOW_CONFIDENCE}%`
              : undefined,
          };
        })}
      />
      {report.warnings.map((w) => (
        <Notice key={w} tone="warning" size="sm">
          <Text size="sm">{w}</Text>
        </Notice>
      ))}
    </Stack>
  );
}
