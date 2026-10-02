import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LanguageId } from '@/shared/lib/syntax/tokenize';
import { copyText } from '@/shared/lib/clipboard';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import { sendTo } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Inline,
  Label,
  Select,
  SplitPane,
  Stack,
  TextInputPanel,
  type CodeMarker,
} from '@/shared/ui';
import { IconMinimize2, IconSendTo, IconWand2 } from '@/shared/ui/icons';
import { OptionsPanel } from './components/OptionsPanel';
import { createFormatter } from './lib/client';
import { detectLanguage } from './lib/detect';
import { CodeError } from './lib/errors';
import {
  FORMAT_LANGUAGES,
  LANGUAGE_EXTENSION,
  LANGUAGE_LABEL,
  type FormatLanguage,
} from './lib/languages';
import { isMinifyLanguage } from './lib/minify';
import {
  formatterSettings,
  optionsFor,
  readLanguage,
  withOptions,
} from './settings';

const TOOL_ID = 'code-formatter';
const MAX_BYTES = 10 * 1024 * 1024;

const SURFACE: Record<FormatLanguage, LanguageId | 'plain'> = {
  json: 'json',
  javascript: 'js',
  jsx: 'js',
  typescript: 'ts',
  tsx: 'ts',
  css: 'css',
  scss: 'css',
  less: 'css',
  html: 'html',
  markdown: 'markdown',
  yaml: 'yaml',
  graphql: 'plain',
  sql: 'sql',
  xml: 'xml',
};

const SAMPLES = [
  {
    label: 'JavaScript',
    value:
      'const greet=(name)=>{if(!name){return "Hello"}return `Hello ${name}`};export default greet',
  },
  {
    label: 'SQL',
    value: 'select id,name from users where active=1 order by name',
  },
  {
    label: 'CSS',
    value: '.card{padding:8px 16px;color:#333}.card:hover{color:#000}',
  },
];

interface Result {
  code: string;
  action: 'format' | 'minify';
  language: FormatLanguage;
  before: number;
  after: number;
}

const bytes = (s: string) => new TextEncoder().encode(s).length;

