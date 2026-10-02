import { useClipboard } from '@/shared/lib/clipboard';
import { Button, IconButton } from './button';
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

/**
 * The one copy action (6-H component audit): copies through useClipboard
 * (failures toast, never silent), then shows a check and "Copied <label>"
 * for two seconds. Disabled while there is nothing to copy.
 */
export function CopyButton({
  label,
  value,
  variant = 'icon',
  size = 'sm',
  disabled,
  className,
}: CopyButtonProps) {
  const { copied, copy } = useClipboard();
  const empty = typeof value === 'string' && value === '';
  const name = copied ? `Copied ${label}` : `Copy ${label}`;
  const onClick = () =>
    void copy(typeof value === 'function' ? value() : value);
  if (variant === 'text')
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        aria-label={name}
        disabled={disabled || empty}
        leftIcon={copied ? <IconCheck size="sm" /> : <IconCopy size="sm" />}
        onClick={onClick}
        className={className}
      >
        {name}
      </Button>
    );
  return (
    <IconButton
      variant="ghost"
      size={size}
      label={name}
      icon={copied ? IconCheck : IconCopy}
      disabled={disabled || empty}
      onClick={onClick}
      className={className}
    />
  );
}
CopyButton.displayName = 'CopyButton';
