import {
  Badge,
  Button,
  Card,
  Inline,
  Menu,
  Notice,
  SegmentedControl,
  Stack,
  type MenuSection,
} from '@arshad-shah/cynosure';
import {
  chartBar,
  chartLine,
  refreshCw,
  send,
  table as tableIcon,
} from '@arshad-shah/cynosure/icons';
import { useMediaQuery } from '@/shared/lib/media-query';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toolsAccepting } from '@/app/registry';
import { useClipboard } from '@/shared/lib/clipboard';
import {
  inferMockSchema,
  MOCK_SCHEMA_MIME,
  toCsv,
} from '@/shared/lib/data-formats';
import {
  sendTo,
  useHandoffFiles,
  type HandoffPayload,
} from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import type { GridFilters, SortKey } from '@/shared/lib/grid';
import { ChartPanel } from './components/ChartPanel';
import { EditToolbar } from './components/EditToolbar';
import { ExportMenu } from './components/ExportMenu';
import { GridView } from './components/GridView';
import { InputScreen } from './components/InputScreen';
import { ParseOptions } from './components/ParseOptions';
import { DELIMITER_LABEL } from './lib/parse';
import { ProfilePanel } from './components/ProfilePanel';
import { WarningsAlert } from './components/WarningsAlert';
import { useCsvTable } from './hooks/useCsvTable';
import { inferColumnTypes } from './lib/columns';
import { isTextEncodingChoice } from './lib/decode';
import type { Row } from './lib/edit';
import { SAMPLES } from './lib/samples';
import { csvTextPayload, jsonPayload } from './lib/send';
import { tableView } from './lib/view';
import { csvSettings } from './settings';

const TOOL_ID = 'csv-viewer';

/**
 * CSV Viewer (redesign spec, workspace): paste or open data, then the table,
 * a profile of each column or a chart of the shown rows.
 */