export default function CodeFormatter() {
  const navigate = useNavigate();
  const [settings, update] = formatterSettings.useSettings();
  const [input, setInput] = useState('');
  const [fileName, setFileName] = useState<string | undefined>();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [busy, setBusy] = useState(false);
  const formatter = useRef<ReturnType<typeof createFormatter> | null>(null);
  useEffect(
    () => () => {
      formatter.current?.terminate();
      formatter.current = null;
    },
    [],
  );

  const choice = readLanguage(settings);
  const detected = useMemo(
    () => detectLanguage(input, fileName),
    [input, fileName],
  );
  const language = choice === 'auto' ? detected : choice;
  const options = optionsFor(settings, language);
  const canMinify = isMinifyLanguage(language);

  const changeInput = (v: string) => {
    setInput(v);
    // Never leave a stale result next to edited input.
    setResult(null);
    setError(null);
  };

  const run = async (action: 'format' | 'minify') => {
    if (!input.trim() || busy) return;
    formatter.current ??= createFormatter();
    setBusy(true);
    setError(null);
    try {
      if (action === 'format') {
        const code = await formatter.current.format(input, language, options);
        setResult({
          code,
          action,
          language,
          before: bytes(input),
          after: bytes(code),
        });
      } else if (isMinifyLanguage(language)) {
        const r = await formatter.current.minify(input, language, {
          mangle: settings.mangle,
        });
        setResult({ ...r, action, language });
      }
    } catch (e) {
      setResult(null);
      setError(toToolError(e));
    } finally {
      setBusy(false);
    }
  };

  const markers: CodeMarker[] =
    error instanceof CodeError && error.line !== undefined
      ? [
          {
            line: error.line,
            column: error.column,
            message: error.message,
            severity: 'error',
          },
        ]
      : [];

  const showChanges = () => {
    if (!result) return;
    sendTo(navigate, 'text-diff-checker', {
      kind: 'text',
      mime: 'application/vnd.tools.diff-pair+json',
      text: JSON.stringify({ left: input, right: result.code }),
      sourceTool: TOOL_ID,
      meta: { pair: true },
    });
  };

  useSendCommands(TOOL_ID, [
    { target: 'text-diff-checker', run: showChanges, enabled: !!result },
  ]);

  useToolCommands(TOOL_ID, [
    {
      id: 'format',
      label: 'Format',
      shortcut: 'Mod+Shift+F',
      run: () => void run('format'),
      enabled: input.trim() !== '',
    },
    {
      id: 'minify',
      label: 'Minify',
      shortcut: 'Mod+Shift+M',
      run: () => void run('minify'),
      enabled: input.trim() !== '' && canMinify,
    },
    {
      id: 'copy',
      label: 'Copy result',
      shortcut: 'Mod+Shift+C',
      run: () => result && void copyText(result.code),
      enabled: result !== null,
    },
    {
      id: 'clear',
      label: 'Clear',
      shortcut: 'Mod+Shift+X',
      run: () => changeInput(''),
    },
    {
      id: 'sample',
      label: 'Load sample',
      run: () => changeInput(SAMPLES[0].value),
    },
  ]);

  const outputName = `${result?.action === 'minify' ? 'minified' : 'formatted'}.${LANGUAGE_EXTENSION[language]}`;

  return (
    <Stack gap="4">
      <Inline gap="3" align="center" wrap>
        <Inline gap="2" align="center" wrap={false}>
          <Label htmlFor="code-formatter-language">Language</Label>
          <Select
            id="code-formatter-language"
            value={choice}
            onValueChange={(v) => {
              update({ language: v });
              setResult(null);
              setError(null);
            }}
            items={[
              { value: 'auto', label: `Auto (${LANGUAGE_LABEL[detected]})` },
              ...FORMAT_LANGUAGES.map((l) => ({
                value: l,
                label: LANGUAGE_LABEL[l],
              })),
            ]}
          />
        </Inline>
        <Button
          size="sm"
          leftIcon={<IconWand2 size="sm" />}
          onClick={() => void run('format')}
          disabled={!input.trim()}
          loading={busy && result === null}
          aria-keyshortcuts="Control+Shift+F"
        >
          Format
        </Button>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<IconMinimize2 size="sm" />}
          onClick={() => void run('minify')}
          disabled={!input.trim() || !canMinify}
          aria-keyshortcuts="Control+Shift+M"
        >
          Minify
        </Button>
        {result && (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<IconSendTo size="sm" />}
            onClick={showChanges}
          >
            Show changes
          </Button>
        )}
      </Inline>

      <OptionsPanel
        language={language}
        options={options}
        onChange={(patch) => {
          update(withOptions(settings, language, patch));
          setResult(null);
        }}
        mangle={settings.mangle}
        onMangleChange={(mangle) => update({ mangle })}
      />

      {error && !(error instanceof CodeError) && (
        <Alert status="danger">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <SplitPane
        direction="horizontal"
        persistKey="code-formatter"
        separatorLabel="Resize input and output"
      >
        <TextInputPanel
          label="Input"
          value={input}
          onChange={changeInput}
          language={SURFACE[language]}
          samples={SAMPLES}
          maxBytes={MAX_BYTES}
          markers={markers}
          onFile={(file) => {
            setFileName(file.name);
          }}
          handoff={(p) => p.kind === 'text'}
          minHeight={320}
          extraMeta={
            error instanceof CodeError
              ? [
                  <span key="err" role="alert">
                    {error.line !== undefined
                      ? `Line ${error.line}${error.column !== undefined ? `:${error.column}` : ''}: `
                      : ''}
                    {error.message}
                  </span>,
                ]
              : undefined
          }
        />
        <TextInputPanel
          label="Output"
          value={result?.code ?? ''}
          onChange={() => {}}
          language={SURFACE[result?.language ?? language]}
          readOnly
          downloadName={outputName}
          minHeight={320}
          extraMeta={
            result
              ? [
                  <Badge key="sizes" variant="soft" tone="accent" size="sm">
                    {`Before ${formatBytes(result.before)}, after ${formatBytes(result.after)} (${formatSizeChange(result.before, result.after)})`}
                  </Badge>,
                ]
              : undefined
          }
        />
      </SplitPane>
    </Stack>
  );
}
