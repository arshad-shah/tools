import { Button, Inline, Tooltip } from '@arshad-shah/cynosure';
import { share as shareIcon } from '@arshad-shah/cynosure/icons';
import React, { useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ShareableState } from '@/shared/lib/use-shareable-state';
import { ToolActionsSlot } from '@/shared/lib/tool-actions-slot';

/**
 * Page-level actions (Share, Help, Send to): portalled into the tool page
 * header beside the favourite star; in place where there is no header
 * (unit tests).
 */
export function ToolActions({ children }: { children: React.ReactNode }) {
  const slot = useContext(ToolActionsSlot);
  if (slot) return createPortal(children, slot);
  return (
    <Inline gap="2" align="center" justify="end" wrap>
      {children}
    </Inline>
  );
}

/** What ShareButton needs from `useShareableState`. */
export type ShareControl = Pick<
  ShareableState<unknown>,
  'canShare' | 'reason'
> & { share(): Promise<string> | void };

/**
 * Copies a link to the tool's state. When sharing is off it stays focusable
 * (aria-disabled) so its tooltip can say why. `share()` reports its own
 * success and failure.
 */
export function ShareButton({
  share,
  label = 'Share',
}: {
  share: ShareControl;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const off = !share.canShare;
  const onClick = async () => {
    if (off || busy) return;
    setBusy(true);
    try {
      await share.share();
    } catch {
      // Reported by share() itself.
    } finally {
      setBusy(false);
    }
  };
  return (
    <Tooltip
      content={
        off
          ? (share.reason ?? 'Sharing is not available')
          : 'Copy a link to this state'
      }
    >
      <Button
        variant="soft"
        icon={shareIcon}
        aria-disabled={off || undefined}
        loading={busy}
        onClick={() => void onClick()}
      >
        {label}
      </Button>
    </Tooltip>
  );
}
