import { InspectorSection } from '@/shared/ui';
import type { ModeProps } from '../types';
import { RedactOptions } from './RedactOptions';
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
      <InspectorSection title="Redaction options">
        <RedactOptions />
      </InspectorSection>
      {latestRedaction(doc) ? (
        <InspectorSection title="Report">
          <RedactReport doc={doc} />
        </InspectorSection>
      ) : null}
    </>
  );
}
