import React from 'react';
import { cn } from '@/shared/lib/cn';
import { IconGlobe, IconShieldCheck } from './icons';

export interface PrivacyNoteProps {
  /** 'local': nothing leaves the browser; 'network': the tool makes requests. */
  variant: 'local' | 'network';
  /** Extra words shown after the statement. */
  children?: React.ReactNode;
  className?: string;
}

const WORDING = {
  local: 'Nothing leaves your browser.',
  network: 'Requests go directly from your browser to the URL you enter.',
} as const;

/** The one-line privacy statement a tool shows (spec §5). */
export const PrivacyNote: React.FC<PrivacyNoteProps> = ({
  variant,
  children,
  className,
}) => {
  const Icon = variant === 'local' ? IconShieldCheck : IconGlobe;
  return (
    <p
      className={cn('flex items-start gap-2 text-sm text-fg-muted', className)}
    >
      <Icon
        size="sm"
        className={cn(
          'mt-0.5',
          variant === 'local' ? 'text-accent-fg' : 'text-info',
        )}
      />
      <span>
        <span>{WORDING[variant]}</span>
        {children ? <span> {children}</span> : null}
      </span>
    </p>
  );
};
PrivacyNote.displayName = 'PrivacyNote';
