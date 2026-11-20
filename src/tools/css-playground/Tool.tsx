import {
  Badge,
  Button,
  Card,
  FileDrop,
  Inline,
  LoadingDots,
  Notice,
  SegmentedControl,
  SplitPane,
  Stack,
  StatusBar,
  StatusBarSegment,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@arshad-shah/cynosure';
import { sparkles } from '@arshad-shah/cynosure/icons';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import type { ToolProps } from '@/app/tool';
import { PANES_STACK_BELOW } from '@/app/ui/transform';
import { CodeEditor, type CodeEditorHandle } from '@/shared/editor';
import type { EditorDiagnostic } from '@/shared/editor/types';
import { saveBlob } from '@/shared/lib/download';
import { toToolError } from '@/shared/lib/errors';
import { readText } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';
import { useHandoff } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useToolCommands, type ToolCommand } from '@/shared/lib/tool-commands';
import { ColoursPanel } from './components/ColoursPanel';
import { EditorActions } from './components/EditorActions';
import { IssuesPanel } from './components/IssuesPanel';
import { OptimisePanel } from './components/OptimisePanel';
import { OverviewPanel } from './components/OverviewPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { SpecificityPanel } from './components/SpecificityPanel';
import { VariablesPanel } from './components/VariablesPanel';
import {
  formatCss,
  useCssClient,
  useCssReport,
  useOptimised,
} from './hooks/useCssWorker';
import { browserIssues, colourKeywords } from './lib/browser-check';
import { SAMPLE_CSS, SAMPLE_HTML } from './lib/sample';
import type { OptimiseOptions } from './lib/types';
import { cssPlaygroundSettings, type MarkupSource } from './settings';

type PanelTab =
  | 'issues'
  | 'optimise'
  | 'overview'
  | 'specificity'
  | 'colours'
  | 'variables';

/** Offset of 1-based line and column in `text`. */
function offsetOf(text: string, line: number, column = 1): number {
  let at = 0;
  for (let l = 1; l < line; l++) {
    const next = text.indexOf('\n', at);
    if (next < 0) return text.length;
    at = next + 1;
  }
  return Math.min(text.length, at + column - 1);
}

/**
 * CSS Playground: paste a stylesheet and see it rendered, then format,
 * optimise, lint and inspect it. Parsing and optimising run in a killable
 * worker; the preview is a sandboxed frame. Nothing is stored but the
 * view options.
 */
