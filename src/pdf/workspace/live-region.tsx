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
  const regions = (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="workspace-announcer"
      >
        {/* Keyed so an identical message is announced again. */}
        <span key={polite.n}>{polite.text}</span>
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        <span key={assertive.n}>{assertive.text}</span>
      </div>
    </>
  );
  return { announce, regions };
}

/** "Undid: rotate page 3" (the label's first letter lowercased). */
export const historyMessage = (verb: 'Undid' | 'Redid', label: string) =>
  `${verb}: ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
