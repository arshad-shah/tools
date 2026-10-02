import { InspectorSection } from '@/shared/ui';
import type { ModeProps } from '../types';
import { latestRedaction } from './marks';
import { RedactReport } from './RedactReport';
import { SearchPanel } from './SearchPanel';
import { useRedactUi } from './ui-store';

/** Inspector: find and mark, options for new marks, the last report. */
export function RedactInspector({ doc }: ModeProps) {
  const ui = useRedactUi();
  return (
    <>
      {ui.searchOpen ? (
        <InspectorSection title="Find and mark">
          <SearchPanel doc={doc} />
        </InspectorSection>
      ) : null}
      {latestRedaction(doc) ? (
        <InspectorSection title="Report">
          <RedactReport doc={doc} />
        </InspectorSection>
      ) : null}
    </>
  );
}