export default function CsvViewer() {
  const narrow = useMediaQuery('(max-width: 44.99rem)');
  const navigate = useNavigate();
  const { copy } = useClipboard();
  const [settings, updateSettings] = csvSettings.useSettings();
  const csv = useCsvTable({
    delimiter: settings.delimiterChoice,
    encoding: isTextEncodingChoice(settings.encoding)
      ? settings.encoding
      : 'auto',
  });
  const [paste, setPaste] = useState('');
  const lastPaste = useRef('');
  const [tab, setTab] = useState<'table' | 'profile' | 'chart'>('table');
  const [filters, setFilters] = useState<GridFilters>({});
  const [sort, setSort] = useState<SortKey[]>([]);
  const [search, setSearch] = useState('');
  const [hidden, setHidden] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const resetView = () => {
    setFilters({});
    setSort([]);
    setSearch('');
    setHidden([]);
    setTab('table');
  };

  const loadText = (text: string) => {
    resetView();
    void csv.load({ kind: 'text', text, name: 'pasted' });
  };
  const loadFile = (file: File) => {
    resetView();
    void csv.load({ kind: 'file', file });
  };
  // A file dropped on a hub opens like a picked one (spec §5.3).
  useHandoffFiles((files) => loadFile(files[0]));

  const changePaste = (v: string) => {
    const before = lastPaste.current;
    lastPaste.current = v;
    setPaste(v);
    // A paste, sample, drop or hand-off (not a keystroke) opens the table.
    if (v.trim() && v.length - before.length > 1) loadText(v);
  };

  const { table, loaded } = csv;
  // Selection is by table row index: an edit renumbers rows, so drop it.
  const [seenTable, setSeenTable] = useState(table);
  if (seenTable !== table) {
    setSeenTable(table);
    setSelectedRows([]);
  }
  // Re-inferred after edits (cheap: 1,000 values per column), but kept
  // stable while unchanged so the grid keeps its column widths and order.
  const typesKey = JSON.stringify(
    table ? inferColumnTypes(table.rows, table.columns) : {},
  );
  const types = useMemo(
    () => JSON.parse(typesKey) as ReturnType<typeof inferColumnTypes>,
    [typesKey],
  );
  const view = useMemo(
    () =>
      table
        ? tableView(table, types, filters, sort, search)
        : { indices: [], errors: {} },
    [table, types, filters, sort, search],
  );
  const visibleColumns = useMemo(
    () => (table ? table.columns.filter((c) => !hidden.includes(c)) : []),
    [table, hidden],
  );
  const viewRows = useMemo(
    () => (table ? view.indices.map((i) => table.rows[i]) : []),
    [table, view.indices],
  );
  const filtered =
    table && view.indices.length < table.rows.length
      ? view.indices.length
      : null;
  const projected = (): Row[] =>
    viewRows.map((r) => {
      const o: Row = {};
      for (const c of visibleColumns) o[c] = r[c] ?? null;
      return o;
    });
  const schemaPayload = (): HandoffPayload => ({
    kind: 'text',
    mime: MOCK_SCHEMA_MIME,
    text: JSON.stringify(inferMockSchema(projected().slice(0, 1000))),
    sourceTool: TOOL_ID,
  });
  const generateMore = () =>
    sendTo(navigate, 'random-data-generator', schemaPayload());

  useSendCommands(TOOL_ID, [
    {
      target: 'random-data-generator',
      run: generateMore,
      enabled: Boolean(table && loaded),
    },
  ]);

  useToolCommands(TOOL_ID, [
    {
      id: 'undo',
      label: 'Undo edit',
      shortcut: 'Mod+Z',
      run: csv.undo,
      enabled: csv.canUndo,
    },
    {
      id: 'redo',
      label: 'Redo edit',
      shortcut: 'Mod+Shift+Z',
      run: csv.redo,
      enabled: csv.canRedo,
    },
    {
      id: 'copy',
      label: 'Copy shown rows as CSV',
      shortcut: 'Mod+Shift+C',
      run: () => void copy(toCsv(viewRows, { columns: visibleColumns })),
      enabled: table !== null,
    },
    {
      id: 'clear',
      label: 'New data',
      shortcut: 'Mod+Shift+X',
      run: () => {
        csv.clear();
        setPaste('');
        lastPaste.current = '';
      },
    },
    {
      id: 'sample',
      label: 'Load sample',
      run: () => changePaste(SAMPLES[0].value),
    },
  ]);

  if (!table || !loaded) {
    return (
      <InputScreen
        paste={paste}
        onPasteChange={changePaste}
        onOpenText={() => loadText(paste)}
        onFile={loadFile}
        job={csv.job}
      />
    );
  }

  const newData = () => {
    csv.clear();
    setPaste('');
    lastPaste.current = '';
  };

  // Send to: the shown rows as JSON or CSV, or a schema for more like it.
  const payloads: Record<string, () => HandoffPayload> = {
    json: () => jsonPayload(projected(), loaded.name),
    csv: () => csvTextPayload(viewRows, visibleColumns, loaded.name),
    schema: schemaPayload,
  };
  const targets = (mime: string) =>
    toolsAccepting(mime).filter((t) => t.id !== TOOL_ID);
  const sendSections: MenuSection[] = [
    {
      label: 'Rows as JSON',
      items: targets('application/json').map((t) => ({
        value: `json:${t.id}`,
        label: t.name,
      })),
    },
    {
      label: 'Rows as CSV',
      // csvTextPayload hands CSV over as plain text (Text Diff and others).
      items: targets('text/plain').map((t) => ({
        value: `csv:${t.id}`,
        label: t.name,
      })),
    },
    {
      label: 'More like this',
      items: targets(MOCK_SCHEMA_MIME).map((t) => ({
        value: `schema:${t.id}`,
        label: t.name,
      })),
    },
  ].filter((x) => x.items.length);

  // A Card header keeps its actions beside the title (Cynosure gap 45):
  // on phones they go in the body, where they wrap.
  const actions = (
    <Inline gap="2" wrap>
      <Button size="sm" variant="ghost" icon={refreshCw} onClick={newData}>
        New data
      </Button>
      <ParseOptions
        choices={csv.choices}
        onChange={(patch) => {
          if (patch.delimiter)
            updateSettings({ delimiterChoice: patch.delimiter });
          if (patch.encoding) updateSettings({ encoding: patch.encoding });
          resetView();
          csv.changeChoices(patch);
        }}
        detected={{
          delimiter: loaded.delimiter,
          encoding: loaded.encoding,
        }}
        fromFile={csv.source?.kind === 'file'}
        columns={loaded.columns}
        disabled={csv.job.status === 'running'}
      />
      {sendSections.length ? (
        <Menu
          label="Send to"
          items={sendSections}
          onSelect={(v) => {
            const [kind, id] = v.split(':');
            if (kind && id) sendTo(navigate, id, payloads[kind]());
          }}
          trigger={(props) => (
            <Button {...props} size="sm" variant="soft" icon={send}>
              Send to
            </Button>
          )}
        />
      ) : null}
      <ExportMenu
        table={() => ({ columns: visibleColumns, rows: viewRows })}
        filteredRows={filtered}
        sourceName={loaded.name}
        settings={settings}
        onSettings={updateSettings}
      />
    </Inline>
  );

  return (
    <Stack gap="5">
      <Card
        as="section"
        title={loaded.name}
        headingLevel={2}
        padding="sm"
        actions={narrow ? undefined : actions}
      >
        {narrow ? actions : null}
        <Inline align="center" gap="2" wrap>
          <Badge variant="soft" tone="accent" size="sm">
            {`${table.rows.length.toLocaleString('en-US')} rows`}
          </Badge>
          <Badge variant="soft" tone="accent" size="sm">
            {`${table.columns.length} columns`}
          </Badge>
          {csv.choices.delimiter === 'auto' && (
            <Badge variant="soft" tone="neutral" size="sm">
              {`Detected: ${DELIMITER_LABEL[loaded.delimiter]}`}
            </Badge>
          )}
          {csv.modified && (
            <Badge variant="soft" tone="warning" size="sm" dot>
              Modified
            </Badge>
          )}
        </Inline>
      </Card>

      {loaded.warnings.length > 0 && (
        <WarningsAlert warnings={loaded.warnings} />
      )}
      {csv.job.error && (
        <Notice tone="danger" title="Could not read the data">
          {csv.job.error.message}
        </Notice>
      )}
      {csv.editError && <Notice tone="danger">{csv.editError.message}</Notice>}

      <Inline>
        <SegmentedControl
          label="View"
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: 'table', label: 'Table', icon: tableIcon },
            { value: 'profile', label: 'Profile', icon: chartBar },
            { value: 'chart', label: 'Chart', icon: chartLine },
          ]}
        />
      </Inline>

      {tab === 'table' ? (
        <GridView
          toolbar={
            <EditToolbar
              columns={table.columns}
              canUndo={csv.canUndo}
              canRedo={csv.canRedo}
              onUndo={csv.undo}
              onRedo={csv.redo}
              onEdit={csv.apply}
              rowCount={table.rows.length}
              selectedRows={selectedRows}
            />
          }
          table={table}
          types={types}
          indices={view.indices}
          filters={filters}
          onFiltersChange={setFilters}
          filterErrors={view.errors}
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={setSearch}
          hidden={hidden}
          onHiddenChange={setHidden}
          compact={settings.density === 'compact'}
          onCompactChange={(c) =>
            updateSettings({ density: c ? 'compact' : 'comfortable' })
          }
          onRowEdit={(cells) => csv.apply({ kind: 'set-cells', cells })}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
        />
      ) : tab === 'profile' ? (
        <ProfilePanel rows={viewRows} columns={visibleColumns} types={types} />
      ) : (
        <ChartPanel
          rows={viewRows}
          columns={visibleColumns}
          types={types}
          name={loaded.name}
        />
      )}
    </Stack>
  );
}
