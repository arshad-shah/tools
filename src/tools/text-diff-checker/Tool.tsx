import React, { useMemo, useRef, useState } from 'react';
import { IconArrowRightLeft } from '@/shared/ui/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  Button,
  Grid,
  Inline,
  Kbd,
  SegmentedControl,
  ShareButton,
  Stack,
  Text,
  TextInputPanel,
} from '@/shared/ui';
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

const TEXT_ACCEPT =
  '.txt,.md,.json,.html,.css,.js,.ts,.jsx,.tsx,.xml,.yaml,.yml,.log,.csv,.patch,.diff,text/plain';
const MAX_BYTES = 20 * 1024 * 1024;
const SAMPLE = {
  left: 'The quick brown fox\njumps over the lazy dog.\nLine three stays.\nA line that goes away.',
  right:
    'The quick red fox\njumps over the lazy dog.\nLine three stays.\nA brand new line.\nAnd one more.',
};

const isDiffHandoff = (p: HandoffPayload) => readDiffHandoff(p) !== null;

const TextDiff: React.FC = () => {
  const [settings, update] = diffSettings.useSettings();
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [names, setNames] = useState({ left: 'original', right: 'changed' });
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [current, setCurrent] = useState(0);
  const view = useRef<DiffViewHandle>(null);

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

  const side = (which: 'left' | 'right') => (
    <TextInputPanel
      label={which === 'left' ? 'Original text' : 'Changed text'}
      value={which === 'left' ? left : right}
      onChange={which === 'left' ? setLeft : setRight}
      language={
        settings.syntaxHighlighting
          ? detectLanguage(which === 'left' ? left : right, names[which])
          : 'plain'
      }
      accept={TEXT_ACCEPT}
      maxBytes={MAX_BYTES}
      samples={[{ label: 'Sample', value: SAMPLE[which] }]}
      onFile={(f) => {
        setNames((n) => ({ ...n, [which]: f.name }));
        return false;
      }}
      maxHeight={280}
    />
  );

  const stats = job.result?.stats;
  return (
    <Stack gap="4">
      <Inline gap="3" className="flex-wrap items-center justify-between">
        <SegmentedControl<DiffMode>
          label="Comparison"
          value={settings.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'json', label: 'JSON' },
            { value: 'csv', label: 'CSV' },
            { value: 'ignore-order', label: 'Ignore order' },
          ]}
        />
        <Inline gap="2">
          <Button
            variant="secondary"
            size="sm"
            onClick={swap}
            disabled={!left && !right}
          >
            <IconArrowRightLeft size="sm" aria-hidden />
            Swap
          </Button>
          <ExportMenu result={job.result} texts={texts} names={names} />
          <ShareButton share={share} />
        </Inline>
      </Inline>
      <Grid cols={2} gap="3" className="min-w-0">
        {side('left')}
        {side('right')}
      </Grid>
      {textMode ? (
        <>
          <DiffOptions settings={settings} update={update} />
          {job.error && (
            <Alert status="danger">
              <AlertDescription>{job.error.message}</AlertDescription>
            </Alert>
          )}
          {vm && job.result && stats && (
            <Stack gap="3" aria-busy={job.pending}>
              <Inline
                gap="3"
                className="flex-wrap items-center justify-between"
              >
                <Text size="sm" aria-live="polite">
                  {isIdentical(job.result)
                    ? 'No differences'
                    : `${stats.added} added, ${stats.removed} removed, ${stats.changed} changed`}
                  {job.pending ? ' (updating)' : ''}
                </Text>
                <Inline gap="2" className="items-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => go('prev')}
                    disabled={anchors.length === 0}
                  >
                    Previous change
                  </Button>
                  <Text size="sm" aria-live="polite">
                    {anchors.length === 0
                      ? 'No changes'
                      : `${position + 1 || '-'} of ${anchors.length}`}
                  </Text>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => go('next')}
                    disabled={anchors.length === 0}
                  >
                    Next change
                  </Button>
                </Inline>
              </Inline>
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
              {!isIdentical(job.result) && (
                <Accordion>
                  <AccordionItem value="merge">
                    <AccordionTrigger>Merge changes</AccordionTrigger>
                    <AccordionContent>
                      <MergePanel result={job.result} texts={texts} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </Stack>
          )}
        </>
      ) : null}
      {settings.mode !== 'text' && (
        <SemanticView
          mode={settings.mode}
          left={left}
          right={right}
          sortKeys={settings.sortKeys}
          onSortKeys={(sortKeys) => update({ sortKeys })}
        />
      )}
      <Text size="sm" tone="muted">
        Press <Kbd keys="n" /> and <Kbd keys="p" /> to move between changes.
      </Text>
    </Stack>
  );
};

export default TextDiff;
