import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Inline,
  KeyValueEditor,
  Menu,
  Notice,
  NumberField,
  ProgressBar,
  SegmentedControl,
  Select,
  Sheet,
  SplitPane,
  Stack,
  Text,
} from '@arshad-shah/cynosure';
import {
  clipboardPaste,
  code,
  filePlus,
  folder,
  moreHorizontal,
  save as saveIcon,
  send as sendIcon,
} from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import { ToolActions } from '@/app/ui/tool-actions';
import { useMediaQuery } from '@/shared/lib/media-query';
import { readClipboardText } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { useHandoff } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { AuthTab } from './components/AuthTab';
import { BodyTab } from './components/BodyTab';
import { CorsHelp } from './components/CorsHelp';
import { EnvironmentMenu } from './components/EnvironmentMenu';
import { NewCollectionDialog } from './components/NewCollectionDialog';
import { RequestBar } from './components/RequestBar';
import { ResponsePanel } from './components/ResponsePanel';
import { SaveRequestDialog } from './components/SaveRequestDialog';
import { Sidebar } from './components/Sidebar';
import { SnippetDialog } from './components/SnippetDialog';
import { useHttpClient } from './hooks/useHttpClient';
import { buildRequest } from './lib/http';
import { requestFromHandoff } from './lib/io';
import { fromPairs, toPairs } from './lib/kv';
import { emptyRequest } from './lib/model';
import { PANES_STACK_BELOW } from '@/app/ui/transform';

type RequestPart = 'params' | 'headers' | 'auth' | 'body' | 'settings';

