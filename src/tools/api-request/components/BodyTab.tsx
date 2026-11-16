import { useMemo } from 'react';
import {
  JsonLocateError,
  parseJsonWithLocations,
} from '@/shared/lib/data-formats/json-locate';
import {
  FileDrop,
  KeyValueEditor,
  Select,
  Stack,
  Text,
  TextArea,
  TextField,
} from '@arshad-shah/cynosure';
import { formatBytes } from '@/shared/lib/format';
import { fromPairs, toPairs } from '../lib/kv';
import type { BodyKind, HttpRequest, RequestBody } from '../lib/model';

const KINDS: { value: BodyKind; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'form-data', label: 'Form data' },
  { value: 'urlencoded', label: 'URL encoded' },
  { value: 'raw', label: 'Raw' },
  { value: 'binary', label: 'File' },
];

/** Where JSON text breaks, in words (nothing for valid or templated text). */
function jsonError(text: string): string | undefined {
  if (!text.trim() || text.includes('{{')) return undefined;
  try {
    parseJsonWithLocations(text);
    return undefined;
  } catch (e) {
    const loc = e instanceof JsonLocateError ? e : null;
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return `Line ${loc?.line ?? 1}, column ${loc?.column ?? 1}: ${message}`;
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
  const bodyError = useMemo(
    () => (b.kind === 'json' ? jsonError(b.text) : undefined),
    [b.kind, b.text],
  );

  if (request.mode === 'graphql')
    return (
      <Stack gap="4">
        <TextArea
          label="GraphQL query"
          rows={8}
          maxRows={20}
          spellCheck={false}
          value={request.graphql.query}
          onChange={(query) =>
            onChange({ ...request, graphql: { ...request.graphql, query } })
          }
          placeholder="query { items { id } }"
        />
        <TextArea
          label="GraphQL variables (JSON)"
          rows={4}
          maxRows={12}
          spellCheck={false}
          value={request.graphql.variables}
          onChange={(variables) =>
            onChange({ ...request, graphql: { ...request.graphql, variables } })
          }
          error={jsonError(request.graphql.variables)}
        />
      </Stack>
    );

  const noBody = request.method === 'GET' || request.method === 'HEAD';
  return (
    <Stack gap="4">
      <Select
        label="Body type"
        value={b.kind}
        onChange={(kind) => set({ kind: kind as BodyKind })}
        options={KINDS}
      />
      {noBody && b.kind !== 'none' ? (
        <Text size="sm" tone="muted">
          {`${request.method} requests are sent without a body.`}
        </Text>
      ) : null}
      {b.kind === 'json' ? (
        <TextArea
          label="JSON body"
          rows={8}
          maxRows={24}
          spellCheck={false}
          value={b.text}
          onChange={(text) => set({ text })}
          error={bodyError}
        />
      ) : null}
      {b.kind === 'raw' ? (
        <Stack gap="4">
          <TextField
            label="Content type"
            value={b.contentType}
            onChange={(contentType) => set({ contentType })}
            placeholder="text/plain"
            spellCheck={false}
          />
          <TextArea
            label="Raw body"
            rows={8}
            maxRows={24}
            spellCheck={false}
            value={b.text}
            onChange={(text) => set({ text })}
          />
        </Stack>
      ) : null}
      {b.kind === 'form-data' || b.kind === 'urlencoded' ? (
        <KeyValueEditor
          label={
            b.kind === 'form-data' ? 'Form data fields' : 'URL encoded fields'
          }
          pairs={toPairs(b.form)}
          onChange={(pairs) => set({ form: fromPairs(pairs, b.form) })}
          allowFiles={b.kind === 'form-data'}
          labels={{ key: 'Field' }}
        />
      ) : null}
      {b.kind === 'binary' ? (
        <Stack gap="2">
          <FileDrop
            size="sm"
            multiple={false}
            value={b.file ? [b.file] : []}
            onFiles={(f) => f[0] && set({ file: f[0] })}
            onRemove={() => set({ file: null })}
            labels={{
              prompt: 'Drop the file to send as the body',
              chooseOne: b.file ? 'Change file' : 'Choose file',
            }}
          />
          {b.file ? (
            <Text size="sm" tone="muted">
              {`${b.file.name} (${formatBytes(b.file.size)})`}
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
