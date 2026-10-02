import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MOCK_SCHEMA_MIME,
  inferMockSchema,
  toCsv,
} from '@/shared/lib/data-formats';
import { saveBlob } from '@/shared/lib/download';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { IconLocate } from '@/shared/ui/icons';
import {
  Alert,
  Button,
  Inline,
  SegmentedControl,
  SendToMenu,
  SplitPane,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  TextInputPanel,
  type CodeMarker,
  type CodeSurfaceHandle,
} from '@/shared/ui';
import { useParsedDocument } from '../hooks/useParsedDocument';
import { useViewerCommands } from '../hooks/useViewerCommands';
import { isTabular, tabular } from '../lib/convert';
import { detectFormat, type DocFormat } from '../lib/detect-format';
import { findById, nodeAtOffset } from '../lib/doc-model';
import { EXTENSION, MIME, offsetOf } from '../lib/format-doc';
import { SAMPLES } from '../lib/samples';
import { searchDoc } from '../lib/search';
import { allExpandable, expandToDepth, withAncestors } from '../lib/to-tree';
import { viewerSettings, type ViewerTab } from '../settings';
import { ConvertTab } from './ConvertTab';
import { MapTab } from './MapTab';
import { PathBar } from './PathBar';
import { QueryTab } from './QueryTab';
import { TreeTab, type TreeSearchState } from './TreeTab';

const TOOL_ID = 'json-and-xml-viewer';
const ACCEPT = '.json,.xml,.yaml,.yml,.geojson,.svg';
const MIMES = [
  'application/json',
  'application/xml',
  'text/xml',
  'application/yaml',
];
const MAX_BYTES = 50 * 1024 * 1024;
const CARET_SYNC_MS = 200;

const TABS: { value: ViewerTab; label: string }[] = [
  { value: 'tree', label: 'Tree' },
  { value: 'map', label: 'Map' },
  { value: 'query', label: 'Query' },
  { value: 'convert', label: 'Convert' },
];

const FORMATS: { value: DocFormat; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
];

