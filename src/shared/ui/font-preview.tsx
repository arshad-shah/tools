import { cn } from '@/shared/lib/cn';
import { ToolError } from '@/shared/lib/errors';

const HEX = /^#[0-9a-f]{6}$/i;
const FAMILY = /^[\w -]+$/;
const PLACEHOLDER = 'Your name';

export interface FontPreviewProps {
  /** A loaded font family name (letters, digits, spaces, hyphens). */
  family: string;
  /** The name to show; the placeholder "Your name" when blank. */
  text: string;
  /** Degrees; positive leans right. */
  slant: number;
  /** Validated #rrggbb ink. */
  color: string;
  /** CSS px (default: the className's font size). */
  size?: number;
  /** Accessible name, e.g. the font's name. */
  label: string;
  className?: string;
}

/**
 * A typed signature sample: text in a chosen font, ink, size and slant
 * (typed signature gallery). The kit owns the inline style; inputs are
 * validated, never passed through raw.
 */
export function FontPreview({
  family,
  text,
  slant,
  color,
  size,
  label,
  className,
}: FontPreviewProps) {
  if (!HEX.test(color))
    throw new ToolError(
      'INVALID_INPUT',
      `Ink must be #rrggbb, got "${color}".`,
    );
  if (!FAMILY.test(family))
    throw new ToolError('INVALID_INPUT', `Invalid font family "${family}".`);
  const deg = Number.isFinite(slant) ? slant : 0;
  const shown = text.trim();
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'flex items-center justify-center overflow-hidden',
        className,
      )}
    >
      {/* The placeholder is drawn in the ink too: the sample sits on paper
          (white in both themes), where a theme tone can fail contrast. */}
      <span
        className="inline-block whitespace-nowrap"
        data-placeholder={shown ? undefined : ''}
        style={{
          fontFamily: `"${family}"`,
          color,
          fontSize: size,
          transform: deg ? `skewX(${-deg}deg)` : undefined,
        }}
      >
        {shown || PLACEHOLDER}
      </span>
    </span>
  );
}
FontPreview.displayName = 'FontPreview';
