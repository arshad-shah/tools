import {
  Badge,
  CodeBlock,
  Inline,
  SegmentedControl,
  Stack,
  Table,
  Text,
} from '@arshad-shah/cynosure';
import { useMemo, useState } from 'react';
import { exampleFor, typeLabel } from '../lib/example';
import { deref } from '../lib/refs';
import { schemaRows } from '../lib/schema-rows';

type View = 'fields' | 'example' | 'schema';

interface Props {
  doc: unknown;
  schema: unknown;
  /** An example the document gives; else one is made from the schema. */
  example?: unknown;
  hasExample?: boolean;
  /** Request bodies leave readOnly properties out of the example. */
  direction: 'request' | 'response';
  /** Names the controls ("Request body", "200 response"). */
  label: string;
}

const json = (v: unknown) => JSON.stringify(v, null, 2) ?? 'null';

/** A schema as its fields, an example value or the resolved schema. */
export function SchemaView({
  doc,
  schema,
  example,
  hasExample,
  direction,
  label,
}: Props) {
  const rows = useMemo(() => schemaRows(doc, schema), [doc, schema]);
  const [view, setView] = useState<View>(
    rows.rows.length ? 'fields' : 'example',
  );
  const exampleText = useMemo(
    () =>
      view === 'example'
        ? hasExample
          ? typeof example === 'string'
            ? example
            : json(example)
          : json(
              exampleFor(doc, schema, {
                skip: direction === 'request' ? 'readOnly' : 'writeOnly',
              }),
            )
        : '',
    [view, hasExample, example, doc, schema, direction],
  );
  const schemaText = useMemo(
    () => (view === 'schema' ? json(deref(doc, schema)) : ''),
    [view, doc, schema],
  );

  return (
    <Stack gap="3">
      <SegmentedControl
        label={`${label} view`}
        size="sm"
        value={view}
        onChange={(v) => setView(v as View)}
        options={[
          { value: 'fields', label: 'Fields', disabled: !rows.rows.length },
          {
            value: 'example',
            label: hasExample ? 'Example' : 'Generated example',
          },
          { value: 'schema', label: 'Schema' },
        ]}
      />
      {view === 'fields' ? (
        <Stack gap="2">
          <Table
            caption={`${label} fields`}
            captionHidden
            size="sm"
            getRowId={(r) => r.path}
            rows={rows.rows}
            columns={[
              {
                key: 'path',
                header: 'Field',
                rowHeader: true,
                cell: (r) => (
                  <Text size="sm" variant="code" wrap="break">
                    {r.path}
                  </Text>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                cell: (r) => (
                  <Inline gap="2" align="center" wrap>
                    <Text size="sm">{r.type}</Text>
                    {r.required ? (
                      <Badge size="sm" tone="warning">
                        required
                      </Badge>
                    ) : null}
                  </Inline>
                ),
              },
              {
                key: 'description',
                header: 'Description',
                cell: (r) => (
                  <Stack gap="1">
                    {r.description ? (
                      <Text size="sm">{r.description}</Text>
                    ) : null}
                    {r.notes.length ? (
                      <Text size="sm" tone="muted">
                        {r.notes.join('. ')}
                      </Text>
                    ) : null}
                  </Stack>
                ),
              },
            ]}
          />
          {rows.truncated ? (
            <Text size="sm" tone="muted">
              Only the first {rows.rows.length} fields are listed; the Schema
              view has them all.
            </Text>
          ) : null}
        </Stack>
      ) : null}
      {view === 'example' ? (
        <CodeBlock
          title={hasExample ? 'Example' : 'Generated example'}
          code={exampleText}
          language="json"
          wrap
          maxLines={40}
        />
      ) : null}
      {view === 'schema' ? (
        <CodeBlock
          title={typeLabel(doc, schema)}
          code={schemaText}
          language="json"
          wrap
          maxLines={40}
        />
      ) : null}
    </Stack>
  );
}
