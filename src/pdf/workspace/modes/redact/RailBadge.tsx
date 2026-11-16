import { Badge } from '@arshad-shah/cynosure';
import type { PageRef } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { latestRedaction, pageMarks } from './marks';

/** "3 marks" before apply; "Redacted" or "Turned into image" after. */
export function RedactRailBadge({
  page,
  doc,
}: {
  page: PageRef;
  doc: DocumentApi;
}) {
  const n = pageMarks(doc.view, page.id).reduce(
    (s, m) => s + m.params.rects.length,
    0,
  );
  if (n)
    return (
      <Badge tone="danger" size="sm" dot>
        {n === 1 ? '1 mark' : `${n} marks`}
      </Badge>
    );
  const latest = latestRedaction(doc);
  if (!latest || page.source !== latest.sourceId || page.blank) return null;
  if (latest.report.rasterisedPages?.includes(page.index))
    return (
      <Badge tone="warning" size="sm">
        Turned into image
      </Badge>
    );
  if (latest.report.redactedPages?.includes(page.index))
    return (
      <Badge tone="neutral" size="sm">
        Redacted
      </Badge>
    );
  return null;
}
