import { CopyButton as CyCopyButton } from '@arshad-shah/cynosure';
import { copyText, useClipboard } from '@/shared/lib/clipboard';
import { ToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { Button } from './button';
import { IconCheck, IconCopy } from './icons';

export interface CopyButtonProps {
  /** What is copied, in words: the accessible name is "Copy <label>". */
  label: string;
  /** The text, or a function read at click time (for large outputs). */
  value: string | (() => string);
  /** icon (default): a ghost icon button. text: a button with words. */
  variant?: 'icon' | 'text';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

/** Spec §6: a failed copy is never silent. */
const reportFailure = (e: unknown) =>
  notify.error(e instanceof ToolError ? e : 'Could not copy to clipboard');

/**
 * The one copy action (6-H component audit), on Cynosure's CopyButton:
 * copies, then shows a check and "Copied <label>" for two seconds; a failure
 * toasts. Disabled while there is nothing to copy.
 */
export function CopyButton({
  label,
  value,
  variant = 'icon',
  size = 'sm',
  disabled,
  className,
}: CopyButtonProps) {
  const empty = typeof value === 'string' && value === '';
  if (variant === 'text')
    return (
      <CopyTextButton
        label={label}
        value={value}
        size={size}
        disabled={disabled || empty}
        className={className}
      />
    );
  return (
    <CyCopyButton
      value={value}
      labels={{
        copy: `Copy ${label}`,
        copied: `Copied ${label}`,
        failed: `Could not copy ${label}`,
      }}
      copy={copyText}
      onError={reportFailure}
      size={size}
      disabled={disabled || empty}
      {...(className ? { className } : {})}
    />
  );
}
CopyButton.displayName = 'CopyButton';

/**
 * The worded form. Cynosure's CopyButton is icon-only, so this is a
 * Cynosure Button (through the Button facade) with the same copy flow.
 */
function CopyTextButton({
  label,
  value,
  size,
  disabled,
  className,
}: Required<Pick<CopyButtonProps, 'label' | 'value' | 'size'>> &
  Pick<CopyButtonProps, 'disabled' | 'className'>) {
  const { copied, copy } = useClipboard();
  const name = copied ? `Copied ${label}` : `Copy ${label}`;
  return (
    <Button
      variant="ghost"
      size={size}
      aria-label={name}
      disabled={disabled}
      leftIcon={copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />}
      onClick={() => void copy(typeof value === 'function' ? value() : value)}
      className={className}
    >
      {name}
    </Button>
  );
}
