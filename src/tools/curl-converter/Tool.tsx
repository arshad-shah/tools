import {
  Button,
  Card,
  EmptyState,
  Notice,
  SegmentedControl,
  Stack,
} from '@arshad-shah/cynosure';
import { send, sparkles, terminal } from '@arshad-shah/cynosure/icons';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextSourceActions } from '@/app/ui/text-source';
import { ToolActions, TransformLayout } from '@/app/ui/transform';
import { CodeEditor } from '@/shared/editor';
import { useClipboard } from '@/shared/lib/clipboard';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { sendTo } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import { BuilderForm } from './components/BuilderForm';
import { CodeOutput } from './components/CodeOutput';
import { ParseReport, RequestSummary } from './components/ParseReport';
import { curlFromHandoff, toHttpClient } from './lib/actions';
import {
  emptyBuilder,
  fromBuilder,
  toBuilder,
  type BuilderState,
} from './lib/builder';
import { toCurl } from './lib/gen-curl';
import { parseCurl, type ParsedCurl } from './lib/parse';
import { isTargetId, targetById } from './lib/targets';
import { curlSettings } from './settings';

const TOOL_ID = 'curl-converter';
const MAX_BYTES = 2 * 1024 * 1024;

const SAMPLE = `curl 'https://api.example.com/v1/users?team=core' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  --data-raw '{"name":"Ada Lovelace","languages":["en","fr"]}' \\
  --compressed -s`;

type Mode = 'paste' | 'build';
type Parsed =
  | { ok: true; value: ParsedCurl }
  | { ok: false; error: ToolError | null };

function parse(text: string): Parsed {
  if (!text.trim()) return { ok: false, error: null };
  try {
    return { ok: true, value: parseCurl(text) };
  } catch (e) {
    return { ok: false, error: toToolError(e, 'Could not read the command') };
  }
}

/**
 * curl Converter (transform pattern): a curl command in, code out in the
 * chosen language, with every option it could not carry over listed. The
 * Build tab goes the other way, from a form to a curl command.
 */
export default function CurlConverter() {
  const navigate = useNavigate();
  const [settings, update] = curlSettings.useSettings();
  const target = targetById(
    isTargetId(settings.target) ? settings.target : 'fetch',
  );
  const [mode, setMode] = useState<Mode>('paste');
  const [text, setText] = useState('');
  const [builder, setBuilder] = useState<BuilderState>(emptyBuilder);
  const { copy } = useClipboard();

  const parsed = useMemo(() => parse(text), [text]);
  const request =
    mode === 'paste'
      ? parsed.ok
        ? parsed.value.request
        : null
      : (() => {
          const r = fromBuilder(builder);
          return /^[a-z][a-z0-9+.-]*:\/\/[^/?#\s]/i.test(r.url) ? r : null;
        })();
  const output = useMemo(
    () => (request ? target.generate(request) : null),
    [request, target],
  );

  const changeMode = (next: string) => {
    if (next === 'build') {
      setBuilder(parsed.ok ? toBuilder(parsed.value.request) : emptyBuilder());
    } else if (request) setText(toCurl(request));
    setMode(next as Mode);
  };

  const sendHttp = () =>
    request && sendTo(navigate, 'api-request', toHttpClient(request));

  useSendCommands(TOOL_ID, [
    { target: 'api-request', run: sendHttp, enabled: !!request },
  ]);
  useToolCommands(TOOL_ID, [
    {
      id: 'copy',
      label: 'Copy the code',
      shortcut: 'Mod+Shift+C',
      enabled: !!output,
      run: () => output && void copy(output.code),
    },
    {
      id: 'clear',
      label: 'Clear',
      shortcut: 'Mod+Shift+X',
      run: () => {
        setText('');
        setBuilder(emptyBuilder());
      },
    },
    {
      id: 'sample',
      label: 'Load sample',
      run: () => {
        setMode('paste');
        setText(SAMPLE);
      },
    },
  ]);

  const input = (
    <Card
      as="section"
      title="Request"
      actions={
        <SegmentedControl
          label="Input"
          size="sm"
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'paste', label: 'curl command' },
            { value: 'build', label: 'Build' },
          ]}
        />
      }
    >
      {mode === 'paste' ? (
        <Stack gap="5">
          <CodeEditor
            aria-label="curl command"
            placeholder="Paste a curl command, for example from your browser's network panel (Copy as cURL, bash or cmd)."
            value={text}
            onChange={setText}
            wrap
            minHeight={160}
            maxHeight={420}
          />
          {parsed.ok === false && parsed.error ? (
            <Notice tone="danger" title="Cannot convert">
              {parsed.error.message}
            </Notice>
          ) : null}
          <TextSourceActions
            value={text}
            onChange={setText}
            label="Command"
            maxBytes={MAX_BYTES}
            handoff={(p) => curlFromHandoff(p) !== null}
          />
          {parsed.ok ? (
            <Stack gap="4">
              <ParseReport
                ignored={parsed.value.ignored}
                warnings={parsed.value.warnings}
              />
              <RequestSummary request={parsed.value.request} />
            </Stack>
          ) : null}
        </Stack>
      ) : (
        <BuilderForm value={builder} onChange={setBuilder} />
      )}
    </Card>
  );

  const end = (
    <Card as="section" title="Code">
      {output ? (
        <CodeOutput
          target={target}
          onTarget={(id) => update({ target: id })}
          output={output}
        />
      ) : (
        <EmptyState
          icon={terminal}
          title={mode === 'build' ? 'Add a URL' : 'No command yet'}
          description={
            mode === 'build'
              ? 'Fill in the URL (with http:// or https://) to see the curl command and the code.'
              : 'Paste a curl command to convert it to fetch, axios, Python, Go, PHP or HTTPie. Options that cannot be carried over are listed.'
          }
          actions={
            mode === 'paste' ? (
              <Button
                variant="soft"
                icon={sparkles}
                onClick={() => setText(SAMPLE)}
              >
                Try an example
              </Button>
            ) : undefined
          }
        />
      )}
    </Card>
  );

  return (
    <Stack gap="6">
      {request ? (
        <ToolActions>
          <Button variant="soft" icon={send} onClick={sendHttp}>
            Send to HTTP Client
          </Button>
        </ToolActions>
      ) : null}
      <TransformLayout start={input} end={end} defaultSize={48} />
    </Stack>
  );
}
