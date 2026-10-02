import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { flattenObject, type SqlDialect } from '@/shared/lib/data-formats';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import {
  Button,
  DataGrid,
  Inline,
  Label,
  Select,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  TextInputPanel,
  type GridColumn,
} from '@/shared/ui';
import { IconDownload, IconSendTo } from '@/shared/ui/icons';
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
  const ids = { table: useId(), format: useId(), dialect: useId() };
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
  const columns = useMemo<GridColumn<Row>[]>(() => {
    const keys = new Set<string>();
    for (const r of preview) for (const k of Object.keys(r)) keys.add(k);
    return [...keys].map((k) => ({
      id: k,
      header: k,
      accessor: (r: Row) => {
        const v = r[k];
        return typeof v === 'string' && v.startsWith('data:image/')
          ? `${v.slice(0, 40)}...`
          : v;
      },
    }));
  }, [preview]);
  const json = useMemo(
    () => JSON.stringify(rows.slice(0, PREVIEW), null, 2),
    [rows],
  );

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
      <Inline gap="3" align="center" wrap>
        {names.length > 1 && (
          <Inline gap="2" align="center" wrap={false}>
            <Label htmlFor={ids.table}>Output table</Label>
            <Select
              id={ids.table}
              value={name}
              onValueChange={setPick}
              items={names.map((n) => ({ value: n, label: n }))}
            />
          </Inline>
        )}
        <Text size="sm" tone="subtle">
          {`${rows.length.toLocaleString('en-US')} rows${rows.length > PREVIEW ? ', preview shows the first 1,000' : ''}`}
        </Text>
      </Inline>
      <Inline gap="2" align="center" wrap>
        <Label htmlFor={ids.format}>Format</Label>
        <Select
          id={ids.format}
          value={format}
          onValueChange={(v) => setFormat(v as MockExportFormat)}
          items={MOCK_EXPORT_FORMATS.map((f) => ({
            value: f,
            label: MOCK_EXPORT_LABEL[f],
          }))}
        />
        {format === 'sql' && (
          <>
            <Label htmlFor={ids.dialect}>Dialect</Label>
            <Select
              id={ids.dialect}
              value={dialect}
              onValueChange={(v) => setDialect(v as SqlDialect)}
              items={[
                { value: 'postgres', label: 'PostgreSQL' },
                { value: 'mysql', label: 'MySQL' },
                { value: 'sqlite', label: 'SQLite' },
                { value: 'mssql', label: 'SQL Server' },
              ]}
            />
          </>
        )}
        <Button
          size="sm"
          leftIcon={<IconDownload size="sm" />}
          onClick={download}
        >
          Download
        </Button>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<IconSendTo size="sm" />}
          onClick={openCsv}
        >
          Open in CSV Viewer
        </Button>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<IconSendTo size="sm" />}
          onClick={openJson}
        >
          Open in JSON Viewer
        </Button>
      </Inline>
      <Tabs value={view} onValueChange={setView} variant="line">
        <TabsList aria-label="Preview">
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <div className="pt-3">
            <DataGrid<Row>
              rows={preview}
              columns={columns}
              rowKey={(_, i) => i}
              ariaLabel="Generated data"
              height="min(60vh, 520px)"
            />
          </div>
        </TabsContent>
        <TabsContent value="json">
          <div className="pt-3">
            <TextInputPanel
              label="Generated JSON"
              value={json}
              onChange={() => {}}
              language="json"
              readOnly
              downloadName={`${name}.json`}
              maxHeight={520}
            />
          </div>
        </TabsContent>
      </Tabs>
    </Stack>
  );
}
