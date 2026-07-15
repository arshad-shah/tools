/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  Folder,
  FolderPlus,
  Globe,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Center,
  Code,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  IconButton,
  Inline,
  Input,
  Label,
  Select,
  Spinner,
  Stack,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from '@/components/ui';
import {
  BodyType,
  CollectionType,
  FolderItemType,
  HeaderType,
  ParamType,
  RequestItemType,
  ResponseType,
} from '../../types/ApiTesterTypes';
import { useLocalStorage } from '../../hooks/useLocalStorage.hook';

const METHOD_OPTIONS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
];

const BODY_TYPE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'x-www-form-urlencoded', label: 'Form urlencoded' },
  { value: 'form-data', label: 'Form data' },
];

const methodColor = (
  method: string,
): 'success' | 'warning' | 'accent' | 'danger' | 'neutral' => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'success';
    case 'POST':
      return 'accent';
    case 'PUT':
      return 'warning';
    case 'PATCH':
      return 'warning';
    case 'DELETE':
      return 'danger';
    default:
      return 'neutral';
  }
};

const statusColor = (
  status: number,
): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (status === 0) return 'danger';
  if (status >= 500) return 'danger';
  if (status >= 400) return 'warning';
  if (status >= 200 && status < 300) return 'success';
  return 'neutral';
};

interface CollectionItemProps {
  item: RequestItemType | FolderItemType;
  depth: number;
  selectedRequest: string | null;
  onSelectRequest: (req: RequestItemType) => void;
  onDelete: (id: string, type: 'folder' | 'request') => void;
}

const CollectionItem: React.FC<CollectionItemProps> = ({
  item,
  depth,
  selectedRequest,
  onSelectRequest,
  onDelete,
}) => {
  const [open, setOpen] = useState(true);
  if (item.type === 'folder') {
    return (
      <Stack gap="1">
        <Inline align="center" gap="2" style={{ paddingLeft: depth * 12 }}>
          <IconButton
            variant="ghost"
            size="sm"
            label={open ? 'Collapse' : 'Expand'}
            icon={open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            onClick={() => setOpen(!open)}
          />
          <Folder size={14} aria-hidden />
          <Text size="sm" weight="medium">
            {item.name}
          </Text>
          <Box className="flex-1" />
          <IconButton
            variant="ghost"
            size="sm"
            label="Delete folder"
            icon={<Trash2 size={12} />}
            onClick={() => onDelete(item.id, 'folder')}
          />
        </Inline>
        {open && (
          <Stack gap="1">
            {item.children.map((child) => (
              <CollectionItem
                key={child.id}
                item={child}
                depth={depth + 1}
                selectedRequest={selectedRequest}
                onSelectRequest={onSelectRequest}
                onDelete={onDelete}
              />
            ))}
          </Stack>
        )}
      </Stack>
    );
  }

  const req = item as RequestItemType;
  const isSelected = selectedRequest === req.id;
  return (
    <Card
      interactive
      onClick={() => onSelectRequest(req)}
      className={isSelected ? 'border-accent' : undefined}
      style={{ marginLeft: depth * 12 }}
    >
      <CardBody>
        <Inline justify="between" align="center" gap="2" wrap>
          <Inline align="center" gap="2">
            <Badge variant="solid" tone={methodColor(req.method)} size="xs">
              {req.method}
            </Badge>
            <Text size="sm" weight="medium" className="truncate">
              {req.name}
            </Text>
          </Inline>
          <IconButton
            variant="ghost"
            size="sm"
            label="Delete request"
            icon={<Trash2 size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(req.id, 'request');
            }}
          />
        </Inline>
      </CardBody>
    </Card>
  );
};