export default function CssPlayground({ definition }: ToolProps) {
  const [settings, update] = cssPlaygroundSettings.useSettings();
  const [css, setCss] = useState('');
  const [html, setHtml] = useState('');
  const [tab, setTab] = useState<PanelTab>('issues');
  const [useOptimisedCss, setUseOptimisedCss] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const editor = useRef<CodeEditorHandle>(null);
  const client = useCssClient();

  // CSS handed over from another tool opens once.
  const handed = useHandoff(
    (p) =>
      p.kind === 'text' && (p.mime === 'text/css' || p.mime === 'text/plain'),
  );
  const [takenHandoff, setTakenHandoff] = useState<typeof handed>(null);
  if (handed !== takenHandoff) {
    setTakenHandoff(handed);
    if (handed?.kind === 'text') setCss(handed.text);
  }

  const deferredCss = useDeferredValue(css);
  const report = useCssReport(client, deferredCss);
  const options: OptimiseOptions = useMemo(
    () => ({
      restructure: settings.restructure,
      forceMediaMerge: settings.forceMediaMerge,
      keepLicenceComments: settings.keepLicenceComments,
    }),
    [
      settings.restructure,
      settings.forceMediaMerge,
      settings.keepLicenceComments,
    ],
  );
  const optimised = useOptimised(
    client,
    deferredCss,
    options,
    tab === 'optimise' || useOptimisedCss,
  );

  const r = report.value;
  const issues = useMemo(
    () => (r ? [...r.issues, ...browserIssues(r)] : []),
    [r],
  );
  const colours = useMemo(
    () => (r ? [...r.colours, ...colourKeywords(r)] : []),
    [r],
  );
  const diagnostics: EditorDiagnostic[] = useMemo(
    () =>
      issues
        .filter((i) => i.line && i.severity !== 'info')
        .map((i) => ({
          line: i.line!,
          column: i.column,
          message: i.message,
          severity: i.severity,
        })),
    [issues],
  );

  const previewCss =
    useOptimisedCss && optimised.value ? optimised.value.css : css;
  const ownHtml = settings.markup === 'html';
  const previewHtml = ownHtml ? html : (r?.specimen ?? '');
  const note = ownHtml
    ? html.trim() === ''
      ? 'Add your HTML on the left to style it.'
      : undefined
    : r?.specimenTruncated
      ? 'Generated from the first selectors only, to keep the preview fast.'
      : css.trim() === ''
        ? undefined
        : 'Sample markup generated from your selectors. Choose My HTML to use your own.';

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  const fail = (e: unknown, fallback: string) =>
    notify.error(toToolError(e, fallback));

  const format = () => {
    if (!css.trim()) return;
    setFormatting(true);
    formatCss(client, css, settings.indent)
      .then(setCss, (e: unknown) => fail(e, 'Could not format this CSS'))
      .finally(() => setFormatting(false));
  };

  const downloadCss = (text: string, name: string) =>
    saveBlob(new Blob([text], { type: 'text/css;charset=utf-8' }), name);

  const jump = (line: number, column?: number) => {
    const at = offsetOf(css, line, column);
    editor.current?.focus();
    editor.current?.setSelection(at, at);
  };

  const loadSample = () => {
    setCss(SAMPLE_CSS);
    if (ownHtml && html.trim() === '') setHtml(SAMPLE_HTML);
  };

  const commands: ToolCommand[] = [
    { id: 'format', label: 'Format CSS', enabled: css !== '', run: format },
    {
      id: 'optimise',
      label: 'Show optimised CSS',
      enabled: css !== '',
      run: () => setTab('optimise'),
    },
    {
      id: 'download',
      label: 'Download CSS',
      group: 'Export',
      enabled: css !== '',
      run: () => downloadCss(css, 'styles.css'),
    },
    { id: 'sample', label: 'Load the sample stylesheet', run: loadSample },
  ];
  useToolCommands(definition.id, commands);

  const editorCard = (
    <Card
      as="section"
      title="CSS"
      headingLevel={2}
      padding="sm"
      actions={
        <EditorActions
          hasCss={css.trim() !== ''}
          formatting={formatting}
          onFormat={format}
          onClear={() => setCss('')}
          indent={settings.indent}
          onIndent={(indent) => update({ indent })}
          wrap={settings.wrap}
          onWrap={(wrap) => update({ wrap })}
        />
      }
    >
      <Stack gap="3">
        <CodeEditor
          ref={editor}
          value={css}
          onChange={setCss}
          language="css"
          aria-label="CSS"
          wrap={settings.wrap}
          placeholder="Paste or type CSS here"
          diagnostics={diagnostics}
          minHeight={320}
          maxHeight={560}
        />
        {css === '' ? (
          <Stack gap="3">
            <FileDrop
              size="sm"
              accept=".css,text/css,text/plain"
              labels={{
                prompt: 'Drop a stylesheet here, or',
                chooseOne: 'Open a file',
              }}
              onFiles={(files) =>
                files[0] &&
                void readText(files[0]).then(setCss, (e: unknown) =>
                  fail(e, 'Could not open the file'),
                )
              }
            />
            <Inline>
              <Button
                variant="soft"
                size="sm"
                icon={sparkles}
                onClick={loadSample}
              >
                Try the sample stylesheet
              </Button>
            </Inline>
          </Stack>
        ) : null}
        <SegmentedControl
          size="sm"
          label="Markup to style"
          value={settings.markup}
          onChange={(v) => update({ markup: v as MarkupSource })}
          options={[
            { value: 'auto', label: 'From my selectors' },
            { value: 'html', label: 'My HTML' },
          ]}
        />
        {ownHtml ? (
          <CodeEditor
            value={html}
            onChange={setHtml}
            language="html"
            aria-label="HTML"
            wrap={settings.wrap}
            placeholder="Paste the HTML to style (scripts never run)"
            minHeight={160}
            maxHeight={320}
          />
        ) : null}
      </Stack>
    </Card>
  );

  const previewCard = (
    <PreviewPanel
      css={previewCss}
      html={previewHtml}
      device={settings.device}
      canvas={settings.canvas}
      onDevice={(device) => update({ device })}
      onCanvas={(canvas) => update({ canvas })}
      optimisedAvailable={optimised.value !== null}
      useOptimised={useOptimisedCss}
      onUseOptimised={setUseOptimisedCss}
      note={note}
    />
  );

  const count = (n: number) => (n ? ` (${n})` : '');

  return (
    <Stack gap="5">
      <SplitPane
        label="Resize the editor and the preview"
        stackBelow={PANES_STACK_BELOW}
        start={<Stack paddingInline="3">{editorCard}</Stack>}
        end={<Stack paddingInline="3">{previewCard}</Stack>}
      />
      {report.error ? (
        <Notice tone="danger" title="Could not read this CSS">
          {report.error.message}
        </Notice>
      ) : null}
      <Card as="section" title="Tools" headingLevel={2} padding="sm">
        {r ? (
          <Tabs value={tab} onChange={(v) => setTab(v as PanelTab)}>
            <TabList label="CSS tools">
              <Tab value="issues">
                <Inline gap="2" align="center">
                  {'Issues'}
                  {errors ? (
                    <Badge size="sm" tone="danger">
                      {String(errors)}
                    </Badge>
                  ) : null}
                </Inline>
              </Tab>
              <Tab value="optimise">Optimise and minify</Tab>
              <Tab value="overview">Overview</Tab>
              <Tab value="specificity">{`Specificity${count(r.selectors.length)}`}</Tab>
              <Tab value="colours">{`Colours${count(colours.length)}`}</Tab>
              <Tab value="variables">{`Variables${count(r.customProperties.length)}`}</Tab>
            </TabList>
            <TabPanel value="issues">
              <IssuesPanel issues={issues} onJump={jump} />
            </TabPanel>
            <TabPanel value="optimise">
              <OptimisePanel
                job={optimised}
                options={options}
                onOptions={(patch) => update(patch)}
                onReplace={setCss}
                onDownload={(text) => downloadCss(text, 'styles.min.css')}
              />
            </TabPanel>
            <TabPanel value="overview">
              <OverviewPanel report={r} />
            </TabPanel>
            <TabPanel value="specificity">
              <SpecificityPanel selectors={r.selectors} />
            </TabPanel>
            <TabPanel value="colours">
              <ColoursPanel colours={colours} />
            </TabPanel>
            <TabPanel value="variables">
              <VariablesPanel variables={r.customProperties} />
            </TabPanel>
          </Tabs>
        ) : (
          <LoadingDots label="Reading the CSS" />
        )}
      </Card>
      <StatusBar
        label="Stylesheet"
        start={
          <>
            <StatusBarSegment>
              {formatBytes(r?.stats.bytes ?? 0)}
            </StatusBarSegment>
            <StatusBarSegment>{`${r?.stats.rules ?? 0} rules`}</StatusBarSegment>
          </>
        }
        end={
          <StatusBarSegment
            tone={errors ? 'danger' : warnings ? 'warning' : 'neutral'}
            dot={errors + warnings > 0}
          >
            {css.trim() === ''
              ? 'Empty'
              : `${errors} errors, ${warnings} warnings`}
          </StatusBarSegment>
        }
      />
    </Stack>
  );
}
