import {
  Button,
  Dialog,
  Menu,
  Notice,
  Select,
  Stack,
} from '@arshad-shah/cynosure';
import { chevronDown, fileJson } from '@arshad-shah/cynosure/icons';
import { useState } from 'react';
import {
  inferMockSchema,
  type MockSchema,
} from '@/shared/lib/data-formats/mock-schema';
import { saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { CodeSurface } from '@/shared/ui';
import {
  isPresetId,
  PRESET_IDS,
  PRESET_LABEL,
  PRESETS,
  type PresetId,
} from '../lib/presets';
import { schemaFromJson, schemaToJson } from '../lib/schema-io';

type Mode = 'import' | 'infer' | null;

const SAMPLE = JSON.stringify(
  [
    { id: 1, email: 'ada@example.com', plan: 'pro', joined: '2024-01-05' },
    { id: 2, email: 'bob@example.org', plan: 'free', joined: '2023-12-31' },
  ],
  null,
  2,
);

interface SchemaIOProps {
  schema: MockSchema;
  lastPreset: PresetId | null;
  onSchema(schema: MockSchema, preset: PresetId | null): void;
}

/** The preset picker: a starting schema for the common shapes. */
export function PresetPicker({
  lastPreset,
  onSchema,
}: Omit<SchemaIOProps, 'schema'>) {
  return (
    <Select
      label="Preset"
      value={lastPreset ?? 'custom'}
      onChange={(v) => isPresetId(v) && onSchema(PRESETS[v], v)}
      options={[
        { value: 'custom', label: 'Custom', disabled: true },
        ...PRESET_IDS.map((p) => ({ value: p, label: PRESET_LABEL[p] })),
      ]}
    />
  );
}

/** Schema import and export, and inference from a JSON sample. */
export function SchemaIO({ schema, onSchema }: SchemaIOProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<ToolError | null>(null);

  const open = (m: Mode) => {
    setText(m === 'infer' ? SAMPLE : '');
    setError(null);
    setMode(m);
  };
  const apply = () => {
    try {
      const next =
        mode === 'infer'
          ? inferMockSchema(JSON.parse(text) as unknown)
          : schemaFromJson(text);
      onSchema(next, null);
      setMode(null);
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? toToolError(new Error(`This is not valid JSON: ${e.message}`))
          : toToolError(e),
      );
    }
  };

  return (
    <>
      <Menu
        label="Schema"
        items={[
          { value: 'infer', label: 'Infer from JSON sample' },
          { value: 'import', label: 'Import schema' },
          { value: 'export', label: 'Export schema' },
        ]}
        onSelect={(v) =>
          v === 'export'
            ? saveBlob(
                new TextEncoder().encode(schemaToJson(schema)),
                'mock-schema.json',
                'application/json',
              )
            : open(v as Mode)
        }
        trigger={(props) => (
          <Button
            {...props}
            size="sm"
            variant="soft"
            icon={fileJson}
            iconEnd={chevronDown}
          >
            Schema
          </Button>
        )}
      />
      {mode ? (
        <Dialog
          open
          onOpenChange={(o) => !o && setMode(null)}
          size="lg"
          title={
            mode === 'infer' ? 'Infer a schema from JSON' : 'Import a schema'
          }
          actions={
            <>
              <Button variant="ghost" onClick={() => setMode(null)}>
                Cancel
              </Button>
              <Button variant="solid" onClick={apply} disabled={!text.trim()}>
                {mode === 'infer' ? 'Use inferred schema' : 'Import'}
              </Button>
            </>
          }
        >
          <Stack gap="3">
            <CodeSurface
              label={mode === 'infer' ? 'JSON sample' : 'Schema JSON'}
              value={text}
              onChange={setText}
              language="json"
              minHeight={240}
              maxHeight={420}
            />
            {error && <Notice tone="danger">{error.message}</Notice>}
          </Stack>
        </Dialog>
      ) : null}
    </>
  );
}
