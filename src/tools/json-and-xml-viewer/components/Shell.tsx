import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MOCK_SCHEMA_MIME,
  inferMockSchema,
  toCsv,
} from '@/shared/lib/data-formats';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import type { HandoffPayload } from '@/shared/lib/handoff';
import { IconBraces, IconLocate } from '@/shared/ui/icons';
import {
  Alert,
  Button,
  EmptyState,
  Inline,
  LoadingState,
  PaneTabs,
  SegmentedControl,
  SendToMenu,
  Stack,
  Text,
  TextInputPanel,
  type CodeMarker,
  type CodeSurfaceHandle,
} from '@/shared/ui';
import { useParsedDocument } from '../hooks/useParsedDocument';
import {
  TAB_LABEL,
  TAB_ORDER,
  useViewerCommands,
} from '../hooks/useViewerCommands';
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

const FORMATS: { value: DocFormat; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
];

/**
 * The JSON & XML Viewer (spec §7): the Source editor and the Tree, Map,
 * Query and Convert views as tabs, one pane at a time (ruling R41).
 */
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
  const docName = deriveFilename(fileName, '', EXTENSION[format]);

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
    saveBlob(new Blob([text], { type: MIME[format] }), docName);

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
          filename: docName,
        }
      : null;
  const csvPayload = (): HandoffPayload | null =>
    isTabular(value)
      ? {
          kind: 'text',
          mime: 'text/csv',
          text: toCsv(tabular(value)),
          sourceTool: TOOL_ID,
          filename: deriveFilename(fileName, '', 'csv'),
        }
      : null;
  const schemaPayload = (): HandoffPayload | null =>
    doc && !xml
      ? {
          kind: 'text',
          mime: MOCK_SCHEMA_MIME,
          text: JSON.stringify(inferMockSchema(value), null, 2),
          sourceTool: TOOL_ID,
          filename: deriveFilename(fileName, 'schema', 'json'),
        }
      : null;

  const toolbar = (
    <Inline justify="between" gap="2" wrap>
      <SegmentedControl<DocFormat>
        label="Format"
        size="sm"
        value={format}
        onChange={setManual}
        options={FORMATS}
      />
      <Inline gap="2" wrap>
        <Button
          size="sm"
          variant="secondary"
          disabled={!doc}
          onClick={download}
        >
          Download
        </Button>
        <SendToMenu size="sm" sourceTool={TOOL_ID} payload={docPayload} />
        {doc && isTabular(value) ? (
          <SendToMenu
            size="sm"
            label="Send as CSV"
            sourceTool={TOOL_ID}
            payload={csvPayload}
          />
        ) : null}
        {doc && !xml ? (
          <SendToMenu
            size="sm"
            label="Send schema"
            sourceTool={TOOL_ID}
            payload={schemaPayload}
          />
        ) : null}
      </Inline>
    </Inline>
  );

  const sourcePane = (
    <Stack gap="2" className="min-w-0">
      {error ? (
        <Alert status="danger" size="sm" data-testid="parse-error">
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
        label="Document"
        language={format}
        value={text}
        onChange={setText}
        accept={ACCEPT}
        samples={SAMPLES}
        downloadName={docName}
        handoff={(p) => p.kind === 'text' && MIMES.includes(p.mime)}
        maxBytes={MAX_BYTES}
        markers={markers}
        wrap={settings.wrap}
        minHeight={420}
        maxHeight={640}
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

  // Until a document parses, every view says why it is empty.
  const empty = parsed.parsing ? (
    <LoadingState label="Parsing" />
  ) : (
    <EmptyState
      icon={IconBraces}
      title={error ? 'Fix the error to see this view' : 'No document yet'}
      description={
        error
          ? 'The Source tab marks where parsing stopped.'
          : 'Paste, open or drop JSON, XML or YAML in the Source tab, or load a sample.'
      }
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => update({ tab: 'source' })}
        >
          Go to Source
        </Button>
      }
    />
  );
  const view = (content: React.ReactNode) => (
    <div className="flex h-160 min-h-0 flex-col">{doc ? content : empty}</div>
  );

  const views: Record<Exclude<ViewerTab, 'source'>, React.ReactNode> = {
    tree: (
      <TreeTab
        doc={doc!}
        selectedId={selectedId}
        onSelect={select}
        search={search}
        onSearchChange={setSearch}
        result={result}
        searchRef={searchRef}
        expanded={expanded}
        onExpandedChange={setExpanded}
      />
    ),
    map: (
      <MapTab
        doc={doc!}
        selectedId={selectedId}
        onSelect={select}
        matches={result.ids}
        fileBase={fileBase}
      />
    ),
    query: <QueryTab value={value} xml={xml} onSelect={select} />,
    convert: (
      <ConvertTab
        value={value}
        xml={xml}
        text={text}
        fileBase={fileBase}
        sourceTool={TOOL_ID}
      />
    ),
  };

  return (
    <Stack gap="3" className="min-w-0">
      {toolbar}
      {doc ? <PathBar node={selected} value={value} xml={xml} /> : null}
      <PaneTabs
        id={TOOL_ID}
        label="Viewer panes"
        value={settings.tab}
        onValueChange={(t) => update({ tab: t as ViewerTab })}
        panes={TAB_ORDER.map((t) => ({
          id: t,
          label: TAB_LABEL[t],
          content: t === 'source' ? sourcePane : view(views[t]),
        }))}
      />
    </Stack>
  );
}
