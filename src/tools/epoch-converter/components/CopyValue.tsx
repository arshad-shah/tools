import React from 'react';
import { IconCheck, IconCopy } from '@/shared/ui/icons';
import { IconButton } from '@/shared/ui';

/** A copy button for one labelled value. */
export const CopyValue: React.FC<{
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}> = ({ label, copied, onCopy }) => (
  <IconButton
    variant="ghost"
    size="sm"
    label={copied ? `Copied ${label}` : `Copy ${label}`}
    icon={copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />}
    onClick={onCopy}
  />
);
