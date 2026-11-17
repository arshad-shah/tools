import {
  Button,
  Card,
  Disclosure,
  FileDrop,
  Grid,
  IconButton,
  Inline,
  Kbd,
  Notice,
  SegmentedControl,
  Stack,
  StatusBar,
  StatusBarSegment,
  Text,
} from '@arshad-shah/cynosure';
import {
  chevronDown,
  chevronUp,
  share as shareIcon,
  sparkles,
  swap as swapIcon,
} from '@arshad-shah/cynosure/icons';
import { useMemo, useRef, useState } from 'react';
import { readText } from '@/shared/lib/files';
import { formatBytes } from '@/shared/lib/format';

import { useHandoff, type HandoffPayload } from '@/shared/lib/handoff';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import { useToolCommands } from '@/shared/lib/tool-commands';
import type { LanguageId } from '@/shared/lib/syntax/tokenize';
import { ChangeStrip } from './components/ChangeStrip';
import { DiffOptions } from './components/DiffOptions';
import { DiffView, type DiffViewHandle } from './components/DiffView';
import { ExportMenu } from './components/ExportMenu';
import { MergePanel } from './components/MergePanel';
import { SemanticView } from './components/SemanticView';
import { useDiffJob } from './hooks/useDiffJob';
import { detectLanguage } from './lib/detect';
import { isIdentical, type DiffOptions as EngineOptions } from './lib/engine';
import { readDiffHandoff } from './lib/handoff';
import { normaliseJson } from './lib/semantic';
import { buildViewModel, stepAnchor } from './lib/view-model';
import { diffSettings, type DiffMode } from './settings';
import { DIFF_SHARE_VERSION, parseDiffShare, type DiffShare } from './share';
import { CodeEditor } from '@/shared/editor';

const TEXT_ACCEPT =
  '.txt,.md,.json,.html,.css,.js,.ts,.jsx,.tsx,.xml,.yaml,.yml,.log,.csv,.patch,.diff,text/plain';
const MAX_BYTES = 20 * 1024 * 1024;
const SAMPLE = {
  left: 'The quick brown fox\njumps over the lazy dog.\nLine three stays.\nA line that goes away.',
  right:
    'The quick red fox\njumps over the lazy dog.\nLine three stays.\nA brand new line.\nAnd one more.',
};

const isDiffHandoff = (p: HandoffPayload) => readDiffHandoff(p) !== null;

/**
 * Text Diff (redesign spec, transform tool pattern): the two texts side by
 * side, the comparison options, then the differences with navigation,
 * merging and export.
 */
