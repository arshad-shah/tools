import React, { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import type { ShareableState } from '@/shared/lib/use-shareable-state';
import { Button } from './button';
import { IconShareLink } from './icons';
import { Tooltip } from './tooltip';

/** What the button needs from `useShareableState` (or a stand-in). */
export type ShareControl = Pick<
  ShareableState<unknown>,
  'canShare' | 'reason'
> & {
  share(): Promise<string> | void;
};

export interface ShareButtonProps {
  share: ShareControl;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

/**
 * Copies a share link (spec §4.2). When sharing is off the button stays
 * focusable but `aria-disabled`, so keyboard and pointer users can still
 * reach the tooltip with the reason (a disabled button gets neither focus
 * nor hover). `share()` reports its own failures (useShareableState does),
 * and toasts its own success, so neither is reported twice here.
 */
export const ShareButton: React.FC<ShareButtonProps> = ({
  share,
  label = 'Share',
  size = 'sm',
  variant = 'secondary',
  className,
}) => {
  const [busy, setBusy] = useState(false);
  const off = !share.canShare;

  const onClick = async () => {
    if (off || busy) return;
    setBusy(true);
    try {
      // useShareableState.share() copies and toasts "Share link copied"
      // itself, so a second toast here would double up.
      await share.share();
    } catch {
      // Reported by share() itself; nothing was copied.
    } finally {
      setBusy(false);
    }
  };

  const button = (
    <Button
      type="button"
      size={size}
      variant={variant}
      leftIcon={<IconShareLink size="sm" />}
      aria-disabled={off || undefined}
      aria-busy={busy || undefined}
      onClick={onClick}
      className={cn(off && 'cursor-not-allowed opacity-50', className)}
    >
      {label}
    </Button>
  );
  // Always wrapped, so the button keeps focus when canShare flips.
  const tip = off
    ? (share.reason ?? 'Sharing is not available')
    : 'Copy a link to this state';
  return <Tooltip content={tip}>{button}</Tooltip>;
};
ShareButton.displayName = 'ShareButton';
