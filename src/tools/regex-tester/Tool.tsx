import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useClipboard } from '@/shared/lib/clipboard';
import { sendTo } from '@/shared/lib/handoff';
import { useShareableState } from '@/shared/lib/use-shareable-state';
import {
  Grid,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TextInputPanel,
  type CodeTreeHandle,
} from '@/shared/ui';
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

const isMode = (v: string): v is RegexMode =>
  (REGEX_MODES as readonly string[]).includes(v);

const RegexTester: React.FC = () => {
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
  const { copied, copy } = useClipboard();
  const treeRef = useRef<CodeTreeHandle>(null);

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

  const copyText = useCallback((value: string) => void copy(value), [copy]);
  const setFlagsTo = (next: string) => updateSettings({ flags: next });
  const onToggleFlag = (letter: string) =>
    setFlagsTo(toggleFlag(flags, letter));
  const setMode = (m: RegexMode) => updateSettings({ mode: m });
  const logPayload = valid ? logFormatPayload(pattern, flags) : null;

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
      copyText(toSnippet(snippetLang, pattern, flags, text).code);
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
    focusExplain: () => treeRef.current?.focusId('r'),
  });

  return (
    <Stack gap="4">
      <RegexToolbar
        share={share}
        onOpenTemplates={() => setTemplatesOpen(true)}
        cheatSheetOpen={cheatSheetOpen}
        onToggleCheatSheet={() =>
          updateSettings({ cheatSheetOpen: !cheatSheetOpen })
        }
        canCopyJs={valid && !!pattern}
        onCopyAsJs={() => copyText(toJsSnippet(pattern, flags, text))}
        onLoadSample={loadSample}
        canUseAsLogFormat={logPayload !== null}
        onUseAsLogFormat={() =>
          logPayload && sendTo(navigate, 'log-parser', logPayload)
        }
        onClearAll={clearAll}
      />
      <PatternBar
        pattern={pattern}
        onPatternChange={setPattern}
        flags={flags}
        onToggleFlag={onToggleFlag}
        syntax={syntax}
        highlight={selected}
        copied={copied}
        onCopyLiteral={() => copyText(toRegexLiteral(pattern, flags))}
      />
      <TextInputPanel
        value={text}
        onChange={setText}
        language="plain"
        label="Test string"
        placeholder="Enter text to test the pattern against"
        minHeight={120}
        maxHeight={320}
      />
      <Tabs value={mode} onValueChange={(v) => isMode(v) && setMode(v)}>
        <TabsList aria-label="Mode">
          {REGEX_MODES.map((m) => (
            <TabsTrigger key={m} value={m}>
              {MODE_LABEL[m]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="match" className="pt-4">
          <MatchTab
            text={text}
            matches={matchJob.matches}
            error={matchJob.error}
            pending={matchJob.matching}
            hasResult={matchJob.hasResult}
            onRetry={matchJob.retry}
            group={selected?.groupIndex ?? null}
            onCopy={copyText}
          />
        </TabsContent>
        <TabsContent value="replace" className="pt-4">
          <ReplaceTab
            runner={runner}
            pattern={pattern}
            flags={flags}
            text={text}
            valid={valid}
            replacement={replacement}
            onReplacementChange={setReplacement}
          />
        </TabsContent>
        <TabsContent value="split" className="pt-4">
          <SplitTab
            runner={runner}
            pattern={pattern}
            flags={flags}
            text={text}
            valid={valid}
          />
        </TabsContent>
        <TabsContent value="tests" className="pt-4">
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
        </TabsContent>
      </Tabs>
      <Grid max={2} gap="4">
        <ExplainPanel
          tree={tree}
          selectedId={selectedId}
          onSelect={(id) => setSelection({ pattern, id: id ?? '' })}
          treeRef={treeRef}
        />
        <CodeExport
          pattern={pattern}
          flags={flags}
          text={text}
          valid={valid}
          language={snippetLang}
          onLanguageChange={setSnippetLang}
          onCopy={copyText}
        />
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
};

export default RegexTester;
