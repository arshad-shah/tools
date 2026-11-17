import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  IconButton,
  Inline,
  Menu,
  Notice,
  Select,
  Stack,
  TextField,
} from '@arshad-shah/cynosure';
import { download, fileJson, sparkles } from '@arshad-shah/cynosure/icons';
import { useDeferredValue, useMemo, useState } from 'react';
import { TextSourceActions } from '@/app/ui/text-source';
import { SendToMenu, ToolActions, TransformLayout } from '@/app/ui/transform';
import { useTextFile } from '@/app/ui/use-text-file';
import { CodeEditor } from '@/shared/editor';
import { useClipboard } from '@/shared/lib/clipboard';
import { deriveFilename, saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { useHandoffFiles, type HandoffPayload } from '@/shared/lib/handoff';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { OptionsPanel } from './components/OptionsPanel';
import {
  generate,
  TARGET_IDS,
  TARGETS,
  type GenerateOptions,
  type Generated,
} from './lib/generate';
import { JsonInputError } from './lib/parse-input';
import { SAMPLES } from './lib/samples';
import { jsonToTypesSettings, readOptions } from './settings';

const TOOL_ID = 'json-to-types';
const MAX_BYTES = 20 * 1024 * 1024;

const isJsonHandoff = (p: HandoffPayload) =>
  p.kind === 'text' && p.mime === 'application/json';

type Outcome =
  | { result: Generated | null; error: null }
  | { result: null; error: ToolError };

function run(text: string, opts: GenerateOptions): Outcome {
  try {
    return { result: generate(text, opts), error: null };
  } catch (e) {
    return { result: null, error: toToolError(e, 'Could not infer types') };
  }
}

const plural = (n: number, word: string) =>
  `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

/**
 * JSON to Types (transform pattern): sample JSON in, types out in the chosen
 * language. Inference runs as you type; options persist, the JSON never.
 */
export default function JsonToTypes() {
  const [stored, update] = jsonToTypesSettings.useSettings();
  const options = useMemo(() => readOptions(stored), [stored]);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | undefined>();
  const deferred = useDeferredValue(text);
  const { result, error } = useMemo(
    () => run(deferred, options),
    [deferred, options],
  );
  const { copy } = useClipboard();
  const target = TARGETS[options.target];

  const changeText = (v: string) => {
    setText(v);
    if (!v) setFileName(undefined);
  };

  // A JSON file dropped on the Data hub.
  const { open } = useTextFile({ onChange: changeText, maxBytes: MAX_BYTES });
  useHandoffFiles((files) => {
    if (files[0]) {
      setFileName(files[0].name);
      void open(files[0]);
    }
  });

  const base =
    (fileName ?? options.rootName).replace(/\.[^.]+$/, '') || 'types';
  const outName = deriveFilename(base, '', target.ext);
  const save = () =>
    result &&
    saveBlob(
      new Blob([result.code], { type: `${target.mime};charset=utf-8` }),
      outName,
    );

  useToolCommands(TOOL_ID, [
    {
      id: 'copy',
      label: 'Copy types',
      shortcut: 'Mod+Shift+C',
      run: () => result && void copy(result.code),
      enabled: !!result,
    },
    {
      id: 'download',
      label: 'Download types',
      shortcut: 'Mod+Shift+D',
      run: () => void save(),
      enabled: !!result,
    },
    {
      id: 'clear',
      label: 'Clear',
      shortcut: 'Mod+Shift+X',
      run: () => changeText(''),
    },
    {
      id: 'sample',
      label: 'Load sample',
      run: () => changeText(SAMPLES[0].value),
    },
  ]);

  const examples = (
    <Menu
      label="Try an example"
      items={SAMPLES.map((s) => ({ value: s.label, label: s.label }))}
      onSelect={(v) =>
        changeText(SAMPLES.find((s) => s.label === v)?.value ?? '')
      }
      trigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={sparkles}>
          Try an example
        </Button>
      )}
    />
  );

  const parseError = error instanceof JsonInputError ? error : null;
  const diagnostics = parseError
    ? [
        {
          line: parseError.line,
          column: parseError.column,
          message: parseError.reason,
          severity: 'error' as const,
        },
      ]
    : undefined;

  const inputCard = (
    <Card as="section" title="JSON">
      <Stack gap="5">
        <CodeEditor
          aria-label="JSON input"
          language="json"
          placeholder="Paste JSON, JSON lines or several samples, or open a file."
          value={text}
          onChange={changeText}
          diagnostics={diagnostics}
          minHeight={240}
          maxHeight={560}
        />
        {error ? (
          <Notice
            tone="danger"
            title={parseError ? 'Not valid JSON' : 'Could not infer types'}
          >
            {error.message}
          </Notice>
        ) : null}
        <TextSourceActions
          value={text}
          onChange={changeText}
          label="JSON"
          accept=".json,.jsonl,.ndjson,application/json,text/plain"
          maxBytes={MAX_BYTES}
          onFile={(file) => {
            setFileName(file.name);
          }}
          handoff={isJsonHandoff}
        >
          {examples}
        </TextSourceActions>
      </Stack>
    </Card>
  );

  const outputCard = (
    <Card
      as="section"
      title={target.label}
      actions={
        result ? (
          <Inline gap="2" align="center">
            <Badge tone="accent" size="sm">
              {`${plural(result.samples, 'sample')}, ${plural(result.model.objects.length, 'type')}`}
            </Badge>
            <CopyButton
              size="sm"
              value={result.code}
              labels={{ copy: 'Copy the types' }}
            />
            <IconButton
              size="sm"
              variant="ghost"
              tone="neutral"
              icon={download}
              label={`Download ${outName}`}
              onClick={save}
            />
          </Inline>
        ) : undefined
      }
    >
      {result ? (
        <CodeEditor
          aria-label={`${target.label} output`}
          language={target.editor}
          value={result.code}
          readOnly
          minHeight={240}
          maxHeight={640}
        />
      ) : (
        <EmptyState
          icon={fileJson}
          title={error ? 'Fix the JSON to see types' : 'No JSON yet'}
          description={
            error
              ? 'The problem is marked in the editor and described under it.'
              : 'Paste sample JSON. Several samples (JSON lines, or values one after another) are merged: keys missing from some become optional.'
          }
          actions={error ? undefined : examples}
        />
      )}
    </Card>
  );

  return (
    <Stack gap="6">
      <ToolActions>
        <SendToMenu
          sourceTool={TOOL_ID}
          payload={() =>
            result
              ? {
                  kind: 'text',
                  mime: target.mime,
                  text: result.code,
                  sourceTool: TOOL_ID,
                  filename: outName,
                }
              : null
          }
        />
      </ToolActions>
      <Inline gap="3" align="end" wrap>
        <Select
          label="Language"
          width="md"
          value={options.target}
          onChange={(v) => update({ target: v })}
          options={TARGET_IDS.map((id) => ({
            value: id,
            label: TARGETS[id].label,
          }))}
        />
        <TextField
          label="Root type name"
          width="sm"
          spellCheck={false}
          autoCapitalize="none"
          value={stored.rootName}
          placeholder="Root"
          onChange={(rootName) => update({ rootName })}
        />
        <OptionsPanel options={options} onChange={(patch) => update(patch)} />
      </Inline>
      <TransformLayout start={inputCard} end={outputCard} />
    </Stack>
  );
}
