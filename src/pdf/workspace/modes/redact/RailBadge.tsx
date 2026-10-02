import { Badge, StatusDot } from '@/shared/ui';
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
      <Badge tone="danger" variant="soft" size="xs">
        <StatusDot tone="danger" decorative />
        {n === 1 ? '1 mark' : `${n} marks`}
      </Badge>
    );
  const latest = latestRedaction(doc);
  if (!latest || page.source !== latest.sourceId || page.blank) return null;
  if (latest.report.rasterisedPages?.includes(page.index))
    return (
      <Badge tone="warning" variant="soft" size="xs">
        Turned into image
      </Badge>
    );
  if (latest.report.redactedPages?.includes(page.index))
    return (
      <Badge tone="neutral" variant="soft" size="xs">
        Redacted
      </Badge>
    );
  return null;
}
