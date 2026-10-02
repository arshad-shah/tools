import { cn } from '@/shared/lib/cn';
import { formatColor } from '@/shared/lib/colour';
import { tryParse } from './color-picker-model';
import { Swatch } from './swatch';

export interface SwatchRowProps {
  /** Accessible name of the row, also shown as its heading. */
  label: string;
  colors: readonly string[];
  /** Hex of the current colour, to mark the matching swatch. */
  currentHex: string;
  onPick(css: string): void;
  className?: string;
}

/** A labelled row of colour buttons (recent colours, tool palettes). */
export function SwatchRow({
  label,
  colors,
  currentHex,
  onPick,
  className,
}: SwatchRowProps) {
  const valid = colors.flatMap((css) => {
    const p = tryParse(css);
    return p.color ? [{ css, hex: formatColor(p.color, 'hex') }] : [];
  });
  if (valid.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('grid gap-1', className)}
    >
      <span aria-hidden className="text-xs text-fg-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {valid.map(({ css, hex }) => {
          const selected = hex === currentHex;
          return (
            <button
              key={css}
              type="button"
              aria-label={`Use ${css}`}
              aria-pressed={selected}
              title={css}
              onClick={() => onPick(css)}
              className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span aria-hidden className="flex">
                <Swatch color={hex} label={css} selected={selected} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
SwatchRow.displayName = 'SwatchRow';
