import {
  Button,
  Card,
  EmptyState,
  Inline,
  Notice,
  SegmentedControl,
  SplitPane,
  Stack,
} from '@arshad-shah/cynosure';
import {
  plusCircle,
  share as shareIcon,
  table as tableIcon,
} from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import {
  MOCK_SCHEMA_MIME,
  parseMockSchema,
  type MockSchema,
  type MockTable,
} from '@/shared/lib/data-formats/mock-schema';
import { useClipboard } from '@/shared/lib/clipboard';
import { useHandoff } from '@/shared/lib/handoff';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import type { Json } from '@/shared/lib/tool-settings';
import { useMediaQuery } from '@/shared/lib/media-query';
import { FieldEditor } from './components/FieldEditor';
import { GeneratePanel } from './components/GeneratePanel';
import { newSeed } from './lib/seed';
import { OutputPanel } from './components/OutputPanel';
import { PresetPicker, SchemaIO } from './components/SchemaIO';
import { TableBar } from './components/TableBar';
import { useMockGenerator } from './hooks/useMockGenerator';
import type { PresetId } from './lib/presets';
import {
  addField,
  moveField,
  removeField,
  updateField,
  withIds,
} from './lib/schema';
import { schemaToJson } from './lib/schema-io';
import { mockSettings, readMockSettings } from './settings';
import {
  MOCK_SHARE_VERSION,
  parseMockShare,
  readSharedLink,
  type MockShare,
} from './share';
import type { FieldSchema } from './types';

const TOOL_ID = 'random-data-generator';

const withTableIds = (s: MockSchema): MockSchema => ({
  tables: s.tables.map((t) => ({ ...t, fields: withIds(t.fields) })),
});
const clean = (s: MockSchema): MockSchema =>
  JSON.parse(schemaToJson(s)) as MockSchema;

/** A schema from a hand-off (`application/vnd.tools.mock-schema+json`). */
function handedSchema(text: string): MockSchema | null {
  try {
    return parseMockSchema(JSON.parse(text));
  } catch {
    return null;
  }
}

export default function MockDataGenerator() {
  const handoff = useHandoff(
    (p) => p.kind === 'text' && p.mime === MOCK_SCHEMA_MIME,
  );
  const received = handoff?.kind === 'text' ? handedSchema(handoff.text) : null;
  // A hand-off arrives after mount: remount the editor with its schema.
  return (
    <Generator
      key={handoff ? 'handoff' : 'default'}
      received={received}
      receivedInvalid={handoff !== null && received === null}
    />
  );
}

