import { useHandoff } from '@/shared/lib/handoff';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ToolProps } from '@/app/tool';
import { useCynosureTheme } from '@arshad-shah/cynosure';
import { useToolCommands, type ToolCommand } from '@/shared/lib/tool-commands';
import {
  Button,
  Card,
  FileDrop,
  IconButton,
  Inline,
  Menu,
  Notice,
  SplitPane,
  Stack,
  StatusBar,
  StatusBarSegment,
  Switch,
} from '@arshad-shah/cynosure';
import {
  close,
  download,
  listTree,
  sparkles,
} from '@arshad-shah/cynosure/icons';
import { ToolActions } from '@/app/ui/transform';
import { readText } from '@/shared/lib/files';
import type { SandboxedHtmlHandle } from '@/shared/surfaces/sandboxed-html/SandboxedHtml';
import { textStats } from '@/tools/text-toolkit/lib/stats';
import { FORMAT_ITEMS } from './components/format-items';
import { FormatToolbar } from './components/FormatToolbar';
import { Outline } from './components/Outline';
import { Preview } from './components/Preview';
import { fail, useExportActions } from './hooks/useExportActions';
import { useRendered } from './hooks/useRendered';
import { offsetOfLine } from './lib/caret';
import { readDocTokens } from './lib/doc-tokens';
import { markdownCss } from './lib/export';
import {
  applyFormat,
  type FormatAction,
  type Selection,
} from './lib/format-actions';
import { SAMPLE_MARKDOWN } from './lib/sample';
import { markdownSettings } from './settings';
import { CodeEditor, type CodeEditorHandle } from '@/shared/editor';
import { PANES_STACK_BELOW } from '@/app/ui/transform';

const EXPORT_ITEMS = [
  {
    items: [
      { value: 'html', label: 'Download HTML' },
      { value: 'md', label: 'Download Markdown' },
    ],
  },
  {
    items: [
      { value: 'rich', label: 'Copy rich text' },
      { value: 'copy-html', label: 'Copy HTML' },
    ],
  },
  { items: [{ value: 'print', label: 'Print' }] },
];

const plural = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

/**
 * Markdown Editor and Preview (spec §9.2). The draft lives in memory only;
 * settings hold the editor options.
 */
