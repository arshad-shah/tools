import {
  Button,
  Card,
  EmptyState,
  FileDrop,
  Inline,
  Menu,
  Notice,
  SegmentedControl,
  SplitPane,
  Stack,
  StatusBar,
  StatusBarSegment,
  type MenuSection,
} from '@arshad-shah/cynosure';
import {
  braces as bracesIcon,
  download as downloadIcon,
  locate,
  send,
  sparkles,
} from '@arshad-shah/cynosure/icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toolsAccepting } from '@/app/registry';
import {
  MOCK_SCHEMA_MIME,
  inferMockSchema,
  toCsv,
} from '@/shared/lib/data-formats';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { readText } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { sendTo, useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import { useMediaQuery } from '@/shared/lib/media-query';

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
import {
  CodeEditor,
  type CodeEditorHandle,
  type EditorDiagnostic,
} from '@/shared/editor';

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

type View = Exclude<ViewerTab, 'source'>;
const isTextHandoff = (p: HandoffPayload) =>
  p.kind === 'text' && MIMES.includes(p.mime);

/**
 * The JSON & XML Viewer (redesign spec, workspace): the Source editor
 * beside the Tree, Map, Query and Convert views on wide screens; one pane at
 * a time on narrow ones (ruling R41).
 */
export function Shell() {
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 1200px)');
  // Only what the Shell reads: a Map or Query setting must not re-render
  // the whole viewer (long-task gate).
  const [settings, update] = viewerSettings.useSettings([
    'tab',
    'indent',
    'wrap',
  ]);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('data');
  const [fileError, setFileError] = useState<string | null>(null);
  const [manual, setManual] = useState<DocFormat | null>(null);
  const format =
    manual ?? detectFormat(text, fileName.includes('.') ? fileName : undefined);
  const parsed = useParsedDocument(text, format);
  const { doc, value, xml, error } = parsed;
  const fileBase = fileName.replace(/\.[^.]+$/, '') || 'data';
  const docName = deriveFilename(fileName, '', EXTENSION[format]);

  // A document handed over (Send to) fills the editor once.
  const handedOff = useHandoff(isTextHandoff);
  const [taken, setTaken] = useState<typeof handedOff>(null);
  if (handedOff !== taken) {
    setTaken(handedOff);
    if (handedOff?.kind === 'text') {
      setText(handedOff.text);
      if (handedOff.filename) setFileName(handedOff.filename);
      setManual(null);
    }
  }

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
  const editor = useRef<CodeEditorHandle>(null);
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

  const markers = useMemo<EditorDiagnostic[]>(() => {
    const out: EditorDiagnostic[] = parsed.warnings.map((w) => ({
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
    const go = () => {
      editor.current?.focus();
      editor.current?.setSelection(at, at);
    };
    if (wide || settings.tab === 'source') return go();
    update({ tab: 'source' });
    setTimeout(go, 0);
  };

  const download = () =>
    saveBlob(new Blob([text], { type: MIME[format] }), docName);

  const openFile = (file: File) => {
    setFileError(null);
    if (file.size > MAX_BYTES) {
      setFileError(`${file.name} is larger than ${formatBytes(MAX_BYTES)}`);
      return;
    }
    void readText(file).then(
      (t) => {
        setText(t);
        setFileName(file.name);
        setManual(null);
      },
      () => setFileError(`${file.name} could not be read as text`),
    );
  };

  // The shown view: Source is a pane of its own only on narrow screens.
  const view: View | 'source' =
    wide && settings.tab === 'source' ? 'tree' : settings.tab;
  const setTab = (tab: ViewerTab) => {
    update({ tab });
    if (tab === 'source' && wide) setTimeout(() => editor.current?.focus(), 0);
  };

  const searchRef = useRef<HTMLInputElement>(null);
  useViewerCommands({
    format,
    parsed,
    text,
    setText,
    selected,
    tab: settings.tab,
    setTab,
    expandAll: () => doc && setExpanded(allExpandable(doc)),
    collapseAll: () => setExpanded(new Set()),
    focusSearch: () => {
      update({ tab: 'tree' });
      setTimeout(() => searchRef.current?.focus(), 0);
    },
    download,
    indent: settings.indent,
  });

  // Send to: the document, its rows as CSV, or a mock-data schema.
  const payloads: { key: string; label: string; make(): HandoffPayload }[] = doc
    ? [
        {
          key: 'doc',
          label: 'Document',
          make: () => ({
            kind: 'text',
            mime: MIME[format],
            text,
            sourceTool: TOOL_ID,
            filename: docName,
          }),
        },
        ...(isTabular(value)
          ? [
              {
                key: 'csv',
                label: 'As CSV',
                make: (): HandoffPayload => ({
                  kind: 'text',
                  mime: 'text/csv',
                  text: toCsv(tabular(value)),
                  sourceTool: TOOL_ID,
                  filename: deriveFilename(fileName, '', 'csv'),
                }),
              },
            ]
          : []),
        ...(!xml
          ? [
              {
                key: 'schema',
                label: 'As a mock data schema',
                make: (): HandoffPayload => ({
                  kind: 'text',
                  mime: MOCK_SCHEMA_MIME,
                  text: JSON.stringify(inferMockSchema(value), null, 2),
                  sourceTool: TOOL_ID,
                  filename: deriveFilename(fileName, 'schema', 'json'),
                }),
              },
            ]
          : []),
      ]
    : [];
  const mimeOf = (key: string) =>
    key === 'doc'
      ? MIME[format]
      : key === 'csv'
        ? 'text/csv'
        : MOCK_SCHEMA_MIME;
  const sendSections: MenuSection[] = payloads
    .map((p) => ({
      label: p.label,
      items: toolsAccepting(mimeOf(p.key))
        .filter((t) => t.id !== TOOL_ID)
        .map((t) => ({ value: `${p.key}:${t.id}`, label: t.name })),
    }))
    .filter((s) => s.items.length);

  const sendMenu = sendSections.length ? (
    <Menu
      label="Send to"
      items={sendSections}
      onSelect={(v) => {
        const [key, toolId] = v.split(':');
        const p = payloads.find((x) => x.key === key);
        if (p && toolId) sendTo(navigate, toolId, p.make());
      }}
      trigger={(props) => (
        <Button {...props} size="sm" variant="soft" icon={send}>
          Send to
        </Button>
      )}
    />
  ) : null;

  const sampleMenu = (
    <Menu
      label="Load a sample"
      items={SAMPLES.map((s) => ({ value: s.label, label: s.label }))}
      onSelect={(label) => {
        const s = SAMPLES.find((x) => x.label === label);
        if (!s) return;
        setText(s.value);
        setFileName('data');
        setManual(null);
      }}
      trigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={sparkles}>
          Load a sample
        </Button>
      )}
    />
  );

  const lines = text ? text.split('\n').length : 0;
  const sourcePane = (
    <Card
      as="section"
      title="Source"
      description={fileName === 'data' ? undefined : fileName}
      headingLevel={2}
      padding="sm"
      actions={
        <Inline gap="1">
          {sampleMenu}
          <Button
            size="sm"
            variant="ghost"
            icon={downloadIcon}
            disabled={!text}
            onClick={download}
          >
            Download
          </Button>
        </Inline>
      }
    >
      <Stack gap="3">
        {error ? (
          <Stack data-testid="parse-error">
            <Notice
              tone="danger"
              action={
                error.line ? (
                  <Button
                    size="sm"
                    variant="soft"
                    icon={locate}
                    onClick={jumpToError}
                  >
                    Jump to error
                  </Button>
                ) : undefined
              }
            >
              {error.message}
            </Notice>
          </Stack>
        ) : null}
        <CodeEditor
          ref={editor}
          aria-label="Document"
          language={format}
          value={text}
          onChange={setText}
          placeholder="Paste JSON, XML or YAML"
          diagnostics={markers}
          wrap={settings.wrap}
          minHeight={wide ? 560 : 320}
          maxHeight={wide ? 640 : 480}
          onSelectionChange={onCaret}
        />
        {text === '' ? (
          <FileDrop
            size="sm"
            accept={ACCEPT}
            labels={{
              prompt: 'Drop a JSON, XML or YAML file here, or',
              chooseOne: 'Open a file',
            }}
            onFiles={(files) => files[0] && openFile(files[0])}
          />
        ) : null}
        {fileError ? (
          <Notice
            tone="danger"
            dismissible
            onDismiss={() => setFileError(null)}
          >
            {fileError}
          </Notice>
        ) : null}
        <StatusBar
          label="Document status"
          start={
            <>
              <StatusBarSegment>
                {FORMATS.find((f) => f.value === format)?.label}
              </StatusBarSegment>
              <StatusBarSegment>
                {`${lines.toLocaleString('en-US')} ${lines === 1 ? 'line' : 'lines'}`}
              </StatusBarSegment>
              <StatusBarSegment>{formatBytes(text.length)}</StatusBarSegment>
            </>
          }
          end={
            <StatusBarSegment
              tone={error ? 'danger' : doc ? 'success' : 'neutral'}
              dot={!!(error || doc)}
            >
              {parsed.parsing
                ? 'Parsing'
                : doc
                  ? 'Parsed'
                  : error
                    ? 'Not valid'
                    : 'Empty'}
            </StatusBarSegment>
          }
        />
      </Stack>
    </Card>
  );

  // Until a document parses, every view says why it is empty.
  const empty = (
    <EmptyState
      icon={bracesIcon}
      title={
        parsed.parsing
          ? 'Parsing'
          : error
            ? 'Fix the error to see this view'
            : 'No document yet'
      }
      description={
        error
          ? 'The Source marks where parsing stopped.'
          : 'Paste, open or drop JSON, XML or YAML in the Source, or load a sample.'
      }
      actions={
        wide ? undefined : (
          <Button size="sm" variant="soft" onClick={() => setTab('source')}>
            Go to Source
          </Button>
        )
      }
    />
  );

  const views: Record<View, () => React.ReactNode> = {
    tree: () => (
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
    map: () => (
      <MapTab
        doc={doc!}
        selectedId={selectedId}
        onSelect={select}
        matches={result.ids}
        fileBase={fileBase}
      />
    ),
    query: () => <QueryTab value={value} xml={xml} onSelect={select} />,
    convert: () => (
      <ConvertTab
        value={value}
        xml={xml}
        text={text}
        fileBase={fileBase}
        sourceTool={TOOL_ID}
      />
    ),
  };

  const viewSwitch = (
    <SegmentedControl
      label="View"
      size="sm"
      value={view}
      onChange={(v) => setTab(v as ViewerTab)}
      options={TAB_ORDER.filter((t) => !wide || t !== 'source').map((t) => ({
        value: t,
        label: TAB_LABEL[t],
      }))}
    />
  );
  const viewPane =
    view === 'source' ? null : (
      <Card as="section" padding="sm" aria-label={`${TAB_LABEL[view]} view`}>
        <Stack gap="3">
          {doc ? <PathBar node={selected} value={value} xml={xml} /> : null}
          {/* Each view sets its own height (Cynosure gap 35: no box height). */}
          <Stack minSize="0">{doc ? views[view]() : empty}</Stack>
        </Stack>
      </Card>
    );

  return (
    <Stack gap="5" minSize="0">
      <Inline gap="3" align="center" justify="between" wrap>
        <Inline gap="3" align="center" wrap>
          <SegmentedControl
            label="Format"
            size="sm"
            value={format}
            onChange={(v) => setManual(v as DocFormat)}
            options={FORMATS}
          />
          {wide ? null : viewSwitch}
        </Inline>
        {sendMenu}
      </Inline>
      {wide ? (
        <SplitPane
          label="Resize the source and the view"
          start={<Stack paddingInline="3">{sourcePane}</Stack>}
          end={
            <Stack paddingInline="3" gap="3">
              <Inline>{viewSwitch}</Inline>
              {viewPane}
            </Stack>
          }
        />
      ) : view === 'source' ? (
        sourcePane
      ) : (
        viewPane
      )}
    </Stack>
  );
}
