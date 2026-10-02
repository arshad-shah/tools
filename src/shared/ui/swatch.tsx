import { cn } from '@/shared/lib/cn';
import { ToolError } from '@/shared/lib/errors';

/** Token colours a Swatch can show by name. */
const TOKENS = {
  accent: 'bg-accent',
  'accent-fg': 'bg-accent-fg',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  redact: 'bg-redact',
  fg: 'bg-fg',
  'fg-muted': 'bg-fg-muted',
  'fg-subtle': 'bg-fg-subtle',
  surface: 'bg-surface',
  canvas: 'bg-canvas',
} as const;
export type SwatchToken = keyof typeof TOKENS;

const HEX = /^#[0-9a-f]{6}$/i;

export interface SwatchProps {
  /** A token name or a validated `#rrggbb`. */
  color: SwatchToken | (string & {});
  label: string;
  size?: 'sm' | 'md';
  selected?: boolean;
  className?: string;
}

/** Colour chip. The only kit home of a user-chosen colour as inline style. */
export function Swatch({
  color,
  label,
  size = 'md',
  selected,
  className,
}: SwatchProps) {
  const token = (TOKENS as Record<string, string>)[color];
  if (!token && !HEX.test(color))
    throw new ToolError(
      'INVALID_INPUT',
      `Swatch colour must be a token name or #rrggbb, got "${color}".`,
    );
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'inline-block shrink-0 rounded-sm border border-line-control',
        size === 'sm' ? 'size-4' : 'size-6',
        selected && 'outline-2 outline-offset-2 outline-focus',
        token,
        className,
      )}
      style={token ? undefined : { backgroundColor: color }}
    />
  );
}
Swatch.displayName = 'Swatch';
