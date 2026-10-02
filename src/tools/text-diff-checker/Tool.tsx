import React, { useCallback, useEffect, useState } from 'react';
import { IconAlertTriangle } from '@/shared/ui/icons';

import { Alert, AlertDescription, FilePicker, Grid, Stack } from '@/shared/ui';
import type { DiffViewModeId, HighlightMode } from './types';
import { useClipboard } from '@/shared/lib/clipboard';
import { saveBlob } from '@/shared/lib/download';
import { loadDiffFile, TEXT_ACCEPT } from './lib/text-file';
import { buildDiffExport } from './lib/export';
import { toToolError } from '@/shared/lib/errors';
import { notify } from '@/shared/lib/notify';
import useDiffSettings from './hooks/useDiffSettings';
import useIntelligentDiff from './hooks/useIntelligentDiff';
import { DiffResults } from './components/DiffResults';
import { DiffSettingsPanel } from './components/DiffSettingsPanel';
import { DiffStats } from './components/DiffStats';
import { DiffTextArea } from './components/DiffTextArea';
import { DiffToolbar } from './components/DiffToolbar';
import { useHandoffFiles } from '@/shared/lib/handoff';

const TextDiffChecker: React.FC = () => {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [diffViewMode, setDiffViewMode] = useState<DiffViewModeId>('split');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('word');

  const { diffSettings, updateDiffSetting, resetSettings } = useDiffSettings();
  const {
    diffSegments,
    diffStats,
    isDiffing,
    performanceWarning,
    calculateDiff,
    debouncedCalculateDiff,
    clearDiff,
  } = useIntelligentDiff();

  useEffect(() => {
    if (autoRefresh && (leftText || rightText)) {
      debouncedCalculateDiff(leftText, rightText, diffSettings, highlightMode);
    }
  }, [
    leftText,
    rightText,
    autoRefresh,
    diffSettings,
    highlightMode,
    debouncedCalculateDiff,
  ]);

  const { copy } = useClipboard();
  const copyToClipboard = useCallback(
    async (text: string) => {
      // useClipboard reports failures itself.
      if (await copy(text)) notify.success('Copied to clipboard!');
    },
    [copy],
  );

  // Each pane loads independently: picking the right file while the left
  // one is still being read must not drop the left one.
  const loadSide = async (side: 'left' | 'right', file: File) => {
    try {
      const r = await loadDiffFile(file);
      (side === 'left' ? setLeftText : setRightText)(r.text);
      notify.success(`${r.name} loaded successfully`);
    } catch (e) {
      notify.error(toToolError(e));
    }
  };

  // Two files dropped on a hub become the original and the changed text.
  useHandoffFiles((files) => {
    void loadSide('left', files[0]);
    if (files[1]) void loadSide('right', files[1]);
  });

  const swapTexts = useCallback(() => {
    setLeftText(rightText);
    setRightText(leftText);
    notify.info('Texts swapped');
  }, [leftText, rightText]);

  const clearAll = useCallback(() => {
    if (leftText || rightText) {
      setLeftText('');
      setRightText('');
      clearDiff();
      notify.info('All cleared');
    }
  }, [leftText, rightText, clearDiff]);

  const exportResults = useCallback(() => {
    if (!diffSegments.length) {
      notify.error('No diff results to export');
      return;
    }
    const now = Date.now();
    saveBlob(
      new Blob(
        [
          JSON.stringify(
            buildDiffExport(diffSegments, diffStats, diffSettings, now),
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
      `diff-results-${now}.json`,
    );
    notify.success('Results exported successfully');
  }, [diffSegments, diffStats, diffSettings]);

  const manualRefresh = useCallback(() => {
    if (!autoRefresh) {
      try {
        calculateDiff(leftText, rightText, diffSettings, highlightMode);
        notify.info('Diff recalculated');
      } catch {
        notify.error('Error calculating differences');
      }
    }
  }, [
    autoRefresh,
    calculateDiff,
    leftText,
    rightText,
    diffSettings,
    highlightMode,
  ]);

  return (
    <Stack gap="4">
      <DiffToolbar
        showStats={showStats}
        setShowStats={setShowStats}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        isDiffing={isDiffing}
        hasResults={diffSegments.length > 0}
        diffViewMode={diffViewMode}
        setDiffViewMode={setDiffViewMode}
        onRefresh={manualRefresh}
        onSwap={swapTexts}
        onExport={exportResults}
        onClear={clearAll}
      />

      <DiffSettingsPanel
        diffSettings={diffSettings}
        updateDiffSetting={updateDiffSetting}
        resetSettings={resetSettings}
        highlightMode={highlightMode}
        setHighlightMode={setHighlightMode}
      />

      {showStats && diffStats && <DiffStats diffStats={diffStats} />}

      {performanceWarning && (
        <Alert status="warning" icon={<IconAlertTriangle />}>
          <AlertDescription>
            Large text detected. Performance may be affected.
          </AlertDescription>
        </Alert>
      )}

      <Grid max={2} gap="4">
        <FilePicker
          accept={TEXT_ACCEPT}
          onFiles={(files) => void loadSide('left', files[0])}
        >
          {(open) => (
            <DiffTextArea
              value={leftText}
              onChange={setLeftText}
              placeholder="Paste your original text here…"
              label="Original text"
              disabled={isDiffing}
              onFileUpload={open}
              onCopy={() => void copyToClipboard(leftText)}
              onClear={() => setLeftText('')}
            />
          )}
        </FilePicker>
        <FilePicker
          accept={TEXT_ACCEPT}
          onFiles={(files) => void loadSide('right', files[0])}
        >
          {(open) => (
            <DiffTextArea
              value={rightText}
              onChange={setRightText}
              placeholder="Paste your modified text here…"
              label="Modified text"
              disabled={isDiffing}
              onFileUpload={open}
              onCopy={() => void copyToClipboard(rightText)}
              onClear={() => setRightText('')}
            />
          )}
        </FilePicker>
      </Grid>

      <DiffResults
        diffSegments={diffSegments}
        isDiffing={isDiffing}
        bothFilled={Boolean(leftText && rightText)}
        diffViewMode={diffViewMode}
        highlightMode={highlightMode}
        diffSettings={diffSettings}
      />
    </Stack>
  );
};

export default TextDiffChecker;