function Generator({
  received,
  receivedInvalid,
}: {
  received: MockSchema | null;
  receivedInvalid: boolean;
}) {
  const [stored, update] = mockSettings.useSettings();
  const initial = readMockSettings(stored);
  const [link] = useState(readSharedLink);
  const [schema, setSchemaState] = useState<MockSchema>(() =>
    withTableIds(link?.schema ?? received ?? initial.schema),
  );
  const [lastPreset, setLastPreset] = useState<PresetId | null>(
    link || received ? null : initial.lastPreset,
  );
  const [active, setActive] = useState(0);
  const [seed, setSeed] = useState(link?.seed ?? '');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<string | null>(
    link
      ? 'Loaded from a shared link'
      : received
        ? 'Schema received from another tool'
        : null,
  );
  const job = useMockGenerator();
  const wide = useMediaQuery('(min-width: 1200px)');
  const [pane, setPane] = useState<'schema' | 'preview'>('schema');
  const { copy } = useClipboard();
  const [count, setCount] = useState(link?.count ?? initial.count);
  const [locale, setLocale] = useState(link?.locale ?? initial.locale);

  const setSchema = (next: MockSchema, preset: PresetId | null = null) => {
    setSchemaState(next);
    setLastPreset(preset);
    update({
      schema: next as unknown as Json,
      lastPreset: preset ?? '',
    });
  };
  const replaceSchema = (next: MockSchema, preset: PresetId | null) => {
    setSchema(withTableIds(next), preset);
    setActive(0);
    job.reset();
  };

  const share = useShareableState<MockShare>({
    toolId: TOOL_ID,
    version: MOCK_SHARE_VERSION,
    parse: parseMockShare,
    select: () => ({ v: 1, schema: clean(schema), seed, count, locale }),
  });
  const table = schema.tables[Math.min(active, schema.tables.length - 1)];
  const setFields = (fields: FieldSchema[]) =>
    setSchema(
      {
        tables: schema.tables.map((t) => (t === table ? { ...t, fields } : t)),
      },
      null,
    );

  const generate = () => {
    setPane('preview');
    void job.run(clean(schema), count, seed || null, locale);
  };

  useToolCommands(TOOL_ID, [
    {
      id: 'generate',
      label: 'Generate',
      shortcut: 'Mod+Enter',
      run: generate,
      enabled: job.status !== 'running',
    },
    {
      id: 'copy',
      label: 'Copy result as JSON',
      shortcut: 'Mod+Shift+C',
      run: () =>
        job.result &&
        void copy(
          JSON.stringify(Object.values(job.result.tables).at(-1), null, 2),
        ),
      enabled: job.result !== null,
    },
    {
      id: 'clear',
      label: 'Clear result',
      shortcut: 'Mod+Shift+X',
      run: job.reset,
    },
    { id: 'seed', label: 'New seed', run: () => setSeed(newSeed()) },
    {
      id: 'share',
      label: 'Copy share link',
      shortcut: 'Mod+Shift+S',
      run: () => void share.share(),
      enabled: share.canShare,
    },
  ]);

  const schemaPane = (
    <Card as="section" title="Schema" headingLevel={2} padding="sm">
      <Stack gap="4">
        <TableBar
          tables={schema.tables}
          active={Math.min(active, schema.tables.length - 1)}
          onActive={setActive}
          onTables={(tables: MockTable[]) =>
            setSchema(withTableIds({ tables }), null)
          }
        />
        <Stack gap="3">
          {table.fields.map((field, index) => (
            <FieldEditor
              key={field.id ?? index}
              field={field}
              index={index}
              parentPath=""
              level={0}
              expandedFields={expanded}
              totalFields={table.fields.length}
              tables={schema.tables}
              onRemoveField={(path) =>
                setFields(removeField(table.fields, path))
              }
              onUpdateField={(path, patch) =>
                setFields(updateField(table.fields, path, patch))
              }
              onMoveField={(path, dir) =>
                setFields(moveField(table.fields, path, dir))
              }
              onToggleExpanded={(key) =>
                setExpanded((e) => ({ ...e, [key]: !e[key] }))
              }
              onAddField={(parent) => setFields(addField(table.fields, parent))}
            />
          ))}
          <Button
            variant="soft"
            icon={plusCircle}
            onClick={() => setFields(addField(table.fields))}
            fullWidth
          >
            Add field
          </Button>
        </Stack>
      </Stack>
    </Card>
  );

  const previewPane = (
    <Card as="section" title="Preview" headingLevel={2} padding="sm">
      {job.error ? (
        <Notice tone="danger" title="Could not generate the data">
          {job.error.message}
        </Notice>
      ) : job.result ? (
        <OutputPanel tables={job.result.tables} />
      ) : (
        <EmptyState
          icon={tableIcon}
          title="No data yet"
          description="Generate to preview the rows here."
        />
      )}
    </Card>
  );

  return (
    <Stack gap="5">
      {receivedInvalid && (
        <Notice tone="danger">The schema handed over is not valid.</Notice>
      )}
      {note && (
        <Notice tone="info" dismissible onDismiss={() => setNote(null)}>
          {note}
        </Notice>
      )}
      <Card
        as="section"
        title="Generate"
        headingLevel={2}
        padding="sm"
        actions={
          <Inline gap="2">
            <SchemaIO
              schema={clean(schema)}
              lastPreset={lastPreset}
              onSchema={replaceSchema}
            />
            <Button
              size="sm"
              variant="soft"
              icon={shareIcon}
              disabled={!share.canShare}
              onClick={() =>
                void Promise.resolve(share.share()).catch(() => {})
              }
            >
              Share
            </Button>
          </Inline>
        }
      >
        <GeneratePanel
          preset={
            <PresetPicker lastPreset={lastPreset} onSchema={replaceSchema} />
          }
          count={count}
          onCount={(n) => {
            setCount(n);
            update({ count: n });
          }}
          seed={seed}
          onSeed={setSeed}
          locale={locale}
          onLocale={(l) => {
            setLocale(l);
            update({ locale: l });
          }}
          fieldCount={table.fields.length}
          running={job.status === 'running'}
          progress={job.progress}
          onGenerate={generate}
          onCancel={job.cancel}
        />
      </Card>
      {wide ? (
        <SplitPane
          label="Resize the schema and the preview"
          start={<Stack paddingInline="3">{schemaPane}</Stack>}
          end={<Stack paddingInline="3">{previewPane}</Stack>}
        />
      ) : (
        <Stack gap="4">
          <Inline>
            <SegmentedControl
              label="Pane"
              value={pane}
              onChange={(v) => setPane(v as typeof pane)}
              options={[
                { value: 'schema', label: 'Schema' },
                { value: 'preview', label: 'Preview' },
              ]}
            />
          </Inline>
          {pane === 'schema' ? schemaPane : previewPane}
        </Stack>
      )}
    </Stack>
  );
}
