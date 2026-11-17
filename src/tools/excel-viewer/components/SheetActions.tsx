import { Button, Menu, Select } from '@arshad-shah/cynosure';
import { download as downloadIcon, send } from '@arshad-shah/cynosure/icons';

export type SheetAction = 'csv' | 'json' | 'csv-viewer' | 'sql-playground';

interface SheetActionsProps {
  /** Rows to offer as the header row (the sheet's first few). */
  rowCount: number;
  header: number | null;
  onHeader(row: number | null): void;
  onAction(action: SheetAction): void;
  disabled: boolean;
}

const HEADER_CHOICES = 10;

/** Header row choice, export and send-to for the active sheet. */
export function SheetActions({
  rowCount,
  header,
  onHeader,
  onAction,
  disabled,
}: SheetActionsProps) {
  const options = [
    { value: 'none', label: 'No header row' },
    ...Array.from(
      { length: Math.max(1, Math.min(HEADER_CHOICES, rowCount)) },
      (_, i) => ({ value: String(i), label: `Header in row ${i + 1}` }),
    ),
  ];
  return (
    <>
      <Select
        size="sm"
        label="Header row for exports"
        labelHidden
        value={header === null ? 'none' : String(header)}
        onChange={(v) => onHeader(v === 'none' ? null : Number(v))}
        options={options}
        disabled={disabled}
      />
      <Menu
        label="Export sheet"
        items={[
          { value: 'csv', label: 'CSV file' },
          { value: 'json', label: 'JSON file' },
        ]}
        onSelect={(v) => onAction(v as SheetAction)}
        trigger={(props) => (
          <Button
            {...props}
            size="sm"
            variant="soft"
            icon={downloadIcon}
            disabled={disabled}
          >
            Export
          </Button>
        )}
      />
      <Menu
        label="Send sheet to"
        items={[
          { value: 'csv-viewer', label: 'CSV Viewer' },
          { value: 'sql-playground', label: 'SQL Playground' },
        ]}
        onSelect={(v) => onAction(v as SheetAction)}
        trigger={(props) => (
          <Button
            {...props}
            size="sm"
            variant="soft"
            icon={send}
            disabled={disabled}
          >
            Send to
          </Button>
        )}
      />
    </>
  );
}
