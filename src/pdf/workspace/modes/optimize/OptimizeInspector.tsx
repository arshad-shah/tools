import { InspectorSection } from '@/shared/ui';
import type { ModeProps } from '../types';
import { CompressPanel } from './CompressPanel';
import { useSizeBreakdownRefresh } from './settings-store';
import { SizeBreakdownPanel } from './SizeBreakdown';

/** Optimize mode's pinned panel: compress settings and the size breakdown. */
export function OptimizeInspector({ doc }: ModeProps) {
  const refresh = useSizeBreakdownRefresh();
  return (
    <>
      <InspectorSection title="Compress">
        <CompressPanel doc={doc} />
      </InspectorSection>
      <InspectorSection title="Size breakdown">
        <SizeBreakdownPanel doc={doc} refresh={refresh} />
      </InspectorSection>
    </>
  );
}
