import { SegmentedControl, Stack, TextField } from '@arshad-shah/cynosure';

export interface PageRangeFieldProps {
  mode: 'all' | 'ranges';
  text: string;
  onModeChange(mode: 'all' | 'ranges'): void;
  onTextChange(text: string): void;
  /** From trySelectPages; shown once something has been typed. */
  error: string | null;
  /** Just the range box: the caller offers "all pages" its own way. */
  rangesOnly?: boolean;
}

/** "All pages" or "Some pages", with a range box checked as you type. */
export function PageRangeField({
  mode,
  text,
  onModeChange,
  onTextChange,
  error,
  rangesOnly,
}: PageRangeFieldProps) {
  return (
    <Stack gap="3">
      {rangesOnly ? null : (
        <SegmentedControl
          label="Pages"
          size="sm"
          value={mode}
          onChange={(v) => onModeChange(v as 'all' | 'ranges')}
          options={[
            { value: 'all', label: 'All pages' },
            { value: 'ranges', label: 'Some pages' },
          ]}
        />
      )}
      {mode === 'ranges' ? (
        <TextField
          label="Page ranges"
          labelHidden={!rangesOnly}
          value={text}
          onChange={onTextChange}
          placeholder="e.g. 1-3, 5"
          // An empty box is not an error yet; the action stays off meanwhile.
          error={error && text.trim() !== '' ? error : undefined}
        />
      ) : null}
    </Stack>
  );
}
