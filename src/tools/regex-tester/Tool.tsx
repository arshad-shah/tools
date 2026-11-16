import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClipboard } from '@/shared/lib/clipboard';
import { sendTo } from '@/shared/lib/handoff';
import { notify } from '@/shared/lib/notify';
import { useSendCommands } from '@/shared/lib/send-commands';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import {
  Card,
  Grid,
  GridItem,
  SegmentedControl,
  Stack,
} from '@arshad-shah/cynosure';

import { CheatSheet } from './components/CheatSheet';
import { CodeExport } from './components/CodeExport';
import { ExplainPanel } from './components/ExplainPanel';
import { MatchTab } from './components/MatchTab';
import { PatternBar } from './components/PatternBar';
import { ReplaceTab } from './components/ReplaceTab';
import { SplitTab } from './components/SplitTab';
import { TemplateDialog } from './components/TemplateDialog';
import { TestsTab } from './components/TestsTab';
import { RegexToolbar } from './components/Toolbar';
import { MODE_LABEL, useRegexCommands } from './hooks/useRegexCommands';
import { useRegexMatches } from './hooks/useRegexMatches';
import { useRegexRunner } from './hooks/useRegexRunner';
import {
  toJsSnippet,
  toRegexLiteral,
  toSnippet,
  type SnippetLanguage,
} from './lib/code';
import { describe } from './lib/explain/describe';
import { explainTree } from './lib/explain-tree';
import { toggleFlag } from './lib/flags';
import { logFormatPayload } from './lib/log-format';
import { checkSyntax } from './lib/syntax';
import { sampleTextFor } from './lib/templates';
import { casesFromLines, linesFromCases } from './lib/test-cases';
import { REGEX_MODES, regexSettings, type RegexMode } from './settings';
import { parseRegexShare, REGEX_SHARE_VERSION, type RegexShare } from './share';
import type { RegexTemplate } from './types';
import { CodeEditor } from '@/shared/editor';

const isMode = (v: string): v is RegexMode =>
  (REGEX_MODES as readonly string[]).includes(v);

/**
 * Regex Tester (redesign spec, transform tool pattern): the pattern, then
 * the test text beside the results (match, replace, split, tests), then
 * what the pattern means and the code for it.
 */
