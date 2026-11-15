import { Badge } from '@arshad-shah/cynosure';
import { ToolError } from '@/shared/lib/errors';

export type StatusTone = 'accent' | 'danger' | 'warning' | 'info' | 'muted';

const TONE = {
  accent: 'accent',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  muted: 'neutral',
} as const;

interface StatusDotBase {
  tone: StatusTone;
  /** Pulses only when motion is allowed. */
  pulse?: boolean;
  className?: string;
}

/** A label is required unless the dot is explicitly decorative (spec §4.6). */
export type StatusDotProps = StatusDotBase &
  (
    | { label: string; decorative?: false }
    | { decorative: true; label?: undefined }
  );

/**
 * A status dot: Cynosure's Badge with `dot` and no text (`live` when it
 * pulses). Named by `label` (role img), or hidden when decorative.
 */
export function StatusDot(props: StatusDotProps) {
  const { tone, pulse, className } = props;
  if (!props.decorative && !props.label?.trim())
    throw new ToolError(
      'INVALID_INPUT',
      'StatusDot needs a label unless it is decorative.',
    );
  return (
    <Badge
      dot={pulse ? 'live' : true}
      tone={TONE[tone]}
      // Neutral would be ink; a muted dot stays quiet.
      {...(tone === 'muted' ? { color: 'var(--cy-color-muted)' } : {})}
      label={props.decorative ? undefined : props.label}
      {...(className ? { className } : {})}
    />
  );
}
StatusDot.displayName = 'StatusDot';
