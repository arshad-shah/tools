import {
  Button,
  DataGrid,
  Inline,
  Menu,
  SegmentedControl,
  Select,
  Stack,
  Text,
  type DataGridColumn,
} from '@arshad-shah/cynosure';
import {
  copy as copyIcon,
  download as downloadIcon,
  send,
} from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { copyText } from '@/shared/lib/clipboard';
import { flattenObject, type SqlDialect } from '@/shared/lib/data-formats';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { CodeSurface } from '@/shared/ui';
import type { Row } from '../lib/engine';
import {
  exportRows,
  MOCK_EXPORT_FORMATS,
  MOCK_EXPORT_LABEL,
  type MockExportFormat,
} from '../lib/export';

const PREVIEW = 1000;
const TOOL_ID = 'random-data-generator';

interface OutputPanelProps {
  tables: Record<string, Row[]>;
}

/** Preview (first 1,000 rows as a grid or JSON), exports and hand-offs. */
export function OutputPanel({ tables }: OutputPanelProps) {
  const navigate = useNavigate();
  const names = Object.keys(tables);
  const [pick, setPick] = useState(names[names.length - 1]);
  const name = names.includes(pick) ? pick : names[names.length - 1];
  const rows = tables[name];
  const [format, setFormat] = useState<MockExportFormat>('json');
  const [dialect, setDialect] = useState<SqlDialect>('postgres');
  const [view, setView] = useState('table');

  const preview = useMemo(
    () => rows.slice(0, PREVIEW).map((r) => flattenObject(r)),
    [rows],
  );
  const gridRows = useMemo(
    () => preview.map((row, i) => ({ i, row })),
    [preview],
  );
  type GridRow = (typeof gridRows)[number];
  const columns = useMemo<DataGridColumn<GridRow>[]>(() => {
    const keys = new Set<string>();
    for (const r of preview) for (const k of Object.keys(r)) keys.add(k);
    const show = (v: unknown) =>
      v === null || v === undefined
        ? ''
        : typeof v === 'string' && v.startsWith('data:image/')
          ? `${v.slice(0, 40)}...`
          : String(v);
    return [...keys].map((k) => ({
      key: k,
      header: k,
      sortable: true,
      resizable: true,
      value: (r) => r.row[k],
      cell: (r) => show(r.row[k]),
      tooltip: (r) => show(r.row[k]),
      cellKind: (r) =>
        r.row[k] === null || r.row[k] === undefined
          ? 'null'
          : typeof r.row[k] === 'number'
            ? 'number'
            : undefined,
    }));
  }, [preview]);
  const json = useMemo(
    () => JSON.stringify(rows.slice(0, PREVIEW), null, 2),
    [rows],
  );

  const copy = () => {
    try {
      const f = exportRows(rows, format, { name, sqlDialect: dialect });
      void copyText(f.text).then(
        () => notify.success('Copied'),
        (e) => notify.error(toToolError(e)),
      );
    } catch (e) {
      notify.error(toToolError(e));
    }
  };
  const download = () => {
    try {
      const f = exportRows(rows, format, { name, sqlDialect: dialect });
      saveBlob(
        new TextEncoder().encode(f.text),
        `${name}.${f.extension}`,
        f.mime,
      );
    } catch (e) {
      notify.error(toToolError(e));
    }
  };
  const open = (tool: string, mime: string, fmt: MockExportFormat) =>
    sendTo(navigate, tool, {
      kind: 'text',
      mime,
      text: exportRows(rows, fmt, { name }).text,
      sourceTool: TOOL_ID,
      filename: `${name}.${fmt}`,
    });
  const openCsv = () => open('csv-viewer', 'text/csv', 'csv');
  const openJson = () =>
    open('json-and-xml-viewer', 'application/json', 'json');

  useSendCommands(TOOL_ID, [
    { target: 'csv-viewer', run: openCsv },
    { target: 'json-and-xml-viewer', run: openJson },
  ]);

  return (
    <Stack gap="3">
      <Inline gap="3" align="end" wrap>
        {names.length > 1 && (
          <Select
            size="sm"
            label="Output table"
            value={name}
            onChange={setPick}
            options={names.map((n) => ({ value: n, label: n }))}
          />
        )}
        <Select
          size="sm"
          label="Format"
          value={format}
          onChange={(v) => setFormat(v as MockExportFormat)}
          options={MOCK_EXPORT_FORMATS.map((f) => ({
            value: f,
            label: MOCK_EXPORT_LABEL[f],
          }))}
        />
        {format === 'sql' && (
          <Select
            size="sm"
            label="Dialect"
            value={dialect}
            onChange={(v) => setDialect(v as SqlDialect)}
            options={[
              { value: 'postgres', label: 'PostgreSQL' },
              { value: 'mysql', label: 'MySQL' },
              { value: 'sqlite', label: 'SQLite' },
              { value: 'mssql', label: 'SQL Server' },
            ]}
          />
        )}
        <Button size="sm" variant="soft" icon={copyIcon} onClick={copy}>
          Copy
        </Button>
        <Button size="sm" variant="soft" icon={downloadIcon} onClick={download}>
          Download
        </Button>
        <Menu
          label="Open in"
          items={[
            { value: 'csv', label: 'Open in CSV Viewer' },
            { value: 'json', label: 'Open in JSON Viewer' },
          ]}
          onSelect={(v) => (v === 'csv' ? openCsv() : openJson())}
          trigger={(props) => (
            <Button {...props} size="sm" variant="ghost" icon={send}>
              Open in
            </Button>
          )}
        />
      </Inline>
      <Inline gap="3" align="center" justify="between" wrap>
        <SegmentedControl
          label="Preview as"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: 'Table' },
            { value: 'json', label: 'JSON' },
          ]}
        />
        <Text size="sm" tone="muted" numeric>
          {`${rows.length.toLocaleString('en-US')} rows${rows.length > PREVIEW ? ', preview shows the first 1,000' : ''}`}
        </Text>
      </Inline>
      {view === 'table' ? (
        <DataGrid<GridRow>
          label="Generated data"
          rows={gridRows}
          columns={columns}
          getRowId={(r) => String(r.i)}
          selectionMode="range"
        />
      ) : (
        <CodeSurface
          label="Generated JSON"
          value={json}
          language="json"
          readOnly
          maxHeight={520}
        />
      )}
    </Stack>
  );
}
