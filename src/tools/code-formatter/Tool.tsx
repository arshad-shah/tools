import {
  Badge,
  Button,
  Card,
  CodeBlock,
  CopyButton,
  EmptyState,
  IconButton,
  Inline,
  Menu,
  Notice,
  Select,
  Stack,
} from '@arshad-shah/cynosure';
import {
  braces,
  compare,
  download,
  minimize,
  sparkles,
  wand,
} from '@arshad-shah/cynosure/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextSourceActions } from '@/app/ui/text-source';
import { TransformLayout } from '@/app/ui/transform';
import { CodeEditor, type LanguageId } from '@/shared/editor';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { toToolError, type ToolError } from '@/shared/lib/errors';
import { formatBytes, formatSizeChange } from '@/shared/lib/format';
import { sendTo } from '@/shared/lib/handoff';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useToolCommands } from '@/shared/lib/tool-commands';
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
/** The editor's highlighting for each formatter language. */
const EDITOR_LANGUAGE: Record<FormatLanguage, LanguageId> = {
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

const MAX_BYTES = 10 * 1024 * 1024;

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

/**
 * Code Formatter & Minifier (redesign spec, transform pattern): code in,
 * formatted or minified code out, with its size before and after.
 */
export default function CodeFormatter() {
  const navigate = useNavigate();
  const [settings, update] = formatterSettings.useSettings();
  const [input, setInput] = useState('');
  const [fileName, setFileName] = useState<string | undefined>();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [busy, setBusy] = useState(false);
  const { copy } = useClipboard();
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
      const err = toToolError(e);
      setError(err);
    } finally {
      setBusy(false);
    }
  };

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
      run: () => result && void copy(result.code),
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

  const codeError =
    error instanceof CodeError
      ? `${
          error.line !== undefined
            ? `Line ${error.line}${error.column !== undefined ? `:${error.column}` : ''}: `
            : ''
        }${error.message}`
      : undefined;

  const examples = (
    <Menu
      label="Try an example"
      items={SAMPLES.map((s) => ({ value: s.label, label: s.label }))}
      onSelect={(v) =>
        changeInput(SAMPLES.find((s) => s.label === v)?.value ?? '')
      }
      trigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={sparkles}>
          Try an example
        </Button>
      )}
    />
  );

  const diagnostics =
    error instanceof CodeError && error.line !== undefined
      ? [
          {
            line: error.line,
            column: error.column,
            message: error.message,
            severity: 'error' as const,
          },
        ]
      : undefined;

  const inputCard = (
    <Card as="section" title="Input">
      <Stack gap="5">
        <CodeEditor
          aria-label="Input"
          language={EDITOR_LANGUAGE[language]}
          placeholder="Paste code, or open a file. The language is detected."
          value={input}
          onChange={changeInput}
          diagnostics={diagnostics}
          minHeight={200}
          maxHeight={560}
        />
        {codeError ? (
          <Notice tone="danger" title="Cannot format">
            {codeError}
          </Notice>
        ) : null}
        <TextSourceActions
          value={input}
          onChange={changeInput}
          label="Input"
          maxBytes={MAX_BYTES}
          onFile={(file) => {
            setFileName(file.name);
          }}
          handoff={(p) => p.kind === 'text'}
        >
          {examples}
        </TextSourceActions>
      </Stack>
    </Card>
  );

  const outputCard = (
    <Card
      as="section"
      title="Output"
      actions={
        result ? (
          <Badge tone="accent" size="sm">
            {`Before ${formatBytes(result.before)}, after ${formatBytes(result.after)} (${formatSizeChange(result.before, result.after)})`}
          </Badge>
        ) : undefined
      }
    >
      {result ? (
        <Stack gap="4">
          <CodeBlock
            title={outputName}
            code={result.code}
            language={result.language}
            lineNumbers
            copyable={false}
            actions={
              <Inline gap="1">
                <CopyButton
                  size="sm"
                  value={result.code}
                  labels={{ copy: 'Copy the output' }}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  tone="neutral"
                  icon={download}
                  label={`Download ${outputName}`}
                  onClick={() =>
                    saveBlob(
                      new Blob([result.code], { type: 'text/plain' }),
                      outputName,
                    )
                  }
                />
              </Inline>
            }
          />
          <Inline>
            <Button
              size="sm"
              variant="ghost"
              icon={compare}
              onClick={showChanges}
            >
              Show changes
            </Button>
          </Inline>
        </Stack>
      ) : (
        <EmptyState
          icon={braces}
          title={input.trim() ? 'Ready to format' : 'No code yet'}
          description={
            input.trim()
              ? `Press Format or Minify to tidy the ${LANGUAGE_LABEL[language]}.`
              : 'Paste code or open a file, then Format or Minify it. JSON, JavaScript, TypeScript, CSS, HTML, Markdown, YAML, GraphQL, SQL and XML.'
          }
          actions={input.trim() ? undefined : examples}
        />
      )}
    </Card>
  );

  return (
    <Stack gap="6">
      <Inline gap="3" align="end" wrap>
        <Select
          label="Language"
          width="md"
          value={choice}
          onChange={(v) => {
            update({ language: v });
            setResult(null);
            setError(null);
          }}
          options={[
            { value: 'auto', label: `Auto (${LANGUAGE_LABEL[detected]})` },
            ...FORMAT_LANGUAGES.map((l) => ({
              value: l,
              label: LANGUAGE_LABEL[l],
            })),
          ]}
        />
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
        <Button
          variant="soft"
          icon={minimize}
          onClick={() => void run('minify')}
          disabled={!input.trim() || !canMinify}
          aria-keyshortcuts="Control+Shift+M"
        >
          Minify
        </Button>
        <Button
          variant="solid"
          tone="accent"
          icon={wand}
          onClick={() => void run('format')}
          disabled={!input.trim()}
          loading={busy && result === null}
          aria-keyshortcuts="Control+Shift+F"
        >
          Format
        </Button>
      </Inline>
      {error && !(error instanceof CodeError) ? (
        <Notice tone="danger" title="Could not format the code">
          {error.message}
        </Notice>
      ) : null}
      <TransformLayout start={inputCard} end={outputCard} />
    </Stack>
  );
}
