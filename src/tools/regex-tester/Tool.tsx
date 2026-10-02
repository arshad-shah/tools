import React, { useCallback, useMemo, useState } from 'react';
import { Stack } from '@/shared/ui';
import { useClipboard } from '@/shared/lib/clipboard';
import { LivePreview } from './components/LivePreview';
import { MatchList } from './components/MatchList';
import { PatternCard } from './components/PatternCard';
import { TestStringCard } from './components/TestStringCard';
import { Toolbar } from './components/Toolbar';
import { useRegexMatches } from './hooks/useRegexMatches';
import { toJsSnippet, toRegexLiteral } from './lib/code';
import { matchCoverage } from './lib/coverage';
import { DEFAULT_FLAGS, flagsString } from './lib/flags';
import { findTemplate, sampleTextFor } from './lib/templates';
import type { Flags } from './types';

const RegexStudio: React.FC = () => {
  const [pattern, setPattern] = useState('');
  const [testString, setTestString] = useState('');
  const [flags, setFlags] = useState<Flags>(DEFAULT_FLAGS);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { copied, copy } = useClipboard();

  const flagsStr = useMemo(() => flagsString(flags), [flags]);

  const { syntaxError, isValid, matches, runError, matching, hasResult } =
    useRegexMatches(pattern, flagsStr, testString);

  const copyToClipboard = useCallback(
    (text: string) => void copy(text),
    [copy],
  );

  const copyPattern = useCallback(() => {
    copyToClipboard(toRegexLiteral(pattern, flagsStr));
  }, [pattern, flagsStr, copyToClipboard]);

  const handleTemplateSelect = (value: string) => {
    const t = findTemplate(value);
    if (!t) return;
    setPattern(t.pattern);
    setSelectedTemplate(t.name);
  };

  const coverage = useMemo(
    () => matchCoverage(testString, matches),
    [testString, matches],
  );

  const generateSample = () => {
    setTestString(sampleTextFor(selectedTemplate));
  };

  const handleClearAll = () => {
    setPattern('');
    setTestString('');
    setSelectedTemplate('');
  };

  const handleCopyAsJs = () => {
    const code = toJsSnippet(pattern, flagsStr, testString);
    copyToClipboard(code);
  };

  const toggleFlag = (key: keyof Flags) =>
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Stack gap="4">
      <Toolbar
        selectedTemplate={selectedTemplate}
        onTemplateSelect={handleTemplateSelect}
        isValid={isValid}
        matchCount={matches.length}
        coverage={coverage}
        flagsStr={flagsStr}
        canCopyJs={!!pattern && isValid}
        onCopyAsJs={handleCopyAsJs}
        onGenerateSample={generateSample}
        onClearAll={handleClearAll}
      />

      <Stack gap="4" className="min-w-0">
        <PatternCard
          pattern={pattern}
          onPatternChange={setPattern}
          flags={flags}
          flagsStr={flagsStr}
          onToggleFlag={toggleFlag}
          isValid={isValid}
          errorMessage={syntaxError}
          runError={runError}
          copied={copied}
          onCopyPattern={copyPattern}
        />

        <TestStringCard
          testString={testString}
          onTestStringChange={setTestString}
          canGenerateSample={!!selectedTemplate && !testString}
          onGenerateSample={generateSample}
        />

        {pattern && testString && (
          <LivePreview
            testString={testString}
            matches={matches}
            coverage={coverage}
            matching={matching}
            hasResult={hasResult}
            runError={runError}
          />
        )}
      </Stack>

      {matches.length > 0 && (
        <MatchList matches={matches} onCopy={copyToClipboard} />
      )}
    </Stack>
  );
};

export default RegexStudio;
