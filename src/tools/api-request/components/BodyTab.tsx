import { useMemo } from 'react';
import {
  JsonLocateError,
  parseJsonWithLocations,
} from '@/shared/lib/data-formats/json-locate';
import { formatBytes } from '@/shared/lib/format';
import {
  Button,
  FilePicker,
  Inline,
  Input,
  KeyValueEditor,
  Label,
  SegmentedControl,
  Stack,
  Text,
  TextInputPanel,
  type CodeMarker,
} from '@/shared/ui';
import { IconFileUp } from '@/shared/ui/icons';
import type { BodyKind, HttpRequest, RequestBody } from '../lib/model';

const KINDS: { value: BodyKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: 'Form data' },
  { value: 'urlencoded', label: 'URL encoded' },
  { value: 'raw', label: 'Raw' },
  { value: 'binary', label: 'File' },
];

function jsonMarkers(text: string): CodeMarker[] {
  if (!text.trim() || text.includes('{{')) return [];
  try {
    parseJsonWithLocations(text);
    return [];
  } catch (e) {
    const loc = e instanceof JsonLocateError ? e : null;
    return [
      {
        line: loc?.line ?? 1,
        column: loc?.column ?? 1,
        message: e instanceof Error ? e.message : 'Invalid JSON',
        severity: 'error',
      },
    ];
  }
}

/** Every body kind, or GraphQL query and variables. */
export function BodyTab({
  request,
  onChange,
}: {
  request: HttpRequest;
  onChange(r: HttpRequest): void;
}) {
  const b = request.body;
  const set = (patch: Partial<RequestBody>) =>
    onChange({ ...request, body: { ...b, ...patch } });
  const markers = useMemo(
    () => (b.kind === 'json' ? jsonMarkers(b.text) : []),
    [b.kind, b.text],
  );

  if (request.mode === 'graphql')
    return (
      <Stack gap="3">
        <TextInputPanel
          label="GraphQL query"
          language="plain"
          value={request.graphql.query}
          onChange={(query) =>
            onChange({ ...request, graphql: { ...request.graphql, query } })
          }
          minHeight={160}
          placeholder="query { items { id } }"
        />
        <TextInputPanel
          label="GraphQL variables (JSON)"
          language="json"
          value={request.graphql.variables}
          onChange={(variables) =>
            onChange({ ...request, graphql: { ...request.graphql, variables } })
          }
          markers={jsonMarkers(request.graphql.variables)}
          minHeight={80}
        />
      </Stack>
    );

  const noBody = request.method === 'GET' || request.method === 'HEAD';
  return (
    <Stack gap="3">
      <SegmentedControl
        label="Body type"
        size="sm"
        value={b.kind}
        onChange={(kind) => set({ kind: kind as BodyKind })}
        options={KINDS}
      />
      {noBody && b.kind !== 'none' && (
        <Text size="sm" tone="muted">
          {request.method} requests are sent without a body.
        </Text>
      )}
      {b.kind === 'json' && (
        <TextInputPanel
          label="JSON body"
          language="json"
          value={b.text}
          onChange={(text) => set({ text })}
          markers={markers}
          minHeight={180}
        />
      )}
      {b.kind === 'raw' && (
        <Stack gap="2">
          <Stack gap="1">
            <Label htmlFor="body-type">Content type</Label>
            <Input
              id="body-type"
              value={b.contentType}
              onChange={(contentType) => set({ contentType })}
              placeholder="text/plain"
            />
          </Stack>
          <TextInputPanel
            label="Raw body"
            language="plain"
            value={b.text}
            onChange={(text) => set({ text })}
            minHeight={160}
          />
        </Stack>
      )}
      {(b.kind === 'form-data' || b.kind === 'urlencoded') && (
        <KeyValueEditor
          rows={b.form}
          onChange={(form) => set({ form })}
          allowFiles={b.kind === 'form-data'}
          ariaLabel={
            b.kind === 'form-data' ? 'Form data fields' : 'URL encoded fields'
          }
          keyLabel="Field"
        />
      )}
      {b.kind === 'binary' && (
        <Inline gap="2" align="center">
          <FilePicker onFiles={(f) => f[0] && set({ file: f[0] })}>
            {(open) => (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<IconFileUp size="sm" />}
                onClick={open}
              >
                {b.file ? 'Change file' : 'Choose file'}
              </Button>
            )}
          </FilePicker>
          <Text size="sm" tone="muted">
            {b.file
              ? `${b.file.name} (${formatBytes(b.file.size)})`
              : 'No file chosen'}
          </Text>
        </Inline>
      )}
    </Stack>
  );
}
