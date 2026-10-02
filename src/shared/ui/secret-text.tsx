import React from 'react';
import { useClipboard } from '@/shared/lib/clipboard';
import { cn } from '@/shared/lib/cn';
import { notify } from '@/shared/lib/notify';
import { IconButton } from './button';
import { IconCopy, IconEye, IconEyeOff } from './icons';

export interface SecretTextProps {
  value: string;
  revealed: boolean;
  onRevealedChange(revealed: boolean): void;
  copyable?: boolean;
  /** Names the value in button labels, e.g. "token" gives "Reveal token". */
  label?: string;
  className?: string;
}

const DOT = 10;
const HEIGHT = 16;
/** Very long values are drawn as this many dots; the length is not the point. */
const MAX_DOTS = 48;

/** The masked form: an SVG dot pattern sized to the length, never glyphs. */
function Mask({ length, label }: { length: number; label: string }) {
  const dots = Math.max(1, Math.min(MAX_DOTS, length));
  const width = dots * DOT;
  return (
    <svg
      role="img"
      aria-label={`Hidden ${label}`}
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className="shrink-0 text-fg-muted"
    >
      {Array.from({ length: dots }, (_, i) => (
        <circle
          key={i}
          cx={i * DOT + DOT / 2}
          cy={HEIGHT / 2}
          r={3}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/**
 * A secret shown masked until revealed. While masked no text node or
 * attribute holds the value. Copy goes through the clipboard helper.
 */
export const SecretText: React.FC<SecretTextProps> = ({
  value,
  revealed,
  onRevealedChange,
  copyable,
  label = 'secret',
  className,
}) => {
  const { copy } = useClipboard();
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-md border border-line bg-surface-2 py-1 pr-1 pl-3',
        className,
      )}
    >
      <div className="flex min-h-8 min-w-0 flex-1 items-center overflow-hidden">
        {revealed ? (
          <code className="font-mono text-sm break-all text-fg">{value}</code>
        ) : (
          <Mask length={value.length} label={label} />
        )}
      </div>
      <IconButton
        size="sm"
        variant="ghost"
        label={`Reveal ${label}`}
        aria-pressed={revealed}
        icon={revealed ? IconEyeOff : IconEye}
        onClick={() => onRevealedChange(!revealed)}
      />
      {copyable ? (
        <IconButton
          size="sm"
          variant="ghost"
          label={`Copy ${label}`}
          icon={IconCopy}
          onClick={async () => {
            if (await copy(value)) notify.success('Copied');
          }}
        />
      ) : null}
    </div>
  );
};
SecretText.displayName = 'SecretText';
