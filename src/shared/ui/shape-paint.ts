export type PaintToken =
  | 'accent'
  | 'accent-fg'
  | 'danger'
  | 'warning'
  | 'info'
  | 'redact'
  | 'fg'
  | 'fg-muted';

export type Paint =
  | { token: PaintToken }
  /** hex validated /^#[0-9a-f]{6}$/i */
  | { hex: string; opacity?: number };

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * A paint as an SVG colour. Tokens become theme variables; hex is the one
 * validated colour-literal path of the kit (user-chosen ink and highlights).
 */
export function resolvePaint(p: Paint): { color: string; opacity?: number } {
  if ('token' in p)
    return { color: `var(--color-${p.token})`, opacity: undefined };
  if (!HEX.test(p.hex))
    throw new Error(`ShapeLayer: invalid hex colour "${p.hex}" (use #rrggbb)`);
  return { color: p.hex, opacity: p.opacity };
}
