import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClipboard } from '@/shared/lib/clipboard';
import {
  inferMockSchema,
  MOCK_SCHEMA_MIME,
  toCsv,
} from '@/shared/lib/data-formats';
import { sendTo, useHandoffFiles } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  Alert,
  AlertDescription,
  Badge,
  ErrorState,
  Heading,
  Inline,
  SendToMenu,
  IconButton,
  ToolActions,
  Stack,
  SwitchField,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type GridFilters,
  type SortKey,
} from '@/shared/ui';
import {
  IconBarChart3,
  IconRefreshCw,
  IconSparkles,
  IconTable,
  IconTrendingUp,
} from '@/shared/ui/icons';
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
export default function CsvViewer() {
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
  const generateMore = () =>
    sendTo(navigate, 'random-data-generator', {
      kind: 'text',
      mime: MOCK_SCHEMA_MIME,
      text: JSON.stringify(inferMockSchema(projected().slice(0, 1000))),
      sourceTool: TOOL_ID,
    });

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

  return (
    <Stack gap="4">
      <ToolActions>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => {
            csv.clear();
            setPaste('');
            lastPaste.current = '';
          }}
          label="New data"
          showLabel="desktop"
          icon={IconRefreshCw}
        />
        <IconButton
          size="sm"
          variant="ghost"
          label="Generate more like this"
          icon={IconSparkles}
          onClick={generateMore}
        />
        <ExportMenu
          table={() => ({ columns: visibleColumns, rows: viewRows })}
          filteredRows={filtered}
          sourceName={loaded.name}
          settings={settings}
          onSettings={updateSettings}
        />
      </ToolActions>
      <Inline justify="between" align="center" wrap gap="3">
        <Inline align="center" gap="2" wrap>
          <Heading level={2} size="lg">
            {loaded.name}
          </Heading>
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
            <Badge variant="soft" tone="warning" size="sm">
              Modified
            </Badge>
          )}
        </Inline>
        <Inline align="center" gap="2" wrap>
          <SendToMenu
            sourceTool={TOOL_ID}
            label="Send JSON to"
            size="sm"
            payload={() => jsonPayload(projected(), loaded.name)}
          />
          <SendToMenu
            sourceTool={TOOL_ID}
            label="Send CSV to"
            size="sm"
            payload={() =>
              csvTextPayload(viewRows, visibleColumns, loaded.name)
            }
          />
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
        </Inline>
      </Inline>

      {loaded.warnings.length > 0 && (
        <WarningsAlert warnings={loaded.warnings} />
      )}
      {csv.job.error && (
        <ErrorState title="Could not read the data" error={csv.job.error} />
      )}
      {csv.editError && (
        <Alert status="danger" size="sm">
          <AlertDescription>{csv.editError.message}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        variant="line"
      >
        <TabsList aria-label="Views">
          <TabsTrigger value="table">
            <Inline gap="2" align="center" wrap={false}>
              <IconTable size="sm" />
              <span>Table</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="profile">
            <Inline gap="2" align="center" wrap={false}>
              <IconBarChart3 size="sm" />
              <span>Profile</span>
            </Inline>
          </TabsTrigger>
          <TabsTrigger value="chart">
            <Inline gap="2" align="center" wrap={false}>
              <IconTrendingUp size="sm" />
              <span>Chart</span>
            </Inline>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Stack gap="3" className="pt-4">
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
              trailing={
                <SwitchField
                  label="Compact rows"
                  checked={settings.density === 'compact'}
                  onCheckedChange={(c) =>
                    updateSettings({ density: c ? 'compact' : 'comfortable' })
                  }
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
              onCellEdit={(row, col, value) =>
                csv.apply({ kind: 'set-cell', row, col, value })
              }
              onSelectedRowsChange={setSelectedRows}
            />
          </Stack>
        </TabsContent>
        <TabsContent value="profile">
          <div className="pt-4">
            {tab === 'profile' && (
              <ProfilePanel
                rows={viewRows}
                columns={visibleColumns}
                types={types}
              />
            )}
          </div>
        </TabsContent>
        <TabsContent value="chart">
          <div className="pt-4">
            {tab === 'chart' && (
              <ChartPanel
                rows={viewRows}
                columns={visibleColumns}
                types={types}
                name={loaded.name}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Stack>
  );
}
