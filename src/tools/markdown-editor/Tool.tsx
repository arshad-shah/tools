import { useHandoff } from '@/shared/lib/handoff';
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { ToolProps } from '@/app/tool';
import { copyText } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import { watchTheme } from '@/shared/lib/theme-tokens';
import { useToolCommands, type ToolCommand } from '@/shared/lib/tool-commands';
import {
  Alert,
  Button,
  CodeSurface,
  Label,
  MetaList,
  SplitPane,
  Switch,
  type CodeSurfaceHandle,
  type SandboxedHtmlHandle,
} from '@/shared/ui';
import { IconEraser, IconFileText, IconList } from '@/shared/ui/icons';
import { textStats } from '@/tools/text-toolkit/lib/stats';
import { ExportMenu, type ExportActions } from './components/ExportMenu';
import { FormatToolbar } from './components/FormatToolbar';
import { FORMAT_ITEMS } from './components/format-items';
import { Outline } from './components/Outline';
import { Preview } from './components/Preview';
import { useRendered } from './hooks/useRendered';
import { fileBase, offsetOfLine } from './lib/caret';
import { readDocTokens } from './lib/doc-tokens';
import { markdownCss, toRichClipboard, toStandaloneHtml } from './lib/export';
import {
  applyFormat,
  type FormatAction,
  type Selection,
} from './lib/format-actions';
import { renderMarkdown } from './lib/render';
import { SAMPLE_MARKDOWN } from './lib/sample';
import { markdownSettings } from './settings';

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
  const editor = useRef<CodeSurfaceHandle>(null);
  const preview = useRef<SandboxedHtmlHandle>(null);
  const selection = useRef<Selection>({ start: 0, end: 0 });
  const pendingSelection = useRef<Selection | null>(null);
  const pendingJump = useRef<number | null>(null);
  const wrapId = useId();
  const remoteNoteId = useId();

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

  useEffect(() => watchTheme(() => setTokens(readDocTokens())), []);

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

  const fresh = async () => {
    const r = await renderMarkdown(text);
    const title = r.outline.find((h) => h.depth === 1)?.text ?? 'Document';
    return { ...r, title, base: fileBase(title) };
  };

  const fail = (e: unknown, fallback: string) =>
    notify.error(toToolError(e, fallback));

  const actions: ExportActions = {
    downloadHtml: () =>
      void fresh().then(
        ({ html, title, base }) => {
          const doc = toStandaloneHtml(html, title, readDocTokens('light'));
          saveBlob(
            new Blob([doc], { type: 'text/html;charset=utf-8' }),
            `${base}.html`,
          );
          setExported(text);
        },
        (e) => fail(e, 'Could not export HTML'),
      ),
    downloadMarkdown: () =>
      void fresh().then(
        ({ base }) => {
          saveBlob(
            new Blob([text], { type: 'text/markdown;charset=utf-8' }),
            `${base}.md`,
          );
          setExported(text);
        },
        (e) => fail(e, 'Could not export Markdown'),
      ),
    copyRich: () =>
      void fresh()
        .then(async ({ html }) => {
          try {
            if (
              typeof ClipboardItem === 'undefined' ||
              !navigator.clipboard?.write
            )
              throw new Error('Rich clipboard unavailable');
            await navigator.clipboard.write([toRichClipboard(html, text)]);
            notify.success('Copied as rich text');
          } catch {
            await copyText(html);
            notify.info(
              'Rich text copy is not available here, so the HTML was copied as text',
            );
          }
          setExported(text);
        })
        .catch((e: unknown) => fail(e, 'Could not copy')),
    copyHtml: () =>
      void fresh()
        .then(async ({ html }) => {
          await copyText(html);
          notify.success('Copied HTML');
          setExported(text);
        })
        .catch((e: unknown) => fail(e, 'Could not copy')),
    print: () => preview.current?.print(),
  };

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

  // Shift+7 types '&' on many layouts, so match the physical key as well.
  const onEditorKeyDown = (e: KeyboardEvent) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      !e.altKey &&
      e.code === 'Digit7' &&
      e.key !== '7'
    ) {
      e.preventDefault();
      format('ol');
    }
  };

  const clear = () => {
    const previous = text;
    setText('');
    notify.info('Document cleared', {
      action: { label: 'Undo', onClick: () => setText(previous) },
    });
  };

  const remote = rendered.remoteImages;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormatToolbar onFormat={format} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Switch
              id={wrapId}
              checked={settings.wrap}
              onCheckedChange={(wrap) => update({ wrap })}
            />
            <Label htmlFor={wrapId}>Wrap lines</Label>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            leftIcon={<IconFileText size="sm" />}
            onClick={() => setText(SAMPLE_MARKDOWN)}
          >
            Load sample
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            leftIcon={<IconEraser size="sm" />}
            disabled={text === ''}
            onClick={clear}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<IconList size="sm" />}
            onClick={() => setOutlineOpen(true)}
          >
            Outline
          </Button>
          <ExportMenu actions={actions} disabled={text === ''} />
        </div>
      </div>
      {remote > 0 && !allowRemote ? (
        <Alert
          status="warning"
          className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
        >
          <span className="flex flex-col gap-1">
            <span className="font-medium">
              {plural(remote, 'remote image')} blocked
            </span>
            <span id={remoteNoteId}>
              Loading them is a network request to the image hosts.
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-describedby={remoteNoteId}
            onClick={() => setAllowRemote(true)}
          >
            Load for this document
          </Button>
        </Alert>
      ) : null}
      <div className="h-[70vh] min-h-96">
        <SplitPane
          direction="horizontal"
          defaultRatio={1 - settings.previewWidth}
          separatorLabel="Resize editor and preview"
          className="h-full"
        >
          <div className="h-full" onKeyDown={onEditorKeyDown}>
            <CodeSurface
              ref={editor}
              value={text}
              onChange={setText}
              language="markdown"
              label="Markdown"
              wrap={settings.wrap}
              placeholder="Type Markdown here"
              onSelectionChange={(start, end) => {
                selection.current = { start, end };
              }}
              maxHeight="none"
              className="h-full"
            />
          </div>
          <Preview
            ref={preview}
            html={rendered.html}
            baseCss={baseCss}
            allowRemoteImages={allowRemote}
          />
        </SplitPane>
      </div>
      <div aria-live="polite">
        <MetaList
          items={[
            plural(words, 'word'),
            plural(rendered.outline.length, 'heading'),
            dirty ? 'Not exported' : text === '' ? 'Empty' : 'Exported',
          ]}
        />
      </div>
      <Outline
        open={outlineOpen}
        onOpenChange={setOutlineOpen}
        items={rendered.outline}
        onJump={(line) => {
          pendingJump.current = line;
        }}
      />
    </div>
  );
}