const ApiTester: React.FC = () => {
  // Request state
  const [requestType, setRequestType] = useState<'rest' | 'graphql'>('rest');
  const [method, setMethod] = useState<string>('GET');
  const [url, setUrl] = useState<string>('');
  const [headers, setHeaders] = useState<HeaderType[]>([
    { key: '', value: '' },
  ]);
  const [params, setParams] = useState<ParamType[]>([
    { key: '', value: '', enabled: true },
  ]);
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [body, setBody] = useState<string>('');
  const [graphqlQuery, setGraphqlQuery] = useState<string>('');
  const [graphqlVariables, setGraphqlVariables] = useState<string>('');

  // Response state
  const [response, setResponse] = useState<ResponseType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // UI state
  const [sidebarActive, setSidebarActive] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');
  const [newCollectionModalOpen, setNewCollectionModalOpen] =
    useState<boolean>(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [activeRequestTab, setActiveRequestTab] = useState<
    'params' | 'headers' | 'body'
  >('params');
  const [activeResponseTab, setActiveResponseTab] = useState<
    'body' | 'headers'
  >('body');

  const [collections, setCollections] = useLocalStorage<CollectionType[]>(
    'apiTesterCollections',
    [
      {
        id: '1',
        type: 'folder',
        name: 'My Collection',
        children: [
          {
            id: '2',
            type: 'request',
            name: 'Get Users',
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/users',
          },
          {
            id: '3',
            type: 'request',
            name: 'Create User',
            method: 'POST',
            url: 'https://jsonplaceholder.typicode.com/users',
          },
        ],
      },
    ],
  );

  // Header helpers
  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const removeHeader = (i: number) => {
    const next = [...headers];
    next.splice(i, 1);
    setHeaders(next);
  };
  const updateHeader = (i: number, field: 'key' | 'value', value: string) => {
    const next = [...headers];
    next[i] = { ...next[i], [field]: value };
    setHeaders(next);
  };

  // Param helpers
  const addParam = () =>
    setParams([...params, { key: '', value: '', enabled: true }]);
  const removeParam = (i: number) => {
    const next = [...params];
    next.splice(i, 1);
    setParams(next);
  };
  const updateParam = (i: number, field: keyof ParamType, value: any) => {
    const next = [...params];
    next[i] = { ...next[i], [field]: value };
    setParams(next);
  };

  const buildUrl = () => {
    try {
      const parsed = new URL(url);
      params
        .filter((p) => p.enabled && p.key.trim())
        .forEach((p) => parsed.searchParams.append(p.key, p.value));
      return parsed.toString();
    } catch {
      return url;
    }
  };

  const sendRequest = async () => {
    if (!url) {
      window.alert('Please enter a URL');
      return;
    }
    setIsLoading(true);
    const startTime = performance.now();
    try {
      let res: ResponseType;
      if (requestType === 'rest') {
        const headerObj: Record<string, string> = {};
        headers.forEach((h) => {
          if (h.key.trim() && h.value.trim()) {
            headerObj[h.key.trim()] = h.value.trim();
          }
        });
        let reqUrl = url;
        if (method === 'GET') reqUrl = buildUrl();
        let reqBody: any = undefined;
        if (method !== 'GET' && bodyType === 'json' && body.trim()) {
          try {
            reqBody = JSON.parse(body);
            headerObj['Content-Type'] = 'application/json';
            reqBody = JSON.stringify(reqBody);
          } catch {
            window.alert('Invalid JSON in request body');
            setIsLoading(false);
            return;
          }
        } else if (method !== 'GET' && bodyType === 'x-www-form-urlencoded') {
          const formData = new URLSearchParams();
          body.split('&').forEach((pair) => {
            const [k, v] = pair.split('=');
            if (k) formData.append(k, v || '');
          });
          reqBody = formData;
          headerObj['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        const fetchRes = await fetch(reqUrl, {
          method,
          headers: headerObj,
          body: reqBody,
        });
        const respHeaders: Record<string, string> = {};
        fetchRes.headers.forEach((value, key) => {
          respHeaders[key] = value;
        });
        const contentType = fetchRes.headers.get('content-type');
        const data =
          contentType && contentType.includes('application/json')
            ? await fetchRes.json()
            : await fetchRes.text();
        res = {
          status: fetchRes.status,
          statusText: fetchRes.statusText,
          time: Math.round(performance.now() - startTime),
          headers: respHeaders,
          data,
        };
      } else {
        const headerObj: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        headers.forEach((h) => {
          if (h.key.trim() && h.value.trim()) {
            headerObj[h.key.trim()] = h.value.trim();
          }
        });
        let variables: Record<string, unknown> = {};
        if (graphqlVariables.trim()) {
          try {
            variables = JSON.parse(graphqlVariables);
          } catch {
            window.alert('Invalid JSON in GraphQL variables');
            setIsLoading(false);
            return;
          }
        }
        const fetchRes = await fetch(url, {
          method: 'POST',
          headers: headerObj,
          body: JSON.stringify({ query: graphqlQuery, variables }),
        });
        const respHeaders: Record<string, string> = {};
        fetchRes.headers.forEach((value, key) => {
          respHeaders[key] = value;
        });
        const data = await fetchRes.json();
        res = {
          status: fetchRes.status,
          statusText: fetchRes.statusText,
          time: Math.round(performance.now() - startTime),
          headers: respHeaders,
          data,
        };
      }
      setResponse(res);
    } catch (err) {
      setResponse({
        status: 0,
        statusText: 'Network error',
        time: Math.round(performance.now() - startTime),
        headers: {},
        data: {
          error:
            err instanceof Error
              ? err.message
              : 'Failed to connect to the server',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRequest = (req: RequestItemType) => {
    setSelectedRequest(req.id);
    if (req.requestType) setRequestType(req.requestType as 'rest' | 'graphql');
    setMethod(req.method);
    setUrl(req.url);
    setHeaders(
      req.headers && Array.isArray(req.headers) && req.headers.length > 0
        ? [...req.headers]
        : [{ key: '', value: '' }],
    );
    setParams(
      req.params && Array.isArray(req.params) && req.params.length > 0
        ? [...req.params]
        : [{ key: '', value: '', enabled: true }],
    );
    if (req.bodyType) setBodyType(req.bodyType as BodyType);
    if (req.body !== undefined) setBody(req.body);
    if (req.graphqlQuery !== undefined) setGraphqlQuery(req.graphqlQuery);
    if (req.graphqlVariables !== undefined)
      setGraphqlVariables(req.graphqlVariables);
  };

  const handleSaveRequest = () => {
    if (!saveName) {
      window.alert('Please enter a name');
      return;
    }
    const newReq: RequestItemType = {
      id: Date.now().toString(),
      type: 'request',
      name: saveName,
      method,
      url,
      requestType,
      headers: [...headers],
      params: [...params],
      bodyType,
      body,
      graphqlQuery,
      graphqlVariables,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const targetId =
      selectedCollectionId ||
      (collections.length > 0 ? collections[0].id : null);
    if (!targetId) {
      window.alert('No collection available. Create one first.');
      return;
    }
    const next = [...collections];
    const addTo = (items: (RequestItemType | FolderItemType)[]) => {
      for (const item of items) {
        if (item.type === 'folder' && item.id === targetId) {
          item.children = [...item.children, newReq];
          return true;
        }
        if (item.type === 'folder' && addTo(item.children)) return true;
      }
      return false;
    };
    if (
      addTo(next) ||
      (next.length > 0 && (next[0].children = [...next[0].children, newReq]))
    ) {
      setCollections(next);
      setSelectedRequest(newReq.id);
      setSaveModalOpen(false);
      setSaveName('');
    }
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    setCollections([
      ...collections,
      {
        id: Date.now().toString(),
        type: 'folder',
        name: newCollectionName.trim(),
        children: [],
      },
    ]);
    setNewCollectionName('');
    setNewCollectionModalOpen(false);
  };

  const handleCreateNewRequest = () => {
    const newReq: RequestItemType = {
      id: Date.now().toString(),
      type: 'request',
      name: 'New Request',
      method: 'GET',
      url: '',
      requestType: 'rest',
    };
    if (collections.length > 0) {
      const next = [...collections];
      next[0].children = [...next[0].children, newReq];
      setCollections(next);
      setMethod('GET');
      setUrl('');
      setHeaders([{ key: '', value: '' }]);
      setParams([{ key: '', value: '', enabled: true }]);
      setBodyType('none');
      setBody('');
      setGraphqlQuery('');
      setGraphqlVariables('');
      setSelectedRequest(newReq.id);
    } else {
      setNewCollectionModalOpen(true);
    }
  };

  const handleDelete = (id: string, type: 'folder' | 'request') => {
    if (type === 'request') {
      const next = [...collections];
      const idx = next[0]?.children.findIndex((r) => r.id === id);
      if (idx !== undefined && idx !== -1) {
        next[0].children.splice(idx, 1);
        setCollections(next);
        if (selectedRequest === id) setSelectedRequest(null);
      }
    } else if (type === 'folder') {
      setCollections(collections.filter((c) => c.id !== id));
    }
  };

  const renderResponse = () => {
    if (isLoading) {
      return (
        <Center className="py-10">
          <Stack gap="3" align="center">
            <Spinner size="lg" />
            <Text size="sm" tone="subtle">
              Sending request…
            </Text>
          </Stack>
        </Center>
      );
    }
    if (!response) {
      return (
        <EmptyState>
          <EmptyStateIcon>
            <Send size={36} aria-hidden />
          </EmptyStateIcon>
          <EmptyStateTitle>No response yet</EmptyStateTitle>
          <EmptyStateDescription>
            Send a request to see the response here.
          </EmptyStateDescription>
        </EmptyState>
      );
    }
    return (
      <Stack gap="3">
        <Inline justify="between" align="center" wrap gap="2">
          <Inline gap="2" align="center">
            <Badge
              variant="solid"
              tone={statusColor(response.status)}
              size="md"
            >
              {response.status} {response.statusText}
            </Badge>
            <Badge variant="soft" tone="neutral" size="sm">
              {response.time}ms
            </Badge>
          </Inline>
        </Inline>
        <Tabs
          value={activeResponseTab}
          onValueChange={(v) => setActiveResponseTab(v as 'body' | 'headers')}
          variant="line"
        >
          <TabsList aria-label="Response">
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="headers">
              <Inline gap="2" align="center">
                <span>Headers</span>
                <Badge variant="soft" tone="neutral" size="xs">
                  {Object.keys(response.headers).length}
                </Badge>
              </Inline>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="body">
            <Box className="pt-3">
              <Code block>
                {typeof response.data === 'string'
                  ? response.data
                  : JSON.stringify(response.data, null, 2)}
              </Code>
            </Box>
          </TabsContent>
          <TabsContent value="headers">
            <Box className="pt-3">
              <Stack gap="1">
                {Object.entries(response.headers).map(([k, v]) => (
                  <Inline key={k} justify="between" align="start" gap="2" wrap>
                    <Text size="sm" weight="medium">
                      {k}
                    </Text>
                    <Code>{v}</Code>
                  </Inline>
                ))}
              </Stack>
            </Box>
          </TabsContent>
        </Tabs>
      </Stack>
    );
  };

  const requestForm = (
    <Stack gap="4">
      <Inline gap="2" align="center" wrap>
        <Box className="min-w-32">
          <Select
            value={method}
            onValueChange={setMethod}
            items={METHOD_OPTIONS}
            aria-label="HTTP method"
          />
        </Box>
        <Box className="min-w-0 flex-1">
          <Input
            value={url}
            onChange={setUrl}
            placeholder="https://api.example.com/endpoint"
            leadingSlot={<Globe size={14} aria-hidden />}
            aria-label="Request URL"
          />
        </Box>
        <Button
          variant="solid"
          loading={isLoading}
          leftIcon={<Send size={14} />}
          onClick={sendRequest}
        >
          Send
        </Button>
      </Inline>

      <Tabs
        value={activeRequestTab}
        onValueChange={(v) =>
          setActiveRequestTab(v as 'params' | 'headers' | 'body')
        }
        variant="line"
      >
        <TabsList aria-label="Request sections">
          <TabsTrigger value="params">Params</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">
            {requestType === 'graphql' ? 'GraphQL' : 'Body'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="params">
          <Box className="pt-3">
            <Stack gap="2">
              {params.map((p, idx) => (
                <Inline key={idx} gap="2" align="center" wrap>
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={(c) => updateParam(idx, 'enabled', c)}
                    aria-label="Enabled"
                  />
                  <Box className="min-w-0 flex-1">
                    <Input
                      value={p.key}
                      onChange={(v) => updateParam(idx, 'key', v)}
                      placeholder="Key"
                    />
                  </Box>
                  <Box className="min-w-0 flex-1">
                    <Input
                      value={p.value}
                      onChange={(v) => updateParam(idx, 'value', v)}
                      placeholder="Value"
                    />
                  </Box>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label="Remove parameter"
                    icon={<Trash2 size={14} />}
                    onClick={() => removeParam(idx)}
                  />
                </Inline>
              ))}
              <Button
                variant="soft"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={addParam}
              >
                Add parameter
              </Button>
            </Stack>
          </Box>
        </TabsContent>

        <TabsContent value="headers">
          <Box className="pt-3">
            <Stack gap="2">
              {headers.map((h, idx) => (
                <Inline key={idx} gap="2" align="center" wrap>
                  <Box className="min-w-0 flex-1">
                    <Input
                      value={h.key}
                      onChange={(v) => updateHeader(idx, 'key', v)}
                      placeholder="Header"
                    />
                  </Box>
                  <Box className="min-w-0 flex-1">
                    <Input
                      value={h.value}
                      onChange={(v) => updateHeader(idx, 'value', v)}
                      placeholder="Value"
                    />
                  </Box>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label="Remove header"
                    icon={<Trash2 size={14} />}
                    onClick={() => removeHeader(idx)}
                  />
                </Inline>
              ))}
              <Button
                variant="soft"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={addHeader}
              >
                Add header
              </Button>
            </Stack>
          </Box>
        </TabsContent>

        <TabsContent value="body">
          <Box className="pt-3">
            {requestType === 'graphql' ? (
              <Stack gap="3">
                <Stack gap="2">
                  <Label>Query</Label>
                  <Textarea
                    value={graphqlQuery}
                    onChange={setGraphqlQuery}
                    placeholder={'query {\n  users { id name }\n}'}
                    rows={8}
                    aria-label="GraphQL query"
                  />
                </Stack>
                <Stack gap="2">
                  <Label>Variables (JSON)</Label>
                  <Textarea
                    value={graphqlVariables}
                    onChange={setGraphqlVariables}
                    placeholder='{ "id": 1 }'
                    rows={4}
                    aria-label="GraphQL variables"
                  />
                </Stack>
              </Stack>
            ) : (
              <Stack gap="3">
                <Stack gap="2">
                  <Label>Body type</Label>
                  <Select
                    value={bodyType}
                    onValueChange={(v) => setBodyType(v as BodyType)}
                    items={BODY_TYPE_OPTIONS}
                    aria-label="Body type"
                  />
                </Stack>
                {bodyType !== 'none' && (
                  <Stack gap="2">
                    <Label>Body</Label>
                    <Textarea
                      value={body}
                      onChange={setBody}
                      placeholder={
                        bodyType === 'json'
                          ? '{\n  "key": "value"\n}'
                          : bodyType === 'x-www-form-urlencoded'
                            ? 'key=value&another=value'
                            : 'Body content…'
                      }
                      rows={8}
                      aria-label="Request body"
                    />
                  </Stack>
                )}
              </Stack>
            )}
          </Box>
        </TabsContent>
      </Tabs>
    </Stack>
  );

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
                      variant="soft"
                      size="sm"
                      label="New request"
                      icon={<FilePlus size={14} />}
                      onClick={handleCreateNewRequest}
                    />
                    <IconButton
                      variant="soft"
                      size="sm"
                      label="New collection"
                      icon={<FolderPlus size={14} />}
                      onClick={() => setNewCollectionModalOpen(true)}
                    />
                  </Inline>
                </Inline>
              </CardHeader>
              <CardBody>
                <Stack gap="2">
                  {collections.length === 0 ? (
                    <Text size="sm" tone="subtle" className="text-center">
                      No collections yet. Click + to create one.
                    </Text>
                  ) : (
                    collections.map((c) => (
                      <CollectionItem
                        key={c.id}
                        item={c}
                        depth={0}
                        selectedRequest={selectedRequest}
                        onSelectRequest={handleSelectRequest}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </Stack>
              </CardBody>
            </Card>
          </Box>
        )}

        <Box className={sidebarActive ? 'lg:col-span-3' : undefined}>
          <Stack gap="4">
            <Inline justify="between" align="center" wrap gap="2">
              <ButtonGroup>
                <Button
                  variant={requestType === 'rest' ? 'solid' : 'soft'}
                  size="sm"
                  onClick={() => setRequestType('rest')}
                >
                  REST
                </Button>
                <Button
                  variant={requestType === 'graphql' ? 'solid' : 'soft'}
                  size="sm"
                  onClick={() => setRequestType('graphql')}
                >
                  GraphQL
                </Button>
              </ButtonGroup>
              <Inline gap="2">
                <Button
                  variant="soft"
                  size="sm"
                  leftIcon={<Save size={14} />}
                  onClick={() => setSaveModalOpen(true)}
                >
                  Save
                </Button>
                <Button
                  variant="soft"
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
                  <CardBody>{requestForm}</CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle as="h3">Response</CardTitle>
                  </CardHeader>
                  <CardBody>{renderResponse()}</CardBody>
                </Card>
              </Stack>
            ) : (
              <Card>
                <CardBody>
                  <EmptyState>
                    <EmptyStateIcon>
                      <Globe size={48} aria-hidden />
                    </EmptyStateIcon>
                    <EmptyStateTitle>No request selected</EmptyStateTitle>
                    <EmptyStateDescription>
                      Pick a request from a collection or create a new one to
                      get started.
                    </EmptyStateDescription>
                    <EmptyStateActions>
                      <Button
                        variant="solid"
                        leftIcon={<FilePlus size={14} />}
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

      <Dialog
        open={saveModalOpen}
        onOpenChange={(open) => setSaveModalOpen(open)}
      >
        <DialogHeader>
          <DialogTitle>Save request</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Stack gap="3">
            <Stack gap="2">
              <Label htmlFor="save-name">Name</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={setSaveName}
                placeholder="My request"
              />
            </Stack>
            <Stack gap="2">
              <Label>Collection</Label>
              <Select
                value={selectedCollectionId}
                onValueChange={setSelectedCollectionId}
                items={[
                  { value: '', label: 'Select a collection' },
                  ...collections.map((c) => ({ value: c.id, label: c.name })),
                ]}
                aria-label="Collection"
              />
            </Stack>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button variant="soft" onClick={() => setSaveModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" onClick={handleSaveRequest}>
            Save
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={newCollectionModalOpen}
        onOpenChange={(open) => setNewCollectionModalOpen(open)}
      >
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Stack gap="3">
            <Stack gap="2">
              <Label htmlFor="coll-name">Name</Label>
              <Input
                id="coll-name"
                value={newCollectionName}
                onChange={setNewCollectionName}
                placeholder="My collection"
              />
            </Stack>
          </Stack>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="soft"
            onClick={() => setNewCollectionModalOpen(false)}
          >
            Cancel
          </Button>
          <Button variant="solid" onClick={handleCreateCollection}>
            Create
          </Button>
        </DialogFooter>
      </Dialog>
    </Box>
  );
};

export default ApiTester;
