import {
  Badge,
  Button,
  CopyButton,
  Disclosure,
  Heading,
  Inline,
  Select,
  Stack,
  Table,
  Text,
} from '@arshad-shah/cynosure';
import { send } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import type { MediaContent, Operation, Response } from '../lib/api';
import { typeLabel } from '../lib/example';
import { statusTone } from '../lib/tones';
import type { BuiltRequest } from '../lib/request';
import { toCurlCommand } from '../lib/request';
import { SchemaView } from './SchemaView';

function ContentView({
  doc,
  contents,
  direction,
  label,
}: {
  doc: unknown;
  contents: MediaContent[];
  direction: 'request' | 'response';
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const c = contents[Math.min(index, contents.length - 1)];
  if (!c) return null;
  return (
    <Stack gap="3">
      {contents.length > 1 ? (
        <Select
          label={`${label} media type`}
          width="md"
          value={String(index)}
          onChange={(v) => setIndex(Number(v))}
          options={contents.map((m, i) => ({
            value: String(i),
            label: m.mediaType,
          }))}
        />
      ) : (
        <Text size="sm" tone="muted">
          {c.mediaType}
        </Text>
      )}
      {c.schema !== undefined || c.hasExample ? (
        <SchemaView
          key={c.mediaType}
          doc={doc}
          schema={c.schema}
          example={c.example}
          hasExample={c.hasExample}
          direction={direction}
          label={label}
        />
      ) : null}
    </Stack>
  );
}

function ResponseView({
  doc,
  response: r,
}: {
  doc: unknown;
  response: Response;
}) {
  const head = (
    <Inline gap="2" align="center" wrap>
      <Badge size="sm" variant="solid" tone={statusTone(r.status)}>
        {r.status}
      </Badge>
      <Text size="sm">{r.description ?? ''}</Text>
    </Inline>
  );
  if (!r.contents.length) return head;
  return (
    <Disclosure summary={head} variant="line">
      <ContentView
        doc={doc}
        contents={r.contents}
        direction="response"
        label={`${r.status} response`}
      />
    </Disclosure>
  );
}

interface Props {
  doc: unknown;
  op: Operation;
  request: BuiltRequest;
  onSend(): void;
}

/** One operation: what it takes, what it returns, and a request to try. */
export function OperationDetail({ doc, op, request, onSend }: Props) {
  return (
    <Stack gap="5">
      {op.description ? <Text wrap="pre">{op.description}</Text> : null}
      <Inline gap="2" align="center" wrap>
        <Button size="sm" variant="soft" icon={send} onClick={onSend}>
          Send to HTTP Client
        </Button>
        <CopyButton
          size="sm"
          value={toCurlCommand(request)}
          labels={{ copy: 'Copy as curl' }}
        />
        {op.operationId ? (
          <Text size="sm" tone="muted" variant="code">
            {op.operationId}
          </Text>
        ) : null}
        {op.security.length ? (
          <Text size="sm" tone="muted">
            {`Auth: ${op.security.map((s) => s.name).join(', ')}`}
          </Text>
        ) : null}
      </Inline>
      {op.parameters.length ? (
        <Stack gap="2">
          <Heading level={4} size="sm">
            Parameters
          </Heading>
          <Table
            caption={`${op.id} parameters`}
            captionHidden
            size="sm"
            getRowId={(p) => `${p.in}:${p.name}`}
            rows={op.parameters}
            columns={[
              {
                key: 'name',
                header: 'Name',
                rowHeader: true,
                cell: (p) => (
                  <Inline gap="2" align="center" wrap>
                    <Text size="sm" variant="code" wrap="break">
                      {p.name}
                    </Text>
                    {p.required ? (
                      <Badge size="sm" tone="warning">
                        required
                      </Badge>
                    ) : null}
                  </Inline>
                ),
              },
              { key: 'in', header: 'In', cell: (p) => p.in },
              {
                key: 'type',
                header: 'Type',
                cell: (p) => typeLabel(doc, p.schema),
              },
              {
                key: 'description',
                header: 'Description',
                cell: (p) =>
                  `${p.deprecated ? 'Deprecated. ' : ''}${p.description ?? ''}`,
              },
            ]}
          />
        </Stack>
      ) : null}
      {op.requestBody ? (
        <Stack gap="2">
          <Heading level={4} size="sm">
            {`Request body${op.requestBody.required ? ' (required)' : ''}`}
          </Heading>
          {op.requestBody.description ? (
            <Text size="sm">{op.requestBody.description}</Text>
          ) : null}
          <ContentView
            doc={doc}
            contents={op.requestBody.contents}
            direction="request"
            label="Request body"
          />
        </Stack>
      ) : null}
      <Stack gap="2">
        <Heading level={4} size="sm">
          Responses
        </Heading>
        {op.responses.length ? (
          op.responses.map((r) => (
            <ResponseView key={r.status} doc={doc} response={r} />
          ))
        ) : (
          <Text size="sm" tone="muted">
            No responses are described.
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
