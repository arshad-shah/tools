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

/** Paint tokens as Cynosure colour roles (redact is its own red). */
const TOKEN_COLOR: Record<PaintToken, string> = {
  accent: 'var(--cy-color-accent)',
  'accent-fg': 'var(--cy-color-accent-text)',
  danger: 'var(--cy-color-danger-text)',
  warning: 'var(--cy-color-warning-text)',
  info: 'var(--cy-color-info-text)',
  redact: 'light-dark(#dc2626, #ef4444)',
  fg: 'var(--cy-color-ink)',
  'fg-muted': 'var(--cy-color-muted)',
};

/**
 * A paint as an SVG colour. Tokens become theme variables; hex is the one
 * validated colour-literal path of the kit (user-chosen ink and highlights).
 */
export function resolvePaint(p: Paint): { color: string; opacity?: number } {
  if ('token' in p) return { color: TOKEN_COLOR[p.token], opacity: undefined };
  if (!HEX.test(p.hex))
    throw new Error(`ShapeLayer: invalid hex colour "${p.hex}" (use #rrggbb)`);
  return { color: p.hex, opacity: p.opacity };
}
