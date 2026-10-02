import { cn } from '@/shared/lib/cn';
import { ToolError } from '@/shared/lib/errors';

const HEX = /^#[0-9a-f]{6}$/i;

type VectorA11y =
  | { label: string; decorative?: false }
  | { decorative: true; label?: undefined };

export type VectorSampleProps = VectorA11y & {
  /** SVG path data in the frame's units (y down). */
  d: string;
  /** Frame size of the path data. */
  width: number;
  height: number;
  /** Validated #rrggbb fill. */
  color: string;
  /** Even-odd fill (traced shapes with holes); nonzero otherwise. */
  evenOdd?: boolean;
  className?: string;
};

/**
 * A filled vector drawing (an ink signature) scaled to fit its CSS box,
 * aspect kept and centred. The kit owns the `<svg>`; the colour is
 * validated, never passed through raw.
 */
export function VectorSample({
  d,
  width,
  height,
  color,
  evenOdd,
  label,
  decorative,
  className,
}: VectorSampleProps) {
  if (!HEX.test(color))
    throw new ToolError(
      'INVALID_INPUT',
      `Ink must be #rrggbb, got "${color}".`,
    );
  if (!(width > 0 && height > 0 && Number.isFinite(width * height)))
    throw new ToolError('INVALID_INPUT', 'The drawing has no size.');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
      className={cn('block', className)}
    >
      <path d={d} fill={color} fillRule={evenOdd ? 'evenodd' : 'nonzero'} />
    </svg>
  );
}
VectorSample.displayName = 'VectorSample';