export default function TextDiff() {
  const [settings, update] = diffSettings.useSettings();
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [names, setNames] = useState({ left: 'original', right: 'changed' });
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [current, setCurrent] = useState(0);
  const view = useRef<DiffViewHandle>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const share = useShareableState<DiffShare>({
    toolId: 'text-diff-checker',
    version: DIFF_SHARE_VERSION,
    parse: parseDiffShare,
    select: () => ({
      v: 1,
      left,
      right,
      opts: {
        granularity: settings.granularity,
        mode: settings.mode,
        ignoreWhitespace: settings.ignoreWhitespace,
        ignoreCase: settings.ignoreCase,
        ignoreBlankLines: settings.ignoreBlankLines,
        trimTrailing: settings.trimTrailing,
        sortKeys: settings.sortKeys,
      },
    }),
  });

  // Hydrate once from a share link or a hand-off (adjusting state while
  // rendering, so no effect sets state).
  const handoff = useHandoff(isDiffHandoff);
  const [applied, setApplied] = useState<object | null>(null);
  if (share.loaded && applied === null) {
    setApplied(share.loaded);
    setLeft(share.loaded.left);
    setRight(share.loaded.right);
    update(share.loaded.opts);
  }
  if (handoff && applied !== handoff) {
    setApplied(handoff);
    const h = readDiffHandoff(handoff)!;
    if (h.left !== undefined) setLeft(h.left);
    if (h.right !== undefined) setRight(h.right);
    setNames((n) => ({
      left: h.leftName ?? n.left,
      right: h.rightName ?? n.right,
    }));
  }

  // JSON mode compares normalised JSON text, so the views still apply.
  const jsonTexts = useMemo(() => {
    if (settings.mode !== 'json') return null;
    try {
      return {
        left: left.trim() ? normaliseJson(left, 'Left', settings.sortKeys) : '',
        right: right.trim()
          ? normaliseJson(right, 'Right', settings.sortKeys)
          : '',
      };
    } catch {
      return null;
    }
  }, [settings.mode, settings.sortKeys, left, right]);
  const texts = useMemo(
    () => jsonTexts ?? { left, right },
    [jsonTexts, left, right],
  );

  const opts: EngineOptions = {
    granularity: settings.granularity,
    ignoreWhitespace: settings.ignoreWhitespace,
    ignoreCase: settings.ignoreCase,
    ignoreBlankLines: settings.ignoreBlankLines,
    trimTrailing: settings.trimTrailing,
  };
  const textMode = settings.mode === 'text' || jsonTexts !== null;
  const job = useDiffJob(texts.left, texts.right, opts, textMode);
  const vm = useMemo(
    () =>
      job.result
        ? buildViewModel(job.result, texts, {
            view: settings.view,
            context: settings.context,
            expanded,
            granularity: settings.granularity,
          })
        : null,
    [
      job.result,
      texts,
      settings.view,
      settings.context,
      settings.granularity,
      expanded,
    ],
  );

  const language: LanguageId = settings.syntaxHighlighting
    ? jsonTexts
      ? 'json'
      : detectLanguage(right || left, names.right)
    : 'plain';
  const anchors = vm?.changeAnchors ?? [];
  const position = anchors.indexOf(current);

  const go = (dir: 'next' | 'prev') => {
    const next = stepAnchor(anchors, current, dir);
    if (next === null) return;
    setCurrent(next);
    view.current?.scrollToRow(next);
  };
  const jump = (row: number) => {
    setCurrent(row);
    view.current?.scrollToRow(row);
  };
  const swap = () => {
    setLeft(right);
    setRight(left);
    setNames({ left: names.right, right: names.left });
  };
  const clear = () => {
    setLeft('');
    setRight('');
    setExpanded(new Set());
  };

  useToolCommands('text-diff-checker', [
    {
      id: 'next',
      label: 'Next change',
      shortcut: 'n',
      run: () => go('next'),
      enabled: anchors.length > 0,
    },
    {
      id: 'prev',
      label: 'Previous change',
      shortcut: 'p',
      run: () => go('prev'),
      enabled: anchors.length > 0,
    },
    { id: 'swap', label: 'Swap sides', run: swap },
    {
      id: 'share',
      label: 'Share link',
      shortcut: 'Mod+Shift+S',
      run: () => void share.share(),
      enabled: share.canShare,
    },
    {
      id: 'clear',
      label: 'Clear both sides',
      shortcut: 'Mod+Shift+X',
      run: clear,
    },
    {
      id: 'sample',
      label: 'Load sample',
      run: () => {
        setLeft(SAMPLE.left);
        setRight(SAMPLE.right);
      },
    },
  ]);

  const open = (which: 'left' | 'right', file: File) => {
    setFileError(null);
    if (file.size > MAX_BYTES) {
      setFileError(`${file.name} is larger than ${formatBytes(MAX_BYTES)}`);
      return;
    }
    void readText(file).then(
      (text) => {
        if (which === 'left') setLeft(text);
        else setRight(text);
        setNames((n) => ({ ...n, [which]: file.name }));
      },
      () => setFileError(`${file.name} could not be read as text`),
    );
  };

  const side = (which: 'left' | 'right') => {
    const value = which === 'left' ? left : right;
    const label = which === 'left' ? 'Original text' : 'Changed text';
    return (
      <Card
        as="section"
        title={which === 'left' ? 'Original' : 'Changed'}
        description={
          names[which] === (which === 'left' ? 'original' : 'changed')
            ? undefined
            : names[which]
        }
        headingLevel={2}
        padding="sm"
        actions={
          <Button
            size="sm"
            variant="ghost"
            icon={sparkles}
            onClick={() =>
              (which === 'left' ? setLeft : setRight)(SAMPLE[which])
            }
          >
            Sample
          </Button>
        }
      >
        <Stack gap="3">
          <CodeEditor
            value={value}
            onChange={which === 'left' ? setLeft : setRight}
            language={
              settings.syntaxHighlighting
                ? detectLanguage(value, names[which])
                : 'plain'
            }
            aria-label={label}
            placeholder="Paste or type text"
            minHeight={160}
            maxHeight={280}
          />
          {value === '' ? (
            <FileDrop
              size="sm"
              accept={TEXT_ACCEPT}
              labels={{
                prompt: 'Drop a text file here, or',
                chooseOne: 'Open a file',
              }}
              onFiles={(files) => files[0] && open(which, files[0])}
            />
          ) : null}
        </Stack>
      </Card>
    );
  };

  const stats = job.result?.stats;
  return (
    <Stack gap="6">
      <Grid columns={{ base: 1, lg: 2 }} gap="5">
        {side('left')}
        {side('right')}
      </Grid>
      {fileError ? (
        <Notice tone="danger" dismissible onDismiss={() => setFileError(null)}>
          {fileError}
        </Notice>
      ) : null}
      <Inline gap="3" align="center" justify="between" wrap>
        <Inline gap="3" align="center" wrap>
          <SegmentedControl
            label="Comparison"
            size="sm"
            value={settings.mode}
            onChange={(mode) => update({ mode: mode as DiffMode })}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'json', label: 'JSON' },
              { value: 'csv', label: 'CSV' },
              { value: 'ignore-order', label: 'Ignore order' },
            ]}
          />
          {textMode ? (
            <DiffOptions settings={settings} update={update} />
          ) : null}
        </Inline>
        <Inline gap="2" wrap>
          <Button
            size="sm"
            variant="ghost"
            icon={swapIcon}
            onClick={swap}
            disabled={!left && !right}
          >
            Swap
          </Button>
          <ExportMenu result={job.result} texts={texts} names={names} />
          <Button
            size="sm"
            variant="ghost"
            icon={shareIcon}
            disabled={!share.canShare}
            onClick={() => void share.share().catch(() => {})}
          >
            Share
          </Button>
        </Inline>
      </Inline>
      {textMode ? (
        <>
          {job.error ? (
            <Notice tone="danger" title="Could not compare">
              {job.error.message}
            </Notice>
          ) : null}
          {vm && job.result && stats ? (
            <Card as="section" title="Differences" headingLevel={2}>
              <Stack gap="4" aria-busy={job.pending}>
                <StatusBar
                  label="Comparison"
                  start={
                    <StatusBarSegment
                      tone={isIdentical(job.result) ? 'success' : 'neutral'}
                    >
                      {isIdentical(job.result)
                        ? 'No differences'
                        : `${stats.added} added, ${stats.removed} removed, ${stats.changed} changed`}
                      {job.pending ? ' (updating)' : ''}
                    </StatusBarSegment>
                  }
                  end={
                    <Inline gap="1" align="center">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        label="Previous change"
                        icon={chevronUp}
                        onClick={() => go('prev')}
                        disabled={anchors.length === 0}
                      />
                      <StatusBarSegment>
                        {anchors.length === 0
                          ? 'No changes'
                          : `${position + 1 || '-'} of ${anchors.length}`}
                      </StatusBarSegment>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        label="Next change"
                        icon={chevronDown}
                        onClick={() => go('next')}
                        disabled={anchors.length === 0}
                      />
                    </Inline>
                  }
                />
                <ChangeStrip
                  anchors={anchors}
                  rows={vm.left.lines.length}
                  onJump={jump}
                />
                <DiffView
                  ref={view}
                  vm={vm}
                  language={language}
                  names={names}
                  wrap={false}
                  onUnfold={(i) => setExpanded((prev) => new Set(prev).add(i))}
                />
                {!isIdentical(job.result) ? (
                  <Disclosure summary="Merge changes" variant="line">
                    <MergePanel result={job.result} texts={texts} />
                  </Disclosure>
                ) : null}
              </Stack>
            </Card>
          ) : null}
        </>
      ) : null}
      {settings.mode !== 'text' ? (
        <SemanticView
          mode={settings.mode}
          left={left}
          right={right}
          sortKeys={settings.sortKeys}
          onSortKeys={(sortKeys) => update({ sortKeys })}
        />
      ) : null}
      <Inline gap="2" align="center" wrap>
        <Text size="sm" tone="muted">
          Press
        </Text>
        <Kbd keys="n" size="sm" />
        <Text size="sm" tone="muted">
          and
        </Text>
        <Kbd keys="p" size="sm" />
        <Text size="sm" tone="muted">
          to move between changes.
        </Text>
      </Inline>
    </Stack>
  );
}
