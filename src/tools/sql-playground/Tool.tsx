import {
  Button,
  Card,
  Inline,
  Kbd,
  Notice,
  SplitPane,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { play, stop } from '@arshad-shah/cynosure/icons';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PANES_STACK_BELOW } from '@/app/ui/transform';
import { CodeEditor, type EditorDiagnostic } from '@/shared/editor';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import {
  sendTo,
  useHandoff,
  useHandoffFiles,
  type HandoffPayload,
} from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { DatabasePanel } from './components/DatabasePanel';
import { ResultsPanel, type ResultAction } from './components/ResultsPanel';
import { useSqlDatabase } from './hooks/useSqlDatabase';
import type { SchemaTable, StatementResult } from './lib/engine';
import { quoteIdent } from './lib/names';
import { resultToCsv, resultToJson } from './lib/results';
import { SAMPLE_QUERY, SAMPLE_TABLES, STARTER_QUERY } from './lib/samples';

const TOOL_ID = 'sql-playground';
const isCsvText = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'text/csv';

/**
 * SQL Playground: SQLite (sql.js, in a worker) over CSV, TSV and JSON files
 * or an SQLite database, with a schema list, an SQL editor and results.
 */
export default function SqlPlayground() {
  const navigate = useNavigate();
  const { copy } = useClipboard();
  const db = useSqlDatabase();
  const [sql, setSql] = useState(STARTER_QUERY);
  const [selection, setSelection] = useState<[number, number]>([0, 0]);
  const { load, run } = db;
  const running = run.status === 'running';

  const loadFiles = (files: File[]) =>
    void load.run(files.map((file) => ({ kind: 'file' as const, file })));

  // Files dropped on a hub, and CSV text sent from another tool.
  useHandoffFiles(loadFiles);
  const handed = useHandoff(isCsvText);
  const delivered = useRef<HandoffPayload | null>(null);
  const deliver = useEffectEvent((p: HandoffPayload) => {
    if (p.kind !== 'text') return;
    void load.run([
      {
        kind: 'text',
        name: p.filename ?? 'data.csv',
        text: p.text,
        format: 'csv',
      },
    ]);
  });
  useEffect(() => {
    if (!handed || delivered.current === handed) return;
    delivered.current = handed;
    deliver(handed);
  }, [handed]);

  const [start, end] = selection;
  const selected = end > start ? sql.slice(start, end) : '';
  const runSql = (text = selected || sql) => {
    if (!text.trim() || running) return;
    void run.run(text);
  };
  // Error lines count from the start of what ran (the selection or all).
  const [ranFrom, setRanFrom] = useState(0);
  const execute = (text?: string) => {
    setRanFrom(
      !text && selected ? sql.slice(0, start).split('\n').length - 1 : 0,
    );
    runSql(text);
  };

  const queryTable = (t: SchemaTable) => {
    const q = `SELECT * FROM ${quoteIdent(t.name)} LIMIT 1000;`;
    setSql(q);
    setSelection([0, 0]);
    setRanFrom(0);
    runSql(q);
  };

  const loadSample = async () => {
    await load.run(SAMPLE_TABLES.map((t) => ({ kind: 'text' as const, ...t })));
    setSql(SAMPLE_QUERY);
    setSelection([0, 0]);
    setRanFrom(0);
    void run.run(SAMPLE_QUERY);
  };

  const downloadDb = async () => {
    try {
      const bytes = await db.exportDb();
      saveBlob(bytes, 'database.sqlite', 'application/vnd.sqlite3');
    } catch (e) {
      notify.error(toToolError(e, 'Could not export the database'));
    }
  };

  const newDb = async () => {
    try {
      await db.reset();
      notify.success('Started a new, empty database');
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  const onMenu = (action: 'sample' | 'new' | 'download') => {
    if (action === 'sample') void loadSample();
    else if (action === 'new') void newDb();
    else void downloadDb();
  };

  const sendCsv = (r: StatementResult) =>
    sendTo(navigate, 'csv-viewer', {
      kind: 'text',
      mime: 'text/csv',
      text: resultToCsv(r),
      sourceTool: TOOL_ID,
      filename: 'query-result.csv',
    });

  const onAction = (action: ResultAction, r: StatementResult) => {
    try {
      if (action === 'csv')
        saveBlob(
          new TextEncoder().encode(resultToCsv(r)),
          'query-result.csv',
          'text/csv',
        );
      else if (action === 'json')
        saveBlob(
          new TextEncoder().encode(resultToJson(r)),
          'query-result.json',
          'application/json',
        );
      else if (action === 'copy') void copy(resultToCsv(r));
      else sendCsv(r);
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  const outcome = run.result;
  const lastRows = outcome?.results.filter((r) => r.columns.length).at(-1);

  useSendCommands(TOOL_ID, [
    {
      target: 'csv-viewer',
      run: () => lastRows && sendCsv(lastRows),
      enabled: Boolean(lastRows),
    },
  ]);
  useToolCommands(TOOL_ID, [
    {
      id: 'run',
      label: 'Run SQL',
      shortcut: 'Mod+Enter',
      run: () => execute(),
      enabled: !running && Boolean(sql.trim()),
    },
    { id: 'stop', label: 'Stop the query', run: run.cancel, enabled: running },
    { id: 'sample', label: 'Load sample tables', run: () => void loadSample() },
    { id: 'new', label: 'New empty database', run: () => void newDb() },
    {
      id: 'download',
      label: 'Download database',
      run: () => void downloadDb(),
      enabled: db.tables.length > 0,
    },
  ]);

  const diagnostics: EditorDiagnostic[] = outcome?.error
    ? [
        {
          line: outcome.error.line + ranFrom,
          message: outcome.error.message,
          severity: 'error',
        },
      ]
    : [];

  const query = (
    <Stack gap="4">
      <Card as="section" title="Query" headingLevel={2} padding="sm">
        <Stack gap="3">
          <CodeEditor
            aria-label="SQL"
            language="sql"
            value={sql}
            onChange={setSql}
            onSelectionChange={(a, b) => setSelection([a, b])}
            diagnostics={diagnostics}
            minHeight={160}
            maxHeight={360}
          />
          <Inline gap="3" align="center" wrap>
            {running ? (
              <Button
                variant="soft"
                tone="danger"
                icon={stop}
                onClick={run.cancel}
              >
                Stop
              </Button>
            ) : (
              <Button
                variant="solid"
                icon={play}
                onClick={() => execute()}
                disabled={!sql.trim()}
              >
                {selected ? 'Run selection' : 'Run'}
              </Button>
            )}
            <Inline gap="1" align="center">
              <Kbd keys="mod+enter" size="sm" />
              <Text size="sm" tone="muted">
                {running ? 'Running' : 'runs the query or the selection'}
              </Text>
            </Inline>
          </Inline>
          {run.status === 'cancelled' ? (
            <Notice tone="warning" title="Query stopped">
              {db.rebuildError
                ? `The database could not be rebuilt: ${db.rebuildError.message}`
                : 'The SQL engine was restarted and the database rebuilt from the files you loaded and the statements that changed it.'}
            </Notice>
          ) : null}
          {run.error ? (
            <Notice tone="danger" title="Could not run the query">
              {run.error.message}
            </Notice>
          ) : null}
        </Stack>
      </Card>
      {outcome ? (
        <Card as="section" title="Results" headingLevel={2} padding="sm">
          <ResultsPanel outcome={outcome} onAction={onAction} canSend />
        </Card>
      ) : null}
    </Stack>
  );

  return (
    <SplitPane
      label="Resize the database and query panes"
      defaultSize={30}
      min={20}
      max={50}
      stackBelow={PANES_STACK_BELOW}
      start={
        <Stack paddingInline="3">
          <DatabasePanel
            db={db}
            onFiles={loadFiles}
            onQuery={queryTable}
            onMenu={onMenu}
          />
        </Stack>
      }
      end={<Stack paddingInline="3">{query}</Stack>}
    />
  );
}
