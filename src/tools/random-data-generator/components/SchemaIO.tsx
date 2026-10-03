import { useId, useState } from 'react';
import {
  inferMockSchema,
  type MockSchema,
} from '@/shared/lib/data-formats/mock-schema';
import { saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  Select,
  Stack,
  TextInputPanel,
} from '@/shared/ui';
import {
  IconChevronDown,
  IconDownload,
  IconFileJson,
  IconFileUp,
  IconSparkles,
} from '@/shared/ui/icons';
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
  const presetId = useId();
  return (
    <Stack gap="1">
      <Label htmlFor={presetId}>Preset</Label>
      <Select
        id={presetId}
        value={lastPreset ?? ''}
        onValueChange={(v) => isPresetId(v) && onSchema(PRESETS[v], v)}
        items={[
          { value: '', label: 'Custom' },
          ...PRESET_IDS.map((p) => ({ value: p, label: PRESET_LABEL[p] })),
        ]}
      />
    </Stack>
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
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<IconFileJson size="sm" />}
            rightIcon={<IconChevronDown size="sm" />}
          >
            Schema
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => open('infer')}>
            <IconSparkles size="sm" aria-hidden />
            Infer from JSON sample
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => open('import')}>
            <IconFileUp size="sm" aria-hidden />
            Import schema
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              saveBlob(
                new TextEncoder().encode(schemaToJson(schema)),
                'mock-schema.json',
                'application/json',
              )
            }
          >
            <IconDownload size="sm" aria-hidden />
            Export schema
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={mode !== null}
        onOpenChange={(o) => !o && setMode(null)}
        size="lg"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'infer' ? 'Infer a schema from JSON' : 'Import a schema'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <TextInputPanel
            label={mode === 'infer' ? 'JSON sample' : 'Schema JSON'}
            value={text}
            onChange={setText}
            language="json"
            accept=".json,application/json"
            minHeight={240}
            maxHeight={420}
          />
          {error && (
            <Alert status="danger" className="mt-3">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setMode(null)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!text.trim()}>
            {mode === 'infer' ? 'Use inferred schema' : 'Import'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
