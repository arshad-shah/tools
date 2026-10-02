import React, { useEffect, useState } from 'react';
import {
  IconFilePlus,
  IconFolderPlus,
  IconGlobe,
  IconSave,
} from '@/shared/ui/icons';

import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  IconButton,
  Inline,
  Stack,
} from '@/shared/ui';
import {
  RequestItemType,
  RequestTab,
  ResponseTab,
  ResponseType,
} from './types';
import { toToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import { addCollection, addRequest, deleteNode } from './lib/collections';
import { sendRequest, type RequestInput } from './lib/request';
import { useApiCollections } from './store';
import { useRequestDraft } from './hooks/useRequestDraft';
import { CollectionTree } from './components/CollectionTree';
import { NewCollectionDialog } from './components/NewCollectionDialog';
import { RequestForm } from './components/RequestForm';
import { ResponsePanel } from './components/ResponsePanel';
import { SaveRequestDialog } from './components/SaveRequestDialog';

const ApiTester: React.FC = () => {
  // Request state
  const editor = useRequestDraft();
  const { draft } = editor;
  const { requestType } = draft;

  // Response state
  const job = useJob((ctx, input: RequestInput) =>
    sendRequest(input, ctx.signal),
  );
  // Kept across sends, so a send that fails validation or is cancelled
  // leaves the previous response on screen (as before useJob).
  const [response, setResponse] = useState<ResponseType | null>(null);
  const isLoading = job.status === 'running';
  // Invalid input (no URL, bad JSON) is toasted; network failures show as a
  // status-0 response instead.
  useEffect(() => {
    if (job.error) notify.error(job.error);
  }, [job.error]);

  // UI state
  const [sidebarActive, setSidebarActive] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [newCollectionModalOpen, setNewCollectionModalOpen] =
    useState<boolean>(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [activeRequestTab, setActiveRequestTab] =
    useState<RequestTab>('params');
  const [activeResponseTab, setActiveResponseTab] =
    useState<ResponseTab>('body');

  const collections = useApiCollections((s) => s.collections);
  const { setCollections } = useApiCollections.getState();

  const handleSend = async () => {
    const result = await job.run(draft);
    if (result) setResponse(result);
  };

  const handleSelectRequest = (req: RequestItemType) => {
    setSelectedRequest(req.id);
    editor.load(req);
  };

  const handleSaveRequest = () => {
    if (!saveName) {
      notify.error('Please enter a name');
      return;
    }
    const now = Date.now();
    const newReq: RequestItemType = {
      id: newId(),
      type: 'request',
      name: saveName,
      method: draft.method,
      url: draft.url,
      requestType,
      headers: [...draft.headers],
      params: [...draft.params],
      bodyType: draft.bodyType,
      body: draft.body,
      graphqlQuery: draft.graphqlQuery,
      graphqlVariables: draft.graphqlVariables,
      createdAt: now,
      updatedAt: now,
    };
    try {
      setCollections(
        addRequest(collections, selectedCollectionId || null, newReq),
      );
    } catch (e) {
      notify.error(toToolError(e));
      return;
    }
    setSelectedRequest(newReq.id);
    setSaveModalOpen(false);
    setSaveName('');
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    setCollections(addCollection(collections, newCollectionName));
    setNewCollectionName('');
    setNewCollectionModalOpen(false);
  };

  const handleCreateNewRequest = () => {
    if (collections.length === 0) {
      setNewCollectionModalOpen(true);
      return;
    }
    const newReq: RequestItemType = {
      id: newId(),
      type: 'request',
      name: 'New Request',
      method: 'GET',
      url: '',
      requestType: 'rest',
    };
    setCollections(addRequest(collections, collections[0].id, newReq));
    editor.reset();
    setSelectedRequest(newReq.id);
  };

  // Finds and removes the folder or request anywhere in the tree (B6).
  const handleDelete = (id: string) => {
    setCollections(deleteNode(collections, id));
    if (selectedRequest === id) setSelectedRequest(null);
  };

  return (
    <Box className="w-full">
      <Box
        className={`grid grid-cols-1 gap-4${
          sidebarActive ? ' lg:grid-cols-4' : ''
        }`}
      >
        {sidebarActive && (
          <Box className="lg:col-span-1">
            <Card>
              <CardHeader>
                <Inline justify="between" align="center" wrap gap="2">
                  <CardTitle as="h3">Collections</CardTitle>
                  <Inline gap="1">
                    <IconButton
                      variant="secondary"
                      size="sm"
                      label="New request"
                      icon={<IconFilePlus size="sm" />}
                      onClick={handleCreateNewRequest}
                    />
                    <IconButton
                      variant="secondary"
                      size="sm"
                      label="New collection"
                      icon={<IconFolderPlus size="sm" />}
                      onClick={() => setNewCollectionModalOpen(true)}
                    />
                  </Inline>
                </Inline>
              </CardHeader>
              <CardBody>
                <CollectionTree
                  collections={collections}
                  selectedRequest={selectedRequest}
                  onSelectRequest={handleSelectRequest}
                  onDelete={handleDelete}
                />
              </CardBody>
            </Card>
          </Box>
        )}

        <Box className={sidebarActive ? 'lg:col-span-3' : undefined}>
          <Stack gap="4">
            <Inline justify="between" align="center" wrap gap="2">
              <ButtonGroup>
                <Button
                  variant={requestType === 'rest' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => editor.setField('requestType', 'rest')}
                >
                  REST
                </Button>
                <Button
                  variant={requestType === 'graphql' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => editor.setField('requestType', 'graphql')}
                >
                  GraphQL
                </Button>
              </ButtonGroup>
              <Inline gap="2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconSave size="sm" />}
                  onClick={() => setSaveModalOpen(true)}
                >
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSidebarActive(!sidebarActive)}
                >
                  {sidebarActive ? 'Hide collections' : 'Show collections'}
                </Button>
              </Inline>
            </Inline>

            {selectedRequest ? (
              <Stack gap="4">
                <Card>
                  <CardHeader>
                    <CardTitle as="h3">Request</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <RequestForm
                      editor={editor}
                      isLoading={isLoading}
                      onSend={() => void handleSend()}
                      onCancel={job.cancel}
                      activeRequestTab={activeRequestTab}
                      setActiveRequestTab={setActiveRequestTab}
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle as="h3">Response</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <ResponsePanel
                      isLoading={isLoading}
                      response={response}
                      activeResponseTab={activeResponseTab}
                      setActiveResponseTab={setActiveResponseTab}
                    />
                  </CardBody>
                </Card>
              </Stack>
            ) : (
              <Card>
                <CardBody>
                  <EmptyState>
                    <EmptyStateIcon>
                      <IconGlobe size="3xl" />
                    </EmptyStateIcon>
                    <EmptyStateTitle>No request selected</EmptyStateTitle>
                    <EmptyStateDescription>
                      Pick a request from a collection or create a new one to
                      get started.
                    </EmptyStateDescription>
                    <EmptyStateActions>
                      <Button
                        variant="primary"
                        leftIcon={<IconFilePlus size="sm" />}
                        onClick={handleCreateNewRequest}
                      >
                        New request
                      </Button>
                    </EmptyStateActions>
                  </EmptyState>
                </CardBody>
              </Card>
            )}
          </Stack>
        </Box>
      </Box>

      <SaveRequestDialog
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        saveName={saveName}
        setSaveName={setSaveName}
        selectedCollectionId={selectedCollectionId}
        setSelectedCollectionId={setSelectedCollectionId}
        collections={collections}
        onSave={handleSaveRequest}
      />

      <NewCollectionDialog
        open={newCollectionModalOpen}
        onOpenChange={setNewCollectionModalOpen}
        newCollectionName={newCollectionName}
        setNewCollectionName={setNewCollectionName}
        onCreate={handleCreateCollection}
      />
    </Box>
  );
};

export default ApiTester;
