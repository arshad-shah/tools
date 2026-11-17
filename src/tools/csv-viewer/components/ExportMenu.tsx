import {
  Button,
  Dialog,
  Select,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { download as downloadIcon } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import type { SqlDialect } from '@/shared/lib/data-formats';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import {
  EXPORT_FORMATS,
  EXPORT_LABEL,
  exportFileName,
  exportTable,
  type ExportFormat,
  type ExportTable,
} from '../lib/export';
import type { CsvSettings } from '../settings';

const DIALECTS: { value: SqlDialect; label: string }[] = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mssql', label: 'SQL Server' },
];

interface ExportMenuProps {
  /** Builds the visible, filtered table when the user downloads. */
  table: () => ExportTable;
  /** Shown rows when a filter or search hides some, else null. */
  filteredRows: number | null;
  sourceName: string;
  settings: CsvSettings;
  onSettings(patch: Partial<CsvSettings>): void;
}

/** Export of the visible columns and filtered rows in one format. */
export function ExportMenu({
  table,
  filteredRows,
  sourceName,
  settings,
  onSettings,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const format = settings.exportFormat;

  const download = () => {
    try {
      const f = exportTable(table(), format, {
        sqlDialect: settings.sqlDialect,
        sqlTable: settings.sqlTable,
      });
      saveBlob(
        f.bytes,
        exportFileName(sourceName, f.extension, filteredRows),
        f.mime,
      );
      setOpen(false);
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="soft"
        icon={downloadIcon}
        onClick={() => setOpen(true)}
      >
        Export
      </Button>
      {open ? (
        <Dialog
          open
          onOpenChange={setOpen}
          title="Export"
          description={
            filteredRows === null
              ? 'All rows and the visible columns.'
              : `The ${filteredRows.toLocaleString('en-US')} filtered rows and the visible columns.`
          }
          actions={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="solid" icon={downloadIcon} onClick={download}>
                Download
              </Button>
            </>
          }
        >
          <Stack gap="3">
            <Select
              label="Format"
              value={format}
              onChange={(v) => onSettings({ exportFormat: v as ExportFormat })}
              options={EXPORT_FORMATS.map((f) => ({
                value: f,
                label: EXPORT_LABEL[f],
              }))}
            />
            {format === 'sql' && (
              <>
                <TextField
                  label="Table name"
                  value={settings.sqlTable}
                  onChange={(v) => onSettings({ sqlTable: v })}
                />
                <Select
                  label="Dialect"
                  value={settings.sqlDialect}
                  onChange={(v) => onSettings({ sqlDialect: v as SqlDialect })}
                  options={DIALECTS}
                />
              </>
            )}
          </Stack>
        </Dialog>
      ) : null}
    </>
  );
}
