import { useMemo, useState } from 'react';
import { saveZip } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
import {
  Alert,
  AlertDescription,
  Button,
  FileUpload,
  Inline,
  Label,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@/shared/ui';
import { IconDownload } from '@/shared/ui/icons';
import { batchFromCsv, readCsv } from '../lib/batch';
import type { QrStyle } from '../lib/render';

/** A CSV column to a ZIP of PNG or SVG codes named from another column. */
export function BatchPanel({ qrStyle: style }: { qrStyle: QrStyle }) {
  const [csv, setCsv] = useState('');
  const [name, setName] = useState('');
  const [column, setColumn] = useState('');
  const [nameColumn, setNameColumn] = useState('');
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [busy, setBusy] = useState(false);
  const table = useMemo(() => {
    if (!csv) return null;
    try {
      return { ...readCsv(csv), error: null };
    } catch (e) {
      return {
        columns: [],
        rows: [],
        error: toToolError(e, 'Could not read the CSV'),
      };
    }
  }, [csv]);
  const columns = table?.columns ?? [];
  const value = columns.includes(column) ? column : (columns[0] ?? '');
  const naming = columns.includes(nameColumn) ? nameColumn : value;

  const run = async () => {
    setBusy(true);
    try {
      const files = await batchFromCsv(csv, value, {
        format,
        nameColumn: naming,
        style,
      });
      await saveZip(
        files.map((f) => ({ name: f.name, data: f.bytes })),
        `${name.replace(/\.csv$/i, '') || 'qr-codes'}.zip`,
      );
      notify.success(`Made ${files.length} QR codes`);
    } catch (e) {
      notify.error(toToolError(e, 'Could not make the batch'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="3">
      <FileUpload
        accept=".csv,text/csv"
        label="Choose a CSV with a header row"
        hint="One QR code per row; at most 500"
        onFiles={(files) => {
          const f = files[0];
          if (!f) return;
          readText(f).then(
            (t) => {
              setCsv(t);
              setName(f.name);
            },
            (e: unknown) =>
              notify.error(toToolError(e, 'Could not read the CSV')),
          );
        }}
      />
      {table?.error && (
        <Alert status="danger">
          <AlertDescription>{table.error.message}</AlertDescription>
        </Alert>
      )}
      {columns.length > 0 && (
        <Stack gap="3">
          <Text size="sm">
            {name}: {table?.rows.length ?? 0} rows
          </Text>
          <Inline gap="3" wrap align="end">
            <Stack gap="1">
              <Label htmlFor="qr-batch-col">Content column</Label>
              <Select
                id="qr-batch-col"
                value={value}
                onValueChange={setColumn}
                items={columns.map((c) => ({ value: c, label: c }))}
              />
            </Stack>
            <Stack gap="1">
              <Label htmlFor="qr-batch-name">File name column</Label>
              <Select
                id="qr-batch-name"
                value={naming}
                onValueChange={setNameColumn}
                items={columns.map((c) => ({ value: c, label: c }))}
              />
            </Stack>
            <SegmentedControl
              label="Format"
              value={format}
              onChange={(v) => setFormat(v as 'png' | 'svg')}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'svg', label: 'SVG' },
              ]}
            />
          </Inline>
          <Inline>
            <Button
              variant="primary"
              leftIcon={<IconDownload size="sm" />}
              disabled={busy}
              onClick={() => void run()}
            >
              Download ZIP
            </Button>
          </Inline>
        </Stack>
      )}
    </Stack>
  );
}
