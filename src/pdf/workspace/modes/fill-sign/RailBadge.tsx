import { Badge } from '@arshad-shah/cynosure';
import { asDetectionCache, detectionKey } from '@/pdf/doc/detection';
import type { PageRef } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { useViewFields } from './data';
import { useFillSign } from './store';

/** "{n} fields left", or why detection has nothing for this page (spec §8.4, §13.3). */
export function FillSignRailBadge({
  page,
  doc,
}: {
  page: PageRef;
  doc: DocumentApi;
}) {
  const fields = useViewFields(doc);
  const key = detectionKey(page.source, page.index);
  const crashed = useFillSign((s) => s.crashed.has(key));
  const skipped =
    asDetectionCache(doc.state.detection)?.pages[key]?.skipped ?? null;
  if (crashed)
    return (
      <Badge tone="danger" size="sm" dot>
        Detection failed on this page
      </Badge>
    );
  if (skipped === 'too-complex')
    return (
      <Badge tone="warning" size="sm" dot>
        No detection: page too complex
      </Badge>
    );
  const left = fields.filter(
    (f) => f.page.id === page.id && f.status === 'field' && !f.filled,
  ).length;
  if (!left) return null;
  return (
    <Badge tone="info" size="sm" dot>
      {`${left} ${left === 1 ? 'field' : 'fields'} left`}
    </Badge>
  );
}
