import React from 'react';
import { Icon, Inline, Text } from '@arshad-shah/cynosure';
import { globe, shieldCheck } from '@arshad-shah/cynosure/icons';

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
}) => (
  <Inline gap="4" align="start" className={className}>
    <Icon
      icon={variant === 'local' ? shieldCheck : globe}
      tone={variant === 'local' ? 'accent' : 'info'}
      size="sm"
      className="mt-0.5 shrink-0"
    />
    <Text as="p" size="sm" tone="muted">
      <span>{WORDING[variant]}</span>
      {children ? <span> {children}</span> : null}
    </Text>
  </Inline>
);
PrivacyNote.displayName = 'PrivacyNote';
