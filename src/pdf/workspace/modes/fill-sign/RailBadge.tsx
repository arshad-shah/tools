import { StatusDot, Text } from '@/shared/ui';
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
      <Text as="span" size="xs" className="flex items-center gap-1">
        <StatusDot tone="danger" decorative />
        Detection failed on this page
      </Text>
    );
  if (skipped === 'too-complex')
    return (
      <Text as="span" size="xs" className="flex items-center gap-1">
        <StatusDot tone="warning" decorative />
        No detection: page too complex
      </Text>
    );
  const left = fields.filter(
    (f) => f.page.id === page.id && f.status === 'field' && !f.filled,
  ).length;
  if (!left) return null;
  return (
    <Text as="span" size="xs" className="flex items-center gap-1">
      <StatusDot tone="info" decorative />
      {`${left} ${left === 1 ? 'field' : 'fields'} left`}
    </Text>
  );
}
