import { useId, useState } from 'react';
import type { SqlDialect } from '@/shared/lib/data-formats';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import {
  Button,
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Stack,
} from '@/shared/ui';
import { IconDownload } from '@/shared/ui/icons';
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
  const ids = { format: useId(), table: useId(), dialect: useId() };
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
        leftIcon={<IconDownload size="sm" />}
        onClick={() => setOpen(true)}
      >
        Export
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            {filteredRows === null
              ? 'All rows and the visible columns.'
              : `The ${filteredRows.toLocaleString('en-US')} filtered rows and the visible columns.`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Stack gap="3">
            <Stack gap="1">
              <Label htmlFor={ids.format}>Format</Label>
              <Select
                id={ids.format}
                value={format}
                onValueChange={(v) =>
                  onSettings({ exportFormat: v as ExportFormat })
                }
                items={EXPORT_FORMATS.map((f) => ({
                  value: f,
                  label: EXPORT_LABEL[f],
                }))}
              />
            </Stack>
            {format === 'sql' && (
              <>
                <Stack gap="1">
                  <Label htmlFor={ids.table}>Table name</Label>
                  <Input
                    id={ids.table}
                    value={settings.sqlTable}
                    onChange={(v) => onSettings({ sqlTable: v })}
                  />
                </Stack>
                <Stack gap="1">
                  <Label htmlFor={ids.dialect}>Dialect</Label>
                  <Select
                    id={ids.dialect}
                    value={settings.sqlDialect}
                    onValueChange={(v) =>
                      onSettings({ sqlDialect: v as SqlDialect })
                    }
                    items={DIALECTS}
                  />
                </Stack>
              </>
            )}
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button leftIcon={<IconDownload size="sm" />} onClick={download}>
            Download
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
