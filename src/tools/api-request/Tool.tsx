import { useMemo, useState } from 'react';
import { readClipboardText } from '@/shared/lib/clipboard';
import { toToolError } from '@/shared/lib/errors';
import { useHandoff } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  Alert,
  AlertDescription,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorState,
  IconButton,
  Inline,
  KeyValueEditor,
  Label,
  LoadingState,
  NumberInput,
  PrivacyNote,
  SegmentedControl,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@/shared/ui';
import {
  IconCode,
  IconFilePlus,
  IconFolderPlus,
  IconSave,
} from '@/shared/ui/icons';
import { AuthTab } from './components/AuthTab';
import { BodyTab } from './components/BodyTab';
import { CollectionsIO } from './components/CollectionsIO';
import { CollectionTree } from './components/CollectionTree';
import { CorsHelp } from './components/CorsHelp';
import { EnvironmentMenu } from './components/EnvironmentMenu';
import { HistoryPanel } from './components/HistoryPanel';
import { NewCollectionDialog } from './components/NewCollectionDialog';
import { RequestBar } from './components/RequestBar';
import { ResponsePanel } from './components/ResponsePanel';
import { SaveRequestDialog } from './components/SaveRequestDialog';
import { SnippetDialog } from './components/SnippetDialog';
import { useHttpClient } from './hooks/useHttpClient';
import { buildRequest } from './lib/http';
import { requestFromHandoff } from './lib/io';
import { emptyRequest } from './lib/model';

export default function HttpClient() {
  const c = useHttpClient();
  const { request, setRequest, job } = c;
  const [reqTab, setReqTab] = useState('params');
  const [side, setSide] = useState('collections');
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

  const send = () => void c.send();
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
      run: () =>
        void readClipboardText().then(
          (t) => c.importCurl(t),
          (e: unknown) =>
            notify.error(toToolError(e, 'Could not read the clipboard')),
        ),
    },
    {
      id: 'new',
      label: 'New request',
      run: () => {
        setRequest(emptyRequest());
        c.setSavedId(null);
      },
    },
  ]);

  const error = job.status === 'error' ? job.error : null;

  return (
    <Box className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Card className="min-w-0 self-start">
        <CardBody>
          <Tabs value={side} onValueChange={setSide} variant="soft" fullWidth>
            <TabsList aria-label="Saved and recent">
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="collections">
              <Stack gap="2" className="pt-3">
                <Inline gap="1" wrap>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label="New request"
                    icon={<IconFilePlus size="sm" />}
                    onClick={() => {
                      setRequest(emptyRequest());
                      c.setSavedId(null);
                    }}
                  />
                  <IconButton
                    size="sm"
                    variant="ghost"
                    label="New collection"
                    icon={<IconFolderPlus size="sm" />}
                    onClick={() => setNewOpen(true)}
                  />
                  <CollectionsIO
                    collections={c.collections}
                    environment={c.activeEnv}
                    onImport={(cols, env) => {
                      c.setCollections([...c.collections, ...cols]);
                      if (env) c.saveEnvironments([...c.environments, env]);
                    }}
                  />
                </Inline>
                <CollectionTree
                  collections={c.collections}
                  selectedRequest={c.savedId}
                  onSelectRequest={(r) => c.open(r.id)}
                  onDelete={(id) => c.remove(id)}
                />
              </Stack>
            </TabsContent>
            <TabsContent value="history">
              <Box className="pt-3">
                <HistoryPanel
                  items={c.history}
                  persist={c.settings.historyPersist}
                  onPersistChange={c.setHistoryPersist}
                  onClear={c.clearHistory}
                  onOpen={(h) => {
                    setRequest(
                      h.request ??
                        emptyRequest({
                          mode: h.mode,
                          method: h.method,
                          url: h.url,
                        }),
                    );
                    c.setSavedId(null);
                  }}
                />
              </Box>
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>

      <Stack gap="4" className="min-w-0">
        <PrivacyNote variant="network" />
        <Card>
          <CardHeader>
            <Inline gap="2" align="center" justify="between" wrap>
              <CardTitle as="h2">Request</CardTitle>
              <Inline gap="2" align="center" wrap>
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
                <EnvironmentMenu
                  environments={c.environments}
                  activeId={c.settings.activeEnv}
                  onActiveChange={(activeEnv) => c.update({ activeEnv })}
                  onSave={c.saveEnvironments}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<IconCode size="sm" />}
                  onClick={() => setSnippetOpen(true)}
                >
                  Code
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<IconSave size="sm" />}
                  onClick={save}
                >
                  Save
                </Button>
              </Inline>
            </Inline>
          </CardHeader>
          <CardBody>
            <Stack gap="3">
              <RequestBar
                request={request}
                onChange={setRequest}
                onCurl={c.importCurl}
                onSend={send}
                onCancel={job.cancel}
                running={job.status === 'running'}
                unresolved={unresolved}
              />
              {unresolved.length > 0 && (
                <Alert status="warning">
                  <AlertDescription>
                    Unresolved variables: {unresolved.join(', ')}. Add them to
                    the active environment.
                  </AlertDescription>
                </Alert>
              )}
              <Tabs value={reqTab} onValueChange={setReqTab} variant="soft">
                <TabsList aria-label="Request parts">
                  <TabsTrigger value="params">
                    Params ({request.params.length})
                  </TabsTrigger>
                  <TabsTrigger value="headers">
                    Headers ({request.headers.length})
                  </TabsTrigger>
                  <TabsTrigger value="auth">Auth</TabsTrigger>
                  <TabsTrigger value="body">
                    {request.mode === 'graphql' ? 'Query' : 'Body'}
                  </TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="params">
                  <KeyValueEditor
                    rows={request.params}
                    onChange={(params) => setRequest({ ...request, params })}
                    ariaLabel="Query parameters"
                  />
                </TabsContent>
                <TabsContent value="headers">
                  <KeyValueEditor
                    rows={request.headers}
                    onChange={(headers) => setRequest({ ...request, headers })}
                    ariaLabel="Headers"
                    keyLabel="Header"
                  />
                </TabsContent>
                <TabsContent value="auth">
                  <AuthTab
                    auth={request.auth}
                    onChange={(auth) => setRequest({ ...request, auth })}
                  />
                </TabsContent>
                <TabsContent value="body">
                  <BodyTab request={request} onChange={setRequest} />
                </TabsContent>
                <TabsContent value="settings">
                  <Stack gap="2">
                    <Label htmlFor="http-timeout">Timeout (seconds)</Label>
                    <NumberInput
                      id="http-timeout"
                      value={Math.round(c.settings.timeoutMs / 1000)}
                      min={1}
                      max={600}
                      onValueChange={(s) =>
                        c.update({ timeoutMs: Math.max(1, s || 30) * 1000 })
                      }
                    />
                    <Text size="xs" tone="muted">
                      Redirects are followed by the browser and cannot be turned
                      off from a page.
                    </Text>
                  </Stack>
                </TabsContent>
              </Tabs>
            </Stack>
          </CardBody>
        </Card>

        {job.status === 'running' && (
          <LoadingState label="Waiting for the response" />
        )}
        {error &&
          (error.code === 'NETWORK' ? (
            <CorsHelp error={error} />
          ) : (
            <ErrorState error={error} title="Request failed" headingLevel={3} />
          ))}
        {c.sent && job.status !== 'running' && !error && (
          <ResponsePanel sent={c.sent} />
        )}
      </Stack>

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
    </Box>
  );
}