export default function MarkdownEditor({ definition }: ToolProps) {
  const [settings, update] = markdownSettings.useSettings();
  const [text, setTextState] = useState('');
  const [allowRemote, setAllowRemote] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [tokens, setTokens] = useState(() => readDocTokens());
  const editor = useRef<CodeEditorHandle>(null);
  const preview = useRef<SandboxedHtmlHandle>(null);
  const selection = useRef<Selection>({ start: 0, end: 0 });
  const pendingSelection = useRef<Selection | null>(null);
  const pendingJump = useRef<number | null>(null);
  // Wide screens: editor and preview side by side; narrow: stacked.

  // Text handed over from another tool (Text Toolkit, Send to) opens once.
  const handed = useHandoff(
    (p) =>
      p.kind === 'text' &&
      (p.mime === 'text/markdown' || p.mime === 'text/plain'),
  );
  const [takenHandoff, setTakenHandoff] = useState<typeof handed>(null);
  if (handed !== takenHandoff) {
    setTakenHandoff(handed);
    if (handed?.kind === 'text') setTextState(handed.text);
  }

  const rendered = useRendered(text);
  const baseCss = useMemo(() => markdownCss(tokens), [tokens]);
  const words = textStats(useDeferredValue(text)).words;

  // Re-read the document colours when the Cynosure theme or mode changes.
  const { palette } = useCynosureTheme();
  useEffect(() => {
    // After CynosureTheme has marked the document with the new mode.
    let live = true;
    queueMicrotask(() => live && setTokens(readDocTokens()));
    return () => {
      live = false;
    };
  }, [palette]);

  const setText = (next: string) => {
    setTextState(next);
    // The remote-image opt-in is for this document only.
    if (next === '') setAllowRemote(false);
  };

  const format = (action: FormatAction) => {
    const r = applyFormat(text, selection.current, action);
    selection.current = r.selection;
    pendingSelection.current = r.selection;
    setText(r.text);
  };

  // After a format: put the selection where applyFormat says.
  useEffect(() => {
    const sel = pendingSelection.current;
    if (!sel) return;
    pendingSelection.current = null;
    editor.current?.focus();
    editor.current?.setSelection(sel.start, sel.end);
  }, [text]);

  // After the outline closes (and its focus return): jump to the heading.
  useEffect(() => {
    const line = pendingJump.current;
    if (outlineOpen || line === null) return;
    pendingJump.current = null;
    const at = offsetOfLine(text, line);
    selection.current = { start: at, end: at };
    editor.current?.focus();
    editor.current?.setSelection(at, at);
  }, [outlineOpen, text]);

  // Leaving with unexported changes asks first.
  const dirty = text !== '' && text !== exported;
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  const actions = useExportActions(text, preview, setExported);

  const commands: ToolCommand[] = [
    ...FORMAT_ITEMS.map((item) => ({
      id: `format-${item.action}`,
      label: item.label,
      group: 'Format',
      shortcut: item.shortcut,
      run: () => format(item.action),
    })),
    { id: 'outline', label: 'Show outline', run: () => setOutlineOpen(true) },
    {
      id: 'download-html',
      label: 'Download HTML',
      group: 'Export',
      enabled: text !== '',
      run: actions.downloadHtml,
    },
    {
      id: 'download-md',
      label: 'Download Markdown',
      group: 'Export',
      enabled: text !== '',
      run: actions.downloadMarkdown,
    },
    {
      id: 'copy-rich',
      label: 'Copy rich text',
      group: 'Export',
      enabled: text !== '',
      run: actions.copyRich,
    },
    {
      id: 'copy-html',
      label: 'Copy HTML',
      group: 'Export',
      enabled: text !== '',
      run: actions.copyHtml,
    },
    { id: 'print', label: 'Print', group: 'Export', run: actions.print },
  ];
  useToolCommands(definition.id, commands);

  const remote = rendered.remoteImages;
  const onExport = (v: string) => {
    if (v === 'html') actions.downloadHtml();
    else if (v === 'md') actions.downloadMarkdown();
    else if (v === 'rich') actions.copyRich();
    else if (v === 'copy-html') actions.copyHtml();
    else if (v === 'print') actions.print();
  };

  const editor_ = (
    <Card as="section" title="Markdown" headingLevel={2} padding="sm">
      <Stack gap="3">
        <Inline gap="3" align="center" justify="between" wrap>
          <FormatToolbar onFormat={format} />
          <Inline gap="3" align="center">
            {text ? (
              <IconButton
                size="sm"
                variant="ghost"
                tone="neutral"
                icon={close}
                label="Clear"
                onClick={() => setText('')}
              />
            ) : null}
            <Switch
              size="sm"
              label="Wrap lines"
              checked={settings.wrap}
              onChange={(wrap) => update({ wrap })}
            />
          </Inline>
        </Inline>
        <CodeEditor
          ref={editor}
          value={text}
          onChange={setText}
          language="markdown"
          aria-label="Markdown"
          wrap={settings.wrap}
          placeholder="Type Markdown here"
          onSelectionChange={(start, end) => {
            selection.current = { start, end };
          }}
          minHeight={384}
          maxHeight={720}
        />
        {text === '' ? (
          <Stack gap="3">
            <FileDrop
              size="sm"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              labels={{
                prompt: 'Drop a Markdown file here, or',
                chooseOne: 'Open a file',
              }}
              onFiles={(files) =>
                files[0] &&
                void readText(files[0]).then(setText, (e: unknown) =>
                  fail(e, 'Could not open the file'),
                )
              }
            />
            <Inline>
              <Button
                variant="ghost"
                size="sm"
                icon={sparkles}
                onClick={() => setText(SAMPLE_MARKDOWN)}
              >
                Try the sample document
              </Button>
            </Inline>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
  const preview_ = (
    <Card as="section" title="Preview" headingLevel={2} padding="sm">
      <Preview
        ref={preview}
        html={rendered.html}
        baseCss={baseCss}
        allowRemoteImages={allowRemote}
      />
    </Card>
  );

  return (
    <Stack gap="5">
      {text ? (
        <ToolActions>
          <Button
            variant="soft"
            icon={listTree}
            onClick={() => setOutlineOpen(true)}
          >
            Outline
          </Button>
          <Menu
            label="Export"
            items={EXPORT_ITEMS}
            onSelect={onExport}
            trigger={(props) => (
              <Button {...props} variant="soft" icon={download}>
                Export
              </Button>
            )}
          />
        </ToolActions>
      ) : null}
      {remote > 0 && !allowRemote ? (
        <Notice
          tone="warning"
          title={`${plural(remote, 'remote image')} blocked`}
          action={
            <Button
              size="sm"
              variant="soft"
              onClick={() => setAllowRemote(true)}
            >
              Load for this document
            </Button>
          }
        >
          Loading them is a network request to the image hosts.
        </Notice>
      ) : null}
      <SplitPane
        label="Resize the editor and the preview"
        stackBelow={PANES_STACK_BELOW}
        start={<Stack paddingInline="3">{editor_}</Stack>}
        end={<Stack paddingInline="3">{preview_}</Stack>}
      />
      <StatusBar
        label="Document"
        start={
          <>
            <StatusBarSegment>{plural(words, 'word')}</StatusBarSegment>
            <StatusBarSegment>
              {plural(rendered.outline.length, 'heading')}
            </StatusBarSegment>
          </>
        }
        end={
          <StatusBarSegment tone={dirty ? 'warning' : 'neutral'} dot={dirty}>
            {dirty ? 'Not exported' : text === '' ? 'Empty' : 'Exported'}
          </StatusBarSegment>
        }
      />
      <Outline
        open={outlineOpen}
        onOpenChange={setOutlineOpen}
        items={rendered.outline}
        onJump={(item) => {
          // Preview shown: scroll the preview there; else move the caret.
          // Both are shown: scroll the preview there and move the caret.
          preview.current?.scrollToFragment(item.id);
          pendingJump.current = item.line;
        }}
      />
    </Stack>
  );
}