export default function HttpClient() {
  const c = useHttpClient();
  const { request, setRequest, job } = c;
  const [reqTab, setReqTab] = useState<RequestPart>('params');
  const [sideOpen, setSideOpen] = useState(false);
  // Phones: the five request parts do not fit one segmented row.
  const phone = useMediaQuery('(max-width: 40rem)');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveFolder, setSaveFolder] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [snippetOpen, setSnippetOpen] = useState(false);

  const unresolved = useMemo(() => {
    try {
      return buildRequest(request, c.vars).unresolved;
    } catch {
      return [];
    }
  }, [request, c.vars]);

  // A request handed over by URL Inspector or a cURL command (once each).
  const handoff = useHandoff(
    (p) =>
      p.kind === 'text' &&
      (p.mime === 'application/x-curl' ||
        p.mime === 'application/vnd.tools.http-request+json'),
  );
  const [hydrated, setHydrated] = useState<unknown>(null);
  if (handoff && hydrated !== handoff) {
    setHydrated(handoff);
    try {
      const r = requestFromHandoff(handoff);
      if (r) {
        setRequest(r);
        c.setSavedId(null);
      }
    } catch (e) {
      notify.error(toToolError(e, 'Could not open the handed-off request'));
    }
  }

  const newRequest = () => {
    setRequest(emptyRequest());
    c.setSavedId(null);
    setSideOpen(false);
  };
  const send = () => void c.send();
  const importCurl = () =>
    void readClipboardText().then(
      (t) => c.importCurl(t),
      (e: unknown) =>
        notify.error(toToolError(e, 'Could not read the clipboard')),
    );
  const save = () => {
    if (!c.saveCurrent()) {
      setSaveName(
        request.url.replace(/^https?:\/\//, '').slice(0, 60) || 'Request',
      );
      setSaveOpen(true);
    }
  };

  useToolCommands('api-request', [
    {
      id: 'send',
      label: 'Send request',
      shortcut: 'Mod+Enter',
      enabled: job.status !== 'running',
      run: send,
    },
    { id: 'save', label: 'Save request', shortcut: 'Mod+S', run: save },
    { id: 'snippet', label: 'Copy as code', run: () => setSnippetOpen(true) },
    {
      id: 'curl',
      label: 'Import cURL from clipboard',
      run: importCurl,
    },
    { id: 'new', label: 'New request', run: newRequest },
  ]);

  const error = job.status === 'error' ? job.error : null;

  const parts = [
    { value: 'params', label: `Params (${request.params.length})` },
    { value: 'headers', label: `Headers (${request.headers.length})` },
    { value: 'auth', label: 'Auth' },
    { value: 'body', label: request.mode === 'graphql' ? 'Query' : 'Body' },
    { value: 'settings', label: 'Settings' },
  ];
  const requestPane = (
    <Card
      as="section"
      title="Request"
      actions={
        <Inline gap="1" align="center">
          <SegmentedControl
            label="Request type"
            size="sm"
            value={request.mode}
            onChange={(mode) =>
              setRequest({ ...request, mode: mode as 'rest' | 'graphql' })
            }
            options={[
              { value: 'rest', label: 'REST' },
              { value: 'graphql', label: 'GraphQL' },
            ]}
          />
          <Button size="sm" variant="soft" icon={saveIcon} onClick={save}>
            Save
          </Button>
          <Menu
            label="More request actions"
            items={[
              { value: 'snippet', label: 'Copy as code', icon: code },
              {
                value: 'curl',
                label: 'Import cURL from clipboard',
                icon: clipboardPaste,
              },
              { value: 'new', label: 'New request', icon: filePlus },
            ]}
            onSelect={(v) =>
              v === 'snippet'
                ? setSnippetOpen(true)
                : v === 'curl'
                  ? importCurl()
                  : newRequest()
            }
            trigger={(props) => (
              <IconButton
                {...props}
                size="sm"
                variant="ghost"
                tone="neutral"
                label="More request actions"
                icon={moreHorizontal}
              />
            )}
          />
        </Inline>
      }
    >
      <Stack gap="5">
        <RequestBar
          request={request}
          onChange={setRequest}
          onCurl={c.importCurl}
          onSend={send}
          onCancel={job.cancel}
          running={job.status === 'running'}
          unresolved={unresolved}
          stacked={phone}
        />
        {unresolved.length > 0 ? (
          <Notice tone="warning">
            {`Unresolved variables: ${unresolved.join(', ')}. Add them to the active environment.`}
          </Notice>
        ) : null}
        {/* A SegmentedControl, not Tabs: Tabs throw when a kept-alive page
            is shown again (docs/cynosure-gaps.md, 11). */}
        {phone ? (
          <Select
            label="Request parts"
            labelHidden
            value={reqTab}
            onChange={(v) => setReqTab(v as RequestPart)}
            options={parts}
          />
        ) : (
          <SegmentedControl
            label="Request parts"
            size="sm"
            fullWidth
            value={reqTab}
            onChange={(v) => setReqTab(v as RequestPart)}
            options={parts}
          />
        )}
        {reqTab === 'params' ? (
          <KeyValueEditor
            label="Query parameters"
            pairs={toPairs(request.params)}
            onChange={(pairs) =>
              setRequest({
                ...request,
                params: fromPairs(pairs, request.params),
              })
            }
          />
        ) : null}
        {reqTab === 'headers' ? (
          <KeyValueEditor
            label="Headers"
            pairs={toPairs(request.headers)}
            onChange={(pairs) =>
              setRequest({
                ...request,
                headers: fromPairs(pairs, request.headers),
              })
            }
            labels={{ key: 'Header' }}
          />
        ) : null}
        {reqTab === 'auth' ? (
          <AuthTab
            auth={request.auth}
            onChange={(auth) => setRequest({ ...request, auth })}
          />
        ) : null}
        {reqTab === 'body' ? (
          <BodyTab request={request} onChange={setRequest} />
        ) : null}
        {reqTab === 'settings' ? (
          <NumberField
            label="Timeout (seconds)"
            description="Redirects are followed by the browser and cannot be turned off from a page."
            value={Math.round(c.settings.timeoutMs / 1000)}
            min={1}
            max={600}
            onChange={(s) =>
              c.update({ timeoutMs: Math.max(1, s || 30) * 1000 })
            }
          />
        ) : null}
      </Stack>
    </Card>
  );
  const responsePane =
    job.status === 'running' ? (
      <Card as="section" title="Response">
        <ProgressBar label="Waiting for the response" indeterminate />
      </Card>
    ) : error ? (
      error.code === 'NETWORK' ? (
        <CorsHelp error={error} />
      ) : (
        <Card as="section" title="Response">
          <Notice tone="danger" title="Request failed">
            {error.message}
          </Notice>
        </Card>
      )
    ) : c.sent ? (
      <ResponsePanel sent={c.sent} />
    ) : (
      <Card as="section" title="Response">
        <EmptyState
          icon={sendIcon}
          title="No response yet"
          description="Send the request to see the status, headers and body here."
        />
      </Card>
    );

  return (
    <Stack gap="5">
      <ToolActions>
        <EnvironmentMenu
          environments={c.environments}
          activeId={c.settings.activeEnv}
          onActiveChange={(activeEnv) => c.update({ activeEnv })}
          onSave={c.saveEnvironments}
        />
        <Button variant="soft" icon={folder} onClick={() => setSideOpen(true)}>
          Collections
        </Button>
      </ToolActions>
      <Text size="sm" tone="muted">
        Requests go directly from your browser to the URL you enter.
      </Text>
      <SplitPane
        label="Resize the request and response"
        defaultSize={50}
        min={35}
        max={65}
        stackBelow={PANES_STACK_BELOW}
        start={<Stack paddingInline="3">{requestPane}</Stack>}
        end={<Stack paddingInline="3">{responsePane}</Stack>}
      />

      <Sheet
        open={sideOpen}
        onOpenChange={setSideOpen}
        title="Collections and history"
        side="start"
      >
        <Sidebar
          client={c}
          onNewRequest={newRequest}
          onNewCollection={() => setNewOpen(true)}
          onOpened={() => setSideOpen(false)}
        />
      </Sheet>

      <SaveRequestDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        saveName={saveName}
        setSaveName={setSaveName}
        selectedCollectionId={saveFolder}
        setSelectedCollectionId={setSaveFolder}
        collections={c.collections}
        onSave={() => {
          try {
            c.saveAs(saveName, saveFolder || null);
            setSaveOpen(false);
          } catch (e) {
            notify.error(toToolError(e, 'Could not save the request'));
          }
        }}
      />
      <NewCollectionDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        newCollectionName={newName}
        setNewCollectionName={setNewName}
        onCreate={() => {
          if (!newName.trim()) return;
          c.addCollection(newName);
          setNewName('');
          setNewOpen(false);
        }}
      />
      <SnippetDialog
        open={snippetOpen}
        onOpenChange={setSnippetOpen}
        request={request}
        vars={c.vars}
      />
    </Stack>
  );
}
