export interface ConfidenceInput {
  exact: boolean;
  hasLabel: boolean;
  plausible: boolean;
  peers: number;
  inHeaderRow: boolean;
}

/** Spec 8.4 thresholds: field at 0.70, suggestion at 0.45, dropped below. */
export const FIELD_MIN = 0.7;
export const SUGGEST_MIN = 0.45;

/** Spec 8.4 weighted sum, rounded to hundredths and clamped to [0, 1]. */
export function confidence(i: ConfidenceInput): number {
  const c =
    0.35 * +i.exact +
    0.25 * +i.hasLabel +
    0.15 * +i.plausible +
    0.15 * +(i.peers >= 2) +
    0.1 * +!i.inHeaderRow;
  return Math.min(1, Math.max(0, Math.round(c * 100) / 100));
}
