import { Text } from '@arshad-shah/cynosure';
import { InspectorSection } from '../../ui/InspectorSection';
import type { ModeProps } from '../types';
import { latestRedaction } from './marks';
import { RedactReport } from './RedactReport';
import { SearchPanel } from './SearchPanel';
import { useRedactUi } from './ui-store';

/** Inspector: find and mark, options for new marks, the last report. */
export function RedactInspector({ doc }: ModeProps) {
  const ui = useRedactUi();
  const report = latestRedaction(doc);
  if (!ui.searchOpen && !report)
    return (
      <Text size="sm" tone="muted">
        Mark an area on the page, or use Find and mark to list matches here. The
        report of what was removed shows here after you apply.
      </Text>
    );
  return (
    <>
      {ui.searchOpen ? (
        <InspectorSection title="Find and mark">
          <SearchPanel doc={doc} />
        </InspectorSection>
      ) : null}
      {report ? (
        <InspectorSection title="Report">
          <RedactReport doc={doc} />
        </InspectorSection>
      ) : null}
    </>
  );
}
