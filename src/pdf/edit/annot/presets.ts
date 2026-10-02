/** Stamp presets (pure: shared by the op definitions and the writer). */
export type StampPreset =
  | 'Approved'
  | 'Draft'
  | 'Confidential'
  | 'Final'
  | 'NotApproved'
  | 'ForComment';

/** UI and appearance text per preset. */
export const STAMP_LABELS: Record<StampPreset, string> = {
  Approved: 'APPROVED',
  Draft: 'DRAFT',
  Confidential: 'CONFIDENTIAL',
  Final: 'FINAL',
  NotApproved: 'NOT APPROVED',
  ForComment: 'FOR COMMENT',
};

export const STAMP_PRESETS = Object.keys(STAMP_LABELS) as StampPreset[];

/** Menu and button names for presets. */
export const STAMP_NAMES: Record<StampPreset, string> = {
  Approved: 'Approved',
  Draft: 'Draft',
  Confidential: 'Confidential',
  Final: 'Final',
  NotApproved: 'Not approved',
  ForComment: 'For comment',
};
