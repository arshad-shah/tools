import {
  Button,
  Card,
  FileDrop,
  Inline,
  Notice,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { download } from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import { saveZip } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { notify } from '@/shared/lib/notify';
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
    <Card
      as="section"
      title="Batch from a CSV"
      description="One QR code per row, in the current style; at most 500."
    >
      <Stack gap="5">
        <FileDrop
          accept=".csv,text/csv"
          hint="A CSV with a header row."
          labels={{ chooseOne: 'Choose a CSV' }}
          value={name ? [name] : undefined}
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
        {table?.error ? (
          <Notice tone="danger">{table.error.message}</Notice>
        ) : null}
        {columns.length > 0 ? (
          <Stack gap="4">
            <Text>{`${name}: ${table?.rows.length ?? 0} rows`}</Text>
            <Inline gap="3" wrap align="end">
              <Select
                label="Content column"
                width="sm"
                value={value}
                onChange={setColumn}
                options={columns.map((c) => ({ value: c, label: c }))}
              />
              <Select
                label="File name column"
                width="sm"
                value={naming}
                onChange={setNameColumn}
                options={columns.map((c) => ({ value: c, label: c }))}
              />
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
                variant="solid"
                tone="accent"
                icon={download}
                loading={busy}
                disabled={busy}
                onClick={() => void run()}
              >
                Download ZIP
              </Button>
            </Inline>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
