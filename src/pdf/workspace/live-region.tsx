import { LiveRegion, Stack } from '@arshad-shah/cynosure';
import { useCallback, useState } from 'react';

/**
 * The workspace's own live regions (spec §13.2): a polite status for undo,
 * redo, mode changes and finished jobs, and an assertive one for errors.
 */
export function useLiveRegion() {
  const [polite, setPolite] = useState({ text: '', n: 0 });
  const [assertive, setAssertive] = useState({ text: '', n: 0 });
  const announce = useCallback(
    (message: string, politeness: 'polite' | 'assertive' = 'polite') =>
      (politeness === 'polite' ? setPolite : setAssertive)((s) => ({
        text: message,
        n: s.n + 1,
      })),
    [],
  );
  // Cynosure's LiveRegion: a new sequence says an identical message again.
  const regions = (
    <>
      <Stack data-testid="workspace-announcer">
        <LiveRegion sequence={polite.n}>{polite.text}</LiveRegion>
      </Stack>
      <LiveRegion sequence={assertive.n} politeness="assertive">
        {assertive.text}
      </LiveRegion>
    </>
  );
  return { announce, regions };
}

/** "Undid: rotate page 3" (the label's first letter lowercased). */
export const historyMessage = (verb: 'Undid' | 'Redid', label: string) =>
  `${verb}: ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
