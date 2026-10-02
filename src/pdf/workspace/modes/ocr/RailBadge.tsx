import { Badge, StatusDot } from '@/shared/ui';
import type { PageRef } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { latestOcr } from './actions';

/** "Text added" or "Low confidence" on the pages of the last run. */
export function OcrRailBadge({
  page,
  doc,
}: {
  page: PageRef;
  doc: DocumentApi;
}) {
  const latest = latestOcr(doc.state);
  if (!latest || page.blank || page.source !== latest.sourceId) return null;
  const result = latest.pages.find((p) => p.page === page.index + 1);
  if (!result || result.words === 0) return null;
  if (result.low)
    return (
      <Badge tone="warning" variant="soft" size="xs">
        <StatusDot tone="warning" decorative />
        Low confidence
      </Badge>
    );
  return (
    <Badge tone="neutral" variant="soft" size="xs">
      Text added
    </Badge>
  );
}