/** The JSON & XML Viewer (spec §7): editor on the left, views on the right. */
export function Shell() {
  const [settings, update] = viewerSettings.useSettings();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('data');
  const [manual, setManual] = useState<DocFormat | null>(null);
  const format =
    manual ?? detectFormat(text, fileName.includes('.') ? fileName : undefined);
  const parsed = useParsedDocument(text, format);
  const { doc, value, xml, error } = parsed;
  const fileBase = fileName.replace(/\.[^.]+$/, '') || 'data';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = doc && selectedId ? findById(doc, selectedId) : null;
  const [search, setSearch] = useState<TreeSearchState>({
    term: '',
    regex: false,
    active: 0,
  });
  const result = useMemo(
    () => searchDoc(doc, search.term, { regex: search.regex }),
    [doc, search.term, search.regex],
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [seenDoc, setSeenDoc] = useState(doc);
  if (seenDoc !== doc) {
    setSeenDoc(doc);
    // A re-parse keeps open branches that still exist; a new document opens two levels.
    setExpanded(
      doc
        ? seenDoc
          ? new Set([...expanded].filter((id) => findById(doc, id)))
          : expandToDepth(doc, 2)
        : new Set(),
    );
    if (doc && selectedId && !findById(doc, selectedId)) setSelectedId(null);
  }

  // Source sync: a selection made in a view selects its source range; the
  // caret in the editor selects the deepest node under it.
  const editor = useRef<CodeSurfaceHandle>(null);
  const fromEditor = useRef(false);
  const select = (id: string | null) => {
    fromEditor.current = false;
    setSelectedId(id);
    if (doc && id) setExpanded((e) => withAncestors(doc, e, [id]));
  };
  useEffect(() => {
    if (fromEditor.current || !selected?.range) return;
    const [start, end] = selected.range;
    editor.current?.setSelection(start, end);
  }, [selected]);
  const caretTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(caretTimer.current), []);
  const onCaret = (start: number) => {
    clearTimeout(caretTimer.current);
    caretTimer.current = setTimeout(() => {
      const hit = doc ? nodeAtOffset(doc, start) : null;
      if (!hit || hit.id === selectedId) return;
      fromEditor.current = true;
      setSelectedId(hit.id);
    }, CARET_SYNC_MS);
  };

  const markers = useMemo<CodeMarker[]>(() => {
    const out: CodeMarker[] = parsed.warnings.map((w) => ({
      line: w.line,
      column: w.column,
      message: w.message,
      severity: 'warning',
    }));
    if (error?.line)
      out.push({
        line: error.line,
        column: error.column,
        message: error.message,
        severity: 'error',
      });
    return out;
  }, [parsed.warnings, error]);

  const jumpToError = () => {
    if (!error?.line) return;
    const at = offsetOf(text, error.line, error.column);
    editor.current?.focus();
    editor.current?.setSelection(at, at);
  };

  const download = () =>
    saveBlob(
      new Blob([text], { type: MIME[format] }),
      `${fileBase}.${EXTENSION[format]}`,
    );

  const searchRef = useRef<HTMLInputElement>(null);
  useViewerCommands({
    format,
    parsed,
    text,
    setText,
    selected,
    tab: settings.tab,
    setTab: (tab) => update({ tab }),
    expandAll: () => doc && setExpanded(allExpandable(doc)),
    collapseAll: () => setExpanded(new Set()),
    focusSearch: () => {
      update({ tab: 'tree' });
      setTimeout(() => searchRef.current?.focus(), 0);
    },
    download,
    indent: settings.indent,
  });

  const docPayload = (): HandoffPayload | null =>
    doc
      ? {
          kind: 'text',
          mime: MIME[format],
          text,
          sourceTool: TOOL_ID,
          filename: `${fileBase}.${EXTENSION[format]}`,
        }
      : null;
  const csvPayload = (): HandoffPayload | null =>
    isTabular(value)
      ? {
          kind: 'text',
          mime: 'text/csv',
          text: toCsv(tabular(value)),
          sourceTool: TOOL_ID,
          filename: `${fileBase}.csv`,
        }
      : null;
  const schemaPayload = (): HandoffPayload | null =>
    doc && !xml
      ? {
          kind: 'text',
          mime: MOCK_SCHEMA_MIME,
          text: JSON.stringify(inferMockSchema(value), null, 2),
          sourceTool: TOOL_ID,
          filename: `${fileBase}.schema.json`,
        }
      : null;

  const editorPane = (
    <Stack gap="2" className="h-full min-h-0 min-w-0">
      <Inline justify="between" wrap>
        <SegmentedControl<DocFormat>
          label="Format"
          size="sm"
          value={format}
          onChange={setManual}
          options={FORMATS}
        />
        <Inline gap="2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!doc}
            onClick={download}
          >
            Download
          </Button>
          <SendToMenu size="sm" sourceTool={TOOL_ID} payload={docPayload} />
        </Inline>
      </Inline>
      {error ? (
        <Alert
          status="danger"
          className="p-3 text-sm"
          data-testid="parse-error"
        >
          <Inline justify="between" gap="2" wrap>
            <Text size="sm">{error.message}</Text>
            {error.line ? (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconLocate size="sm" />}
                onClick={jumpToError}
              >
                Jump to error
              </Button>
            ) : null}
          </Inline>
        </Alert>
      ) : null}
      <TextInputPanel
        className="min-h-0 flex-1"
        label="Document"
        language={format}
        value={text}
        onChange={setText}
        accept={ACCEPT}
        samples={SAMPLES}
        downloadName={`${fileBase}.${EXTENSION[format]}`}
        handoff={(p) => p.kind === 'text' && MIMES.includes(p.mime)}
        maxBytes={MAX_BYTES}
        markers={markers}
        wrap={settings.wrap}
        minHeight={420}
        maxHeight="none"
        editorRef={editor}
        onSelectionChange={onCaret}
        onFile={(f) => {
          setFileName(f.name);
          setManual(null);
        }}
        extraMeta={parsed.parsing ? ['Parsing'] : doc ? ['Parsed'] : undefined}
      />
    </Stack>
  );

  const views = doc ? (
    <Tabs
      value={settings.tab}
      onValueChange={(t) => update({ tab: t as ViewerTab })}
      className="flex h-full min-h-0 min-w-0 flex-col gap-2"
    >
      <Inline justify="between" wrap>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Inline gap="2">
          {isTabular(value) ? (
            <SendToMenu
              size="sm"
              label="Send as CSV"
              sourceTool={TOOL_ID}
              payload={csvPayload}
            />
          ) : null}
          {!xml ? (
            <SendToMenu
              size="sm"
              label="Send schema"
              sourceTool={TOOL_ID}
              payload={schemaPayload}
            />
          ) : null}
        </Inline>
      </Inline>
      <PathBar node={selected} value={value} xml={xml} />
      <TabsContent value="tree" className="min-h-0 flex-1">
        <TreeTab
          doc={doc}
          selectedId={selectedId}
          onSelect={select}
          search={search}
          onSearchChange={setSearch}
          result={result}
          searchRef={searchRef}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </TabsContent>
      <TabsContent value="map" className="min-h-0 flex-1">
        <MapTab
          doc={doc}
          selectedId={selectedId}
          onSelect={select}
          matches={result.ids}
          fileBase={fileBase}
        />
      </TabsContent>
      <TabsContent value="query" className="min-h-0 flex-1">
        <QueryTab value={value} xml={xml} onSelect={select} />
      </TabsContent>
      <TabsContent value="convert" className="min-h-0 flex-1">
        <ConvertTab
          value={value}
          xml={xml}
          text={text}
          fileBase={fileBase}
          sourceTool={TOOL_ID}
        />
      </TabsContent>
    </Tabs>
  ) : (
    <Stack
      gap="2"
      className="h-full items-center justify-center p-6 text-center"
    >
      <Text tone="muted">
        {parsed.parsing
          ? 'Parsing'
          : error
            ? 'Fix the error to see the tree'
            : 'Paste, open or drop JSON, XML or YAML, or load a sample'}
      </Text>
    </Stack>
  );

  return (
    <SplitPane
      direction="horizontal"
      persistKey="json-xml"
      defaultRatio={0.45}
      separatorLabel="Resize editor and views"
      className="h-[calc(100dvh-11rem)] min-h-[36rem]"
    >
      {editorPane}
      {views}
    </SplitPane>
  );
}
