import {
  Button,
  Card,
  EmptyState,
  Notice,
  SearchField,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import { bookOpen, sparkles } from '@arshad-shah/cynosure/icons';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextSourceActions } from '@/app/ui/text-source';
import { useTextFile } from '@/app/ui/use-text-file';
import { CodeEditor } from '@/shared/editor';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { sendTo, useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { ApiInfo } from './components/ApiInfo';
import { OperationList } from './components/OperationList';
import { buildApi, type Api, type Operation } from './lib/api';
import { filterGroups } from './lib/filter';
import { loadSpec, type LoadedSpec } from './lib/load';
import { buildRequest, toHttpClient } from './lib/request';
import { SAMPLE_OPENAPI } from './lib/samples';

const TOOL_ID = 'openapi-viewer';
const MAX_BYTES = 20 * 1024 * 1024;
const TEXT_MIMES = new Set([
  'application/json',
  'application/yaml',
  'application/x-yaml',
  'text/yaml',
  'application/vnd.oai.openapi',
  'application/vnd.oai.openapi+json',
]);

const takesText = (p: HandoffPayload) =>
  p.kind === 'text' && TEXT_MIMES.has(p.mime);

type State =
  | { status: 'empty' }
  | { status: 'error'; error: ToolError }
  | { status: 'ready'; spec: LoadedSpec; api: Api };

/**
 * OpenAPI Viewer: paste or open an OpenAPI 3.x or Swagger 2.0 document
 * (JSON or YAML) to browse its endpoints by tag, read their parameters,
 * bodies and responses with `$ref`s resolved, and send any of them to the
 * HTTP Client as a ready-made request.
 */
export default function OpenApiViewer() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [state, setState] = useState<State>({ status: 'empty' });
  const [query, setQuery] = useState('');
  const [server, setServer] = useState(0);
  const [origin, setOrigin] = useState('');

  // Parse after a short pause: large documents re-parse on every keystroke otherwise.
  useEffect(() => {
    let live = true;
    const t = setTimeout(
      () => {
        if (!text.trim()) {
          setState({ status: 'empty' });
          return;
        }
        loadSpec(text).then(
          (spec) => {
            if (!live) return;
            setState({ status: 'ready', spec, api: buildApi(spec) });
          },
          (e: unknown) => {
            if (live)
              setState({
                status: 'error',
                error: toToolError(e, 'Could not read the document'),
              });
          },
        );
      },
      text.length > 200_000 ? 400 : 150,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [text]);

  const changeText = (t: string) => {
    setText(t);
    setServer(0);
  };

  // A JSON or YAML file dropped on the Web hub.
  const files = useHandoff();
  const { open } = useTextFile({ onChange: changeText, maxBytes: MAX_BYTES });
  const openDropped = useEffectEvent((f: File) => void open(f));
  useEffect(() => {
    if (files?.[0]) openDropped(files[0]);
  }, [files]);

  const ready = state.status === 'ready' ? state : null;
  const groups = useMemo(
    () => (ready ? filterGroups(ready.api.groups, query) : []),
    [ready, query],
  );
  const shown = groups.reduce((n, g) => n + g.operations.length, 0);

  const requestFor = (op: Operation) =>
    buildRequest(ready?.spec.doc, op, ready?.api.servers[server], origin);
  const send = (op: Operation) =>
    sendTo(navigate, 'api-request', toHttpClient(requestFor(op)));

  useToolCommands(TOOL_ID, [
    {
      id: 'sample',
      label: 'Load sample',
      run: () => changeText(SAMPLE_OPENAPI),
    },
    {
      id: 'clear',
      label: 'Clear',
      shortcut: 'Mod+Shift+X',
      run: () => changeText(''),
    },
  ]);

  const input = (
    <Card as="section" title="Document">
      <Stack gap="4">
        <CodeEditor
          aria-label="OpenAPI document"
          language={
            ready?.spec.format === 'json' || text.trimStart().startsWith('{')
              ? 'json'
              : 'yaml'
          }
          placeholder="Paste an OpenAPI 3.x or Swagger 2.0 document, as JSON or YAML, or open a file."
          value={text}
          onChange={changeText}
          minHeight={ready ? 120 : 220}
          maxHeight={ready ? 240 : 480}
        />
        {state.status === 'error' ? (
          <Notice tone="danger" title="Cannot read the document">
            {state.error.message}
          </Notice>
        ) : null}
        <TextSourceActions
          value={text}
          onChange={changeText}
          label="Document"
          accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
          maxBytes={MAX_BYTES}
          onExample={() => changeText(SAMPLE_OPENAPI)}
          handoff={takesText}
        />
      </Stack>
    </Card>
  );

  if (!ready)
    return (
      <Stack gap="6">
        {input}
        {state.status === 'empty' ? (
          <EmptyState
            icon={bookOpen}
            title="No API yet"
            description="Paste or open an OpenAPI or Swagger document to browse its endpoints, schemas and examples, and send requests to the HTTP Client."
            actions={
              <Button
                variant="soft"
                icon={sparkles}
                onClick={() => changeText(SAMPLE_OPENAPI)}
              >
                Try an example
              </Button>
            }
          />
        ) : null}
      </Stack>
    );

  return (
    <Stack gap="6">
      {input}
      <ApiInfo
        api={ready.api}
        server={Math.min(server, Math.max(0, ready.api.servers.length - 1))}
        onServer={setServer}
        origin={origin}
        onOrigin={setOrigin}
      />
      <Stack gap="3">
        <SearchField
          label="Filter endpoints"
          placeholder="Filter by path, method, summary or tag"
          value={query}
          onChange={setQuery}
        />
        <Text size="sm" tone="muted" numeric>
          {query
            ? `${shown} of ${ready.api.operationCount} operations match`
            : `${ready.api.operationCount} operations in ${ready.api.groups.length} ${ready.api.groups.length === 1 ? 'group' : 'groups'}`}
        </Text>
      </Stack>
      {groups.length ? (
        <OperationList
          doc={ready.spec.doc}
          groups={groups}
          requestFor={requestFor}
          onSend={send}
        />
      ) : (
        <EmptyState
          icon={bookOpen}
          title={
            ready.api.operationCount ? 'No matching endpoints' : 'No endpoints'
          }
          description={
            ready.api.operationCount
              ? 'Try fewer or other words.'
              : 'The document has no paths with operations.'
          }
        />
      )}
    </Stack>
  );
}
