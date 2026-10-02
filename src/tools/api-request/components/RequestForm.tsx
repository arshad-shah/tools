import React from 'react';
import { IconGlobe, IconSend } from '@/shared/ui/icons';

import {
  Box,
  Button,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/shared/ui';
import type { BodyType, RequestTab } from '../types';
import type { RequestDraftApi } from '../hooks/useRequestDraft';
import { KeyValueEditor } from './KeyValueEditor';

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

interface RequestFormProps {
  editor: RequestDraftApi;
  isLoading: boolean;
  onSend: () => void;
  onCancel: () => void;
  activeRequestTab: RequestTab;
  setActiveRequestTab: (tab: RequestTab) => void;
}

/** Method/URL bar plus the params, headers and body tabs. */
export const RequestForm: React.FC<RequestFormProps> = ({
  editor,
  isLoading,
  onSend,
  onCancel,
  activeRequestTab,
  setActiveRequestTab,
}) => {
  const { draft, setField } = editor;
  const {
    requestType,
    method,
    url,
    params,
    headers,
    bodyType,
    body,
    graphqlQuery,
    graphqlVariables,
  } = draft;
  return (
    <Stack gap="4">
      <Inline gap="2" align="center" wrap>
        <Box className="min-w-32">
          <Select
            value={method}
            onValueChange={(v) => setField('method', v)}
            items={METHOD_OPTIONS}
            aria-label="HTTP method"
          />
        </Box>
        <Box className="min-w-0 flex-1">
          <Input
            value={url}
            onChange={(v) => setField('url', v)}
            placeholder="https://api.example.com/endpoint"
            leadingSlot={<IconGlobe size="sm" />}
            aria-label="Request URL"
          />
        </Box>
        <Button
          variant="primary"
          loading={isLoading}
          leftIcon={<IconSend size="sm" />}
          onClick={onSend}
        >
          Send
        </Button>
        {isLoading && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </Inline>

      <Tabs
        value={activeRequestTab}
        onValueChange={(v) => setActiveRequestTab(v as RequestTab)}
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
            <KeyValueEditor
              rows={params}
              keyPlaceholder="Key"
              removeLabel="Remove parameter"
              addLabel="Add parameter"
              onAdd={editor.addParam}
              onRemove={editor.removeParam}
              onChange={editor.updateParam}
              onToggle={(idx, c) => editor.updateParam(idx, 'enabled', c)}
            />
          </Box>
        </TabsContent>

        <TabsContent value="headers">
          <Box className="pt-3">
            <KeyValueEditor
              rows={headers}
              keyPlaceholder="Header"
              removeLabel="Remove header"
              addLabel="Add header"
              onAdd={editor.addHeader}
              onRemove={editor.removeHeader}
              onChange={editor.updateHeader}
            />
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
                    onChange={(v) => setField('graphqlQuery', v)}
                    placeholder={'query {\n  users { id name }\n}'}
                    rows={8}
                    aria-label="GraphQL query"
                  />
                </Stack>
                <Stack gap="2">
                  <Label>Variables (JSON)</Label>
                  <Textarea
                    value={graphqlVariables}
                    onChange={(v) => setField('graphqlVariables', v)}
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
                    onValueChange={(v) => setField('bodyType', v as BodyType)}
                    items={BODY_TYPE_OPTIONS}
                    aria-label="Body type"
                  />
                </Stack>
                {bodyType !== 'none' && (
                  <Stack gap="2">
                    <Label>Body</Label>
                    <Textarea
                      value={body}
                      onChange={(v) => setField('body', v)}
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
};
