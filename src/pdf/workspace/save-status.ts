export type SaveStatus = 'saved' | 'saving' | 'error' | 'off' | 'unavailable';

export const SAVE_TEXT: Record<SaveStatus, string> = {
  saved: 'Saved on this device',
  saving: 'Saving',
  error: 'Not saved: storage problem',
  off: 'Not saved locally',
  unavailable: 'Not saved locally',
};
export const SAVE_TONE = {
  saved: 'success',
  saving: 'info',
  error: 'danger',
  off: 'neutral',
  unavailable: 'neutral',
} as const;