export default function RegexTester() {
  const [{ flags, mode, cheatSheetOpen }, updateSettings] =
    regexSettings.useSettings();
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [replacement, setReplacement] = useState('');
  const [shouldMatch, setShouldMatch] = useState('');
  const [shouldNotMatch, setShouldNotMatch] = useState('');
  const [template, setTemplate] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [snippetLang, setSnippetLang] = useState<SnippetLanguage>('js');
  const [selection, setSelection] = useState({ pattern: '', id: '' });
  const runner = useRegexRunner();
  const navigate = useNavigate();
  const { copy } = useClipboard();

  const cases = useMemo(
    () => casesFromLines(shouldMatch, shouldNotMatch),
    [shouldMatch, shouldNotMatch],
  );
  const share = useShareableState<RegexShare>({
    toolId: 'regex-tester',
    version: REGEX_SHARE_VERSION,
    parse: parseRegexShare,
    select: () => ({ v: 1, pattern, flags, text, replacement, mode, cases }),
  });

  // Hydrate once from a share link: local state now, settings right after.
  const [hydrated, setHydrated] = useState<RegexShare | null | undefined>();
  if (hydrated === undefined) {
    const l = share.loaded;
    setHydrated(l);
    if (l) {
      setPattern(l.pattern);
      setText(l.text);
      setReplacement(l.replacement);
      const lines = linesFromCases(l.cases);
      setShouldMatch(lines.shouldMatch);
      setShouldNotMatch(lines.shouldNotMatch);
    }
  }
  useEffect(() => {
    if (hydrated)
      updateSettings({ flags: hydrated.flags, mode: hydrated.mode });
  }, [hydrated, updateSettings]);

  const syntax = useMemo(() => checkSyntax(pattern, flags), [pattern, flags]);
  const valid = syntax.ok;
  const tree = useMemo(() => {
    if (!syntax.ok || !syntax.ast) return null;
    try {
      return explainTree(describe(syntax.ast), pattern);
    } catch {
      return null;
    }
  }, [syntax, pattern]);
  const selectedId = selection.pattern === pattern ? selection.id : null;
  const selected = (selectedId && tree?.byId.get(selectedId)) || null;

  const matchJob = useRegexMatches(runner, pattern, flags, text, {
    valid,
    enabled: mode === 'match',
  });

  // Menu and palette copies (buttons use CopyButton): failures toast in
  // useClipboard, success says what was copied.
  const copyText = useCallback(
    (value: string, what: string) =>
      void copy(value).then((ok) => ok && notify.success(`Copied ${what}`)),
    [copy],
  );
  const setFlagsTo = (next: string) => updateSettings({ flags: next });
  const onToggleFlag = (letter: string) =>
    setFlagsTo(toggleFlag(flags, letter));
  const setMode = (m: RegexMode) => updateSettings({ mode: m });
  const logPayload = valid ? logFormatPayload(pattern, flags) : null;
  const sendLogFormat = () =>
    logPayload && sendTo(navigate, 'log-parser', logPayload);

  const pickTemplate = (t: RegexTemplate) => {
    setPattern(t.pattern);
    setFlagsTo(t.flags);
    setText(t.samples.join('\n'));
    setTemplate(t.name);
  };
  const loadSample = () => setText(sampleTextFor(template));
  const clearAll = () => {
    setPattern('');
    setText('');
    setReplacement('');
    setTemplate('');
  };
  const copyCode = () => {
    if (valid && pattern)
      copyText(toSnippet(snippetLang, pattern, flags, text).code, 'code');
  };

  useRegexCommands({
    toggleFlag: onToggleFlag,
    setMode,
    copyCode,
    canCopyCode: valid && !!pattern,
    share: () => void share.share().catch(() => {}),
    canShare: share.canShare,
    clear: clearAll,
    loadSample,
    focusExplain: () =>
      document
        .querySelector<HTMLElement>(
          '[aria-label="Pattern explanation"] [role="treeitem"]',
        )
        ?.focus(),
  });
  useSendCommands('regex-tester', [
    { target: 'log-parser', run: sendLogFormat, enabled: logPayload !== null },
  ]);

  const results = (
    <Stack gap="5">
      <SegmentedControl
        label="Mode"
        value={mode}
        onChange={(v) => isMode(v) && setMode(v)}
        options={REGEX_MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
      />
      {mode === 'match' ? (
        <MatchTab
          text={text}
          matches={matchJob.matches}
          error={matchJob.error}
          pending={matchJob.matching}
          hasResult={matchJob.hasResult}
          onRetry={matchJob.retry}
          group={selected?.groupIndex ?? null}
        />
      ) : null}
      {mode === 'replace' ? (
        <ReplaceTab
          runner={runner}
          pattern={pattern}
          flags={flags}
          text={text}
          valid={valid}
          replacement={replacement}
          onReplacementChange={setReplacement}
        />
      ) : null}
      {mode === 'split' ? (
        <SplitTab
          runner={runner}
          pattern={pattern}
          flags={flags}
          text={text}
          valid={valid}
        />
      ) : null}
      {mode === 'tests' ? (
        <TestsTab
          runner={runner}
          pattern={pattern}
          flags={flags}
          valid={valid}
          shouldMatch={shouldMatch}
          shouldNotMatch={shouldNotMatch}
          onShouldMatchChange={setShouldMatch}
          onShouldNotMatchChange={setShouldNotMatch}
          cases={cases}
        />
      ) : null}
    </Stack>
  );

  return (
    <Stack gap="6">
      <RegexToolbar
        share={share}
        onOpenTemplates={() => setTemplatesOpen(true)}
        cheatSheetOpen={cheatSheetOpen}
        onToggleCheatSheet={() =>
          updateSettings({ cheatSheetOpen: !cheatSheetOpen })
        }
        canCopyJs={valid && !!pattern}
        onCopyAsJs={() =>
          copyText(toJsSnippet(pattern, flags, text), 'JavaScript')
        }
        onLoadSample={loadSample}
        canUseAsLogFormat={logPayload !== null}
        onUseAsLogFormat={sendLogFormat}
        onClearAll={clearAll}
      />
      <PatternBar
        pattern={pattern}
        onPatternChange={setPattern}
        flags={flags}
        onToggleFlag={onToggleFlag}
        syntax={syntax}
        highlight={selected}
        literal={toRegexLiteral(pattern, flags)}
      />
      <Grid columns={{ base: 1, lg: 2 }} gap="6" align="start">
        <Card as="section" title="Test text" headingLevel={2}>
          <CodeEditor
            value={text}
            onChange={setText}
            language="plain"
            aria-label="Test string"
            placeholder="Enter text to test the pattern against"
            minHeight={160}
            maxHeight={420}
          />
        </Card>
        <Card as="section" title="Results" headingLevel={2}>
          {results}
        </Card>
        <ExplainPanel
          tree={tree}
          selectedId={selectedId}
          onSelect={(id) => setSelection({ pattern, id: id ?? '' })}
        />
        <GridItem>
          <CodeExport
            pattern={pattern}
            flags={flags}
            text={text}
            valid={valid}
            language={snippetLang}
            onLanguageChange={setSnippetLang}
          />
        </GridItem>
      </Grid>
      <TemplateDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onPick={pickTemplate}
      />
      <CheatSheet
        open={cheatSheetOpen}
        onOpenChange={(open) => updateSettings({ cheatSheetOpen: open })}
      />
    </Stack>
  );
}
